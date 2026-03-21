import type { PlaybackSnapshot, PlaybackTransitionKind } from "../playback/types";
import { createLyricTimeline, getLineIndicesAt, type LyricLine, type LyricTimeline } from "./lyric-timeline";

export type SyncConfidence = "synced" | "estimated";

export type SyncFrame = {
  activeLineIndex: number | null;
  nextLineIndex: number | null;
  confidence: SyncConfidence;
  progressMs: number;
  isPlaying: boolean;
  trackId: string | null;
};

type SyncAnchor = {
  trackId: string;
  deviceId: string;
  progressMs: number;
  capturedAtPerfMs: number;
  sourceCapturedAtMs: number;
  isPlaying: boolean;
  confidence: SyncConfidence;
};

export type LyricSyncEngine = {
  setTimeline(lines: LyricLine[]): void;
  reanchor(input: { snapshot: PlaybackSnapshot; transition: PlaybackTransitionKind }): void;
  estimateFrame(): SyncFrame;
};

export type LyricSyncEngineDependencies = {
  nowPerfMs?: () => number;
};

const HARD_DRIFT_SNAP_MS = 1_200;
const MAX_SOFT_CORRECTION_MS = 100;

export function createLyricSyncEngine(
  dependencies: LyricSyncEngineDependencies = {},
): LyricSyncEngine {
  const nowPerfMs = dependencies.nowPerfMs ?? (() => performance.now());

  let timeline: LyricTimeline = createLyricTimeline([]);
  let anchor: SyncAnchor | null = null;

  function estimatedProgressAt(now: number): number {
    if (!anchor) {
      return 0;
    }
    if (!anchor.isPlaying) {
      return anchor.progressMs;
    }

    return Math.max(0, Math.floor(anchor.progressMs + (now - anchor.capturedAtPerfMs)));
  }

  function applyDriftPolicy(input: {
    estimatedMs: number;
    observedMs: number;
    transition: PlaybackTransitionKind;
  }): { progressMs: number; confidence: SyncConfidence } {
    if (
      input.transition === "seeked" ||
      input.transition === "track_changed" ||
      input.transition === "paused" ||
      input.transition === "resumed"
    ) {
      return { progressMs: input.observedMs, confidence: "synced" };
    }

    const drift = input.observedMs - input.estimatedMs;
    if (Math.abs(drift) > HARD_DRIFT_SNAP_MS) {
      return { progressMs: input.observedMs, confidence: "synced" };
    }

    if (drift === 0) {
      return { progressMs: input.estimatedMs, confidence: "synced" };
    }

    const boundedCorrection = Math.max(
      -MAX_SOFT_CORRECTION_MS,
      Math.min(MAX_SOFT_CORRECTION_MS, drift),
    );
    const correctedProgress = Math.max(0, Math.floor(input.estimatedMs + boundedCorrection));

    if (boundedCorrection === drift) {
      return { progressMs: input.observedMs, confidence: "synced" };
    }

    return {
      progressMs: correctedProgress,
      confidence: "estimated",
    };
  }

  return {
    setTimeline(lines: LyricLine[]) {
      timeline = createLyricTimeline(lines);
    },

    reanchor(input) {
      if (anchor && input.snapshot.capturedAtMs < anchor.sourceCapturedAtMs) {
        return;
      }

      const now = nowPerfMs();
      const estimatedMs = anchor ? estimatedProgressAt(now) : input.snapshot.progressMs;
      const adjusted = applyDriftPolicy({
        estimatedMs,
        observedMs: input.snapshot.progressMs,
        transition: input.transition,
      });

      anchor = {
        trackId: input.snapshot.trackId,
        deviceId: input.snapshot.deviceId,
        progressMs: adjusted.progressMs,
        capturedAtPerfMs: now,
        sourceCapturedAtMs: input.snapshot.capturedAtMs,
        isPlaying: input.snapshot.isPlaying,
        confidence: adjusted.confidence,
      };
    },

    estimateFrame() {
      const now = nowPerfMs();
      const progressMs = estimatedProgressAt(now);
      const indices = getLineIndicesAt(timeline, progressMs);

      return {
        activeLineIndex: indices.activeIndex,
        nextLineIndex: indices.nextIndex,
        confidence: anchor?.confidence ?? "estimated",
        progressMs,
        isPlaying: anchor?.isPlaying ?? false,
        trackId: anchor?.trackId ?? null,
      };
    },
  };
}
