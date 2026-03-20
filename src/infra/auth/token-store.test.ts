import { describe, expect, it, vi } from "vitest";

import { createTokenStore, type PersistedTokens, type SecureSecretStore } from "./token-store";

function createMemorySecureStore(initial: Record<string, string> = {}): {
  secureStore: SecureSecretStore;
  records: Record<string, string>;
} {
  const records = { ...initial };
  return {
    records,
    secureStore: {
      getSecret: vi.fn(async (key: string) => records[key] ?? null),
      setSecret: vi.fn(async (key: string, value: string) => {
        records[key] = value;
      }),
      deleteSecret: vi.fn(async (key: string) => {
        delete records[key];
      }),
    },
  };
}

describe("token-store", () => {
  it("saves and loads persisted tokens through secure storage", async () => {
    const backing = createMemorySecureStore();
    const store = createTokenStore({ secureStore: backing.secureStore });

    const tokens: PersistedTokens = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      accessTokenExpiresAtMs: 1_777_777_777_000,
      grantedScopes: ["user-read-currently-playing"],
      savedAtMs: 1_777_777_700_000,
    };

    await store.saveTokens(tokens);
    const loaded = await store.loadTokens();

    expect(loaded).toEqual(tokens);
    expect(backing.records).not.toEqual(tokens as unknown as Record<string, string>);
  });

  it("clears persisted tokens for logout/account switch", async () => {
    const backing = createMemorySecureStore({
      "spotify-auth-session": JSON.stringify({
        accessToken: "token",
        refreshToken: "refresh",
        accessTokenExpiresAtMs: 100,
        grantedScopes: ["scope"],
        savedAtMs: 10,
      }),
    });
    const store = createTokenStore({ secureStore: backing.secureStore });

    await store.clearTokens();

    expect(await store.loadTokens()).toBeNull();
  });

  it("deletes corrupted entries and returns null", async () => {
    const backing = createMemorySecureStore({
      "spotify-auth-session": "{not-valid-json",
    });
    const store = createTokenStore({ secureStore: backing.secureStore });

    expect(await store.loadTokens()).toBeNull();
    expect(backing.records["spotify-auth-session"]).toBeUndefined();
  });

  it("deletes malformed payload entries and returns null", async () => {
    const backing = createMemorySecureStore({
      "spotify-auth-session": JSON.stringify({
        accessToken: "access",
        accessTokenExpiresAtMs: 99,
      }),
    });
    const store = createTokenStore({ secureStore: backing.secureStore });

    expect(await store.loadTokens()).toBeNull();
    expect(backing.records["spotify-auth-session"]).toBeUndefined();
  });
});
