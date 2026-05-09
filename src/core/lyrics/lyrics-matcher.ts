import type { LyricTrackMetadata, ProviderLyricCandidate } from "./types";
import { parseLrc } from "./lrc-parser";
import { normalizeForMatch } from "./unicode-normalization";

export type CandidateScore = {
  candidate: ProviderLyricCandidate;
  score: number;
  accepted: boolean;
  lowConfidence: boolean;
  durationDeltaMs: number;
  riskPenalty: number;
  riskFlags: string[];
  syncedTimestampCount?: number;
  syncedCoverageRatio?: number;
};

const TRAILING_VARIANT_BLOCK =
  /\s*(?:[-–]\s*|\()\s*(live|remix|mix|acoustic|instrumental|karaoke|clean|explicit|(?:sped|speed)\s*up|slowed(?:\s*down)?|(?:\d{2,4}\s*)?remaster(?:ed)?(?:\s*\d{2,4})?)[^)\]]*\)?\s*$/i;
const HARD_VARIANT_MARKERS = [
  { pattern: /\bremix\b/i, penalty: 10, flag: "variant-remix" },
  { pattern: /\bmix\b/i, penalty: 8, flag: "variant-mix" },
  { pattern: /\bacoustic\b/i, penalty: 8, flag: "variant-acoustic" },
  { pattern: /\binstrumental\b/i, penalty: 12, flag: "variant-instrumental" },
  { pattern: /\bkaraoke\b/i, penalty: 14, flag: "variant-karaoke" },
  { pattern: /\blive\b/i, penalty: 4, flag: "variant-live" },
  { pattern: /\b(?:sped|speed)\s*up\b/i, penalty: 12, flag: "variant-sped-up" },
  { pattern: /\bslowed(?:\s*down)?\b/i, penalty: 12, flag: "variant-slowed" },
];
const SOFT_VARIANT_MARKERS = [
  { pattern: /\bremaster(?:ed)?\b/i, penalty: 2, flag: "variant-remaster" },
  { pattern: /\bclean\b/i, penalty: 1, flag: "variant-clean" },
  { pattern: /\bexplicit\b/i, penalty: 1, flag: "variant-explicit" },
];
const SHORT_TRACK_MS = 60_000;
const MEDIUM_TRACK_MS = 90_000;

function normalizedEqual(left: string, right: string): boolean {
  return normalizeForMatch(left) === normalizeForMatch(right);
}

function normalizeLooseTitle(input: string): string {
  let value = input.normalize("NFC");
  let next = value.replace(TRAILING_VARIANT_BLOCK, "").trim();
  while (next !== value) {
    value = next;
    next = value.replace(TRAILING_VARIANT_BLOCK, "").trim();
  }

  return normalizeForMatch(value);
}

function normalizedTitleCompatible(left: string, right: string): boolean {
  return normalizedEqual(left, right) || normalizeLooseTitle(left) === normalizeLooseTitle(right);
}

function collectVariantPenalty(
  metadataTitle: string,
  candidateTitle: string,
): Pick<CandidateScore, "riskPenalty" | "riskFlags"> {
  const metadataValue = metadataTitle.normalize("NFC");
  const candidateValue = candidateTitle.normalize("NFC");
  let riskPenalty = 0;
  const riskFlags: string[] = [];

  for (const entry of HARD_VARIANT_MARKERS) {
    const metadataHasMarker = entry.pattern.test(metadataValue);
    const candidateHasMarker = entry.pattern.test(candidateValue);

    if (candidateHasMarker && !metadataHasMarker) {
      riskPenalty += entry.penalty;
      riskFlags.push(entry.flag);
    }

    if (metadataHasMarker && !candidateHasMarker) {
      riskPenalty += entry.penalty + 2;
      riskFlags.push(`${entry.flag}-missing`);
    }
  }

  for (const entry of SOFT_VARIANT_MARKERS) {
    const metadataHasMarker = entry.pattern.test(metadataValue);
    const candidateHasMarker = entry.pattern.test(candidateValue);

    if (candidateHasMarker && !metadataHasMarker) {
      riskPenalty += entry.penalty;
      riskFlags.push(entry.flag);
    }

    if (metadataHasMarker && !candidateHasMarker) {
      riskPenalty += entry.penalty;
      riskFlags.push(`${entry.flag}-missing`);
    }
  }

  return { riskPenalty, riskFlags };
}

function averageGapMs(startTimes: number[]): number | null {
  if (startTimes.length < 2) {
    return null;
  }

  const gaps = startTimes.slice(1).map((startMs, index) => startMs - startTimes[index]!).filter((gap) => gap > 0);
  if (gaps.length === 0) {
    return null;
  }

  return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
}

