import type { PlaybackSnapshot } from "@/core/playback/types";

import {
  fetchWebNowPlaying,
  getNowPlayingRateLimitedUntilMs,
  resetNowPlayingRateLimitForTests,
  SpotifyPlaybackError,
  type WebNowPlaying,
} from "../auth/now-playing";

const PLAYING_POLL_MS = 4_000;
const PAUSED_POLL_MS = 8_000;
const IDLE_POLL_MS = 30_000;
const BASE_ERROR_BACKOFF_MS = 2_000;
const MAX_ERROR_BACKOFF_MS = 60_000;

export type SharedPlaybackState = {
  nowPlaying: WebNowPlaying | null;
  playbackSnapshot: PlaybackSnapshot | null;
  pollerId: string | null;
  rateLimitedUntilMs: number;
  lastUpdatedAtMs: number;
};

type SharedPlaybackListener = (state: SharedPlaybackState) => void;

type SubscriberRecord = {
  source: string;
  accessToken: string | null;
  listener: SharedPlaybackListener;
};

const subscribers = new Map<string, SubscriberRecord>();

let currentState: SharedPlaybackState = {
  nowPlaying: null,
  playbackSnapshot: null,
  pollerId: null,
  rateLimitedUntilMs: 0,
  lastUpdatedAtMs: 0,
};

let pollTimer: ReturnType<typeof setTimeout> | undefined;
let running = false;
let inFlight = false;
let pollerCounter = 0;
let consecutiveTransientErrors = 0;

function logDiagnostic(event: string, payload: Record<string, unknown>): void {
  console.info(`[playback-poller] ${event}`, payload);
}

function getEffectiveAccessToken(): string | null {
  for (const subscriber of subscribers.values()) {
    if (subscriber.accessToken) {
      return subscriber.accessToken;
    }
  }

  return null;
}

function emitState(): void {
  for (const subscriber of subscribers.values()) {
    subscriber.listener(currentState);
  }
}

function setState(next: SharedPlaybackState): void {
  currentState = next;
  emitState();
}

function clearPollTimer(): void {
  if (pollTimer !== undefined) {
    clearTimeout(pollTimer);
    pollTimer = undefined;
  }
}

function scheduleNextPoll(delayMs: number): void {
  clearPollTimer();
  pollTimer = setTimeout(() => {
    void pollOnce();
  }, Math.max(0, Math.floor(delayMs)));
}

function stopPolling(reason: string): void {
  if (!running) {
    return;
  }

  clearPollTimer();
  running = false;
  inFlight = false;
  consecutiveTransientErrors = 0;

  logDiagnostic("stop", {
    reason,
    pollerId: currentState.pollerId,
    timestamp: Date.now(),
    subscriberCount: subscribers.size,
  });

  setState({
    ...currentState,
    nowPlaying: null,
    playbackSnapshot: null,
    pollerId: null,
    rateLimitedUntilMs: getNowPlayingRateLimitedUntilMs(),
    lastUpdatedAtMs: Date.now(),
  });
}

function startPollingIfNeeded(): void {
  if (running) {
    return;
  }

  const accessToken = getEffectiveAccessToken();
  if (!accessToken) {
    return;
  }

  running = true;
  pollerCounter += 1;
  const pollerId = `playback-poller-${pollerCounter}`;

  logDiagnostic("start", {
    pollerId,
    timestamp: Date.now(),
    subscriberCount: subscribers.size,
    subscribers: Array.from(subscribers.values(), (subscriber) => subscriber.source),
  });

  setState({
    ...currentState,
    pollerId,
    rateLimitedUntilMs: getNowPlayingRateLimitedUntilMs(),
    lastUpdatedAtMs: Date.now(),
  });

  scheduleNextPoll(0);
}

