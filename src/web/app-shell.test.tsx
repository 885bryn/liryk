import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildConnectSpotifyCard } from "../ui/connection/connect-spotify-card";
import { createLiveLyricsPanelBuilder } from "../ui/lyrics/live-lyrics-panel";
import { AuthStore } from "../state/auth/auth-store";
import { LiveSyncStore } from "../state/playback/live-sync-store";
import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("renders header and both pane placeholders", () => {
    render(<AppShell />);

    expect(screen.getByRole("heading", { name: "Liryk" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Connection" })).toBeInTheDocument();
    expect(screen.getByText("Spotify is not connected yet.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Lyrics" })).toBeInTheDocument();
    expect(screen.getByText("Lyrics will appear once a track is playing.")).toBeInTheDocument();
  });

  it("keeps web entry files free of desktop-only module imports", async () => {
    const [{ readFile }, main] = await Promise.all([
      import("node:fs/promises"),
      import("../main"),
    ]);
    void main;

    const [mainSource, shellSource] = await Promise.all([
      readFile(new URL("../main.tsx", import.meta.url), "utf8"),
      readFile(new URL("./app-shell.tsx", import.meta.url), "utf8"),
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
      syncState: liveSyncStore.selectUiState(),
      lines: [],
      showReturnToLive: false,
    });

    expect(connectionModel.ctaLabel).toBe("Connect Spotify");
    expect(lyricsModel.title).toBe("Live Lyrics");
  });
});
