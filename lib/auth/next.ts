/** Only allow sending people back to a page on this site. */
export function safeNext(v: unknown, fallback = "/account") {
  if (typeof v !== "string" || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || v.length > 200) return fallback;
  return v;
}
