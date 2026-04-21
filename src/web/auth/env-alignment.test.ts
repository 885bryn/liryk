import { describe, expect, it, vi } from "vitest";

type MockEnv = {
  appBaseUrl: string;
  spotifyRedirectUri: string;
};

let mockEnv: MockEnv = {
  appBaseUrl: "http://localhost:3000",
  spotifyRedirectUri: "http://localhost:3000/callback",
};

vi.mock("../../infra/config/env", () => ({
  getAuthEnv: () => ({
    spotifyClientId: "spotify-client-id",
    spotifyAuthScopes: ["user-read-currently-playing"],
    appBaseUrl: mockEnv.appBaseUrl,
    spotifyRedirectUri: mockEnv.spotifyRedirectUri,
  }),
}));

import { getEnvAlignmentDiagnostics } from "./env-alignment";

describe("getEnvAlignmentDiagnostics", () => {
  it("returns ok for matching localhost origin and callback path", () => {
    mockEnv = {
      appBaseUrl: "http://localhost:3000",
      spotifyRedirectUri: "http://localhost:3000/callback",
    };

    const diagnostics = getEnvAlignmentDiagnostics({
      currentUrl: new URL("http://localhost:3000/callback"),
    });

    expect(diagnostics).toEqual({ status: "ok", messages: [] });
  });

  it("warns with expected and actual origin when APP_BASE_URL origin mismatches", () => {
    mockEnv = {
      appBaseUrl: "http://127.0.0.1:5173",
      spotifyRedirectUri: "http://localhost:3000/callback",
    };

    const diagnostics = getEnvAlignmentDiagnostics({
      currentUrl: new URL("http://localhost:3000/callback"),
    });

    expect(diagnostics.status).toBe("warning");
    expect(diagnostics.messages.some((message) => message.includes("APP_BASE_URL origin mismatch"))).toBe(true);
    expect(diagnostics.messages.some((message) => message.includes("expected http://127.0.0.1:5173"))).toBe(true);
    expect(diagnostics.messages.some((message) => message.includes("actual http://localhost:3000"))).toBe(true);
  });

  it("warns when SPOTIFY_REDIRECT_URI path does not match callback route", () => {
    mockEnv = {
      appBaseUrl: "http://localhost:3000",
      spotifyRedirectUri: "http://localhost:3000/",
    };

    const diagnostics = getEnvAlignmentDiagnostics({
      currentUrl: new URL("http://localhost:3000/callback"),
      requiredCallbackPath: "/callback",
    });

    expect(diagnostics.status).toBe("warning");
    expect(diagnostics.messages.some((message) => message.includes("SPOTIFY_REDIRECT_URI path mismatch"))).toBe(true);
    expect(diagnostics.messages.some((message) => message.includes("required /callback"))).toBe(true);
  });
});
