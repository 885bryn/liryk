import type { AuthStore, AuthErrorReason, AccountDisplay } from "../../state/auth/auth-store";
import type { PersistedTokens, TokenStore } from "../../infra/auth/token-store";

export type BootstrapStatus =
  | "idle"
  | "loading"
  | "refresh_retrying"
  | "connected"
  | "reconnect_required";

export type BootstrapResult = {
  status: "connected" | "reconnect_required";
  source: "persisted" | "refreshed" | "none";
};

export type RefreshAccessTokenResult = {
  accessToken: string;
  expiresInSeconds: number;
  refreshToken?: string;
  scope?: string;
};

export type SessionBootstrapDependencies = {
  tokenStore: TokenStore;
  refreshAccessToken: (refreshToken: string) => Promise<RefreshAccessTokenResult>;
  applyConnectedSession: (tokens: PersistedTokens) => void;
  authStore: Pick<
    AuthStore,
    "setConnectedWaitingPlayback" | "authorizeSuccess" | "setRecoverableError" | "resetAuthError"
  >;
  accountDisplay?: AccountDisplay;
  hasPlayback: boolean;
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
  onStatus?: (status: BootstrapStatus) => void;
  maxRefreshAttempts?: number;
  retryDelayMs?: number;
};

const EXPIRY_SKEW_MS = 30_000;

function inferErrorReason(error: unknown): AuthErrorReason {
  const message = String((error as Error)?.message ?? "").toLowerCase();
  if (message.includes("rate")) {
    return "rate-limit";
  }
  if (message.includes("timeout")) {
    return "timeout";
  }
  if (message.includes("network") || message.includes("fetch") || message.includes("temporar")) {
    return "network";
  }
  return "unknown";
}

function isTransientError(error: unknown): boolean {
  const reason = inferErrorReason(error);
  return reason === "network" || reason === "timeout" || reason === "rate-limit";
}

const defaultWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function setConnectedUi(
  authStore: SessionBootstrapDependencies["authStore"],
  hasPlayback: boolean,
  accountDisplay?: AccountDisplay,
): void {
  if (hasPlayback) {
    authStore.authorizeSuccess(accountDisplay);
    return;
  }
  authStore.setConnectedWaitingPlayback(accountDisplay);
}

export async function bootstrapAuthSession(
  dependencies: SessionBootstrapDependencies,
): Promise<BootstrapResult> {
  const now = dependencies.now ?? (() => Date.now());
  const wait = dependencies.wait ?? defaultWait;
  const maxRefreshAttempts = dependencies.maxRefreshAttempts ?? 2;
  const retryDelayMs = dependencies.retryDelayMs ?? 2000;

  dependencies.onStatus?.("loading");

  const persisted = await dependencies.tokenStore.loadTokens();
  if (!persisted) {
    dependencies.authStore.resetAuthError();
    dependencies.onStatus?.("reconnect_required");
    return { status: "reconnect_required", source: "none" };
  }

  if (persisted.accessTokenExpiresAtMs > now() + EXPIRY_SKEW_MS) {
    dependencies.applyConnectedSession(persisted);
    setConnectedUi(dependencies.authStore, dependencies.hasPlayback, dependencies.accountDisplay);
    dependencies.onStatus?.("connected");
    return { status: "connected", source: "persisted" };
  }

  if (!persisted.refreshToken) {
    await dependencies.tokenStore.clearTokens();
    dependencies.authStore.resetAuthError();
    dependencies.onStatus?.("reconnect_required");
    return { status: "reconnect_required", source: "none" };
  }

  for (let attempt = 1; attempt <= maxRefreshAttempts; attempt += 1) {
    try {
      const refreshed = await dependencies.refreshAccessToken(persisted.refreshToken);
      const updated: PersistedTokens = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? persisted.refreshToken,
        accessTokenExpiresAtMs: now() + refreshed.expiresInSeconds * 1000,
        grantedScopes: refreshed.scope
          ? refreshed.scope
              .split(" ")
              .map((scope) => scope.trim())
              .filter(Boolean)
          : persisted.grantedScopes,
        savedAtMs: now(),
      };

      await dependencies.tokenStore.saveTokens(updated);
      dependencies.applyConnectedSession(updated);
      setConnectedUi(dependencies.authStore, dependencies.hasPlayback, dependencies.accountDisplay);
      dependencies.onStatus?.("connected");
      return { status: "connected", source: "refreshed" };
    } catch (error) {
      const transient = isTransientError(error);
      const reason = inferErrorReason(error);

      if (transient && attempt < maxRefreshAttempts) {
        dependencies.authStore.setRecoverableError({
          reason,
          retryEligible: true,
          autoRetryInMs: retryDelayMs,
        });
        dependencies.onStatus?.("refresh_retrying");
        await wait(retryDelayMs);
        continue;
      }

      break;
    }
  }

  await dependencies.tokenStore.clearTokens();
  dependencies.authStore.resetAuthError();
  dependencies.onStatus?.("reconnect_required");
  return { status: "reconnect_required", source: "none" };
}
