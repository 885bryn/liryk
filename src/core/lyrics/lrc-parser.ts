import type { ResolvedLyricLine } from "./types";

const TIMESTAMP_ROW = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/;

type ParsedRow = {
  index: number;
  startMs: number;
  text: string;
};

function parseStartMs(mm: string, ss: string, fraction: string): number {
  return Number(mm) * 60_000 + Number(ss) * 1_000 + Number(fraction.padEnd(3, "0"));
}

export function parseLrc(input: string): ResolvedLyricLine[] {
  const parsed: ParsedRow[] = input
    .split(/\r?\n/)
    .map((raw, index) => {
      const match = raw.match(TIMESTAMP_ROW);
      if (!match) {
        return null;
      }

      const [, mm, ss, fraction, text] = match;
      return {
        index,
        startMs: parseStartMs(mm, ss, fraction),
        text: text.normalize("NFC"),
      };
    })
    .filter((row): row is ParsedRow => row !== null)
    .sort((a, b) => (a.startMs === b.startMs ? a.index - b.index : a.startMs - b.startMs));

  return parsed.map((row) => ({
    startMs: row.startMs,
    text: row.text,
    renderMode: "synced",
    isTimestamped: true,
  }));
}
