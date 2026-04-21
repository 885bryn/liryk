export type LyricLine = {
  startMs: number;
  text: string;
  endMs?: number;
};

export type IndexedLyricLine = {
  startMs: number;
  endMs: number;
  text: string;
};

export type LyricTimeline = {
  lines: IndexedLyricLine[];
};

const DEFAULT_TRAILING_DURATION_MS = 4_000;

export function createLyricTimeline(input: LyricLine[]): LyricTimeline {
  const sorted = [...input]
    .filter((line) => Number.isFinite(line.startMs))
    .sort((a, b) => a.startMs - b.startMs);

  const lines: IndexedLyricLine[] = sorted.map((line, index) => {
    const next = sorted[index + 1];
    const inferredEnd = next ? next.startMs : line.startMs + DEFAULT_TRAILING_DURATION_MS;
    const explicitEnd =
      typeof line.endMs === "number" && line.endMs > line.startMs ? line.endMs : undefined;

    return {
      startMs: Math.max(0, Math.floor(line.startMs)),
      endMs: Math.max(Math.floor(explicitEnd ?? inferredEnd), Math.floor(line.startMs) + 1),
      text: line.text,
    };
  });

  return { lines };
}

export function getLineIndicesAt(
  timeline: LyricTimeline,
  progressMs: number,
): { activeIndex: number | null; nextIndex: number | null } {
  if (timeline.lines.length === 0) {
    return { activeIndex: null, nextIndex: null };
  }

  const value = Math.max(0, Math.floor(progressMs));
  let low = 0;
  let high = timeline.lines.length - 1;
  let active = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const line = timeline.lines[mid];
    if (!line) {
      break;
    }

    if (line.startMs <= value) {
      active = mid;
      low = mid + 1;
      continue;
    }

    high = mid - 1;
  }

  if (active === -1) {
    return { activeIndex: null, nextIndex: 0 };
  }

  const next = active + 1 < timeline.lines.length ? active + 1 : null;
  return { activeIndex: active, nextIndex: next };
}
