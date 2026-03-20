import { describe, expect, it } from "vitest";

import { buildLyricsViewport } from "./lyrics-viewport";
import { useAutoScrollController } from "./use-auto-scroll-controller";

describe("buildLyricsViewport", () => {
  it("keeps active line in center-biased viewport with smooth stepping", () => {
    const controller = useAutoScrollController();
    const lines = ["0", "1", "2", "3", "4", "5", "6"];

    const view = buildLyricsViewport({
      lines,
      activeLineIndex: 4,
      nextLineIndex: 5,
      nowMs: 100,
      controller,
    });

    expect(view.visibleLines).toEqual(["2", "3", "4", "5", "6"]);
    expect(view.scrollMode).toBe("smooth-step");
  });

  it("pauses auto-scroll on manual scroll and shows return-to-live control", () => {
    const controller = useAutoScrollController({ suspendMs: 5_000 });

    const paused = buildLyricsViewport({
      lines: ["a", "b", "c", "d"],
      activeLineIndex: 1,
      nextLineIndex: 2,
      nowMs: 1_000,
      isManualScroll: true,
      controller,
    });
    expect(paused.showReturnToLive).toBe(true);

    const resumed = buildLyricsViewport({
      lines: ["a", "b", "c", "d"],
      activeLineIndex: 1,
      nextLineIndex: 2,
      nowMs: 1_010,
      returnToLive: true,
      controller,
    });
    expect(resumed.showReturnToLive).toBe(false);
  });
});
