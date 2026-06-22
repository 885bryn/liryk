import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UiAuthState } from "../state/auth/auth-store";
import { MobileShell } from "./mobile-shell";

type HookModel = {
  phase: "checking" | "ready" | "busy";
  statusCopy: string;
  hasSetupError: boolean;
  uiState: UiAuthState;
  onConnect: () => Promise<void>;
  sessionAccessToken?: string | null;
};

const disconnectedState: UiAuthState = {
  status: "disconnected",
  onboardingExplainer: "Connect Spotify once to keep live lyrics synced with your current track.",
  permissionSummary: "We only read playback state and never control playback.",
};

let hookModel: HookModel = {
  phase: "checking",
  statusCopy: "Checking Spotify connection...",
  hasSetupError: false,
  uiState: disconnectedState,
  onConnect: async () => undefined,
  sessionAccessToken: null,
};

vi.mock("./use-web-auth-runtime", () => ({
  useWebAuthRuntime: () => hookModel,
}));

vi.mock("./use-shared-playback", () => ({
  useSharedPlayback: () => ({
    nowPlaying: null,
    playbackSnapshot: null,
    pollerId: "test-poller",
    rateLimitedUntilMs: 0,
    lastUpdatedAtMs: Date.now(),
  }),
}));

vi.mock("./use-karaoke-mode", () => ({
  useKaraokeMode: () => ({
    mode: "inactive",
    message: "Karaoke inactive",
    localPlaybackMs: null,
    referenceTrack: null,
    candidateMappings: [],
    currentMapping: null,
    canResumeAutoplay: false,
    playerHostRef: { current: null },
    primePlaybackGesture: vi.fn(),
    enterKaraokeMode: vi.fn(async () => undefined),
    exitKaraokeMode: vi.fn(async () => undefined),
    switchToCandidate: vi.fn(async () => undefined),
    confirmCurrentMapping: vi.fn(),
    banCurrentCandidate: vi.fn(async () => undefined),
    clearError: vi.fn(),
    resumeAutoplay: vi.fn(async () => undefined),
  }),
}));

