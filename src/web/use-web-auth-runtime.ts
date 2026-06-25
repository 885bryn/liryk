import { useEffect, useMemo, useState } from "react";

import { createAuthRuntime, type AuthRuntime } from "../app/auth-runtime";
import type { UiAuthState } from "../state/auth/auth-store";
import { subscribeToPlatformAuthRedirects, type SubscribeToPlatformRedirects } from "./auth/platform-auth-listener";
import { readPlatformAuthRedirect, type PlatformAuthRedirect } from "./auth/platform-auth-redirect";

type WebAuthPhase = "checking" | "ready" | "busy";

const SESSION_REFRESH_SKEW_MS = 60_000;

export type WebAuthRuntimeModel = {
  phase: WebAuthPhase;
  statusCopy: string;
  hasSetupError: boolean;
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
  readRedirect: (url: URL) => Pick<PlatformAuthRedirect, "callback" | "cleanedUrl">;
}) => Promise<void>;

export type UseWebAuthRuntimeOptions = {
  runtime?: Pick<AuthRuntime, "initialize" | "completeSpotifyCallback" | "connectSpotify" | "getUiState" | "getSession">;
  runBootstrap?: BootstrapFn;
  readLocation?: () => URL;
  replaceHistoryUrl?: (url: string) => void;
  navigateToAuthorization?: (url: string) => void;
  readRedirect?: (url: URL) => Pick<PlatformAuthRedirect, "callback" | "cleanedUrl">;
  subscribeToRedirects?: SubscribeToPlatformRedirects;
};

async function runPlatformAwareBootstrap(deps: {
  runtime: {
    initialize: AuthRuntime["initialize"];
    completeSpotifyCallback: AuthRuntime["completeSpotifyCallback"];
  };
  readLocation: () => URL;
  replaceHistoryUrl: (url: string) => void;
  readRedirect: (url: URL) => Pick<PlatformAuthRedirect, "callback" | "cleanedUrl">;
}): Promise<void> {
  await deps.runtime.initialize();

  const redirect = deps.readRedirect(deps.readLocation());
  if (!redirect.callback) {
    return;
  }

  await deps.runtime.completeSpotifyCallback(redirect.callback);
  deps.replaceHistoryUrl(redirect.cleanedUrl);
}

function defaultReadLocation(): URL {
  return new URL(window.location.href);
}

function defaultReplaceHistoryUrl(url: string): void {
  window.history.replaceState(null, "", url);
}

function defaultNavigateToAuthorization(url: string): void {
  window.location.assign(url);
}