async function pollOnce(): Promise<void> {
  if (!running || inFlight) {
    return;
  }

  const accessToken = getEffectiveAccessToken();
  if (!accessToken) {
    stopPolling("no_access_token");
    return;
  }

  const pollerId = currentState.pollerId ?? "playback-poller-unknown";
  const nowMs = Date.now();
  const rateLimitedUntilMs = getNowPlayingRateLimitedUntilMs();

  if (rateLimitedUntilMs > nowMs) {
    const delayMs = rateLimitedUntilMs - nowMs;
    logDiagnostic("request", {
      source: "shared-playback-runtime",
      timestamp: nowMs,
      pollerId,
      blockedByRateLimitLock: true,
      delayMs,
      subscriberCount: subscribers.size,
      subscribers: Array.from(subscribers.values(), (subscriber) => subscriber.source),
    });

    setState({
      ...currentState,
      rateLimitedUntilMs,
      lastUpdatedAtMs: nowMs,
    });

    scheduleNextPoll(delayMs);
    return;
  }

  logDiagnostic("request", {
    source: "shared-playback-runtime",
    timestamp: nowMs,
    pollerId,
    blockedByRateLimitLock: false,
    subscriberCount: subscribers.size,
    subscribers: Array.from(subscribers.values(), (subscriber) => subscriber.source),
  });

  inFlight = true;

  try {
    const nowPlaying = await fetchWebNowPlaying(accessToken);
    const playbackSnapshot: PlaybackSnapshot | null = nowPlaying
      ? {
          trackId: nowPlaying.trackId,
          deviceId: "web",
          isPlaying: nowPlaying.isPlaying,
          progressMs: nowPlaying.progressMs,
          capturedAtMs: nowPlaying.capturedAtMs ?? Date.now(),
        }
      : null;

    consecutiveTransientErrors = 0;

    setState({
      ...currentState,
      nowPlaying,
      playbackSnapshot,
      rateLimitedUntilMs: getNowPlayingRateLimitedUntilMs(),
      lastUpdatedAtMs: Date.now(),
    });

    const nextDelayMs = nowPlaying ? (nowPlaying.isPlaying ? PLAYING_POLL_MS : PAUSED_POLL_MS) : IDLE_POLL_MS;
    scheduleNextPoll(nextDelayMs);
  } catch (error) {
    const timestamp = Date.now();

    if (error instanceof SpotifyPlaybackError && error.status === 429) {
      const untilMs = getNowPlayingRateLimitedUntilMs();
      const delayMs = Math.max(0, untilMs - timestamp);

      logDiagnostic("rate_limited", {
        source: "shared-playback-runtime",
        timestamp,
        pollerId,
        blockedByRateLimitLock: false,
        retryAfterMs: error.retryAfterMs,
        rateLimitedUntilMs: untilMs,
      });

      setState({
        ...currentState,
        rateLimitedUntilMs: untilMs,
        lastUpdatedAtMs: timestamp,
      });

      scheduleNextPoll(delayMs);
      return;
    }

    consecutiveTransientErrors += 1;
    const backoffMs = Math.min(
      MAX_ERROR_BACKOFF_MS,
      BASE_ERROR_BACKOFF_MS * 2 ** Math.max(0, consecutiveTransientErrors - 1),
    );

    logDiagnostic("transient_error", {
      source: "shared-playback-runtime",
      timestamp,
      pollerId,
      blockedByRateLimitLock: false,
      backoffMs,
      error: error instanceof Error ? error.message : String(error),
    });

    scheduleNextPoll(backoffMs);
  } finally {
    inFlight = false;
  }
}

export function getSharedPlaybackState(): SharedPlaybackState {
  return currentState;
}

export function subscribeSharedPlayback(input: {
  subscriberId: string;
  source: string;
  accessToken: string | null;
  listener: SharedPlaybackListener;
}): () => void {
  subscribers.set(input.subscriberId, {
    source: input.source,
    accessToken: input.accessToken,
    listener: input.listener,
  });

  input.listener(currentState);

  if (getEffectiveAccessToken()) {
    startPollingIfNeeded();
  }

  return () => {
    subscribers.delete(input.subscriberId);

    if (!getEffectiveAccessToken() || subscribers.size === 0) {
      stopPolling(subscribers.size === 0 ? "no_subscribers" : "no_access_token");
    }
  };
}

export function updateSharedPlaybackSubscriberToken(subscriberId: string, accessToken: string | null): void {
  const subscriber = subscribers.get(subscriberId);
  if (!subscriber) {
    return;
  }

  subscribers.set(subscriberId, {
    ...subscriber,
    accessToken,
  });

  if (getEffectiveAccessToken()) {
    startPollingIfNeeded();
    if (running && pollTimer === undefined) {
      scheduleNextPoll(0);
    }
    return;
  }

  stopPolling("no_access_token");
}

export function resetSharedPlaybackRuntimeForTests(): void {
  clearPollTimer();
  subscribers.clear();
  running = false;
  inFlight = false;
  pollerCounter = 0;
  consecutiveTransientErrors = 0;
  currentState = {
    nowPlaying: null,
    playbackSnapshot: null,
    pollerId: null,
    rateLimitedUntilMs: 0,
    lastUpdatedAtMs: 0,
  };
  resetNowPlayingRateLimitForTests();
}
