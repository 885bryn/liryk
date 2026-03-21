import { describe, expect, it } from "vitest";

import type { PlaybackSnapshot } from "../playback/types";
import { createLyricSyncEngine } from "./lyric-sync-engine";

function snapshot(overrides: Partial<PlaybackSnapshot> = {}): PlaybackSnapshot {
  return {
    trackId: "track-1",
    deviceId: "device-a",
    isPlaying: true,
    progressMs: 1_000,
    capturedAtMs: 1_000,
    ...overrides,
  };
}

describe("lyric sync engine", () => {
  it("estimates progress while playing and freezes on pause", () => {
    let now = 100;
    const engine = createLyricSyncEngine({ nowPerfMs: () => now });
    engine.setTimeline([
      { startMs: 0, text: "a" },
      { startMs: 1_500, text: "b" },
      { startMs: 3_000, text: "c" },
    ]);

    engine.reanchor({ snapshot: snapshot({ progressMs: 1_000, isPlaying: true }), transition: "no_change" });
    now = 700;
    expect(engine.estimateFrame().progressMs).toBe(1_600);

    engine.reanchor({
      snapshot: snapshot({ progressMs: 1_700, isPlaying: false, capturedAtMs: 1_200 }),
      transition: "paused",
    });
    now = 2_000;
    expect(engine.estimateFrame().progressMs).toBe(1_700);
  });

  it("snaps immediately on seek and updates active line", () => {
    const engine = createLyricSyncEngine({ nowPerfMs: () => 1_000 });
    engine.setTimeline([
      { startMs: 0, text: "a" },
      { startMs: 10_000, text: "b" },
      { startMs: 20_000, text: "c" },
    ]);

    engine.reanchor({ snapshot: snapshot({ progressMs: 500 }), transition: "no_change" });
    engine.reanchor({ snapshot: snapshot({ progressMs: 20_500, capturedAtMs: 2_000 }), transition: "seeked" });

    const frame = engine.estimateFrame();
    expect(frame.activeLineIndex).toBe(2);
    expect(frame.confidence).toBe("synced");
  });

  it("marks confidence as estimated on minor drift corrections", () => {
    let now = 1_000;
    const engine = createLyricSyncEngine({ nowPerfMs: () => now });
    engine.setTimeline([
      { startMs: 0, text: "a" },
      { startMs: 1_000, text: "b" },
      { startMs: 2_000, text: "c" },
    ]);

    engine.reanchor({ snapshot: snapshot({ progressMs: 1_000 }), transition: "no_change" });
    now = 1_500;
    engine.reanchor({ snapshot: snapshot({ progressMs: 1_950, capturedAtMs: 1_300 }), transition: "no_change" });

    expect(engine.estimateFrame().confidence).toBe("estimated");
  });

  it("propagates resolver indices for pre-first progress and dense boundaries", () => {
    let now = 1_000;
    const engine = createLyricSyncEngine({ nowPerfMs: () => now });
    engine.setTimeline([
      { startMs: 1_000, text: "intro" },
      { startMs: 1_250, text: "pickup" },
      { startMs: 1_500, text: "line" },
    ]);

    engine.reanchor({ snapshot: snapshot({ progressMs: 900 }), transition: "no_change" });
    expect(engine.estimateFrame()).toMatchObject({
      activeLineIndex: null,
      nextLineIndex: 0,
    });

    engine.reanchor({ snapshot: snapshot({ progressMs: 1_250, capturedAtMs: 1_100 }), transition: "no_change" });
    expect(engine.estimateFrame()).toMatchObject({
      activeLineIndex: 1,
      nextLineIndex: 2,
    });

    now = 1_300;
    engine.reanchor({ snapshot: snapshot({ progressMs: 1_500, capturedAtMs: 1_200 }), transition: "no_change" });
    expect(engine.estimateFrame()).toMatchObject({
      activeLineIndex: 2,
      nextLineIndex: null,
    });
  });

  it("ignores stale snapshots during rapid races", () => {
    const engine = createLyricSyncEngine({ nowPerfMs: () => 1_000 });
    engine.setTimeline([
      { startMs: 0, text: "a" },
      { startMs: 5_000, text: "b" },
    ]);

    engine.reanchor({ snapshot: snapshot({ progressMs: 6_000, capturedAtMs: 3_000 }), transition: "no_change" });
    engine.reanchor({ snapshot: snapshot({ progressMs: 1_000, capturedAtMs: 2_000 }), transition: "seeked" });

    expect(engine.estimateFrame().progressMs).toBe(6_000);
  });
});
