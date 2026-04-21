import { describe, expect, it, vi } from "vitest";

import { createAuthRuntime } from "../../app/auth-runtime";
import { AuthStore } from "../../state/auth/auth-store";
import { buildConnectSpotifyCard, createConnectFlowActions } from "./connect-spotify-card";
import { buildConnectedStatus } from "./connected-status";
import { buildPermissionSummary } from "./permission-summary";
import { buildRetryCard } from "./retry-card";

vi.mock("../../infra/config/env", () => {
  return {
    getAuthEnv: () => ({
      spotifyClientId: "spotify-client-id",
      spotifyRedirectUri: "http://127.0.0.1:8888/callback",
      appBaseUrl: "http://localhost:3000",
      spotifyAuthScopes: ["user-read-currently-playing", "user-read-playback-state"],
    }),
  };
});

describe("connection flow UI models", () => {
  it("shows first-run connect entry with onboarding and trust messaging", () => {
    const store = new AuthStore();
    const card = buildConnectSpotifyCard({
      state: store.selectUiState(),
      onConnect: () => undefined,
    });

    expect(card.title).toBe("Connect Spotify");
    expect(card.onboardingExplainer).toContain("Connect Spotify once");
    expect(card.trustCopy).toContain("read-only playback");
    expect(card.showPermissionSummary).toBe(true);
  });

  it("provides plain-language permission summary before authorization", () => {
    const summary = buildPermissionSummary();

    expect(summary.heading).toBe("Before you connect");
    expect(summary.lines).toContain(
      "We only read your currently playing track and playback position.",
    );
    expect(summary.lines.join(" ")).toContain("do not control playback");
  });

  it("renders success micro-state before waiting state", () => {
    const store = new AuthStore();
    const success = store.authorizeSuccess({ displayName: "Avery" });
    const successView = buildConnectedStatus(success);

    expect(successView.headline).toBe("Spotify connected");
    expect(successView.detail).toContain("Preparing");
    expect(successView.accountLabel).toBe("Avery");

    const waiting = store.setConnectedWaitingPlayback({ displayName: "Avery" });
    const waitingView = buildConnectedStatus(waiting);
    expect(waitingView.headline).toBe("Connected - play a track on Spotify");
  });

  it("avoids blank status copy for each primary auth state", () => {
    const store = new AuthStore();
    const states = [
      store.selectUiState(),
      store.startAuth(),
      store.authorizeSuccess({ displayName: "Avery" }),
      store.setConnectedWaitingPlayback({ displayName: "Avery" }),
    ];

    for (const state of states) {
      const view = buildConnectedStatus(state);
      expect(view.headline.length).toBeGreaterThan(0);
      expect(view.detail.length).toBeGreaterThan(0);
    }
  });

  it("shows reason-specific retry copy and visible auto-retry status for temporary failures", () => {
    const store = new AuthStore();
    const retryAuth = () => store.retryAuth();
    const resetAuthError = () => store.resetAuthError();

    const errored = store.setRecoverableError({
      reason: "rate-limit",
      retryEligible: true,
      autoRetryInMs: 2200,
    });

    const retryCard = buildRetryCard(errored, { retryAuth, resetAuthError });
    expect(retryCard?.title).toBe("Spotify temporarily rate-limited requests");
    expect(retryCard?.autoRetryStatus).toBe("Auto-retrying in 3s...");
    expect(retryCard?.showRetry).toBe(true);
    expect(retryCard?.isPersistent).toBe(true);
  });

  it("wires connect action through runtime and transitions to connected waiting state", async () => {
    const authStore = new AuthStore();
    const authorizationUrls: string[] = [];

    const runtime = createAuthRuntime({
      authStore,
      spotifyClient: {
        beginAuthorization: vi.fn(async () => ({
          authorizeUrl: "https://accounts.spotify.com/authorize?state=state-abc",
          state: "state-abc",
          codeVerifier: "verifier-abc",
        })),
        exchangeAuthorizationCode: vi.fn(async () => ({
          accessToken: "access",
          refreshToken: "refresh",
          scope: "user-read-currently-playing user-read-playback-state",
          expiresInSeconds: 3600,
        })),
        refreshAccessToken: vi.fn(async () => ({
          accessToken: "next-access",
          refreshToken: "next-refresh",
          scope: "user-read-currently-playing user-read-playback-state",
          expiresInSeconds: 3600,
        })),
      },
      tokenStore: {
        loadTokens: vi.fn(async () => null),
        saveTokens: vi.fn(async () => undefined),
        clearTokens: vi.fn(async () => undefined),
      },
      now: () => 1000,
      hasPlayback: () => false,
      getAccountDisplay: () => ({ displayName: "Avery" }),
    });

    const actions = createConnectFlowActions({
      runtime,
      onAuthorizationUrl: (url) => {
        authorizationUrls.push(url);
      },
    });

    await actions.onConnect();
    expect(authStore.selectUiState().status).toBe("authorizing");
    expect(authorizationUrls[0]).toContain("accounts.spotify.com/authorize");

    const callbackState = await actions.onSpotifyCallback({
      code: "spotify-code",
      state: "state-abc",
    });
    expect(callbackState.status).toBe("connected_waiting_playback");
  });

  it("shows troubleshooting branch after repeated failures and dispatches store actions", () => {
    const store = new AuthStore();
    store.setRecoverableError({ reason: "network", retryEligible: true });
    store.setRecoverableError({ reason: "network", retryEligible: true });
    const repeatedFailure = store.setRecoverableError({ reason: "timeout", retryEligible: true });

    const retryCard = buildRetryCard(repeatedFailure, {
      retryAuth: () => {
        store.retryAuth();
      },
      resetAuthError: () => {
        store.resetAuthError();
      },
    });

    expect(retryCard?.troubleshooting.length).toBeGreaterThan(0);

    retryCard?.onRetry();
    expect(store.selectUiState().status).toBe("authorizing");

    store.setRecoverableError({ reason: "cancel", retryEligible: true });
    const troubleshootingCard = buildRetryCard(store.selectUiState(), {
      retryAuth: () => {
        store.retryAuth();
      },
      resetAuthError: () => {
        store.resetAuthError();
      },
    });

    troubleshootingCard?.onTroubleshoot();
    expect(store.selectUiState().status).toBe("disconnected");
  });
});
