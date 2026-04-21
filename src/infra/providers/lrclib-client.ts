import type { LyricTrackMetadata, ProviderLyricCandidate } from "../../core/lyrics/types";
import { isUnusableLyricText } from "../../core/lyrics/unicode-normalization";

const DEFAULT_BASE_URL = "https://lrclib.net";

type CreateLrclibClientInput = {
  fetchFn: typeof fetch;
  baseUrl?: string;
};

type LrclibPayload = Record<string, unknown>;

function asRecord(value: unknown): LrclibPayload {
  return typeof value === "object" && value !== null ? (value as LrclibPayload) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizePayload(payload: LrclibPayload): ProviderLyricCandidate {
  const plainLyrics = asString(payload.plainLyrics || payload.plain_lyrics);
  const syncedLyrics = asString(payload.syncedLyrics || payload.synced_lyrics) || undefined;
  const plainUnusable = isUnusableLyricText(plainLyrics);
  const syncedUnusable = syncedLyrics ? isUnusableLyricText(syncedLyrics) : true;
  const durationSeconds = asNumber(payload.duration);

  return {
    provider: "lrclib",
    providerLyricId: String(payload.id ?? ""),
    title: asString(payload.trackName || payload.track_name || payload.name),
    artist: asString(payload.artistName || payload.artist_name),
    album: asString(payload.albumName || payload.album_name) || undefined,
    durationMs: typeof durationSeconds === "number" ? Math.round(durationSeconds) * 1_000 : undefined,
    plainLyrics,
    syncedLyrics,
    isUsable: !plainUnusable || !syncedUnusable,
  };
}

function buildQuery(metadata: LyricTrackMetadata): URLSearchParams {
  const query = new URLSearchParams();
  query.set("track_name", metadata.title);
  query.set("artist_name", metadata.artist);
  if (metadata.album) {
    query.set("album_name", metadata.album);
  }
  if (typeof metadata.durationMs === "number" && Number.isFinite(metadata.durationMs)) {
    query.set("duration", String(Math.round(metadata.durationMs / 1_000)));
  }
  return query;
}

async function getJson(fetchFn: typeof fetch, url: string): Promise<unknown> {
  const response = await fetchFn(url, { method: "GET" });
  if (!response.ok) {
    return null;
  }
  return response.json().catch(() => null);
}

export function createLrclibClient(input: CreateLrclibClientInput) {
  const baseUrl = (input.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");

  async function searchByMetadata(metadata: LyricTrackMetadata): Promise<ProviderLyricCandidate[]> {
    const query = buildQuery(metadata);
    const payload = await getJson(input.fetchFn, `${baseUrl}/api/search?${query.toString()}`);
    if (!Array.isArray(payload)) {
      return [];
    }

    return payload
      .map((entry) => normalizePayload(asRecord(entry)))
      .filter((candidate) => candidate.isUsable);
  }

  async function getByMetadata(metadata: LyricTrackMetadata): Promise<ProviderLyricCandidate[]> {
    const query = buildQuery(metadata);
    const [payload, searchCandidates] = await Promise.all([
      getJson(input.fetchFn, `${baseUrl}/api/get?${query.toString()}`),
      searchByMetadata(metadata),
    ]);
    const getCandidate = payload ? normalizePayload(asRecord(payload)) : null;

    const seen = new Set<string>();
    const merged: ProviderLyricCandidate[] = [];
    for (const candidate of [getCandidate, ...searchCandidates]) {
      if (!candidate || !candidate.isUsable) {
        continue;
      }
      const key = candidate.providerLyricId || `${candidate.title}|${candidate.artist}|${candidate.durationMs}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(candidate);
      }
    }
    return merged;
  }

  return {
    getByMetadata,
    searchByMetadata,
  };
}
