import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { SESSION_TTL } from "../constants";
import { randomToken, sha256 } from "../crypto";
import type { Actor } from "../data/policy";
import type { User } from "../data/users";
import { db } from "../env";

// __Host- cookies must be Secure, path=/ and have no Domain, so they can't be
// set or read by any other site or subdomain.
const COOKIE = "__Host-cfs_session";

export type SessionUser = Pick<User, "id" | "email" | "display_name" | "show_name" | "role">;

export async function createSession(userId: string) {
  const token = randomToken();
  const expires = Date.now() + SESSION_TTL;
  await db()
    .prepare("INSERT INTO sessions (id_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256(token), userId, expires, Date.now())
    .run();
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expires),
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db().prepare("DELETE FROM sessions WHERE id_hash = ?").bind(await sha256(token)).run();
  jar.delete(COOKIE);
}

/** The signed-in user for this request, or null. Checked against the database every time. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const row = await db()
    .prepare(
      `SELECT u.id, u.email, u.display_name, u.show_name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id_hash = ? AND s.expires_at > ? AND u.email_verified_at IS NOT NULL`,
    )
    .bind(await sha256(token), Date.now())
    .first<SessionUser>();
  return row ?? null;
});

export function toActor(u: SessionUser | null): Actor {
  // The audit log is visible to reviewers, so it never shows emails.
  return u ? { id: u.id, role: u.role, label: u.display_name || `Member ${u.id.slice(0, 6)}` } : null;
}

export async function getActor(): Promise<Actor> {
  return toActor(await getUser());
}
