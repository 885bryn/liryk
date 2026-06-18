import { describe, expect, it } from "vitest";

import { readPlatformAuthRedirect } from "./platform-auth-redirect";

describe("platform-auth-redirect", () => {
  it("reads callback params from a standard browser callback URL", () => {
    const url = new URL("http://localhost:3000/callback?code=abc&state=xyz");

    expect(readPlatformAuthRedirect(url)).toEqual({
      callback: { code: "abc", state: "xyz" },
      cleanedUrl: "http://localhost:3000/callback",
      callbackPath: "/callback",
    });
  });

  it("reads callback params from an Android app URL and maps it to the web callback path", () => {
    const url = new URL("app.liryk://callback?code=abc&state=xyz");

    expect(readPlatformAuthRedirect(url)).toEqual({
      callback: { code: "abc", state: "xyz" },
      cleanedUrl: "app.liryk://callback",
      callbackPath: "/callback",
    });
  });
});
