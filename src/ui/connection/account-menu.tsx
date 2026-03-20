import type { TokenStore } from "../../infra/auth/token-store";
import type { UiAuthState } from "../../state/auth/auth-store";

export type AccountMenuModel = {
  accountLabel: string;
  secondaryLabel?: string;
  disconnectLabel: string;
  onDisconnect: () => Promise<void>;
};

export function createDisconnectAction(input: {
  tokenStore: Pick<TokenStore, "clearTokens">;
  authStore: { resetAuthError(): unknown };
  onDisconnected?: () => void;
}): () => Promise<void> {
  return async () => {
    await input.tokenStore.clearTokens();
    input.authStore.resetAuthError();
    input.onDisconnected?.();
  };
}

export function buildAccountMenu(
  state: UiAuthState,
  onDisconnect: () => Promise<void>,
): AccountMenuModel | null {
  if (state.status !== "success" && state.status !== "connected_waiting_playback") {
    return null;
  }

  if (!state.accountDisplay?.displayName) {
    return null;
  }

  return {
    accountLabel: state.accountDisplay.displayName,
    secondaryLabel: state.accountDisplay.spotifyUserId,
    disconnectLabel: "Disconnect Spotify",
    onDisconnect,
  };
}
