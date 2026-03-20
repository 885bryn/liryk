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

import { createThemeStore, hydrateTheme } from "./theme/theme-store";
import { ThemeToggle } from "./theme/theme-toggle";

type AppShellProps = {
  isConnected?: boolean;
  accountName?: string;
  onDisconnect?: () => Promise<void>;
};

export function AppShell(input?: AppShellProps) {
  const themeStore = useRef(createThemeStore({ mode: hydrateTheme() }));
  const [themeMode, setThemeMode] = useState(themeStore.current.getMode());

  const onToggleTheme = () => {
    setThemeMode(themeStore.current.toggle());
  };

  const accountMenu = input?.isConnected
    ? buildAccountMenu(
        {
          status: "connected_waiting_playback",
          waitingMessage: "Connected - play a track on Spotify",
          onboardingExplainer: "Connect Spotify once to keep live lyrics synced with your current track.",
          permissionSummary: "We only read playback state and never control playback.",
          accountDisplay: {
            displayName: input.accountName ?? "Connected account",
            spotifyUserId: "spotify-user",
          },
        },
        input.onDisconnect ?? (async () => undefined),
      )
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <header className="border-b px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Liryk</h1>

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

      <main data-testid="shell-layout" className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-5">
        <Card aria-label="Lyrics pane" className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Lyrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Lyrics will appear once a track is playing.</p>
          </CardContent>
        </Card>

        <Card aria-label="Connection pane" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Spotify is not connected yet.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
