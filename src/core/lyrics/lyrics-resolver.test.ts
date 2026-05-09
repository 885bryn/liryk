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
        candidate({
          providerLyricId: "best",
          title: "Song Name (Remaster 2011)",
          syncedLyrics: "[00:12.00]good\n[00:58.00]better\n[01:41.00]best\n[02:54.00]end",
        }),
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
        candidate({ providerLyricId: "risky", title: "Song Name", durationMs: 214_000, plainLyrics: "x" }),
      ]),
      searchByMetadata: vi.fn().mockResolvedValue([]),
    };

    const resolved = await resolveLyricsForTrack(metadata, client);
    expect(resolved.sourceState).toBe("low-confidence");
    expect(resolved.renderMode).toBe("plain-static");
  });

  it("prefers a safer plain candidate over a riskier synced candidate", async () => {
    const client = {
      getByMetadata: vi.fn().mockResolvedValue([
        candidate({
          providerLyricId: "risky-synced",
          title: "Song Name - Live",
          syncedLyrics: "[00:12.00]line 1\n[00:58.00]line 2\n[01:41.00]line 3\n[02:54.00]line 4",
          plainLyrics: "risky plain",
        }),
        candidate({
          providerLyricId: "safer-plain",
          durationMs: 210_000,
          plainLyrics: "safe 1\nsafe 2",
        }),
      ]),
      searchByMetadata: vi.fn().mockResolvedValue([]),
    };

    const resolved = await resolveLyricsForTrack(metadata, client);

    expect(resolved.sourceState).toBe("plain");
    expect(resolved.renderMode).toBe("plain-static");
    expect(resolved.candidateId).toBe("safer-plain");
    expect(resolved.provider).toBe("lrclib");
    expect(resolved.confidenceScore).toBe(90);
    expect(resolved.lines.map((line) => line.text)).toEqual(["safe 1", "safe 2"]);
  });

  it("returns the best plausible risky candidate as low-confidence when no safer option exists", async () => {
    const client = {
      getByMetadata: vi.fn().mockResolvedValue([
        candidate({
          providerLyricId: "riskier-plain",
          title: "Song Name - Live",
          durationMs: 215_000,
          plainLyrics: "riskier plain",
        }),
        candidate({
          providerLyricId: "best-risky-synced",
          durationMs: 214_000,
          syncedLyrics: "[00:20.00]line 1\n[01:05.00]line 2\n[01:48.00]line 3",
        }),
      ]),
      searchByMetadata: vi.fn().mockResolvedValue([]),
    };

    const resolved = await resolveLyricsForTrack(metadata, client);

    expect(resolved.sourceState).toBe("low-confidence");
    expect(resolved.renderMode).toBe("synced");
    expect(resolved.candidateId).toBe("best-risky-synced");
    expect(resolved.provider).toBe("lrclib");
    expect(resolved.confidenceScore).toBe(82);
    expect(resolved.lines[0]?.text).toBe("line 1");
  });

  it("keeps source text while providing simplified displayText for synced and plain lines", async () => {
    const syncedClient = {
      getByMetadata: vi.fn().mockResolvedValue([
        candidate({
          providerLyricId: "synced-traditional",
          syncedLyrics: "[00:01.00]愛在臺北\n[00:02.00]歡迎光臨 ABC 2026",
        }),
      ]),
      searchByMetadata: vi.fn().mockResolvedValue([]),
    };

    const syncedResolved = await resolveLyricsForTrack(metadata, syncedClient);
    expect(syncedResolved.renderMode).toBe("synced");
    expect(syncedResolved.lines[0]?.text).toBe("愛在臺北");
    expect(syncedResolved.lines[0]?.displayText).toBe("爱在台北");
    expect(syncedResolved.lines[1]?.text).toBe("歡迎光臨 ABC 2026");
    expect(syncedResolved.lines[1]?.displayText).toBe("欢迎光临 ABC 2026");

    const plainClient = {
      getByMetadata: vi.fn().mockResolvedValue([
        candidate({
          providerLyricId: "plain-traditional",
          syncedLyrics: undefined,
          plainLyrics: "愛在臺北\n歡迎光臨 ABC 2026",
        }),
      ]),
      searchByMetadata: vi.fn().mockResolvedValue([]),
    };

    const plainResolved = await resolveLyricsForTrack(metadata, plainClient);
    expect(plainResolved.renderMode).toBe("plain-static");
    expect(plainResolved.lines[0]?.text).toBe("愛在臺北");
    expect(plainResolved.lines[0]?.displayText).toBe("爱在台北");
    expect(plainResolved.lines[1]?.text).toBe("歡迎光臨 ABC 2026");
    expect(plainResolved.lines[1]?.displayText).toBe("欢迎光临 ABC 2026");
  });
});
