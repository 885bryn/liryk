import { parseLrc } from "./lrc-parser";
import { selectBestCandidate } from "./lyrics-matcher";
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

export async function resolveLyricsForTrack(
  metadata: LyricTrackMetadata,
  client: LyricsProviderClient,
): Promise<ResolvedLyrics> {
  const initial = await client.getByMetadata(metadata);
  const candidates = initial.length > 0 ? initial : await client.searchByMetadata(metadata);
  const usableCandidates = candidates.filter((candidate) => candidate.isUsable);

  const best = selectBestCandidate(metadata, usableCandidates);
  if (!best) {
    return notFound();
  }

  const parsedSynced = best.candidate.syncedLyrics ? parseLrc(best.candidate.syncedLyrics) : [];
  if (parsedSynced.length > 0) {
    return {
      sourceState: best.lowConfidence ? "low-confidence" : "synced",
      renderMode: "synced",
      lines: parsedSynced,
      provider: best.candidate.provider,
      confidenceScore: best.score,
      candidateId: best.candidate.providerLyricId,
    };
  }

  const plainLines = buildPlainLyricsLines({ plainLyrics: best.candidate.plainLyrics });
  if (plainLines.length > 0) {
    return {
      sourceState: best.lowConfidence ? "low-confidence" : "plain",
      renderMode: "plain-static",
      lines: plainLines,
      provider: best.candidate.provider,
      confidenceScore: best.score,
      candidateId: best.candidate.providerLyricId,
    };
  }

  return notFound();
}
