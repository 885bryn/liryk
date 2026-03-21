import type { PlaybackClockAnchor, PlaybackClockSample } from "./types";

export function createPlaybackClockAnchor(sample: PlaybackClockSample): PlaybackClockAnchor {
  return {
    trackId: sample.snapshot.trackId,
    deviceId: sample.snapshot.deviceId,
    isPlaying: sample.snapshot.isPlaying,
    progressMs: sample.snapshot.progressMs,
    sourceCapturedAtMs: sample.snapshot.capturedAtMs,
    capturedAtPerfMs: sample.capturedAtPerfMs,
  };
}

export function estimatePlaybackProgressMs(anchor: PlaybackClockAnchor, nowPerfMs: number): number {
  const elapsedMs = Math.max(0, nowPerfMs - anchor.capturedAtPerfMs);
  const progressMs = anchor.isPlaying ? anchor.progressMs + elapsedMs : anchor.progressMs;
  return Math.max(0, progressMs);
}
