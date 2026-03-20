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
    expect(screen.queryByRole("heading", { name: "Connection" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Liryk" })).toBeNull();
  });

  it("keeps fullscreen wrapper and column class contracts", () => {
    render(<FullscreenLyricsPage />);

    const layout = screen.getByTestId("fullscreen-lyrics-layout");
    expect(layout.className).toContain("min-h-screen");
    expect(layout.className).toContain("w-full");
    expect(layout.className).toContain("bg-background");
    expect(layout.className).toContain("text-foreground");

    const column = screen.getByTestId("fullscreen-lyrics-column");
    expect(column.className).toContain("mx-auto");
    expect(column.className).toContain("max-w-3xl");
    expect(column.className).toContain("text-left");
    expect(column.className).toContain("py-20");
    expect(column.className).toContain("sm:py-24");
    expect(column.className).toContain("lg:py-28");
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
