import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchWebNowPlaying, resetNowPlayingRateLimitForTests, SpotifyPlaybackError } from "./now-playing";

function jsonResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("fetchWebNowPlaying", () => {
  beforeEach(() => {
    resetNowPlayingRateLimitForTests();
  });

  it("parses /me/player payload when available", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, {
        is_playing: true,
        progress_ms: 12345,
        item: {
          id: "track-1",
          name: "Song",
          artists: [{ name: "Artist" }],
        },
      }),
    );

    const result = await fetchWebNowPlaying("token", fetchMock as unknown as typeof fetch);

    expect(result).toEqual({
      trackId: "track-1",
      title: "Song",
      artist: "Artist",
      isPlaying: true,
      progressMs: 12345,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when /me/player returns 204", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 204, json: async () => null } as Response));

    const result = await fetchWebNowPlaying("token", fetchMock as unknown as typeof fetch);

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when required metadata is missing or malformed", async () => {
    const missingTrackId = vi.fn(async () =>
      jsonResponse(200, {
        is_playing: true,
        progress_ms: 123,
        item: {
          id: "",
          name: "Song",
          artists: [{ name: "Artist" }],
        },
      }),
    );
    const malformedItem = vi.fn(async () => jsonResponse(200, { is_playing: false, progress_ms: 0, item: null }));

    await expect(fetchWebNowPlaying("token", missingTrackId as unknown as typeof fetch)).resolves.toBeNull();
    await expect(fetchWebNowPlaying("token", malformedItem as unknown as typeof fetch)).resolves.toBeNull();
  });

  it("extracts optional metadata fields when available", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, {
        is_playing: true,
        progress_ms: 789,
        timestamp: 1700000000000,
        item: {
          id: "track-3",
          name: "Rich Song",
          duration_ms: 180500,
          album: { name: "Great Album" },
          artists: [{ name: "Artist One" }, { name: "Artist Two" }],
        },
      }),
    );

    const result = await fetchWebNowPlaying("token", fetchMock as unknown as typeof fetch);

    expect(result).toEqual({
      trackId: "track-3",
      title: "Rich Song",
      artist: "Artist One",
      artists: ["Artist One", "Artist Two"],
      album: "Great Album",
      durationMs: 180500,
      capturedAtMs: 1700000000000,
      isPlaying: true,
      progressMs: 789,
    });
  });

  it("throws endpoint error for forbidden responses", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) } as Response));

    await expect(fetchWebNowPlaying("token", fetchMock as unknown as typeof fetch)).rejects.toThrow(
      "Spotify playback endpoint error (403)",
    );
  });

  it("exposes retry-after milliseconds for rate-limited responses", async () => {
    const fetchMock = vi.fn(async () =>
      ({
        ok: false,
        status: 429,
        headers: { get: (name: string) => (name.toLowerCase() === "retry-after" ? "12" : null) },
        json: async () => ({}),
      }) as Response,
    );

    await expect(fetchWebNowPlaying("token", fetchMock as unknown as typeof fetch)).rejects.toMatchObject({
      name: "SpotifyPlaybackError",
      status: 429,
      retryAfterMs: 12_000,
    } as Partial<SpotifyPlaybackError>);
  });

  it("short-circuits repeated requests while globally rate-limited", async () => {
    const firstFetch = vi.fn(async () =>
      ({
        ok: false,
        status: 429,
        headers: { get: (name: string) => (name.toLowerCase() === "retry-after" ? "12" : null) },
        json: async () => ({}),
      }) as Response,
    );

    await expect(fetchWebNowPlaying("token", firstFetch as unknown as typeof fetch)).rejects.toMatchObject({
      status: 429,
      retryAfterMs: 12_000,
    } as Partial<SpotifyPlaybackError>);

    const secondFetch = vi.fn(async () => jsonResponse(200, {}));
    await expect(fetchWebNowPlaying("token", secondFetch as unknown as typeof fetch)).rejects.toMatchObject({
      status: 429,
    } as Partial<SpotifyPlaybackError>);
    expect(secondFetch).not.toHaveBeenCalled();
  });
});
