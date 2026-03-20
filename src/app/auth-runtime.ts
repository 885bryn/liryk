import { bootstrapAuth, type BootstrapAuthDependencies } from "./bootstrap-auth";
import { SpotifyAuthService } from "../core/auth/spotify-auth-service";
import type { SpotifyCallbackInput, SpotifyTokenExchangeResult } from "../core/auth/types";
import { createTokenStore, type PersistedTokens, type TokenStore } from "../infra/auth/token-store";
import {
  getRuntimeSpotifyClient,
  type SpotifyRuntimeAuthClient,
} from "../infra/spotify/spotify-auth-client";
import { getAuthEnv } from "../infra/config/env";
import { AuthStore, type AccountDisplay, type UiAuthState } from "../state/auth/auth-store";

export type RuntimeSession = {
  accessToken: string;
  refreshToken: string;
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
};

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
    if (!refreshToken) {
      return;
    }

    const persisted: PersistedTokens = {
      accessToken: lastExchange.accessToken,
      refreshToken,
      accessTokenExpiresAtMs: now() + lastExchange.expiresInSeconds * 1000,
      grantedScopes: scopesFromSpaceSeparated(lastExchange.scope),
      savedAtMs: now(),
    };

    await tokenStore.saveTokens(persisted);
    applyConnectedSession(persisted);
  }

  return {
    async connectSpotify() {
      const lifecycle = authService.startAuthorization();
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
      const lifecycle = await authService.completeAuthorization(input);
      if (lifecycle.status === "connected") {
        await persistSessionAfterCallback();
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

      return bootstrapAuth(bootstrapDependencies);
    },

    getUiState() {
      return authStore.selectUiState();
    },

    getSession() {
      return currentSession;
    },
  };
}
