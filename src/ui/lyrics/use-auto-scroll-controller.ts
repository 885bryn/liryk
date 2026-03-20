export type AutoScrollSnapshot = {
  isAutoScrollActive: boolean;
  showReturnToLive: boolean;
  targetIndex: number | null;
  mode: "smooth-step";
};

export type AutoScrollController = {
  onActiveLineChange(activeLineIndex: number | null, nowMs: number): AutoScrollSnapshot;
  onUserManualScroll(nowMs: number): AutoScrollSnapshot;
  tick(nowMs: number): AutoScrollSnapshot;
  returnToLive(nowMs: number): AutoScrollSnapshot;
  getSnapshot(): AutoScrollSnapshot;
};

export function useAutoScrollController(input?: { suspendMs?: number }): AutoScrollController {
  const suspendMs = input?.suspendMs ?? 6_000;

  let suspendedUntilMs = 0;
  let targetIndex: number | null = null;

  function snapshot(nowMs: number): AutoScrollSnapshot {
    const isAutoScrollActive = nowMs >= suspendedUntilMs;
    return {
      isAutoScrollActive,
      showReturnToLive: !isAutoScrollActive,
      targetIndex,
      mode: "smooth-step",
    };
  }

  return {
    onActiveLineChange(activeLineIndex, nowMs) {
      targetIndex = activeLineIndex;
      return snapshot(nowMs);
    },

    onUserManualScroll(nowMs) {
      suspendedUntilMs = Math.max(suspendedUntilMs, nowMs + suspendMs);
      return snapshot(nowMs);
    },

    tick(nowMs) {
      return snapshot(nowMs);
    },

    returnToLive(nowMs) {
      suspendedUntilMs = nowMs;
      return snapshot(nowMs);
    },

    getSnapshot() {
      return snapshot(Number.POSITIVE_INFINITY);
    },
  };
}
