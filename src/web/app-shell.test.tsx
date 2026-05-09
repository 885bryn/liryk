import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildConnectSpotifyCard } from "../ui/connection/connect-spotify-card";
import { createLiveLyricsPanelBuilder } from "../ui/lyrics/live-lyrics-panel";
import type { UiAuthState } from "../state/auth/auth-store";
import { AuthStore } from "../state/auth/auth-store";
import { LiveSyncStore } from "../state/playback/live-sync-store";
import type { ResolvedLyrics } from "../core/lyrics/types";
import { AppShell } from "./app-shell";

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
  durationMs?: number;
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

vi.mock("./use-shared-playback", () => ({
  useSharedPlayback: () => ({
    nowPlaying: nowPlayingResponse,
    playbackSnapshot: nowPlayingResponse
      ? {
          trackId: nowPlayingResponse.trackId,
          deviceId: "web",
          isPlaying: nowPlayingResponse.isPlaying,
          progressMs: nowPlayingResponse.progressMs,
          capturedAtMs: Date.now(),
        }
      : null,
    pollerId: "test-poller",
    rateLimitedUntilMs: 0,
    lastUpdatedAtMs: Date.now(),
  }),
}));

vi.mock("@/infra/providers/lrclib-client", () => ({
  createLrclibClient: vi.fn(() => ({})),
}));

vi.mock("@/core/lyrics/lyrics-resolver", () => ({
  resolveLyricsForTrack: vi.fn(async () => resolvedLyricsResponse),
}));

function panelOverride(overrides: Record<string, unknown> = {}) {
  return {
    status: "syncing",
    statusLine: "Live sync active.",
    sourceState: "synced",
    renderMode: "synced",
    showPrimaryAction: false,
    showLyrics: true,
    showReturnToLive: false,
    title: "Live Lyrics",
    trackLabel: "Track A",
    nowPlayingTitle: "Track A",
    nowPlayingArtist: "Artist A",
    isNowPlayingKnown: true,
    stateRailMessage: "Live sync active.",
    stateRailVariant: "info",
    activeLineText: "line a",
    nextLineText: "line b",
    ...overrides,
  };
}

