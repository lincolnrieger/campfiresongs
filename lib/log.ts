// Server-side error logging without personal data: we log where and what kind
// of error, never form contents, emails or IPs.
export function logError(where: string, err: unknown) {
  const kind = err instanceof Error ? err.name : typeof err;
  const msg = err instanceof Error ? err.message.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]") : "";
  console.error(`[${where}] ${kind}: ${msg.slice(0, 300)}`);
}
