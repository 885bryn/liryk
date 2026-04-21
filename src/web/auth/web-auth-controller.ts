import type { SpotifyCallbackInput } from "../../core/auth/types";

type RuntimeBootstrapApi = {
  initialize(): Promise<unknown>;
  completeSpotifyCallback(input: SpotifyCallbackInput): Promise<unknown>;
};

export function extractSpotifyCallback(search: string): SpotifyCallbackInput | null {
  const query = new URLSearchParams(search);
  const code = query.get("code") ?? undefined;
  const state = query.get("state") ?? undefined;
  const error = query.get("error") ?? undefined;

  if (error) {
    return { error };
  }

  if (code && state) {
    return { code, state };
  }

  return null;
}

export function removeSpotifyCallbackParams(url: URL): URL {
  const cleaned = new URL(url.toString());
  cleaned.searchParams.delete("code");
  cleaned.searchParams.delete("state");
  cleaned.searchParams.delete("error");
  return cleaned;
}

export async function runWebAuthBootstrap(deps: {
  runtime: RuntimeBootstrapApi;
  readLocation: () => URL;
  replaceHistoryUrl: (nextUrl: string) => void;
}): Promise<void> {
  await deps.runtime.initialize();

  const currentUrl = deps.readLocation();
  const callback = extractSpotifyCallback(currentUrl.search);
  if (!callback) {
    return;
  }

  await deps.runtime.completeSpotifyCallback(callback);

  const cleanedUrl = removeSpotifyCallbackParams(currentUrl);
  deps.replaceHistoryUrl(cleanedUrl.toString());
}
