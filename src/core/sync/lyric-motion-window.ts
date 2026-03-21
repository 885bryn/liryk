export type TransitionPhase = "hold" | "transition" | "complete";

export const DEFAULT_TRANSITION_WINDOW_FRACTION = 0.42;
export const DEFAULT_MIN_TRANSITION_MS = 220;
export const DEFAULT_MAX_TRANSITION_MS = 520;

function normalizeNonNegativeInt(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
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
      phaseProgress: 1,
      transitionStartMs,
      transitionDurationMs,
    };
  }

  if (progressMs < transitionStartMs) {
    return {
      phase: "hold",
      phaseProgress: 0,
      transitionStartMs,
      transitionDurationMs,
    };
  }

  const denominator = Math.max(1, transitionDurationMs);
  const phaseProgress = easeInOutCubic(clamp((progressMs - transitionStartMs) / denominator, 0, 1));
  return {
    phase: "transition",
    phaseProgress,
    transitionStartMs,
    transitionDurationMs,
  };
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
