import "server-only";
import { headers } from "next/headers";
import { hmac } from "./crypto";
import { db, getEnv } from "./env";

export const LIMITS = {
  submitIp: { max: 8, windowMs: 3600_000 },
  submitEmail: { max: 4, windowMs: 3600_000 },
  loginIp: { max: 20, windowMs: 15 * 60_000 },
  loginEmail: { max: 8, windowMs: 15 * 60_000 },
  signupIp: { max: 6, windowMs: 3600_000 },
  resetIp: { max: 6, windowMs: 3600_000 },
  resetEmail: { max: 3, windowMs: 3600_000 },
  reportIp: { max: 6, windowMs: 3600_000 },
  contactIp: { max: 5, windowMs: 3600_000 },
} as const;

export async function clientIp() {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Fixed-window counter in D1. Returns true if the action is allowed.
 * The key is an HMAC of the identifier, so raw IPs and emails are never stored.
 */
export async function rateLimit(name: keyof typeof LIMITS, identifier: string) {
  const { max, windowMs } = LIMITS[name];
  const key = await hmac(getEnv().RATE_LIMIT_SECRET || "dev-only-secret", `${name}:${identifier}`);
  const t = Date.now();
  const row = await db()
    .prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN window_start <= ?3 THEN 1 ELSE count + 1 END,
         window_start = CASE WHEN window_start <= ?3 THEN ?2 ELSE window_start END
       RETURNING count`,
    )
    .bind(key, t, t - windowMs)
    .first<{ count: number }>();
  return (row?.count ?? 0) <= max;
}
