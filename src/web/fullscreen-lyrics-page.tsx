import { useEffect, useMemo, useRef, useState } from "react";

import { resolveLyricsForTrack } from "@/core/lyrics/lyrics-resolver";
import type { ResolvedLyrics } from "@/core/lyrics/types";
import { applyEarlyCue, DEFAULT_CUE_LEAD_MS } from "@/core/sync/early-cue";
import {
  BASE_ROW_GAP_PX,
  DEFAULT_MAX_TRANSITION_MS,
  DEFAULT_MIN_TRANSITION_MS,
  DEFAULT_TRANSITION_WINDOW_FRACTION,
  buildRowLayout,
  getFloatingIndex,
  getFloatingRowAnchorPx,
  getLineFocusMetrics,
  getRenderedFloatingIndex,
  getTransitionProgress,
} from "@/core/sync/lyric-motion-window";
import { createPlaybackClockAnchor, estimatePlaybackProgressMs } from "@/core/playback/playback-clock";
import { createLyricTimeline, getLineIndicesAt } from "@/core/sync/lyric-timeline";
import { normalizeChineseForDisplay } from "@/core/lyrics/unicode-normalization";
import { createLrclibClient } from "@/infra/providers/lrclib-client";
import type { LiveSyncUiState } from "@/state/playback/live-sync-store";
import { createLiveLyricsPanelBuilder } from "@/ui/lyrics/live-lyrics-panel";

import { useWebAuthRuntime } from "./use-web-auth-runtime";
import { useSharedPlayback } from "./use-shared-playback";

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

const JITTER_BACKWARD_TOLERANCE_MS = 500;
const FALLBACK_ROW_TEXT_HEIGHT_PX = 72;

