import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WebAppRouter } from "./web-app-router";

describe("WebAppRouter", () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, "", "/");
  });

  it("renders the mobile shell at the root path with no fullscreen escape hatch", () => {
    window.history.replaceState(null, "", "/");

    render(<WebAppRouter />);

    expect(screen.getByTestId("shell-layout")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Fullscreen Lyrics" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Exit Fullscreen Lyrics" })).toBeNull();
  });

  it("renders the mobile shell at the fullscreen path with no fullscreen escape hatch", () => {
    window.history.replaceState(null, "", "/fullscreen");

    render(<WebAppRouter />);

    expect(screen.getByTestId("fullscreen-lyrics-layout")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Open Fullscreen Lyrics" })).toBeNull();
    expect(screen.getByRole("link", { name: "Exit Fullscreen Lyrics" })).toBeTruthy();
  });
});
