import { describe, expect, it, vi } from "vitest";

import type { PersistedTokens, TokenStore } from "../../infra/auth/token-store";
import { AuthStore } from "../../state/auth/auth-store";
import { bootstrapAuthSession } from "./session-bootstrap";

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

describe("bootstrapAuthSession", () => {
  it("rehydrates connected state from valid persisted tokens", async () => {
    const tokenStore = createTokenStore(baseTokens);
    const authStore = new AuthStore();
    const applyConnectedSession = vi.fn();
    const onStatus = vi.fn();

    const result = await bootstrapAuthSession({
      tokenStore,
      refreshAccessToken: vi.fn(),
      applyConnectedSession,
      authStore,
      hasPlayback: false,
      now: () => 100_000,
      onStatus,
      accountDisplay: { displayName: "Avery" },
    });

    expect(result).toEqual({ status: "connected", source: "persisted" });
    expect(applyConnectedSession).toHaveBeenCalledWith(baseTokens);
    expect(authStore.selectUiState().status).toBe("connected_waiting_playback");
    expect(onStatus).toHaveBeenLastCalledWith("connected");
  });

  it("refreshes expired token and retries once on transient failure", async () => {
    const tokenStore = createTokenStore({
      ...baseTokens,
      accessTokenExpiresAtMs: 40_000,
    });
    const authStore = new AuthStore();
    const applyConnectedSession = vi.fn();
    const refreshAccessToken = vi
      .fn()
      .mockRejectedValueOnce(new Error("network timeout"))
      .mockResolvedValueOnce({
        accessToken: "new-access",
        refreshToken: "new-refresh",
        scope: "user-read-currently-playing user-read-playback-state",
        expiresInSeconds: 3600,
      });
    const wait = vi.fn(async () => undefined);

    const result = await bootstrapAuthSession({
      tokenStore,
      refreshAccessToken,
      applyConnectedSession,
      authStore,
      hasPlayback: true,
      now: () => 50_000,
      wait,
      retryDelayMs: 1200,
      maxRefreshAttempts: 2,
    });

    expect(refreshAccessToken).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(1200);
    expect((tokenStore.saveTokens as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
    expect(result).toEqual({ status: "connected", source: "refreshed" });
    expect(authStore.selectUiState().status).toBe("success");
  });

  it("clears unrecoverable session and falls back to reconnect", async () => {
    const tokenStore = createTokenStore({
      ...baseTokens,
      accessTokenExpiresAtMs: 50,
      refreshToken: "refresh-token",
    });
    const authStore = new AuthStore();

    const result = await bootstrapAuthSession({
      tokenStore,
      refreshAccessToken: vi.fn(async () => {
        throw new Error("invalid_grant");
      }),
      applyConnectedSession: vi.fn(),
      authStore,
      hasPlayback: false,
      now: () => 100_000,
      maxRefreshAttempts: 2,
    });

    expect(result).toEqual({ status: "reconnect_required", source: "none" });
    expect((tokenStore.clearTokens as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect(authStore.selectUiState().status).toBe("disconnected");
  });
});
