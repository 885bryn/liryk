import { useEffect, useRef, useState } from "react";

import type { DevLogEntry } from "./use-dev-activity-log";

const categoryColorClass: Record<DevLogEntry["category"], string> = {
  auth: "text-sky-300/60",
  lyrics: "text-emerald-300/60",
  clock: "text-amber-300/60",
  sync: "text-violet-300/60",
};

type DevActivityPanelProps = {
  entries: DevLogEntry[];
};

export function DevActivityPanel({ entries }: DevActivityPanelProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [entries, autoScroll]);

  return (
    <div className="flex h-full flex-col font-mono text-[10px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="text-[9px] tracking-[0.16em] text-white/50">Dev Log</span>
        <button
          type="button"
          data-testid="dev-panel-autoscroll-toggle"
          aria-pressed={autoScroll}
          className="text-[9px] text-white/40 transition-colors duration-150 hover:text-white/70"
          onClick={() => setAutoScroll(v => !v)}
        >
          {autoScroll ? "Pause" : "Resume"}
        </button>
      </div>
      {/* Scroll surface — isolated */}
      <div
        data-testid="dev-panel-log-scroll"
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-1"
        onWheel={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
      >
        {entries.map(entry => (
          <p
            key={entry.id}
            className={`py-0.5 leading-tight ${categoryColorClass[entry.category]}`}
          >
            <span className="text-white/40">{entry.timestamp} </span>
            {entry.message}
          </p>
        ))}
        <div ref={bottomRef} data-testid="dev-panel-bottom-sentinel" aria-hidden="true" />
      </div>
    </div>
  );
}
