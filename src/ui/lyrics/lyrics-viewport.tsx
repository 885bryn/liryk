import { useAutoScrollController } from "./use-auto-scroll-controller";

export type LyricsViewportModel = {
  visibleLines: string[];
  activeLineIndex: number | null;
  nextLineIndex: number | null;
  showReturnToLive: boolean;
  scrollMode: "smooth-step";
};

export function buildLyricsViewport(input: {
  lines: string[];
  activeLineIndex: number | null;
  nextLineIndex: number | null;
  nowMs: number;
  isManualScroll?: boolean;
  returnToLive?: boolean;
  controller?: ReturnType<typeof useAutoScrollController>;
}): LyricsViewportModel {
  const controller = input.controller ?? useAutoScrollController();

  if (input.isManualScroll) {
    controller.onUserManualScroll(input.nowMs);
  }

  if (input.returnToLive) {
    controller.returnToLive(input.nowMs);
  }

  const scroll = controller.onActiveLineChange(input.activeLineIndex, input.nowMs);
  const anchor = typeof scroll.targetIndex === "number" ? scroll.targetIndex : 0;
  const start = Math.max(0, anchor - 2);
  const end = Math.min(input.lines.length, start + 5);

  return {
    visibleLines: input.lines.slice(start, end),
    activeLineIndex: input.activeLineIndex,
    nextLineIndex: input.nextLineIndex,
    showReturnToLive: scroll.showReturnToLive,
    scrollMode: scroll.mode,
  };
}
