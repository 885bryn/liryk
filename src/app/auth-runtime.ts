import { bootstrapAuth, type BootstrapAuthDependencies } from "./bootstrap-auth";
import { SpotifyAuthService } from "../core/auth/spotify-auth-service";
import type { PendingAuthorization, SpotifyCallbackInput, SpotifyTokenExchangeResult } from "../core/auth/types";
import { createTokenStore, type PersistedTokens, type TokenStore } from "../infra/auth/token-store";
import {
  getRuntimeSpotifyClient,
  type SpotifyRuntimeAuthClient,
} from "../infra/spotify/spotify-auth-client";
import { getAuthEnv } from "../infra/config/env";
import { AuthStore, type AccountDisplay, type UiAuthState } from "../state/auth/auth-store";

export type RuntimeSession = {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAtMs: number;
  grantedScopes: string[];
};

export type AuthRuntime = {
  connectSpotify(): Promise<{ authorizeUrl: string; requestId: string }>;
  completeSpotifyCallback(input: SpotifyCallbackInput): Promise<UiAuthState>;
  initialize(): Promise<{ status: "connected" | "reconnect_required"; source: "persisted" | "refreshed" | "none" }>;
  getUiState(): UiAuthState;
  getSession(): RuntimeSession | null;
};

export type AuthRuntimeDependencies = {
  authStore?: AuthStore;
  tokenStore?: TokenStore;
  spotifyClient?: SpotifyRuntimeAuthClient;
  now?: () => number;
  hasPlayback?: () => boolean;
  getAccountDisplay?: () => AccountDisplay | undefined;
  pendingAuthStore?: PendingAuthStore;
};

type PendingAuthStore = {
  load(): PendingAuthorization | null;
  save(pending: PendingAuthorization): void;
  clear(): void;
};

const PENDING_AUTH_STORAGE_KEY = "liryk-pending-auth";

function createPendingAuthStore(): PendingAuthStore {
  const storage = (() => {
    try {
      return (globalThis as typeof globalThis & { sessionStorage?: Storage }).sessionStorage ?? null;
    } catch {
      return null;
    }
  })();

  if (!storage) {
    return {
      load: () => null,
      save: () => undefined,
      clear: () => undefined,
    };
  }

  return {
    load() {
      const raw = storage.getItem(PENDING_AUTH_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      try {
        const parsed = JSON.parse(raw) as PendingAuthorization;
        if (!parsed?.state || !parsed?.codeVerifier || !parsed?.requestId || !parsed?.authorizeUrl) {
          storage.removeItem(PENDING_AUTH_STORAGE_KEY);
          return null;
        }
        return parsed;
      } catch {
        storage.removeItem(PENDING_AUTH_STORAGE_KEY);
        return null;
      }
    },
    save(pending) {
      storage.setItem(PENDING_AUTH_STORAGE_KEY, JSON.stringify(pending));
    },
    clear() {
      storage.removeItem(PENDING_AUTH_STORAGE_KEY);
    },
  };
}

function scopesFromSpaceSeparated(input: string): string[] {
  return input
    .split(" ")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export function createAuthRuntime(dependencies: AuthRuntimeDependencies = {}): AuthRuntime {
  const now = dependencies.now ?? (() => Date.now());
  const authStore = dependencies.authStore ?? new AuthStore();
  const tokenStore = dependencies.tokenStore ?? createTokenStore();
  const spotifyClient = dependencies.spotifyClient ?? getRuntimeSpotifyClient();
  const hasPlayback = dependencies.hasPlayback ?? (() => false);
  const getAccountDisplay = dependencies.getAccountDisplay ?? (() => undefined);
  const pendingAuthStore = dependencies.pendingAuthStore ?? createPendingAuthStore();
  const env = getAuthEnv();

  let currentSession: RuntimeSession | null = null;
  let lastExchange: SpotifyTokenExchangeResult | null = null;

  const authService = new SpotifyAuthService(
    {
      beginAuthorization: (request) => spotifyClient.beginAuthorization(request),
      exchangeAuthorizationCode: async (input) => {
        const exchanged = await spotifyClient.exchangeAuthorizationCode(input);
        lastExchange = exchanged;
        return exchanged;
      },
    },
    now,
  );

  const applyConnectedSession = (tokens: PersistedTokens): void => {
    currentSession = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAtMs: tokens.accessTokenExpiresAtMs,
      grantedScopes: tokens.grantedScopes,
    };
  };

  async function persistSessionAfterCallback(): Promise<void> {
    if (!lastExchange) {
      return;
    }

    const previous = await tokenStore.loadTokens();
    const refreshToken = lastExchange.refreshToken ?? previous?.refreshToken;
    const accessTokenExpiresAtMs = now() + lastExchange.expiresInSeconds * 1000;
    const grantedScopes = scopesFromSpaceSeparated(lastExchange.scope);

    if (!refreshToken) {
      currentSession = {
        accessToken: lastExchange.accessToken,
        accessTokenExpiresAtMs,
        grantedScopes,
      };
      return;
    }

    const persisted: PersistedTokens = {
      accessToken: lastExchange.accessToken,
      refreshToken,
      accessTokenExpiresAtMs,
      grantedScopes,
      savedAtMs: now(),
    };

    await tokenStore.saveTokens(persisted);
    applyConnectedSession(persisted);
  }

  return {
    async connectSpotify() {
      const lifecycle = await authService.startAuthorization();
      if (lifecycle.status !== "authorizing") {
        throw new Error("Spotify authorization could not be started.");
      }

      const pending = authService.snapshotPendingAuthorization();
      if (pending) {
        pendingAuthStore.save(pending);
      }
      authStore.syncFromLifecycle({
        lifecycle,
        hasPlayback: hasPlayback(),
        accountDisplay: getAccountDisplay(),
      });

      return {
        authorizeUrl: lifecycle.authorizeUrl,
        requestId: lifecycle.requestId,
      };
    },

    async completeSpotifyCallback(input: SpotifyCallbackInput) {
      if (!authService.snapshotPendingAuthorization()) {
        authService.restorePendingAuthorization(pendingAuthStore.load());
      }

      const lifecycle = await authService.completeAuthorization(input);
      if (lifecycle.status === "connected") {
        await persistSessionAfterCallback();
        pendingAuthStore.clear();
      }

      if (lifecycle.status === "recoverable_error") {
        pendingAuthStore.clear();
      }

      return authStore.syncFromLifecycle({
        lifecycle,
        hasPlayback: hasPlayback(),
        accountDisplay: getAccountDisplay(),
      });
    },

    async initialize() {
      const bootstrapDependencies: BootstrapAuthDependencies = {
        tokenStore,
        authStore,
        refreshAccessToken: async (refreshToken: string) => {
          const refreshed = await spotifyClient.refreshAccessToken({
            refreshToken,
            clientId: env.spotifyClientId,
          });
          return refreshed;
        },
        applyConnectedSession,
        hasPlayback: hasPlayback(),
        accountDisplay: getAccountDisplay(),
        now,
      };

      const result = await bootstrapAuth(bootstrapDependencies);
      if (result.status === "connected") {
        pendingAuthStore.clear();
      }
      return result;
    },

    getUiState() {
      return authStore.selectUiState();
    },

    getSession() {
      return currentSession;
    },
  };
}
