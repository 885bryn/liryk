import { describe, expect, it } from "vitest";

import {
  getLineDirection,
  isUnusableLyricText,
  normalizeChineseForDisplay,
  normalizeForMatch,
} from "./unicode-normalization";

describe("unicode normalization helpers", () => {
  it("normalizes composed/decomposed text and strips minor title suffixes", () => {
    expect(normalizeForMatch("Cafe\u0301")).toBe(normalizeForMatch("Caf\u00e9"));
    expect(normalizeForMatch("Song Name (Live)")).toBe("song name");
    expect(normalizeForMatch("Song Name - Remaster 2011")).toBe("song name");
  });

  it("returns deterministic direction metadata for Arabic, Korean, and latin lines", () => {
    expect(getLineDirection("\u0645\u0631\u062d\u0628\u0627 \u0628\u0627\u0644\u0639\u0627\u0644\u0645")).toBe("rtl");
    expect(getLineDirection("\ud55c\uad6d\uc5b4 \uac00\uc0ac")).toBe("ltr");
    expect(getLineDirection("12345 ...")).toBe("auto");
  });

  it("flags replacement-character and mojibake-heavy payloads as unusable", () => {
    expect(isUnusableLyricText("\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd line")).toBe(true);
    expect(isUnusableLyricText("Ã© Ã± Ã¼")).toBe(true);
    expect(isUnusableLyricText("\u0627\u062d\u0628\u0643")).toBe(false);
    expect(isUnusableLyricText("\ud55c\uae00")).toBe(false);
  });

  it("normalizes traditional chinese display text to simplified while preserving non-chinese glyphs", () => {
    expect(normalizeChineseForDisplay("\u611b\u4f60\u9084\u662f\u611b\u6211 ABC")).toBe(
      "\u7231\u4f60\u8fd8\u662f\u7231\u6211 ABC",
    );
    expect(normalizeChineseForDisplay("\u611b\u4f60\u9084\u662f\u611b\u6211\uff0c\u4e0d\u8aaa")).toBe(
      "\u7231\u4f60\u8fd8\u662f\u7231\u6211\uff0c\u4e0d\u8bf4",
    );
  });
});
