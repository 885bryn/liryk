import type {
  SpotifyAuthClient,
  SpotifyAuthorizationRequest,
  SpotifyAuthorizationStart,
  SpotifyTokenExchangeResult,
} from "../../core/auth/types";
import { getAuthEnv } from "../config/env";
import { createHash, randomBytes } from "node:crypto";

export type SpotifyRefreshResult = {
  accessToken: string;
  expiresInSeconds: number;
  refreshToken?: string;
  scope?: string;
};

export type SpotifyRuntimeAuthClient = SpotifyAuthClient & {
  refreshAccessToken(input: {
    refreshToken: string;
    clientId: string;
  }): Promise<SpotifyRefreshResult>;
};

const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

function base64UrlEncode(input: ArrayBuffer | Uint8Array): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createPkceVerifier(): string {
  const bytes = randomBytes(64);
  return base64UrlEncode(bytes);
}

function createPkceChallenge(codeVerifier: string): string {
  const digest = createHash("sha256").update(codeVerifier).digest();
  return base64UrlEncode(digest);
}

function parseTokenPayload(payload: unknown): SpotifyTokenExchangeResult {
  const candidate = payload as Record<string, unknown>;
  if (candidate.error) {
    throw new Error(String(candidate.error_description ?? candidate.error));
  }

  const accessToken = String(candidate.access_token ?? "").trim();
  const scope = String(candidate.scope ?? "").trim();
  const expiresIn = Number(candidate.expires_in);
  const refreshTokenValue = candidate.refresh_token;

  if (!accessToken || !scope || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error("Spotify token response was missing required fields.");
  }

  return {
    accessToken,
    refreshToken:
      typeof refreshTokenValue === "string" && refreshTokenValue.trim().length > 0
        ? refreshTokenValue
        : undefined,
    scope,
    expiresInSeconds: expiresIn,
  };
}

async function postTokenRequest(params: URLSearchParams): Promise<SpotifyTokenExchangeResult> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const message = String(
      (payload as Record<string, unknown> | null)?.error_description ??
        (payload as Record<string, unknown> | null)?.error ??
        response.statusText,
    );
    throw new Error(`Spotify token endpoint error: ${message}`);
  }

  return parseTokenPayload(payload);
}

export function createSpotifyAuthClient(): SpotifyRuntimeAuthClient {
  return {
    beginAuthorization(request: SpotifyAuthorizationRequest): SpotifyAuthorizationStart {
      const state = crypto.randomUUID();
      const codeVerifier = createPkceVerifier();
      const challenge = createPkceChallenge(codeVerifier);

      const authorizeUrl = new URL(AUTHORIZE_URL);
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("client_id", request.clientId);
      authorizeUrl.searchParams.set("redirect_uri", request.redirectUri);
      authorizeUrl.searchParams.set("state", state);
      authorizeUrl.searchParams.set("scope", request.scopes.join(" "));

      authorizeUrl.searchParams.set("code_challenge", challenge);
      authorizeUrl.searchParams.set("code_challenge_method", "S256");

      return {
        state,
        codeVerifier,
        authorizeUrl: authorizeUrl.toString(),
      };
    },

    async exchangeAuthorizationCode(input): Promise<SpotifyTokenExchangeResult> {
      const params = new URLSearchParams();
      params.set("grant_type", "authorization_code");
      params.set("code", input.code);
      params.set("redirect_uri", input.redirectUri);
      params.set("client_id", input.clientId);
      params.set("code_verifier", input.codeVerifier);
      return postTokenRequest(params);
    },

    async refreshAccessToken(input): Promise<SpotifyRefreshResult> {
      const params = new URLSearchParams();
      params.set("grant_type", "refresh_token");
      params.set("refresh_token", input.refreshToken);
      params.set("client_id", input.clientId);

      const refreshed = await postTokenRequest(params);
      return {
        accessToken: refreshed.accessToken,
        expiresInSeconds: refreshed.expiresInSeconds,
        refreshToken: refreshed.refreshToken,
        scope: refreshed.scope,
      };
    },
  };
}

export function getRuntimeSpotifyClient(): SpotifyRuntimeAuthClient {
  getAuthEnv();
  return createSpotifyAuthClient();
}
