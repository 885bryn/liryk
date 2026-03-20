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

  it("prefers synced candidates when metadata quality is close", () => {
    const plain = candidate({ providerLyricId: "plain", title: "Song Name", plainLyrics: "plain" });
    const synced = candidate({
      providerLyricId: "synced",
      title: "Song Name (Live)",
      syncedLyrics: "[00:01.00]line",
    });

    const best = selectBestCandidate(metadata, [plain, synced]);
    expect(best?.candidate.providerLyricId).toBe("synced");
  });
});
