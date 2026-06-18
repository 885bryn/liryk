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

  it("renders the mobile shell at / without fullscreen escape hatches", () => {
    renderEntryAt("/");

    expect(screen.getByTestId("mobile-shell-layout")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Open Fullscreen Lyrics" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Exit Fullscreen Lyrics" })).toBeNull();
  });

  it("renders the mobile shell at /fullscreen without fullscreen escape hatches", () => {
    renderEntryAt("/fullscreen");

    expect(screen.getByTestId("mobile-shell-layout")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Open Fullscreen Lyrics" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Exit Fullscreen Lyrics" })).toBeNull();
  });

  it("falls back to the mobile shell on unknown paths", () => {
    renderEntryAt("/missing");

    expect(screen.getByTestId("mobile-shell-layout")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Open Fullscreen Lyrics" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Exit Fullscreen Lyrics" })).toBeNull();
  });
});
