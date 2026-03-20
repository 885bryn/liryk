import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SpotifyAuthClient } from "./types";
import { SpotifyAuthService } from "./spotify-auth-service";

vi.mock("../../infra/config/env", () => {
  return {
    getAuthEnv: () => ({
      spotifyClientId: "spotify-client-id",
      spotifyRedirectUri: "http://127.0.0.1:8888/callback",
      appBaseUrl: "http://localhost:3000",
      spotifyAuthScopes: ["user-read-currently-playing", "user-read-playback-state"],
    }),
  };
});

function createClientMock(): SpotifyAuthClient {
  return {
    beginAuthorization: vi.fn(() => ({
      authorizeUrl: "https://accounts.spotify.com/authorize?state=state-123",
      state: "state-123",
      codeVerifier: "verifier-abc",
    })),
    exchangeAuthorizationCode: vi.fn(async () => ({
      accessToken: "access-token-value",
      refreshToken: "refresh-token-value",
      scope: "user-read-currently-playing user-read-playback-state",
      expiresInSeconds: 3600,
    })),
  };
}

describe("SpotifyAuthService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("transitions disconnected -> authorizing -> connected through PKCE flow", async () => {
    const client = createClientMock();
    const service = new SpotifyAuthService(client, () => 1000);

    expect(service.getState()).toEqual({ status: "disconnected" });

    const authorizing = service.startAuthorization();
    expect(authorizing.status).toBe("authorizing");

    const connected = await service.completeAuthorization({ code: "auth-code", state: "state-123" });
    expect(connected).toEqual({
      status: "connected",
      connectedAtMs: 1000,
      grantedScopes: ["user-read-currently-playing", "user-read-playback-state"],
      hasRefreshToken: true,
    });

    expect(service.hasActiveSession()).toBe(true);
  });

  it("returns recoverable_error when callback state does not match", async () => {
    const client = createClientMock();
    const service = new SpotifyAuthService(client, () => 1000);
    service.startAuthorization();

    const errored = await service.completeAuthorization({
      code: "auth-code",
      state: "unexpected-state",
    });

    expect(errored).toEqual({
      status: "recoverable_error",
      code: "state_mismatch",
      message: "Spotify callback state did not match pending authorization state.",
      retryable: true,
    });
  });

  it("never includes tokens in renderer-facing state", async () => {
    const client = createClientMock();
    const service = new SpotifyAuthService(client, () => 1000);
    service.startAuthorization();

    await service.completeAuthorization({ code: "auth-code", state: "state-123" });
    const stateJson = JSON.stringify(service.getState());

    expect(stateJson).not.toContain("access-token-value");
    expect(stateJson).not.toContain("refresh-token-value");
  });
});
