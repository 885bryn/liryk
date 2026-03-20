import { describe, expect, it, vi } from "vitest";

import { fetchWebNowPlaying } from "./now-playing";

function jsonResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("fetchWebNowPlaying", () => {
  it("parses currently-playing payload when available", async () => {
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

  it("falls back to /me/player when /currently-playing returns 204", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => null } as Response)
      .mockResolvedValueOnce(
        jsonResponse(200, {
          is_playing: false,
          progress_ms: 456,
          item: {
            id: "track-2",
            name: "Fallback Song",
            artists: [{ name: "Fallback Artist" }],
          },
        }),
      );

    const result = await fetchWebNowPlaying("token", fetchMock as unknown as typeof fetch);

    expect(result).toEqual({
      trackId: "track-2",
      title: "Fallback Song",
      artist: "Fallback Artist",
      isPlaying: false,
      progressMs: 456,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
});
