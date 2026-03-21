import { describe, expect, it } from "vitest";

import { estimatePlaybackProgressMs } from "./playback-clock";
import type { PlaybackClockAnchor } from "./types";

function anchor(overrides: Partial<PlaybackClockAnchor> = {}): PlaybackClockAnchor {
  return {
    trackId: "track-1",
    deviceId: "device-a",
    isPlaying: true,
    progressMs: 10_000,
    sourceCapturedAtMs: 1_000,
    capturedAtPerfMs: 500,
    ...overrides,
  };
}

describe("playback clock", () => {
  it("adds monotonic elapsed time while playing", () => {
    const progressMs = estimatePlaybackProgressMs(anchor(), 1_250);
    expect(progressMs).toBe(10_750);
  });

  it("freezes progress when paused", () => {
    const pausedAnchor = anchor({ isPlaying: false, progressMs: 33_000, capturedAtPerfMs: 2_000 });
    const progressMs = estimatePlaybackProgressMs(pausedAnchor, 20_000);
    expect(progressMs).toBe(33_000);
  });

  it("clamps negative elapsed deltas to anchor progress", () => {
    const anchored = anchor({ progressMs: 8_000, capturedAtPerfMs: 9_000 });
    const progressMs = estimatePlaybackProgressMs(anchored, 8_000);
    expect(progressMs).toBe(8_000);
  });
});
