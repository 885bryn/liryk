import type { SyncConfidence } from "../../core/sync/lyric-sync-engine";
import type { LyricRenderMode, LyricsSourceState, ResolvedLyricLine, ResolvedLyrics } from "../../core/lyrics/types";

export type PlaybackUiState = "idle" | "playing" | "paused" | "unavailable";
export type DiagnosticsCorrectionState = SyncConfidence | "static" | "hard-reset";

export type LiveSyncUiState = {
  playbackState: PlaybackUiState;
  activeLineIndex: number | null;
  nextLineIndex: number | null;
  confidence: SyncConfidence | "static";
  trackId: string | null;
  statusLine: string;
  resolvedLyrics: ResolvedLyricLine[];
  lyricsSourceState: LyricsSourceState;
  lyricsRenderMode: LyricRenderMode | null;
  lyricsWarning: string | null;
  retryAvailable: boolean;
  retryInFlight: boolean;
  estimatedProgressMs: number;
  polledProgressMs: number;
  driftDeltaMs: number;
  correctionState: DiagnosticsCorrectionState;
};

const initialState: LiveSyncUiState = {
  playbackState: "idle",
  activeLineIndex: null,
  nextLineIndex: null,
  confidence: "static",
  trackId: null,
  statusLine: "Play a track on Spotify to start live lyrics.",
  resolvedLyrics: [],
  lyricsSourceState: "loading",
  lyricsRenderMode: null,
  lyricsWarning: null,
  retryAvailable: false,
  retryInFlight: false,
  estimatedProgressMs: 0,
  polledProgressMs: 0,
  driftDeltaMs: 0,
  correctionState: "static",
};

export class LiveSyncStore {
  private state: LiveSyncUiState = initialState;

  selectLiveSync(): LiveSyncUiState {
    return this.state;
  }

  selectPlaybackState(): PlaybackUiState {
    return this.state.playbackState;
  }

  setPlaybackState(playbackState: PlaybackUiState): LiveSyncUiState {
    this.state = { ...this.state, playbackState };
    return this.state;
  }

  setActiveLine(activeLineIndex: number | null): LiveSyncUiState {
    this.state = { ...this.state, activeLineIndex };
    return this.state;
  }

  setNextLine(nextLineIndex: number | null): LiveSyncUiState {
    this.state = { ...this.state, nextLineIndex };
    return this.state;
  }

  setConfidence(confidence: SyncConfidence | "static"): LiveSyncUiState {
    this.state = { ...this.state, confidence };
    return this.state;
  }

  setTrack(trackId: string | null): LiveSyncUiState {
    const trackChanged = this.state.trackId !== null && trackId !== null && this.state.trackId !== trackId;
    if (trackChanged) {
      this.state = {
        ...this.state,
        trackId,
        resolvedLyrics: [],
        lyricsSourceState: "loading",
        lyricsRenderMode: null,
        lyricsWarning: null,
        retryAvailable: false,
        retryInFlight: false,
        estimatedProgressMs: 0,
        polledProgressMs: 0,
        driftDeltaMs: 0,
        correctionState: "static",
      };
      return this.state;
    }

    if (trackId === null) {
      this.state = {
        ...this.state,
        trackId,
        estimatedProgressMs: 0,
        polledProgressMs: 0,
        driftDeltaMs: 0,
        correctionState: "static",
      };
      return this.state;
    }

    this.state = { ...this.state, trackId };
    return this.state;
  }

  setEstimatedProgressMs(progressMs: number): LiveSyncUiState {
    this.state = { ...this.state, estimatedProgressMs: progressMs };
    return this.state;
  }

  setPolledProgressMs(progressMs: number): LiveSyncUiState {
    this.state = { ...this.state, polledProgressMs: progressMs };
    return this.state;
  }

  setDriftDeltaMs(driftDeltaMs: number): LiveSyncUiState {
    this.state = { ...this.state, driftDeltaMs };
    return this.state;
  }

  setCorrectionState(correctionState: DiagnosticsCorrectionState): LiveSyncUiState {
    this.state = { ...this.state, correctionState };
    return this.state;
  }

  setResolvedLyrics(resolved: ResolvedLyrics): LiveSyncUiState {
    this.state = {
      ...this.state,
      resolvedLyrics: resolved.lines,
      lyricsSourceState: resolved.sourceState,
      lyricsRenderMode: resolved.renderMode,
      lyricsWarning: resolved.warning ?? null,
    };
    return this.state;
  }

  setLyricsSourceState(lyricsSourceState: LyricsSourceState): LiveSyncUiState {
    this.state = { ...this.state, lyricsSourceState };
    return this.state;
  }

  setLyricsRetryState(input: { retryAvailable: boolean; retryInFlight: boolean }): LiveSyncUiState {
    this.state = {
      ...this.state,
      retryAvailable: input.retryAvailable,
      retryInFlight: input.retryInFlight,
    };
    return this.state;
  }

  setLyricsWarning(lyricsWarning: string | null): LiveSyncUiState {
    this.state = { ...this.state, lyricsWarning };
    return this.state;
  }

  clearResolvedLyrics(): LiveSyncUiState {
    this.state = {
      ...this.state,
      resolvedLyrics: [],
      lyricsSourceState: "loading",
      lyricsRenderMode: null,
      lyricsWarning: null,
      retryAvailable: false,
      retryInFlight: false,
    };
    return this.state;
  }

  setStatusLine(statusLine: string): LiveSyncUiState {
    this.state = { ...this.state, statusLine };
    return this.state;
  }
}
