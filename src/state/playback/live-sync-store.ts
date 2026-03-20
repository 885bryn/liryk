import type { SyncConfidence } from "../../core/sync/lyric-sync-engine";

export type PlaybackUiState = "idle" | "playing" | "paused" | "unavailable";

export type LiveSyncUiState = {
  playbackState: PlaybackUiState;
  activeLineIndex: number | null;
  nextLineIndex: number | null;
  confidence: SyncConfidence | "static";
  trackId: string | null;
  statusLine: string;
};

const initialState: LiveSyncUiState = {
  playbackState: "idle",
  activeLineIndex: null,
  nextLineIndex: null,
  confidence: "static",
  trackId: null,
  statusLine: "Play a track on Spotify to start live lyrics.",
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
    this.state = { ...this.state, trackId };
    return this.state;
  }

  setStatusLine(statusLine: string): LiveSyncUiState {
    this.state = { ...this.state, statusLine };
    return this.state;
  }
}
