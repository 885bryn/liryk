import { fireEvent, render, screen, within } from "@testing-library/react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { buildConnectSpotifyCard } from "../ui/connection/connect-spotify-card";
import { createLiveLyricsPanelBuilder } from "../ui/lyrics/live-lyrics-panel";
import { AuthStore } from "../state/auth/auth-store";
import { LiveSyncStore } from "../state/playback/live-sync-store";
import { AppShell } from "./app-shell";

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
  it("renders header and both pane placeholders", () => {
    render(<AppShell />);

    expect(screen.getByRole("heading", { name: "Liryk" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Connection" })).toBeTruthy();
    expect(screen.getByText("Spotify is not connected yet.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Lyrics" })).toBeTruthy();
    expect(screen.getByText("Lyrics will appear once a track is playing.")).toBeTruthy();
  });

  it("shows a header theme toggle before connection", () => {
    render(<AppShell />);

    expect(screen.getAllByRole("switch", { name: "Toggle theme" }).length).toBeGreaterThan(0);
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

    expect(screen.getAllByText("Spotify is not connected yet.").length).toBeGreaterThan(0);
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
    expect(screen.getAllByText("Spotify is not connected yet.")[0].className).toContain("text-muted-foreground");
    expect(screen.getAllByText("Spotify is not connected yet.")[0].className).toContain("leading-relaxed");
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

    const nowPlaying = screen.getByTestId("lyrics-now-playing");
    expect(nowPlaying).toBeTruthy();
    expect(within(nowPlaying).getByText("Track Z")).toBeTruthy();
    expect(within(nowPlaying).getByText("Artist Z")).toBeTruthy();
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

    expect(screen.getByTestId("lyrics-status-rail").textContent).toContain("Syncing latest playback position...");

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

    expect(screen.getByTestId("lyrics-empty-state").textContent).toContain("Waiting for an active Spotify track");

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

    const notFoundState = screen.getByTestId("lyrics-not-found-state");
    expect(notFoundState.textContent).toContain("Lyrics not found");
    expect(within(notFoundState).getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("keeps one stable lyrics status rail container across state variants", () => {
    const { rerender } = render(<AppShell lyricsPanelOverride={panelOverride({ stateRailVariant: "info" })} />);

    expect(screen.getAllByTestId("lyrics-status-rail")).toHaveLength(1);

    rerender(<AppShell lyricsPanelOverride={panelOverride({ stateRailVariant: "idle", showLyrics: false })} />);
    expect(screen.getAllByTestId("lyrics-status-rail")).toHaveLength(1);

    rerender(
      <AppShell
        lyricsPanelOverride={panelOverride({
          sourceState: "not-found",
          stateRailVariant: "warning",
          showLyrics: false,
        })}
      />,
    );
    expect(screen.getAllByTestId("lyrics-status-rail")).toHaveLength(1);
  });
});
