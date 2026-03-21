import { useEffect, useState } from "react";

import { resolveLyricsForTrack } from "@/core/lyrics/lyrics-resolver";
import type { ResolvedLyrics } from "@/core/lyrics/types";
import { normalizeChineseForDisplay } from "@/core/lyrics/unicode-normalization";
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
  const lyricTexts = (resolvedLyrics?.lines ?? []).map((line) => line.displayText ?? normalizeChineseForDisplay(line.text));
  const syncedDisplayLines = syncedLines.map((line) => ({
    text: line.displayText ?? normalizeChineseForDisplay(line.text),
    startMs: line.startMs ?? 0,
  }));
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
  const activeSyncedRenderIndex = typeof activeSyncedIndex === "number" ? activeSyncedIndex : 0;
  const syncedTrackTranslateY =
    resolvedLyrics?.renderMode === "synced" && syncedDisplayLines.length > 0
      ? `${160 - activeSyncedRenderIndex * 72}px`
      : "0px";

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
    <div data-testid="fullscreen-lyrics-layout" className="min-h-screen w-full bg-black text-white">
      <main
        data-testid="fullscreen-lyrics-column"
        className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 px-6 py-20 text-left sm:px-8 sm:py-24 lg:py-28"
      >
        <a
          href="/"
          className="self-start text-sm text-white/60 transition-colors duration-200 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Exit Fullscreen Lyrics
        </a>

        <p className="text-3xl font-semibold leading-tight sm:text-4xl">{lyricsPanel.nowPlayingTitle}</p>
        <p className="text-lg text-white/70 sm:text-xl">{lyricsPanel.nowPlayingArtist}</p>

        {lyricsPanel.sourceState === "not-found" ? (
          <p className="text-lg text-white/70">Lyrics not found</p>
        ) : lyricsPanel.status === "idle" || lyricsPanel.status === "no-track" ? (
          <p className="text-lg text-white/70">Lyrics will appear once a track is playing.</p>
        ) : (
          <div className="relative overflow-hidden">
            <div
              data-testid="fullscreen-lyrics-track"
              className="space-y-3 leading-relaxed transition-transform duration-500 ease-out motion-reduce:transition-none"
              style={{ transform: `translateY(${syncedTrackTranslateY})` }}
            >
              {resolvedLyrics?.renderMode === "synced"
                ? syncedDisplayLines.map((line, index) => {
                    const distance = Math.abs(index - activeSyncedRenderIndex);
                    const transitionClassName =
                      "transition-[transform,opacity,color] duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none";
                  const tier = distance === 0 ? "active" : distance === 1 ? "near" : "distant";
                  const tierClassName =
                    tier === "active"
                      ? `text-white font-semibold text-4xl sm:text-5xl scale-100 translate-y-0 ${transitionClassName}`
                      : tier === "near"
                        ? `text-zinc-300 font-medium text-3xl sm:text-4xl scale-[0.98] translate-y-1 ${transitionClassName}`
                        : `text-zinc-500 font-normal text-2xl sm:text-3xl scale-95 translate-y-2 ${transitionClassName}`;

                  return (
                    <p key={`${index}-${line.text}`} data-testid={`fullscreen-lyric-line-${tier}`} className={tierClassName}>
                      {line.text}
                    </p>
                  );
                })
                : null}
              {resolvedLyrics?.renderMode !== "synced" && lyricsPanel.activeLineText ? (
                <p className="text-white font-semibold text-4xl sm:text-5xl">{lyricsPanel.activeLineText}</p>
              ) : null}
              {resolvedLyrics?.renderMode !== "synced" && lyricsPanel.nextLineText ? (
                <p className="text-zinc-300 font-medium text-3xl sm:text-4xl">{lyricsPanel.nextLineText}</p>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
