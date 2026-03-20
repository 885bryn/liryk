import type { AuthLifecycleState } from "../../core/auth/types";

export type AuthErrorReason = "cancel" | "timeout" | "network" | "rate-limit" | "unknown";

export type AccountDisplay = {
  displayName: string;
  spotifyUserId?: string;
};

type BaseUiState = {
  onboardingExplainer: string;
  permissionSummary: string;
};

export type UiAuthState =
  | (BaseUiState & {
      status: "disconnected";
    })
  | (BaseUiState & {
      status: "authorizing";
    })
  | (BaseUiState & {
      status: "success";
      successMessage: string;
      accountDisplay?: AccountDisplay;
    })
  | (BaseUiState & {
      status: "connected_waiting_playback";
      waitingMessage: "Connected - play a track on Spotify";
      accountDisplay?: AccountDisplay;
    })
  | (BaseUiState & {
      status: "recoverable_error";
      reason: AuthErrorReason;
      userFacingReason: string;
      retryEligible: boolean;
      autoRetryInMs?: number;
      troubleshootingSuggested: boolean;
      attempts: number;
    });

const defaultCopy: BaseUiState = {
  onboardingExplainer: "Connect Spotify once to keep live lyrics synced with your current track.",
  permissionSummary: "We only read playback state and never control playback.",
};

const reasonCopy: Record<AuthErrorReason, string> = {
  cancel: "Spotify authorization was canceled. You can try again when ready.",
  timeout: "Spotify took too long to respond. Please retry the connection.",
  network: "Network connection was interrupted. Check your connection and retry.",
  "rate-limit": "Spotify is temporarily rate-limiting requests. We can retry shortly.",
  unknown: "Spotify authorization could not be completed. Please retry.",
};

export class AuthStore {
  private state: UiAuthState = {
    status: "disconnected",
    ...defaultCopy,
  };

  private failureCount = 0;

  selectUiState(): UiAuthState {
    return this.state;
  }

  selectAccountDisplay(): AccountDisplay | undefined {
    if (this.state.status === "success" || this.state.status === "connected_waiting_playback") {
      return this.state.accountDisplay;
    }
    return undefined;
  }

  startAuth(): UiAuthState {
    this.state = {
      status: "authorizing",
      ...defaultCopy,
    };
    return this.state;
  }

  authorize(): UiAuthState {
    return this.startAuth();
  }

  authorizeSuccess(accountDisplay?: AccountDisplay): UiAuthState {
    this.failureCount = 0;
    this.state = {
      status: "success",
      successMessage: "Spotify connected. Setting up live playback sync...",
      accountDisplay,
      ...defaultCopy,
    };
    return this.state;
  }

  setConnectedWaitingPlayback(accountDisplay?: AccountDisplay): UiAuthState {
    this.failureCount = 0;
    this.state = {
      status: "connected_waiting_playback",
      waitingMessage: "Connected - play a track on Spotify",
      accountDisplay,
      ...defaultCopy,
    };
    return this.state;
  }

  setRecoverableError(input: {
    reason: AuthErrorReason;
    retryEligible: boolean;
    autoRetryInMs?: number;
  }): UiAuthState {
    this.failureCount += 1;
    this.state = {
      status: "recoverable_error",
      reason: input.reason,
      userFacingReason: reasonCopy[input.reason],
      retryEligible: input.retryEligible,
      autoRetryInMs: input.autoRetryInMs,
      troubleshootingSuggested: this.failureCount >= 3,
      attempts: this.failureCount,
      ...defaultCopy,
    };
    return this.state;
  }

  retryAuth(): UiAuthState {
    return this.startAuth();
  }

  resetAuthError(): UiAuthState {
    this.failureCount = 0;
    this.state = {
      status: "disconnected",
      ...defaultCopy,
    };
    return this.state;
  }

  syncFromLifecycle(input: {
    lifecycle: AuthLifecycleState;
    accountDisplay?: AccountDisplay;
    hasPlayback: boolean;
  }): UiAuthState {
    switch (input.lifecycle.status) {
      case "disconnected":
        return this.resetAuthError();
      case "authorizing":
        return this.startAuth();
      case "connected":
        return input.hasPlayback
          ? this.authorizeSuccess(input.accountDisplay)
          : this.setConnectedWaitingPlayback(input.accountDisplay);
      case "recoverable_error":
        return this.setRecoverableError({
          reason: "unknown",
          retryEligible: input.lifecycle.retryable,
        });
      default:
        return this.resetAuthError();
    }
  }
}
