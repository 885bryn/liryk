import { getAuthEnv } from "../../infra/config/env";

import type {
  AuthLifecycleState,
  PendingAuthorization,
  SpotifyAuthClient,
  SpotifyCallbackInput,
} from "./types";

type Clock = () => number;

type InternalSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAtMs: number;
};

export class SpotifyAuthService {
  private state: AuthLifecycleState = { status: "disconnected" };
  private pendingAuthorization: PendingAuthorization | null = null;
  private session: InternalSession | null = null;

  constructor(
    private readonly authClient: SpotifyAuthClient,
    private readonly now: Clock = () => Date.now(),
  ) {}

  getState(): AuthLifecycleState {
    return this.state;
  }

  startAuthorization(): AuthLifecycleState {
    const env = getAuthEnv();
    const requestId = crypto.randomUUID();
    const startedAtMs = this.now();

    const started = this.authClient.beginAuthorization({
      clientId: env.spotifyClientId,
      redirectUri: env.spotifyRedirectUri,
      scopes: env.spotifyAuthScopes,
    });

    this.pendingAuthorization = {
      requestId,
      state: started.state,
      codeVerifier: started.codeVerifier,
      startedAtMs,
      authorizeUrl: started.authorizeUrl,
    };

    this.state = {
      status: "authorizing",
      requestId,
      startedAtMs,
      authorizeUrl: started.authorizeUrl,
    };

    return this.state;
  }

  async completeAuthorization(input: SpotifyCallbackInput): Promise<AuthLifecycleState> {
    if (input.error) {
      this.pendingAuthorization = null;
      this.session = null;
      this.state = {
        status: "recoverable_error",
        code: "callback_error",
        message: `Spotify authorization failed: ${input.error}`,
        retryable: true,
      };
      return this.state;
    }

    if (!this.pendingAuthorization) {
      this.state = {
        status: "recoverable_error",
        code: "state_mismatch",
        message: "No pending authorization request found.",
        retryable: true,
      };
      return this.state;
    }

    if (!input.code) {
      this.pendingAuthorization = null;
      this.state = {
        status: "recoverable_error",
        code: "missing_code",
        message: "Spotify callback did not include an authorization code.",
        retryable: true,
      };
      return this.state;
    }

    if (input.state !== this.pendingAuthorization.state) {
      this.pendingAuthorization = null;
      this.state = {
        status: "recoverable_error",
        code: "state_mismatch",
        message: "Spotify callback state did not match pending authorization state.",
        retryable: true,
      };
      return this.state;
    }

    const env = getAuthEnv();

    try {
      const exchanged = await this.authClient.exchangeAuthorizationCode({
        code: input.code,
        codeVerifier: this.pendingAuthorization.codeVerifier,
        redirectUri: env.spotifyRedirectUri,
        clientId: env.spotifyClientId,
      });

      this.session = {
        accessToken: exchanged.accessToken,
        refreshToken: exchanged.refreshToken,
        expiresAtMs: this.now() + exchanged.expiresInSeconds * 1000,
      };

      this.pendingAuthorization = null;
      this.state = {
        status: "connected",
        connectedAtMs: this.now(),
        grantedScopes: exchanged.scope
          .split(" ")
          .map((scope) => scope.trim())
          .filter(Boolean),
        hasRefreshToken: Boolean(exchanged.refreshToken),
      };

      return this.state;
    } catch (error) {
      this.pendingAuthorization = null;
      this.session = null;
      this.state = {
        status: "recoverable_error",
        code: "exchange_failed",
        message: `Token exchange failed: ${(error as Error).message}`,
        retryable: true,
      };
      return this.state;
    }
  }

  disconnect(): AuthLifecycleState {
    this.pendingAuthorization = null;
    this.session = null;
    this.state = { status: "disconnected" };
    return this.state;
  }

  hasActiveSession(): boolean {
    return Boolean(this.session && this.session.expiresAtMs > this.now());
  }
}
