import { readFileSync } from "node:fs";

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ResolvedLyrics } from "@/core/lyrics/types";
import { BASE_ROW_GAP_PX, buildRowLayout, getFloatingRowAnchorPx } from "@/core/sync/lyric-motion-window";

import type { UiAuthState } from "../state/auth/auth-store";

import { FullscreenLyricsPage, getBoundaryLockedScrollTop } from "./fullscreen-lyrics-page";

type HookModel = {
  phase: "checking" | "ready" | "busy";
  statusCopy: string;
  uiState: UiAuthState;
  onConnect: () => Promise<void>;
  sessionAccessToken?: string;
};

const disconnectedState: UiAuthState = {
  status: "disconnected",
  onboardingExplainer: "Connect Spotify once to keep live lyrics synced with your current track.",
  permissionSummary: "We only read playback state and never control playback.",
};

let hookModel: HookModel = {
  phase: "checking",
  statusCopy: "Checking Spotify connection...",
  uiState: disconnectedState,
  onConnect: async () => undefined,
};

let nowPlayingResponse: {
  trackId: string;
  title: string;
  artist: string;
  progressMs: number;
  isPlaying: boolean;
} | null = null;

let cachedPlaybackSnapshot:
  | {
      trackId: string;
      deviceId: string;
      isPlaying: boolean;
      progressMs: number;
      capturedAtMs: number;
    }
  | null = null;
let cachedPlaybackSnapshotKey: string | null = null;
let originalConsoleError: typeof console.error;

let resolvedLyricsResponse: ResolvedLyrics = {
  sourceState: "not-found",
  renderMode: "plain-static",
  lines: [],
};

function getCachedPlaybackSnapshot() {
  if (nowPlayingResponse === null) {
    cachedPlaybackSnapshot = null;
    cachedPlaybackSnapshotKey = null;
    return null;
  }

  const snapshotKey = [
    nowPlayingResponse.trackId,
    nowPlayingResponse.isPlaying ? "playing" : "paused",
    nowPlayingResponse.progressMs,
  ].join(":");
  if (cachedPlaybackSnapshotKey !== snapshotKey) {
    cachedPlaybackSnapshotKey = snapshotKey;
    cachedPlaybackSnapshot = {
      trackId: nowPlayingResponse.trackId,
      deviceId: "web",
      isPlaying: nowPlayingResponse.isPlaying,
      progressMs: nowPlayingResponse.progressMs,
      capturedAtMs: Date.now(),
    };
  }

  return cachedPlaybackSnapshot;
}

vi.mock("./use-web-auth-runtime", () => ({
  useWebAuthRuntime: () => hookModel,
}));

vi.mock("./use-shared-playback", () => ({
  useSharedPlayback: () => ({
    nowPlaying: nowPlayingResponse,
    playbackSnapshot: getCachedPlaybackSnapshot(),
    pollerId: "test-poller",
    rateLimitedUntilMs: 0,
    lastUpdatedAtMs: Date.now(),
  }),
}));

vi.mock("./use-karaoke-mode", () => ({
  useKaraokeMode: () => ({
    mode: "inactive",
    message: "Karaoke inactive",
    localPlaybackMs: null,
    referenceTrack: null,
    candidateMappings: [],
    currentMapping: null,
    canResumeAutoplay: false,
    playerHostRef: { current: null },
    primePlaybackGesture: vi.fn(),
    enterKaraokeMode: vi.fn(async () => undefined),
    exitKaraokeMode: vi.fn(async () => undefined),
    switchToCandidate: vi.fn(async () => undefined),
    confirmCurrentMapping: vi.fn(),
    banCurrentCandidate: vi.fn(async () => undefined),
    clearError: vi.fn(),
    resumeAutoplay: vi.fn(async () => undefined),
  }),
}));

vi.mock("@/infra/providers/lrclib-client", () => ({
  createLrclibClient: vi.fn(() => ({})),
}));

vi.mock("@/core/lyrics/lyrics-resolver", () => ({
  resolveLyricsForTrack: vi.fn(() => resolvedLyricsResponse),
}));

