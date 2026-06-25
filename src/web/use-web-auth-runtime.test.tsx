import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as authRuntimeModule from "../app/auth-runtime";
import { AuthStore } from "../state/auth/auth-store";
import type { UiAuthState } from "../state/auth/auth-store";
import type { PlatformAuthRedirect } from "./auth/platform-auth-redirect";
import { runWebAuthBootstrap } from "./auth/web-auth-controller";
import { useWebAuthRuntime } from "./use-web-auth-runtime";

type RuntimeStub = {
  initialize: () => Promise<{ status: "connected" | "reconnect_required"; source: "persisted" | "refreshed" | "none" }>;
  completeSpotifyCallback: (input: { code?: string; state?: string; error?: string }) => Promise<UiAuthState>;
  connectSpotify: () => Promise<{ authorizeUrl: string; requestId: string }>;
  getUiState: () => UiAuthState;
  getSession: () => { accessToken: string; accessTokenExpiresAtMs?: number } | null;
};

const probeReadLocation = () => new URL("http://localhost:3000/?code=abc&state=xyz");
const probeReplaceHistoryUrl = () => undefined;

function HookProbe(input: {
  runtime?: RuntimeStub;
  runBootstrap?: (deps: {
    runtime: RuntimeStub;
    readLocation: () => URL;
    replaceHistoryUrl: (url: string) => void;
    readRedirect: (url: URL) => Pick<PlatformAuthRedirect, "callback" | "cleanedUrl">;
  }) => Promise<void>;
  navigateToAuthorization?: (url: string) => void;
  readLocation?: () => URL;
  readRedirect?: (url: URL) => Pick<PlatformAuthRedirect, "callback" | "cleanedUrl">;
  subscribeToRedirects?: (onUrl: (url: string) => void) => void | (() => void) | Promise<void | (() => void)>;
}): ReactElement {
  const model = useWebAuthRuntime({
    runtime: input.runtime,
    runBootstrap: input.runBootstrap,
    navigateToAuthorization: input.navigateToAuthorization,
    readLocation: input.readLocation ?? probeReadLocation,
    replaceHistoryUrl: probeReplaceHistoryUrl,
    readRedirect: input.readRedirect,
    subscribeToRedirects: input.subscribeToRedirects,
  });

  return (
    <div>
      <p data-testid="phase">{model.phase}</p>
      <p data-testid="copy">{model.statusCopy}</p>
      <p data-testid="ui-status">{model.uiState.status}</p>
      <p data-testid="has-setup-error">{String(model.hasSetupError)}</p>
      <p data-testid="session-token">{model.sessionAccessToken ?? ""}</p>
      <button type="button" onClick={() => void model.onConnect()}>
        Connect
      </button>
    </div>
  );
}

