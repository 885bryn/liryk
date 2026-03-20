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

  it("projects not-found and low-confidence states into panel actions and warning copy", () => {
    const builder = createLiveLyricsPanelBuilder();

    const notFound = builder.build({
      syncState: state({ lyricsSourceState: "not-found", retryAvailable: true, resolvedLyrics: [] }),
      lines: [],
      trackTitle: "Missing Track",
      showReturnToLive: false,
    });

    const lowConfidence = builder.build({
      syncState: state({ lyricsSourceState: "low-confidence", lyricsWarning: "Potential mismatch" }),
      lines: ["line a", "line b"],
      trackTitle: "Risky Track",
      showReturnToLive: false,
    });

    expect(notFound.showPrimaryAction).toBe(true);
    expect(notFound.primaryActionLabel).toBe("Retry");
    expect(notFound.statusLine).toBe("Lyrics not found");

    expect(lowConfidence.warningBadge).toContain("Low confidence");
    expect(lowConfidence.showLyrics).toBe(true);
  });

  it("keeps plain fallback readable with no synced confidence semantics", () => {
    const builder = createLiveLyricsPanelBuilder();

    const panel = builder.build({
      syncState: state({
        lyricsSourceState: "plain",
        lyricsRenderMode: "plain-static",
        activeLineIndex: null,
        nextLineIndex: null,
      }),
      lines: ["plain one", "plain two"],
      trackTitle: "Plain Track",
      showReturnToLive: true,
    });

    expect(panel.renderMode).toBe("plain-static");
    expect(panel.confidenceBadge).toBeUndefined();
    expect(panel.showLyrics).toBe(true);
  });
});
