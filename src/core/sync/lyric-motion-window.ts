export type TransitionPhase = "hold" | "transition" | "complete";

export const DEFAULT_TRANSITION_WINDOW_FRACTION = 0.55;
export const DEFAULT_MIN_TRANSITION_MS = 280;
export const DEFAULT_MAX_TRANSITION_MS = 760;
export const SHORT_GAP_MS = 900;
export const MIN_ROW_GAP_PX = 10;
export const BASE_ROW_GAP_PX = 16;
export const MAX_ROW_GAP_PX = 26;

export type RowLayout = {
  heights: number[];
  offsets: number[];
  centers: number[];
  totalHeight: number;
};

function normalizeNonNegativeInt(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

function normalizeNonNegativeNumber(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function easeInOutCubic(progress: number): number {
  const normalized = clamp(progress, 0, 1);

  if (normalized < 0.5) {
    return 4 * normalized * normalized * normalized;
  }

  const shifted = -2 * normalized + 2;
  return 1 - (shifted * shifted * shifted) / 2;
}

export function easeInOutExpo(progress: number): number {
  const normalized = clamp(progress, 0, 1);
  if (normalized === 0) {
    return 0;
  }
  if (normalized === 1) {
    return 1;
  }

  if (normalized < 0.5) {
    return Math.pow(2, 20 * normalized - 10) / 2;
  }

  return (2 - Math.pow(2, -20 * normalized + 10)) / 2;
}

function getTransitionBounds(
  minTransitionMs: number | undefined,
  maxTransitionMs: number | undefined,
): { minMs: number; maxMs: number } {
  const minMs = normalizeNonNegativeInt(minTransitionMs ?? DEFAULT_MIN_TRANSITION_MS, 0);
  const maxMsCandidate = normalizeNonNegativeInt(maxTransitionMs ?? DEFAULT_MAX_TRANSITION_MS, minMs);
  return {
    minMs,
    maxMs: Math.max(minMs, maxMsCandidate),
  };
}

function getTransitionFraction(transitionFraction: number | undefined): number {
  if (!Number.isFinite(transitionFraction) || (transitionFraction as number) <= 0) {
    return DEFAULT_TRANSITION_WINDOW_FRACTION;
  }

  return transitionFraction as number;
}

export function getAdaptiveTransitionMs(
  gapMs: number,
  minTransitionMs: number = DEFAULT_MIN_TRANSITION_MS,
  maxTransitionMs: number = DEFAULT_MAX_TRANSITION_MS,
  transitionFraction: number = DEFAULT_TRANSITION_WINDOW_FRACTION,
): number {
  const { minMs, maxMs } = getTransitionBounds(minTransitionMs, maxTransitionMs);
  const normalizedGapMs = normalizeNonNegativeInt(gapMs, 0);

  if (normalizedGapMs <= 0) {
    return minMs;
  }

  const fraction = getTransitionFraction(transitionFraction);
  const rawDurationMs = Math.floor(normalizedGapMs * fraction);
  return clamp(rawDurationMs, minMs, maxMs);
}

export function getTransitionPhase(input: {
  progressMs: number;
  currentStartMs: number;
  nextStartMs: number;
  minTransitionMs?: number;
  maxTransitionMs?: number;
  transitionFraction?: number;
}): {
  phase: TransitionPhase;
  phaseProgress: number;
  transitionStartMs: number;
  transitionDurationMs: number;
  gapMs: number;
  isShortGap: boolean;
} {
  const result = getTransitionProgress(input);
  return {
    phase: result.phase,
    phaseProgress: result.easedProgress,
    transitionStartMs: result.transitionStartMs,
    transitionDurationMs: result.transitionDurationMs,
    gapMs: result.gapMs,
    isShortGap: result.isShortGap,
  };
}

export function getTransitionProgress(input: {
  progressMs: number;
  currentStartMs: number;
  nextStartMs: number;
  minTransitionMs?: number;
  maxTransitionMs?: number;
  transitionFraction?: number;
}): {
  phase: TransitionPhase;
  progress: number;
  easedProgress: number;
  transitionStartMs: number;
  transitionDurationMs: number;
  gapMs: number;
  isShortGap: boolean;
} {
  const progressMs = normalizeNonNegativeInt(input.progressMs, 0);
  const currentStartMs = normalizeNonNegativeInt(input.currentStartMs, 0);
  const rawNextStartMs = normalizeNonNegativeInt(input.nextStartMs, currentStartMs + 1);
  const nextStartMs = Math.max(rawNextStartMs, currentStartMs + 1);
  const gapMs = nextStartMs - currentStartMs;

  const transitionDurationMs = getAdaptiveTransitionMs(
    gapMs,
    input.minTransitionMs,
    input.maxTransitionMs,
    input.transitionFraction,
  );
  const transitionStartMs = Math.max(currentStartMs, nextStartMs - transitionDurationMs);

  if (progressMs >= nextStartMs) {
    return {
      phase: "complete",
      progress: 1,
      easedProgress: 1,
      transitionStartMs,
      transitionDurationMs,
      gapMs,
      isShortGap: gapMs <= SHORT_GAP_MS,
    };
  }

  if (progressMs < transitionStartMs) {
    return {
      phase: "hold",
      progress: 0,
      easedProgress: 0,
      transitionStartMs,
      transitionDurationMs,
      gapMs,
      isShortGap: gapMs <= SHORT_GAP_MS,
    };
  }

  const denominator = Math.max(1, transitionDurationMs);
  const progress = clamp((progressMs - transitionStartMs) / denominator, 0, 1);
  const easedProgress = easeInOutExpo(progress);
  return {
    phase: "transition",
    progress,
    easedProgress,
    transitionStartMs,
    transitionDurationMs,
    gapMs,
    isShortGap: gapMs <= SHORT_GAP_MS,
  };
}

export function getFloatingIndex(input: {
  currentIndex: number;
  nextIndex: number | null;
  phase: TransitionPhase;
  easedProgress: number;
}): number {
  const currentIndex = normalizeNonNegativeInt(input.currentIndex, 0);
  if (input.nextIndex === null || input.phase !== "transition") {
    return currentIndex;
  }

  const nextIndex = Math.max(currentIndex, normalizeNonNegativeInt(input.nextIndex, currentIndex));
  const delta = nextIndex - currentIndex;
  return currentIndex + delta * clamp(input.easedProgress, 0, 1);
}

export function getLineVisualState(lineIndex: number, floatingIndex: number): {
  distance: number;
  opacity: number;
  scale: number;
  blurPx: number;
  colorAlpha: number;
  brightness: number;
} {
  return getLineFocusMetrics(lineIndex, floatingIndex);
}

export function getLineFocusMetrics(lineIndex: number, floatingIndex: number): {
  distance: number;
  opacity: number;
  scale: number;
  blurPx: number;
  colorAlpha: number;
  brightness: number;
} {
  const distance = Math.abs(normalizeNonNegativeInt(lineIndex, 0) - Math.max(0, floatingIndex));
  const influence = Math.exp(-0.9 * distance * distance);
  const opacity = clamp(0.32 + 0.68 * influence, 0.32, 1);
  const scale = clamp(0.92 + 0.08 * influence, 0.92, 1);
  const blurPx = clamp((1 - influence) * 0.85, 0, 0.85);
  const colorAlpha = clamp(0.5 + 0.5 * influence, 0.5, 1);
  const brightness = clamp(0.86 + 0.18 * influence, 0.86, 1.04);
  return {
    distance,
    opacity,
    scale,
    blurPx,
    colorAlpha,
    brightness,
  };
}

export function getRenderedFloatingIndex(input: {
  targetFloatingIndex: number;
  previousRenderedFloatingIndex: number;
  deltaMs?: number;
  smoothingMs?: number;
}): number {
  const target = Math.max(0, input.targetFloatingIndex);
  const previous = Math.max(0, input.previousRenderedFloatingIndex);
  const deltaMs = clamp(input.deltaMs ?? 16, 0, 64);
  const smoothingMs = Math.max(20, input.smoothingMs ?? 84);
  const alpha = 1 - Math.exp(-deltaMs / smoothingMs);
  return previous + (target - previous) * alpha;
}

export function buildRowLayout(
  rowHeights: number[],
  inputGapPx: number = BASE_ROW_GAP_PX,
  minGapPx: number = MIN_ROW_GAP_PX,
  maxGapPx: number = MAX_ROW_GAP_PX,
): RowLayout {
  const gapPx = clamp(inputGapPx, minGapPx, maxGapPx);
  const heights = rowHeights.map((height) => Math.max(1, normalizeNonNegativeNumber(height, 1)));
  const offsets: number[] = [];
  const centers: number[] = [];

  let cursor = 0;
  for (let index = 0; index < heights.length; index += 1) {
    const height = heights[index] ?? 1;
    offsets[index] = cursor;
    centers[index] = cursor + height / 2;
    cursor += height;
    if (index < heights.length - 1) {
      cursor += gapPx;
    }
  }

  return {
    heights,
    offsets,
    centers,
    totalHeight: cursor,
  };
}

export function getFloatingRowAnchorPx(layout: RowLayout, floatingIndex: number): number {
  if (layout.centers.length === 0) {
    return 0;
  }

  const clampedIndex = clamp(floatingIndex, 0, layout.centers.length - 1);
  const lower = Math.floor(clampedIndex);
  const upper = Math.min(layout.centers.length - 1, lower + 1);
  const fraction = clampedIndex - lower;
  const lowerCenter = layout.centers[lower] ?? 0;
  const upperCenter = layout.centers[upper] ?? lowerCenter;
  return lowerCenter + (upperCenter - lowerCenter) * fraction;
}

export function getTargetScrollOffset(input: {
  currentIndex: number;
  nextIndex: number | null;
  phaseProgress: number;
  phase: TransitionPhase;
  stepPx: number;
}): number {
  const currentIndex = normalizeNonNegativeInt(input.currentIndex, 0);
  const currentOffsetPx = -currentIndex * input.stepPx;

  if (input.nextIndex === null) {
    return currentOffsetPx;
  }

  const nextIndex = Math.max(currentIndex, normalizeNonNegativeInt(input.nextIndex, currentIndex));
  const nextOffsetPx = -nextIndex * input.stepPx;

  if (input.phase === "complete") {
    return nextOffsetPx;
  }

  if (input.phase !== "transition") {
    return currentOffsetPx;
  }

  const progress = clamp(input.phaseProgress, 0, 1);
  return currentOffsetPx + (nextOffsetPx - currentOffsetPx) * progress;
}
