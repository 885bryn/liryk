import { describe, expect, it } from "vitest";

import { createLyricTimeline, getLineIndicesAt } from "./lyric-timeline";

describe("lyric timeline", () => {
  it("normalizes ordering and resolves active/next indices", () => {
    const timeline = createLyricTimeline([
      { startMs: 4_000, text: "line-c" },
      { startMs: 0, text: "line-a" },
      { startMs: 2_000, text: "line-b" },
    ]);

    expect(timeline.lines.map((line) => line.text)).toEqual(["line-a", "line-b", "line-c"]);
    expect(getLineIndicesAt(timeline, 2_500)).toEqual({ activeIndex: 1, nextIndex: 2 });
  });

  it("handles dense transitions and short gaps", () => {
    const timeline = createLyricTimeline([
      { startMs: 0, text: "a" },
      { startMs: 300, text: "b" },
      { startMs: 600, text: "c" },
    ]);

    expect(getLineIndicesAt(timeline, 50)).toEqual({ activeIndex: 0, nextIndex: 1 });
    expect(getLineIndicesAt(timeline, 350)).toEqual({ activeIndex: 1, nextIndex: 2 });
    expect(getLineIndicesAt(timeline, 650)).toEqual({ activeIndex: 2, nextIndex: null });
  });

  it("uses bounds-safe fallback before first and after last timestamps", () => {
    const timeline = createLyricTimeline([
      { startMs: 1_000, text: "intro" },
      { startMs: 4_000, text: "verse" },
    ]);

    expect(getLineIndicesAt(timeline, 10)).toEqual({ activeIndex: 0, nextIndex: 1 });
    expect(getLineIndicesAt(timeline, 20_000)).toEqual({ activeIndex: 1, nextIndex: null });
  });

  it("infers trailing end timestamps when missing", () => {
    const timeline = createLyricTimeline([
      { startMs: 0, text: "first" },
      { startMs: 2_000, text: "second" },
    ]);

    expect(timeline.lines[1]?.endMs).toBe(6_000);
    expect(getLineIndicesAt(timeline, 5_500)).toEqual({ activeIndex: 1, nextIndex: null });
  });
});
