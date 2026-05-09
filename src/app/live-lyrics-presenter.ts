import type { LiveSyncUiState } from "../state/playback/live-sync-store";
import type { LyricRenderMode, LyricsSourceState } from "../core/lyrics/types";

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
  sourceState: LyricsSourceState;
  renderMode: LyricRenderMode | null;
  confidenceBadge?: string;
  warningBadge?: string;
  primaryActionLabel?: string;
  showPrimaryAction: boolean;
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
      sourceState: state.lyricsSourceState,
      renderMode: state.lyricsRenderMode,
      showPrimaryAction: false,
      showLyrics: false,
      showReturnToLive: input.showReturnToLive,
    };
  }

  if (state.playbackState === "idle") {
    return {
      status: "idle",
      statusLine: "Play a track on Spotify to start live lyrics.",
      sourceState: state.lyricsSourceState,
      renderMode: state.lyricsRenderMode,
      showPrimaryAction: false,
      showLyrics: false,
      showReturnToLive: input.showReturnToLive,
    };
  }

  if (state.playbackState === "unavailable") {
    return {
      status: "unsupported",
      statusLine: "Lyrics unavailable for this track or content.",
      sourceState: state.lyricsSourceState,
      renderMode: state.lyricsRenderMode,
      showPrimaryAction: false,
      showLyrics: false,
      showReturnToLive: input.showReturnToLive,
    };
  }

  if (state.trackId === null) {
    return {
      status: "no-track",
      statusLine: "Waiting for an active Spotify track...",
      sourceState: state.lyricsSourceState,
      renderMode: state.lyricsRenderMode,
      showPrimaryAction: false,
      showLyrics: false,
      showReturnToLive: input.showReturnToLive,
    };
  }

  const sourceState = state.lyricsSourceState;
  const renderMode = state.lyricsRenderMode;
  const isPlainMode = renderMode === "plain-static";
  const statusLine = state.retryInFlight
    ? state.statusLine
    : sourceState === "not-found"
      ? "Lyrics not found"
      : input.transientStatus === "syncing"
        ? "Syncing latest playback position..."
        : state.playbackState === "paused"
          ? "Playback paused."
          : "Live sync active.";

  const activeLineText =
    !isPlainMode && typeof state.activeLineIndex === "number" ? input.lines[state.activeLineIndex] : undefined;
  const nextLineText =
    !isPlainMode && typeof state.nextLineIndex === "number" ? input.lines[state.nextLineIndex] : undefined;
  const confidenceBadge =
    sourceState === "low-confidence"
      ? "Best guess"
      : isPlainMode || sourceState === "not-found"
        ? undefined
      : state.confidence === "estimated"
        ? "Estimated sync"
        : "Synced";
  const warningBadge = sourceState === "low-confidence" ? "Low confidence lyrics" : undefined;
  const showPrimaryAction = sourceState === "not-found" && state.retryAvailable && !state.retryInFlight;

  return {
    status: state.playbackState === "paused" ? "paused" : "syncing",
    statusLine,
    sourceState,
    renderMode,
    confidenceBadge,
    warningBadge,
    primaryActionLabel: showPrimaryAction ? "Retry" : undefined,
    showPrimaryAction,
    activeLineText,
    nextLineText,
    showLyrics: isPlainMode ? input.lines.length > 0 : Boolean(activeLineText || nextLineText),
    showReturnToLive: input.showReturnToLive,
  };
}
