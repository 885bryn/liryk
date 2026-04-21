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

  it("renders shell route on / without fullscreen marker", () => {
    renderEntryAt("/");

    expect(screen.getByTestId("shell-layout")).toBeTruthy();
    expect(screen.queryByTestId("fullscreen-lyrics-layout")).toBeNull();
  });

  it("renders fullscreen route on /fullscreen without shell marker", () => {
    renderEntryAt("/fullscreen");

    expect(screen.getByTestId("fullscreen-lyrics-layout")).toBeTruthy();
    expect(screen.queryByTestId("shell-layout")).toBeNull();
  });

  it("falls back to shell route on unknown paths", () => {
    renderEntryAt("/missing");

    expect(screen.getByTestId("shell-layout")).toBeTruthy();
    expect(screen.queryByTestId("fullscreen-lyrics-layout")).toBeNull();
  });
});
