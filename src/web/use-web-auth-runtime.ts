import { useEffect, useMemo, useState } from "react";

import { createAuthRuntime, type AuthRuntime } from "../app/auth-runtime";
import type { UiAuthState } from "../state/auth/auth-store";
import { runWebAuthBootstrap } from "./auth/web-auth-controller";

type WebAuthPhase = "checking" | "ready" | "busy";

export type WebAuthRuntimeModel = {
  phase: WebAuthPhase;
  statusCopy: string;
  uiState: UiAuthState;
  onConnect: () => Promise<void>;
  sessionAccessToken: string | null;
};

type BootstrapFn = (deps: {
  runtime: {
    initialize: AuthRuntime["initialize"];
    completeSpotifyCallback: AuthRuntime["completeSpotifyCallback"];
  };
  readLocation: () => URL;
  replaceHistoryUrl: (url: string) => void;
}) => Promise<void>;

export type UseWebAuthRuntimeOptions = {
  runtime?: Pick<AuthRuntime, "initialize" | "completeSpotifyCallback" | "connectSpotify" | "getUiState" | "getSession">;
  runBootstrap?: BootstrapFn;
  readLocation?: () => URL;
  replaceHistoryUrl?: (url: string) => void;
  navigateToAuthorization?: (url: string) => void;
};

function defaultReadLocation(): URL {
  return new URL(window.location.href);
}

function defaultReplaceHistoryUrl(url: string): void {
  window.history.replaceState(null, "", url);
}

function defaultNavigateToAuthorization(url: string): void {
  window.location.assign(url);
}

function copyFromUiState(uiState: UiAuthState): string {
  if (uiState.status === "connected_waiting_playback") {
    return uiState.waitingMessage;
  }

  if (uiState.status === "recoverable_error") {
    return uiState.userFacingReason;
  }

  if (uiState.status === "success") {
    return uiState.successMessage;
  }

  return uiState.onboardingExplainer;
}

function copyFromError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown Spotify auth configuration error.";
  return `Spotify auth setup issue: ${message}`;
}

export function useWebAuthRuntime(options: UseWebAuthRuntimeOptions = {}): WebAuthRuntimeModel {
  const runtimeCreation = useMemo(() => {
    if (options.runtime) {
      return { runtime: options.runtime, error: null as unknown };
    }

    try {
      return { runtime: createAuthRuntime(), error: null as unknown };
    } catch (error) {
      return { runtime: null, error };
    }
  }, [options.runtime]);

  const runtime = runtimeCreation.runtime;
  const runBootstrap = options.runBootstrap ?? runWebAuthBootstrap;
  const readLocation = options.readLocation ?? defaultReadLocation;
  const replaceHistoryUrl = options.replaceHistoryUrl ?? defaultReplaceHistoryUrl;
  const navigateToAuthorization = options.navigateToAuthorization ?? defaultNavigateToAuthorization;

  const [phase, setPhase] = useState<WebAuthPhase>("checking");
  const [uiState, setUiState] = useState<UiAuthState>(
    () => runtime?.getUiState() ?? { status: "disconnected", onboardingExplainer: "", permissionSummary: "" },
  );
  const [statusCopy, setStatusCopy] = useState<string>(() =>
    runtimeCreation.error ? copyFromError(runtimeCreation.error) : "Checking Spotify connection...",
  );
  const [sessionAccessToken, setSessionAccessToken] = useState<string | null>(() => runtime?.getSession()?.accessToken ?? null);

  useEffect(() => {
    if (!runtime) {
      setPhase("ready");
      setStatusCopy(copyFromError(runtimeCreation.error));
      return;
    }

    let active = true;

    const bootstrap = async () => {
      setPhase("checking");
      setStatusCopy("Checking Spotify connection...");

      try {
        await runBootstrap({
          runtime,
          readLocation,
          replaceHistoryUrl,
        });
      } catch (error) {
        if (active) {
          setStatusCopy(copyFromError(error));
        }
      } finally {
        if (!active) {
          return;
        }

        const nextState = runtime.getUiState();
        setUiState(nextState);
        setStatusCopy(copyFromUiState(nextState));
        setSessionAccessToken(runtime.getSession()?.accessToken ?? null);
        setPhase("ready");
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [readLocation, replaceHistoryUrl, runBootstrap, runtime, runtimeCreation.error]);

  const onConnect = async () => {
    if (!runtime) {
      setPhase("ready");
      setStatusCopy(copyFromError(runtimeCreation.error));
      return;
    }

    setPhase("busy");
    setStatusCopy("Authorizing Spotify connection...");

    const started = await runtime.connectSpotify();
    setUiState(runtime.getUiState());
    setSessionAccessToken(runtime.getSession()?.accessToken ?? null);
    navigateToAuthorization(started.authorizeUrl);
  };

  return {
    phase,
    statusCopy,
    uiState,
    onConnect,
    sessionAccessToken,
  };
}
