import { describe, expect, it } from "vitest";

import { LiveSyncStore } from "./live-sync-store";

describe("LiveSyncStore", () => {
  it("starts in idle no-playback state", () => {
    const store = new LiveSyncStore();
    expect(store.selectPlaybackState()).toBe("idle");
    expect(store.selectLiveSync().statusLine).toContain("Play a track");
  });

  it("updates active line, next line, confidence, and playback state", () => {
    const store = new LiveSyncStore();

    store.setPlaybackState("playing");
    store.setTrack("track-1");
    store.setActiveLine(3);
    store.setNextLine(4);
    store.setConfidence("estimated");
    store.setStatusLine("Syncing lyrics...");

    expect(store.selectLiveSync()).toMatchObject({
      playbackState: "playing",
      trackId: "track-1",
      activeLineIndex: 3,
      nextLineIndex: 4,
      confidence: "estimated",
      statusLine: "Syncing lyrics...",
    });
  });

  it("supports paused and unavailable transitions", () => {
    const store = new LiveSyncStore();
    store.setPlaybackState("paused");
    expect(store.selectPlaybackState()).toBe("paused");

    store.setPlaybackState("unavailable");
    store.setStatusLine("Lyrics unavailable for this content.");
    expect(store.selectLiveSync().statusLine).toContain("unavailable");
  });
});
