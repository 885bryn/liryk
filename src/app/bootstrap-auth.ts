import type { AuthStore, AccountDisplay } from "../state/auth/auth-store";
import type { TokenStore, PersistedTokens } from "../infra/auth/token-store";
import { bootstrapAuthSession, type BootstrapResult } from "../core/auth/session-bootstrap";

export type BootstrapAuthDependencies = {
  tokenStore: TokenStore;
  authStore: Pick<
    AuthStore,
    "setConnectedWaitingPlayback" | "authorizeSuccess" | "setRecoverableError" | "resetAuthError"
  >;
  refreshAccessToken: (refreshToken: string) => Promise<{
    accessToken: string;
    expiresInSeconds: number;
    refreshToken?: string;
    scope?: string;
  }>;
  applyConnectedSession: (tokens: PersistedTokens) => void;
  accountDisplay?: AccountDisplay;
  hasPlayback: boolean;
  onStatus?: (status: string) => void;
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
  maxRefreshAttempts?: number;
  retryDelayMs?: number;
};

export async function bootstrapAuth(
  dependencies: BootstrapAuthDependencies,
): Promise<BootstrapResult> {
  return bootstrapAuthSession({
    tokenStore: dependencies.tokenStore,
    authStore: dependencies.authStore,
    refreshAccessToken: dependencies.refreshAccessToken,
    applyConnectedSession: dependencies.applyConnectedSession,
    accountDisplay: dependencies.accountDisplay,
    hasPlayback: dependencies.hasPlayback,
    onStatus: dependencies.onStatus,
    now: dependencies.now,
    wait: dependencies.wait,
    maxRefreshAttempts: dependencies.maxRefreshAttempts,
    retryDelayMs: dependencies.retryDelayMs,
  });
}
