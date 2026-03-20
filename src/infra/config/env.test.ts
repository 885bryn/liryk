import { describe, expect, it } from "vitest";

import { loadAuthEnv } from "./env";

describe("loadAuthEnv", () => {
  it("returns typed auth config for valid env values", () => {
    const env = loadAuthEnv({
      SPOTIFY_CLIENT_ID: "spotify-client-id",
      SPOTIFY_REDIRECT_URI: "http://127.0.0.1:8888/callback",
      APP_BASE_URL: "http://localhost:3000",
      SPOTIFY_AUTH_SCOPES: "user-read-playback-state, user-read-currently-playing",
    });

    expect(env).toEqual({
      spotifyClientId: "spotify-client-id",
      spotifyRedirectUri: "http://127.0.0.1:8888/callback",
      appBaseUrl: "http://localhost:3000",
      spotifyAuthScopes: ["user-read-playback-state", "user-read-currently-playing"],
    });
  });

  it("fails fast with readable errors when required variables are missing", () => {
    expect(() =>
      loadAuthEnv({
        SPOTIFY_CLIENT_ID: "spotify-client-id",
        APP_BASE_URL: "http://localhost:3000",
      }),
    ).toThrowError(
      "Invalid auth environment:\n- Missing required environment variable: SPOTIFY_REDIRECT_URI\n- Missing required environment variable: SPOTIFY_AUTH_SCOPES",
    );
  });
});
