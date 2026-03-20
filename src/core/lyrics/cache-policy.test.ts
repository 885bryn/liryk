import { describe, expect, it } from "vitest";

import {
  LYRICS_CACHE_SCHEMA_VERSION,
  createLyricsCacheEntry,
  evaluateLyricsCacheEntry,
  type LyricsCacheEntry,
} from "./cache-policy";
import type { ResolvedLyrics } from "./types";

function syncedLyrics(): ResolvedLyrics {
  return {
    sourceState: "synced",
    renderMode: "synced",
    lines: [{ startMs: 1_000, text: "line", renderMode: "synced", isTimestamped: true }],
  };
}

function notFoundLyrics(): ResolvedLyrics {
  return {
    sourceState: "not-found",
    renderMode: "plain-static",
    lines: [],
  };
}

describe("evaluateLyricsCacheEntry", () => {
  it("classifies an entry as fresh before staleAtMs", () => {
    const entry = createLyricsCacheEntry({
      trackId: "track-1",
      resolvedLyrics: syncedLyrics(),
      fetchedAtMs: 1_000,
    });

    expect(evaluateLyricsCacheEntry(entry, entry.staleAtMs - 1)).toBe("fresh");
  });

  it("classifies an entry as stale after staleAtMs and before expiresAtMs", () => {
    const entry = createLyricsCacheEntry({
      trackId: "track-1",
      resolvedLyrics: syncedLyrics(),
      fetchedAtMs: 1_000,
    });

    expect(evaluateLyricsCacheEntry(entry, entry.staleAtMs)).toBe("stale");
    expect(evaluateLyricsCacheEntry(entry, entry.expiresAtMs - 1)).toBe("stale");
  });

  it("classifies an entry as expired after expiresAtMs", () => {
    const entry = createLyricsCacheEntry({
      trackId: "track-1",
      resolvedLyrics: syncedLyrics(),
      fetchedAtMs: 1_000,
    });

    expect(evaluateLyricsCacheEntry(entry, entry.expiresAtMs)).toBe("expired");
  });

  it("classifies malformed entries as invalid", () => {
    const valid = createLyricsCacheEntry({
      trackId: "track-1",
      resolvedLyrics: syncedLyrics(),
      fetchedAtMs: 1_000,
    });

    const wrongSchema: LyricsCacheEntry = {
      ...valid,
      schemaVersion: LYRICS_CACHE_SCHEMA_VERSION + 1,
    };
    const wrongTrackId = {
      ...valid,
      trackId: "",
    } as LyricsCacheEntry;
    const badPayload = {
      ...valid,
      resolvedLyrics: { sourceState: "synced", renderMode: "synced" } as unknown as ResolvedLyrics,
    };

    expect(evaluateLyricsCacheEntry(wrongSchema, valid.fetchedAtMs + 1)).toBe("invalid");
    expect(evaluateLyricsCacheEntry(wrongTrackId, valid.fetchedAtMs + 1)).toBe("invalid");
    expect(evaluateLyricsCacheEntry(badPayload as LyricsCacheEntry, valid.fetchedAtMs + 1)).toBe("invalid");
  });

  it("uses shorter freshness windows for not-found entries", () => {
    const positive = createLyricsCacheEntry({
      trackId: "track-1",
      resolvedLyrics: syncedLyrics(),
      fetchedAtMs: 10_000,
    });
    const negative = createLyricsCacheEntry({
      trackId: "track-1",
      resolvedLyrics: notFoundLyrics(),
      fetchedAtMs: 10_000,
    });

    expect(negative.staleAtMs - negative.fetchedAtMs).toBeLessThan(positive.staleAtMs - positive.fetchedAtMs);
    expect(negative.expiresAtMs - negative.fetchedAtMs).toBeLessThan(positive.expiresAtMs - positive.fetchedAtMs);
  });
});
