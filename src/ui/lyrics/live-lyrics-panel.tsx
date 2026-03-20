import { buildLiveLyricsViewModel, type LiveLyricsViewModel } from "../../app/live-lyrics-presenter";
import type { LiveSyncUiState } from "../../state/playback/live-sync-store";

export type LiveLyricsPanelModel = LiveLyricsViewModel & {
  title: string;
  trackLabel: string;
};

export function createLiveLyricsPanelBuilder() {
  let lastTrackId: string | null = null;

  return {
    build(input: {
      syncState: LiveSyncUiState;
      lines: string[];
      trackTitle?: string;
      transientStatus?: "syncing" | "reconnecting";
      showReturnToLive: boolean;
    }): LiveLyricsPanelModel {
      const trackChanged =
        lastTrackId !== null && input.syncState.trackId !== null && lastTrackId !== input.syncState.trackId;
      lastTrackId = input.syncState.trackId;

      const effectiveState: LiveSyncUiState = trackChanged
        ? {
            ...input.syncState,
            activeLineIndex: null,
            nextLineIndex: null,
          }
        : input.syncState;

      const view = buildLiveLyricsViewModel({
        syncState: effectiveState,
        lines: input.lines,
        transientStatus: input.transientStatus,
        showReturnToLive: input.showReturnToLive,
      });

      return {
        title: "Live Lyrics",
        trackLabel: input.trackTitle ?? "No active track",
        ...view,
      };
    },
  };
}
