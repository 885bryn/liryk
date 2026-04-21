const PAUSE_PLAYBACK_URL = "https://api.spotify.com/v1/me/player/pause";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function pauseSpotifyPlayback(input: {
  accessToken: string;
  fetchImpl?: typeof fetch;
  maxAttempts?: number;
}): Promise<{ ok: boolean; warning?: string }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const maxAttempts = Math.max(1, input.maxAttempts ?? 2);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetchImpl.call(globalThis, PAUSE_PLAYBACK_URL, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${input.accessToken}`,
      },
    });

    if (response.ok || response.status === 204) {
      return { ok: true };
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error("Spotify pause requires Premium and user-modify-playback-state scope.");
    }

    if (attempt < maxAttempts) {
      await delay(350 * attempt);
      continue;
    }
  }

  return {
    ok: false,
    warning: "Spotify pause did not confirm before Karaoke playback started.",
  };
}
