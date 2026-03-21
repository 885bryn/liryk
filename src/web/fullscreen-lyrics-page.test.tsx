import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
    expect(column.className).toContain("py-20");
    expect(column.className).toContain("sm:py-24");
    expect(column.className).toContain("lg:py-28");
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
        renderedLines.every((line) => line.className.includes("transition-[transform,opacity,color]")),
      ).toBe(true);
      expect(renderedLines.every((line) => line.className.includes("duration-300"))).toBe(true);
      expect(renderedLines.every((line) => line.className.includes("ease-out"))).toBe(true);
      expect(renderedLines.every((line) => line.className.includes("motion-reduce:transition-none"))).toBe(true);
      expect(renderedLines.every((line) => line.className.includes("motion-reduce:transform-none"))).toBe(true);
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
      expect(screen.queryAllByRole("button").length).toBe(0);
      expect(screen.queryAllByTestId("fullscreen-lyric-line-active").length).toBe(1);

      const layout = screen.getByTestId("fullscreen-lyrics-layout");
      expect(layout.className).toContain("bg-black");
      expect(layout.className).toContain("text-white");
    });
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
