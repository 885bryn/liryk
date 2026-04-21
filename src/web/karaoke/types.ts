import type { WebNowPlaying } from "../auth/now-playing";

export type KaraokeModeState =
  | "original"
  | "switching_to_karaoke"
  | "karaoke"
  | "switching_to_original"
  | "error";

export type KaraokeMapping = {
  spotifyTrackId: string;
  spotifyTitle: string;
  spotifyArtist: string;
  spotifyDurationMs?: number;
  youtubeVideoId: string;
  youtubeTitle: string;
  youtubeChannelTitle?: string;
  youtubeDurationSec?: number;
  confirmedByUser: boolean;
  matchConfidence: number;
  searchQueriesTried: string[];
  createdAt: number;
  updatedAt: number;
};

export type KaraokeRuntimeModel = {
  mode: KaraokeModeState;
  message: string;
  currentMapping: KaraokeMapping | null;
  candidateMappings: KaraokeMapping[];
  referenceTrack: WebNowPlaying | null;
  localPlaybackMs: number | null;
  canResumeAutoplay: boolean;
  primePlaybackGesture(): void;
  setPreferredCandidate(youtubeVideoId: string): void;
  switchToCandidate(youtubeVideoId: string): Promise<void>;
  banCurrentCandidate(): Promise<void>;
  enterKaraokeMode(): Promise<void>;
  exitKaraokeMode(): Promise<void>;
  resumeAutoplay(): Promise<void>;
  clearError(): void;
  confirmCurrentMapping(): void;
};
