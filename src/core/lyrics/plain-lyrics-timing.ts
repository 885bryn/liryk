import type { ResolvedLyricLine } from "./types";

export function buildPlainLyricsLines(input: { plainLyrics: string }): ResolvedLyricLine[] {
  return input.plainLyrics.split("\n").map((line) => ({
    startMs: null,
    text: line.replace(/\r$/, "").normalize("NFC"),
    renderMode: "plain-static",
    isTimestamped: false,
  }));
}
