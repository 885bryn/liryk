import type { PlaybackRuntimeEvent } from "./playback-runtime";
import type { LyricTrackMetadata, ResolvedLyrics } from "../core/lyrics/types";
import { LiveSyncStore } from "../state/playback/live-sync-store";

export type LyricsResolutionRuntimeDependencies = {
  subscribePlayback: (listener: (event: PlaybackRuntimeEvent) => void) => () => void;
  resolveLyricsForTrack: (metadata: LyricTrackMetadata) => Promise<ResolvedLyrics>;
  liveSyncStore: LiveSyncStore;
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

  let unsubscribePlayback: (() => void) | null = null;
  let currentMetadata: LyricTrackMetadata | null = null;
  let resolveSession = 0;
  const resolvedByTrack = new Map<string, ResolvedLyrics>();

  async function runResolve(metadata: LyricTrackMetadata, options: { retry: boolean }): Promise<void> {
    const session = ++resolveSession;
    dependencies.liveSyncStore.setTrack(metadata.trackId);
    dependencies.liveSyncStore.setLyricsSourceState("loading");
    dependencies.liveSyncStore.setLyricsRetryState({ retryAvailable: false, retryInFlight: options.retry });
    dependencies.liveSyncStore.setLyricsWarning(null);
    dependencies.liveSyncStore.setStatusLine(options.retry ? "Retrying lyrics lookup..." : "Resolving lyrics...");

    const resolved = await dependencies.resolveLyricsForTrack(metadata);
    if (session !== resolveSession || currentMetadata?.trackId !== metadata.trackId) {
      return;
    }

    resolvedByTrack.set(metadata.trackId, resolved);
    dependencies.liveSyncStore.setResolvedLyrics(resolved);
    dependencies.liveSyncStore.setLyricsRetryState({
      retryAvailable: resolved.sourceState === "not-found",
      retryInFlight: false,
    });

    if (resolved.sourceState === "not-found") {
      dependencies.liveSyncStore.setStatusLine("Lyrics not found");
    }
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
