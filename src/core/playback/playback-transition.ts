import {
  PLAYBACK_SEEK_THRESHOLD_MS,
  type PlaybackSnapshot,
  type PlaybackTransitionKind,
} from "./types";

function expectedProgressMs(previous: PlaybackSnapshot, current: PlaybackSnapshot): number {
  if (!previous.isPlaying) {
    return previous.progressMs;
  }

  const elapsedMs = Math.max(0, current.capturedAtMs - previous.capturedAtMs);
  return previous.progressMs + elapsedMs;
}

export function classifyPlaybackTransition(
  previous: PlaybackSnapshot | null,
  current: PlaybackSnapshot,
): PlaybackTransitionKind {
  if (!previous) {
    return "no_change";
  }

  if (previous.trackId !== current.trackId) {
    return "track_changed";
  }

  if (previous.deviceId !== current.deviceId) {
    return "device_changed";
  }

  if (previous.isPlaying !== current.isPlaying) {
    return current.isPlaying ? "resumed" : "paused";
  }

  const expected = expectedProgressMs(previous, current);
  const driftMs = Math.abs(current.progressMs - expected);
  if (driftMs > PLAYBACK_SEEK_THRESHOLD_MS) {
    return "seeked";
  }

  return "no_change";
}
