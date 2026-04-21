export type WebNowPlaying = {
  trackId: string;
  title: string;
  artist: string;
  artists?: string[];
  album?: string;
  durationMs?: number;
  capturedAtMs?: number;
  isPlaying: boolean;
  progressMs: number;
};

const PLAYER_URL = "https://api.spotify.com/v1/me/player";
const DEFAULT_RATE_LIMIT_MS = 60_000;
const FETCH_TIMEOUT_MS = 10_000;

let globalRateLimitUntilMs = 0;

export class SpotifyPlaybackError extends Error {
  readonly status: number;
  readonly retryAfterMs?: number;

  constructor(status: number, retryAfterMs?: number) {
    super(`Spotify playback endpoint error (${status})`);
    this.name = "SpotifyPlaybackError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function parseRetryAfterMs(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }

  return Math.floor(seconds * 1000);
}

export function resetNowPlayingRateLimitForTests(): void {
  globalRateLimitUntilMs = 0;
}

export function getNowPlayingRateLimitedUntilMs(): number {
  return globalRateLimitUntilMs;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

async function fetchPlaybackPayload(
  url: string,
  accessToken: string,
  fetchImpl: typeof fetch,
): Promise<unknown | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetchImpl.call(globalThis, url, {
      method: "GET",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    });

    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      const retryAfterHeader = (response as { headers?: { get?: (name: string) => string | null } }).headers?.get?.(
        "retry-after",
      );
      throw new SpotifyPlaybackError(response.status, parseRetryAfterMs(retryAfterHeader ?? null));
    }

    return (await response.json().catch(() => null)) as unknown;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseNowPlayingPayload(payload: unknown): WebNowPlaying | null {
  const normalized = asRecord(payload);
  const item = asRecord(normalized.item);
  const artists = Array.isArray(item.artists) ? item.artists.map(asRecord) : [];
  const artistNames = artists
    .map((artist) => (typeof artist.name === "string" ? artist.name.trim() : ""))
    .filter(Boolean);

  const trackId = typeof item.id === "string" ? item.id.trim() : "";
  const title = typeof item.name === "string" ? item.name.trim() : "";
  const progressMs = Number(normalized.progress_ms);
  const durationMsRaw = Number(item.duration_ms);
  const capturedAtMsRaw = Number(normalized.timestamp);
  const albumRecord = asRecord(item.album);
  const album = typeof albumRecord.name === "string" ? albumRecord.name.trim() : "";
  if (!trackId || !title) {
    return null;
  }

  const durationMs = Number.isFinite(durationMsRaw) && durationMsRaw > 0 ? Math.floor(durationMsRaw) : undefined;
  const capturedAtMs =
    Number.isFinite(capturedAtMsRaw) && capturedAtMsRaw > 0 ? Math.floor(capturedAtMsRaw) : undefined;

  return {
    trackId,
    title,
    artist: artistNames[0] ?? "Spotify",
    ...(artistNames.length > 1 ? { artists: artistNames } : {}),
    ...(album ? { album } : {}),
    ...(typeof durationMs === "number" ? { durationMs } : {}),
    ...(typeof capturedAtMs === "number" ? { capturedAtMs } : {}),
    isPlaying: Boolean(normalized.is_playing),
    progressMs: Number.isFinite(progressMs) ? Math.max(0, Math.floor(progressMs)) : 0,
  };
}

export async function fetchWebNowPlaying(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<WebNowPlaying | null> {
  const nowMs = Date.now();
  if (globalRateLimitUntilMs > nowMs) {
    throw new SpotifyPlaybackError(429, globalRateLimitUntilMs - nowMs);
  }

  try {
    const payload = await fetchPlaybackPayload(PLAYER_URL, accessToken, fetchImpl);
    globalRateLimitUntilMs = 0;
    return parseNowPlayingPayload(payload);
  } catch (error) {
    if (error instanceof SpotifyPlaybackError && error.status === 429) {
      const retryAfterMs = error.retryAfterMs ?? DEFAULT_RATE_LIMIT_MS;
      globalRateLimitUntilMs = Date.now() + retryAfterMs;
      throw new SpotifyPlaybackError(429, retryAfterMs);
    }

    throw error;
  }
}
