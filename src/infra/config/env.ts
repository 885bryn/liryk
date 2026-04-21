type EnvSource = Record<string, string | undefined>;

export type AuthEnv = {
  spotifyClientId: string;
  spotifyRedirectUri: string;
  appBaseUrl: string;
  spotifyAuthScopes: string[];
};

const REQUIRED_KEYS = [
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_REDIRECT_URI",
  "APP_BASE_URL",
  "SPOTIFY_AUTH_SCOPES",
] as const;

function resolveDefaultEnvSource(): EnvSource {
  const source: EnvSource = {};

  const processEnv =
    typeof process !== "undefined" && process.env
      ? (process.env as Record<string, string | undefined>)
      : undefined;
  if (processEnv) {
    Object.assign(source, processEnv);
  }

  const importMetaEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  if (importMetaEnv) {
    Object.assign(source, importMetaEnv);
  }

  return source;
}

function withViteAliases(source: EnvSource): EnvSource {
  const normalized: EnvSource = { ...source };

  for (const key of REQUIRED_KEYS) {
    if (!normalized[key]) {
      normalized[key] = source[`VITE_${key}`];
    }
  }

  return normalized;
}

function readRequired(source: EnvSource, key: (typeof REQUIRED_KEYS)[number]): string {
  const value = source[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function assertValidUrl(name: string, value: string): string {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${name} must use http or https`);
  }

  return value;
}

function parseScopes(rawScopes: string): string[] {
  const scopes = rawScopes
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);

  if (scopes.length === 0) {
    throw new Error("SPOTIFY_AUTH_SCOPES must contain at least one scope");
  }

  return scopes;
}

export function loadAuthEnv(source: EnvSource = resolveDefaultEnvSource()): AuthEnv {
  const resolvedSource = withViteAliases(source);
  const errors: string[] = [];

  const values = {} as Record<(typeof REQUIRED_KEYS)[number], string>;

  for (const key of REQUIRED_KEYS) {
    try {
      values[key] = readRequired(resolvedSource, key);
    } catch (error) {
      errors.push((error as Error).message);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid auth environment:\n- ${errors.join("\n- ")}`);
  }

  const urlErrors: string[] = [];

  let spotifyRedirectUri = values.SPOTIFY_REDIRECT_URI;
  let appBaseUrl = values.APP_BASE_URL;

  try {
    spotifyRedirectUri = assertValidUrl("SPOTIFY_REDIRECT_URI", spotifyRedirectUri);
  } catch (error) {
    urlErrors.push((error as Error).message);
  }

  try {
    appBaseUrl = assertValidUrl("APP_BASE_URL", appBaseUrl);
  } catch (error) {
    urlErrors.push((error as Error).message);
  }

  let spotifyAuthScopes: string[] = [];

  try {
    spotifyAuthScopes = parseScopes(values.SPOTIFY_AUTH_SCOPES);
  } catch (error) {
    urlErrors.push((error as Error).message);
  }

  if (urlErrors.length > 0) {
    throw new Error(`Invalid auth environment:\n- ${urlErrors.join("\n- ")}`);
  }

  return {
    spotifyClientId: values.SPOTIFY_CLIENT_ID,
    spotifyRedirectUri,
    appBaseUrl,
    spotifyAuthScopes,
  };
}

let cachedAuthEnv: AuthEnv | null = null;

export function getAuthEnv(source: EnvSource = resolveDefaultEnvSource()): AuthEnv {
  if (cachedAuthEnv) {
    return cachedAuthEnv;
  }

  cachedAuthEnv = loadAuthEnv(source);
  return cachedAuthEnv;
}

export function resetAuthEnvForTests(): void {
  cachedAuthEnv = null;
}
