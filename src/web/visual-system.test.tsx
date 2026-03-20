import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";

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
});
