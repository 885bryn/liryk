import type { ResolvedLyrics } from "./types";

export const LYRICS_CACHE_SCHEMA_VERSION = 1;

export type LyricsCacheState = "fresh" | "stale" | "expired" | "invalid";

type CacheTtlPolicy = {
  staleAfterMs: number;
  expiresAfterMs: number;
};

const POSITIVE_TTL: CacheTtlPolicy = {
  staleAfterMs: 15 * 60 * 1000,
  expiresAfterMs: 24 * 60 * 60 * 1000,
};

const NOT_FOUND_TTL: CacheTtlPolicy = {
  staleAfterMs: 60 * 1000,
  expiresAfterMs: 10 * 60 * 1000,
};

export type LyricsCacheEntry = {
  trackId: string;
  schemaVersion: number;
  resolvedLyrics: ResolvedLyrics;
  fetchedAtMs: number;
  staleAtMs: number;
  expiresAtMs: number;
};

export function createLyricsCacheEntry(input: {
  trackId: string;
  resolvedLyrics: ResolvedLyrics;
  fetchedAtMs?: number;
}): LyricsCacheEntry {
  const fetchedAtMs = input.fetchedAtMs ?? Date.now();
  const ttl = ttlForSourceState(input.resolvedLyrics.sourceState);

  return {
    trackId: input.trackId,
    schemaVersion: LYRICS_CACHE_SCHEMA_VERSION,
    resolvedLyrics: input.resolvedLyrics,
    fetchedAtMs,
    staleAtMs: fetchedAtMs + ttl.staleAfterMs,
    expiresAtMs: fetchedAtMs + ttl.expiresAfterMs,
  };
}

function ttlForSourceState(sourceState: ResolvedLyrics["sourceState"]): CacheTtlPolicy {
  if (sourceState === "not-found") {
    return NOT_FOUND_TTL;
  }

  return POSITIVE_TTL;
}

function isResolvedLyrics(value: unknown): value is ResolvedLyrics {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ResolvedLyrics>;
  return typeof candidate.sourceState === "string" && typeof candidate.renderMode === "string" && Array.isArray(candidate.lines);
}

export function isLyricsCacheEntry(value: unknown): value is LyricsCacheEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<LyricsCacheEntry>;
  if (entry.schemaVersion !== LYRICS_CACHE_SCHEMA_VERSION) {
    return false;
  }

  if (typeof entry.trackId !== "string" || entry.trackId.trim().length === 0) {
    return false;
  }

  if (!isResolvedLyrics(entry.resolvedLyrics)) {
    return false;
  }

  if (typeof entry.fetchedAtMs !== "number" || !Number.isFinite(entry.fetchedAtMs)) {
    return false;
  }

  if (typeof entry.staleAtMs !== "number" || !Number.isFinite(entry.staleAtMs)) {
    return false;
  }

  if (typeof entry.expiresAtMs !== "number" || !Number.isFinite(entry.expiresAtMs)) {
    return false;
  }

  return entry.fetchedAtMs <= entry.staleAtMs && entry.staleAtMs <= entry.expiresAtMs;
}

export function evaluateLyricsCacheEntry(entry: LyricsCacheEntry, nowMs: number): LyricsCacheState {
  if (!isLyricsCacheEntry(entry) || !Number.isFinite(nowMs)) {
    return "invalid";
  }

  if (nowMs >= entry.expiresAtMs) {
    return "expired";
  }

  if (nowMs >= entry.staleAtMs) {
    return "stale";
  }

  return "fresh";
}
