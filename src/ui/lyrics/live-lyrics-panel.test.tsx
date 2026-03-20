import { describe, expect, it } from "vitest";

import { createLiveLyricsPanelBuilder } from "./live-lyrics-panel";
import type { LiveSyncUiState } from "../../state/playback/live-sync-store";

function state(overrides: Partial<LiveSyncUiState> = {}): LiveSyncUiState {
  return {
    playbackState: "playing",
    activeLineIndex: 0,
    nextLineIndex: 1,
    confidence: "synced",
    trackId: "track-1",
    statusLine: "Live sync active.",
    ...overrides,
  };
}

describe("createLiveLyricsPanelBuilder", () => {
  it("renders deterministic status and dual-line emphasis", () => {
    const builder = createLiveLyricsPanelBuilder();

    const panel = builder.build({
      syncState: state({ confidence: "estimated" }),
      lines: ["line a", "line b", "line c"],
      trackTitle: "Track A",
      showReturnToLive: false,
    });

    expect(panel.title).toBe("Live Lyrics");
    expect(panel.activeLineText).toBe("line a");
    expect(panel.nextLineText).toBe("line b");
    expect(panel.confidenceBadge).toBe("Estimated sync");
  });

  it("resets line highlight immediately on track change", () => {
    const builder = createLiveLyricsPanelBuilder();

    builder.build({
      syncState: state({ trackId: "track-1", activeLineIndex: 2, nextLineIndex: 3 }),
      lines: ["a", "b", "c", "d"],
      trackTitle: "Track A",
      showReturnToLive: false,
    });

    const switched = builder.build({
      syncState: state({ trackId: "track-2", activeLineIndex: 0, nextLineIndex: 1 }),
      lines: ["x", "y", "z"],
      trackTitle: "Track B",
      showReturnToLive: false,
    });

    expect(switched.activeLineText).toBeUndefined();
    expect(switched.nextLineText).toBeUndefined();
  });
});
