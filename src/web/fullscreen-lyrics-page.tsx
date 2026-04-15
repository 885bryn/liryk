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
  type RowLayout,
} from "@/core/sync/lyric-motion-window";
import { createPlaybackClockAnchor, estimatePlaybackProgressMs } from "@/core/playback/playback-clock";
import { createLyricTimeline, getLineIndicesAt } from "@/core/sync/lyric-timeline";
import { normalizeChineseForDisplay } from "@/core/lyrics/unicode-normalization";
import { createLrclibClient } from "@/infra/providers/lrclib-client";
import type { LiveSyncUiState } from "@/state/playback/live-sync-store";
import { createLiveLyricsPanelBuilder } from "@/ui/lyrics/live-lyrics-panel";

import { useWebAuthRuntime } from "./use-web-auth-runtime";
import { useSharedPlayback } from "./use-shared-playback";
import { useKaraokeMode } from "./use-karaoke-mode";

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
const LIVE_INDEX_SNAP_THRESHOLD = 3;

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

export function getBoundaryLockedScrollTop(input: {
  viewportHeight: number;
  rowLayout: RowLayout;
  floatingIndex: number;
}): number {
  const viewportHeight = Number.isFinite(input.viewportHeight) ? Math.max(0, input.viewportHeight) : 0;
  if (viewportHeight <= 0 || input.rowLayout.heights.length === 0) {
    return 0;
  }

  const rowAnchorPx = getFloatingRowAnchorPx(input.rowLayout, input.floatingIndex);
  const activeRowIndex = Math.min(Math.max(Math.round(input.floatingIndex), 0), input.rowLayout.heights.length - 1);
  const activeRowHeight = input.rowLayout.heights[activeRowIndex] ?? 0;
  const activeRowTop = viewportHeight / 2 - rowAnchorPx + (input.rowLayout.offsets[activeRowIndex] ?? 0);
  const activeRowBottom = activeRowTop + activeRowHeight;

  // The lyric track already applies the row anchor with translateY(...). Live mode
  // must not scroll by that same anchor again, or the current row is pushed out of
  // view in real browsers. Keep the scroll surface at its live origin unless a row
  // is genuinely taller than the viewport.
  if (activeRowTop >= 0 && activeRowBottom <= viewportHeight) {
    return 0;
  }

  return 0;
}

