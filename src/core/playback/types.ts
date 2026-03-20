export type PlaybackSnapshot = {
  trackId: string;
  deviceId: string;
  isPlaying: boolean;
  progressMs: number;
  capturedAtMs: number;
};

export type PlaybackTransitionKind =
  | "no_change"
  | "paused"
  | "resumed"
  | "seeked"
  | "track_changed"
  | "device_changed";

export const PLAYBACK_SEEK_THRESHOLD_MS = 1_200;

export function isNewerSnapshot(current: PlaybackSnapshot, incoming: PlaybackSnapshot): boolean {
  if (incoming.capturedAtMs !== current.capturedAtMs) {
    return incoming.capturedAtMs > current.capturedAtMs;
  }

  if (incoming.trackId !== current.trackId) {
    return true;
  }

  return incoming.progressMs >= current.progressMs;
}
