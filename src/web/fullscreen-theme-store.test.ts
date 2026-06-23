import { beforeEach, describe, expect, it } from "vitest";

import {
  FULLSCREEN_LYRICS_THEME_STORAGE_KEY,
  FULLSCREEN_LYRICS_THEME_PRESETS,
  createFullscreenThemeStore,
  resolveFullscreenThemePreset,
} from "./fullscreen-theme-store";

describe("fullscreen-theme-store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns Midnight when no preset is persisted", () => {
    const store = createFullscreenThemeStore();

    expect(store.getPreset().id).toBe("midnight");
    expect(store.getPreset().backgroundHex).toBe("#000000");
    expect(store.getPreset().textHex).toBe("#FFFFFF");
  });

  it("persists and restores a selected preset by id", () => {
    const store = createFullscreenThemeStore();

    const nextPreset = store.setPreset("blue-hour");
    expect(nextPreset.id).toBe("blue-hour");
    expect(localStorage.getItem(FULLSCREEN_LYRICS_THEME_STORAGE_KEY)).toBe("blue-hour");

    const restored = createFullscreenThemeStore();
    expect(restored.getPreset().id).toBe("blue-hour");
  });

  it("falls back to Midnight when persisted data is invalid", () => {
    localStorage.setItem(FULLSCREEN_LYRICS_THEME_STORAGE_KEY, "invalid-preset");

    const store = createFullscreenThemeStore();
    expect(store.getPreset().id).toBe("midnight");
  });

  it("uses Midnight when storage reads throw and still updates in memory", () => {
    const throwingStorage = {
      getItem() {
        throw new Error("storage blocked");
      },
      setItem() {
        throw new Error("storage blocked");
      },
    } as unknown as Storage;

    const store = createFullscreenThemeStore({ storage: throwingStorage });
    expect(store.getPreset().id).toBe("midnight");
    expect(store.setPreset("forest-glow").id).toBe("forest-glow");
  });

  it("exposes exactly the five curated presets from the spec", () => {
    expect(FULLSCREEN_LYRICS_THEME_PRESETS.map((preset) => preset.id)).toEqual([
      "midnight",
      "paper-lantern",
      "blue-hour",
      "forest-glow",
      "rose-lounge",
    ]);

    expect(resolveFullscreenThemePreset("paper-lantern")).toMatchObject({
      id: "paper-lantern",
      name: "Paper Lantern",
      backgroundHex: "#FFF4D6",
      textHex: "#2F2419",
    });
  });
});
