import { describe, expect, it, vi } from "vitest";

import type { PlaybackRuntimeEvent } from "./playback-runtime";
import { createLiveSyncRuntime } from "./live-sync-runtime";
import { createLyricSyncEngine } from "../core/sync/lyric-sync-engine";
import { LiveSyncStore } from "../state/playback/live-sync-store";

describe("createLiveSyncRuntime", () => {
  it("updates store for playing, paused, and idle playback states", () => {
    let playbackListener: ((event: PlaybackRuntimeEvent) => void) | null = null;
    let tickerCallback: (() => void) | null = null;
    let nowPerfMs = 1_000;
    const store = new LiveSyncStore();
    const engine = createLyricSyncEngine({ nowPerfMs: () => nowPerfMs });

    const runtime = createLiveSyncRuntime({
      subscribePlayback: (listener) => {
        playbackListener = listener;
        return () => {
          playbackListener = null;
        };
      },
      syncEngine: engine,
      liveSyncStore: store,
      getTimelineForTrack: () => [
        { startMs: 0, text: "a" },
        { startMs: 1_000, text: "b" },
      ],
      setIntervalFn: vi.fn((callback) => {
        tickerCallback = callback;
        return 0 as unknown as ReturnType<typeof setInterval>;
      }),
      clearIntervalFn: vi.fn(),
    });

    runtime.start();
    playbackListener?.({
      snapshot: {
        trackId: "track-1",
        deviceId: "device-a",
        isPlaying: true,
        progressMs: 400,
        capturedAtMs: 100,
      },
      transition: "no_change",
    });

    expect(store.selectPlaybackState()).toBe("playing");
    expect(store.selectLiveSync().activeLineIndex).toBe(0);
    expect(store.selectLiveSync().estimatedProgressMs).toBe(400);

    nowPerfMs = 1_750;
    tickerCallback?.();
    expect(store.selectLiveSync().estimatedProgressMs).toBe(1_150);

    playbackListener?.({
      snapshot: {
        trackId: "track-1",
        deviceId: "device-a",
        isPlaying: false,
        progressMs: 500,
        capturedAtMs: 200,
      },
      transition: "paused",
    });

    expect(store.selectPlaybackState()).toBe("paused");
    expect(store.selectLiveSync().estimatedProgressMs).toBe(500);

    playbackListener?.({ snapshot: null, transition: "no_change" });
    expect(store.selectPlaybackState()).toBe("idle");
    expect(store.selectLiveSync().activeLineIndex).toBeNull();
    expect(store.selectLiveSync().estimatedProgressMs).toBe(0);
  });

  it("marks unsupported tracks unavailable and keeps latest snapshot state", () => {
    let playbackListener: ((event: PlaybackRuntimeEvent) => void) | null = null;
    const store = new LiveSyncStore();
    const engine = createLyricSyncEngine({ nowPerfMs: () => 100 });

    const runtime = createLiveSyncRuntime({
      subscribePlayback: (listener) => {
        playbackListener = listener;
        return () => {
          playbackListener = null;
        };
      },
      syncEngine: engine,
      liveSyncStore: store,
      getTimelineForTrack: (trackId) => (trackId === "known" ? [{ startMs: 0, text: "line" }] : null),
      setIntervalFn: vi.fn(() => 0 as unknown as ReturnType<typeof setInterval>),
      clearIntervalFn: vi.fn(),
    });

    runtime.start();
    playbackListener?.({
      snapshot: {
        trackId: "unknown",
        deviceId: "device-a",
        isPlaying: true,
        progressMs: 200,
        capturedAtMs: 100,
      },
      transition: "track_changed",
    });

    expect(store.selectPlaybackState()).toBe("unavailable");
    expect(store.selectLiveSync().statusLine).toContain("unavailable");
  });

  it("keeps plain-static lyrics readable without activating timeline highlights", () => {
    let playbackListener: ((event: PlaybackRuntimeEvent) => void) | null = null;
    const store = new LiveSyncStore();
    const engine = createLyricSyncEngine({ nowPerfMs: () => 100 });

    const runtime = createLiveSyncRuntime({
      subscribePlayback: (listener) => {
        playbackListener = listener;
        return () => {
          playbackListener = null;
        };
      },
      syncEngine: engine,
      liveSyncStore: store,
      getTimelineForTrack: () => null,
      getResolvedLyricsForTrack: () => ({
        sourceState: "plain",
        renderMode: "plain-static",
        lines: [
          { startMs: null, text: "plain a", renderMode: "plain-static", isTimestamped: false },
          { startMs: null, text: "plain b", renderMode: "plain-static", isTimestamped: false },
        ],
      }),
      setIntervalFn: vi.fn(() => 0 as unknown as ReturnType<typeof setInterval>),
      clearIntervalFn: vi.fn(),
    });

    runtime.start();
    playbackListener?.({
      snapshot: {
        trackId: "plain-track",
        deviceId: "device-a",
        isPlaying: true,
        progressMs: 200,
        capturedAtMs: 100,
      },
      transition: "track_changed",
    });

    expect(store.selectPlaybackState()).toBe("playing");
    expect(store.selectLiveSync().activeLineIndex).toBeNull();
    expect(store.selectLiveSync().nextLineIndex).toBeNull();
    expect(store.selectLiveSync().confidence).toBe("static");
  });
});
