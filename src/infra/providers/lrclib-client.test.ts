import { describe, expect, it, vi } from "vitest";

import { createLrclibClient } from "./lrclib-client";

describe("createLrclibClient", () => {
  it("maps direct metadata get results into normalized candidates", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 11,
            trackName: "Song",
            artistName: "Artist",
            albumName: "Album",
            duration: 202,
            plainLyrics: "plain",
            syncedLyrics: "[00:01.00]line",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

    const client = createLrclibClient({ fetchFn, baseUrl: "https://lrclib.net" });
    const result = await client.getByMetadata({
      trackId: "track-1",
      title: "Song",
      artist: "Artist",
      album: "Album",
      durationMs: 202_400,
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      {
        provider: "lrclib",
        providerLyricId: "11",
        title: "Song",
        artist: "Artist",
        album: "Album",
        durationMs: 202_000,
        plainLyrics: "plain",
        syncedLyrics: "[00:01.00]line",
        isUsable: true,
      },
    ]);
  });

  it("falls back to search when direct metadata lookup misses", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("{}", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 22,
              trackName: "Song",
              artistName: "Artist",
              plainLyrics: "plain",
            },
            {
              id: 23,
              trackName: "Song (Live)",
              artistName: "Artist",
              plainLyrics: "backup",
            },
          ]),
          { status: 200 },
        ),
      );

    const client = createLrclibClient({ fetchFn, baseUrl: "https://lrclib.net" });
    const result = await client.getByMetadata({
      trackId: "track-1",
      title: "Song",
      artist: "Artist",
      durationMs: 200_000,
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result.map((candidate) => candidate.providerLyricId)).toEqual(["22", "23"]);
  });

  it("filters unusable payloads from get and search results", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 11,
            trackName: "Song",
            artistName: "Artist",
            plainLyrics: "\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 12,
              trackName: "Song",
              artistName: "Artist",
              plainLyrics: "\ufffd\ufffd\ufffd\ufffd",
            },
            {
              id: 13,
              trackName: "Song",
              artistName: "Artist",
              plainLyrics: "clean line",
            },
          ]),
          { status: 200 },
        ),
      );

    const client = createLrclibClient({ fetchFn, baseUrl: "https://lrclib.net" });
    const result = await client.getByMetadata({
      trackId: "track-1",
      title: "Song",
      artist: "Artist",
      durationMs: 200_000,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.providerLyricId).toBe("13");
  });
});
