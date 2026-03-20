import type { PlaybackRuntimeEvent } from "./playback-runtime";
import type { LyricLine } from "../core/sync/lyric-timeline";
import type { LyricSyncEngine } from "../core/sync/lyric-sync-engine";
import type { ResolvedLyrics } from "../core/lyrics/types";
import { LiveSyncStore } from "../state/playback/live-sync-store";

export type LiveSyncRuntimeDependencies = {
  subscribePlayback: (listener: (event: PlaybackRuntimeEvent) => void) => () => void;
  syncEngine: LyricSyncEngine;
  liveSyncStore: LiveSyncStore;
  getTimelineForTrack: (trackId: string) => LyricLine[] | null;
  getResolvedLyricsForTrack?: (trackId: string) => ResolvedLyrics | null;
  setIntervalFn?: (callback: () => void, delayMs: number) => ReturnType<typeof setInterval>;
  clearIntervalFn?: (timer: ReturnType<typeof setInterval>) => void;
};

const FRAME_MS = 250;

export type LiveSyncRuntime = {
  start(): void;
  stop(): void;
};

function statusForState(playbackState: "idle" | "playing" | "paused" | "unavailable"): string {
  switch (playbackState) {
    case "playing":
      return "Syncing lyrics...";
    case "paused":
      return "Playback paused.";
    case "unavailable":
      return "Lyrics unavailable for this content.";
    default:
      return "Play a track on Spotify to start live lyrics.";
  }
}

export function createLiveSyncRuntime(dependencies: LiveSyncRuntimeDependencies): LiveSyncRuntime {
  const setIntervalFn = dependencies.setIntervalFn ?? setInterval;
  const clearIntervalFn = dependencies.clearIntervalFn ?? clearInterval;

  let unsubscribePlayback: (() => void) | null = null;
  let frameTimer: ReturnType<typeof setInterval> | null = null;

  function applyFrame(): void {
    const frame = dependencies.syncEngine.estimateFrame();
    dependencies.liveSyncStore.setActiveLine(frame.activeLineIndex);
    dependencies.liveSyncStore.setNextLine(frame.nextLineIndex);
    dependencies.liveSyncStore.setConfidence(frame.confidence);
  }

  function stopTicker(): void {
    if (frameTimer) {
      clearIntervalFn(frameTimer);
      frameTimer = null;
    }
  }

  function ensureTicker(): void {
    if (frameTimer) {
      return;
    }
    frameTimer = setIntervalFn(() => {
      applyFrame();
    }, FRAME_MS);
  }

  function onSnapshot(event: PlaybackRuntimeEvent): void {
    if (!event.snapshot) {
      stopTicker();
      dependencies.liveSyncStore.setPlaybackState("idle");
      dependencies.liveSyncStore.setTrack(null);
      dependencies.liveSyncStore.setActiveLine(null);
      dependencies.liveSyncStore.setNextLine(null);
      dependencies.liveSyncStore.setConfidence("static");
      dependencies.liveSyncStore.setStatusLine(statusForState("idle"));
      return;
    }

    const timeline = dependencies.getTimelineForTrack(event.snapshot.trackId);
    if (!timeline || timeline.length === 0) {
      const resolved = dependencies.getResolvedLyricsForTrack?.(event.snapshot.trackId) ?? null;
      stopTicker();

      if (resolved) {
        const playbackState = event.snapshot.isPlaying ? "playing" : "paused";
        dependencies.liveSyncStore.setPlaybackState(playbackState);
        dependencies.liveSyncStore.setTrack(event.snapshot.trackId);
        dependencies.liveSyncStore.setActiveLine(null);
        dependencies.liveSyncStore.setNextLine(null);
        dependencies.liveSyncStore.setConfidence("static");
        if (resolved.sourceState !== "not-found") {
          dependencies.liveSyncStore.setStatusLine(statusForState(playbackState));
        }
        return;
      }

      dependencies.liveSyncStore.setPlaybackState("unavailable");
      dependencies.liveSyncStore.setTrack(event.snapshot.trackId);
      dependencies.liveSyncStore.setStatusLine(statusForState("unavailable"));
      return;
    }

    dependencies.syncEngine.setTimeline(timeline);
    dependencies.syncEngine.reanchor({ snapshot: event.snapshot, transition: event.transition });

    const playbackState = event.snapshot.isPlaying ? "playing" : "paused";
    dependencies.liveSyncStore.setPlaybackState(playbackState);
    dependencies.liveSyncStore.setTrack(event.snapshot.trackId);
    dependencies.liveSyncStore.setStatusLine(statusForState(playbackState));
    applyFrame();

    if (event.snapshot.isPlaying) {
      ensureTicker();
    } else {
      stopTicker();
    }
  }

  return {
    start() {
      if (unsubscribePlayback) {
        return;
      }
      unsubscribePlayback = dependencies.subscribePlayback(onSnapshot);
    },

    stop() {
      unsubscribePlayback?.();
      unsubscribePlayback = null;
      stopTicker();
    },
  };
}
