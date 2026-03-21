import { readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ResolvedLyrics } from "@/core/lyrics/types";

import type { UiAuthState } from "../state/auth/auth-store";

import { FullscreenLyricsPage } from "./fullscreen-lyrics-page";

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

let resolvedLyricsResponse: ResolvedLyrics = {
  sourceState: "not-found",
  renderMode: "plain-static",
  lines: [],
};

vi.mock("./use-web-auth-runtime", () => ({
  useWebAuthRuntime: () => hookModel,
}));

vi.mock("./auth/now-playing", () => ({
  fetchWebNowPlaying: vi.fn(async () => nowPlayingResponse),
}));

vi.mock("@/infra/providers/lrclib-client", () => ({
  createLrclibClient: vi.fn(() => ({})),
}));

vi.mock("@/core/lyrics/lyrics-resolver", () => ({
  resolveLyricsForTrack: vi.fn(async () => resolvedLyricsResponse),
}));

describe("FullscreenLyricsPage", () => {
  beforeEach(() => {
    hookModel = {
      phase: "checking",
      statusCopy: "Checking Spotify connection...",
      uiState: disconnectedState,
      onConnect: async () => undefined,
    };
    nowPlayingResponse = null;
    resolvedLyricsResponse = {
      sourceState: "not-found",
      renderMode: "plain-static",
      lines: [],
    };
  });

  afterEach(() => {
    cleanup();
  });

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
    expect(layout.className).toContain("min-h-screen");
    expect(layout.className).toContain("w-full");
    expect(layout.className).toContain("bg-black");
    expect(layout.className).toContain("text-white");
    expect(layout.className).not.toContain("bg-card");
    expect(layout.className).not.toContain("ring-border");
    expect(layout.className).not.toContain("border");

    const column = screen.getByTestId("fullscreen-lyrics-column");
    expect(column.className).toContain("mx-auto");
    expect(column.className).toContain("max-w-3xl");
    expect(column.className).toContain("text-left");
    expect(column.className).toContain("justify-start");
    expect(column.className).not.toContain("bg-card");
    expect(column.className).not.toContain("ring-border");
    expect(column.className).not.toContain("border");
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
      expect(activeLines[0]?.className).toContain("text-white");
      expect(activeLines[0]?.className).toContain("font-semibold");
      expect(activeLines[0]?.className).toContain("text-4xl");
      expect(activeLines[0]?.className).toContain("sm:text-5xl");
      expect(nearLines.every((line) => line.className.includes("text-zinc-300"))).toBe(true);
      expect(nearLines.every((line) => line.className.includes("font-medium"))).toBe(true);
      expect(nearLines.every((line) => line.className.includes("text-3xl"))).toBe(true);
      expect(nearLines.every((line) => line.className.includes("sm:text-4xl"))).toBe(true);
      expect(distantLines.every((line) => line.className.includes("text-zinc-500"))).toBe(true);
      expect(distantLines.every((line) => line.className.includes("font-normal"))).toBe(true);
      expect(distantLines.every((line) => line.className.includes("text-2xl"))).toBe(true);
      expect(distantLines.every((line) => line.className.includes("sm:text-3xl"))).toBe(true);
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
      expect(track.style.transform).toContain("translateY(0px)");
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
        renderedLines.every((line) => line.className.includes("transition-[opacity,color]")),
      ).toBe(true);
      expect(renderedLines.every((line) => line.className.includes("duration-[360ms]"))).toBe(true);
      expect(renderedLines.every((line) => line.className.includes("ease-out"))).toBe(true);
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
      expect(value).toBeCloseTo(-88, 1);
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
      expect(value).toBeLessThan(-88);
      expect(value).toBeGreaterThan(-176);
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
      expect(value).toBeCloseTo(-176, 2);
    });
  });

  it("uses exported motion-window defaults instead of inline transition literals", () => {
    const source = readFileSync("src/web/fullscreen-lyrics-page.tsx", "utf8");
    expect(source.includes("DEFAULT_MIN_TRANSITION_MS")).toBe(true);
    expect(source.includes("DEFAULT_MAX_TRANSITION_MS")).toBe(true);
    expect(source.includes("DEFAULT_TRANSITION_WINDOW_FRACTION")).toBe(true);
  });

  it("routes synced track translateY through getTargetScrollOffset helper", () => {
    const source = readFileSync("src/web/fullscreen-lyrics-page.tsx", "utf8");
    expect(source.includes("getTargetScrollOffset")).toBe(true);
  });

  it("anchors active-tier handoff to animated offset continuity", () => {
    const source = readFileSync("src/web/fullscreen-lyrics-page.tsx", "utf8");
    expect(source.includes("Math.round(Math.abs(displayTrackOffsetPx) / SYNC_LINE_STEP_PX)")).toBe(true);
  });

  it("gates offset animation to valid transition phase only", () => {
    const source = readFileSync("src/web/fullscreen-lyrics-page.tsx", "utf8");
    expect(source.includes("if (!shouldAnimateTrackOffset)")).toBe(true);
    expect(source.includes("transition.phase !== \"transition\" || nextSyncedIndex <= activeSyncedIndex")).toBe(true);
  });

  it("avoids overlap-prone per-line transform classes during track motion", () => {
    const source = readFileSync("src/web/fullscreen-lyrics-page.tsx", "utf8");
    expect(source.includes("scale-[")).toBe(false);
    expect(source.includes("scale-95")).toBe(false);
    expect(source.includes("translate-y-")).toBe(false);
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
      expect(value).toBeGreaterThan(-88);
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
      expect(track.style.transform).toBe("translateY(0px)");
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
      expect(value).toBeGreaterThan(-88);
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
      expect(value).toBeLessThan(-88);
      expect(value).toBeGreaterThan(-176);
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
      expect(screen.queryAllByRole("button").length).toBe(1);
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
    expect(screen.getByTestId("diagnostics-estimated-ms").textContent).toContain("4500");
    expect(screen.getByTestId("diagnostics-polled-ms").textContent).toContain("4500");
    expect(screen.getByTestId("diagnostics-drift-delta-ms").textContent).toContain("0");
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
    expect(screen.getByTestId("diagnostics-estimated-ms").textContent).toContain("6543");
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
