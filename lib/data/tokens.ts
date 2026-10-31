// One-time email tokens. The raw token only ever exists in the email link;
// the database keeps a SHA-256 hash. Using a token marks it used atomically.
import { randomToken, sha256 } from "../crypto";

export type TokenPurpose = "verify" | "reset" | "magic" | "confirm_submission";

export async function issueToken(
  db: D1Database,
  purpose: TokenPurpose,
  ttlMs: number,
  ref: { userId?: string; submissionId?: string },
) {
  const token = randomToken();
  await db
    .prepare("INSERT INTO email_tokens (token_hash, purpose, user_id, submission_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(await sha256(token), purpose, ref.userId ?? null, ref.submissionId ?? null, Date.now() + ttlMs, Date.now())
    .run();
  return token;
}

/** Returns what the token points at, or null if it's unknown, used or expired. */
export async function consumeToken(db: D1Database, purpose: TokenPurpose, token: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const t = Date.now();
  return db
    .prepare(
      "UPDATE email_tokens SET used_at = ? WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > ? RETURNING user_id, submission_id",
    )
    .bind(t, await sha256(token), purpose, t)
    .first<{ user_id: string | null; submission_id: string | null }>();
}

/** Check a token without using it (so a reset form can show before it's submitted). */
export async function peekToken(db: D1Database, purpose: TokenPurpose, token: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return false;
  const r = await db
    .prepare("SELECT 1 FROM email_tokens WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?")
    .bind(await sha256(token), purpose, Date.now())
    .first();
  return !!r;
}
