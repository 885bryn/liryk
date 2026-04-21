import { describe, expect, it } from "vitest";

import { DEFAULT_CUE_LEAD_MS, applyEarlyCue } from "./early-cue";

describe("applyEarlyCue", () => {
  it("applies configured lead and clamps at zero", () => {
    expect(applyEarlyCue(1_000, 120)).toBe(1_120);
    expect(applyEarlyCue(-300, 120)).toBe(0);
    expect(applyEarlyCue(0, DEFAULT_CUE_LEAD_MS)).toBe(DEFAULT_CUE_LEAD_MS);
  });

  it("keeps progress unchanged when lead is zero or disabled", () => {
    expect(applyEarlyCue(2_345, 0)).toBe(2_345);
    expect(applyEarlyCue(2_345, -80)).toBe(2_345);
  });

  it("preserves monotonic progression across sequential samples", () => {
    const samples = [0, 300, 900, 1_500];
    const cued = samples.map((progressMs) => applyEarlyCue(progressMs, 120));

    expect(cued[0]).toBeLessThanOrEqual(cued[1]);
    expect(cued[1]).toBeLessThanOrEqual(cued[2]);
    expect(cued[2]).toBeLessThanOrEqual(cued[3]);
  });
});
