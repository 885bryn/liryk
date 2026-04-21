import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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

describe("Visual system contract", () => {
  it("keeps token-driven card surface classes on shell panes", () => {
    render(<AppShell />);

    const shell = screen.getAllByTestId("shell-layout")[0];
    const lyricsPane = within(shell).getByLabelText("Lyrics pane");
    const connectionPane = within(shell).getByLabelText("Connection pane");

    expect(lyricsPane.className).toContain("bg-card");
    expect(lyricsPane.className).toContain("text-card-foreground");
    expect(lyricsPane.className).toContain("ring-1");
    expect(lyricsPane.className).toContain("ring-border/60");

    expect(connectionPane.className).toContain("bg-card");
    expect(connectionPane.className).toContain("text-card-foreground");
    expect(connectionPane.className).toContain("ring-1");
    expect(connectionPane.className).toContain("ring-border/60");
  });

  it("keeps pane heading semantics with hierarchy-friendly title classes", () => {
    render(<AppShell />);

    const shell = screen.getAllByTestId("shell-layout")[0];
    const headings = within(shell).getAllByRole("heading", { level: 3 });

    expect(headings.map((heading) => heading.textContent)).toEqual(["Lyrics", "Connection"]);
    for (const heading of headings) {
      expect(heading.className).toContain("font-medium");
      expect(heading.className).toContain("leading-snug");
    }
  });

  it("keeps now-playing metadata and status rail inside the lyrics pane card", () => {
    render(<AppShell lyricsPanelOverride={panelOverride()} />);

    const shell = screen.getAllByTestId("shell-layout").at(-1);
    expect(shell).toBeTruthy();
    const lyricsPane = within(shell as HTMLElement).getByLabelText("Lyrics pane");

    const nowPlaying = within(lyricsPane).getByTestId("lyrics-now-playing");
    const rail = within(lyricsPane).getByTestId("lyrics-status-rail");

    expect(nowPlaying).toBeTruthy();
    expect(rail).toBeTruthy();
  });

  it("applies token-safe rail variants and readable empty/not-found support text", () => {
    const { rerender } = render(<AppShell lyricsPanelOverride={panelOverride({ stateRailVariant: "idle" })} />);

    let shell = screen.getAllByTestId("shell-layout").at(-1);
    expect(shell).toBeTruthy();
    let lyricsPane = within(shell as HTMLElement).getByLabelText("Lyrics pane");
    expect(within(lyricsPane).getByTestId("lyrics-status-rail").className).toContain("text-muted-foreground");

    rerender(<AppShell lyricsPanelOverride={panelOverride({ stateRailVariant: "info" })} />);
    shell = screen.getAllByTestId("shell-layout").at(-1);
    expect(shell).toBeTruthy();
    lyricsPane = within(shell as HTMLElement).getByLabelText("Lyrics pane");
    expect(within(lyricsPane).getByTestId("lyrics-status-rail").className).toContain("text-foreground");

    rerender(
      <AppShell
        lyricsPanelOverride={panelOverride({
          sourceState: "not-found",
          showLyrics: false,
          showPrimaryAction: true,
          primaryActionLabel: "Retry",
          stateRailVariant: "warning",
        })}
      />,
    );
    shell = screen.getAllByTestId("shell-layout").at(-1);
    expect(shell).toBeTruthy();
    lyricsPane = within(shell as HTMLElement).getByLabelText("Lyrics pane");

    const warningRail = within(lyricsPane).getByTestId("lyrics-status-rail");
    const notFoundState = within(lyricsPane).getByTestId("lyrics-not-found-state");
    expect(warningRail.className).toContain("text-amber-600");
    expect(warningRail.className).toContain("dark:text-amber-400");
    expect(notFoundState.className).toContain("text-sm");
    expect(notFoundState.className).toContain("leading-relaxed");

    rerender(
      <AppShell lyricsPanelOverride={panelOverride({ status: "no-track", showLyrics: false, stateRailVariant: "idle" })} />,
    );
    shell = screen.getAllByTestId("shell-layout").at(-1);
    expect(shell).toBeTruthy();
    lyricsPane = within(shell as HTMLElement).getByLabelText("Lyrics pane");

    const emptyState = within(lyricsPane).getByTestId("lyrics-empty-state");
    expect(emptyState.className).toContain("text-sm");
    expect(emptyState.className).toContain("leading-relaxed");
  });
});
