import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WebAppRouter } from "./web/web-app-router";

function renderEntryAt(pathname: string) {
  window.history.pushState({}, "", pathname);
  render(<WebAppRouter />);
}

describe("main route entry", () => {
  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
  });

  it("renders the desktop shell at / with an open-fullscreen entry point", () => {
    renderEntryAt("/");

    expect(screen.getByTestId("shell-layout")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Fullscreen Lyrics" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Exit Fullscreen Lyrics" })).toBeNull();
  });

  it("renders the standalone fullscreen page at /fullscreen", () => {
    renderEntryAt("/fullscreen");

    expect(screen.getByTestId("fullscreen-lyrics-layout")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Open Fullscreen Lyrics" })).toBeNull();
    expect(screen.getByRole("link", { name: "Exit Fullscreen Lyrics" })).toBeTruthy();
  });

  it("falls back to the desktop shell on unknown paths", () => {
    renderEntryAt("/missing");

    expect(screen.getByTestId("shell-layout")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Fullscreen Lyrics" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Exit Fullscreen Lyrics" })).toBeNull();
  });
});