type MotionAnchor = {
  trackId: string | null;
  activeIndex: number | null;
  nextIndex: number | null;
  easedProgress: number;
  offsetPx: number;
};

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
  const sharedPlayback = useSharedPlayback({
    source: "FullscreenLyricsPage",
    accessToken: webAuth.sessionAccessToken ?? null,
  });
  const nowPlaying = sharedPlayback.nowPlaying;
  const playbackSnapshot = sharedPlayback.playbackSnapshot;
  const [estimatedProgressMs, setEstimatedProgressMs] = useState(0);
  const [resolvedLyrics, setResolvedLyrics] = useState<ResolvedLyrics | null>(null);
  const [isLiveLocked, setIsLiveLocked] = useState(true);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const programmaticScrollRef = useRef(false);
  const playbackAnchorRef = useRef<ReturnType<typeof createPlaybackClockAnchor> | null>(null);
  const progressFrameRef = useRef<number | null>(null);
  const focusFrameRef = useRef<number | null>(null);
  const focusLastTsRef = useRef<number | null>(null);
  const renderedFloatingIndexRef = useRef(0);
  const targetFloatingIndexRef = useRef(0);
  const lyricRowRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const rowResizeObserverRef = useRef<ResizeObserver | null>(null);
  const [rowHeights, setRowHeights] = useState<number[]>([]);
  const [renderedFloatingIndex, setRenderedFloatingIndex] = useState(0);
  const lastMotionAnchorRef = useRef<MotionAnchor>({
    trackId: null,
    activeIndex: null,
    nextIndex: null,
    easedProgress: 0,
    offsetPx: 0,
  });

  const syncedLines = useMemo(
    () => (resolvedLyrics?.lines ?? []).filter((line) => typeof line.startMs === "number"),
    [resolvedLyrics?.lines],
  );
  const lyricTexts = useMemo(
    () => (resolvedLyrics?.lines ?? []).map((line) => line.displayText ?? normalizeChineseForDisplay(line.text)),
    [resolvedLyrics?.lines],
  );
  const syncedDisplayLines = useMemo(
    () =>
      syncedLines.map((line) => ({
        text: line.displayText ?? normalizeChineseForDisplay(line.text),
        startMs: line.startMs ?? 0,
      })),
    [syncedLines],
  );
  const measuredRowHeights = useMemo(
    () =>
      syncedDisplayLines.map((_, index) => {
        const measured = rowHeights[index];
        return Number.isFinite(measured) && measured > 0 ? measured : FALLBACK_ROW_TEXT_HEIGHT_PX;
      }),
    [rowHeights, syncedDisplayLines],
  );
  const rowLayout = useMemo(() => buildRowLayout(measuredRowHeights, BASE_ROW_GAP_PX), [measuredRowHeights]);

  const setLyricRowRef = (index: number) => (element: HTMLParagraphElement | null) => {
    lyricRowRefs.current[index] = element;
  };
  const cueAdjustedProgressMs = applyEarlyCue(estimatedProgressMs, DEFAULT_CUE_LEAD_MS);
  const syncedTimeline = useMemo(
    () =>
      createLyricTimeline(
        syncedDisplayLines.map((line) => ({
          startMs: line.startMs,
          text: line.text,
        })),
      ),
    [syncedDisplayLines],
  );
  const lineIndices = syncedTimeline.lines.length > 0 ? getLineIndicesAt(syncedTimeline, cueAdjustedProgressMs) : { activeIndex: null, nextIndex: null };
  const activeSyncedIndex = lineIndices.activeIndex;
  const nextSyncedIndex = lineIndices.nextIndex;
  const hasStartedSyncedLyrics = typeof activeSyncedIndex === "number";
  const syncedMotionState =
    resolvedLyrics?.renderMode === "synced" && hasStartedSyncedLyrics && typeof activeSyncedIndex === "number"
      ? (() => {
          const currentAnchorOffsetPx = -getFloatingRowAnchorPx(rowLayout, activeSyncedIndex);

          if (typeof nextSyncedIndex !== "number") {
            return {
              floatingIndex: activeSyncedIndex,
              targetOffsetPx: currentAnchorOffsetPx,
              transition: null,
              easedProgress: 0,
            };
          }

          const currentLine = syncedDisplayLines[activeSyncedIndex];
          const nextLine = syncedDisplayLines[nextSyncedIndex];
          if (!currentLine || !nextLine) {
            return {
              floatingIndex: activeSyncedIndex,
              targetOffsetPx: currentAnchorOffsetPx,
              transition: null,
              easedProgress: 0,
            };
          }

          const transition = getTransitionProgress({
            progressMs: cueAdjustedProgressMs,
            currentStartMs: currentLine.startMs,
            nextStartMs: nextLine.startMs,
            minTransitionMs: DEFAULT_MIN_TRANSITION_MS,
            maxTransitionMs: DEFAULT_MAX_TRANSITION_MS,
            transitionFraction: DEFAULT_TRANSITION_WINDOW_FRACTION,
          });

          let easedProgress = transition.easedProgress;
          if (
            transition.isShortGap &&
            lastMotionAnchorRef.current.trackId === nowPlaying?.trackId &&
            lastMotionAnchorRef.current.activeIndex === activeSyncedIndex &&
            lastMotionAnchorRef.current.nextIndex === nextSyncedIndex
          ) {
            easedProgress = Math.max(lastMotionAnchorRef.current.easedProgress, easedProgress);
          }

          if (transition.phase !== "transition" || nextSyncedIndex <= activeSyncedIndex) {
            return {
              floatingIndex: activeSyncedIndex,
              targetOffsetPx: currentAnchorOffsetPx,
              transition: null,
              easedProgress: 0,
            };
          }

          const floatingIndex = getFloatingIndex({
            currentIndex: activeSyncedIndex,
            nextIndex: nextSyncedIndex,
            phase: transition.phase,
            easedProgress,
          });

          const measuredTargetOffsetPx = -getFloatingRowAnchorPx(
            rowLayout,
            floatingIndex,
          );

          return {
            floatingIndex,
            targetOffsetPx: measuredTargetOffsetPx,
            transition,
            easedProgress,
          };
        })()
      : { floatingIndex: 0, targetOffsetPx: 0, transition: null, easedProgress: 0 };

  const floatingSyncedIndex = syncedMotionState.floatingIndex;
  const canRenderSyncedMotion =
    resolvedLyrics?.renderMode === "synced" && hasStartedSyncedLyrics && syncedDisplayLines.length > 0;
  const syncedVerticalPadding = "50vh";
  const renderedTrackOffsetPx = canRenderSyncedMotion
    ? -getFloatingRowAnchorPx(rowLayout, renderedFloatingIndex)
    : 0;
  const syncedTrackTranslateY =
    canRenderSyncedMotion
      ? `${renderedTrackOffsetPx}px`
      : "0px";
  const elapsedProgressLabel = formatElapsedProgress(estimatedProgressMs);

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
    estimatedProgressMs,
    polledProgressMs: playbackSnapshot?.progressMs ?? 0,
    driftDeltaMs: estimatedProgressMs - (playbackSnapshot?.progressMs ?? 0),
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
    if (playbackSnapshot === null) {
      playbackAnchorRef.current = null;
      setEstimatedProgressMs(0);
      return;
    }

    const nowPerfMs = performance.now();
    const currentAnchor = playbackAnchorRef.current;
    let normalizedProgressMs = playbackSnapshot.progressMs;

    if (currentAnchor && currentAnchor.trackId === playbackSnapshot.trackId && playbackSnapshot.isPlaying) {
      const estimatedFromAnchor = estimatePlaybackProgressMs(currentAnchor, nowPerfMs);
      const backwardDeltaMs = estimatedFromAnchor - normalizedProgressMs;
      if (backwardDeltaMs > 0 && backwardDeltaMs <= JITTER_BACKWARD_TOLERANCE_MS) {
        normalizedProgressMs = Math.floor(estimatedFromAnchor);
      }
    }

    playbackAnchorRef.current = createPlaybackClockAnchor({
      snapshot: {
        ...playbackSnapshot,
        progressMs: normalizedProgressMs,
      },
      capturedAtPerfMs: nowPerfMs,
    });
    setEstimatedProgressMs(normalizedProgressMs);
  }, [playbackSnapshot]);

  useEffect(() => {
    if (progressFrameRef.current !== null) {
      cancelAnimationFrame(progressFrameRef.current);
      progressFrameRef.current = null;
    }

    if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) {
      return;
    }

    let cancelled = false;
    const tick = () => {
      if (cancelled) {
        return;
      }

      const anchor = playbackAnchorRef.current;
      if (anchor) {
        const estimated = Math.floor(estimatePlaybackProgressMs(anchor, performance.now()));
        setEstimatedProgressMs(estimated);
      }

      progressFrameRef.current = requestAnimationFrame(tick);
    };

    progressFrameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (progressFrameRef.current !== null) {
        cancelAnimationFrame(progressFrameRef.current);
        progressFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    targetFloatingIndexRef.current = floatingSyncedIndex;
    if (!canRenderSyncedMotion) {
      renderedFloatingIndexRef.current = floatingSyncedIndex;
      setRenderedFloatingIndex(floatingSyncedIndex);
    }
  }, [canRenderSyncedMotion, floatingSyncedIndex]);

  useEffect(() => {
    if (focusFrameRef.current !== null) {
      cancelAnimationFrame(focusFrameRef.current);
      focusFrameRef.current = null;
    }

    focusLastTsRef.current = null;
    if (!canRenderSyncedMotion) {
      return;
    }

    const tick = (timestamp: number) => {
      const previousTimestamp = focusLastTsRef.current;
      focusLastTsRef.current = timestamp;
      const deltaMs = previousTimestamp === null ? 16 : timestamp - previousTimestamp;

      const nextRendered = getRenderedFloatingIndex({
        targetFloatingIndex: targetFloatingIndexRef.current,
        previousRenderedFloatingIndex: renderedFloatingIndexRef.current,
        deltaMs,
      });

      if (Math.abs(nextRendered - renderedFloatingIndexRef.current) > 0.0005) {
        renderedFloatingIndexRef.current = nextRendered;
        setRenderedFloatingIndex(nextRendered);
      }

      focusFrameRef.current = requestAnimationFrame(tick);
    };

    focusFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (focusFrameRef.current !== null) {
        cancelAnimationFrame(focusFrameRef.current);
        focusFrameRef.current = null;
      }
      focusLastTsRef.current = null;
    };
  }, [canRenderSyncedMotion]);

  useEffect(() => {
    lastMotionAnchorRef.current = {
      trackId: nowPlaying?.trackId ?? null,
      activeIndex: activeSyncedIndex,
      nextIndex: nextSyncedIndex,
      easedProgress: syncedMotionState.easedProgress,
      offsetPx: renderedTrackOffsetPx,
    };
  }, [activeSyncedIndex, nextSyncedIndex, nowPlaying?.trackId, renderedTrackOffsetPx, syncedMotionState.easedProgress]);

  useEffect(() => {
    if (resolvedLyrics?.renderMode !== "synced") {
      setRowHeights([]);
      return;
    }

    let mounted = true;

    const measureRows = () => {
      if (!mounted) {
        return;
      }

      const nextHeights = syncedDisplayLines.map((_, index) => {
        const element = lyricRowRefs.current[index];
        if (!element) {
          return FALLBACK_ROW_TEXT_HEIGHT_PX;
        }

        const rect = element.getBoundingClientRect();
        const measured = Math.round(rect.height);
        return measured > 0 ? measured : FALLBACK_ROW_TEXT_HEIGHT_PX;
      });

      setRowHeights((current) => {
        if (current.length === nextHeights.length && current.every((value, index) => Math.abs(value - nextHeights[index]) <= 1)) {
          return current;
        }
        return nextHeights;
      });
    };

    measureRows();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        measureRows();
      });
      rowResizeObserverRef.current = observer;
      for (const element of lyricRowRefs.current) {
        if (element) {
          observer.observe(element);
        }
      }
    }

    const onResize = () => {
      measureRows();
    };
    window.addEventListener("resize", onResize);

    return () => {
      mounted = false;
      window.removeEventListener("resize", onResize);
      rowResizeObserverRef.current?.disconnect();
      rowResizeObserverRef.current = null;
    };
  }, [resolvedLyrics?.renderMode, syncedDisplayLines]);

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
                className="space-y-0 leading-relaxed motion-reduce:transition-none"
                style={{ transform: `translateY(${syncedTrackTranslateY})` }}
              >
              {resolvedLyrics?.renderMode === "synced"
                ? syncedDisplayLines.map((line, index) => {
                    const visualState = getLineFocusMetrics(index, renderedFloatingIndex);
                    const transitionClassName = "transition-[filter,opacity,color] duration-[180ms] ease-linear motion-reduce:transition-none";
                    const tier = !hasStartedSyncedLyrics
                      ? index === 0
                        ? "near"
                        : "distant"
                      : visualState.distance < 0.5
                        ? "active"
                        : visualState.distance < 1.5
                          ? "near"
                          : "distant";
                    const tierClassName = `relative flex min-h-[52px] items-center py-2 text-4xl leading-[1.15] sm:text-5xl ${transitionClassName}`;

                  return (
                    <p
                      key={`${index}-${line.text}`}
                      data-testid={`fullscreen-lyric-line-${tier}`}
                      className={tierClassName}
                      ref={setLyricRowRef(index)}
                      style={{
                        opacity: visualState.opacity,
                        transform: `scale(${visualState.scale})`,
                        color: `rgba(255,255,255,${visualState.colorAlpha})`,
                        filter: `blur(${visualState.blurPx}px) brightness(${visualState.brightness})`,
                        fontWeight: 560,
                      }}
                    >
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
