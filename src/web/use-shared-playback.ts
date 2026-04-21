import { useEffect, useRef, useState } from "react";

import {
  getSharedPlaybackState,
  subscribeSharedPlayback,
  updateSharedPlaybackSubscriberToken,
  type SharedPlaybackState,
} from "./playback/shared-playback-runtime";

function createSubscriberId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `subscriber-${Math.random().toString(36).slice(2)}`;
}

export function useSharedPlayback(input: {
  source: string;
  accessToken: string | null;
}): SharedPlaybackState {
  const subscriberIdRef = useRef<string>(createSubscriberId());
  const [state, setState] = useState<SharedPlaybackState>(() => getSharedPlaybackState());

  useEffect(() => {
    const unsubscribe = subscribeSharedPlayback({
      subscriberId: subscriberIdRef.current,
      source: input.source,
      accessToken: input.accessToken,
      listener: setState,
    });

    return unsubscribe;
  }, [input.source]);

  useEffect(() => {
    updateSharedPlaybackSubscriberToken(subscriberIdRef.current, input.accessToken);
  }, [input.accessToken]);

  return state;
}
