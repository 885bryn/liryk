import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../auth/now-playing", async () => {
  const actual = await vi.importActual<typeof import("../auth/now-playing")>("../auth/now-playing");
  return {
    ...actual,
    fetchWebNowPlaying: vi.fn(),
  };
});

import { fetchWebNowPlaying, SpotifyPlaybackError } from "../auth/now-playing";

import {
  getSharedPlaybackState,
  resetSharedPlaybackRuntimeForTests,
  subscribeSharedPlayback,
} from "./shared-playback-runtime";

describe("shared-playback-runtime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSharedPlaybackRuntimeForTests();
    vi.mocked(fetchWebNowPlaying).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears stale playback state when Spotify returns unauthorized for an active poller", async () => {
    vi.mocked(fetchWebNowPlaying)
      .mockResolvedValueOnce({
        trackId: "track-a",
        title: "Song A",
        artist: "Artist A",
        isPlaying: true,
        progressMs: 1_000,
        capturedAtMs: 10_000,
      })
      .mockRejectedValueOnce(new SpotifyPlaybackError(401));

    const unsubscribe = subscribeSharedPlayback({
      subscriberId: "sub-1",
      source: "test",
      accessToken: "token-a",
      listener: () => undefined,
    });

    await vi.advanceTimersByTimeAsync(0);

    expect(getSharedPlaybackState().nowPlaying?.trackId).toBe("track-a");
    expect(getSharedPlaybackState().playbackSnapshot?.trackId).toBe("track-a");

    await vi.advanceTimersByTimeAsync(4_000);

    expect(getSharedPlaybackState().nowPlaying).toBeNull();
    expect(getSharedPlaybackState().playbackSnapshot).toBeNull();
    expect(getSharedPlaybackState().pollerId).toBeNull();

    unsubscribe();
  });
});
