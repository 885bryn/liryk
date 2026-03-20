import { fireEvent, render, screen } from "@testing-library/react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { buildConnectSpotifyCard } from "../ui/connection/connect-spotify-card";
import { createLiveLyricsPanelBuilder } from "../ui/lyrics/live-lyrics-panel";
import { AuthStore } from "../state/auth/auth-store";
import { LiveSyncStore } from "../state/playback/live-sync-store";
import { AppShell } from "./app-shell";

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
    expect(shell.className).toContain("lg:grid-cols-2");
    expect(screen.getAllByText("Spotify is not connected yet.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lyrics will appear once a track is playing.").length).toBeGreaterThan(0);
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
});