describe("AppShell", () => {
  afterEach(() => {
    cleanup();
  });

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

  it("renders header and both pane placeholders", () => {
    render(<AppShell />);

    expect(screen.getByRole("heading", { name: "Liryk" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Connection" })).toBeTruthy();
    expect(screen.getByText("Checking Spotify connection...")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Lyrics" })).toBeTruthy();
    expect(screen.getByText("Lyrics will appear once a track is playing.")).toBeTruthy();
  });

  it("shows a header theme toggle before connection", () => {
    render(<AppShell />);

    expect(screen.getAllByRole("switch", { name: "Toggle theme" }).length).toBeGreaterThan(0);
  });

  it("shows a visible control to open fullscreen lyrics", () => {
    render(<AppShell />);

    const openFullscreenLink = screen.getByRole("link", { name: "Open Fullscreen Lyrics" });
    expect(openFullscreenLink).toBeTruthy();
    expect(openFullscreenLink.getAttribute("href")).toBe("/fullscreen");
  });

  it("shows theme placement in connected account menu and keeps disconnect action", () => {
    render(<AppShell isConnected accountName="Avery" />);

    fireEvent.click(screen.getByRole("button", { name: "Avery account menu" }));
    expect(screen.getAllByRole("switch", { name: "Toggle theme" }).length).toBeGreaterThan(1);
    expect(screen.getByText("Disconnect Spotify")).toBeTruthy();
  });

  it("keeps split desktop markers and stacked mobile markers with placeholders", () => {
    render(<AppShell />);

    const shell = screen.getAllByTestId("shell-layout")[0];
    expect(shell.className).toContain("grid-cols-1");
    expect(shell.className).toContain("lg:grid-cols-5");

    const lyricsPane = within(shell).getByLabelText("Lyrics pane");
    const connectionPane = within(shell).getByLabelText("Connection pane");

    expect(lyricsPane.className).toContain("lg:col-span-3");
    expect(connectionPane.className).toContain("lg:col-span-2");
    expect(lyricsPane.compareDocumentPosition(connectionPane) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);

    expect(screen.getAllByText("Checking Spotify connection...").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lyrics will appear once a track is playing.").length).toBeGreaterThan(0);
  });

  it("applies explicit typography and spacing hierarchy markers", () => {
    render(<AppShell />);

    const shell = screen.getAllByTestId("shell-layout")[0];
    expect(shell.className).toContain("gap-4");
    expect(shell.className).toContain("sm:gap-5");
    expect(shell.className).toContain("lg:gap-6");
    expect(shell.className).toContain("px-4");
    expect(shell.className).toContain("sm:px-6");
    expect(shell.className).toContain("py-5");
    expect(shell.className).toContain("sm:py-6");
    expect(shell.className).toContain("lg:py-8");

    expect(screen.getAllByRole("heading", { name: "Liryk" })[0].className).toContain("tracking-tight");
    expect(screen.getAllByRole("heading", { name: "Liryk" })[0].className).toContain("sm:text-2xl");

    expect(screen.getAllByRole("heading", { name: "Lyrics" })[0].className).toContain("text-lg");
    expect(screen.getAllByRole("heading", { name: "Lyrics" })[0].className).toContain("font-medium");
    expect(screen.getAllByRole("heading", { name: "Connection" })[0].className).toContain("text-lg");
    expect(screen.getAllByRole("heading", { name: "Connection" })[0].className).toContain("font-medium");

    expect(screen.getAllByText("Lyrics will appear once a track is playing.")[0].className).toContain("text-muted-foreground");
    expect(screen.getAllByText("Lyrics will appear once a track is playing.")[0].className).toContain("leading-relaxed");
    expect(screen.getAllByText("Checking Spotify connection...")[0].className).toContain("text-muted-foreground");
    expect(screen.getAllByText("Checking Spotify connection...")[0].className).toContain("leading-relaxed");
  });

  it("keeps web entry files free of desktop-only module imports", async () => {
    const { readFile } = await import("node:fs/promises");
    const thisFilePath = fileURLToPath(import.meta.url);
    const thisDirPath = dirname(thisFilePath);

    const [mainSource, shellSource] = await Promise.all([
      readFile(resolve(thisDirPath, "../main.tsx"), "utf8"),
      readFile(resolve(thisDirPath, "./app-shell.tsx"), "utf8"),
    ]);

    expect(mainSource).not.toContain("node:fs");
    expect(mainSource).not.toContain("electron");
    expect(shellSource).not.toContain("node:fs");
    expect(shellSource).not.toContain("electron");
  });

  it("consumes existing connection and lyrics model boundaries", () => {
    const authStore = new AuthStore();
    const liveSyncStore = new LiveSyncStore();

    const connectionModel = buildConnectSpotifyCard({
      state: authStore.selectUiState(),
      onConnect: () => undefined,
    });

    const lyricsModel = createLiveLyricsPanelBuilder().build({
      syncState: liveSyncStore.selectLiveSync(),
      lines: [],
      showReturnToLive: false,
    });

    expect(connectionModel.ctaLabel).toBe("Connect Spotify");
    expect(lyricsModel.title).toBe("Live Lyrics");
  });

  it("renders now-playing metadata in the lyrics pane", () => {
    render(
      <AppShell
        lyricsPanelOverride={panelOverride({
          nowPlayingTitle: "Track Z",
          nowPlayingArtist: "Artist Z",
        })}
      />,
    );

    const shell = screen.getAllByTestId("shell-layout").at(-1);
    expect(shell).toBeTruthy();
    const nowPlaying = within(shell as HTMLElement).getByTestId("lyrics-now-playing");
    expect(nowPlaying).toBeTruthy();
    expect(within(nowPlaying).getByText("Track Z")).toBeTruthy();
    expect(within(nowPlaying).getByText("Artist Z")).toBeTruthy();
  });

  it("renders a subtle low-confidence indicator without displacing lyrics", () => {
    render(
      <AppShell
        lyricsPanelOverride={panelOverride({
          warningBadge: "Low confidence lyrics",
          confidenceBadge: "Best guess",
          activeLineText: "line a",
          nextLineText: "line b",
        })}
      />,
    );

    const shell = screen.getAllByTestId("shell-layout").at(-1);
    expect(shell).toBeTruthy();
    const indicator = within(shell as HTMLElement).getByLabelText("Low confidence lyrics");
    expect(indicator.textContent).toContain("Low confidence lyrics");
    expect(indicator.textContent).toContain("Best guess");
    expect(within(shell as HTMLElement).getByText("line a")).toBeTruthy();
    expect(within(shell as HTMLElement).getByText("line b")).toBeTruthy();
  });

  it("renders distinct syncing, empty, and not-found states", () => {
    const { rerender } = render(
      <AppShell
        lyricsPanelOverride={panelOverride({
          status: "syncing",
          sourceState: "loading",
          stateRailMessage: "Syncing latest playback position...",
          stateRailVariant: "info",
          showLyrics: false,
        })}
      />,
    );

    const syncingShell = screen.getAllByTestId("shell-layout").at(-1);
    expect(syncingShell).toBeTruthy();
    expect(within(syncingShell as HTMLElement).getByTestId("lyrics-status-rail").textContent).toContain(
      "Syncing latest playback position...",
    );

    rerender(
      <AppShell
        lyricsPanelOverride={panelOverride({
          status: "no-track",
          sourceState: "loading",
          stateRailMessage: "Waiting for an active Spotify track...",
          stateRailVariant: "idle",
          showLyrics: false,
        })}
      />,
    );

    const emptyShell = screen.getAllByTestId("shell-layout").at(-1);
    expect(emptyShell).toBeTruthy();
    expect(within(emptyShell as HTMLElement).getByTestId("lyrics-empty-state").textContent).toContain(
      "Waiting for an active Spotify track",
    );

    rerender(
      <AppShell
        lyricsPanelOverride={panelOverride({
          sourceState: "not-found",
          stateRailMessage: "Lyrics not found",
          stateRailVariant: "warning",
          showLyrics: false,
          showPrimaryAction: true,
          primaryActionLabel: "Retry",
        })}
      />,
    );

    const notFoundShell = screen.getAllByTestId("shell-layout").at(-1);
    expect(notFoundShell).toBeTruthy();
    const notFoundState = within(notFoundShell as HTMLElement).getByTestId("lyrics-not-found-state");
    expect(notFoundState.textContent).toContain("Lyrics not found");
    expect(within(notFoundState).getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("keeps one stable lyrics status rail container across state variants", () => {
    const { rerender } = render(<AppShell lyricsPanelOverride={panelOverride({ stateRailVariant: "info" })} />);

    let shell = screen.getAllByTestId("shell-layout").at(-1);
    expect(shell).toBeTruthy();
    expect(within(shell as HTMLElement).getAllByTestId("lyrics-status-rail")).toHaveLength(1);

    rerender(<AppShell lyricsPanelOverride={panelOverride({ stateRailVariant: "idle", showLyrics: false })} />);
    shell = screen.getAllByTestId("shell-layout").at(-1);
    expect(shell).toBeTruthy();
    expect(within(shell as HTMLElement).getAllByTestId("lyrics-status-rail")).toHaveLength(1);

    rerender(
      <AppShell
        lyricsPanelOverride={panelOverride({
          sourceState: "not-found",
          stateRailVariant: "warning",
          showLyrics: false,
        })}
      />,
    );
    shell = screen.getAllByTestId("shell-layout").at(-1);
    expect(shell).toBeTruthy();
    expect(within(shell as HTMLElement).getAllByTestId("lyrics-status-rail")).toHaveLength(1);
  });

  it("shows reconnect CTA with reason-aware helper text for recoverable auth state", () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Network connection was interrupted. Check your connection and retry.",
      uiState: {
        status: "recoverable_error",
        reason: "network",
        userFacingReason: "Network connection was interrupted. Check your connection and retry.",
        retryEligible: true,
        troubleshootingSuggested: false,
        attempts: 1,
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
    };

    render(<AppShell />);

    expect(screen.getByRole("button", { name: "Reconnect Spotify" })).toBeTruthy();
    expect(screen.getByText("Network connection was interrupted. Check your connection and retry.")).toBeTruthy();
  });

  it("keeps shell visible and disables connect action while authorizing", () => {
    hookModel = {
      phase: "busy",
      statusCopy: "Authorizing Spotify connection...",
      uiState: {
        status: "authorizing",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
    };

    render(<AppShell />);

    expect(screen.getByRole("heading", { name: "Liryk" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Authorizing Spotify connection..." }).hasAttribute("disabled")).toBe(true);
    expect(screen.getAllByText("Authorizing Spotify connection...").length).toBeGreaterThan(0);
  });

  it("renders simplified chinese active and next lines while preserving mixed content", async () => {
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

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByText("爱在台北")).toBeTruthy();
      expect(screen.getByText("欢迎光临 ABC 2026!")).toBeTruthy();
    });
    expect(screen.queryByText("愛在臺北")).toBeNull();
    expect(screen.queryByText("歡迎光臨 ABC 2026!")).toBeNull();
    expect(screen.getByTestId("lyrics-now-playing")).toBeTruthy();
    expect(screen.getByTestId("lyrics-status-rail")).toBeTruthy();
  });
});
