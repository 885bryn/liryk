import { describe, expect, it } from "vitest";

import {
  DEFAULT_MAX_TRANSITION_MS,
  DEFAULT_MIN_TRANSITION_MS,
  DEFAULT_TRANSITION_WINDOW_FRACTION,
  easeInOutCubic,
  getAdaptiveTransitionMs,
  getTargetScrollOffset,
  getTransitionPhase,
} from "./lyric-motion-window";

describe("easeInOutCubic", () => {
  it("returns exact boundary values for 0 and 1", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it("stays within 0..1 for representative in-range values", () => {
    const outputs = [0.1, 0.25, 0.5, 0.75, 0.9].map((value) => easeInOutCubic(value));
    for (const output of outputs) {
      expect(output).toBeGreaterThanOrEqual(0);
      expect(output).toBeLessThanOrEqual(1);
    }
  });

  it("is monotonic increasing without overshoot", () => {
    const samples = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1].map((value) => easeInOutCubic(value));
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...samples)).toBeLessThanOrEqual(1);
  });
});

describe("getAdaptiveTransitionMs", () => {
  it("exports readable default transition tuning constants", () => {
    expect(DEFAULT_TRANSITION_WINDOW_FRACTION).toBe(0.42);
    expect(DEFAULT_MIN_TRANSITION_MS).toBe(220);
    expect(DEFAULT_MAX_TRANSITION_MS).toBe(520);
  });

  it("returns floor(gap * fraction) clamped to min/max bounds", () => {
    expect(getAdaptiveTransitionMs(1_000)).toBe(420);
    expect(getAdaptiveTransitionMs(2_000)).toBe(520);
    expect(getAdaptiveTransitionMs(400)).toBe(220);
    expect(getAdaptiveTransitionMs(1_000, 100, 300, 0.5)).toBe(300);
  });

  it("clamps very short and very long gaps to readable default bounds", () => {
    expect(getAdaptiveTransitionMs(100)).toBe(DEFAULT_MIN_TRANSITION_MS);
    expect(getAdaptiveTransitionMs(50_000)).toBe(DEFAULT_MAX_TRANSITION_MS);
  });

  it("returns min bound for invalid and very small gaps", () => {
    expect(getAdaptiveTransitionMs(Number.NaN)).toBe(220);
    expect(getAdaptiveTransitionMs(-50)).toBe(220);
    expect(getAdaptiveTransitionMs(10)).toBe(220);
  });
});

describe("getTransitionPhase", () => {
  it("resolves hold, transition, and complete around transition boundaries", () => {
    const hold = getTransitionPhase({
      progressMs: 1_579,
      currentStartMs: 1_000,
      nextStartMs: 2_000,
    });
    expect(hold.phase).toBe("hold");
    expect(hold.phaseProgress).toBe(0);
    expect(hold.transitionStartMs).toBe(1_580);
    expect(hold.transitionDurationMs).toBe(420);

    const transitionStart = getTransitionPhase({
      progressMs: 1_580,
      currentStartMs: 1_000,
      nextStartMs: 2_000,
    });
    expect(transitionStart.phase).toBe("transition");
    expect(transitionStart.phaseProgress).toBe(0);

    const transitionMid = getTransitionPhase({
      progressMs: 1_790,
      currentStartMs: 1_000,
      nextStartMs: 2_000,
    });
    expect(transitionMid.phase).toBe("transition");
    expect(transitionMid.phaseProgress).toBe(0.5);

    const complete = getTransitionPhase({
      progressMs: 2_000,
      currentStartMs: 1_000,
      nextStartMs: 2_000,
    });
    expect(complete.phase).toBe("complete");
    expect(complete.phaseProgress).toBe(1);
  });

  it("returns eased phaseProgress during transition instead of raw linear ratio", () => {
    const transitionMid = getTransitionPhase({
      progressMs: 1_685,
      currentStartMs: 1_000,
      nextStartMs: 2_000,
    });

    expect(transitionMid.phase).toBe("transition");
    expect(transitionMid.phaseProgress).toBeCloseTo(0.0625, 6);
    expect(transitionMid.phaseProgress).not.toBeCloseTo(0.25, 6);
  });
});

describe("getTargetScrollOffset", () => {
  it("returns exact current-line offset during hold", () => {
    expect(
      getTargetScrollOffset({
        currentIndex: 2,
        nextIndex: 3,
        phase: "hold",
        phaseProgress: 0.4,
        stepPx: 88,
      }),
    ).toBe(-176);
  });

  it("returns bounded interpolated offset during transition", () => {
    const offset = getTargetScrollOffset({
      currentIndex: 2,
      nextIndex: 3,
      phase: "transition",
      phaseProgress: 0.25,
      stepPx: 88,
    });

    expect(offset).toBeCloseTo(-198, 6);
    expect(offset).toBeLessThan(-176);
    expect(offset).toBeGreaterThan(-264);
  });

  it("returns exact next-line offset at complete", () => {
    expect(
      getTargetScrollOffset({
        currentIndex: 2,
        nextIndex: 3,
        phase: "complete",
        phaseProgress: 0.45,
        stepPx: 88,
      }),
    ).toBe(-264);
  });

  it("keeps stable current offset when next index is null across phases", () => {
    const hold = getTargetScrollOffset({
      currentIndex: 4,
      nextIndex: null,
      phase: "hold",
      phaseProgress: 0,
      stepPx: 88,
    });
    const transition = getTargetScrollOffset({
      currentIndex: 4,
      nextIndex: null,
      phase: "transition",
      phaseProgress: 0.67,
      stepPx: 88,
    });
    const complete = getTargetScrollOffset({
      currentIndex: 4,
      nextIndex: null,
      phase: "complete",
      phaseProgress: 1,
      stepPx: 88,
    });

    expect(hold).toBe(-352);
    expect(transition).toBe(-352);
    expect(complete).toBe(-352);
  });
});
