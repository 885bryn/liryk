import { describe, expect, it } from "vitest";

import { classifyPlaybackTransition } from "./playback-transition";
import type { PlaybackSnapshot } from "./types";

function snapshot(overrides: Partial<PlaybackSnapshot> = {}): PlaybackSnapshot {
  return {
    trackId: "track-1",
    deviceId: "device-a",
    isPlaying: true,
    progressMs: 10_000,
    capturedAtMs: 1_000,
    ...overrides,
  };
}

describe("classifyPlaybackTransition", () => {
  it("returns no_change when no previous snapshot exists", () => {
    const next = snapshot();
    expect(classifyPlaybackTransition(null, next)).toBe("no_change");
  });

  it("classifies paused and resumed transitions", () => {
    const previous = snapshot({ isPlaying: true, progressMs: 20_000, capturedAtMs: 2_000 });
    const paused = snapshot({ isPlaying: false, progressMs: 20_100, capturedAtMs: 2_100 });
    const resumed = snapshot({ isPlaying: true, progressMs: 20_100, capturedAtMs: 2_200 });

    expect(classifyPlaybackTransition(previous, paused)).toBe("paused");
    expect(classifyPlaybackTransition(paused, resumed)).toBe("resumed");
  });

  it("classifies seeked when progress jumps beyond threshold", () => {
    const previous = snapshot({ progressMs: 4_000, capturedAtMs: 1_000 });
    const seeked = snapshot({ progressMs: 9_500, capturedAtMs: 2_000 });

    expect(classifyPlaybackTransition(previous, seeked)).toBe("seeked");
  });

  it("does not classify minor jitter as seeked", () => {
    const previous = snapshot({ progressMs: 4_000, capturedAtMs: 1_000 });
    const jittered = snapshot({ progressMs: 5_400, capturedAtMs: 2_000 });

    expect(classifyPlaybackTransition(previous, jittered)).toBe("no_change");
  });

  it("classifies track and device changes", () => {
    const previous = snapshot();

    expect(classifyPlaybackTransition(previous, snapshot({ trackId: "track-2" }))).toBe("track_changed");
    expect(classifyPlaybackTransition(previous, snapshot({ deviceId: "device-b" }))).toBe(
      "device_changed",
    );
  });

  it("remains deterministic for rapid updates", () => {
    const first = snapshot({ progressMs: 1_000, capturedAtMs: 1_000 });
    const second = snapshot({ progressMs: 2_000, capturedAtMs: 2_000 });
    const third = snapshot({ progressMs: 3_050, capturedAtMs: 3_000 });

    expect(classifyPlaybackTransition(first, second)).toBe("no_change");
    expect(classifyPlaybackTransition(second, third)).toBe("no_change");
  });
});
