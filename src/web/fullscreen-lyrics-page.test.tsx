import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FullscreenLyricsPage } from "./fullscreen-lyrics-page";

describe("FullscreenLyricsPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders fullscreen layout and column markers", () => {
    render(<FullscreenLyricsPage />);

    expect(screen.getByTestId("fullscreen-lyrics-layout")).toBeTruthy();
    expect(screen.getByTestId("fullscreen-lyrics-column")).toBeTruthy();
  });

  it("omits shell chrome markers and labels", () => {
    render(<FullscreenLyricsPage />);

    expect(screen.queryByTestId("shell-layout")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Connection" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Liryk" })).toBeNull();
  });

  it("keeps fullscreen wrapper and column class contracts", () => {
    render(<FullscreenLyricsPage />);

    const layout = screen.getByTestId("fullscreen-lyrics-layout");
    expect(layout.className).toContain("min-h-screen");
    expect(layout.className).toContain("w-full");
    expect(layout.className).toContain("bg-background");
    expect(layout.className).toContain("text-foreground");

    const column = screen.getByTestId("fullscreen-lyrics-column");
    expect(column.className).toContain("mx-auto");
    expect(column.className).toContain("max-w-3xl");
    expect(column.className).toContain("text-left");
    expect(column.className).toContain("py-20");
    expect(column.className).toContain("sm:py-24");
    expect(column.className).toContain("lg:py-28");
  });
});
