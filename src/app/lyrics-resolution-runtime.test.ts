import { describe, expect, it, vi } from "vitest";

import type { PlaybackRuntimeEvent } from "./playback-runtime";
import { createLyricsResolutionRuntime } from "./lyrics-resolution-runtime";
import { LiveSyncStore } from "../state/playback/live-sync-store";
import type { LyricTrackMetadata, ResolvedLyrics } from "../core/lyrics/types";

function syncedResult(text: string): ResolvedLyrics {
  return {
    sourceState: "synced",
    renderMode: "synced",
    lines: [{ startMs: 1_000, text, renderMode: "synced", isTimestamped: true }],
  };
}

describe("createLyricsResolutionRuntime", () => {
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
});
