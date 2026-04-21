import { describe, expect, it } from "vitest";

import { LiveSyncStore } from "./live-sync-store";

describe("LiveSyncStore", () => {
  it("starts in idle no-playback state", () => {
    const store = new LiveSyncStore();
    expect(store.selectPlaybackState()).toBe("idle");
    expect(store.selectLiveSync().statusLine).toContain("Play a track");
    expect(store.selectLiveSync().estimatedProgressMs).toBe(0);
    expect(store.selectLiveSync().polledProgressMs).toBe(0);
    expect(store.selectLiveSync().driftDeltaMs).toBe(0);
    expect(store.selectLiveSync().correctionState).toBe("static");
  });

  it("updates estimated progress from runtime timing samples", () => {
    const store = new LiveSyncStore();
    store.setEstimatedProgressMs(1_450);
    expect(store.selectLiveSync().estimatedProgressMs).toBe(1_450);
  });

  it("updates diagnostics values from runtime samples", () => {
    const store = new LiveSyncStore();
    store.setPolledProgressMs(1_400);
    store.setDriftDeltaMs(50);
    store.setCorrectionState("estimated");

    expect(store.selectLiveSync().polledProgressMs).toBe(1_400);
    expect(store.selectLiveSync().driftDeltaMs).toBe(50);
    expect(store.selectLiveSync().correctionState).toBe("estimated");
  });

  it("updates active line, next line, confidence, and playback state", () => {
    const store = new LiveSyncStore();

    store.setPlaybackState("playing");
    store.setTrack("track-1");
    store.setActiveLine(3);
    store.setNextLine(4);
    store.setConfidence("estimated");
    store.setStatusLine("Syncing lyrics...");

    expect(store.selectLiveSync()).toMatchObject({
      playbackState: "playing",
      trackId: "track-1",
      activeLineIndex: 3,
      nextLineIndex: 4,
      confidence: "estimated",
      statusLine: "Syncing lyrics...",
    });
  });

  it("represents explicit lyrics source states separately from playback", () => {
    const store = new LiveSyncStore();

    store.setLyricsSourceState("loading");
    store.setLyricsSourceState("synced");
    store.setLyricsSourceState("plain");
    store.setLyricsSourceState("low-confidence");
    store.setLyricsSourceState("not-found");

    expect(store.selectLiveSync().lyricsSourceState).toBe("not-found");
  });

  it("resets resolved lyric state on track change", () => {
    const store = new LiveSyncStore();
    store.setEstimatedProgressMs(900);
    store.setPolledProgressMs(880);
    store.setDriftDeltaMs(20);
    store.setCorrectionState("estimated");
    store.setResolvedLyrics({
      sourceState: "synced",
      renderMode: "synced",
      lines: [{ startMs: 100, text: "line", renderMode: "synced", isTimestamped: true }],
    });
    store.setLyricsRetryState({ retryAvailable: true, retryInFlight: true });
    store.setLyricsWarning("Low confidence");

    store.setTrack("track-1");
    store.setTrack("track-2");

    expect(store.selectLiveSync().resolvedLyrics).toEqual([]);
    expect(store.selectLiveSync().lyricsSourceState).toBe("loading");
    expect(store.selectLiveSync().retryAvailable).toBe(false);
    expect(store.selectLiveSync().retryInFlight).toBe(false);
    expect(store.selectLiveSync().lyricsWarning).toBeNull();
    expect(store.selectLiveSync().estimatedProgressMs).toBe(0);
    expect(store.selectLiveSync().polledProgressMs).toBe(0);
    expect(store.selectLiveSync().driftDeltaMs).toBe(0);
    expect(store.selectLiveSync().correctionState).toBe("static");
  });

  it("resets estimated progress when track is cleared", () => {
    const store = new LiveSyncStore();
    store.setTrack("track-1");
    store.setEstimatedProgressMs(2_000);
    store.setPolledProgressMs(1_900);
    store.setDriftDeltaMs(100);
    store.setCorrectionState("synced");
    store.setTrack(null);
    expect(store.selectLiveSync().estimatedProgressMs).toBe(0);
    expect(store.selectLiveSync().polledProgressMs).toBe(0);
    expect(store.selectLiveSync().driftDeltaMs).toBe(0);
    expect(store.selectLiveSync().correctionState).toBe("static");
  });

  it("allows retry-in-flight status updates without mutating playback state", () => {
    const store = new LiveSyncStore();
    store.setPlaybackState("playing");
    store.setTrack("track-1");
    store.setStatusLine("Live sync active.");

    store.setLyricsRetryState({ retryAvailable: true, retryInFlight: true });
    store.setStatusLine("Retrying lyrics lookup...");

    expect(store.selectLiveSync()).toMatchObject({
      playbackState: "playing",
      trackId: "track-1",
      retryAvailable: true,
      retryInFlight: true,
      statusLine: "Retrying lyrics lookup...",
    });
  });

  it("supports paused and unavailable transitions", () => {
    const store = new LiveSyncStore();
    store.setPlaybackState("paused");
    expect(store.selectPlaybackState()).toBe("paused");

    store.setPlaybackState("unavailable");
    store.setStatusLine("Lyrics unavailable for this content.");
    expect(store.selectLiveSync().statusLine).toContain("unavailable");
  });
});
