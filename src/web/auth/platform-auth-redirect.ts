import type { SpotifyCallbackInput } from "../../core/auth/types";
import { extractSpotifyCallback, removeSpotifyCallbackParams } from "./web-auth-controller";

export type PlatformAuthRedirect = {
  callback: SpotifyCallbackInput | null;
  cleanedUrl: string;
  callbackPath: string;
};

export function readPlatformAuthRedirect(url: URL): PlatformAuthRedirect {
  const callback = extractSpotifyCallback(url.search);
  const cleanedUrl = removeSpotifyCallbackParams(url).toString();
  const callbackPath = url.pathname || "/callback";

  return {
    callback,
    cleanedUrl,
    callbackPath,
  };
}
