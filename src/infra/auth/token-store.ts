export type PersistedTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtMs: number;
  grantedScopes: string[];
  savedAtMs: number;
};

export interface SecureSecretStore {
  getSecret(key: string): Promise<string | null>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;
}

type GlobalSecureStore = {
  getSecret?: (key: string) => Promise<string | null>;
  setSecret?: (key: string, value: string) => Promise<void>;
  deleteSecret?: (key: string) => Promise<void>;
};

export type TokenStore = {
  loadTokens(): Promise<PersistedTokens | null>;
  saveTokens(tokens: PersistedTokens): Promise<void>;
  clearTokens(): Promise<void>;
};

const DEFAULT_SECRET_KEY = "spotify-auth-session";

function isValidTokens(value: unknown): value is PersistedTokens {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.accessToken === "string" &&
    candidate.accessToken.length > 0 &&
    typeof candidate.refreshToken === "string" &&
    candidate.refreshToken.length > 0 &&
    typeof candidate.accessTokenExpiresAtMs === "number" &&
    Number.isFinite(candidate.accessTokenExpiresAtMs) &&
    candidate.accessTokenExpiresAtMs > 0 &&
    Array.isArray(candidate.grantedScopes) &&
    candidate.grantedScopes.every((scope) => typeof scope === "string") &&
    typeof candidate.savedAtMs === "number" &&
    Number.isFinite(candidate.savedAtMs)
  );
}

function resolveDefaultSecureStore(): SecureSecretStore {
  const globalStore = (globalThis as typeof globalThis & { __LIRYK_SECURE_STORE__?: GlobalSecureStore })
    .__LIRYK_SECURE_STORE__;

  if (
    globalStore &&
    typeof globalStore.getSecret === "function" &&
    typeof globalStore.setSecret === "function" &&
    typeof globalStore.deleteSecret === "function"
  ) {
    return {
      getSecret: (key) => globalStore.getSecret!(key),
      setSecret: (key, value) => globalStore.setSecret!(key, value),
      deleteSecret: (key) => globalStore.deleteSecret!(key),
    };
  }

  throw new Error(
    "Secure token store is unavailable. Configure globalThis.__LIRYK_SECURE_STORE__ in the desktop shell.",
  );
}

export function createTokenStore(input: {
  secureStore?: SecureSecretStore;
  secretKey?: string;
} = {}): TokenStore {
  const secureStore = input.secureStore ?? resolveDefaultSecureStore();
  const secretKey = input.secretKey ?? DEFAULT_SECRET_KEY;

  return {
    async loadTokens(): Promise<PersistedTokens | null> {
      const raw = await secureStore.getSecret(secretKey);
      if (!raw) {
        return null;
      }

      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!isValidTokens(parsed)) {
          await secureStore.deleteSecret(secretKey);
          return null;
        }

        return parsed;
      } catch {
        await secureStore.deleteSecret(secretKey);
        return null;
      }
    },

    async saveTokens(tokens: PersistedTokens): Promise<void> {
      await secureStore.setSecret(secretKey, JSON.stringify(tokens));
    },

    async clearTokens(): Promise<void> {
      await secureStore.deleteSecret(secretKey);
    },
  };
}
