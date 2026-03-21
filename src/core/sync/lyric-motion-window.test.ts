import { describe, expect, it } from "vitest";

import { getAdaptiveTransitionMs, getTransitionPhase } from "./lyric-motion-window";

describe("getAdaptiveTransitionMs", () => {
  it("returns floor(gap * fraction) clamped to min/max bounds", () => {
    expect(getAdaptiveTransitionMs(1_000)).toBe(420);
    expect(getAdaptiveTransitionMs(2_000)).toBe(520);
    expect(getAdaptiveTransitionMs(400)).toBe(220);
    expect(getAdaptiveTransitionMs(1_000, 100, 300, 0.5)).toBe(300);
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
});
