declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YouTubePlayer = {
  destroy(): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  loadVideoById(input: { videoId: string; startSeconds?: number }): void;
  mute(): void;
  unMute(): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
};

const IFRAME_API_URL = "https://www.youtube.com/iframe_api";

let loadingPromise: Promise<void> | null = null;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function logYouTubeDiagnostic(event: string, details: Record<string, unknown> = {}): void {
  console.info("[karaoke-youtube]", {
    event,
    timestamp: Date.now(),
    ...details,
  });
}

async function waitForPlaybackStart(input: {
  player: YouTubePlayer;
  maxWaitMs: number;
  retryPlay: boolean;
  getLastErrorCode: () => number | null;
}): Promise<void> {
  const startedAt = Date.now();
  let lastPlayAttemptMs = 0;

  while (Date.now() - startedAt <= input.maxWaitMs) {
    const errorCode = input.getLastErrorCode();
    if (typeof errorCode === "number") {
      throw new Error(`YouTube player error ${errorCode}.`);
    }

    const state = input.player.getPlayerState();
    if (state === window.YT!.PlayerState.PLAYING || state === window.YT!.PlayerState.BUFFERING) {
      return;
    }

    if (input.retryPlay && Date.now() - lastPlayAttemptMs >= 800) {
      input.player.playVideo();
      lastPlayAttemptMs = Date.now();
    }

    await wait(200);
  }

  throw new Error("YouTube playback did not start in time.");
}

async function ensureYouTubeApiLoaded(): Promise<void> {
  if (window.YT?.Player) {
    return;
  }

  if (!loadingPromise) {
    loadingPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src=\"${IFRAME_API_URL}\"]`) as HTMLScriptElement | null;
      const script = existingScript ?? document.createElement("script");
      script.src = IFRAME_API_URL;
      script.async = true;

      const previousReadyHandler = window.onYouTubeIframeAPIReady;
      const timeout = window.setTimeout(() => {
        reject(new Error("YouTube IFrame API load timed out."));
      }, 10_000);

      const readyPoll = window.setInterval(() => {
        if (window.YT?.Player) {
          window.clearInterval(readyPoll);
          window.clearTimeout(timeout);
          logYouTubeDiagnostic("iframe_api_ready_poll");
          resolve();
        }
      }, 100);

      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousReadyHandler === "function") {
          previousReadyHandler();
        }
        window.clearInterval(readyPoll);
        window.clearTimeout(timeout);
        logYouTubeDiagnostic("iframe_api_ready_callback");
        resolve();
      };

      script.onerror = () => {
        window.clearInterval(readyPoll);
        window.clearTimeout(timeout);
        logYouTubeDiagnostic("iframe_api_error");
        reject(new Error("Failed to load YouTube IFrame API."));
      };

      if (!existingScript) {
        document.head.appendChild(script);
      }
    });
  }

  return loadingPromise;
}

export type KaraokeYouTubePlayer = {
  loadAndPlay(videoId: string, startSeconds: number): Promise<void>;
  play(): Promise<void>;
  stop(): void;
  getCurrentTimeMs(): number;
  dispose(): void;
};

export async function createKaraokeYouTubePlayer(container: HTMLElement): Promise<KaraokeYouTubePlayer> {
  await ensureYouTubeApiLoaded();

  if (!window.YT?.Player) {
    throw new Error("YouTube API is unavailable.");
  }

  let resolveReady: (() => void) | null = null;
  let rejectReady: ((reason?: unknown) => void) | null = null;
  let lastErrorCode: number | null = null;
  const readyPromise = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  const player = new window.YT.Player(container, {
    width: "1",
    height: "1",
    videoId: "",
    playerVars: {
      autoplay: 0,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
      origin: window.location.origin,
    },
    events: {
      onReady: () => {
        const iframe = container.querySelector("iframe") as HTMLIFrameElement | null;
        if (iframe) {
          const allow = iframe.getAttribute("allow") ?? "";
          if (!/autoplay/i.test(allow)) {
            iframe.setAttribute("allow", allow ? `${allow}; autoplay; encrypted-media` : "autoplay; encrypted-media");
          }
        }
        logYouTubeDiagnostic("player_ready");
        resolveReady?.();
        resolveReady = null;
        rejectReady = null;
      },
      onError: (event: unknown) => {
        const maybeData =
          typeof event === "object" && event !== null && "data" in event
            ? (event as { data?: unknown }).data
            : undefined;
        lastErrorCode = typeof maybeData === "number" ? maybeData : null;
        logYouTubeDiagnostic("player_error", { code: lastErrorCode });
        if (rejectReady) {
          rejectReady(new Error("YouTube player failed to initialize."));
        }
      },
      onStateChange: (event: unknown) => {
        const maybeData =
          typeof event === "object" && event !== null && "data" in event
            ? (event as { data?: unknown }).data
            : undefined;
        logYouTubeDiagnostic("player_state", { state: maybeData });
      },
      onAutoplayBlocked: () => {
        logYouTubeDiagnostic("player_autoplay_blocked");
      },
    },
  });

  await Promise.race([
    readyPromise,
    wait(10_000).then(() => {
      throw new Error("YouTube player did not become ready in time.");
    }),
  ]);

  return {
    async loadAndPlay(videoId: string, startSeconds: number): Promise<void> {
      logYouTubeDiagnostic("load_and_play", { videoId, startSeconds });
      lastErrorCode = null;
      player.mute();
      player.loadVideoById({
        videoId,
        startSeconds: Math.max(0, Math.floor(startSeconds)),
      });
      player.playVideo();

      try {
        await waitForPlaybackStart({
          player,
          maxWaitMs: 20_000,
          retryPlay: true,
          getLastErrorCode: () => lastErrorCode,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/error 101|error 150/i.test(message)) {
          throw new Error(message);
        }

        if (Math.max(0, Math.floor(startSeconds)) > 0) {
          lastErrorCode = null;
          player.loadVideoById({ videoId, startSeconds: 0 });
          player.playVideo();
          try {
            await waitForPlaybackStart({
              player,
              maxWaitMs: 20_000,
              retryPlay: true,
              getLastErrorCode: () => lastErrorCode,
            });
          } catch (retryError) {
            const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
            if (/error 101|error 150/i.test(retryMessage)) {
              throw new Error(retryMessage);
            }
            throw new Error("YouTube autoplay was blocked. Please allow autoplay and retry.");
          }
        } else {
          throw new Error("YouTube autoplay was blocked. Please allow autoplay and retry.");
        }
      }

      player.unMute();
    },
    async play(): Promise<void> {
      logYouTubeDiagnostic("play_retry");
      lastErrorCode = null;
      player.mute();
      player.playVideo();

      await waitForPlaybackStart({
        player,
        maxWaitMs: 10_000,
        retryPlay: true,
        getLastErrorCode: () => lastErrorCode,
      }).catch(() => {
        throw new Error("YouTube playback is still blocked.");
      });

      player.unMute();
    },
    stop(): void {
      player.stopVideo();
    },
    getCurrentTimeMs(): number {
      return Math.max(0, Math.floor(player.getCurrentTime() * 1000));
    },
    dispose(): void {
      player.destroy();
    },
  };
}