function collectSyncedRisk(
  metadataDurationMs: number | undefined,
  syncedLyrics: string | undefined,
): Pick<CandidateScore, "riskPenalty" | "riskFlags" | "syncedTimestampCount" | "syncedCoverageRatio"> {
  if (!syncedLyrics) {
    return {
      riskPenalty: 0,
      riskFlags: [],
    };
  }

  const parsed = parseLrc(syncedLyrics).filter((line) => line.startMs !== null);
  const syncedTimestampCount = parsed.length;
  const riskFlags: string[] = [];
  let riskPenalty = 0;
  let syncedCoverageRatio: number | undefined;

  const minimumTimestampCount = metadataDurationMs && metadataDurationMs <= SHORT_TRACK_MS ? 2 : metadataDurationMs && metadataDurationMs <= MEDIUM_TRACK_MS ? 3 : 4;
  if (syncedTimestampCount < minimumTimestampCount) {
    riskPenalty += 8;
    riskFlags.push("synced-too-few-lines");
  }

  if (metadataDurationMs && syncedTimestampCount > 0) {
    const firstStartMs = parsed[0]?.startMs ?? 0;
    const lastStartMs = parsed[syncedTimestampCount - 1]?.startMs ?? firstStartMs;
    const startTimes = parsed.map((line) => line.startMs ?? 0);
    const averageGap = averageGapMs(startTimes);
    const fallbackTailMs = metadataDurationMs <= SHORT_TRACK_MS ? 10_000 : 15_000;
    const estimatedTailMs = averageGap ?? Math.min(fallbackTailMs, Math.max(5_000, metadataDurationMs * 0.25));
    const rawEstimatedEndMs = lastStartMs + estimatedTailMs;
    const clampedEstimatedEndMs = Math.min(metadataDurationMs, rawEstimatedEndMs);
    const coverageMs = Math.max(0, clampedEstimatedEndMs - firstStartMs);
    syncedCoverageRatio = coverageMs / metadataDurationMs;
    const rawExtentRatio = Math.max(0, rawEstimatedEndMs - firstStartMs) / metadataDurationMs;

    const shortSpanFloor = metadataDurationMs <= SHORT_TRACK_MS ? 0.35 : metadataDurationMs <= MEDIUM_TRACK_MS ? 0.25 : 0.2;
    const longSpanCeiling = metadataDurationMs <= SHORT_TRACK_MS ? 1.05 : 1.15;

    if (syncedCoverageRatio < shortSpanFloor) {
      riskPenalty += 16;
      riskFlags.push("synced-short-span");
    } else if (rawExtentRatio > longSpanCeiling) {
      riskPenalty += 12;
      riskFlags.push("synced-long-span");
    }
  }

  return {
    riskPenalty,
    riskFlags,
    syncedTimestampCount,
    syncedCoverageRatio,
  };
}

export function scoreCandidate(
  metadata: LyricTrackMetadata,
  candidate: ProviderLyricCandidate,
): CandidateScore {
  if (!normalizedTitleCompatible(metadata.title, candidate.title) || !normalizedEqual(metadata.artist, candidate.artist)) {
    return {
      candidate,
      score: 0,
      accepted: false,
      lowConfidence: false,
      durationDeltaMs: Number.POSITIVE_INFINITY,
      riskPenalty: 0,
      riskFlags: [],
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
      riskPenalty: 0,
      riskFlags: [],
    };
  }

  let score = 100;
  if (metadata.durationMs) {
    score -= Math.min(35, Math.floor(durationDeltaMs / 1_000));
  }

  if (metadata.album && candidate.album && !normalizedEqual(metadata.album, candidate.album)) {
    score -= 6;
  }

  const variantRisk = collectVariantPenalty(metadata.title, candidate.title);
  const syncedRisk = collectSyncedRisk(metadata.durationMs, candidate.syncedLyrics);
  const riskPenalty = variantRisk.riskPenalty + syncedRisk.riskPenalty;
  const riskFlags = [...variantRisk.riskFlags, ...syncedRisk.riskFlags];

  score -= riskPenalty;

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
    riskPenalty,
    riskFlags,
    syncedTimestampCount: syncedRisk.syncedTimestampCount,
    syncedCoverageRatio: syncedRisk.syncedCoverageRatio,
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

    if (a.riskPenalty !== b.riskPenalty) {
      return a.riskPenalty - b.riskPenalty;
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
