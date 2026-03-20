import { describe, expect, it } from "vitest";

import { buildLiveLyricsViewModel } from "./live-lyrics-presenter";
import type { LiveSyncUiState } from "../state/playback/live-sync-store";

function state(overrides: Partial<LiveSyncUiState> = {}): LiveSyncUiState {
  return {
    playbackState: "playing",
    activeLineIndex: 0,
    nextLineIndex: 1,
    confidence: "synced",
    trackId: "track-1",
    statusLine: "Syncing lyrics...",
    ...overrides,
  };
}

describe("buildLiveLyricsViewModel", () => {
  it("maps idle, reconnecting, no-track, unsupported, and paused states", () => {
    const lines = ["line a", "line b"];

    expect(
      buildLiveLyricsViewModel({ syncState: state({ playbackState: "idle" }), lines, showReturnToLive: false }),
    ).toMatchObject({ status: "idle", showLyrics: false });

    expect(
      buildLiveLyricsViewModel({
        syncState: state(),
        lines,
        transientStatus: "reconnecting",
        showReturnToLive: false,
      }),
    ).toMatchObject({ status: "reconnecting", showLyrics: false });

    expect(
      buildLiveLyricsViewModel({ syncState: state({ trackId: null }), lines, showReturnToLive: false }),
    ).toMatchObject({ status: "no-track" });

    expect(
      buildLiveLyricsViewModel({
        syncState: state({ playbackState: "unavailable" }),
        lines,
        showReturnToLive: false,
      }),
    ).toMatchObject({ status: "unsupported" });

    expect(
      buildLiveLyricsViewModel({ syncState: state({ playbackState: "paused" }), lines, showReturnToLive: false }),
    ).toMatchObject({ status: "paused" });
  });

  it("returns dual emphasis lines and confidence badge", () => {
    const model = buildLiveLyricsViewModel({
      syncState: state({ confidence: "estimated", activeLineIndex: 1, nextLineIndex: 2 }),
      lines: ["line a", "line b", "line c"],
      showReturnToLive: true,
    });

    expect(model.activeLineText).toBe("line b");
    expect(model.nextLineText).toBe("line c");
    expect(model.confidenceBadge).toBe("Estimated sync");
    expect(model.showReturnToLive).toBe(true);
  });
});
