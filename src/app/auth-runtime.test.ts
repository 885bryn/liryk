import { describe, expect, it, vi } from "vitest";

import type { PersistedTokens, TokenStore } from "../infra/auth/token-store";
import { AuthStore } from "../state/auth/auth-store";
import { createAuthRuntime } from "./auth-runtime";

vi.mock("../infra/config/env", () => {
  return {
    getAuthEnv: () => ({
      spotifyClientId: "spotify-client-id",
      spotifyRedirectUri: "http://127.0.0.1:8888/callback",
      appBaseUrl: "http://localhost:3000",
      spotifyAuthScopes: ["user-read-currently-playing", "user-read-playback-state"],
    }),
  };
});

describe("createAuthRuntime", () => {
  const baseTokens: PersistedTokens = {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    accessTokenExpiresAtMs: 200_000,
    grantedScopes: ["user-read-currently-playing"],
    savedAtMs: 100_000,
  };

  function createTokenStore(tokens: PersistedTokens | null): TokenStore {
    let stored = tokens;
    return {
      loadTokens: vi.fn(async () => stored),
      saveTokens: vi.fn(async (next) => {
        stored = next;
      }),
      clearTokens: vi.fn(async () => {
        stored = null;
      }),
    };
  }

  function createSpotifyClientMock() {
    return {
      beginAuthorization: vi.fn(async () => ({
        authorizeUrl: "https://accounts.spotify.com/authorize?state=test-state",
        state: "test-state",
        codeVerifier: "test-verifier",
      })),
      exchangeAuthorizationCode: vi.fn(async () => ({
        accessToken: "token",
        refreshToken: "refresh",
        scope: "user-read-currently-playing user-read-playback-state",
        expiresInSeconds: 3600,
      })),
      refreshAccessToken: vi.fn(async () => ({
        accessToken: "refreshed",
        refreshToken: "refresh-token",
        expiresInSeconds: 3600,
        scope: "user-read-currently-playing user-read-playback-state",
      })),
    };
  }

  it("assembles runtime auth service and starts authorization through runtime API", async () => {
    const authStore = new AuthStore();
    const spotifyClient = createSpotifyClientMock();

    const runtime = createAuthRuntime({
      authStore,
      spotifyClient,
      tokenStore: {
        loadTokens: vi.fn(async () => null),
        saveTokens: vi.fn(async () => undefined),
        clearTokens: vi.fn(async () => undefined),
      },
      now: () => 1000,
    });

    const result = await runtime.connectSpotify();

    expect(result.authorizeUrl).toContain("https://accounts.spotify.com/authorize");
    expect(result.requestId).toBeTypeOf("string");
    expect(authStore.selectUiState().status).toBe("authorizing");
    expect(spotifyClient.beginAuthorization).toHaveBeenCalledTimes(1);
  });

  it("bootstraps persisted tokens into connected waiting playback state", async () => {
    const authStore = new AuthStore();
    const tokenStore = createTokenStore(baseTokens);
    const spotifyClient = createSpotifyClientMock();

    const runtime = createAuthRuntime({
      authStore,
      tokenStore,
      spotifyClient,
      now: () => 100_000,
      hasPlayback: () => false,
      getAccountDisplay: () => ({ displayName: "Avery" }),
    });

    const result = await runtime.initialize();

    expect(result).toEqual({ status: "connected", source: "persisted" });
    expect(runtime.getSession()).toMatchObject({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    expect(authStore.selectUiState().status).toBe("connected_waiting_playback");
  });

  it("refreshes expired tokens during startup and keeps connected state", async () => {
    const authStore = new AuthStore();
    const tokenStore = createTokenStore({
      ...baseTokens,
      accessTokenExpiresAtMs: 10,
    });
    const spotifyClient = createSpotifyClientMock();

    const runtime = createAuthRuntime({
      authStore,
      tokenStore,
      spotifyClient,
      now: () => 100_000,
      hasPlayback: () => true,
      getAccountDisplay: () => ({ displayName: "Avery" }),
    });

    const result = await runtime.initialize();

    expect(result).toEqual({ status: "connected", source: "refreshed" });
    expect(spotifyClient.refreshAccessToken).toHaveBeenCalledWith({
      refreshToken: "refresh-token",
      clientId: "spotify-client-id",
    });
    expect(authStore.selectUiState().status).toBe("success");
  });

  it("clears invalid startup session and falls back to reconnect state", async () => {
    const authStore = new AuthStore();
    const tokenStore = createTokenStore({
      ...baseTokens,
      accessTokenExpiresAtMs: 10,
    });
    const spotifyClient = createSpotifyClientMock();
    spotifyClient.refreshAccessToken.mockRejectedValueOnce(new Error("invalid_grant"));

    const runtime = createAuthRuntime({
      authStore,
      tokenStore,
      spotifyClient,
      now: () => 100_000,
      hasPlayback: () => false,
    });

    const result = await runtime.initialize();

    expect(result).toEqual({ status: "reconnect_required", source: "none" });
    expect((tokenStore.clearTokens as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect(authStore.selectUiState().status).toBe("disconnected");
  });

  it("restores pending authorization across redirect before completing callback", async () => {
    const pendingStore = {
      value: null as unknown,
      load: vi.fn(() => pendingStore.value as {
        requestId: string;
        state: string;
        codeVerifier: string;
        startedAtMs: number;
        authorizeUrl: string;
      } | null),
      save: vi.fn((value: unknown) => {
        pendingStore.value = value;
      }),
      clear: vi.fn(() => {
        pendingStore.value = null;
      }),
    };

    const spotifyClient = createSpotifyClientMock();
    const first = createAuthRuntime({
      authStore: new AuthStore(),
      spotifyClient,
      tokenStore: createTokenStore(null),
      pendingAuthStore: pendingStore,
      now: () => 1000,
      hasPlayback: () => false,
      getAccountDisplay: () => ({ displayName: "Avery" }),
    });

    await first.connectSpotify();
    expect(pendingStore.save).toHaveBeenCalledTimes(1);

    const second = createAuthRuntime({
      authStore: new AuthStore(),
      spotifyClient,
      tokenStore: createTokenStore(null),
      pendingAuthStore: pendingStore,
      now: () => 1000,
      hasPlayback: () => false,
      getAccountDisplay: () => ({ displayName: "Avery" }),
    });

    const state = await second.completeSpotifyCallback({ code: "spotify-code", state: "test-state" });
    expect(state.status).toBe("connected_waiting_playback");
    expect(spotifyClient.exchangeAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(pendingStore.clear).toHaveBeenCalledTimes(1);
  });

  it("keeps an in-memory access token when callback returns no refresh token", async () => {
    const pendingStore = {
      value: null as unknown,
      load: vi.fn(() => pendingStore.value as {
        requestId: string;
        state: string;
        codeVerifier: string;
        startedAtMs: number;
        authorizeUrl: string;
      } | null),
      save: vi.fn((value: unknown) => {
        pendingStore.value = value;
      }),
      clear: vi.fn(() => {
        pendingStore.value = null;
      }),
    };

    const tokenStore = createTokenStore(null);
    const spotifyClient = createSpotifyClientMock();
    spotifyClient.exchangeAuthorizationCode.mockResolvedValueOnce({
      accessToken: "ephemeral-token",
      refreshToken: "",
      scope: "user-read-currently-playing user-read-playback-state",
      expiresInSeconds: 3600,
    });

    const first = createAuthRuntime({
      authStore: new AuthStore(),
      spotifyClient,
      tokenStore,
      pendingAuthStore: pendingStore,
      now: () => 1000,
      hasPlayback: () => false,
      getAccountDisplay: () => ({ displayName: "Avery" }),
    });
    await first.connectSpotify();

    const second = createAuthRuntime({
      authStore: new AuthStore(),
      spotifyClient,
      tokenStore,
      pendingAuthStore: pendingStore,
      now: () => 1000,
      hasPlayback: () => false,
      getAccountDisplay: () => ({ displayName: "Avery" }),
    });

    const state = await second.completeSpotifyCallback({ code: "spotify-code", state: "test-state" });

    expect(state.status).toBe("connected_waiting_playback");
    expect(second.getSession()).toMatchObject({
      accessToken: "ephemeral-token",
      grantedScopes: ["user-read-currently-playing", "user-read-playback-state"],
    });
    expect(tokenStore.saveTokens).not.toHaveBeenCalled();
  });
  it("clears the in-memory session when a later token refresh fails", async () => {
    const authStore = new AuthStore();
    const tokenStore = createTokenStore({
      ...baseTokens,
      accessTokenExpiresAtMs: 200_000,
    });
    const spotifyClient = createSpotifyClientMock();
    let nowMs = 100_000;

    const runtime = createAuthRuntime({
      authStore,
      tokenStore,
      spotifyClient,
      now: () => nowMs,
      hasPlayback: () => true,
      getAccountDisplay: () => ({ displayName: "Avery" }),
    });

    await runtime.initialize();
    expect(runtime.getSession()).toMatchObject({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    nowMs = 220_000;
    spotifyClient.refreshAccessToken.mockRejectedValueOnce(new Error("invalid_grant"));

    const result = await runtime.initialize();

    expect(result).toEqual({ status: "reconnect_required", source: "none" });
    expect(runtime.getSession()).toBeNull();
  });

});
