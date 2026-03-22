import { useEffect, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
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
import { getEnvAlignmentDiagnostics } from "./auth/env-alignment";
import { useWebAuthRuntime } from "./use-web-auth-runtime";
import { useSharedPlayback } from "./use-shared-playback";
import { createLrclibClient } from "@/infra/providers/lrclib-client";
import { resolveLyricsForTrack } from "@/core/lyrics/lyrics-resolver";
import { normalizeChineseForDisplay } from "@/core/lyrics/unicode-normalization";
import type { ResolvedLyrics } from "@/core/lyrics/types";

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
  estimatedProgressMs: 0,
  polledProgressMs: 0,
  driftDeltaMs: 0,
  correctionState: "static",
};

export function AppShell(input?: AppShellProps) {
  const themeStore = useRef(createThemeStore({ mode: hydrateTheme() }));
  const [themeMode, setThemeMode] = useState(themeStore.current.getMode());
  const webAuth = useWebAuthRuntime();
  const sharedPlayback = useSharedPlayback({
    source: "AppShell",
    accessToken: webAuth.sessionAccessToken ?? null,
  });
  const nowPlaying = sharedPlayback.nowPlaying;
  const [resolvedLyrics, setResolvedLyrics] = useState<ResolvedLyrics | null>(null);

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
          displayName: input?.accountName ?? "Connected account",
          spotifyUserId: "spotify-user",
        },
      }
    : runtimeConnectedState;
  const accountMenu = accountMenuState
    ? buildAccountMenu(accountMenuState, input?.onDisconnect ?? (async () => undefined))
    : null;
  const syncedLines = (resolvedLyrics?.lines ?? []).filter((line) => typeof line.startMs === "number");
  const lyricTexts = (resolvedLyrics?.lines ?? []).map((line) => line.displayText ?? normalizeChineseForDisplay(line.text));
  const activeSyncedIndex =
    nowPlaying && syncedLines.length > 0
      ? Math.max(
          0,
          syncedLines.reduce((best, line, index) => {
            if ((line.startMs ?? 0) <= nowPlaying.progressMs) {
              return index;
            }
            return best;
          }, 0),
        )
      : null;
  const nextSyncedIndex =
    typeof activeSyncedIndex === "number" && activeSyncedIndex + 1 < syncedLines.length ? activeSyncedIndex + 1 : null;

  const lyricsPanel =
    input?.lyricsPanelOverride ??
    createLiveLyricsPanelBuilder().build({
      syncState: {
        ...baseSyncState,
        playbackState: nowPlaying ? (nowPlaying.isPlaying ? "playing" : "paused") : "idle",
        trackId: nowPlaying?.trackId ?? null,
        activeLineIndex: resolvedLyrics?.renderMode === "synced" ? activeSyncedIndex : null,
        nextLineIndex: resolvedLyrics?.renderMode === "synced" ? nextSyncedIndex : null,
        lyricsSourceState: resolvedLyrics?.sourceState ?? "loading",
        lyricsRenderMode: resolvedLyrics?.renderMode ?? null,
        resolvedLyrics: resolvedLyrics?.lines ?? [],
        statusLine:
          resolvedLyrics?.sourceState === "not-found"
            ? "Lyrics not found"
            : resolvedLyrics
              ? "Lyrics ready"
              : "Resolving lyrics...",
      },
      lines: lyricTexts,
      trackTitle: nowPlaying?.title,
      trackArtist: nowPlaying?.artist,
      showReturnToLive: false,
    });
  const envDiagnostics = (() => {
    try {
      return getEnvAlignmentDiagnostics({
        currentUrl: new URL(window.location.href),
        requiredCallbackPath: "/callback",
      });
    } catch {
      return null;
    }
  })();
  const statusRailClass =
    lyricsPanel.stateRailVariant === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : lyricsPanel.stateRailVariant === "idle"
        ? "text-muted-foreground"
        : "text-foreground";

  useEffect(() => {
    if (!webAuth.sessionAccessToken || !nowPlaying?.trackId) {
      setResolvedLyrics(null);
      return;
    }

    let active = true;
    const lrclib = createLrclibClient({ fetchFn: fetch });

    const resolve = async () => {
      try {
        const resolved = await resolveLyricsForTrack(
          {
            trackId: nowPlaying.trackId,
            title: nowPlaying.title,
            artist: nowPlaying.artist,
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
  }, [webAuth.sessionAccessToken, nowPlaying?.trackId, nowPlaying?.title, nowPlaying?.artist]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <header className="border-b px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Liryk</h1>

          <div className="flex items-center gap-3">
            <a className={buttonVariants({ variant: "outline", size: "sm" })} href="/fullscreen">
              Open Fullscreen Lyrics
            </a>

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
            {envDiagnostics?.status === "warning"
              ? envDiagnostics.messages.map((message) => (
                  <p key={message} className="text-sm leading-relaxed text-amber-700 dark:text-amber-300">
                    {message}
                  </p>
                ))
              : null}

            {webAuth.phase === "checking" ? (
              <p className="text-sm text-muted-foreground leading-relaxed">Checking Spotify connection...</p>
            ) : null}

            {webAuth.phase !== "checking" && webAuth.uiState.status === "disconnected" ? (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">{webAuth.statusCopy}</p>
                <Button
                  type="button"
                  onClick={() => void webAuth.onConnect()}
                  disabled={webAuth.statusCopy.startsWith("Spotify auth setup issue:")}
                >
                  Connect Spotify
                </Button>
              </>
            ) : null}

            {webAuth.phase !== "checking" && webAuth.uiState.status === "recoverable_error" ? (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">{webAuth.statusCopy}</p>
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