function shouldReplaceHistoryUrl(url: string): boolean {
  const protocol = new URL(url).protocol;
  return protocol === "http:" || protocol === "https:";
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

function readSession(runtime: Pick<AuthRuntime, "getSession"> | null): {
  accessToken: string | null;
  accessTokenExpiresAtMs: number | null;
} {
  const session = runtime?.getSession() ?? null;
  return {
    accessToken: session?.accessToken ?? null,
    accessTokenExpiresAtMs: session?.accessTokenExpiresAtMs ?? null,
  };
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
  const runBootstrap = options.runBootstrap ?? runPlatformAwareBootstrap;
  const readLocation = options.readLocation ?? defaultReadLocation;
  const replaceHistoryUrl = options.replaceHistoryUrl ?? defaultReplaceHistoryUrl;
  const navigateToAuthorization = options.navigateToAuthorization ?? defaultNavigateToAuthorization;
  const readRedirect = options.readRedirect ?? readPlatformAuthRedirect;
  const subscribeToRedirects = options.subscribeToRedirects ?? subscribeToPlatformAuthRedirects;

  const [phase, setPhase] = useState<WebAuthPhase>("checking");
  const [uiState, setUiState] = useState<UiAuthState>(
    () => runtime?.getUiState() ?? { status: "disconnected", onboardingExplainer: "", permissionSummary: "" },
  );
  const [statusCopy, setStatusCopy] = useState<string>(() =>
    runtimeCreation.error ? copyFromError(runtimeCreation.error) : "Checking Spotify connection...",
  );
  const [hasSetupError, setHasSetupError] = useState<boolean>(() => runtimeCreation.error !== null);
  const initialSession = readSession(runtime);
  const [sessionAccessToken, setSessionAccessToken] = useState<string | null>(initialSession.accessToken);
  const [sessionAccessTokenExpiresAtMs, setSessionAccessTokenExpiresAtMs] = useState<number | null>(initialSession.accessTokenExpiresAtMs);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let active = true;
    let cleanup: void | (() => void | Promise<void>);

    void Promise.resolve(
      subscribeToRedirects((url) => {
        if (active) {
          setRedirectUrl(url);
        }
      }),
    ).then((nextCleanup) => {
      cleanup = nextCleanup;
    });

    return () => {
      active = false;
      if (cleanup) {
        void cleanup();
      }
    };
  }, [subscribeToRedirects]);

  useEffect(() => {
    if (!runtime || sessionAccessTokenExpiresAtMs === null) {
      return;
    }

    const refreshDelayMs = Math.max(0, sessionAccessTokenExpiresAtMs - Date.now() - SESSION_REFRESH_SKEW_MS);
    const timeoutId = window.setTimeout(() => {
      setRefreshTick((current) => current + 1);
    }, refreshDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [runtime, sessionAccessTokenExpiresAtMs]);

  useEffect(() => {
    if (!runtime) {
      setPhase("ready");
      setStatusCopy(copyFromError(runtimeCreation.error));
      setHasSetupError(true);
      return;
    }

    let active = true;

    const bootstrap = async () => {
      setPhase("checking");
      setStatusCopy("Checking Spotify connection...");
      setHasSetupError(false);

      let setupErrorCopy: string | null = null;

      try {
        const locationToRead = redirectUrl ? () => new URL(redirectUrl) : readLocation;
        await runBootstrap({
          runtime,
          readLocation: locationToRead,
          replaceHistoryUrl: (url) => {
            if (shouldReplaceHistoryUrl(url)) {
              replaceHistoryUrl(url);
            }
            setRedirectUrl(null);
          },
          readRedirect,
        });
      } catch (error) {
        if (active) {
          setupErrorCopy = copyFromError(error);
        }
      } finally {
        if (!active) {
          return;
        }

        const nextState = runtime.getUiState();
        const nextSession = readSession(runtime);
        setUiState(nextState);
        setSessionAccessToken(nextSession.accessToken);
        setSessionAccessTokenExpiresAtMs(nextSession.accessTokenExpiresAtMs);
        if (setupErrorCopy !== null) {
          setStatusCopy(setupErrorCopy);
          setHasSetupError(true);
        } else {
          setStatusCopy(copyFromUiState(nextState));
          setHasSetupError(false);
        }
        setPhase("ready");
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [readLocation, readRedirect, redirectUrl, refreshTick, replaceHistoryUrl, runBootstrap, runtime, runtimeCreation.error]);

  const onConnect = async () => {
    if (!runtime) {
      setPhase("ready");
      setStatusCopy(copyFromError(runtimeCreation.error));
      setHasSetupError(true);
      return;
    }

    setPhase("busy");
    setStatusCopy("Authorizing Spotify connection...");
    setHasSetupError(false);

    const started = await runtime.connectSpotify();
    const nextSession = readSession(runtime);
    setUiState(runtime.getUiState());
    setSessionAccessToken(nextSession.accessToken);
    setSessionAccessTokenExpiresAtMs(nextSession.accessTokenExpiresAtMs);
    navigateToAuthorization(started.authorizeUrl);
  };

  return {
    phase,
    statusCopy,
    hasSetupError,
    uiState,
    onConnect,
    sessionAccessToken,
  };
}
