import { requireReviewer, type Actor } from "./policy";

export function auditStmt(
  db: D1Database,
  actor: NonNullable<Actor>,
  action: string,
  targetType: string,
  targetId: string,
  detail?: Record<string, unknown>,
) {
  return db
    .prepare(
      "INSERT INTO audit_log (actor_id, actor_label, action, target_type, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(actor.id, actor.label, action, targetType, targetId, detail ? JSON.stringify(detail) : null, Date.now());
}

/** Same as auditStmt, but only writes the row if `guardSql` (an EXISTS subquery body) matches. */
export function auditIfStmt(
  db: D1Database,
  actor: NonNullable<Actor>,
  action: string,
  targetType: string,
  targetId: string,
  detail: Record<string, unknown>,
  guardSql: string,
  guardArgs: unknown[],
) {
  return db
    .prepare(
      `INSERT INTO audit_log (actor_id, actor_label, action, target_type, target_id, detail, created_at)
       SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (${guardSql})`,
    )
    .bind(actor.id, actor.label, action, targetType, targetId, JSON.stringify(detail), Date.now(), ...guardArgs);
}

export type AuditRow = {
  id: number;
  actor_label: string;
  action: string;
  target_type: string;
  target_id: string;
  detail: string | null;
  created_at: number;
};

export async function listAudit(db: D1Database, actor: Actor, limit = 200) {
  requireReviewer(actor);
  const { results } = await db
    .prepare("SELECT id, actor_label, action, target_type, target_id, detail, created_at FROM audit_log ORDER BY id DESC LIMIT ?")
    .bind(limit)
    .all<AuditRow>();
  return results;
}
