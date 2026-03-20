import type { UiAuthState } from "../../state/auth/auth-store";

export type ConnectedStatusModel = {
  headline: string;
  detail: string;
  accountLabel?: string;
};

export function buildConnectedStatus(state: UiAuthState): ConnectedStatusModel {
  const accountLabel = state.status === "success" || state.status === "connected_waiting_playback"
    ? state.accountDisplay?.displayName
    : undefined;

  if (state.status === "success") {
    return {
      headline: "Spotify connected",
      detail: "Connection confirmed. Preparing your live playback state.",
      accountLabel,
    };
  }

  if (state.status === "connected_waiting_playback") {
    return {
      headline: "Connected - play a track on Spotify",
      detail: "Once playback starts, lyrics will begin syncing automatically.",
      accountLabel,
    };
  }

  return {
    headline: "Connect Spotify",
    detail: "Connect your account to begin live lyrics sync.",
    accountLabel,
  };
}
