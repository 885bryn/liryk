import { describe, expect, it, vi } from "vitest";

import { resolveLyricsForTrack } from "./lyrics-resolver";
import type { LyricTrackMetadata, ProviderLyricCandidate } from "./types";

const metadata: LyricTrackMetadata = {
  trackId: "track-1",
  title: "Song Name",
  artist: "Artist",
  album: "Album",
  durationMs: 200_000,
};

function candidate(overrides: Partial<ProviderLyricCandidate>): ProviderLyricCandidate {
  return {
    provider: "lrclib",
    providerLyricId: "1",
    title: "Song Name",
    artist: "Artist",
    album: "Album",
    durationMs: 200_000,
    plainLyrics: "plain line",
    syncedLyrics: undefined,
    isUsable: true,
    ...overrides,
  };
}

describe("resolveLyricsForTrack", () => {
  it("resolves synced lyrics for acceptable close matches", async () => {
    const client = {
      getByMetadata: vi.fn().mockResolvedValue([
        candidate({ providerLyricId: "wrong", title: "Wrong Song", syncedLyrics: "[00:01.00]bad" }),
        candidate({ providerLyricId: "best", title: "Song Name (Live)", syncedLyrics: "[00:01.00]good" }),
      ]),
      searchByMetadata: vi.fn().mockResolvedValue([]),
    };

    const resolved = await resolveLyricsForTrack(metadata, client);

    expect(resolved.sourceState).toBe("synced");
    expect(resolved.lines[0]?.text).toBe("good");
  });

  it("resolves plain fallback when timestamps are unavailable", async () => {
    const client = {
      getByMetadata: vi.fn().mockResolvedValue([candidate({ providerLyricId: "plain", plainLyrics: "a\nb" })]),
      searchByMetadata: vi.fn().mockResolvedValue([]),
    };

    const resolved = await resolveLyricsForTrack(metadata, client);
    expect(resolved.sourceState).toBe("plain");
    expect(resolved.renderMode).toBe("plain-static");
    expect(resolved.lines).toHaveLength(2);
  });

  it("returns explicit not-found when no acceptable candidates exist", async () => {
    const client = {
      getByMetadata: vi.fn().mockResolvedValue([
        candidate({ providerLyricId: "bad", title: "Not This Song", artist: "Other Artist", syncedLyrics: "[00:01.00]x" }),
      ]),
      searchByMetadata: vi.fn().mockResolvedValue([]),
    };

    const resolved = await resolveLyricsForTrack(metadata, client);
    expect(resolved.sourceState).toBe("not-found");
    expect(resolved.lines).toEqual([]);
  });

  it("marks low-confidence when best candidate is accepted but risky", async () => {
    const client = {
      getByMetadata: vi.fn().mockResolvedValue([
        candidate({ providerLyricId: "risky", title: "Song Name", durationMs: 225_000, plainLyrics: "x" }),
      ]),
      searchByMetadata: vi.fn().mockResolvedValue([]),
    };

    const resolved = await resolveLyricsForTrack(metadata, client);
    expect(resolved.sourceState).toBe("low-confidence");
    expect(resolved.renderMode).toBe("plain-static");
  });
});
