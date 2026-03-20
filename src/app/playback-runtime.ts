import { classifyPlaybackTransition } from "../core/playback/playback-transition";
import { isNewerSnapshot, type PlaybackSnapshot, type PlaybackTransitionKind } from "../core/playback/types";

export type PlaybackRuntimeEvent = {
  snapshot: PlaybackSnapshot | null;
  transition: PlaybackTransitionKind;
};

type PlaybackRuntimeListener = (event: PlaybackRuntimeEvent) => void;

export type PlaybackRuntimeDependencies = {
  fetchCurrentPlayback: () => Promise<PlaybackSnapshot | null>;
  setTimeoutFn?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimeoutFn?: (timer: ReturnType<typeof setTimeout>) => void;
};

const PLAYING_POLL_MS = 1_000;
const PAUSED_POLL_MS = 2_500;
const IDLE_POLL_MS = 5_000;

export type PlaybackRuntime = {
  start(): void;
  stop(): void;
  pollNow(): Promise<void>;
  subscribe(listener: PlaybackRuntimeListener): () => void;
  getLatestSnapshot(): PlaybackSnapshot | null;
};

export function createPlaybackRuntime(dependencies: PlaybackRuntimeDependencies): PlaybackRuntime {
  const setTimeoutFn = dependencies.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = dependencies.clearTimeoutFn ?? clearTimeout;

  const listeners = new Set<PlaybackRuntimeListener>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let latestSnapshot: PlaybackSnapshot | null = null;
  let requestCounter = 0;
  let latestResolvedRequest = 0;

  function emit(event: PlaybackRuntimeEvent): void {
    for (const listener of listeners) {
      listener(event);
    }
  }

  function clearTimer(): void {
    if (timer !== undefined) {
      clearTimeoutFn(timer);
      timer = undefined;
    }
  }

  function scheduleNext(snapshot: PlaybackSnapshot | null): void {
    if (!running) {
      return;
    }

    clearTimer();
    const delayMs = snapshot === null ? IDLE_POLL_MS : snapshot.isPlaying ? PLAYING_POLL_MS : PAUSED_POLL_MS;
    timer = setTimeoutFn(() => {
      void pollNow();
    }, delayMs);
  }

  async function pollNow(): Promise<void> {
    const requestId = ++requestCounter;
    const incoming = await dependencies.fetchCurrentPlayback();

    if (requestId < latestResolvedRequest) {
      return;
    }
    latestResolvedRequest = requestId;

    if (incoming && latestSnapshot && !isNewerSnapshot(latestSnapshot, incoming)) {
      return;
    }

    const transition = incoming
      ? classifyPlaybackTransition(latestSnapshot, incoming)
      : ("no_change" as PlaybackTransitionKind);

    latestSnapshot = incoming;
    emit({ snapshot: incoming, transition });
    scheduleNext(incoming);
  }

  return {
    start() {
      if (running) {
        return;
      }
      running = true;
      void pollNow();
    },

    stop() {
      running = false;
      clearTimer();
    },

    pollNow,

    subscribe(listener: PlaybackRuntimeListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getLatestSnapshot() {
      return latestSnapshot;
    },
  };
}
