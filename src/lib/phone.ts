// Shared phone utilities
// Very light normalization to approximate E.164. For production, prefer libphonenumber.
export function normalizePhone(input: string): string | null {
  const s = (input || "").replace(/[^0-9+]/g, "").trim();
  if (!s) return null;
  if (s.startsWith("+")) return s;
  // Assume South Africa if starts with 0
  if (s.startsWith("0")) return "+27" + s.slice(1);
  // Fallback: treat as international w/o plus
  return "+" + s;
}
