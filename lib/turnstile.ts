import "server-only";
import { getEnv } from "./env";

/** Check a Turnstile token with Cloudflare. Fails closed. */
export async function verifyTurnstile(token: FormDataEntryValue | null, ip: string) {
  const env = getEnv();
  // Local development only: both flags must be set, and only for a localhost APP_URL.
  if (env.TURNSTILE_DEV_BYPASS === "1" && /^http:\/\/localhost(:\d+)?$/.test(env.APP_URL ?? "")) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;
  try {
    const body = new FormData();
    body.append("secret", secret);
    body.append("response", token);
    if (ip !== "unknown") body.append("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
