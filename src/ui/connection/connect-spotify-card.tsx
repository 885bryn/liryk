import type { UiAuthState } from "../../state/auth/auth-store";
import { buildPermissionSummary } from "./permission-summary";

export type ConnectSpotifyCardModel = {
  title: string;
  onboardingExplainer: string;
  trustCopy: string;
  ctaLabel: string;
  permissions: ReturnType<typeof buildPermissionSummary>;
  isBusy: boolean;
  showPermissionSummary: boolean;
  onConnect: () => void;
};

export function buildConnectSpotifyCard(input: {
  state: UiAuthState;
  onConnect: () => void;
}): ConnectSpotifyCardModel {
  return {
    title: "Connect Spotify",
    onboardingExplainer: input.state.onboardingExplainer,
    trustCopy: "Your Spotify login stays with Spotify. We only receive read-only playback access.",
    ctaLabel: "Connect Spotify",
    permissions: buildPermissionSummary(),
    isBusy: input.state.status === "authorizing",
    showPermissionSummary:
      input.state.status === "disconnected" || input.state.status === "recoverable_error",
    onConnect: input.onConnect,
  };
}