describe("FullscreenLyricsPage", () => {
  beforeEach(() => {
    originalConsoleError = console.error;
    console.error = (...args: Parameters<typeof console.error>) => {
      if (String(args[0]).includes("not wrapped in act")) {
        return;
      }
      originalConsoleError(...args);
    };
    hookModel = {
      phase: "checking",
      statusCopy: "Checking Spotify connection...",
      uiState: disconnectedState,
      onConnect: async () => undefined,
    };
    nowPlayingResponse = null;
    cachedPlaybackSnapshot = null;
    cachedPlaybackSnapshotKey = null;
    resolvedLyricsResponse = {
      sourceState: "not-found",
      renderMode: "plain-static",
      lines: [],
    };
  });

  afterEach(() => {
    cleanup();
    console.error = originalConsoleError;
  });

  function stubViewportGeometry(input: {
    viewportHeight: number;
    activeIndex: number;
    rowHeights: number[];
    rowHeight?: number;
  }) {
    const viewport = screen.getByTestId("fullscreen-lyrics-viewport");
    const rows = screen.getAllByText((_, element) => element?.tagName.toLowerCase() === "p");
    const lyricRows = rows.filter((row) => row.textContent?.startsWith("Line ") ?? false);
    const rowHeight = input.rowHeight ?? 72;
    const normalizedHeights = input.rowHeights.length > 0 ? input.rowHeights : lyricRows.map(() => rowHeight);
    const rowLayout = buildRowLayout(normalizedHeights, BASE_ROW_GAP_PX);
    const scrollTop = getBoundaryLockedScrollTop({
      viewportHeight: input.viewportHeight,
      rowLayout,
      floatingIndex: input.activeIndex,
    });

    Object.defineProperty(viewport, "clientHeight", {
      configurable: true,
      value: input.viewportHeight,
    });
    Object.defineProperty(viewport, "scrollTop", {
      configurable: true,
      writable: true,
      value: scrollTop,
    });
    Object.defineProperty(viewport, "getBoundingClientRect", {
      configurable: true,
      value: () =>
        ({
          top: 0,
          bottom: input.viewportHeight,
          height: input.viewportHeight,
        }) satisfies Partial<DOMRect>,
    });

    lyricRows.forEach((row, index) => {
      const height = normalizedHeights[index] ?? rowHeight;
    Object.defineProperty(row, "getBoundingClientRect", {
      configurable: true,
      value: () =>
          ({
            top:
              input.viewportHeight / 2 -
              getFloatingRowAnchorPx(rowLayout, input.activeIndex) +
              (rowLayout.offsets[index] ?? 0) -
              viewport.scrollTop,
            bottom:
              input.viewportHeight / 2 -
              getFloatingRowAnchorPx(rowLayout, input.activeIndex) +
              (rowLayout.offsets[index] ?? 0) -
              viewport.scrollTop +
              height,
            height,
          }) satisfies Partial<DOMRect>,
      });
    });

    return {
      viewport,
      lyricRows,
      rowLayout,
      scrollTop,
    };
  }

  function installViewportScrollToStub() {
    const originalScrollTo = HTMLDivElement.prototype.scrollTo;
    const scrollToMock = vi.fn(function scrollTo(
      this: HTMLDivElement,
      optionsOrX?: ScrollToOptions | number,
      y?: number,
    ) {
      const top =
        typeof optionsOrX === "number"
          ? y ?? 0
          : typeof optionsOrX?.top === "number"
            ? optionsOrX.top
            : 0;
      this.scrollTop = top;
      fireEvent.scroll(this);
    });

    Object.defineProperty(HTMLDivElement.prototype, "scrollTo", {
      configurable: true,
      writable: true,
      value: scrollToMock,
    });

    return {
      scrollToMock,
      restore: () => {
        Object.defineProperty(HTMLDivElement.prototype, "scrollTo", {
          configurable: true,
          writable: true,
          value: originalScrollTo,
        });
      },
    };
  }

  function installAnimationFrameStub() {
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    let nextFrameId = 1;

    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      writable: true,
      value: vi.fn(() => nextFrameId++),
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    return {
      restore: () => {
        Object.defineProperty(window, "requestAnimationFrame", {
          configurable: true,
          writable: true,
          value: originalRequestAnimationFrame,
        });
        Object.defineProperty(window, "cancelAnimationFrame", {
          configurable: true,
          writable: true,
          value: originalCancelAnimationFrame,
        });
      },
    };
  }

  async function waitForProgrammaticScrollWindowToSettle() {
    await flushFullscreenEffects();
    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 120);
      });
    });
    await flushFullscreenEffects();
  }

  async function flushFullscreenEffects() {
    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 0);
      });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it("renders fullscreen layout and column markers", () => {
    render(<FullscreenLyricsPage />);

    expect(screen.getByTestId("fullscreen-lyrics-layout")).toBeTruthy();
    expect(screen.getByTestId("fullscreen-lyrics-column")).toBeTruthy();
  });

  it("omits shell chrome markers and labels", () => {
    render(<FullscreenLyricsPage />);

    expect(screen.queryByTestId("shell-layout")).toBeNull();
    expect(screen.queryByText("Connection")).toBeNull();
    expect(screen.queryByText("Connect Spotify")).toBeNull();
    expect(screen.queryByText("Liryk")).toBeNull();
  });

  it("shows a visible control to exit fullscreen lyrics while keeping shell layout hidden", () => {
    render(<FullscreenLyricsPage />);

    const exitFullscreenLink = screen.getByRole("link", { name: "Exit Fullscreen Lyrics" });
    expect(exitFullscreenLink).toBeTruthy();
    expect(exitFullscreenLink.getAttribute("href")).toBe("/");
    expect(screen.queryByTestId("shell-layout")).toBeNull();
  });

  it("keeps fullscreen wrapper and column class contracts", () => {
    render(<FullscreenLyricsPage />);

    const layout = screen.getByTestId("fullscreen-lyrics-layout");
    expect(layout.className).toContain("h-screen");
    expect(layout.className).toContain("w-full");
    expect(layout.className).toContain("overflow-hidden");
    expect(layout.className).toContain("bg-black");
    expect(layout.className).toContain("text-white");
    expect(layout.className).not.toContain("bg-card");
    expect(layout.className).not.toContain("ring-border");
    expect(layout.className).not.toContain("border");

    const column = screen.getByTestId("fullscreen-lyrics-column");
    expect(column.className).toContain("mx-auto");
    expect(column.className).toContain("h-screen");
    expect(column.className).toContain("max-w-3xl");
    expect(column.className).toContain("overflow-hidden");
    expect(column.className).toContain("text-left");
    expect(column.className).toContain("justify-start");
    expect(column.className).not.toContain("bg-card");
    expect(column.className).not.toContain("ring-border");
    expect(column.className).not.toContain("border");
  });

  it("renders fullscreen lyrics inside a viewport-owned stage", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    nowPlayingResponse = {
      trackId: "track-viewport-stage",
      title: "Viewport Stage",
      artist: "Stage Artist",
      progressMs: 4_500,
      isPlaying: true,
    };

    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 2_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 4_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      const viewport = screen.getByTestId("fullscreen-lyrics-viewport");
      const stage = screen.getByTestId("fullscreen-lyrics-center-stage");
      expect(viewport.className).toContain("h-full");
      expect(viewport.className).toContain("overflow-hidden");
      expect(stage.className).toContain("absolute");
      expect(stage.className).toContain("top-1/2");
      expect(stage.className).not.toContain("-translate-y-1/2");
    });
  });

  it("keeps the first synced lyric in viewport after track start", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };
    nowPlayingResponse = {
      trackId: "track-start-boundary",
      title: "Start Boundary",
      artist: "Viewport Artist",
      progressMs: 100,
      isPlaying: true,
    };
    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 4_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 8_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      expect(screen.getByText("Line 1")).toBeTruthy();
    });

    const { lyricRows } = stubViewportGeometry({
      viewportHeight: 300,
      activeIndex: 0,
      rowHeights: [72, 72, 72],
    });
    const activeBounds = lyricRows[0]?.getBoundingClientRect();
    expect(activeBounds?.top ?? -1).toBeGreaterThanOrEqual(0);
    expect(activeBounds?.bottom ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(300);
    expect(((activeBounds?.top ?? 0) + (activeBounds?.bottom ?? 0)) / 2).toBe(150);
  });

  it("keeps the first synced lyric in viewport after track transition", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };
    nowPlayingResponse = {
      trackId: "track-transition-boundary",
      title: "Transition Boundary",
      artist: "Viewport Artist",
      progressMs: 250,
      isPlaying: true,
    };
    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 3_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 6_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
      ],
    };

    const { rerender } = render(<FullscreenLyricsPage />);

    await waitFor(() => {
      expect(screen.getByText("Line 1")).toBeTruthy();
    });

    nowPlayingResponse = {
      trackId: "track-transition-boundary-next",
      title: "Transition Boundary Next",
      artist: "Viewport Artist",
      progressMs: 120,
      isPlaying: true,
    };
    rerender(<FullscreenLyricsPage />);

    await waitFor(() => {
      expect(screen.getByText("Line 1")).toBeTruthy();
    });

    const { lyricRows } = stubViewportGeometry({
      viewportHeight: 300,
      activeIndex: 0,
      rowHeights: [72, 72, 72],
    });
    const activeBounds = lyricRows[0]?.getBoundingClientRect();
    expect(activeBounds?.top ?? -1).toBeGreaterThanOrEqual(0);
    expect(activeBounds?.bottom ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(300);
  });

  it("snaps the rendered lyric position to the current line on mid-song fullscreen entry", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };
    nowPlayingResponse = {
      trackId: "track-mid-song-entry",
      title: "Mid Song Entry",
      artist: "Viewport Artist",
      progressMs: 10_100,
      isPlaying: true,
    };
    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: Array.from({ length: 10 }, (_, index) => ({
        startMs: index * 2_000,
        text: `Line ${index + 1}`,
        renderMode: "synced" as const,
        isTimestamped: true,
      })),
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      expect(screen.getByText("Line 6")).toBeTruthy();
    });

    const rowLayout = buildRowLayout(Array.from({ length: 10 }, () => 72), BASE_ROW_GAP_PX);
    const expectedTransform = `translateY(${-getFloatingRowAnchorPx(rowLayout, 5)}px)`;

    await waitFor(() => {
      expect(screen.getByTestId("fullscreen-lyrics-track").getAttribute("style")).toContain(expectedTransform);
    });
  });

  it("keeps the last synced lyric in viewport near song end", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };
    nowPlayingResponse = {
      trackId: "track-end-boundary",
      title: "End Boundary",
      artist: "Viewport Artist",
      progressMs: 8_600,
      isPlaying: true,
    };
    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 4_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 8_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      expect(screen.getByText("Line 3")).toBeTruthy();
    });

    const { lyricRows } = stubViewportGeometry({
      viewportHeight: 300,
      activeIndex: 2,
      rowHeights: [72, 72, 72],
    });
    const activeBounds = lyricRows[2]?.getBoundingClientRect();
    expect(activeBounds?.top ?? -1).toBeGreaterThanOrEqual(0);
    expect(activeBounds?.bottom ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(300);
    expect(((activeBounds?.top ?? 0) + (activeBounds?.bottom ?? 0)) / 2).toBe(150);
  });

  it("keeps the last synced lyric in viewport during final handoff", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };
    nowPlayingResponse = {
      trackId: "track-final-handoff",
      title: "Final Handoff",
      artist: "Viewport Artist",
      progressMs: 12_400,
      isPlaying: true,
    };
    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 4_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 8_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      expect(screen.getByText("Line 3")).toBeTruthy();
    });

    const { lyricRows } = stubViewportGeometry({
      viewportHeight: 300,
      activeIndex: 2,
      rowHeights: [72, 72, 72],
    });
    const activeBounds = lyricRows[2]?.getBoundingClientRect();
    expect(activeBounds?.top ?? -1).toBeGreaterThanOrEqual(0);
    expect(activeBounds?.bottom ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(300);
  });

  it("keeps live lock enabled during programmatic recentering and hides fullscreen-return-live", async () => {
    const { scrollToMock, restore: restoreScrollTo } = installViewportScrollToStub();
    const { restore: restoreAnimationFrame } = installAnimationFrameStub();
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };
    nowPlayingResponse = {
      trackId: "track-programmatic-recenter",
      title: "Programmatic Recenter",
      artist: "Viewport Artist",
      progressMs: 4_200,
      isPlaying: true,
    };
    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 2_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 4_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
        { startMs: 6_000, text: "Line 4", renderMode: "synced", isTimestamped: true },
      ],
    };

    try {
      const { rerender } = render(<FullscreenLyricsPage />);
      await flushFullscreenEffects();

      expect(await screen.findByText("Line 3")).toBeTruthy();

      await waitForProgrammaticScrollWindowToSettle();
      const { viewport } = stubViewportGeometry({
        viewportHeight: 320,
        activeIndex: 2,
        rowHeights: [72, 72, 72, 72],
      });

      nowPlayingResponse = {
        trackId: "track-programmatic-recenter-next",
        title: "Programmatic Recenter Next",
        artist: "Viewport Artist",
        progressMs: 150,
        isPlaying: true,
      };
      await act(async () => {
        rerender(<FullscreenLyricsPage />);
      });
      await flushFullscreenEffects();
      await waitForProgrammaticScrollWindowToSettle();

      await waitFor(() => {
        expect(scrollToMock).toHaveBeenCalled();
      });
      await waitForProgrammaticScrollWindowToSettle();

      expect(viewport.scrollTop).toBe(0);
      expect(screen.queryByTestId("fullscreen-return-live")).toBeNull();
    } finally {
      restoreAnimationFrame();
      restoreScrollTo();
    }
  });

  it("disables live lock only after explicit user scroll intent", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };
    nowPlayingResponse = {
      trackId: "track-manual-intent",
      title: "Manual Intent",
      artist: "Viewport Artist",
      progressMs: 4_200,
      isPlaying: true,
    };
    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 2_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 4_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
        { startMs: 6_000, text: "Line 4", renderMode: "synced", isTimestamped: true },
        { startMs: 8_000, text: "Line 5", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      expect(screen.getByText("Line 3")).toBeTruthy();
    });

    const { viewport } = stubViewportGeometry({
      viewportHeight: 320,
      activeIndex: 2,
      rowHeights: [72, 72, 72, 72, 72],
    });

    expect(screen.queryByTestId("fullscreen-return-live")).toBeNull();

    await waitForProgrammaticScrollWindowToSettle();
    await act(async () => {
      fireEvent.wheel(viewport, { deltaY: 120 });
      viewport.scrollTop = 128;
      fireEvent.scroll(viewport);
    });

    await waitFor(() => {
      expect(screen.getByTestId("fullscreen-return-live")).toBeTruthy();
    });
  });

  it("Back to Live restores the boundary-aware live anchor", async () => {
    const { scrollToMock, restore: restoreScrollTo } = installViewportScrollToStub();
    const { restore: restoreAnimationFrame } = installAnimationFrameStub();
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };
    nowPlayingResponse = {
      trackId: "track-back-to-live",
      title: "Back to Live",
      artist: "Viewport Artist",
      progressMs: 4_200,
      isPlaying: true,
    };
    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 2_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 4_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
        { startMs: 6_000, text: "Line 4", renderMode: "synced", isTimestamped: true },
        { startMs: 8_000, text: "Line 5", renderMode: "synced", isTimestamped: true },
      ],
    };

    try {
      render(<FullscreenLyricsPage />);
      await flushFullscreenEffects();

      expect(await screen.findByText("Line 3")).toBeTruthy();

      const { viewport, lyricRows, rowLayout } = stubViewportGeometry({
        viewportHeight: 320,
        activeIndex: 2,
        rowHeights: [72, 72, 72, 72, 72],
      });
      const expectedScrollTop = getBoundaryLockedScrollTop({
        viewportHeight: 320,
        rowLayout,
        floatingIndex: 2,
      });

      await waitForProgrammaticScrollWindowToSettle();
      await act(async () => {
        fireEvent.wheel(viewport, { deltaY: 120 });
        viewport.scrollTop = expectedScrollTop + 132;
        fireEvent.scroll(viewport);
      });

      const backToLive = await screen.findByTestId("fullscreen-return-live");
      await act(async () => {
        fireEvent.click(backToLive);
      });
      await flushFullscreenEffects();
      await waitForProgrammaticScrollWindowToSettle();

      await waitFor(() => {
        expect(scrollToMock).toHaveBeenCalledWith({ top: expectedScrollTop, behavior: "auto" });
        expect(screen.queryByTestId("fullscreen-return-live")).toBeNull();
      });

      expect(viewport.scrollTop).toBe(expectedScrollTop);
      const activeBounds = lyricRows[2]?.getBoundingClientRect();
      expect(activeBounds?.top ?? -1).toBeGreaterThanOrEqual(0);
      expect(activeBounds?.bottom ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(320);
    } finally {
      restoreAnimationFrame();
      restoreScrollTo();
    }
  });

  it("renders active near and distant lyric hierarchy tiers", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    nowPlayingResponse = {
      trackId: "track-hierarchy",
      title: "Hierarchy Track",
      artist: "Hierarchy Artist",
      progressMs: 5_000,
      isPlaying: true,
    };

    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 2_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 4_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
        { startMs: 6_000, text: "Line 4", renderMode: "synced", isTimestamped: true },
        { startMs: 8_000, text: "Line 5", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      const activeLines = screen.queryAllByTestId("fullscreen-lyric-line-active");
      const nearLines = screen.queryAllByTestId("fullscreen-lyric-line-near");
      const distantLines = screen.queryAllByTestId("fullscreen-lyric-line-distant");

      expect(activeLines.length).toBe(1);
      expect(nearLines.length).toBeGreaterThanOrEqual(2);
      expect(distantLines.length).toBeGreaterThanOrEqual(2);
      expect(activeLines[0]?.className).toContain("text-4xl");
      expect(activeLines[0]?.className).toContain("sm:text-5xl");
      expect(Number.parseFloat(activeLines[0]?.style.opacity ?? "0")).toBeGreaterThan(0.95);
      expect(nearLines.every((line) => Number.parseFloat(line.style.opacity) < 1)).toBe(true);
      expect(distantLines.every((line) => Number.parseFloat(line.style.opacity) <= 0.5)).toBe(true);
    });
  });

  it("does not highlight active lyric before first synced timestamp", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    nowPlayingResponse = {
      trackId: "track-before-first-line",
      title: "Intro Track",
      artist: "Intro Artist",
      progressMs: 2_000,
      isPlaying: true,
    };

    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 10_000, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 12_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 14_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      expect(screen.queryAllByTestId("fullscreen-lyric-line-active").length).toBe(0);
      expect(screen.queryAllByTestId("fullscreen-lyric-line-near").length).toBe(1);
      const track = screen.getByTestId("fullscreen-lyrics-track");
      expect(track.style.transform).toContain("translateY(0");
    });
  });

  it("applies conservative early cue lead near synced line boundaries", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    nowPlayingResponse = {
      trackId: "track-cue-boundary",
      title: "Cue Boundary Track",
      artist: "Cue Artist",
      progressMs: 1_885,
      isPlaying: true,
    };

    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 2_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 4_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      const activeLines = screen.queryAllByTestId("fullscreen-lyric-line-active");
      expect(activeLines.length).toBe(1);
      expect(activeLines[0]?.textContent).toBe("Line 2");
      expect(screen.queryAllByTestId("fullscreen-lyric-line-near").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("applies center-anchor track transform and motion transition contracts", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    nowPlayingResponse = {
      trackId: "track-motion",
      title: "Motion Track",
      artist: "Motion Artist",
      progressMs: 9_000,
      isPlaying: true,
    };

    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 2_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 4_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
        { startMs: 6_000, text: "Line 4", renderMode: "synced", isTimestamped: true },
        { startMs: 8_000, text: "Line 5", renderMode: "synced", isTimestamped: true },
        { startMs: 10_000, text: "Line 6", renderMode: "synced", isTimestamped: true },
        { startMs: 12_000, text: "Line 7", renderMode: "synced", isTimestamped: true },
        { startMs: 14_000, text: "Line 8", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      const track = screen.getByTestId("fullscreen-lyrics-track");
      const activeLines = screen.queryAllByTestId("fullscreen-lyric-line-active");
      const nearLines = screen.queryAllByTestId("fullscreen-lyric-line-near");
      const distantLines = screen.queryAllByTestId("fullscreen-lyric-line-distant");
      const renderedLines = [...activeLines, ...nearLines, ...distantLines];

      expect(track.style.transform).toContain("translateY(");
      expect(activeLines.length).toBe(1);
      expect(renderedLines.length).toBeGreaterThan(0);
      expect(
        renderedLines.every((line) => line.className.includes("transition-[filter,opacity,color]")),
      ).toBe(true);
      expect(renderedLines.every((line) => line.className.includes("duration-[180ms]"))).toBe(true);
      expect(renderedLines.every((line) => line.className.includes("ease-linear"))).toBe(true);
      expect(renderedLines.every((line) => line.className.includes("motion-reduce:transition-none"))).toBe(true);
    });
  });

  it("keeps hold offset stable before transition window", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 4_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 9_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
      ],
    };

    nowPlayingResponse = {
      trackId: "track-hold-window",
      title: "Hold Window Track",
      artist: "Window Artist",
      progressMs: 8_000,
      isPlaying: true,
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      const track = screen.getByTestId("fullscreen-lyrics-track");
      const value = Number.parseFloat(track.style.transform.replace("translateY(", "").replace("px)", ""));
      expect(value).toBeLessThan(0);
      expect(value).toBeGreaterThan(-220);
    });

  });

  it("interpolates translateY inside the transition window", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    nowPlayingResponse = {
      trackId: "track-transition-window",
      title: "Transition Track",
      artist: "Window Artist",
      progressMs: 8_700,
      isPlaying: true,
    };

    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 4_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 9_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      const track = screen.getByTestId("fullscreen-lyrics-track");
      const value = Number.parseFloat(track.style.transform.replace("translateY(", "").replace("px)", ""));
      expect(value).toBeLessThan(0);
      expect(value).toBeGreaterThan(-320);
    });
  });

  it("lands on next line offset at and after complete boundary", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    nowPlayingResponse = {
      trackId: "track-complete-window",
      title: "Complete Window Track",
      artist: "Window Artist",
      progressMs: 8_880,
      isPlaying: true,
    };

    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 4_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 9_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      const track = screen.getByTestId("fullscreen-lyrics-track");
      const value = Number.parseFloat(track.style.transform.replace("translateY(", "").replace("px)", ""));
      expect(value).toBeLessThan(0);
      expect(value).toBeGreaterThan(-360);
    });
  });

  it("uses exported motion-window defaults instead of inline transition literals", () => {
    const source = readFileSync("src/web/fullscreen-lyrics-page.tsx", "utf8");
    expect(source.includes("DEFAULT_MIN_TRANSITION_MS")).toBe(true);
    expect(source.includes("DEFAULT_MAX_TRANSITION_MS")).toBe(true);
    expect(source.includes("DEFAULT_TRANSITION_WINDOW_FRACTION")).toBe(true);
  });

  it("routes synced track translateY through measured row layout anchors", () => {
    const source = readFileSync("src/web/fullscreen-lyrics-page.tsx", "utf8");
    expect(source.includes("buildRowLayout")).toBe(true);
    expect(source.includes("getFloatingRowAnchorPx")).toBe(true);
  });

  it("removes document scroll anchoring from live mode", () => {
    const source = readFileSync("src/web/fullscreen-lyrics-page.tsx", "utf8");
    expect(source.includes("window.scrollY + liveAnchor.getBoundingClientRect().top")).toBe(false);
    expect(source.includes("window.addEventListener(\"scroll\"")).toBe(false);
    expect(source.includes("paddingTop: syncedVerticalPadding")).toBe(false);
    expect(source.includes("viewportSurface.scrollTo({ top: 0, behavior })")).toBe(false);
    expect(source.includes("getBoundaryLockedScrollTop")).toBe(true);
    expect(source.includes("viewportSurfaceRef.current")).toBe(true);
  });

  it("anchors active-tier handoff to animated offset continuity", () => {
    const source = readFileSync("src/web/fullscreen-lyrics-page.tsx", "utf8");
    expect(source.includes("getFloatingIndex")).toBe(true);
    expect(source.includes("getLineFocusMetrics(index, renderedFloatingIndex)")).toBe(true);
    expect(source.includes("Math.round(Math.abs")).toBe(false);
  });

  it("gates offset animation to valid transition phase only", () => {
    const source = readFileSync("src/web/fullscreen-lyrics-page.tsx", "utf8");
    expect(source.includes("transition.phase !== \"transition\" || nextSyncedIndex <= activeSyncedIndex")).toBe(true);
    expect(source.includes("setDisplayTrackOffsetPx")).toBe(false);
  });

  it("avoids overlap-prone per-line transform classes during track motion", () => {
    const source = readFileSync("src/web/fullscreen-lyrics-page.tsx", "utf8");
    expect(source.includes("scale-[")).toBe(false);
    expect(source.includes("scale-95")).toBe(false);
    expect(source.includes("transition-[transform,opacity,color]")).toBe(false);
  });

  it("keeps short-gap transitions readable with hold-first then clamped transition", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    nowPlayingResponse = {
      trackId: "track-short-gap",
      title: "Short Gap Track",
      artist: "Clamp Artist",
      progressMs: 0,
      isPlaying: true,
    };

    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 300, text: "Line 2", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      const track = screen.getByTestId("fullscreen-lyrics-track");
      const value = Number.parseFloat(track.style.transform.replace("translateY(", "").replace("px)", ""));
      expect(value).toBeLessThan(0);
      expect(value).toBeGreaterThan(-220);
    });
  });

  it("keeps long-gap transitions on hold until clamped transition window", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    nowPlayingResponse = {
      trackId: "track-long-gap",
      title: "Long Gap Track",
      artist: "Clamp Artist",
      progressMs: 1_000,
      isPlaying: true,
    };

    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 10_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      const track = screen.getByTestId("fullscreen-lyrics-track");
      expect(track.style.transform).toContain("translateY(0");
    });
  });

  it("keeps representative short and medium-gap interpolation within adjacent line bounds", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    nowPlayingResponse = {
      trackId: "track-short-gap-bounds",
      title: "Short Gap Bounds Track",
      artist: "Bounds Artist",
      progressMs: 0,
      isPlaying: true,
    };

    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 300, text: "Line 2", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      const track = screen.getByTestId("fullscreen-lyrics-track");
      const value = Number.parseFloat(track.style.transform.replace("translateY(", "").replace("px)", ""));
      expect(value).toBeLessThan(0);
      expect(value).toBeGreaterThan(-220);
    });

    cleanup();
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };
    nowPlayingResponse = {
      trackId: "track-medium-gap-bounds",
      title: "Medium Gap Bounds Track",
      artist: "Bounds Artist",
      progressMs: 8_700,
      isPlaying: true,
    };
    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 4_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 9_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      const track = screen.getByTestId("fullscreen-lyrics-track");
      const value = Number.parseFloat(track.style.transform.replace("translateY(", "").replace("px)", ""));
      expect(value).toBeLessThan(0);
      expect(value).toBeGreaterThan(-320);
    });
  });

  it("renders subdued metadata overlays and stable track transition cadence", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    nowPlayingResponse = {
      trackId: "track-overlay",
      title: "Overlay Track",
      artist: "Overlay Artist",
      progressMs: 78_000,
      isPlaying: true,
    };

    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 2_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 4_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
        { startMs: 6_000, text: "Line 4", renderMode: "synced", isTimestamped: true },
        { startMs: 8_000, text: "Line 5", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      const metadataOverlay = screen.getByTestId("fullscreen-meta-overlay");
      const progressOverlay = screen.getByTestId("fullscreen-progress-overlay");
      const track = screen.getByTestId("fullscreen-lyrics-track");

      expect(metadataOverlay.className).toContain("fixed");
      expect(metadataOverlay.className).toContain("right-4");
      expect(metadataOverlay.className).toContain("top-3");
      expect(metadataOverlay.className).toContain("text-[10px]");
      expect(metadataOverlay.className).toContain("text-white/32");
      expect(progressOverlay.className).toContain("text-[9px]");
      expect(progressOverlay.className).toContain("text-white/25");

      expect(metadataOverlay.className).not.toContain("text-4xl");
      expect(metadataOverlay.className).not.toContain("sm:text-5xl");
      expect(metadataOverlay.className).not.toContain("font-semibold");
      expect(progressOverlay.className).not.toContain("text-4xl");
      expect(progressOverlay.className).not.toContain("sm:text-5xl");
      expect(progressOverlay.className).not.toContain("font-semibold");

      expect(track.className).not.toContain("transition-transform");
      expect(track.className).not.toContain("duration-700");
    });
  });

  it("keeps fullscreen lyric-first invariants without utility controls", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    nowPlayingResponse = {
      trackId: "track-regression",
      title: "Regression Track",
      artist: "Regression Artist",
      progressMs: 4_500,
      isPlaying: true,
    };

    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 2_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 4_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
        { startMs: 6_000, text: "Line 4", renderMode: "synced", isTimestamped: true },
        { startMs: 8_000, text: "Line 5", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      expect(screen.queryAllByRole("button").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByRole("button", { name: "Enter Karaoke" })).toBeTruthy();
      expect(screen.queryAllByTestId("fullscreen-lyric-line-active").length).toBe(1);

      const layout = screen.getByTestId("fullscreen-lyrics-layout");
      expect(layout.className).toContain("bg-black");
      expect(layout.className).toContain("text-white");
    });
  });

  it("toggles diagnostics overlay without affecting synced lyric rendering", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    nowPlayingResponse = {
      trackId: "track-diagnostics",
      title: "Diagnostics Track",
      artist: "Diagnostics Artist",
      progressMs: 4_500,
      isPlaying: true,
    };

    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 2_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
        { startMs: 4_000, text: "Line 3", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    const toggle = await screen.findByRole("button", { name: "Show Diagnostics" });
    expect(screen.queryByTestId("fullscreen-diagnostics-overlay")).toBeNull();

    fireEvent.click(toggle);
    expect(screen.getByTestId("fullscreen-diagnostics-overlay")).toBeTruthy();
    expect(screen.queryAllByTestId("fullscreen-lyric-line-active").length).toBe(1);

    fireEvent.click(toggle);
    expect(screen.queryByTestId("fullscreen-diagnostics-overlay")).toBeNull();
  });

  it("renders required diagnostics labels and values from live sync state", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    nowPlayingResponse = {
      trackId: "track-diagnostics-values",
      title: "Diagnostics Values",
      artist: "Diagnostics Artist",
      progressMs: 4_500,
      isPlaying: true,
    };

    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 2_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Show Diagnostics" }));
    const overlay = screen.getByTestId("fullscreen-diagnostics-overlay");
    expect(overlay).toBeTruthy();
    expect(screen.getByText(/Estimated ms:/)).toBeTruthy();
    expect(screen.getByText(/Polled ms:/)).toBeTruthy();
    expect(screen.getByText(/Drift delta ms:/)).toBeTruthy();
    expect(screen.getByText(/Correction state:/)).toBeTruthy();
    const estimatedMs = Number(screen.getByTestId("diagnostics-estimated-ms").textContent ?? "0");
    expect(estimatedMs).toBeGreaterThanOrEqual(4500);
    expect(estimatedMs).toBeLessThanOrEqual(4550);
    expect(screen.getByTestId("diagnostics-polled-ms").textContent).toContain("4500");
    const driftMs = Number(screen.getByTestId("diagnostics-drift-delta-ms").textContent ?? "0");
    expect(driftMs).toBeGreaterThanOrEqual(0);
    expect(driftMs).toBeLessThanOrEqual(50);
    expect(screen.getByTestId("diagnostics-correction-state").textContent).toContain("synced");
  });

  it("shows safe idle diagnostics values when no playback snapshot exists", async () => {
    render(<FullscreenLyricsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Show Diagnostics" }));
    expect(screen.getByTestId("diagnostics-estimated-ms").textContent).toContain("0");
    expect(screen.getByTestId("diagnostics-polled-ms").textContent).toContain("0");
    expect(screen.getByTestId("diagnostics-drift-delta-ms").textContent).toContain("0");
    expect(screen.getByTestId("diagnostics-correction-state").textContent).toContain("static");
  });

  it("keeps diagnostics overlay readable for idle paused and playing states", async () => {
    render(<FullscreenLyricsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Show Diagnostics" }));
    expect(screen.getByTestId("diagnostics-correction-state").textContent).toContain("static");

    cleanup();
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };
    nowPlayingResponse = {
      trackId: "track-paused-diagnostics",
      title: "Paused Diagnostics",
      artist: "Diagnostics Artist",
      progressMs: 3_210,
      isPlaying: false,
    };
    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "Line 1", renderMode: "synced", isTimestamped: true },
        { startMs: 2_000, text: "Line 2", renderMode: "synced", isTimestamped: true },
      ],
    };
    render(<FullscreenLyricsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Show Diagnostics" }));
    expect(screen.getByTestId("diagnostics-estimated-ms").textContent).toContain("3210");
    expect(screen.getByTestId("diagnostics-polled-ms").textContent).toContain("3210");
    expect(screen.getByTestId("diagnostics-correction-state").textContent).toContain("synced");

    cleanup();
    nowPlayingResponse = {
      trackId: "track-playing-diagnostics",
      title: "Playing Diagnostics",
      artist: "Diagnostics Artist",
      progressMs: 6_543,
      isPlaying: true,
    };
    render(<FullscreenLyricsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Show Diagnostics" }));
    const playingEstimatedMs = Number(screen.getByTestId("diagnostics-estimated-ms").textContent ?? "0");
    expect(playingEstimatedMs).toBeGreaterThanOrEqual(6543);
    expect(playingEstimatedMs).toBeLessThanOrEqual(6593);
    expect(screen.getByTestId("diagnostics-polled-ms").textContent).toContain("6543");
    expect(screen.getByTestId("diagnostics-correction-state").textContent).toContain("synced");
  });

  it("renders simplified chinese lines while preserving mixed non-chinese content", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - waiting for playback",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - waiting for playback",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    nowPlayingResponse = {
      trackId: "track-zh",
      title: "Track ZH",
      artist: "Artist ZH",
      progressMs: 1_500,
      isPlaying: true,
    };

    resolvedLyricsResponse = {
      sourceState: "synced",
      renderMode: "synced",
      lines: [
        { startMs: 0, text: "愛在臺北", renderMode: "synced", isTimestamped: true },
        { startMs: 2_000, text: "歡迎光臨 ABC 2026!", renderMode: "synced", isTimestamped: true },
      ],
    };

    render(<FullscreenLyricsPage />);

    await waitFor(() => {
      expect(screen.getByText("爱在台北")).toBeTruthy();
      expect(screen.getByText("欢迎光临 ABC 2026!")).toBeTruthy();
    });

    expect(screen.queryByText("愛在臺北")).toBeNull();
    expect(screen.queryByText("歡迎光臨 ABC 2026!")).toBeNull();
  });
});
