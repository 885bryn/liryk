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
      trackArtist: "Artist A",
      showReturnToLive: false,
    });

    expect(panel.title).toBe("Live Lyrics");
    expect(panel.activeLineText).toBe("line a");
    expect(panel.nextLineText).toBe("line b");
    expect(panel.confidenceBadge).toBe("Estimated sync");
    expect(panel.nowPlayingTitle).toBe("Track A");
    expect(panel.nowPlayingArtist).toBe("Artist A");
    expect(panel.isNowPlayingKnown).toBe(true);
    expect(panel.stateRailMessage).toBe("Live sync active.");
    expect(panel.stateRailVariant).toBe("info");
  });

  it("returns fallback metadata when no active track is known", () => {
    const builder = createLiveLyricsPanelBuilder();

    const panel = builder.build({
      syncState: state({ playbackState: "idle", trackId: null }),
      lines: [],
      showReturnToLive: false,
    });

    expect(panel.nowPlayingTitle).toBe("No active track");
    expect(panel.nowPlayingArtist).toBe("Spotify");
    expect(panel.isNowPlayingKnown).toBe(false);
    expect(panel.stateRailMessage).toBe("Play a track on Spotify to start live lyrics.");
    expect(panel.stateRailVariant).toBe("idle");
  });

  it("resets line highlight immediately on track change", () => {
    const builder = createLiveLyricsPanelBuilder();

    builder.build({
      syncState: state({ trackId: "track-1", activeLineIndex: 2, nextLineIndex: 3 }),
      lines: ["a", "b", "c", "d"],
      trackTitle: "Track A",
      trackArtist: "Artist A",
      showReturnToLive: false,
    });

    const switched = builder.build({
      syncState: state({ trackId: "track-2", activeLineIndex: 0, nextLineIndex: 1 }),
      lines: ["x", "y", "z"],
      trackTitle: "Track B",
      trackArtist: "Artist B",
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
    expect(notFound.stateRailMessage).toBe("Lyrics not found");
    expect(notFound.stateRailVariant).toBe("warning");

    expect(lowConfidence.warningBadge).toContain("Low confidence");
    expect(lowConfidence.showLyrics).toBe(true);
    expect(lowConfidence.stateRailVariant).toBe("info");
  });

  it("maps syncing, reconnecting, paused, and unsupported states into status rail variants", () => {
    const builder = createLiveLyricsPanelBuilder();

    const syncing = builder.build({
      syncState: state(),
      lines: ["line a", "line b"],
      trackTitle: "Track A",
      showReturnToLive: false,
      transientStatus: "syncing",
    });
    const reconnecting = builder.build({
      syncState: state(),
      lines: ["line a", "line b"],
      trackTitle: "Track A",
      showReturnToLive: false,
      transientStatus: "reconnecting",
    });
    const paused = builder.build({
      syncState: state({ playbackState: "paused" }),
      lines: ["line a", "line b"],
      trackTitle: "Track A",
      showReturnToLive: false,
    });
    const unsupported = builder.build({
      syncState: state({ playbackState: "unavailable" }),
      lines: ["line a", "line b"],
      trackTitle: "Track A",
      showReturnToLive: false,
    });

    expect(syncing.stateRailMessage).toBe("Syncing latest playback position...");
    expect(syncing.stateRailVariant).toBe("info");
    expect(reconnecting.stateRailMessage).toBe("Reconnecting to Spotify playback...");
    expect(reconnecting.stateRailVariant).toBe("info");
    expect(paused.stateRailMessage).toBe("Playback paused.");
    expect(paused.stateRailVariant).toBe("info");
    expect(unsupported.stateRailMessage).toBe("Lyrics unavailable for this track or content.");
    expect(unsupported.stateRailVariant).toBe("warning");
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
