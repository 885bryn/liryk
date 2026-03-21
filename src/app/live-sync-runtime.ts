import type { PlaybackRuntimeEvent } from "./playback-runtime";
import { createPlaybackClockAnchor, estimatePlaybackProgressMs } from "../core/playback/playback-clock";
import type { PlaybackClockAnchor } from "../core/playback/types";
import type { LyricLine } from "../core/sync/lyric-timeline";
import type { LyricSyncEngine, SyncFrame } from "../core/sync/lyric-sync-engine";
import type { ResolvedLyrics } from "../core/lyrics/types";
import { LiveSyncStore } from "../state/playback/live-sync-store";

export type LiveSyncRuntimeDependencies = {
  subscribePlayback: (listener: (event: PlaybackRuntimeEvent) => void) => () => void;
  syncEngine: LyricSyncEngine;
  liveSyncStore: LiveSyncStore;
  getTimelineForTrack: (trackId: string) => LyricLine[] | null;
  getResolvedLyricsForTrack?: (trackId: string) => ResolvedLyrics | null;
  requestAnimationFrameFn?: (callback: FrameRequestCallback) => number;
  cancelAnimationFrameFn?: (frameId: number) => void;
  nowPerfMs?: () => number;
};

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
  const requestAnimationFrameFn = dependencies.requestAnimationFrameFn ?? requestAnimationFrame;
  const cancelAnimationFrameFn = dependencies.cancelAnimationFrameFn ?? cancelAnimationFrame;
  const nowPerfMs = dependencies.nowPerfMs ?? (() => performance.now());

  let unsubscribePlayback: (() => void) | null = null;
  let frameRequestId: number | null = null;
  let frameLoopToken = 0;
  let frameLoopRunning = false;
  let playbackClockAnchor: PlaybackClockAnchor | null = null;

  function applyEstimatedProgress(): void {
    if (!playbackClockAnchor) {
      dependencies.liveSyncStore.setEstimatedProgressMs(0);
      return;
    }

    dependencies.liveSyncStore.setEstimatedProgressMs(
      estimatePlaybackProgressMs(playbackClockAnchor, nowPerfMs()),
    );
  }

  function applyFrame(): SyncFrame {
    const frame = dependencies.syncEngine.estimateFrame();
    dependencies.liveSyncStore.setEstimatedProgressMs(frame.progressMs);
    dependencies.liveSyncStore.setActiveLine(frame.activeLineIndex);
    dependencies.liveSyncStore.setNextLine(frame.nextLineIndex);
    dependencies.liveSyncStore.setConfidence(frame.confidence);
    return frame;
  }

  function applySampleDiagnostics(input: { estimatedProgressMs: number; polledProgressMs: number; correctionState: "synced" | "estimated" | "static" }): void {
    dependencies.liveSyncStore.setPolledProgressMs(input.polledProgressMs);
    dependencies.liveSyncStore.setDriftDeltaMs(input.estimatedProgressMs - input.polledProgressMs);
    dependencies.liveSyncStore.setCorrectionState(input.correctionState);
  }

  function stopTicker(): void {
    frameLoopRunning = false;
    frameLoopToken += 1;
    if (frameRequestId !== null) {
      cancelAnimationFrameFn(frameRequestId);
      frameRequestId = null;
    }
  }

  function scheduleNextFrame(frameToken: number): void {
    if (!frameLoopRunning || frameToken !== frameLoopToken || frameRequestId !== null) {
      return;
    }

    frameRequestId = requestAnimationFrameFn(() => {
      frameRequestId = null;
      if (!frameLoopRunning || frameToken !== frameLoopToken) {
        return;
      }

      applyFrame();
      scheduleNextFrame(frameToken);
    });
  }

  function ensureTicker(): void {
    if (frameLoopRunning) {
      return;
    }

    frameLoopRunning = true;
    frameLoopToken += 1;
    scheduleNextFrame(frameLoopToken);
  }

  function onSnapshot(event: PlaybackRuntimeEvent): void {
    if (!event.snapshot) {
      playbackClockAnchor = null;
      stopTicker();
      dependencies.liveSyncStore.setPlaybackState("idle");
      dependencies.liveSyncStore.setTrack(null);
      dependencies.liveSyncStore.setEstimatedProgressMs(0);
      dependencies.liveSyncStore.setPolledProgressMs(0);
      dependencies.liveSyncStore.setDriftDeltaMs(0);
      dependencies.liveSyncStore.setCorrectionState("static");
      dependencies.liveSyncStore.setActiveLine(null);
      dependencies.liveSyncStore.setNextLine(null);
      dependencies.liveSyncStore.setConfidence("static");
      dependencies.liveSyncStore.setStatusLine(statusForState("idle"));
      return;
    }

    playbackClockAnchor = createPlaybackClockAnchor({
      snapshot: event.snapshot,
      capturedAtPerfMs: nowPerfMs(),
    });

    const timeline = dependencies.getTimelineForTrack(event.snapshot.trackId);
    if (!timeline || timeline.length === 0) {
      const resolved = dependencies.getResolvedLyricsForTrack?.(event.snapshot.trackId) ?? null;
      stopTicker();
      applyEstimatedProgress();
      applySampleDiagnostics({
        estimatedProgressMs: dependencies.liveSyncStore.selectLiveSync().estimatedProgressMs,
        polledProgressMs: event.snapshot.progressMs,
        correctionState: "static",
      });

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
    const frame = applyFrame();
    applySampleDiagnostics({
      estimatedProgressMs: frame.progressMs,
      polledProgressMs: event.snapshot.progressMs,
      correctionState: frame.confidence,
    });

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
