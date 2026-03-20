import { describe, expect, it } from "vitest";

import { parseLrc } from "./lrc-parser";

describe("parseLrc", () => {
  it("parses xx and xxx timestamps into ascending startMs", () => {
    const input = "[00:12.34]Cafe\u0301\n[00:14.345]Second";

    expect(parseLrc(input)).toEqual([
      {
        startMs: 12_340,
        text: "Caf\u00e9",
        renderMode: "synced",
        isTimestamped: true,
      },
      {
        startMs: 14_345,
        text: "Second",
        renderMode: "synced",
        isTimestamped: true,
      },
    ]);
  });

  it("preserves blank timestamp lines, skips invalid rows, and keeps duplicate order", () => {
    const input = [
      "[00:01.00]first",
      "[00:01.00]",
      "[oops]bad",
      "[00:01.000]third",
      "[00:00.50]intro",
    ].join("\n");

    expect(parseLrc(input)).toEqual([
      { startMs: 500, text: "intro", renderMode: "synced", isTimestamped: true },
      { startMs: 1_000, text: "first", renderMode: "synced", isTimestamped: true },
      { startMs: 1_000, text: "", renderMode: "synced", isTimestamped: true },
      { startMs: 1_000, text: "third", renderMode: "synced", isTimestamped: true },
    ]);
  });
});
