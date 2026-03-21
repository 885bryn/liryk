import { useEffect, useRef, useState } from "react";

import { resolveLyricsForTrack } from "@/core/lyrics/lyrics-resolver";
import type { ResolvedLyrics } from "@/core/lyrics/types";
import { applyEarlyCue, DEFAULT_CUE_LEAD_MS } from "@/core/sync/early-cue";
import {
  DEFAULT_MAX_TRANSITION_MS,
  DEFAULT_MIN_TRANSITION_MS,
  DEFAULT_TRANSITION_WINDOW_FRACTION,
  easeInOutExpo,
  getTargetScrollOffset,
  getTransitionPhase,
} from "@/core/sync/lyric-motion-window";
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
  estimatedProgressMs: 0,
  polledProgressMs: 0,
  driftDeltaMs: 0,
  correctionState: "static",
};

const SYNC_LINE_STEP_PX = 88;
const MIN_OFFSET_ANIMATION_MS = 360;
const MAX_OFFSET_ANIMATION_MS = 980;

function formatElapsedProgress(progressMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(progressMs / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function FullscreenLyricsPage() {
  const webAuth = useWebAuthRuntime();
  const [nowPlaying, setNowPlaying] = useState<WebNowPlaying | null>(null);
  const [resolvedLyrics, setResolvedLyrics] = useState<ResolvedLyrics | null>(null);
  const [isLiveLocked, setIsLiveLocked] = useState(true);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [displayTrackOffsetPx, setDisplayTrackOffsetPx] = useState(0);
  const programmaticScrollRef = useRef(false);
  const displayTrackOffsetRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const syncedLines = (resolvedLyrics?.lines ?? []).filter((line) => typeof line.startMs === "number");
  const lyricTexts = (resolvedLyrics?.lines ?? []).map((line) => line.displayText ?? normalizeChineseForDisplay(line.text));
  const syncedDisplayLines = syncedLines.map((line) => ({
    text: line.displayText ?? normalizeChineseForDisplay(line.text),
    startMs: line.startMs ?? 0,
  }));
  const cueAdjustedProgressMs = applyEarlyCue(nowPlaying?.progressMs ?? 0, DEFAULT_CUE_LEAD_MS);
  const firstSyncedStartMs = syncedDisplayLines[0]?.startMs ?? 0;
  const hasStartedSyncedLyrics = Boolean(nowPlaying && syncedDisplayLines.length > 0 && cueAdjustedProgressMs >= firstSyncedStartMs);
  const activeSyncedIndex =
    hasStartedSyncedLyrics && nowPlaying && syncedLines.length > 0
      ? Math.max(
          0,
          syncedLines.reduce((best, line, index) => {
            if ((line.startMs ?? 0) <= cueAdjustedProgressMs) {
              return index;
            }
            return best;
          }, 0),
        )
      : null;
  const nextSyncedIndex =
    hasStartedSyncedLyrics && typeof activeSyncedIndex === "number" && activeSyncedIndex + 1 < syncedLines.length
      ? activeSyncedIndex + 1
      : null;
  const syncedMotionState =
    resolvedLyrics?.renderMode === "synced" && hasStartedSyncedLyrics && typeof activeSyncedIndex === "number"
      ? (() => {
          const currentAnchorOffsetPx = -activeSyncedIndex * SYNC_LINE_STEP_PX;

          if (typeof nextSyncedIndex !== "number") {
            return {
              targetOffsetPx: currentAnchorOffsetPx,
              shouldAnimate: false,
            };
          }

          const currentLine = syncedDisplayLines[activeSyncedIndex];
          const nextLine = syncedDisplayLines[nextSyncedIndex];
          if (!currentLine || !nextLine) {
            return {
              targetOffsetPx: currentAnchorOffsetPx,
              shouldAnimate: false,
            };
          }

          const transition = getTransitionPhase({
            progressMs: cueAdjustedProgressMs,
            currentStartMs: currentLine.startMs,
            nextStartMs: nextLine.startMs,
            minTransitionMs: DEFAULT_MIN_TRANSITION_MS,
            maxTransitionMs: DEFAULT_MAX_TRANSITION_MS,
            transitionFraction: DEFAULT_TRANSITION_WINDOW_FRACTION,
          });

          if (transition.phase !== "transition" || nextSyncedIndex <= activeSyncedIndex) {
            return {
              targetOffsetPx: currentAnchorOffsetPx,
              shouldAnimate: false,
            };
          }

          const targetOffsetPx = getTargetScrollOffset({
            currentIndex: activeSyncedIndex,
            nextIndex: nextSyncedIndex,
            phaseProgress: transition.phaseProgress,
            phase: transition.phase,
            stepPx: SYNC_LINE_STEP_PX,
          });

          return {
            targetOffsetPx,
            shouldAnimate: true,
          };
        })()
      : { targetOffsetPx: 0, shouldAnimate: false };
  const syncedTrackOffsetPx = syncedMotionState.targetOffsetPx;
  const shouldAnimateTrackOffset = syncedMotionState.shouldAnimate;
  useEffect(() => {
    displayTrackOffsetRef.current = displayTrackOffsetPx;
  }, [displayTrackOffsetPx]);

  useEffect(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const canAnimate = resolvedLyrics?.renderMode === "synced" && hasStartedSyncedLyrics && syncedDisplayLines.length > 0;
    if (!canAnimate) {
      setDisplayTrackOffsetPx(0);
      return;
    }

    if (!shouldAnimateTrackOffset) {
      setDisplayTrackOffsetPx(syncedTrackOffsetPx);
      return;
    }

    const from = displayTrackOffsetRef.current;
    const to = syncedTrackOffsetPx;
    const deltaPx = Math.abs(to - from);

    if (deltaPx < 0.01) {
      setDisplayTrackOffsetPx(to);
      return;
    }

    const durationMs = Math.min(MAX_OFFSET_ANIMATION_MS, Math.max(MIN_OFFSET_ANIMATION_MS, deltaPx * 5.5));
    let startTs: number | null = null;

    const tick = (timestamp: number) => {
      if (startTs === null) {
        startTs = timestamp;
      }

      const elapsed = timestamp - startTs;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = easeInOutExpo(progress);
      const nextOffset = from + (to - from) * eased;
      setDisplayTrackOffsetPx(nextOffset);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      animationFrameRef.current = null;
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [hasStartedSyncedLyrics, resolvedLyrics?.renderMode, shouldAnimateTrackOffset, syncedDisplayLines.length, syncedTrackOffsetPx]);

  const activeSyncedRenderIndex =
    resolvedLyrics?.renderMode === "synced" && hasStartedSyncedLyrics && syncedDisplayLines.length > 0
      ? Math.max(
          0,
          Math.min(syncedDisplayLines.length - 1, Math.round(Math.abs(displayTrackOffsetPx) / SYNC_LINE_STEP_PX)),
        )
      : 0;
  const syncedVerticalPadding = `calc(50vh - ${Math.floor(SYNC_LINE_STEP_PX / 2)}px)`;
  const syncedTrackTranslateY =
    resolvedLyrics?.renderMode === "synced" && hasStartedSyncedLyrics && syncedDisplayLines.length > 0
      ? `${displayTrackOffsetPx}px`
      : "0px";
  const elapsedProgressLabel = formatElapsedProgress(nowPlaying?.progressMs ?? 0);

  const findLiveAnchorElement = (): HTMLElement | null => {
    if (typeof document === "undefined") {
      return null;
    }

    return (
      (document.querySelector('[data-testid="fullscreen-lyric-line-active"]') as HTMLElement | null) ??
      (document.querySelector('[data-testid="fullscreen-lyric-line-near"]') as HTMLElement | null)
    );
  };

  const scrollToLiveAnchor = (behavior: ScrollBehavior) => {
    if (typeof window === "undefined") {
      return;
    }

    if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) {
      return;
    }

    const liveAnchor = findLiveAnchorElement();
    const targetScrollTop = liveAnchor
      ? Math.max(
          0,
          window.scrollY + liveAnchor.getBoundingClientRect().top - (window.innerHeight / 2 - liveAnchor.offsetHeight / 2),
        )
      : 0;

    programmaticScrollRef.current = true;
    try {
      window.scrollTo({ top: targetScrollTop, behavior });
    } catch {
      // jsdom and some embedded webviews may not implement scroll APIs.
    }
    window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, behavior === "smooth" ? 350 : 80);
  };

  const syncState: LiveSyncUiState = {
    ...baseSyncState,
    playbackState: nowPlaying ? (nowPlaying.isPlaying ? "playing" : "paused") : "idle",
    trackId: nowPlaying?.trackId ?? null,
    activeLineIndex: resolvedLyrics?.renderMode === "synced" ? activeSyncedIndex : null,
    nextLineIndex: resolvedLyrics?.renderMode === "synced" ? nextSyncedIndex : null,
    lyricsSourceState: resolvedLyrics?.sourceState ?? "loading",
    lyricsRenderMode: resolvedLyrics?.renderMode ?? null,
    resolvedLyrics: resolvedLyrics?.lines ?? [],
    estimatedProgressMs: nowPlaying?.progressMs ?? 0,
    polledProgressMs: nowPlaying?.progressMs ?? 0,
    driftDeltaMs: 0,
    correctionState: nowPlaying ? "synced" : "static",
    statusLine:
      resolvedLyrics?.sourceState === "not-found"
        ? "Lyrics not found"
        : resolvedLyrics
          ? "Lyrics ready"
          : "Resolving lyrics...",
  };

  const lyricsPanel = createLiveLyricsPanelBuilder().build({
    syncState,
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

  useEffect(() => {
    setIsLiveLocked(true);
    scrollToLiveAnchor("auto");
  }, [nowPlaying?.trackId]);

  useEffect(() => {
    if (!isLiveLocked) {
      return;
    }

    const timer = window.setTimeout(() => {
      scrollToLiveAnchor("auto");
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isLiveLocked, activeSyncedRenderIndex, hasStartedSyncedLyrics]);

  useEffect(() => {
    const onScroll = () => {
      if (programmaticScrollRef.current || typeof window === "undefined") {
        return;
      }

      if (window.scrollY > 20 && isLiveLocked) {
        setIsLiveLocked(false);
      }

      if (window.scrollY <= 4 && !isLiveLocked) {
        setIsLiveLocked(true);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [isLiveLocked]);

  return (
    <div data-testid="fullscreen-lyrics-layout" className="min-h-screen w-full bg-black text-white">
      <a
        href="/"
        className="fixed left-4 top-3 z-20 bg-transparent text-[10px] tracking-[0.14em] text-white/40 transition-colors duration-200 hover:text-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 sm:left-6 sm:top-4"
      >
        Exit Fullscreen Lyrics
      </a>

      {!isLiveLocked ? (
        <button
          type="button"
          data-testid="fullscreen-return-live"
          className="fixed bottom-4 right-4 z-20 bg-transparent text-[10px] tracking-[0.16em] text-white/45 transition-colors duration-200 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 sm:bottom-6 sm:right-6"
          onClick={() => {
            setIsLiveLocked(true);
            scrollToLiveAnchor("smooth");
          }}
        >
          Back to Live
        </button>
      ) : null}

      <button
        type="button"
        data-testid="fullscreen-diagnostics-toggle"
        aria-expanded={showDiagnostics}
        className="fixed left-4 top-10 z-20 bg-transparent text-[10px] tracking-[0.14em] text-white/45 transition-colors duration-200 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 sm:left-6 sm:top-12"
        onClick={() => {
          setShowDiagnostics((current) => !current);
        }}
      >
        {showDiagnostics ? "Hide Diagnostics" : "Show Diagnostics"}
      </button>

      {showDiagnostics ? (
        <section
          data-testid="fullscreen-diagnostics-overlay"
          className="fixed left-4 top-16 z-20 min-w-[220px] rounded-sm border border-white/15 bg-black/60 px-3 py-2 text-[10px] leading-tight text-white/72 backdrop-blur-sm sm:left-6 sm:top-20"
        >
          <p className="pb-1 text-[9px] tracking-[0.16em] text-white/50">Timing Diagnostics</p>
          <p>
            Estimated ms: <span data-testid="diagnostics-estimated-ms">{syncState.estimatedProgressMs}</span>
          </p>
          <p>
            Polled ms: <span data-testid="diagnostics-polled-ms">{syncState.polledProgressMs}</span>
          </p>
          <p>
            Drift delta ms: <span data-testid="diagnostics-drift-delta-ms">{syncState.driftDeltaMs}</span>
          </p>
          <p>
            Correction state: <span data-testid="diagnostics-correction-state">{syncState.correctionState}</span>
          </p>
        </section>
      ) : null}

      <div
        data-testid="fullscreen-meta-overlay"
        className="pointer-events-none fixed right-4 top-3 z-10 flex max-w-[45vw] flex-col items-end gap-0.5 bg-transparent text-right text-[10px] leading-tight text-white/32 sm:right-6 sm:top-4"
      >
        <p className="truncate">{lyricsPanel.nowPlayingTitle}</p>
        <p className="truncate">{lyricsPanel.nowPlayingArtist}</p>
        <p data-testid="fullscreen-progress-overlay" className="pt-0.5 text-[9px] tracking-[0.18em] text-white/25">
          {`Elapsed ${elapsedProgressLabel}`}
        </p>
      </div>

      <main
        data-testid="fullscreen-lyrics-column"
        className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-start px-6 text-left sm:px-8"
      >
        {lyricsPanel.sourceState === "not-found" ? (
          <p className="text-lg text-white/70">Lyrics not found</p>
        ) : lyricsPanel.status === "idle" || lyricsPanel.status === "no-track" ? (
          <p className="text-lg text-white/70">Lyrics will appear once a track is playing.</p>
        ) : (
          <div className="relative" style={{ paddingTop: syncedVerticalPadding, paddingBottom: syncedVerticalPadding }}>
              <div
                data-testid="fullscreen-lyrics-track"
                className="space-y-3 leading-relaxed motion-reduce:transition-none"
                style={{ transform: `translateY(${syncedTrackTranslateY})` }}
              >
              {resolvedLyrics?.renderMode === "synced"
                ? syncedDisplayLines.map((line, index) => {
                    const distance = Math.abs(index - activeSyncedRenderIndex);
                    const transitionClassName =
                      "transition-[opacity,color] duration-[360ms] ease-out motion-reduce:transition-none";
                    const tier = !hasStartedSyncedLyrics
                      ? index === 0
                        ? "near"
                        : "distant"
                      : distance === 0
                        ? "active"
                        : distance === 1
                          ? "near"
                          : "distant";
                    const tierClassName =
                      tier === "active"
                        ? `h-[88px] flex items-center text-white font-semibold text-4xl sm:text-5xl ${transitionClassName}`
                        : tier === "near"
                          ? `h-[88px] flex items-center text-zinc-300 font-medium text-3xl sm:text-4xl ${transitionClassName}`
                          : `h-[88px] flex items-center text-zinc-500 font-normal text-2xl sm:text-3xl ${transitionClassName}`;

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
