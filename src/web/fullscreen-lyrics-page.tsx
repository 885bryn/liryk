import { useEffect, useState } from "react";

import { resolveLyricsForTrack } from "@/core/lyrics/lyrics-resolver";
import type { ResolvedLyrics } from "@/core/lyrics/types";
import { createLrclibClient } from "@/infra/providers/lrclib-client";
import type { LiveSyncUiState } from "@/state/playback/live-sync-store";
import { createLiveLyricsPanelBuilder } from "@/ui/lyrics/live-lyrics-panel";

import { fetchWebNowPlaying, type WebNowPlaying } from "./auth/now-playing";
import { useWebAuthRuntime } from "./use-web-auth-runtime";

const baseSyncState: LiveSyncUiState = {
  playbackState: "idle",
  activeLineIndex: null,
  nextLineIndex: null,
  confidence: "static",
  trackId: null,
  statusLine: "Play a track on Spotify to start live lyrics.",
  resolvedLyrics: [],
  lyricsSourceState: "loading",
  lyricsRenderMode: null,
  lyricsWarning: null,
  retryAvailable: false,
  retryInFlight: false,
};

export function FullscreenLyricsPage() {
  const webAuth = useWebAuthRuntime();
  const [nowPlaying, setNowPlaying] = useState<WebNowPlaying | null>(null);
  const [resolvedLyrics, setResolvedLyrics] = useState<ResolvedLyrics | null>(null);

  const syncedLines = (resolvedLyrics?.lines ?? []).filter((line) => typeof line.startMs === "number");
  const lyricTexts = (resolvedLyrics?.lines ?? []).map((line) => line.displayText ?? line.text);
  const activeSyncedIndex =
    nowPlaying && syncedLines.length > 0
      ? Math.max(
          0,
          syncedLines.reduce((best, line, index) => {
            if ((line.startMs ?? 0) <= nowPlaying.progressMs) {
              return index;
            }
            return best;
          }, 0),
        )
      : null;
  const nextSyncedIndex =
    typeof activeSyncedIndex === "number" && activeSyncedIndex + 1 < syncedLines.length ? activeSyncedIndex + 1 : null;

  const lyricsPanel = createLiveLyricsPanelBuilder().build({
    syncState: {
      ...baseSyncState,
      playbackState: nowPlaying ? (nowPlaying.isPlaying ? "playing" : "paused") : "idle",
      trackId: nowPlaying?.trackId ?? null,
      activeLineIndex: resolvedLyrics?.renderMode === "synced" ? activeSyncedIndex : null,
      nextLineIndex: resolvedLyrics?.renderMode === "synced" ? nextSyncedIndex : null,
      lyricsSourceState: resolvedLyrics?.sourceState ?? "loading",
      lyricsRenderMode: resolvedLyrics?.renderMode ?? null,
      resolvedLyrics: resolvedLyrics?.lines ?? [],
      statusLine:
        resolvedLyrics?.sourceState === "not-found"
          ? "Lyrics not found"
          : resolvedLyrics
            ? "Lyrics ready"
            : "Resolving lyrics...",
    },
    lines: lyricTexts,
    trackTitle: nowPlaying?.title,
    trackArtist: nowPlaying?.artist,
    showReturnToLive: false,
  });

  useEffect(() => {
    if (!webAuth.sessionAccessToken) {
      setNowPlaying(null);
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const current = await fetchWebNowPlaying(webAuth.sessionAccessToken);
        if (active) {
          setNowPlaying(current);
        }
      } catch {
        if (active) {
          setNowPlaying(null);
        }
      } finally {
        if (active) {
          timer = setTimeout(() => {
            void poll();
          }, 1000);
        }
      }
    };

    void poll();

    return () => {
      active = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [webAuth.sessionAccessToken]);

  useEffect(() => {
    if (!webAuth.sessionAccessToken || !nowPlaying?.trackId) {
      setResolvedLyrics(null);
      return;
    }

    let active = true;
    const lrclib = createLrclibClient({ fetchFn: fetch });

    const resolve = async () => {
      try {
        const resolved = await resolveLyricsForTrack(
          {
            trackId: nowPlaying.trackId,
            title: nowPlaying.title,
            artist: nowPlaying.artist,
          },
          lrclib,
        );
        if (active) {
          setResolvedLyrics(resolved);
        }
      } catch {
        if (active) {
          setResolvedLyrics({ sourceState: "not-found", renderMode: "plain-static", lines: [] });
        }
      }
    };

    void resolve();

    return () => {
      active = false;
    };
  }, [webAuth.sessionAccessToken, nowPlaying?.trackId, nowPlaying?.title, nowPlaying?.artist]);

  return (
    <div data-testid="fullscreen-lyrics-layout" className="min-h-screen w-full bg-background text-foreground">
      <main
        data-testid="fullscreen-lyrics-column"
        className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 px-6 py-20 text-left sm:px-8 sm:py-24 lg:py-28"
      >
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Now playing</p>
        <p className="text-3xl font-semibold leading-tight sm:text-4xl">{lyricsPanel.nowPlayingTitle}</p>
        <p className="text-lg text-muted-foreground sm:text-xl">{lyricsPanel.nowPlayingArtist}</p>

        <p className="text-base text-muted-foreground sm:text-lg">{lyricsPanel.stateRailMessage}</p>

        {lyricsPanel.sourceState === "not-found" ? (
          <p className="text-lg text-muted-foreground">Lyrics not found</p>
        ) : lyricsPanel.status === "idle" || lyricsPanel.status === "no-track" ? (
          <p className="text-lg text-muted-foreground">Lyrics will appear once a track is playing.</p>
        ) : (
          <div className="space-y-3 text-2xl leading-relaxed sm:text-3xl">
            {lyricsPanel.activeLineText ? <p className="font-semibold text-foreground">{lyricsPanel.activeLineText}</p> : null}
            {lyricsPanel.nextLineText ? <p className="text-muted-foreground">{lyricsPanel.nextLineText}</p> : null}
          </div>
        )}
      </main>
    </div>
  );
}
