import { describe, expect, it, vi } from "vitest";

import type { PlaybackRuntimeEvent } from "./playback-runtime";
import { createLiveSyncRuntime } from "./live-sync-runtime";
import { createLyricSyncEngine } from "../core/sync/lyric-sync-engine";
import { LiveSyncStore } from "../state/playback/live-sync-store";

describe("createLiveSyncRuntime", () => {
  it("schedules requestAnimationFrame while playing and updates progress on callbacks", () => {
    let playbackListener: ((event: PlaybackRuntimeEvent) => void) | null = null;
    let nextFrameId = 1;
    const pendingFrames = new Map<number, () => void>();
    let nowPerfMs = 1_000;
    const store = new LiveSyncStore();
    const engine = createLyricSyncEngine({ nowPerfMs: () => nowPerfMs });
    const requestAnimationFrameFn = vi.fn((callback: () => void) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      pendingFrames.set(frameId, callback);
      return frameId;
    });
    const cancelAnimationFrameFn = vi.fn((frameId: number) => {
      pendingFrames.delete(frameId);
    });

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
      nowPerfMs: () => nowPerfMs,
      requestAnimationFrameFn,
      cancelAnimationFrameFn,
    } as never);

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
    expect(requestAnimationFrameFn).toHaveBeenCalledTimes(1);

    nowPerfMs = 1_750;
    pendingFrames.get(1)?.();
    expect(store.selectLiveSync().estimatedProgressMs).toBe(1_150);
    expect(requestAnimationFrameFn).toHaveBeenCalledTimes(2);
  });

  it("cancels pending requestAnimationFrame when playback pauses", () => {
    let playbackListener: ((event: PlaybackRuntimeEvent) => void) | null = null;
    let nextFrameId = 1;
    const pendingFrames = new Map<number, () => void>();
    const store = new LiveSyncStore();
    const engine = createLyricSyncEngine({ nowPerfMs: () => 1_000 });
    const requestAnimationFrameFn = vi.fn((callback: () => void) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      pendingFrames.set(frameId, callback);
      return frameId;
    });
    const cancelAnimationFrameFn = vi.fn((frameId: number) => {
      pendingFrames.delete(frameId);
    });

    const runtime = createLiveSyncRuntime({
      subscribePlayback: (listener) => {
        playbackListener = listener;
        return () => {
          playbackListener = null;
        };
      },
      syncEngine: engine,
      liveSyncStore: store,
      getTimelineForTrack: () => [{ startMs: 0, text: "a" }],
      requestAnimationFrameFn,
      cancelAnimationFrameFn,
    } as never);

    runtime.start();
    playbackListener?.({
      snapshot: {
        trackId: "track-1",
        deviceId: "device-a",
        isPlaying: true,
        progressMs: 100,
        capturedAtMs: 100,
      },
      transition: "no_change",
    });

    expect(requestAnimationFrameFn).toHaveBeenCalledTimes(1);

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

    expect(cancelAnimationFrameFn).toHaveBeenCalledWith(1);
    pendingFrames.get(1)?.();
    expect(store.selectPlaybackState()).toBe("paused");
    expect(store.selectLiveSync().estimatedProgressMs).toBe(500);
    expect(requestAnimationFrameFn).toHaveBeenCalledTimes(1);
  });

  it("cancels pending requestAnimationFrame for idle snapshots and runtime stop", () => {
    let playbackListener: ((event: PlaybackRuntimeEvent) => void) | null = null;
    let nextFrameId = 1;
    const pendingFrames = new Map<number, () => void>();
    let nowPerfMs = 1_000;
    const store = new LiveSyncStore();
    const engine = createLyricSyncEngine({ nowPerfMs: () => nowPerfMs });
    const requestAnimationFrameFn = vi.fn((callback: () => void) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      pendingFrames.set(frameId, callback);
      return frameId;
    });
    const cancelAnimationFrameFn = vi.fn((frameId: number) => {
      pendingFrames.delete(frameId);
    });

    const runtime = createLiveSyncRuntime({
      subscribePlayback: (listener) => {
        playbackListener = listener;
        return () => {
          playbackListener = null;
        };
      },
      syncEngine: engine,
      liveSyncStore: store,
      getTimelineForTrack: () => [{ startMs: 0, text: "a" }],
      nowPerfMs: () => nowPerfMs,
      requestAnimationFrameFn,
      cancelAnimationFrameFn,
    } as never);

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

    expect(requestAnimationFrameFn).toHaveBeenCalledTimes(1);

    playbackListener?.({ snapshot: null, transition: "no_change" });
    expect(cancelAnimationFrameFn).toHaveBeenCalledWith(1);
    expect(store.selectPlaybackState()).toBe("idle");
    expect(store.selectLiveSync().activeLineIndex).toBeNull();
    expect(store.selectLiveSync().estimatedProgressMs).toBe(0);

    playbackListener?.({
      snapshot: {
        trackId: "track-1",
        deviceId: "device-a",
        isPlaying: true,
        progressMs: 450,
        capturedAtMs: 200,
      },
      transition: "no_change",
    });

    expect(requestAnimationFrameFn).toHaveBeenCalledTimes(2);
    runtime.stop();
    expect(cancelAnimationFrameFn).toHaveBeenCalledWith(2);
    pendingFrames.get(2)?.();
    expect(store.selectLiveSync().estimatedProgressMs).toBe(450);
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
      requestAnimationFrameFn: vi.fn(() => 0),
      cancelAnimationFrameFn: vi.fn(),
    } as never);

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
      requestAnimationFrameFn: vi.fn(() => 0),
      cancelAnimationFrameFn: vi.fn(),
    } as never);

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
