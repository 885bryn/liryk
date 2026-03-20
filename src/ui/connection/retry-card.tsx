import type { UiAuthState } from "../../state/auth/auth-store";

export type RetryCardActions = {
  retryAuth: () => void;
  resetAuthError: () => void;
};

export type RetryCardModel = {
  title: string;
  message: string;
  retryLabel: string;
  showRetry: boolean;
  autoRetryStatus?: string;
  troubleshooting: string[];
  isPersistent: true;
  onRetry: () => void;
  onTroubleshoot: () => void;
};

const retryCopy = {
  cancel: {
    title: "Spotify connection canceled",
    message: "You closed Spotify authorization before it finished.",
  },
  timeout: {
    title: "Spotify connection timed out",
    message: "Spotify did not respond in time. Retry to continue.",
  },
  network: {
    title: "Network interrupted Spotify connection",
    message: "Check your network connection, then retry.",
  },
  "rate-limit": {
    title: "Spotify temporarily rate-limited requests",
    message: "We can retry automatically after a short cooldown.",
  },
  unknown: {
    title: "Spotify connection failed",
    message: "An unexpected issue occurred. Retry to continue.",
  },
} as const;

export function buildRetryCard(
  state: UiAuthState,
  actions: RetryCardActions,
): RetryCardModel | null {
  if (state.status !== "recoverable_error") {
    return null;
  }

  const copy = retryCopy[state.reason];
  const autoRetryStatus = state.autoRetryInMs
    ? `Auto-retrying in ${Math.ceil(state.autoRetryInMs / 1000)}s...`
    : undefined;

  return {
    title: copy.title,
    message: copy.message,
    retryLabel: state.retryEligible ? "Retry Spotify connection" : "Try again later",
    showRetry: state.retryEligible,
    autoRetryStatus,
    troubleshooting: state.troubleshootingSuggested
      ? [
          "Confirm Spotify is reachable in your browser.",
          "Verify your network is stable and not behind a blocking VPN.",
          "Disconnect and reconnect your Spotify account to reset authorization.",
        ]
      : [],
    isPersistent: true,
    onRetry: actions.retryAuth,
    onTroubleshoot: actions.resetAuthError,
  };
}
