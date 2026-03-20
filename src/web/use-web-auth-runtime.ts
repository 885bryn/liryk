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
  runtime?: Pick<AuthRuntime, "initialize" | "completeSpotifyCallback" | "connectSpotify" | "getUiState">;
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

export function useWebAuthRuntime(options: UseWebAuthRuntimeOptions = {}): WebAuthRuntimeModel {
  const runtime = useMemo(() => options.runtime ?? createAuthRuntime(), [options.runtime]);
  const runBootstrap = options.runBootstrap ?? runWebAuthBootstrap;
  const readLocation = options.readLocation ?? defaultReadLocation;
  const replaceHistoryUrl = options.replaceHistoryUrl ?? defaultReplaceHistoryUrl;
  const navigateToAuthorization = options.navigateToAuthorization ?? defaultNavigateToAuthorization;

  const [phase, setPhase] = useState<WebAuthPhase>("checking");
  const [uiState, setUiState] = useState<UiAuthState>(() => runtime.getUiState());
  const [statusCopy, setStatusCopy] = useState<string>("Checking Spotify connection...");

  useEffect(() => {
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
      } finally {
        if (!active) {
          return;
        }

        const nextState = runtime.getUiState();
        setUiState(nextState);
        setStatusCopy(copyFromUiState(nextState));
        setPhase("ready");
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [readLocation, replaceHistoryUrl, runBootstrap, runtime]);

  const onConnect = async () => {
    setPhase("busy");
    setStatusCopy("Authorizing Spotify connection...");

    const started = await runtime.connectSpotify();
    setUiState(runtime.getUiState());
    navigateToAuthorization(started.authorizeUrl);
  };

  return {
    phase,
    statusCopy,
    uiState,
    onConnect,
  };
}
