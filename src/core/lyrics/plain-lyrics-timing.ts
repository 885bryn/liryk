import type { ResolvedLyricLine } from "./types";
import { normalizeChineseForDisplay } from "./unicode-normalization";

export function buildPlainLyricsLines(input: { plainLyrics: string }): ResolvedLyricLine[] {
  return input.plainLyrics.split("\n").map((line) => {
    const text = line.replace(/\r$/, "").normalize("NFC");
    return {
      startMs: null,
      text,
      displayText: normalizeChineseForDisplay(text),
      renderMode: "plain-static",
      isTimestamped: false,
    };
  });
}
