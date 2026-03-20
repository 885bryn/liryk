import { beforeEach, describe, expect, it } from "vitest";

import { createThemeStore, hydrateTheme, type ThemeMode } from "./theme-store";

describe("theme-store", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("resolves to deterministic light mode when nothing is persisted", () => {
    const store = createThemeStore();

    expect(store.getMode()).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggles mode and syncs root class plus localStorage", () => {
    const store = createThemeStore();

    const nextMode = store.toggle();
    expect(nextMode).toBe("dark");
    expect(store.getMode()).toBe("dark");
    expect(localStorage.getItem("liryk-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("hydrates persisted value before shell consumers read theme", () => {
    localStorage.setItem("liryk-theme", "dark");

    const restored = hydrateTheme();
    expect(restored).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    localStorage.setItem("liryk-theme", "light");
    const restoredLight: ThemeMode = hydrateTheme();
    expect(restoredLight).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
