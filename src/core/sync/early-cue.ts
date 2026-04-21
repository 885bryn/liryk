export const DEFAULT_CUE_LEAD_MS = 120;

export function applyEarlyCue(progressMs: number, cueLeadMs: number = DEFAULT_CUE_LEAD_MS): number {
  const normalizedProgressMs = Math.floor(progressMs);
  if (cueLeadMs <= 0) {
    return Math.max(0, normalizedProgressMs);
  }

  return Math.max(0, normalizedProgressMs + Math.floor(cueLeadMs));
}
