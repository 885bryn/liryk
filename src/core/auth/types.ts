export type AuthLifecycleState =
  | { status: "disconnected" }
  | {
      status: "authorizing";
      requestId: string;
      authorizeUrl: string;
      startedAtMs: number;
    }
  | {
      status: "connected";
      connectedAtMs: number;
      grantedScopes: string[];
      hasRefreshToken: boolean;
    }
  | {
      status: "recoverable_error";
      message: string;
      code: "state_mismatch" | "callback_error" | "exchange_failed" | "missing_code";
      retryable: boolean;
    };

export type PendingAuthorization = {
  requestId: string;
  state: string;
  codeVerifier: string;
  startedAtMs: number;
  authorizeUrl: string;
};

export type SpotifyAuthorizationRequest = {
  clientId: string;
  redirectUri: string;
  scopes: string[];
};

export type SpotifyAuthorizationStart = {
  authorizeUrl: string;
  state: string;
  codeVerifier: string;
};

export type SpotifyTokenExchangeResult = {
  accessToken: string;
  refreshToken?: string;
  scope: string;
  expiresInSeconds: number;
};

export type SpotifyCallbackInput = {
  code?: string;
  state?: string;
  error?: string;
};

export interface SpotifyAuthClient {
  beginAuthorization(request: SpotifyAuthorizationRequest): SpotifyAuthorizationStart;
  exchangeAuthorizationCode(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    clientId: string;
  }): Promise<SpotifyTokenExchangeResult>;
}
