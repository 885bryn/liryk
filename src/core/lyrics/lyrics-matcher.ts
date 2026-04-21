import type { LyricTrackMetadata, ProviderLyricCandidate } from "./types";
import { normalizeForMatch } from "./unicode-normalization";

export type CandidateScore = {
  candidate: ProviderLyricCandidate;
  score: number;
  accepted: boolean;
  lowConfidence: boolean;
  durationDeltaMs: number;
};

function normalizedEqual(left: string, right: string): boolean {
  return normalizeForMatch(left) === normalizeForMatch(right);
}

export function scoreCandidate(
  metadata: LyricTrackMetadata,
  candidate: ProviderLyricCandidate,
): CandidateScore {
  if (!normalizedEqual(metadata.title, candidate.title) || !normalizedEqual(metadata.artist, candidate.artist)) {
    return {
      candidate,
      score: 0,
      accepted: false,
      lowConfidence: false,
      durationDeltaMs: Number.POSITIVE_INFINITY,
    };
  }

  const metadataDuration = metadata.durationMs ?? 0;
  const candidateDuration = candidate.durationMs ?? metadataDuration;
  const durationDeltaMs = Math.abs(candidateDuration - metadataDuration);
  if (metadata.durationMs && durationDeltaMs > 15_000) {
    return {
      candidate,
      score: 0,
      accepted: false,
      lowConfidence: false,
      durationDeltaMs,
    };
  }

  let score = 100;
  if (metadata.durationMs) {
    score -= Math.min(35, Math.floor(durationDeltaMs / 1_000));
  }

  if (metadata.album && candidate.album && !normalizedEqual(metadata.album, candidate.album)) {
    score -= 6;
  }

  if (candidate.syncedLyrics) {
    score += 4;
  }

  const accepted = score >= 65;
  const lowConfidence = accepted && score < 88;

  return {
    candidate,
    score,
    accepted,
    lowConfidence,
    durationDeltaMs,
  };
}

export function selectBestCandidate(
  metadata: LyricTrackMetadata,
  candidates: ProviderLyricCandidate[],
): CandidateScore | null {
  const scored = candidates.map((candidate) => scoreCandidate(metadata, candidate)).filter((entry) => entry.accepted);
  if (scored.length === 0) {
    return null;
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    const aSynced = Boolean(a.candidate.syncedLyrics);
    const bSynced = Boolean(b.candidate.syncedLyrics);
    if (aSynced !== bSynced) {
      return aSynced ? -1 : 1;
    }

    return a.durationDeltaMs - b.durationDeltaMs;
  });

  return scored[0] ?? null;
}
