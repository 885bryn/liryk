import { describe, expect, it } from "vitest";

import { buildLyricsViewport } from "./lyrics-viewport";
import { useAutoScrollController } from "./use-auto-scroll-controller";

describe("buildLyricsViewport", () => {
  it("keeps active line in center-biased viewport with smooth stepping", () => {
    const controller = useAutoScrollController();
    const lines = ["0", "1", "2", "3", "4", "5", "6"];

    const view = buildLyricsViewport({
      lines: lines.map((text) => ({ text })),
      activeLineIndex: 4,
      nextLineIndex: 5,
      nowMs: 100,
      controller,
    });

    expect(view.visibleLines.map((line) => line.text)).toEqual(["2", "3", "4", "5", "6"]);
    expect(view.scrollMode).toBe("smooth-step");
  });

  it("pauses auto-scroll on manual scroll and shows return-to-live control", () => {
    const controller = useAutoScrollController({ suspendMs: 5_000 });

    const paused = buildLyricsViewport({
      lines: ["a", "b", "c", "d"].map((text) => ({ text })),
      activeLineIndex: 1,
      nextLineIndex: 2,
      nowMs: 1_000,
      isManualScroll: true,
      controller,
    });
    expect(paused.showReturnToLive).toBe(true);

    const resumed = buildLyricsViewport({
      lines: ["a", "b", "c", "d"].map((text) => ({ text })),
      activeLineIndex: 1,
      nextLineIndex: 2,
      nowMs: 1_010,
      returnToLive: true,
      controller,
    });
    expect(resumed.showReturnToLive).toBe(false);
  });

  it("renders plain-static mode with no highlight and no return-to-live affordance", () => {
    const view = buildLyricsViewport({
      lines: ["plain one", "plain two", "plain three"].map((text) => ({ text })),
      activeLineIndex: 0,
      nextLineIndex: 1,
      renderMode: "plain-static",
      nowMs: 100,
    });

    expect(view.renderMode).toBe("plain-static");
    expect(view.activeLineIndex).toBeNull();
    expect(view.nextLineIndex).toBeNull();
    expect(view.showReturnToLive).toBe(false);
  });

  it("adds direction metadata for Arabic, Korean, and Chinese lines", () => {
    const view = buildLyricsViewport({
      lines: [
        { text: "\u0645\u0631\u062d\u0628\u0627" },
        { text: "\ud55c\uad6d\uc5b4" },
        { text: "\u611b\u4f60" },
      ],
      activeLineIndex: null,
      nextLineIndex: null,
      renderMode: "plain-static",
      nowMs: 100,
    });

    expect(view.visibleLines[0]?.dir).toBe("rtl");
    expect(view.visibleLines[1]?.dir).toBe("ltr");
    expect(view.visibleLines[2]?.displayText).toBe("\u7231\u4f60");
  });

  it("keeps upstream-provided simplified displayText stable", () => {
    const view = buildLyricsViewport({
      lines: [{ text: "\u6b61\u8fce\u5149\u81e8 ABC 2026", displayText: "\u6b22\u8fce\u5149\u4e34 ABC 2026" }],
      activeLineIndex: null,
      nextLineIndex: null,
      renderMode: "plain-static",
      nowMs: 100,
    });

    expect(view.visibleLines[0]?.displayText).toBe("\u6b22\u8fce\u5149\u4e34 ABC 2026");
  });
});
