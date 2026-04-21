import { normalizeChineseForDisplay } from "@/core/lyrics/unicode-normalization";

import type { WebNowPlaying } from "../auth/now-playing";
import { cacheSearchResults, loadCachedSearchResults, type KaraokeSearchCandidate } from "./mapping-store";
import type { KaraokeMapping } from "./types";

const SEARCH_API_URL = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_API_URL = "https://www.googleapis.com/youtube/v3/videos";

type YouTubeSearchItem = {
  id?: {
    videoId?: string;
  };
  snippet?: {
    title?: string;
    channelTitle?: string;
  };
};

type YouTubeSearchResponse = {
  items?: YouTubeSearchItem[];
};

type YouTubeVideoDetailsItem = {
  id?: string;
  contentDetails?: {
    duration?: string;
  };
};

type YouTubeVideoDetailsResponse = {
  items?: YouTubeVideoDetailsItem[];
};

function getYouTubeApiKey(): string {
  const key = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_YOUTUBE_DATA_API_KEY;
  return key?.trim() ?? "";
}

function normalizeForMatch(value: string): string {
  return normalizeChineseForDisplay(value)
    .toLowerCase()
    .replace(/[\[\](){}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeForMatch(value)
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function parseIsoDurationToSeconds(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined;
  }

  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(raw.trim());
  if (!match) {
    return undefined;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return undefined;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

function buildQueries(track: WebNowPlaying): string[] {
  const title = normalizeChineseForDisplay(track.title).trim();
  const artist = normalizeChineseForDisplay(track.artist).trim();
  const hasChinese = /[\u4e00-\u9fff]/.test(`${title}${artist}`);

  if (hasChinese) {
    return [
      `${title} ${artist} 伴奏`,
      `${title} ${artist} 卡拉OK`,
      `${title} ${artist} KTV`,
      `${title} ${artist} 无主唱`,
      `${title} ${artist} 纯伴奏`,
      `${title} ${artist} 原版伴奏`,
    ];
  }

  return [
    `${title} ${artist} karaoke instrumental`,
    `${title} ${artist} karaoke`,
    `${title} ${artist} backing track`,
    `${title} ${artist} karaoke version`,
  ];
}

async function searchYouTubeByQuery(query: string, apiKey: string, fetchImpl: typeof fetch): Promise<KaraokeSearchCandidate[]> {
  const cached = loadCachedSearchResults(query);
  if (cached) {
    return cached;
  }

  const url = new URL(SEARCH_API_URL);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("q", query);
  url.searchParams.set("key", apiKey);

  const response = await fetchImpl.call(globalThis, url.toString(), { method: "GET" });
  if (!response.ok) {
    throw new Error(`YouTube search failed (${response.status})`);
  }

  const payload = (await response.json().catch(() => ({}))) as YouTubeSearchResponse;
  const results = (payload.items ?? [])
    .map((item) => ({
      videoId: item.id?.videoId?.trim() ?? "",
      title: item.snippet?.title?.trim() ?? "",
      channelTitle: item.snippet?.channelTitle?.trim() || undefined,
    }))
    .filter((item) => item.videoId && item.title);

  cacheSearchResults(query, results);
  return results;
}

async function fetchYouTubeDurationsSec(input: {
  videoIds: string[];
  apiKey: string;
  fetchImpl: typeof fetch;
}): Promise<Record<string, number>> {
  if (input.videoIds.length === 0) {
    return {};
  }

  const url = new URL(VIDEOS_API_URL);
  url.searchParams.set("part", "contentDetails");
  url.searchParams.set("id", input.videoIds.join(","));
  url.searchParams.set("key", input.apiKey);

  const response = await input.fetchImpl.call(globalThis, url.toString(), { method: "GET" });
  if (!response.ok) {
    return {};
  }

  const payload = (await response.json().catch(() => ({}))) as YouTubeVideoDetailsResponse;
  const durations: Record<string, number> = {};

  for (const item of payload.items ?? []) {
    const id = item.id?.trim() ?? "";
    const durationSec = parseIsoDurationToSeconds(item.contentDetails?.duration);
    if (id && typeof durationSec === "number" && durationSec > 0) {
      durations[id] = durationSec;
    }
  }

  return durations;
}

function computeMatchConfidence(track: WebNowPlaying, candidate: KaraokeSearchCandidate): number {
  const queryTokens = [...tokenize(track.title), ...tokenize(track.artist)];
  const candidateTokens = new Set(tokenize(`${candidate.title} ${candidate.channelTitle ?? ""}`));

  const overlap = queryTokens.filter((token) => candidateTokens.has(token));
  const overlapScore = queryTokens.length === 0 ? 0 : overlap.length / queryTokens.length;

  const titleNormalized = normalizeForMatch(candidate.title);
  const channelNormalized = normalizeForMatch(candidate.channelTitle ?? "");

  const strongKaraokeHint = /(原版伴奏|纯伴奏|官方伴奏|伴奏版|karaoke version|backing track)/i.test(titleNormalized)
    ? 0.35
    : 0;
  const karaokeHint = /(karaoke|instrumental|伴奏|卡拉ok|ktv|无主唱|纯音乐)/i.test(titleNormalized) ? 0.2 : 0;
  const trustedChannelHint = /(karaoke|instrumental|伴奏|music factory|musisians? planet|k tv|ktv)/i.test(
    `${titleNormalized} ${channelNormalized}`,
  )
    ? 0.12
    : 0;

  const noisyPenalty =
    /(cover|live|mv|舞蹈|reaction|翻唱|弹唱|吉他|钢琴|手机录|现场|清唱|教学|drum|violin|piano|guitar)/i.test(
      titleNormalized,
    )
      ? 0.55
      : 0;

  return Math.max(
    0,
    Math.min(1, overlapScore * 0.75 + strongKaraokeHint + karaokeHint + trustedChannelHint - noisyPenalty),
  );
}

function toMapping(input: {
  track: WebNowPlaying;
  candidate: KaraokeSearchCandidate;
  confidence: number;
  youtubeDurationSec?: number;
  searchQueriesTried: string[];
}): KaraokeMapping {
  const now = Date.now();
  return {
    spotifyTrackId: input.track.trackId,
    spotifyTitle: input.track.title,
    spotifyArtist: input.track.artist,
    spotifyDurationMs: input.track.durationMs,
    youtubeVideoId: input.candidate.videoId,
    youtubeTitle: input.candidate.title,
    youtubeChannelTitle: input.candidate.channelTitle,
    ...(typeof input.youtubeDurationSec === "number" ? { youtubeDurationSec: input.youtubeDurationSec } : {}),
    confirmedByUser: false,
    matchConfidence: input.confidence,
    searchQueriesTried: input.searchQueriesTried,
    createdAt: now,
    updatedAt: now,
  };
}

export async function findKaraokeMappingCandidates(input: {
  track: WebNowPlaying;
  fetchImpl?: typeof fetch;
}): Promise<KaraokeMapping[]> {
  const apiKey = getYouTubeApiKey();
  if (!apiKey) {
    throw new Error("Missing VITE_YOUTUBE_DATA_API_KEY for Karaoke Mode.");
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const queries = buildQueries(input.track);
  const candidates: Array<{ candidate: KaraokeSearchCandidate; confidence: number }> = [];

  for (const query of queries) {
    const results = await searchYouTubeByQuery(query, apiKey, fetchImpl);
    for (const result of results) {
      candidates.push({
        candidate: result,
        confidence: computeMatchConfidence(input.track, result),
      });
    }
  }

  const seen = new Set<string>();
  const dedupedRanked = candidates
    .sort((a, b) => b.confidence - a.confidence)
    .filter((entry) => {
      if (entry.confidence < 0.25) {
        return false;
      }

      if (seen.has(entry.candidate.videoId)) {
        return false;
      }

      seen.add(entry.candidate.videoId);
      return true;
    });

  const topCandidateIds = dedupedRanked
    .slice(0, 20)
    .map((entry) => entry.candidate.videoId)
    .filter(Boolean);
  const durationsById = await fetchYouTubeDurationsSec({
    videoIds: topCandidateIds,
    apiKey,
    fetchImpl,
  });

  const trackDurationSec =
    typeof input.track.durationMs === "number" && input.track.durationMs > 0
      ? Math.floor(input.track.durationMs / 1000)
      : undefined;

  const ranked = dedupedRanked
    .map((entry) => {
      const durationSec = durationsById[entry.candidate.videoId];
      const durationBonus =
        typeof durationSec === "number" && typeof trackDurationSec === "number"
          ? Math.max(0, 0.25 - Math.abs(durationSec - trackDurationSec) / Math.max(trackDurationSec, 1))
          : 0;

      return {
        ...entry,
        youtubeDurationSec: durationSec,
        finalConfidence: Math.max(0, Math.min(1, entry.confidence + durationBonus)),
      };
    })
    .sort((a, b) => b.finalConfidence - a.finalConfidence)
    .slice(0, 12)
    .map((entry) =>
      toMapping({
        track: input.track,
        candidate: entry.candidate,
        confidence: entry.finalConfidence,
        youtubeDurationSec: entry.youtubeDurationSec,
        searchQueriesTried: queries,
      }),
    );

  return ranked;
}

export async function findBestKaraokeMapping(input: {
  track: WebNowPlaying;
  fetchImpl?: typeof fetch;
}): Promise<KaraokeMapping | null> {
  const ranked = await findKaraokeMappingCandidates(input);
  const best = ranked[0];
  if (!best || best.matchConfidence < 0.35) {
    return null;
  }

  return best;
}
