import type { KaraokeMapping } from "./types";

const MAPPING_STORAGE_KEY = "liryk-karaoke-mappings-v1";
const SEARCH_CACHE_STORAGE_KEY = "liryk-karaoke-search-cache-v1";
const BLOCKED_VIDEO_STORAGE_KEY = "liryk-karaoke-blocked-videos-v1";
const SEARCH_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

type KaraokeSearchCandidate = {
  videoId: string;
  title: string;
  channelTitle?: string;
};

type KaraokeSearchCacheEntry = {
  query: string;
  results: KaraokeSearchCandidate[];
  cachedAtMs: number;
};

type KaraokeSearchCacheRecord = Record<string, KaraokeSearchCacheEntry>;

type KaraokeMappingRecord = Record<string, KaraokeMapping>;
type BlockedVideoRecord = Record<string, { videoIds: string[]; updatedAtMs: number }>;

function readStorageValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore write errors in private mode or restricted environments.
  }
}

function readMappings(): KaraokeMappingRecord {
  const raw = readStorageValue(MAPPING_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as KaraokeMappingRecord;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeMappings(record: KaraokeMappingRecord): void {
  writeStorageValue(MAPPING_STORAGE_KEY, JSON.stringify(record));
}

function readSearchCache(): KaraokeSearchCacheRecord {
  const raw = readStorageValue(SEARCH_CACHE_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as KaraokeSearchCacheRecord;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeSearchCache(record: KaraokeSearchCacheRecord): void {
  writeStorageValue(SEARCH_CACHE_STORAGE_KEY, JSON.stringify(record));
}

function readBlockedVideos(): BlockedVideoRecord {
  const raw = readStorageValue(BLOCKED_VIDEO_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as BlockedVideoRecord;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeBlockedVideos(record: BlockedVideoRecord): void {
  writeStorageValue(BLOCKED_VIDEO_STORAGE_KEY, JSON.stringify(record));
}

export function loadKaraokeMapping(spotifyTrackId: string): KaraokeMapping | null {
  const all = readMappings();
  return all[spotifyTrackId] ?? null;
}

export function saveKaraokeMapping(mapping: KaraokeMapping): void {
  const all = readMappings();
  all[mapping.spotifyTrackId] = mapping;
  writeMappings(all);
}

export function confirmKaraokeMapping(spotifyTrackId: string): KaraokeMapping | null {
  const all = readMappings();
  const current = all[spotifyTrackId];
  if (!current) {
    return null;
  }

  const updated: KaraokeMapping = {
    ...current,
    confirmedByUser: true,
    updatedAt: Date.now(),
  };
  all[spotifyTrackId] = updated;
  writeMappings(all);
  return updated;
}

export function loadCachedSearchResults(query: string): KaraokeSearchCandidate[] | null {
  const all = readSearchCache();
  const entry = all[query];
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.cachedAtMs > SEARCH_CACHE_TTL_MS) {
    delete all[query];
    writeSearchCache(all);
    return null;
  }

  return entry.results;
}

export function cacheSearchResults(query: string, results: KaraokeSearchCandidate[]): void {
  const all = readSearchCache();
  all[query] = {
    query,
    results,
    cachedAtMs: Date.now(),
  };
  writeSearchCache(all);
}

export function getBlockedVideoIds(spotifyTrackId: string): Set<string> {
  const all = readBlockedVideos();
  const entry = all[spotifyTrackId];
  if (!entry) {
    return new Set<string>();
  }

  return new Set(entry.videoIds);
}

export function markVideoAsBlocked(spotifyTrackId: string, youtubeVideoId: string): void {
  const all = readBlockedVideos();
  const current = all[spotifyTrackId]?.videoIds ?? [];
  const next = new Set(current);
  next.add(youtubeVideoId);
  all[spotifyTrackId] = {
    videoIds: [...next],
    updatedAtMs: Date.now(),
  };
  writeBlockedVideos(all);
}

export type { KaraokeSearchCandidate };
