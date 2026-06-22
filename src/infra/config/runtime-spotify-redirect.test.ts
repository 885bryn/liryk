import { describe, expect, it } from "vitest";

import { resolveRuntimeSpotifyRedirectUri } from "./runtime-spotify-redirect";

describe("resolveRuntimeSpotifyRedirectUri", () => {
  it("keeps the configured redirect URI for regular browser development", () => {
    expect(
      resolveRuntimeSpotifyRedirectUri("http://127.0.0.1:5173/callback", {
        getPlatform: () => "web",
        readLocation: () => new URL("http://127.0.0.1:5173/"),
      }),
    ).toBe("http://127.0.0.1:5173/callback");
  });

  it("switches to the Android app callback URI inside the Capacitor shell", () => {
    expect(
      resolveRuntimeSpotifyRedirectUri("http://127.0.0.1:5173/callback", {
        getPlatform: () => "android",
        readLocation: () => new URL("https://localhost/"),
      }),
    ).toBe("app.liryk://callback");
  });
});
