import { describe, expect, it } from "vitest";

import { buildPlainLyricsLines } from "./plain-lyrics-timing";

describe("buildPlainLyricsLines", () => {
  it("builds plain-static lines with no timing or active highlight metadata", () => {
    const lines = buildPlainLyricsLines({ plainLyrics: "first\nsecond" });

    expect(lines).toEqual([
      {
        startMs: null,
        text: "first",
        renderMode: "plain-static",
        isTimestamped: false,
      },
      {
        startMs: null,
        text: "second",
        renderMode: "plain-static",
        isTimestamped: false,
      },
    ]);
  });

  it("splits multiline input, strips carriage returns, and keeps punctuation", () => {
    const lines = buildPlainLyricsLines({ plainLyrics: "oh!\r\n\u0645\u0631\u062d\u0628\u0627\u061f\r\n...\r" });

    expect(lines.map((line) => line.text)).toEqual(["oh!", "\u0645\u0631\u062d\u0628\u0627\u061f", "..."]);
    expect(lines.every((line) => line.renderMode === "plain-static")).toBe(true);
    expect(lines.every((line) => line.startMs === null)).toBe(true);
  });
});
