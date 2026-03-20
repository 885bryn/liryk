import type { PlaybackSnapshot } from "../../core/playback/types";

const CURRENTLY_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing";

export type PlaybackSession = {
  accessToken: string;
};

export type SpotifyPlaybackClient = {
  fetchCurrentPlayback(session: PlaybackSession): Promise<PlaybackSnapshot | null>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function normalizeSnapshot(payload: unknown): PlaybackSnapshot | null {
  const root = asRecord(payload);
  const item = asRecord(root.item);
  const device = asRecord(root.device);

  const trackId = typeof item.id === "string" ? item.id.trim() : "";
  const deviceId = typeof device.id === "string" ? device.id.trim() : "";
  const progressMs = Number(root.progress_ms);
  const capturedAtMs = Number(root.timestamp);

  if (!trackId || !deviceId || !Number.isFinite(progressMs) || !Number.isFinite(capturedAtMs)) {
    return null;
  }

  return {
    trackId,
    deviceId,
    isPlaying: Boolean(root.is_playing),
    progressMs: Math.max(0, Math.floor(progressMs)),
    capturedAtMs: Math.floor(capturedAtMs),
  };
}

export function createSpotifyPlaybackClient(fetchImpl: typeof fetch = fetch): SpotifyPlaybackClient {
  return {
    async fetchCurrentPlayback(session: PlaybackSession): Promise<PlaybackSnapshot | null> {
      const response = await fetchImpl(CURRENTLY_PLAYING_URL, {
        method: "GET",
        headers: {
          authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (response.status === 204) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Spotify playback endpoint error: ${response.status}`);
      }

      const payload = (await response.json().catch(() => null)) as unknown;
      return normalizeSnapshot(payload);
    },
  };
}

export function getRuntimeSpotifyPlaybackClient(): SpotifyPlaybackClient {
  return createSpotifyPlaybackClient();
}
