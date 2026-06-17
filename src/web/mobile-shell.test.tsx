import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UiAuthState } from "../state/auth/auth-store";
import { MobileShell } from "./mobile-shell";

type HookModel = {
  phase: "checking" | "ready" | "busy";
  statusCopy: string;
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
  uiState: disconnectedState,
  onConnect: async () => undefined,
  sessionAccessToken: null,
};

vi.mock("./use-web-auth-runtime", () => ({
  useWebAuthRuntime: () => hookModel,
}));

describe("MobileShell", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    hookModel = {
      phase: "checking",
      statusCopy: "Checking Spotify connection...",
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
});