describe("MobileShell", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    hookModel = {
      phase: "checking",
      statusCopy: "Checking Spotify connection...",
      hasSetupError: false,
      uiState: disconnectedState,
      onConnect: async () => undefined,
      sessionAccessToken: null,
    };
  });

  it("shows a single stacked phone screen with auth, track metadata, and lyrics", () => {
    render(<MobileShell />);

    const shell = screen.getByTestId("mobile-shell-layout");
    expect(shell.className).toContain("min-h-screen");
    expect(shell.className).toContain("flex");
    expect(shell.className).toContain("flex-col");
    expect(screen.getByTestId("mobile-shell-connection")).toBeTruthy();
    expect(screen.getByTestId("mobile-shell-now-playing")).toBeTruthy();
    expect(screen.getByTestId("mobile-shell-lyrics-stage")).toBeTruthy();
  });

  it("shows Connect Spotify for a disconnected auth state", () => {
    hookModel = {
      ...hookModel,
      phase: "ready",
      statusCopy: disconnectedState.onboardingExplainer,
      uiState: disconnectedState,
    };

    render(<MobileShell />);

    expect(screen.getByRole("button", { name: "Connect Spotify" })).toBeTruthy();
  });

  it("disables Connect Spotify for a disconnected setup error", () => {
    hookModel = {
      ...hookModel,
      phase: "ready",
      statusCopy: "Auth configuration is unavailable.",
      hasSetupError: true,
      uiState: disconnectedState,
    };

    render(<MobileShell />);

    expect(screen.getByRole("button", { name: "Connect Spotify" }).hasAttribute("disabled")).toBe(true);
  });

  it("shows Reconnect Spotify for a recoverable auth state", () => {
    hookModel = {
      ...hookModel,
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
    };

    render(<MobileShell />);

    expect(screen.getByRole("button", { name: "Reconnect Spotify" })).toBeTruthy();
  });

  it("disables Reconnect Spotify when retry is not eligible", () => {
    hookModel = {
      ...hookModel,
      phase: "ready",
      statusCopy: "Network connection was interrupted. Check your connection and retry.",
      uiState: {
        status: "recoverable_error",
        reason: "network",
        userFacingReason: "Network connection was interrupted. Check your connection and retry.",
        retryEligible: false,
        troubleshootingSuggested: true,
        attempts: 3,
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
    };

    render(<MobileShell />);

    expect(screen.getByRole("button", { name: "Reconnect Spotify" }).hasAttribute("disabled")).toBe(true);
  });

  it("shows a disabled authorization CTA for ready-phase authorizing auth state", () => {
    hookModel = {
      ...hookModel,
      phase: "ready",
      statusCopy: "Authorizing Spotify connection...",
      uiState: {
        status: "authorizing",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
    };

    render(<MobileShell />);

    expect(screen.getByRole("button", { name: "Authorizing Spotify connection..." }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByRole("button", { name: "Connect Spotify" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reconnect Spotify" })).toBeNull();
  });

  it("shows busy copy with a disabled CTA even when auth status still looks disconnected", () => {
    hookModel = {
      ...hookModel,
      phase: "busy",
      statusCopy: "Authorizing Spotify connection...",
      uiState: disconnectedState,
    };

    render(<MobileShell />);

    const busyButton = screen.getByRole("button", { name: "Authorizing Spotify connection..." });
    expect(busyButton).toBeTruthy();
    expect(busyButton.hasAttribute("disabled")).toBe(true);
    expect(screen.queryByRole("button", { name: "Connect Spotify" })).toBeNull();
  });

  it("shows busy copy with a disabled CTA even when auth status still looks recoverable", () => {
    hookModel = {
      ...hookModel,
      phase: "busy",
      statusCopy: "Authorizing Spotify connection...",
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
    };

    render(<MobileShell />);

    const busyButton = screen.getByRole("button", { name: "Authorizing Spotify connection..." });
    expect(busyButton).toBeTruthy();
    expect(busyButton.hasAttribute("disabled")).toBe(true);
    expect(screen.queryByRole("button", { name: "Reconnect Spotify" })).toBeNull();
  });

  it("renders the fullscreen-style lyrics viewport inside the mobile shell after successful auth", async () => {
    hookModel = {
      phase: "ready",
      statusCopy: "Connected - play a track on Spotify",
      hasSetupError: false,
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - play a track on Spotify",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    render(<MobileShell />);

    await waitFor(() => {
      expect(screen.getByTestId("fullscreen-lyrics-layout")).toBeTruthy();
    });
    expect(screen.queryByRole("link", { name: "Exit Fullscreen Lyrics" })).toBeNull();
    expect(screen.queryByTestId("fullscreen-dev-panel-toggle")).toBeNull();
    expect(screen.queryByRole("button", { name: "Show Diagnostics" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Enter Karaoke|Exit Karaoke/ })).toBeNull();
  });

  it("does not violate hook ordering when auth state transitions from disconnected to connected", async () => {
    hookModel = {
      ...hookModel,
      phase: "ready",
      statusCopy: disconnectedState.onboardingExplainer,
      uiState: disconnectedState,
    };

    const { rerender } = render(<MobileShell />);

    expect(screen.getByRole("button", { name: "Connect Spotify" })).toBeTruthy();

    hookModel = {
      phase: "ready",
      statusCopy: "Connected - play a track on Spotify",
      hasSetupError: false,
      uiState: {
        status: "connected_waiting_playback",
        waitingMessage: "Connected - play a track on Spotify",
        onboardingExplainer: disconnectedState.onboardingExplainer,
        permissionSummary: disconnectedState.permissionSummary,
      },
      onConnect: async () => undefined,
      sessionAccessToken: "session-token",
    };

    rerender(<MobileShell />);

    await waitFor(() => {
      expect(screen.getByTestId("fullscreen-lyrics-layout")).toBeTruthy();
    });
  });
});
