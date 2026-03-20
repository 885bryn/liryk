import { describe, expect, it, vi } from "vitest";

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
  it("assembles runtime auth service and starts authorization through runtime API", async () => {
    const authStore = new AuthStore();
    const spotifyClient = {
      beginAuthorization: vi.fn(() => ({
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
        refreshToken: "refresh",
        expiresInSeconds: 3600,
        scope: "user-read-currently-playing user-read-playback-state",
      })),
    };

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
});
