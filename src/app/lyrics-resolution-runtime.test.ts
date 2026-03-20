import { describe, expect, it, vi } from "vitest";

import type { PlaybackRuntimeEvent } from "./playback-runtime";
import { createLyricsResolutionRuntime } from "./lyrics-resolution-runtime";
import { createLyricsCacheEntry } from "../core/lyrics/cache-policy";
import { LiveSyncStore } from "../state/playback/live-sync-store";
import type { LyricTrackMetadata, ResolvedLyrics } from "../core/lyrics/types";

function syncedResult(text: string): ResolvedLyrics {
  return {
    sourceState: "synced",
    renderMode: "synced",
    lines: [{ startMs: 1_000, text, renderMode: "synced", isTimestamped: true }],
  };
}

function plainResult(text: string): ResolvedLyrics {
  return {
    sourceState: "plain",
    renderMode: "plain-static",
    lines: [{ startMs: null, text, renderMode: "plain-static", isTimestamped: false }],
  };
}

async function flushRuntimeWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("createLyricsResolutionRuntime", () => {
  it("returns fresh cache hits immediately and skips provider resolution", async () => {
    let listener: ((event: PlaybackRuntimeEvent) => void) | null = null;
    const store = new LiveSyncStore();
    const resolveLyricsForTrack = vi.fn().mockResolvedValue(syncedResult("provider"));
    const cached = createLyricsCacheEntry({
      trackId: "track-1",
      resolvedLyrics: syncedResult("cached"),
      fetchedAtMs: 1_000,
    });

    const runtime = createLyricsResolutionRuntime({
      subscribePlayback: (next) => {
        listener = next;
        return () => {
          listener = null;
        };
      },
      resolveLyricsForTrack,
      liveSyncStore: store,
      cache: {
        read: vi.fn().mockResolvedValue(cached),
        write: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      evaluateCacheEntry: () => "fresh",
    } as never);

    runtime.start();
    listener?.({
      snapshot: { trackId: "track-1", deviceId: "d", isPlaying: true, progressMs: 0, capturedAtMs: 1 },
      transition: "track_changed",
    });
    await flushRuntimeWork();

    expect(store.selectLiveSync().resolvedLyrics[0]?.text).toBe("cached");
    expect(resolveLyricsForTrack).not.toHaveBeenCalled();
  });

  it("returns stale cache entry immediately then refreshes in background", async () => {
    let listener: ((event: PlaybackRuntimeEvent) => void) | null = null;
    const store = new LiveSyncStore();
    let resolveProvider: ((value: ResolvedLyrics) => void) | null = null;
    const resolveLyricsForTrack = vi.fn(
      () =>
        new Promise<ResolvedLyrics>((resolve) => {
          resolveProvider = resolve;
        }),
    );
    const cached = createLyricsCacheEntry({
      trackId: "track-1",
      resolvedLyrics: plainResult("stale"),
      fetchedAtMs: 1_000,
    });

    const runtime = createLyricsResolutionRuntime({
      subscribePlayback: (next) => {
        listener = next;
        return () => {
          listener = null;
        };
      },
      resolveLyricsForTrack,
      liveSyncStore: store,
      cache: {
        read: vi.fn().mockResolvedValue(cached),
        write: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      evaluateCacheEntry: () => "stale",
    } as never);

    runtime.start();
    listener?.({
      snapshot: { trackId: "track-1", deviceId: "d", isPlaying: true, progressMs: 0, capturedAtMs: 1 },
      transition: "track_changed",
    });
    await flushRuntimeWork();

    expect(store.selectLiveSync().resolvedLyrics[0]?.text).toBe("stale");
    expect(resolveLyricsForTrack).toHaveBeenCalledTimes(1);

    resolveProvider?.(plainResult("fresh"));
    await flushRuntimeWork();

    expect(store.selectLiveSync().resolvedLyrics[0]?.text).toBe("fresh");
  });

  it("bypasses expired cache entries and resolves from provider", async () => {
    let listener: ((event: PlaybackRuntimeEvent) => void) | null = null;
    const store = new LiveSyncStore();
    const resolveLyricsForTrack = vi.fn().mockResolvedValue(syncedResult("provider"));
    const cached = createLyricsCacheEntry({
      trackId: "track-1",
      resolvedLyrics: syncedResult("cached"),
      fetchedAtMs: 1_000,
    });

    const runtime = createLyricsResolutionRuntime({
      subscribePlayback: (next) => {
        listener = next;
        return () => {
          listener = null;
        };
      },
      resolveLyricsForTrack,
      liveSyncStore: store,
      cache: {
        read: vi.fn().mockResolvedValue(cached),
        write: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      evaluateCacheEntry: () => "expired",
    } as never);

    runtime.start();
    listener?.({
      snapshot: { trackId: "track-1", deviceId: "d", isPlaying: true, progressMs: 0, capturedAtMs: 1 },
      transition: "track_changed",
    });
    await flushRuntimeWork();

    expect(resolveLyricsForTrack).toHaveBeenCalledTimes(1);
    expect(store.selectLiveSync().resolvedLyrics[0]?.text).toBe("provider");
  });

  it("starts fresh on track change and suppresses stale async results", async () => {
    let listener: ((event: PlaybackRuntimeEvent) => void) | null = null;
    const store = new LiveSyncStore();
    const deferred: Array<(value: ResolvedLyrics) => void> = [];

    const runtime = createLyricsResolutionRuntime({
      subscribePlayback: (next) => {
        listener = next;
        return () => {
          listener = null;
        };
      },
      resolveLyricsForTrack: vi.fn((metadata: LyricTrackMetadata) =>
        new Promise<ResolvedLyrics>((resolve) => {
          deferred.push(resolve);
          if (metadata.trackId === "track-1") {
            return;
          }
        }),
      ),
      liveSyncStore: store,
    });

    runtime.start();
    listener?.({
      snapshot: { trackId: "track-1", deviceId: "d", isPlaying: true, progressMs: 0, capturedAtMs: 1 },
      transition: "track_changed",
    });
    listener?.({
      snapshot: { trackId: "track-2", deviceId: "d", isPlaying: true, progressMs: 0, capturedAtMs: 2 },
      transition: "track_changed",
    });

    deferred[0]?.(syncedResult("old"));
    deferred[1]?.(syncedResult("new"));
    await Promise.resolve();

    expect(store.selectLiveSync().resolvedLyrics[0]?.text).toBe("new");
  });

  it("projects explicit not-found state with retry available", async () => {
    let listener: ((event: PlaybackRuntimeEvent) => void) | null = null;
    const store = new LiveSyncStore();
    const runtime = createLyricsResolutionRuntime({
      subscribePlayback: (next) => {
        listener = next;
        return () => {
          listener = null;
        };
      },
      resolveLyricsForTrack: vi.fn().mockResolvedValue({
        sourceState: "not-found",
        renderMode: "plain-static",
        lines: [],
      }),
      liveSyncStore: store,
    });

    runtime.start();
    listener?.({
      snapshot: { trackId: "track-1", deviceId: "d", isPlaying: true, progressMs: 0, capturedAtMs: 1 },
      transition: "track_changed",
    });
    await Promise.resolve();

    expect(store.selectLiveSync()).toMatchObject({
      lyricsSourceState: "not-found",
      statusLine: "Lyrics not found",
      retryAvailable: true,
    });
  });

  it("runs retry with transient status while keeping current panel state", async () => {
    let listener: ((event: PlaybackRuntimeEvent) => void) | null = null;
    const store = new LiveSyncStore();
    const resolveLyricsForTrack = vi
      .fn()
      .mockResolvedValueOnce({ sourceState: "not-found", renderMode: "plain-static", lines: [] })
      .mockResolvedValueOnce({ sourceState: "plain", renderMode: "plain-static", lines: [] });

    const runtime = createLyricsResolutionRuntime({
      subscribePlayback: (next) => {
        listener = next;
        return () => {
          listener = null;
        };
      },
      resolveLyricsForTrack,
      liveSyncStore: store,
    });

    runtime.start();
    listener?.({
      snapshot: { trackId: "track-1", deviceId: "d", isPlaying: true, progressMs: 0, capturedAtMs: 1 },
      transition: "track_changed",
    });
    await Promise.resolve();

    const retryPromise = runtime.retry();
    expect(store.selectLiveSync().statusLine).toBe("Retrying lyrics lookup...");
    await retryPromise;

    expect(store.selectLiveSync().retryInFlight).toBe(false);
    expect(store.selectLiveSync().lyricsSourceState).toBe("plain");
  });

  it("evicts invalid cache entries before resolving fresh lyrics", async () => {
    let listener: ((event: PlaybackRuntimeEvent) => void) | null = null;
    const store = new LiveSyncStore();
    const cacheDelete = vi.fn().mockResolvedValue(undefined);
    const resolveLyricsForTrack = vi.fn().mockResolvedValue(syncedResult("provider"));

    const runtime = createLyricsResolutionRuntime({
      subscribePlayback: (next) => {
        listener = next;
        return () => {
          listener = null;
        };
      },
      resolveLyricsForTrack,
      liveSyncStore: store,
      cache: {
        read: vi.fn().mockResolvedValue(
          createLyricsCacheEntry({
            trackId: "track-1",
            resolvedLyrics: syncedResult("cached"),
            fetchedAtMs: 1_000,
          }),
        ),
        write: vi.fn().mockResolvedValue(undefined),
        delete: cacheDelete,
      },
      evaluateCacheEntry: () => "invalid",
    });

    runtime.start();
    listener?.({
      snapshot: { trackId: "track-1", deviceId: "d", isPlaying: true, progressMs: 0, capturedAtMs: 1 },
      transition: "track_changed",
    });
    await flushRuntimeWork();

    expect(cacheDelete).toHaveBeenCalledWith("track-1");
    expect(resolveLyricsForTrack).toHaveBeenCalledTimes(1);
    expect(store.selectLiveSync().resolvedLyrics[0]?.text).toBe("provider");
  });

  it("bypasses cache on retry and rewrites with fresh provider output", async () => {
    let listener: ((event: PlaybackRuntimeEvent) => void) | null = null;
    const store = new LiveSyncStore();
    const cacheRead = vi.fn().mockResolvedValue(
      createLyricsCacheEntry({
        trackId: "track-1",
        resolvedLyrics: plainResult("cached"),
        fetchedAtMs: 1_000,
      }),
    );
    const cacheWrite = vi.fn().mockResolvedValue(undefined);
    const resolveLyricsForTrack = vi.fn().mockResolvedValue(syncedResult("fresh"));

    const runtime = createLyricsResolutionRuntime({
      subscribePlayback: (next) => {
        listener = next;
        return () => {
          listener = null;
        };
      },
      resolveLyricsForTrack,
      liveSyncStore: store,
      cache: {
        read: cacheRead,
        write: cacheWrite,
        delete: vi.fn().mockResolvedValue(undefined),
      },
      evaluateCacheEntry: () => "fresh",
    });

    runtime.start();
    listener?.({
      snapshot: { trackId: "track-1", deviceId: "d", isPlaying: true, progressMs: 0, capturedAtMs: 1 },
      transition: "track_changed",
    });
    await flushRuntimeWork();

    await runtime.retry();

    expect(cacheRead).toHaveBeenCalledTimes(1);
    expect(resolveLyricsForTrack).toHaveBeenCalledTimes(1);
    expect(cacheWrite).toHaveBeenCalledTimes(1);
    expect(store.selectLiveSync().resolvedLyrics[0]?.text).toBe("fresh");
  });

  it("keeps stale refresh and retry session-guarded from overriding a newer track", async () => {
    let listener: ((event: PlaybackRuntimeEvent) => void) | null = null;
    const store = new LiveSyncStore();
    const deferred: Array<(value: ResolvedLyrics) => void> = [];
    const resolveLyricsForTrack = vi.fn(
      () =>
        new Promise<ResolvedLyrics>((resolve) => {
          deferred.push(resolve);
        }),
    );

    const runtime = createLyricsResolutionRuntime({
      subscribePlayback: (next) => {
        listener = next;
        return () => {
          listener = null;
        };
      },
      resolveLyricsForTrack,
      liveSyncStore: store,
      cache: {
        read: vi
          .fn()
          .mockResolvedValueOnce(
            createLyricsCacheEntry({
              trackId: "track-1",
              resolvedLyrics: plainResult("old-cached"),
              fetchedAtMs: 1_000,
            }),
          )
          .mockResolvedValueOnce(null),
        write: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      evaluateCacheEntry: () => "stale",
    });

    runtime.start();
    listener?.({
      snapshot: { trackId: "track-1", deviceId: "d", isPlaying: true, progressMs: 0, capturedAtMs: 1 },
      transition: "track_changed",
    });
    await flushRuntimeWork();

    listener?.({
      snapshot: { trackId: "track-2", deviceId: "d", isPlaying: true, progressMs: 0, capturedAtMs: 2 },
      transition: "track_changed",
    });

    deferred[0]?.(plainResult("stale-refresh"));
    deferred[1]?.(plainResult("track-2"));
    await flushRuntimeWork();

    expect(store.selectLiveSync().trackId).toBe("track-2");
    expect(store.selectLiveSync().resolvedLyrics[0]?.text).toBe("track-2");
  });
});
