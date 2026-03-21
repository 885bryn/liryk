import { describe, expect, it, vi } from "vitest";

import type { PlaybackSnapshot } from "../core/playback/types";
import { createPlaybackRuntime } from "./playback-runtime";

function snapshot(overrides: Partial<PlaybackSnapshot> = {}): PlaybackSnapshot {
  return {
    trackId: "track-1",
    deviceId: "device-a",
    isPlaying: true,
    progressMs: 20_000,
    capturedAtMs: 1_000,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("createPlaybackRuntime", () => {
  it("classifies pause, resume, seek, and track change transitions", async () => {
    const queue = [
      snapshot({ isPlaying: true, progressMs: 10_000, capturedAtMs: 1_000 }),
      snapshot({ isPlaying: false, progressMs: 10_050, capturedAtMs: 1_100 }),
      snapshot({ isPlaying: true, progressMs: 10_050, capturedAtMs: 1_200 }),
      snapshot({ isPlaying: true, progressMs: 40_000, capturedAtMs: 1_300 }),
      snapshot({ trackId: "track-2", progressMs: 200, capturedAtMs: 1_400 }),
    ];

    const runtime = createPlaybackRuntime({
      fetchCurrentPlayback: vi.fn(async () => queue.shift() ?? null),
      setTimeoutFn: vi.fn(() => 0 as unknown as ReturnType<typeof setTimeout>),
      clearTimeoutFn: vi.fn(),
    });

    const transitions: string[] = [];
    runtime.subscribe((event) => {
      transitions.push(event.transition);
    });

    await runtime.pollNow();
    await runtime.pollNow();
    await runtime.pollNow();
    await runtime.pollNow();
    await runtime.pollNow();

    expect(transitions).toEqual(["no_change", "paused", "resumed", "seeked", "track_changed"]);
  });

  it("drops stale async responses so newest playback snapshot wins", async () => {
    const first = deferred<PlaybackSnapshot | null>();
    const second = deferred<PlaybackSnapshot | null>();

    const fetchCurrentPlayback = vi
      .fn<() => Promise<PlaybackSnapshot | null>>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const runtime = createPlaybackRuntime({
      fetchCurrentPlayback,
      setTimeoutFn: vi.fn(() => 0 as unknown as ReturnType<typeof setTimeout>),
      clearTimeoutFn: vi.fn(),
    });

    const seen: PlaybackSnapshot[] = [];
    runtime.subscribe((event) => {
      if (event.snapshot) {
        seen.push(event.snapshot);
      }
    });

    const pendingA = runtime.pollNow();
    const pendingB = runtime.pollNow();

    second.resolve(snapshot({ progressMs: 8_000, capturedAtMs: 2_000 }));
    await pendingB;

    first.resolve(snapshot({ progressMs: 4_000, capturedAtMs: 1_000 }));
    await pendingA;

    expect(seen).toHaveLength(1);
    expect(seen[0]?.progressMs).toBe(8_000);
    expect(runtime.getLatestSnapshot()?.capturedAtMs).toBe(2_000);
  });

  it("ignores late lower-capturedAt completions even after a newer snapshot was emitted", async () => {
    const first = deferred<PlaybackSnapshot | null>();
    const second = deferred<PlaybackSnapshot | null>();

    const fetchCurrentPlayback = vi
      .fn<() => Promise<PlaybackSnapshot | null>>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const runtime = createPlaybackRuntime({
      fetchCurrentPlayback,
      setTimeoutFn: vi.fn(() => 0 as unknown as ReturnType<typeof setTimeout>),
      clearTimeoutFn: vi.fn(),
    });

    const seen: PlaybackSnapshot[] = [];
    runtime.subscribe((event) => {
      if (event.snapshot) {
        seen.push(event.snapshot);
      }
    });

    const pendingA = runtime.pollNow();
    const pendingB = runtime.pollNow();

    second.resolve(snapshot({ progressMs: 12_000, capturedAtMs: 3_000 }));
    await pendingB;

    first.resolve(snapshot({ progressMs: 9_000, capturedAtMs: 2_000 }));
    await pendingA;

    expect(seen).toHaveLength(1);
    expect(runtime.getLatestSnapshot()).toMatchObject({ capturedAtMs: 3_000, progressMs: 12_000 });
  });

  it("ignores same-timestamp lower progress updates", async () => {
    const runtime = createPlaybackRuntime({
      fetchCurrentPlayback: vi
        .fn<() => Promise<PlaybackSnapshot | null>>()
        .mockResolvedValueOnce(snapshot({ capturedAtMs: 5_000, progressMs: 9_000 }))
        .mockResolvedValueOnce(snapshot({ capturedAtMs: 5_000, progressMs: 8_000 })),
      setTimeoutFn: vi.fn(() => 0 as unknown as ReturnType<typeof setTimeout>),
      clearTimeoutFn: vi.fn(),
    });

    const seen: PlaybackSnapshot[] = [];
    runtime.subscribe((event) => {
      if (event.snapshot) {
        seen.push(event.snapshot);
      }
    });

    await runtime.pollNow();
    await runtime.pollNow();

    expect(seen).toHaveLength(1);
    expect(runtime.getLatestSnapshot()).toMatchObject({ capturedAtMs: 5_000, progressMs: 9_000 });
  });
});
