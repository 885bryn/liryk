export type LyricsSourceState = "synced" | "plain" | "low-confidence" | "not-found" | "loading";

export type LyricRenderMode = "synced" | "plain-static";

export type LyricTrackMetadata = {
  trackId: string;
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
};

export type ProviderLyricCandidate = {
  provider: "lrclib";
  providerLyricId: string;
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
  plainLyrics: string;
  syncedLyrics?: string;
  isUsable: boolean;
};

export type LyricLineDirection = "rtl" | "ltr" | "auto";

export type ResolvedLyricLine = {
  startMs: number | null;
  text: string;
  displayText?: string;
  dir?: LyricLineDirection;
  renderMode: LyricRenderMode;
  isTimestamped: boolean;
};

export type ResolvedLyrics = {
  sourceState: LyricsSourceState;
  renderMode: LyricRenderMode;
  lines: ResolvedLyricLine[];
  warning?: string;
  provider?: "lrclib";
  confidenceScore?: number;
  candidateId?: string;
};
