import { describe, expect, it } from "vitest";

import { scoreCandidate, selectBestCandidate } from "./lyrics-matcher";
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
    plainLyrics: "plain",
    syncedLyrics: undefined,
    isUsable: true,
    ...overrides,
  };
}

describe("lyrics matcher", () => {
  it("treats remaster/live/clean suffixes as close variants", () => {
    const remaster = scoreCandidate(metadata, candidate({ title: "Song Name (Remaster 2011)" }));
    const live = scoreCandidate(metadata, candidate({ title: "Song Name - Live" }));
    const clean = scoreCandidate(metadata, candidate({ title: "Song Name (Clean)" }));

    expect(remaster.accepted).toBe(true);
    expect(live.accepted).toBe(true);
    expect(clean.accepted).toBe(true);
  });

  it("rejects clearly wrong synced candidates despite timestamp availability", () => {
    const wrongSynced = scoreCandidate(
      metadata,
      candidate({ title: "Different Track", artist: "Different Artist", syncedLyrics: "[00:01.00]line" }),
    );

    expect(wrongSynced.accepted).toBe(false);
  });

  it("penalizes content-changing variants more than benign remasters", () => {
    const exact = scoreCandidate(metadata, candidate({ providerLyricId: "exact" }));
    const remaster = scoreCandidate(
      metadata,
      candidate({ providerLyricId: "remaster", title: "Song Name (Remaster 2011)" }),
    );
    const live = scoreCandidate(metadata, candidate({ providerLyricId: "live", title: "Song Name - Live" }));
    const instrumental = scoreCandidate(
      metadata,
      candidate({ providerLyricId: "instrumental", title: "Song Name (Instrumental)" }),
    );

    expect(remaster.accepted).toBe(true);
    expect(live.accepted).toBe(true);
    expect(instrumental.accepted).toBe(true);
    expect(exact.score).toBeGreaterThan(remaster.score);
    expect(remaster.score).toBeGreaterThan(live.score);
    expect(live.score).toBeGreaterThan(instrumental.score);
  });

  it("penalizes implausibly short synced coverage", () => {
    const shortSynced = scoreCandidate(
      metadata,
      candidate({
        providerLyricId: "short-synced",
        syncedLyrics: "[00:01.00]first\n[00:08.00]second\n[00:14.00]third",
      }),
    );

    expect(shortSynced.accepted).toBe(true);
    expect(shortSynced.lowConfidence).toBe(true);
    expect(shortSynced.score).toBeLessThan(88);
  });

  it("prefers synced candidates when metadata quality is close", () => {
    const plain = candidate({ providerLyricId: "plain", title: "Song Name", plainLyrics: "plain" });
    const synced = candidate({
      providerLyricId: "synced",
      title: "Song Name (Remaster 2011)",
      syncedLyrics: "[00:12.00]line 1\n[00:58.00]line 2\n[01:41.00]line 3\n[02:54.00]line 4",
    });

    const best = selectBestCandidate(metadata, [plain, synced]);
    expect(best?.candidate.providerLyricId).toBe("synced");
  });

  it("prefers safer plain candidates over riskier synced variants", () => {
    const plain = candidate({ providerLyricId: "plain" });
    const riskySynced = candidate({
      providerLyricId: "risky-synced",
      title: "Song Name - Live",
      syncedLyrics: "[00:01.00]first\n[00:08.00]second\n[00:14.00]third",
    });

    const best = selectBestCandidate(metadata, [riskySynced, plain]);
    expect(best?.candidate.providerLyricId).toBe("plain");
  });
});
