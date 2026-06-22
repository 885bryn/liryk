import { Capacitor } from "@capacitor/core";

const ANDROID_APP_REDIRECT_URI = "app.liryk://callback";

export function resolveRuntimeSpotifyRedirectUri(
  configuredRedirectUri: string,
  options: {
    getPlatform?: () => string;
    readLocation?: () => URL;
  } = {},
): string {
  const getPlatform = options.getPlatform ?? (() => Capacitor.getPlatform());
  const readLocation =
    options.readLocation ??
    (() => {
      if (!globalThis.location?.href) {
        return null;
      }

      return new URL(globalThis.location.href);
    });

  const currentUrl = readLocation();
  if (getPlatform() === "android" && currentUrl?.protocol === "https:" && currentUrl.hostname === "localhost") {
    return ANDROID_APP_REDIRECT_URI;
  }

  return configuredRedirectUri;
}
