import { useAutoScrollController } from "./use-auto-scroll-controller";
import { getLineDirection, normalizeChineseForDisplay } from "../../core/lyrics/unicode-normalization";

type InputLyricLine = {
  text: string;
  displayText?: string;
  dir?: "rtl" | "ltr" | "auto";
};

export type ViewportLyricLine = {
  text: string;
  displayText: string;
  dir: "rtl" | "ltr" | "auto";
};

export type LyricsViewportModel = {
  visibleLines: ViewportLyricLine[];
  activeLineIndex: number | null;
  nextLineIndex: number | null;
  showReturnToLive: boolean;
  renderMode: "synced" | "plain-static";
  scrollMode: "smooth-step";
};

function toViewportLine(line: InputLyricLine): ViewportLyricLine {
  const displayText = normalizeChineseForDisplay(line.displayText ?? line.text);
  return {
    text: line.text,
    displayText,
    dir: line.dir ?? getLineDirection(displayText),
  };
}

export function buildLyricsViewport(input: {
  lines: InputLyricLine[];
  activeLineIndex: number | null;
  nextLineIndex: number | null;
  renderMode?: "synced" | "plain-static";
  nowMs: number;
  isManualScroll?: boolean;
  returnToLive?: boolean;
  controller?: ReturnType<typeof useAutoScrollController>;
}): LyricsViewportModel {
  const normalizedLines = input.lines.map(toViewportLine);
  if (input.renderMode === "plain-static") {
    return {
      visibleLines: normalizedLines,
      activeLineIndex: null,
      nextLineIndex: null,
      showReturnToLive: false,
      renderMode: "plain-static",
      scrollMode: "smooth-step",
    };
  }

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
  const end = Math.min(normalizedLines.length, start + 5);

  return {
    visibleLines: normalizedLines.slice(start, end),
    activeLineIndex: input.activeLineIndex,
    nextLineIndex: input.nextLineIndex,
    showReturnToLive: scroll.showReturnToLive,
    renderMode: "synced",
    scrollMode: scroll.mode,
  };
}
