const WHITESPACE = /\s+/g;
const MINOR_SUFFIX = new RegExp(
  String.raw`(?:\s*(?:-|\()\s*(?:live|remaster(?:ed)?(?:\s*\d{2,4})?|clean|explicit)[^)\]]*\)?\s*)$`,
  "i",
);
const RTL_SCRIPT = /[\u0590-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
const STRONG_LTR_SCRIPT = /[A-Za-z\u0400-\u04FF\u0370-\u03FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7A3]/;
const LIKELY_MOJIBAKE = /(Ã.|Â.|â[\u0080-\u00BF]|Ð.|Ñ.)/;

const TRADITIONAL_TO_SIMPLIFIED: Record<string, string> = {
  愛: "爱",
  還: "还",
  說: "说",
};

function stripMinorSuffix(text: string): string {
  let value = text;
  while (MINOR_SUFFIX.test(value)) {
    value = value.replace(MINOR_SUFFIX, "").trim();
  }
  return value;
}

export function normalizeForMatch(input: string): string {
  const normalized = input.normalize("NFC").toLowerCase().replace(WHITESPACE, " ").trim();
  return stripMinorSuffix(normalized).replace(WHITESPACE, " ").trim();
}

export function isUnusableLyricText(input: string): boolean {
  const text = input.normalize("NFC").trim();
  if (text.length === 0) {
    return true;
  }

  const replacementCount = (text.match(/\ufffd/g) ?? []).length;
  if (replacementCount >= 3 && replacementCount / text.length >= 0.2) {
    return true;
  }

  if (LIKELY_MOJIBAKE.test(text)) {
    return true;
  }

  return false;
}

export function getLineDirection(input: string): "rtl" | "ltr" | "auto" {
  const text = input.normalize("NFC");
  const hasRtl = RTL_SCRIPT.test(text);
  const hasLtr = STRONG_LTR_SCRIPT.test(text);

  if (hasRtl && !hasLtr) {
    return "rtl";
  }

  if (hasLtr && !hasRtl) {
    return "ltr";
  }

  return "auto";
}

export function normalizeChineseForDisplay(input: string): string {
  const text = input.normalize("NFC");
  return [...text].map((char) => TRADITIONAL_TO_SIMPLIFIED[char] ?? char).join("");
}
