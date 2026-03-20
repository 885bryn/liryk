import { describe, expect, it } from "vitest";

import { AuthStore } from "../../state/auth/auth-store";
import { buildConnectSpotifyCard } from "./connect-spotify-card";
import { buildConnectedStatus } from "./connected-status";
import { buildPermissionSummary } from "./permission-summary";
import { buildRetryCard } from "./retry-card";

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
