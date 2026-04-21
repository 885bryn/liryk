import { useCallback, useState } from "react";

export type DevLogEntry = {
  id: string;
  timestamp: string; // "HH:MM:SS"
  category: "auth" | "lyrics" | "clock" | "sync";
  message: string;
};

export const MAX_LOG_ENTRIES = 150;

function formatTimestamp(date: Date): string {
  return [
    date.getHours().toString().padStart(2, "0"),
    date.getMinutes().toString().padStart(2, "0"),
    date.getSeconds().toString().padStart(2, "0"),
  ].join(":");
}

export function useDevActivityLog(): {
  entries: DevLogEntry[];
  append: (entry: Omit<DevLogEntry, "id" | "timestamp">) => void;
} {
  const [entries, setEntries] = useState<DevLogEntry[]>([]);

  const append = useCallback((entry: Omit<DevLogEntry, "id" | "timestamp">) => {
    const full: DevLogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: formatTimestamp(new Date()),
      ...entry,
    };
    setEntries(prev => {
      const next = [...prev, full];
      return next.length > MAX_LOG_ENTRIES ? next.slice(next.length - MAX_LOG_ENTRIES) : next;
    });
  }, []);

  return { entries, append };
}
