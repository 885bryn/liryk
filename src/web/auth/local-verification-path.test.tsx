import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UiAuthState } from "../../state/auth/auth-store";
import { AppShell } from "../app-shell";

type HookModel = {
  phase: "checking" | "ready" | "busy";
  statusCopy: string;
  uiState: UiAuthState;
  onConnect: () => Promise<void>;
};

const disconnectedState: UiAuthState = {
  status: "disconnected",
  onboardingExplainer: "Connect Spotify once to keep live lyrics synced with your current track.",
  permissionSummary: "We only read playback state and never control playback.",
};

let hookModel: HookModel = {
  phase: "checking",
  statusCopy: "Checking Spotify connection...",
  uiState: disconnectedState,
  onConnect: async () => undefined,
};

vi.mock("../use-web-auth-runtime", () => ({
  useWebAuthRuntime: () => hookModel,
}));

vi.mock("./env-alignment", () => ({
  getEnvAlignmentDiagnostics: vi.fn(() => ({
    status: "warning",
    messages: ["APP_BASE_URL origin mismatch: expected http://127.0.0.1:5173, actual http://localhost:3000."],
  })),
}));

describe("local auth verification path", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    hookModel = {
      phase: "checking",
      statusCopy: "Checking Spotify connection...",
      uiState: disconnectedState,
      onConnect: async () => undefined,
    };
  });

  it("renders startup checking first and then connect-ready state", () => {
    const { rerender } = render(<AppShell />);
    expect(screen.getByText("Checking Spotify connection...")).toBeTruthy();

    hookModel = {
      phase: "ready",
      statusCopy: disconnectedState.onboardingExplainer,
      uiState: disconnectedState,
      onConnect: async () => undefined,
    };

    rerender(<AppShell />);
    expect(screen.getByRole("button", { name: "Connect Spotify" })).toBeTruthy();
  });

  it("renders reconnect CTA and reason-aware helper copy after callback failure", () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Network connection was interrupted. Check your connection and retry.",
      uiState: {
        status: "recoverable_error",
        reason: "network",
        userFacingReason: "Network connection was interrupted. Check your connection and retry.",
        retryEligible: true,
        troubleshootingSuggested: false,
        attempts: 1,
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
    };

    render(<AppShell />);

    expect(screen.getByRole("button", { name: "Reconnect Spotify" })).toBeTruthy();
    expect(screen.getByText("Network connection was interrupted. Check your connection and retry.")).toBeTruthy();
  });

  it("renders connected waiting playback guidance and env-alignment warning", () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - play a track on Spotify",
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - play a track on Spotify",
        accountDisplay: { displayName: "Avery" },
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
    };

    render(<AppShell />);

    expect(screen.getByText("Connected - play a track on Spotify")).toBeTruthy();
    expect(screen.getByText(/APP_BASE_URL origin mismatch/)).toBeTruthy();
  });
});
