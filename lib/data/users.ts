import type { Role } from "../constants";
import { newId } from "../crypto";
import { auditStmt } from "./audit";
import { Forbidden, NotFound, requireAdmin, requireUser, type Actor } from "./policy";

export type User = {
  id: string;
  email: string;
  password_hash: string | null;
  display_name: string | null;
  show_name: number;
  role: Role;
  email_verified_at: number | null;
  created_at: number;
};

// --- Used by the auth code only (server-side, before anyone is signed in). ---

export async function findUserByEmail(db: D1Database, email: string) {
  return db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<User>();
}

export async function findUserById(db: D1Database, id: string) {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<User>();
}

export async function createUser(db: D1Database, email: string, passwordHash: string | null, displayName: string | null) {
  const id = newId();
  await db
    // Accounts are active straight away (no confirmation email), so email_verified_at is set now.
    .prepare(
      "INSERT INTO users (id, email, password_hash, display_name, show_name, role, email_verified_at, created_at) VALUES (?, ?, ?, ?, ?, 'user', ?, ?)",
    )
    .bind(id, email, passwordHash, displayName, displayName ? 1 : 0, Date.now(), Date.now())
    .run();
  return id;
}

export async function markVerified(db: D1Database, userId: string) {
  await db.prepare("UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?").bind(Date.now(), userId).run();
}

export async function setPassword(db: D1Database, userId: string, hash: string) {
  await db.batch([
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(hash, userId),
    // Changing a password signs out everywhere.
    db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId),
  ]);
}

// --- The signed-in person's own account. ---

export async function updateProfile(db: D1Database, actor: Actor, displayName: string | null, showName: boolean) {
  requireUser(actor);
  await db
    .prepare("UPDATE users SET display_name = ?, show_name = ? WHERE id = ?")
    .bind(displayName, displayName && showName ? 1 : 0, actor.id)
    .run();
}

/**
 * Deletes the account and everything tied to it. Songs that were already
 * approved stay in the bank (they belong to everyone now) but lose their
 * link to this person and any name credit.
 */
export async function deleteAccount(db: D1Database, actor: Actor) {
  requireUser(actor);
  await db.batch([
    db
      .prepare("UPDATE songs SET credit_name = NULL, submission_id = NULL WHERE submission_id IN (SELECT id FROM submissions WHERE user_id = ?)")
      .bind(actor.id),
    db.prepare("DELETE FROM submissions WHERE user_id = ?").bind(actor.id),
    db.prepare("DELETE FROM users WHERE id = ?").bind(actor.id),
  ]);
}

// --- Admin. ---

export type UserSummary = Pick<User, "id" | "email" | "display_name" | "role" | "created_at" | "email_verified_at">;

export async function listStaff(db: D1Database, actor: Actor) {
  requireAdmin(actor);
  const { results } = await db
    .prepare("SELECT id, email, display_name, role, created_at, email_verified_at FROM users WHERE role IN ('reviewer', 'admin') ORDER BY role, email")
    .all<UserSummary>();
  return results;
}

export async function findUserForAdmin(db: D1Database, actor: Actor, email: string) {
  requireAdmin(actor);
  return db
    .prepare("SELECT id, email, display_name, role, created_at, email_verified_at FROM users WHERE email = ?")
    .bind(email)
    .first<UserSummary>();
}

export async function setRole(db: D1Database, actor: Actor, userId: string, role: "user" | "reviewer") {
  requireAdmin(actor);
  if (userId === actor.id) throw new Forbidden("You can't change your own role");
  const u = await db
    .prepare("SELECT id, display_name, role FROM users WHERE id = ?")
    .bind(userId)
    .first<Pick<User, "id" | "display_name" | "role">>();
  if (!u) throw new NotFound();
  if (u.role === "admin") throw new Forbidden("Admins are set up from the command line");
  await db.batch([
    db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, userId),
    // Make the new role take effect now.
    db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId),
    auditStmt(db, actor, role === "reviewer" ? "role.grant_reviewer" : "role.revoke_reviewer", "user", userId, { who: u.display_name || `Member ${u.id.slice(0, 6)}` }),
  ]);
}
