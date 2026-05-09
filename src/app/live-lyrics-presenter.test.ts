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
    resolvedLyrics: [
      { startMs: 0, text: "line a", renderMode: "synced", isTimestamped: true },
      { startMs: 1_000, text: "line b", renderMode: "synced", isTimestamped: true },
    ],
    lyricsSourceState: "synced",
    lyricsRenderMode: "synced",
    lyricsWarning: null,
    retryAvailable: false,
    retryInFlight: false,
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

  it("returns explicit not-found copy with one retry action", () => {
    const model = buildLiveLyricsViewModel({
      syncState: state({ lyricsSourceState: "not-found", resolvedLyrics: [], retryAvailable: true }),
      lines: ["line a", "line b"],
      showReturnToLive: false,
    });

    expect(model.sourceState).toBe("not-found");
    expect(model.statusLine).toBe("Lyrics not found");
    expect(model.showPrimaryAction).toBe(true);
    expect(model.primaryActionLabel).toBe("Retry");
  });

  it("hides not-found retry action while retry is in flight", () => {
    const model = buildLiveLyricsViewModel({
      syncState: state({
        lyricsSourceState: "not-found",
        retryAvailable: true,
        retryInFlight: true,
        statusLine: "Retrying lyrics lookup...",
      }),
      lines: [],
      showReturnToLive: false,
    });

    expect(model.showPrimaryAction).toBe(false);
    expect(model.primaryActionLabel).toBeUndefined();
  });

  it("keeps low-confidence lyrics visible with warning and best-guess badge", () => {
    const lowConfidence = buildLiveLyricsViewModel({
      syncState: state({
        lyricsSourceState: "low-confidence",
        lyricsRenderMode: "synced",
        lyricsWarning: "Potential mismatch",
      }),
      lines: ["line a", "line b"],
      showReturnToLive: false,
    });

    const plain = buildLiveLyricsViewModel({
      syncState: state({
        lyricsSourceState: "plain",
        lyricsRenderMode: "plain-static",
        activeLineIndex: null,
        nextLineIndex: null,
      }),
      lines: ["line a", "line b"],
      showReturnToLive: true,
    });

    expect(lowConfidence.showLyrics).toBe(true);
    expect(lowConfidence.warningBadge).toContain("Low confidence");
    expect(lowConfidence.confidenceBadge).toBe("Best guess");
  });

  it("keeps plain fallback lyrics visible without synced badge", () => {
    const plain = buildLiveLyricsViewModel({
      syncState: state({
        lyricsSourceState: "plain",
        lyricsRenderMode: "plain-static",
        activeLineIndex: null,
        nextLineIndex: null,
      }),
      lines: ["line a", "line b"],
      showReturnToLive: true,
    });

    expect(plain.renderMode).toBe("plain-static");
    expect(plain.confidenceBadge).toBeUndefined();
    expect(plain.showLyrics).toBe(true);
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

  it("shows retry-in-flight as inline status without resetting panel semantics", () => {
    const model = buildLiveLyricsViewModel({
      syncState: state({
        retryInFlight: true,
        statusLine: "Retrying lyrics lookup...",
        lyricsSourceState: "not-found",
        retryAvailable: true,
      }),
      lines: [],
      showReturnToLive: false,
    });

    expect(model.statusLine).toBe("Retrying lyrics lookup...");
    expect(model.showPrimaryAction).toBe(false);
    expect(model.sourceState).toBe("not-found");
  });
});
