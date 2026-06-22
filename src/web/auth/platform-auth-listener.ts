import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

type AppUrlListenerHandle = {
  remove: () => Promise<void>;
};

type AppPlugin = {
  getLaunchUrl: () => Promise<{ url?: string } | undefined>;
  addListener: (
    eventName: "appUrlOpen",
    listener: (event: { url: string }) => void,
  ) => Promise<AppUrlListenerHandle> | AppUrlListenerHandle;
};

export type SubscribeToPlatformRedirects = (
  onUrl: (url: string) => void,
) => void | (() => void | Promise<void>) | Promise<void | (() => void | Promise<void>)>;

export async function subscribeToPlatformAuthRedirects(
  onUrl: (url: string) => void,
  options: {
    appPlugin?: AppPlugin;
    getPlatform?: () => string;
  } = {},
): Promise<void | (() => Promise<void>)> {
  const getPlatform = options.getPlatform ?? (() => Capacitor.getPlatform());
  if (getPlatform() !== "android") {
    return;
  }

  const appPlugin = options.appPlugin ?? App;
  const launchUrl = await appPlugin.getLaunchUrl();
  if (launchUrl?.url) {
    onUrl(launchUrl.url);
  }

  const handle = await appPlugin.addListener("appUrlOpen", (event) => {
    if (event.url) {
      onUrl(event.url);
    }
  });

  return async () => {
    await handle.remove();
  };
}
