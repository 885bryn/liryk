import { describe, expect, it } from "vitest";

import { AuthStore } from "./auth-store";

describe("AuthStore", () => {
  it("exposes deterministic disconnected and authorizing states", () => {
    const store = new AuthStore();

    expect(store.selectUiState().status).toBe("disconnected");
    expect(store.startAuth().status).toBe("authorizing");
  });

  it("stores connected waiting state with exact waiting copy and account identity", () => {
    const store = new AuthStore();
    store.authorizeSuccess({ displayName: "Taylor", spotifyUserId: "user-123" });

    const waiting = store.setConnectedWaitingPlayback({
      displayName: "Taylor",
      spotifyUserId: "user-123",
    });

    expect(waiting).toMatchObject({
      status: "connected_waiting_playback",
      waitingMessage: "Connected - play a track on Spotify",
      accountDisplay: {
        displayName: "Taylor",
        spotifyUserId: "user-123",
      },
    });
    expect(store.selectAccountDisplay()).toEqual({
      displayName: "Taylor",
      spotifyUserId: "user-123",
    });
  });

  it("tracks recoverable errors with user-facing reason, retry eligibility, and troubleshooting threshold", () => {
    const store = new AuthStore();

    const first = store.setRecoverableError({ reason: "network", retryEligible: true, autoRetryInMs: 1500 });
    const third = store.setRecoverableError({ reason: "rate-limit", retryEligible: true, autoRetryInMs: 2500 });

    expect(first).toMatchObject({
      status: "recoverable_error",
      reason: "network",
      retryEligible: true,
      autoRetryInMs: 1500,
      troubleshootingSuggested: false,
      attempts: 1,
    });
    expect(first.userFacingReason).toContain("Network connection");

    expect(third).toMatchObject({
      status: "recoverable_error",
      reason: "rate-limit",
      troubleshootingSuggested: false,
      attempts: 2,
    });

    const escalated = store.setRecoverableError({ reason: "timeout", retryEligible: true });
    expect(escalated.troubleshootingSuggested).toBe(true);
    expect(escalated.attempts).toBe(3);
  });

  it("maps service lifecycle states into UI contract states", () => {
    const store = new AuthStore();

    const authorizing = store.syncFromLifecycle({
      lifecycle: {
        status: "authorizing",
        requestId: "abc",
        authorizeUrl: "https://spotify.com",
        startedAtMs: 1,
      },
      hasPlayback: false,
    });

    const waiting = store.syncFromLifecycle({
      lifecycle: {
        status: "connected",
        connectedAtMs: 1,
        grantedScopes: ["user-read-playback-state"],
        hasRefreshToken: true,
      },
      hasPlayback: false,
      accountDisplay: { displayName: "Spotify User" },
    });

    expect(authorizing.status).toBe("authorizing");
    expect(waiting.status).toBe("connected_waiting_playback");
  });
});
