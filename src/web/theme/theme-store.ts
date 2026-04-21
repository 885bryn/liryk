export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "liryk-theme";

function parseMode(input: string | null): ThemeMode | null {
  if (input === "light" || input === "dark") {
    return input;
  }

  return null;
}

function applyRootClass(mode: ThemeMode, root: HTMLElement): void {
  root.classList.toggle("dark", mode === "dark");
}

function readStoredMode(storage: Storage): ThemeMode | null {
  return parseMode(storage.getItem(THEME_STORAGE_KEY));
}

function persistMode(storage: Storage, mode: ThemeMode): void {
  storage.setItem(THEME_STORAGE_KEY, mode);
}

export function hydrateTheme(input?: { storage?: Storage; root?: HTMLElement }): ThemeMode {
  const storage = input?.storage ?? window.localStorage;
  const root = input?.root ?? document.documentElement;
  const mode = readStoredMode(storage) ?? "light";

  applyRootClass(mode, root);
  return mode;
}

export function createThemeStore(input?: { storage?: Storage; root?: HTMLElement; mode?: ThemeMode }) {
  const storage = input?.storage ?? window.localStorage;
  const root = input?.root ?? document.documentElement;
  let mode = input?.mode ?? readStoredMode(storage) ?? "light";

  applyRootClass(mode, root);

  return {
    getMode(): ThemeMode {
      return mode;
    },
    setMode(nextMode: ThemeMode): ThemeMode {
      mode = nextMode;
      persistMode(storage, mode);
      applyRootClass(mode, root);
      return mode;
    },
    toggle(): ThemeMode {
      return this.setMode(mode === "light" ? "dark" : "light");
    },
  };
}

export { THEME_STORAGE_KEY };
