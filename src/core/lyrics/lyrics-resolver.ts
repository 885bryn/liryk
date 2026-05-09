import { parseLrc } from "./lrc-parser";
import { scoreCandidate, type CandidateScore } from "./lyrics-matcher";
import { buildPlainLyricsLines } from "./plain-lyrics-timing";
import type { LyricTrackMetadata, ProviderLyricCandidate, ResolvedLyrics } from "./types";

type LyricsProviderClient = {
  getByMetadata(metadata: LyricTrackMetadata): Promise<ProviderLyricCandidate[]>;
  searchByMetadata(metadata: LyricTrackMetadata): Promise<ProviderLyricCandidate[]>;
};

function notFound(): ResolvedLyrics {
  return {
    sourceState: "not-found",
    renderMode: "plain-static",
    lines: [],
  };
}

const BENIGN_SYNCED_RISK_TOLERANCE = 2;
const LOW_CONFIDENCE_WARNING = "Low confidence lyrics";

function compareCandidates(a: CandidateScore, b: CandidateScore): number {
  if (a.score !== b.score) {
    return b.score - a.score;
  }

  if (a.riskPenalty !== b.riskPenalty) {
    return a.riskPenalty - b.riskPenalty;
  }

  const aSynced = Boolean(a.candidate.syncedLyrics);
  const bSynced = Boolean(b.candidate.syncedLyrics);
  if (aSynced !== bSynced) {
    return aSynced ? -1 : 1;
  }

  return a.durationDeltaMs - b.durationDeltaMs;
}

function comparePlainFallbacks(a: CandidateScore, b: CandidateScore): number {
  if (a.lowConfidence !== b.lowConfidence) {
    return a.lowConfidence ? 1 : -1;
  }

  if (a.riskPenalty !== b.riskPenalty) {
    return a.riskPenalty - b.riskPenalty;
  }

  if (a.score !== b.score) {
    return b.score - a.score;
  }

  return a.durationDeltaMs - b.durationDeltaMs;
}

function resolveFromCandidate(
  candidateScore: CandidateScore,
  mode: "synced" | "plain-static",
  forceLowConfidence = false,
): ResolvedLyrics | null {
  if (mode === "synced") {
    const parsedSynced = candidateScore.candidate.syncedLyrics ? parseLrc(candidateScore.candidate.syncedLyrics) : [];
    if (parsedSynced.length === 0) {
      return null;
    }

    const lowConfidence = forceLowConfidence || candidateScore.lowConfidence;
    return {
      sourceState: lowConfidence ? "low-confidence" : "synced",
      renderMode: "synced",
      lines: parsedSynced,
      provider: candidateScore.candidate.provider,
      confidenceScore: candidateScore.score,
      candidateId: candidateScore.candidate.providerLyricId,
      warning: lowConfidence ? LOW_CONFIDENCE_WARNING : undefined,
    };
  }

  const plainLines = buildPlainLyricsLines({ plainLyrics: candidateScore.candidate.plainLyrics });
  if (plainLines.length === 0) {
    return null;
  }

  const lowConfidence = forceLowConfidence || candidateScore.lowConfidence;
  return {
    sourceState: lowConfidence ? "low-confidence" : "plain",
    renderMode: "plain-static",
    lines: plainLines,
    provider: candidateScore.candidate.provider,
    confidenceScore: candidateScore.score,
    candidateId: candidateScore.candidate.providerLyricId,
    warning: lowConfidence ? LOW_CONFIDENCE_WARNING : undefined,
  };
}

export async function resolveLyricsForTrack(
  metadata: LyricTrackMetadata,
  client: LyricsProviderClient,
): Promise<ResolvedLyrics> {
  const initial = await client.getByMetadata(metadata);
  const candidates = initial.length > 0 ? initial : await client.searchByMetadata(metadata);
  const usableCandidates = candidates.filter((candidate) => candidate.isUsable);
  const scoredCandidates = usableCandidates
    .map((candidate) => scoreCandidate(metadata, candidate))
    .filter((entry) => entry.accepted)
    .sort(compareCandidates);

  if (scoredCandidates.length === 0) {
    return notFound();
  }

  const syncedOptions = scoredCandidates
    .map((entry) => ({ entry, resolved: resolveFromCandidate(entry, "synced") }))
    .filter((option): option is { entry: CandidateScore; resolved: ResolvedLyrics } => option.resolved !== null);
  const plainOptions = scoredCandidates
    .map((entry) => ({ entry, resolved: resolveFromCandidate(entry, "plain-static") }))
    .filter((option): option is { entry: CandidateScore; resolved: ResolvedLyrics } => option.resolved !== null)
    .sort((a, b) => comparePlainFallbacks(a.entry, b.entry));

  const bestSynced = syncedOptions[0];
  const bestPlain = plainOptions[0];

  if (
    bestSynced &&
    !bestSynced.entry.lowConfidence &&
    (!bestPlain ||
      bestPlain.entry.lowConfidence ||
      bestSynced.entry.riskPenalty <= bestPlain.entry.riskPenalty + BENIGN_SYNCED_RISK_TOLERANCE)
  ) {
    return bestSynced.resolved;
  }

  if (bestPlain && !bestPlain.entry.lowConfidence) {
    return bestSynced ? resolveFromCandidate(bestPlain.entry, "plain-static", true) ?? bestPlain.resolved : bestPlain.resolved;
  }

  if (bestSynced && bestPlain) {
    const sameCandidate =
      bestSynced.entry.candidate.provider === bestPlain.entry.candidate.provider &&
      bestSynced.entry.candidate.providerLyricId === bestPlain.entry.candidate.providerLyricId;
    if (sameCandidate) {
      return bestSynced.resolved;
    }

    return comparePlainFallbacks(bestPlain.entry, bestSynced.entry) <= 0
      ? resolveFromCandidate(bestPlain.entry, "plain-static", true) ?? bestPlain.resolved
      : bestSynced.resolved;
  }

  if (bestPlain) {
    return resolveFromCandidate(bestPlain.entry, "plain-static", true) ?? bestPlain.resolved;
  }

  if (bestSynced) {
    return bestSynced.resolved;
  }

  return notFound();
}
