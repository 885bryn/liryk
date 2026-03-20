import type { PlaybackRuntimeEvent } from "./playback-runtime";
import {
  createLyricsCacheEntry,
  evaluateLyricsCacheEntry,
  type LyricsCacheEntry,
  type LyricsCacheState,
} from "../core/lyrics/cache-policy";
import type { LyricTrackMetadata, ResolvedLyrics } from "../core/lyrics/types";
import { LiveSyncStore } from "../state/playback/live-sync-store";

type LyricsCache = {
  read(trackId: string): Promise<LyricsCacheEntry | null>;
  write(entry: LyricsCacheEntry): Promise<void>;
  delete(trackId: string): Promise<void>;
};

export type LyricsResolutionRuntimeDependencies = {
  subscribePlayback: (listener: (event: PlaybackRuntimeEvent) => void) => () => void;
  resolveLyricsForTrack: (metadata: LyricTrackMetadata) => Promise<ResolvedLyrics>;
  liveSyncStore: LiveSyncStore;
  cache?: LyricsCache;
  evaluateCacheEntry?: (entry: LyricsCacheEntry, nowMs: number) => LyricsCacheState;
  mapTrackMetadata?: (event: PlaybackRuntimeEvent) => LyricTrackMetadata | null;
};

export type LyricsResolutionRuntime = {
  start(): void;
  stop(): void;
  retry(): Promise<void>;
  getResolvedLyricsForTrack(trackId: string): ResolvedLyrics | null;
};

function defaultMetadataMapper(event: PlaybackRuntimeEvent): LyricTrackMetadata | null {
  if (!event.snapshot) {
    return null;
  }

  return {
    trackId: event.snapshot.trackId,
    title: event.snapshot.trackId,
    artist: event.snapshot.trackId,
  };
}

export function createLyricsResolutionRuntime(
  dependencies: LyricsResolutionRuntimeDependencies,
): LyricsResolutionRuntime {
  const mapTrackMetadata = dependencies.mapTrackMetadata ?? defaultMetadataMapper;
  const evaluateCacheEntry = dependencies.evaluateCacheEntry ?? evaluateLyricsCacheEntry;

  let unsubscribePlayback: (() => void) | null = null;
  let currentMetadata: LyricTrackMetadata | null = null;
  let resolveSession = 0;
  const resolvedByTrack = new Map<string, ResolvedLyrics>();

  function applyResolvedLyrics(resolved: ResolvedLyrics, options: { retry: boolean }): void {
    dependencies.liveSyncStore.setResolvedLyrics(resolved);
    dependencies.liveSyncStore.setLyricsRetryState({
      retryAvailable: resolved.sourceState === "not-found",
      retryInFlight: false,
    });

    if (resolved.sourceState === "not-found") {
      dependencies.liveSyncStore.setStatusLine("Lyrics not found");
      return;
    }

    dependencies.liveSyncStore.setStatusLine(options.retry ? "Lyrics refreshed" : "Lyrics ready");
  }

  async function resolveAndProjectFresh(
    metadata: LyricTrackMetadata,
    options: { retry: boolean },
    session: number,
  ): Promise<void> {
    const resolved = await dependencies.resolveLyricsForTrack(metadata);
    if (session !== resolveSession || currentMetadata?.trackId !== metadata.trackId) {
      return;
    }

    resolvedByTrack.set(metadata.trackId, resolved);
    applyResolvedLyrics(resolved, options);

    if (!dependencies.cache) {
      return;
    }

    await dependencies.cache.write(
      createLyricsCacheEntry({
        trackId: metadata.trackId,
        resolvedLyrics: resolved,
      }),
    );
  }

  async function runResolve(metadata: LyricTrackMetadata, options: { retry: boolean }): Promise<void> {
    const session = ++resolveSession;
    dependencies.liveSyncStore.setTrack(metadata.trackId);
    dependencies.liveSyncStore.setLyricsRetryState({ retryAvailable: false, retryInFlight: options.retry });
    dependencies.liveSyncStore.setLyricsWarning(null);
    dependencies.liveSyncStore.setStatusLine(options.retry ? "Retrying lyrics lookup..." : "Resolving lyrics...");

    if (!options.retry && dependencies.cache) {
      const cached = await dependencies.cache.read(metadata.trackId);
      if (session !== resolveSession || currentMetadata?.trackId !== metadata.trackId) {
        return;
      }

      if (cached) {
        const cacheState = evaluateCacheEntry(cached, Date.now());
        if (cacheState === "fresh") {
          resolvedByTrack.set(metadata.trackId, cached.resolvedLyrics);
          applyResolvedLyrics(cached.resolvedLyrics, options);
          return;
        }

        if (cacheState === "stale") {
          resolvedByTrack.set(metadata.trackId, cached.resolvedLyrics);
          applyResolvedLyrics(cached.resolvedLyrics, options);
          dependencies.liveSyncStore.setStatusLine("Refreshing cached lyrics...");
          void resolveAndProjectFresh(metadata, { retry: false }, session);
          return;
        }

        if (cacheState === "invalid") {
          await dependencies.cache.delete(metadata.trackId);
        }
      }
    }

    dependencies.liveSyncStore.setLyricsSourceState("loading");
    await resolveAndProjectFresh(metadata, options, session);
  }

  function onPlayback(event: PlaybackRuntimeEvent): void {
    const metadata = mapTrackMetadata(event);
    if (!metadata) {
      currentMetadata = null;
      resolveSession += 1;
      return;
    }

    if (currentMetadata?.trackId === metadata.trackId) {
      return;
    }

    currentMetadata = metadata;
    void runResolve(metadata, { retry: false });
  }

  return {
    start() {
      if (unsubscribePlayback) {
        return;
      }
      unsubscribePlayback = dependencies.subscribePlayback(onPlayback);
    },

    stop() {
      unsubscribePlayback?.();
      unsubscribePlayback = null;
      resolveSession += 1;
    },

    async retry() {
      if (!currentMetadata) {
        return;
      }

      await runResolve(currentMetadata, { retry: true });
    },

    getResolvedLyricsForTrack(trackId: string) {
      return resolvedByTrack.get(trackId) ?? null;
    },
  };
}