export function FullscreenLyricsPage() {
  const webAuth = useWebAuthRuntime();
  const sharedPlayback = useSharedPlayback({
    source: "FullscreenLyricsPage",
    accessToken: webAuth.sessionAccessToken ?? null,
  });
  const nowPlaying = sharedPlayback.nowPlaying;
  const karaoke = useKaraokeMode({
    accessToken: webAuth.sessionAccessToken ?? null,
    nowPlaying,
  });
  const activeTrack = karaoke.referenceTrack ?? nowPlaying;
  const playbackSnapshot = sharedPlayback.playbackSnapshot;
  const [estimatedProgressMs, setEstimatedProgressMs] = useState(0);
  const [resolvedLyrics, setResolvedLyrics] = useState<ResolvedLyrics | null>(null);
  const [isLiveLocked, setIsLiveLocked] = useState(true);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const programmaticScrollRef = useRef(false);
  const userScrollIntentRef = useRef(false);
  const viewportSurfaceRef = useRef<HTMLDivElement | null>(null);
  const playbackAnchorRef = useRef<ReturnType<typeof createPlaybackClockAnchor> | null>(null);
  const progressFrameRef = useRef<number | null>(null);
  const focusFrameRef = useRef<number | null>(null);
  const focusLastTsRef = useRef<number | null>(null);
  const renderedTrackIdRef = useRef<string | null>(null);
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
  const progressSourceMs =
    karaoke.mode === "karaoke" && typeof karaoke.localPlaybackMs === "number" ? karaoke.localPlaybackMs : estimatedProgressMs;
  const cueAdjustedProgressMs = applyEarlyCue(progressSourceMs, DEFAULT_CUE_LEAD_MS);
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
            lastMotionAnchorRef.current.trackId === activeTrack?.trackId &&
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
  const renderedTrackOffsetPx = canRenderSyncedMotion
    ? -getFloatingRowAnchorPx(rowLayout, renderedFloatingIndex)
    : 0;
  const syncedTrackTranslateY =
    canRenderSyncedMotion
      ? `${renderedTrackOffsetPx}px`
      : "0px";
  const elapsedProgressLabel = formatElapsedProgress(progressSourceMs);

  const scrollToLiveAnchor = (behavior: ScrollBehavior) => {
    const viewportSurface = viewportSurfaceRef.current;
    if (typeof window === "undefined" || viewportSurface === null) {
      return;
    }

    const viewportHeight = viewportSurface.clientHeight > 0 ? viewportSurface.clientHeight : window.innerHeight;
    const targetScrollTop = getBoundaryLockedScrollTop({
      viewportHeight,
      rowLayout,
      floatingIndex: canRenderSyncedMotion && syncedDisplayLines.length > 0 ? floatingSyncedIndex : 0,
    });

    programmaticScrollRef.current = true;
    try {
      viewportSurface.scrollTo({ top: targetScrollTop, behavior });
    } catch {
      viewportSurface.scrollTop = targetScrollTop;
    }
    window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, behavior === "smooth" ? 350 : 80);
  };

  const syncState: LiveSyncUiState = {
    ...baseSyncState,
    playbackState: activeTrack ? (karaoke.mode === "karaoke" ? "playing" : activeTrack.isPlaying ? "playing" : "paused") : "idle",
    trackId: activeTrack?.trackId ?? null,
    activeLineIndex: resolvedLyrics?.renderMode === "synced" ? activeSyncedIndex : null,
    nextLineIndex: resolvedLyrics?.renderMode === "synced" ? nextSyncedIndex : null,
    lyricsSourceState: resolvedLyrics?.sourceState ?? "loading",
    lyricsRenderMode: resolvedLyrics?.renderMode ?? null,
    resolvedLyrics: resolvedLyrics?.lines ?? [],
    estimatedProgressMs: progressSourceMs,
    polledProgressMs: playbackSnapshot?.progressMs ?? 0,
    driftDeltaMs: progressSourceMs - (playbackSnapshot?.progressMs ?? 0),
    correctionState: karaoke.mode === "karaoke" || activeTrack ? "synced" : "static",
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
    trackTitle: activeTrack?.title,
    trackArtist: activeTrack?.artist,
    showReturnToLive: false,
  });

  useEffect(() => {
    if (playbackSnapshot === null) {
      if (karaoke.mode === "karaoke") {
        return;
      }
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
  }, [karaoke.mode, playbackSnapshot]);

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
    const trackChanged = renderedTrackIdRef.current !== activeTrack?.trackId;
    const indexJump = Math.abs(renderedFloatingIndexRef.current - floatingSyncedIndex);
    if (!canRenderSyncedMotion) {
      renderedTrackIdRef.current = activeTrack?.trackId ?? null;
      renderedFloatingIndexRef.current = floatingSyncedIndex;
      setRenderedFloatingIndex(floatingSyncedIndex);
      return;
    }

    if (trackChanged || indexJump > LIVE_INDEX_SNAP_THRESHOLD) {
      renderedTrackIdRef.current = activeTrack?.trackId ?? null;
      renderedFloatingIndexRef.current = floatingSyncedIndex;
      setRenderedFloatingIndex(floatingSyncedIndex);
      return;
    }

    renderedTrackIdRef.current = activeTrack?.trackId ?? null;
  }, [activeTrack?.trackId, canRenderSyncedMotion, floatingSyncedIndex]);

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
  }, [activeSyncedIndex, nextSyncedIndex, activeTrack?.trackId, renderedTrackOffsetPx, syncedMotionState.easedProgress]);

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
    if (!webAuth.sessionAccessToken || !activeTrack?.trackId) {
      setResolvedLyrics(null);
      return;
    }

    let active = true;
    const lrclib = createLrclibClient({ fetchFn: fetch });

    const resolve = async () => {
      try {
        const resolved = await resolveLyricsForTrack(
          {
            trackId: activeTrack.trackId,
            title: activeTrack.title,
            artist: activeTrack.artist,
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
  }, [activeTrack?.artist, activeTrack?.title, activeTrack?.trackId, webAuth.sessionAccessToken]);

  useEffect(() => {
    if (!isLiveLocked) {
      return;
    }

    scrollToLiveAnchor("auto");
  }, [activeTrack?.trackId, canRenderSyncedMotion, floatingSyncedIndex, isLiveLocked, rowLayout, syncedDisplayLines.length]);

  useEffect(() => {
    const onScroll = () => {
      const viewportSurface = viewportSurfaceRef.current;
      if (programmaticScrollRef.current || viewportSurface === null) {
        return;
      }

      if (!isLiveLocked || !userScrollIntentRef.current) {
        return;
      }

      const viewportHeight = viewportSurface.clientHeight > 0 ? viewportSurface.clientHeight : window.innerHeight;
      const liveAnchorScrollTop = getBoundaryLockedScrollTop({
        viewportHeight,
        rowLayout,
        floatingIndex: canRenderSyncedMotion && syncedDisplayLines.length > 0 ? floatingSyncedIndex : 0,
      });
      const scrollDelta = Math.abs(viewportSurface.scrollTop - liveAnchorScrollTop);
      if (scrollDelta > 20) {
        userScrollIntentRef.current = false;
        setIsLiveLocked(false);
      }
    };

    const armUserScrollIntent = () => {
      userScrollIntentRef.current = true;
    };

    const viewportSurface = viewportSurfaceRef.current;
    viewportSurface?.addEventListener("wheel", armUserScrollIntent, { passive: true });
    viewportSurface?.addEventListener("touchmove", armUserScrollIntent, { passive: true });
    viewportSurface?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      viewportSurface?.removeEventListener("wheel", armUserScrollIntent);
      viewportSurface?.removeEventListener("touchmove", armUserScrollIntent);
      viewportSurface?.removeEventListener("scroll", onScroll);
    };
  }, [canRenderSyncedMotion, floatingSyncedIndex, isLiveLocked, rowLayout, syncedDisplayLines.length]);

  return (
    <div
      data-testid="fullscreen-lyrics-layout"
      className="h-screen w-full overflow-hidden bg-black text-white overscroll-none"
    >
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
            userScrollIntentRef.current = false;
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

      <div className="fixed right-4 top-16 z-20 flex max-w-[300px] flex-col items-end gap-2 text-right sm:right-6 sm:top-20">
        <button
          type="button"
          className="rounded border border-white/25 bg-black/60 px-3 py-1 text-[11px] tracking-[0.12em] text-white/85 hover:bg-black/70"
          onMouseDown={() => {
            karaoke.primePlaybackGesture();
          }}
          onTouchStart={() => {
            karaoke.primePlaybackGesture();
          }}
          onClick={() => {
            if (karaoke.mode === "karaoke" || karaoke.mode === "switching_to_original") {
              void karaoke.exitKaraokeMode();
              return;
            }

            void karaoke.enterKaraokeMode();
          }}
          disabled={karaoke.mode === "switching_to_karaoke" || karaoke.mode === "switching_to_original"}
        >
          {karaoke.mode === "karaoke" || karaoke.mode === "switching_to_original" ? "Exit Karaoke" : "Enter Karaoke"}
        </button>
        <p className="text-[10px] text-white/60">{karaoke.message}</p>
        {karaoke.candidateMappings.length > 0 ? (
          <div className="w-full rounded border border-white/10 bg-black/40 p-2 text-left">
            <p className="pb-1 text-[9px] tracking-[0.12em] text-white/50">Top Backing Tracks</p>
            {karaoke.candidateMappings.slice(0, 3).map((candidate, index) => {
              const selected = karaoke.currentMapping?.youtubeVideoId === candidate.youtubeVideoId;
              return (
                <button
                  key={`${candidate.youtubeVideoId}-${index}`}
                  type="button"
                  className={`mb-1 block w-full truncate text-left text-[10px] ${
                    selected ? "text-white" : "text-white/75 hover:text-white"
                  }`}
                  onClick={() => {
                    void karaoke.switchToCandidate(candidate.youtubeVideoId);
                  }}
                  title={candidate.youtubeTitle}
                >
                  {selected ? "* " : ""}
                  {index + 1}. {candidate.youtubeTitle}
                </button>
              );
            })}
          </div>
        ) : null}
        {karaoke.mode === "karaoke" && karaoke.currentMapping && !karaoke.currentMapping.confirmedByUser ? (
          <button
            type="button"
            className="text-[10px] tracking-[0.1em] text-white/70 underline underline-offset-2"
            onClick={() => {
              karaoke.confirmCurrentMapping();
            }}
          >
            Confirm current backing track
          </button>
        ) : null}
        {karaoke.mode === "karaoke" && karaoke.currentMapping ? (
          <button
            type="button"
            className="text-[10px] tracking-[0.1em] text-white/70 underline underline-offset-2"
            onClick={() => {
              void karaoke.banCurrentCandidate();
            }}
          >
            Ban current candidate
          </button>
        ) : null}
        {karaoke.mode === "error" ? (
          <button
            type="button"
            className="text-[10px] tracking-[0.1em] text-white/70 underline underline-offset-2"
            onClick={() => {
              karaoke.clearError();
            }}
          >
            Clear error
          </button>
        ) : null}
        {karaoke.mode === "error" && karaoke.canResumeAutoplay ? (
          <button
            type="button"
            className="text-[10px] tracking-[0.1em] text-white/80 underline underline-offset-2"
            onClick={() => {
              void karaoke.resumeAutoplay();
            }}
          >
            Start YouTube audio
          </button>
        ) : null}
      </div>

      <div
        ref={karaoke.playerHostRef}
        data-testid="karaoke-youtube-host"
        className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
        aria-hidden="true"
      />

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
        className="mx-auto flex h-screen w-full max-w-3xl flex-col justify-start overflow-hidden px-6 text-left sm:px-8"
      >
        {lyricsPanel.sourceState === "not-found" ? (
          <p className="text-lg text-white/70">Lyrics not found</p>
        ) : lyricsPanel.status === "idle" || lyricsPanel.status === "no-track" ? (
          <p className="text-lg text-white/70">Lyrics will appear once a track is playing.</p>
        ) : (
          <div
            ref={viewportSurfaceRef}
            data-testid="fullscreen-lyrics-viewport"
            className="relative h-full overflow-x-hidden overflow-y-auto overscroll-none"
          >
            <div
              data-testid="fullscreen-lyrics-center-stage"
              className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2"
            >
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
          </div>
        )}
      </main>
    </div>
  );
}
