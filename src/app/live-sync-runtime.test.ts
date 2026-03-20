import { describe, expect, it, vi } from "vitest";

import type { PlaybackRuntimeEvent } from "./playback-runtime";
import { createLiveSyncRuntime } from "./live-sync-runtime";
import { createLyricSyncEngine } from "../core/sync/lyric-sync-engine";
import { LiveSyncStore } from "../state/playback/live-sync-store";

describe("createLiveSyncRuntime", () => {
  it("updates store for playing, paused, and idle playback states", () => {
    let playbackListener: ((event: PlaybackRuntimeEvent) => void) | null = null;
    const store = new LiveSyncStore();
    const engine = createLyricSyncEngine({ nowPerfMs: () => 1_000 });

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
      setIntervalFn: vi.fn(() => 0 as unknown as ReturnType<typeof setInterval>),
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

    playbackListener?.({ snapshot: null, transition: "no_change" });
    expect(store.selectPlaybackState()).toBe("idle");
    expect(store.selectLiveSync().activeLineIndex).toBeNull();
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
});