describe("useWebAuthRuntime", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("emits checking state during bootstrap before yielding runtime UI state", async () => {
    const authStore = new AuthStore();

    let releaseBootstrap: (() => void) | null = null;
    const runBootstrap = vi.fn(
      ({ readRedirect: _readRedirect }: { readRedirect: (url: URL) => Pick<PlatformAuthRedirect, "callback" | "cleanedUrl"> }) =>
        new Promise<void>((resolve) => {
          releaseBootstrap = resolve;
        }),
    );

    const runtime: RuntimeStub = {
      initialize: vi.fn(async () => ({ status: "connected", source: "none" })),
      completeSpotifyCallback: vi.fn(async () => authStore.selectUiState()),
      connectSpotify: vi.fn(async () => ({ authorizeUrl: "https://accounts.spotify.com/authorize", requestId: "req-1" })),
      getUiState: () => authStore.selectUiState(),
      getSession: () => null,
    };

    render(<HookProbe runtime={runtime} runBootstrap={runBootstrap} />);

    expect(screen.getByTestId("phase").textContent).toBe("checking");
    expect(screen.getByTestId("copy").textContent).toBe("Checking Spotify connection...");

    releaseBootstrap?.();

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe("ready");
    });
    expect(screen.getByTestId("ui-status").textContent).toBe("disconnected");
  });

  it("sets busy state and navigates once with runtime authorize URL on connect", async () => {
    const authStore = new AuthStore();
    const navigateToAuthorization = vi.fn();
    const runBootstrap = vi.fn(async () => undefined);

    const runtime: RuntimeStub = {
      initialize: vi.fn(async () => ({ status: "connected", source: "none" })),
      completeSpotifyCallback: vi.fn(async () => authStore.selectUiState()),
      connectSpotify: vi.fn(async () => ({
        authorizeUrl: "https://accounts.spotify.com/authorize?state=test",
        requestId: "req-2",
      })),
      getUiState: () => authStore.startAuth(),
      getSession: () => null,
    };

    render(
      <HookProbe
        runtime={runtime}
        runBootstrap={runBootstrap}
        navigateToAuthorization={navigateToAuthorization}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe("ready");
    });

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe("busy");
    });
    expect(screen.getByTestId("copy").textContent).toBe("Authorizing Spotify connection...");
    expect(navigateToAuthorization).toHaveBeenCalledTimes(1);
    expect(navigateToAuthorization).toHaveBeenCalledWith("https://accounts.spotify.com/authorize?state=test");
  });

  it("handles callback bootstrap path and resolves into runtime UI state", async () => {
    const authStore = new AuthStore();
    authStore.setConnectedWaitingPlayback({ displayName: "Avery" });

    const runBootstrap = vi.fn(async ({ runtime }: { runtime: RuntimeStub }) => {
      await runtime.completeSpotifyCallback({ code: "spotify-code", state: "spotify-state" });
    });

    const runtime: RuntimeStub = {
      initialize: vi.fn(async () => ({ status: "connected", source: "none" })),
      completeSpotifyCallback: vi.fn(async () => authStore.selectUiState()),
      connectSpotify: vi.fn(async () => ({ authorizeUrl: "https://accounts.spotify.com/authorize", requestId: "req-3" })),
      getUiState: () => authStore.selectUiState(),
      getSession: () => ({ accessToken: "token" }),
    };

    render(<HookProbe runtime={runtime} runBootstrap={runBootstrap} />);

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe("ready");
    });
    expect(screen.getByTestId("ui-status").textContent).toBe("connected_waiting_playback");
    expect(screen.getByTestId("copy").textContent).toBe("Connected - play a track on Spotify");
  });

  it("completes bootstrap when the callback URL comes from the Android shell path", async () => {
    const authStore = new AuthStore();
    authStore.setConnectedWaitingPlayback({ displayName: "Avery" });

    const connectedState = authStore.selectUiState();
    const runtime: RuntimeStub = {
      initialize: vi.fn(async () => ({ status: "connected", source: "none" })),
      completeSpotifyCallback: vi.fn(async () => connectedState),
      connectSpotify: vi.fn(async () => ({
        authorizeUrl: "https://accounts.spotify.com/authorize",
        requestId: "req-4",
      })),
      getUiState: () => connectedState,
      getSession: () => ({ accessToken: "token" }),
    };

    render(
      <HookProbe
        runtime={runtime}
        runBootstrap={runWebAuthBootstrap}
        readLocation={() => new URL("app.liryk://callback?code=spotify-code&state=spotify-state")}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("ui-status").textContent).toBe("connected_waiting_playback");
    });
  });

  it("uses the redirect reader during default bootstrap callback completion", async () => {
    const authStore = new AuthStore();
    authStore.setConnectedWaitingPlayback({ displayName: "Avery" });

    const connectedState = authStore.selectUiState();
    const readRedirect = vi.fn(
      () =>
        ({
          callback: { code: "spotify-code", state: "spotify-state" },
          cleanedUrl: "app.liryk://callback",
        }) satisfies Pick<PlatformAuthRedirect, "callback" | "cleanedUrl">,
    );

    const runtime: RuntimeStub = {
      initialize: vi.fn(async () => ({ status: "connected", source: "none" })),
      completeSpotifyCallback: vi.fn(async () => connectedState),
      connectSpotify: vi.fn(async () => ({
        authorizeUrl: "https://accounts.spotify.com/authorize",
        requestId: "req-5",
      })),
      getUiState: () => connectedState,
      getSession: () => ({ accessToken: "token" }),
    };

    render(
      <HookProbe
        runtime={runtime}
        readLocation={() => new URL("http://localhost:3000/")}
        readRedirect={readRedirect}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("ui-status").textContent).toBe("connected_waiting_playback");
    });
    expect(readRedirect).toHaveBeenCalledTimes(1);
    expect(runtime.completeSpotifyCallback).toHaveBeenCalledWith({
      code: "spotify-code",
      state: "spotify-state",
    });
  });

  it("completes callback flow when the Android shell emits a redirect URL after returning from the browser", async () => {
    const authStore = new AuthStore();
    authStore.setConnectedWaitingPlayback({ displayName: "Avery" });

    const connectedState = authStore.selectUiState();
    let emitRedirect: ((url: string) => void) | null = null;

    const runtime: RuntimeStub = {
      initialize: vi.fn(async () => ({ status: "connected", source: "none" })),
      completeSpotifyCallback: vi.fn(async () => connectedState),
      connectSpotify: vi.fn(async () => ({
        authorizeUrl: "https://accounts.spotify.com/authorize",
        requestId: "req-6",
      })),
      getUiState: () => connectedState,
      getSession: () => ({ accessToken: "token" }),
    };

    render(
      <HookProbe
        runtime={runtime}
        readLocation={() => new URL("https://localhost/")}
        subscribeToRedirects={(onUrl) => {
          emitRedirect = onUrl;
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe("ready");
    });

    emitRedirect?.("app.liryk://callback?code=spotify-code&state=spotify-state");

    await waitFor(() => {
      expect(runtime.completeSpotifyCallback).toHaveBeenCalledWith({
        code: "spotify-code",
        state: "spotify-state",
      });
    });
    expect(screen.getByTestId("ui-status").textContent).toBe("connected_waiting_playback");
  });

  it("sets hasSetupError when auth runtime creation fails", async () => {
    vi.spyOn(authRuntimeModule, "createAuthRuntime").mockImplementation(() => {
      throw new Error("Missing client id.");
    });

    render(<HookProbe runBootstrap={vi.fn(async () => undefined)} />);

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe("ready");
    });

    expect(screen.getByTestId("has-setup-error").textContent).toBe("true");
    expect(screen.getByTestId("copy").textContent).toBe("Spotify auth setup issue: Missing client id.");
  });

  it("sets hasSetupError when bootstrap fails with a setup error", async () => {
    const authStore = new AuthStore();

    const runtime: RuntimeStub = {
      initialize: vi.fn(async () => ({ status: "connected", source: "none" })),
      completeSpotifyCallback: vi.fn(async () => authStore.selectUiState()),
      connectSpotify: vi.fn(async () => ({ authorizeUrl: "https://accounts.spotify.com/authorize", requestId: "req-4" })),
      getUiState: () => authStore.selectUiState(),
      getSession: () => null,
    };

    render(
      <HookProbe
        runtime={runtime}
        runBootstrap={vi.fn(async () => {
          throw new Error("Redirect URI mismatch.");
        })}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe("ready");
    });

    expect(screen.getByTestId("has-setup-error").textContent).toBe("true");
    expect(screen.getByTestId("copy").textContent).toBe("Spotify auth setup issue: Redirect URI mismatch.");
  });
  it("refreshes the web session before the access token expires", async () => {
    vi.useFakeTimers();
    try {
      const authStore = new AuthStore();
      authStore.setConnectedWaitingPlayback({ displayName: "Avery" });

      let currentSession = {
        accessToken: "token-initial",
        accessTokenExpiresAtMs: Date.now() + 70_000,
      };

      const runtime: RuntimeStub = {
        initialize: vi.fn(async () => {
          if (vi.mocked(runtime.initialize).mock.calls.length > 1) {
            currentSession = {
              accessToken: "token-refreshed",
              accessTokenExpiresAtMs: Date.now() + 3_600_000,
            };
          }
          return { status: "connected", source: "persisted" };
        }),
        completeSpotifyCallback: vi.fn(async () => authStore.selectUiState()),
        connectSpotify: vi.fn(async () => ({
          authorizeUrl: "https://accounts.spotify.com/authorize",
          requestId: "req-refresh",
        })),
        getUiState: () => authStore.selectUiState(),
        getSession: () => currentSession,
      };

      render(<HookProbe runtime={runtime} runBootstrap={runWebAuthBootstrap} readLocation={() => new URL("http://localhost:3000/")} />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByTestId("phase").textContent).toBe("ready");
      expect(screen.getByTestId("session-token").textContent).toBe("token-initial");
      expect(runtime.initialize).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });

      expect(runtime.initialize).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId("session-token").textContent).toBe("token-refreshed");
    } finally {
      vi.useRealTimers();
    }
  });

});
