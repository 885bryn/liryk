import { describe, expect, it, vi } from "vitest";

import {
  extractSpotifyCallback,
  removeSpotifyCallbackParams,
  runWebAuthBootstrap,
} from "./web-auth-controller";

describe("web-auth-controller", () => {
  it("detects callback mode only for code+state or error query params", () => {
    expect(extractSpotifyCallback("?code=abc&state=xyz")).toEqual({
      code: "abc",
      state: "xyz",
    });
    expect(extractSpotifyCallback("?error=access_denied")).toEqual({
      error: "access_denied",
    });

    expect(extractSpotifyCallback("?code=abc")).toBeNull();
    expect(extractSpotifyCallback("?state=xyz")).toBeNull();
    expect(extractSpotifyCallback("?foo=1")).toBeNull();
  });

  it("runs callback completion once and removes only spotify callback params", async () => {
    const initialize = vi.fn(async () => ({ status: "connected", source: "none" as const }));
    const completeSpotifyCallback = vi.fn(async () => ({ status: "success" as const }));
    const replaceHistoryUrl = vi.fn();
    const location = new URL("http://localhost:3000/?code=abc&state=xyz&foo=1");

    await runWebAuthBootstrap({
      runtime: { initialize, completeSpotifyCallback },
      readLocation: () => new URL(location.toString()),
      replaceHistoryUrl,
    });

    expect(completeSpotifyCallback).toHaveBeenCalledTimes(1);
    expect(completeSpotifyCallback).toHaveBeenCalledWith({ code: "abc", state: "xyz" });
    expect(replaceHistoryUrl).toHaveBeenCalledWith("http://localhost:3000/?foo=1");
  });

  it("does not replay callback completion after callback params are cleaned", async () => {
    const initialize = vi.fn(async () => ({ status: "connected", source: "none" as const }));
    const completeSpotifyCallback = vi.fn(async () => ({ status: "success" as const }));
    const location = new URL("http://localhost:3000/?code=abc&state=xyz&foo=1");

    await runWebAuthBootstrap({
      runtime: { initialize, completeSpotifyCallback },
      readLocation: () => new URL(location.toString()),
      replaceHistoryUrl: (nextUrl) => {
        location.href = nextUrl;
      },
    });

    await runWebAuthBootstrap({
      runtime: { initialize, completeSpotifyCallback },
      readLocation: () => new URL(location.toString()),
      replaceHistoryUrl: vi.fn(),
    });

    expect(completeSpotifyCallback).toHaveBeenCalledTimes(1);
    expect(initialize).toHaveBeenCalledTimes(2);
  });

  it("removes only code, state, and error while preserving all other params", () => {
    const url = new URL("http://localhost:3000/?error=access_denied&foo=1&bar=2");

    const cleaned = removeSpotifyCallbackParams(url);

    expect(cleaned.toString()).toBe("http://localhost:3000/?foo=1&bar=2");
  });
});
