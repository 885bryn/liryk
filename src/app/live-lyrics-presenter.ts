import type { LiveSyncUiState } from "../state/playback/live-sync-store";

export type LiveLyricsStatus =
  | "idle"
  | "syncing"
  | "reconnecting"
  | "no-track"
  | "unsupported"
  | "paused";

export type LiveLyricsViewModel = {
  status: LiveLyricsStatus;
  statusLine: string;
  confidenceBadge?: string;
  activeLineText?: string;
  nextLineText?: string;
  showLyrics: boolean;
  showReturnToLive: boolean;
};

export function buildLiveLyricsViewModel(input: {
  syncState: LiveSyncUiState;
  lines: string[];
  transientStatus?: "syncing" | "reconnecting";
  showReturnToLive: boolean;
}): LiveLyricsViewModel {
  const state = input.syncState;

  if (input.transientStatus === "reconnecting") {
    return {
      status: "reconnecting",
      statusLine: "Reconnecting to Spotify playback...",
      showLyrics: false,
      showReturnToLive: input.showReturnToLive,
    };
  }

  if (state.playbackState === "idle") {
    return {
      status: "idle",
      statusLine: "Play a track on Spotify to start live lyrics.",
      showLyrics: false,
      showReturnToLive: input.showReturnToLive,
    };
  }

  if (state.playbackState === "unavailable") {
    return {
      status: "unsupported",
      statusLine: "Lyrics unavailable for this track or content.",
      showLyrics: false,
      showReturnToLive: input.showReturnToLive,
    };
  }

  if (state.trackId === null) {
    return {
      status: "no-track",
      statusLine: "Waiting for an active Spotify track...",
      showLyrics: false,
      showReturnToLive: input.showReturnToLive,
    };
  }

  const activeLineText =
    typeof state.activeLineIndex === "number" ? input.lines[state.activeLineIndex] : undefined;
  const nextLineText =
    typeof state.nextLineIndex === "number" ? input.lines[state.nextLineIndex] : undefined;
  const confidenceBadge = state.confidence === "estimated" ? "Estimated sync" : "Synced";

  return {
    status: state.playbackState === "paused" ? "paused" : "syncing",
    statusLine:
      input.transientStatus === "syncing"
        ? "Syncing latest playback position..."
        : state.playbackState === "paused"
          ? "Playback paused."
          : "Live sync active.",
    confidenceBadge,
    activeLineText,
    nextLineText,
    showLyrics: Boolean(activeLineText || nextLineText),
    showReturnToLive: input.showReturnToLive,
  };
}
