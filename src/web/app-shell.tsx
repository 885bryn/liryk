import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildAccountMenu } from "@/ui/connection/account-menu";
import { createLiveLyricsPanelBuilder, type LiveLyricsPanelModel } from "@/ui/lyrics/live-lyrics-panel";
import type { LiveSyncUiState } from "@/state/playback/live-sync-store";

import { createThemeStore, hydrateTheme } from "./theme/theme-store";
import { ThemeToggle } from "./theme/theme-toggle";
import { useWebAuthRuntime } from "./use-web-auth-runtime";

type AppShellProps = {
  isConnected?: boolean;
  accountName?: string;
  onDisconnect?: () => Promise<void>;
  lyricsPanelOverride?: LiveLyricsPanelModel;
};

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
};

function buildDefaultLyricsPanel(): LiveLyricsPanelModel {
  return createLiveLyricsPanelBuilder().build({
    syncState: baseSyncState,
    lines: [],
    showReturnToLive: false,
  });
}

export function AppShell(input?: AppShellProps) {
  const themeStore = useRef(createThemeStore({ mode: hydrateTheme() }));
  const [themeMode, setThemeMode] = useState(themeStore.current.getMode());
  const webAuth = useWebAuthRuntime();

  const onToggleTheme = () => {
    setThemeMode(themeStore.current.toggle());
  };

  const runtimeConnectedState =
    webAuth.uiState.status === "connected_waiting_playback" || webAuth.uiState.status === "success"
      ? webAuth.uiState
      : null;
  const accountMenuState = input?.isConnected
    ? {
        status: "connected_waiting_playback" as const,
        waitingMessage: "Connected - play a track on Spotify" as const,
        onboardingExplainer: webAuth.uiState.onboardingExplainer,
        permissionSummary: webAuth.uiState.permissionSummary,
        accountDisplay: {
          displayName: input.accountName ?? "Connected account",
          spotifyUserId: "spotify-user",
        },
      }
    : runtimeConnectedState;
  const accountMenu = accountMenuState
    ? buildAccountMenu(accountMenuState, input.onDisconnect ?? (async () => undefined))
    : null;
  const lyricsPanel = input?.lyricsPanelOverride ?? buildDefaultLyricsPanel();
  const statusRailClass =
    lyricsPanel.stateRailVariant === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : lyricsPanel.stateRailVariant === "idle"
        ? "text-muted-foreground"
        : "text-foreground";

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <header className="border-b px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Liryk</h1>

          <div className="flex items-center gap-3">
            <ThemeToggle mode={themeMode} onToggle={onToggleTheme} />

            {accountMenu ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" aria-label={`${accountMenu.accountLabel} account menu`}>
                      {accountMenu.accountLabel}
                    </Button>
                  }
                />
                <DropdownMenuContent>
                  <div className="px-2 py-1 text-xs text-muted-foreground">{accountMenu.accountLabel}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <ThemeToggle mode={themeMode} onToggle={onToggleTheme} />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      void accountMenu.onDisconnect();
                    }}
                  >
                    {accountMenu.disconnectLabel}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </header>

      <main
        data-testid="shell-layout"
        className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:grid-cols-5 lg:gap-6 lg:py-8"
      >
        <Card aria-label="Lyrics pane" className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg font-medium leading-snug">Lyrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div data-testid="lyrics-now-playing" className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Now playing</p>
              <p className="text-base font-medium leading-tight">{lyricsPanel.nowPlayingTitle}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{lyricsPanel.nowPlayingArtist}</p>
            </div>

            <p data-testid="lyrics-status-rail" className={`text-sm leading-relaxed ${statusRailClass}`}>
              {lyricsPanel.stateRailMessage}
            </p>

            {lyricsPanel.sourceState === "not-found" ? (
              <div data-testid="lyrics-not-found-state" className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <p>Lyrics not found</p>
                {lyricsPanel.showPrimaryAction && lyricsPanel.primaryActionLabel ? (
                  <Button type="button" variant="secondary" size="sm">
                    {lyricsPanel.primaryActionLabel}
                  </Button>
                ) : null}
              </div>
            ) : lyricsPanel.status === "idle" || lyricsPanel.status === "no-track" ? (
              <div data-testid="lyrics-empty-state" className="text-sm leading-relaxed text-muted-foreground">
                {lyricsPanel.status === "idle"
                  ? "Lyrics will appear once a track is playing."
                  : "Waiting for an active Spotify track..."}
              </div>
            ) : lyricsPanel.showLyrics ? (
              <div className="space-y-2 text-sm leading-relaxed">
                {lyricsPanel.activeLineText ? <p className="font-medium text-foreground">{lyricsPanel.activeLineText}</p> : null}
                {lyricsPanel.nextLineText ? (
                  <p className="text-muted-foreground">{lyricsPanel.nextLineText}</p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card aria-label="Connection pane" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-medium leading-snug">Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {webAuth.phase === "checking" ? (
              <p className="text-sm text-muted-foreground leading-relaxed">Checking Spotify connection...</p>
            ) : null}

            {webAuth.phase !== "checking" && webAuth.uiState.status === "disconnected" ? (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">{webAuth.uiState.onboardingExplainer}</p>
                <Button type="button" onClick={() => void webAuth.onConnect()}>
                  Connect Spotify
                </Button>
              </>
            ) : null}

            {webAuth.phase !== "checking" && webAuth.uiState.status === "recoverable_error" ? (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">{webAuth.uiState.userFacingReason}</p>
                <Button type="button" onClick={() => void webAuth.onConnect()} disabled={!webAuth.uiState.retryEligible}>
                  Reconnect Spotify
                </Button>
              </>
            ) : null}

            {(webAuth.phase === "busy" || webAuth.uiState.status === "authorizing") && webAuth.phase !== "checking" ? (
              <>
                <Button type="button" disabled aria-label="Authorizing Spotify connection...">
                  Authorizing Spotify connection...
                </Button>
                <p className="text-sm text-muted-foreground leading-relaxed">Authorizing Spotify connection...</p>
              </>
            ) : null}

            {webAuth.phase !== "checking" && webAuth.uiState.status === "connected_waiting_playback" ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{webAuth.uiState.waitingMessage}</p>
            ) : null}

            {webAuth.phase !== "checking" && webAuth.uiState.status === "success" ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{webAuth.uiState.successMessage}</p>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
