import { Moon, Sun } from "lucide-react";

import { Switch } from "@/components/ui/switch";

import type { ThemeMode } from "./theme-store";

export function ThemeToggle(input: {
  mode: ThemeMode;
  onToggle: () => void;
  label?: string;
  className?: string;
}) {
  const label = input.label ?? "Toggle theme";

  return (
    <div className={input.className ?? "inline-flex items-center gap-2"}>
      <Sun className="size-4" aria-hidden="true" />
      <Switch
        aria-label={label}
        checked={input.mode === "dark"}
        onCheckedChange={() => {
          input.onToggle();
        }}
      />
      <Moon className="size-4" aria-hidden="true" />
    </div>
  );
}
