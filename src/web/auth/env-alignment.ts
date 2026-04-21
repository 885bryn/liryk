import { getAuthEnv } from "../../infra/config/env";

export type EnvAlignmentDiagnostics = {
  status: "ok" | "warning";
  messages: string[];
};

export function getEnvAlignmentDiagnostics(input: {
  currentUrl: URL;
  requiredCallbackPath?: string;
}): EnvAlignmentDiagnostics {
  const env = getAuthEnv();
  const messages: string[] = [];

  const appBaseUrl = new URL(env.appBaseUrl);
  const spotifyRedirectUri = new URL(env.spotifyRedirectUri);
  const currentOrigin = input.currentUrl.origin;
  const requiredCallbackPath = input.requiredCallbackPath ?? input.currentUrl.pathname;

  if (appBaseUrl.origin !== currentOrigin) {
    messages.push(
      `APP_BASE_URL origin mismatch: expected ${appBaseUrl.origin}, actual ${currentOrigin}.`,
    );
  }

  if (spotifyRedirectUri.origin !== currentOrigin) {
    messages.push(
      `SPOTIFY_REDIRECT_URI origin mismatch: expected ${spotifyRedirectUri.origin}, actual ${currentOrigin}.`,
    );
  }

  if (spotifyRedirectUri.pathname !== requiredCallbackPath) {
    messages.push(
      `SPOTIFY_REDIRECT_URI path mismatch: expected ${spotifyRedirectUri.pathname}, required ${requiredCallbackPath}.`,
    );
  }

  if (messages.length === 0) {
    return { status: "ok", messages: [] };
  }

  return {
    status: "warning",
    messages,
  };
}
