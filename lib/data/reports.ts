import type { ReportReason } from "../constants";
import { newId } from "../crypto";
import { auditStmt } from "./audit";
import { NotFound, requireAdmin, type Actor } from "./policy";

export type Report = {
  id: string;
  song_id: string | null;
  song_title: string;
  slug: string | null;
  reason: ReportReason;
  message: string;
  created_at: number;
  resolved_at: number | null;
};

/** Anyone can report a published song. */
export async function createReport(db: D1Database, songId: string, reason: ReportReason, message: string) {
  const song = await db.prepare("SELECT id, title FROM songs WHERE id = ? AND published = 1").bind(songId).first<{ id: string; title: string }>();
  if (!song) throw new NotFound();
  const id = newId();
  await db
    .prepare("INSERT INTO reports (id, song_id, song_title, reason, message, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, song.id, song.title, reason, message, Date.now())
    .run();
  return { id, title: song.title };
}

export async function listReports(db: D1Database, actor: Actor) {
  requireAdmin(actor);
  const { results } = await db
    .prepare(
      `SELECT r.id, r.song_id, r.song_title, s.slug, r.reason, r.message, r.created_at, r.resolved_at
       FROM reports r LEFT JOIN songs s ON s.id = r.song_id ORDER BY r.resolved_at IS NOT NULL, r.created_at DESC LIMIT 200`,
    )
    .all<Report>();
  return results;
}

export async function resolveReport(db: D1Database, actor: Actor, id: string) {
  requireAdmin(actor);
  await db.batch([
    db.prepare("UPDATE reports SET resolved_at = ?, resolved_by = ? WHERE id = ? AND resolved_at IS NULL").bind(Date.now(), actor.id, id),
    auditStmt(db, actor, "report.resolve", "report", id),
  ]);
}
