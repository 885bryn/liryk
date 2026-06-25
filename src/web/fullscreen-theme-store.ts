export const FULLSCREEN_LYRICS_THEME_STORAGE_KEY = "liryk-fullscreen-lyrics-theme";

export type FullscreenThemePresetId =
  | "midnight"
  | "paper-lantern"
  | "blue-hour"
  | "forest-glow"
  | "rose-lounge";

export type FullscreenThemePreset = {
  id: FullscreenThemePresetId;
  name: string;
  backgroundHex: string;
  textHex: string;
};

export const FULLSCREEN_LYRICS_THEME_PRESETS: readonly FullscreenThemePreset[] = [
  { id: "midnight", name: "Midnight", backgroundHex: "#000000", textHex: "#FFFFFF" },
  {
    id: "paper-lantern",
    name: "Paper Lantern",
    backgroundHex: "#FFF4D6",
    textHex: "#2F2419",
  },
  { id: "blue-hour", name: "Blue Hour", backgroundHex: "#10243F", textHex: "#F3F7FF" },
  { id: "forest-glow", name: "Forest Glow", backgroundHex: "#132A1E", textHex: "#F4FFE7" },
  { id: "rose-lounge", name: "Rose Lounge", backgroundHex: "#2E1622", textHex: "#FFE8F2" },
];

const DEFAULT_PRESET: FullscreenThemePreset = FULLSCREEN_LYRICS_THEME_PRESETS[0]!;

export function resolveFullscreenThemePreset(
  presetId: string | null | undefined,
): FullscreenThemePreset {
  return FULLSCREEN_LYRICS_THEME_PRESETS.find((preset) => preset.id === presetId) ?? DEFAULT_PRESET;
}

function resolveStorage(input?: { storage?: Storage }): Storage | undefined {
  if (input?.storage) {
    return input.storage;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function createFullscreenThemeStore(input?: { storage?: Storage }) {
  const storage = resolveStorage(input);
  let preset = DEFAULT_PRESET;

  try {
    preset = resolveFullscreenThemePreset(storage?.getItem(FULLSCREEN_LYRICS_THEME_STORAGE_KEY));
  } catch {
    preset = DEFAULT_PRESET;
  }

  return {
    getPreset(): FullscreenThemePreset {
      return preset;
    },
    setPreset(nextPresetId: FullscreenThemePresetId): FullscreenThemePreset {
      preset = resolveFullscreenThemePreset(nextPresetId);
      try {
        storage?.setItem(FULLSCREEN_LYRICS_THEME_STORAGE_KEY, preset.id);
      } catch {
        // Keep in-memory state even if persistence fails.
      }
      return preset;
    },
  };
}
