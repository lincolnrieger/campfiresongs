import { EMAIL_RETENTION_AFTER_DECISION, UNCONFIRMED_TTL, type CategoryId, type EnergyId, type SectionId } from "../constants";
import { newId } from "../crypto";
import { parseMediaUrl } from "../media";
import { auditIfStmt } from "./audit";
import { uniqueSlug } from "./songs";
import { Forbidden, NotFound, requireReviewer, requireUser, type Actor } from "./policy";

export type SongInput = {
  title: string;
  lyrics: string;
  chords: string | null;
  actions: string | null;
  mediaUrl: string | null;
  categories: CategoryId[];
  sections: SectionId[];
  energy: EnergyId;
  origin: string | null;
  creditName: string | null;
};

export type SubmissionInput = SongInput & { notes: string | null };

export type SubmissionStatus = "unconfirmed" | "pending" | "approved" | "rejected";

export type Submission = {
  id: string;
  status: SubmissionStatus;
  title: string;
  lyrics: string;
  chords: string | null;
  actions: string | null;
  media_url: string | null;
  categories: CategoryId[];
  sections: SectionId[];
  energy: EnergyId;
  origin: string | null;
  notes: string | null;
  credit_name: string | null;
  email: string | null;
  user_id: string | null;
  review_note: string | null;
  reviewed_at: number | null;
  song_id: string | null;
  created_at: number;
  updated_at: number;
};

type Row = Omit<Submission, "categories" | "sections"> & { categories: string; sections: string };
const COLS =
  "id, status, title, lyrics, chords, actions, media_url, categories, sections, energy, origin, notes, credit_name, email, user_id, review_note, reviewed_at, song_id, created_at, updated_at";
const parse = (r: Row): Submission => ({ ...r, categories: JSON.parse(r.categories), sections: JSON.parse(r.sections) });

/**
 * Anyone may submit. Signed-in people go straight to the queue; everyone else
 * starts "unconfirmed" until they click the link in their email.
 */
export async function createSubmission(
  db: D1Database,
  actor: Actor,
  input: SubmissionInput,
  email: string | null,
) {
  if (!actor && !email) throw new Forbidden("An email is needed without an account");
  const id = newId();
  const t = Date.now();
  await db
    .prepare(
      `INSERT INTO submissions (id, status, title, lyrics, chords, actions, media_url, categories, sections, energy, origin, notes, credit_name, email, user_id, created_at, confirmed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      actor ? "pending" : "unconfirmed",
      input.title,
      input.lyrics,
      input.chords,
      input.actions,
      input.mediaUrl,
      JSON.stringify(input.categories),
      JSON.stringify(input.sections),
      input.energy,
      input.origin,
      input.notes,
      input.creditName,
      actor ? null : email,
      actor?.id ?? null,
      t,
      actor ? t : null,
      t,
    )
    .run();
  return id;
}

/** Moves an unconfirmed submission into the queue. Called after the email token checks out. */
export async function markConfirmed(db: D1Database, id: string) {
  const r = await db
    .prepare("UPDATE submissions SET status = 'pending', confirmed_at = ?, updated_at = ? WHERE id = ? AND status = 'unconfirmed' RETURNING id, title, email")
    .bind(Date.now(), Date.now(), id)
    .first<{ id: string; title: string; email: string | null }>();
  return r;
}

// ---- The submitter's own submissions -------------------------------------

export async function listMySubmissions(db: D1Database, actor: Actor) {
  requireUser(actor);
  const { results } = await db
    .prepare(`SELECT ${COLS} FROM submissions WHERE user_id = ? ORDER BY created_at DESC`)
    .bind(actor.id)
    .all<Row>();
  return results.map(parse);
}

export async function getMySubmission(db: D1Database, actor: Actor, id: string) {
  requireUser(actor);
  const r = await db.prepare(`SELECT ${COLS} FROM submissions WHERE id = ? AND user_id = ?`).bind(id, actor.id).first<Row>();
  if (!r) throw new NotFound();
  return parse(r);
}

export async function updateMySubmission(db: D1Database, actor: Actor, id: string, input: SubmissionInput) {
  requireUser(actor);
  const r = await db
    .prepare(
      `UPDATE submissions SET title = ?, lyrics = ?, chords = ?, actions = ?, media_url = ?, categories = ?, sections = ?, energy = ?, origin = ?, notes = ?, credit_name = ?, updated_at = ?
       WHERE id = ? AND user_id = ? AND status = 'pending'`,
    )
    .bind(
      input.title, input.lyrics, input.chords, input.actions, input.mediaUrl,
      JSON.stringify(input.categories), JSON.stringify(input.sections), input.energy,
      input.origin, input.notes, input.creditName, Date.now(), id, actor.id,
    )
    .run();
  if (!r.meta.changes) throw new Forbidden("Only your own unreviewed submissions can be changed");
}

export async function deleteMySubmission(db: D1Database, actor: Actor, id: string) {
  requireUser(actor);
  const r = await db
    .prepare("DELETE FROM submissions WHERE id = ? AND user_id = ? AND status IN ('pending', 'unconfirmed')")
    .bind(id, actor.id)
    .run();
  if (!r.meta.changes) throw new Forbidden("Only your own unreviewed submissions can be deleted");
}

// ---- Review --------------------------------------------------------------

export async function listQueue(db: D1Database, actor: Actor) {
  requireReviewer(actor);
  const { results } = await db
    .prepare(`SELECT ${COLS} FROM submissions WHERE status = 'pending' ORDER BY created_at ASC`)
    .all<Row>();
  return results.map(parse);
}

export async function countQueue(db: D1Database, actor: Actor) {
  requireReviewer(actor);
  const r = await db.prepare("SELECT COUNT(*) AS n FROM submissions WHERE status = 'pending'").first<{ n: number }>();
  return r?.n ?? 0;
}

export async function listRecentDecisions(db: D1Database, actor: Actor, limit = 30) {
  requireReviewer(actor);
  const { results } = await db
    .prepare(`SELECT ${COLS} FROM submissions WHERE status IN ('approved', 'rejected') ORDER BY reviewed_at DESC LIMIT ?`)
    .bind(limit)
    .all<Row>();
  return results.map(parse);
}

export async function getForReview(db: D1Database, actor: Actor, id: string) {
  requireReviewer(actor);
  const r = await db.prepare(`SELECT ${COLS} FROM submissions WHERE id = ?`).bind(id).first<Row>();
  if (!r) throw new NotFound();
  return parse(r);
}

export type Decision = {
  submission: Submission;
  /** Where to send the decision email (account email or the one they gave). */
  notify: string | null;
  slug?: string;
};

async function notifyAddress(db: D1Database, s: Submission) {
  if (s.email) return s.email;
  if (!s.user_id) return null;
  const u = await db.prepare("SELECT email FROM users WHERE id = ?").bind(s.user_id).first<{ email: string }>();
  return u?.email ?? null;
}

/** Approve, optionally with the reviewer's edits, and publish to the song bank. */
export async function approveSubmission(
  db: D1Database,
  actor: Actor,
  id: string,
  note: string | null,
  edits?: SongInput,
): Promise<Decision> {
  requireReviewer(actor);
  const s = await getForReview(db, actor, id);
  if (s.status !== "pending") throw new Forbidden("Already reviewed");
  const final: SongInput = edits ?? {
    title: s.title,
    lyrics: s.lyrics,
    chords: s.chords,
    actions: s.actions,
    mediaUrl: s.media_url,
    categories: s.categories,
    sections: s.sections,
    energy: s.energy,
    origin: s.origin,
    creditName: s.credit_name,
  };
  const media = final.mediaUrl ? parseMediaUrl(final.mediaUrl) : null;
  const songId = newId();
  const slug = await uniqueSlug(db, final.title);
  const t = Date.now();
  // The status check in the UPDATE stops two reviewers approving at once.
  const results = await db.batch([
    db
      .prepare(
        `UPDATE submissions SET status = 'approved', title = ?, lyrics = ?, chords = ?, actions = ?, media_url = ?, categories = ?, sections = ?, energy = ?, origin = ?, credit_name = ?,
         review_note = ?, reviewed_by = ?, reviewed_at = ?, song_id = ?, updated_at = ? WHERE id = ? AND status = 'pending'`,
      )
      .bind(
        final.title, final.lyrics, final.chords, final.actions, final.mediaUrl,
        JSON.stringify(final.categories), JSON.stringify(final.sections), final.energy, final.origin, final.creditName,
        note, actor.id, t, songId, t, id,
      ),
    db
      .prepare(
        `INSERT INTO songs (id, slug, submission_id, title, lyrics, chords, actions, media_provider, media_id, categories, sections, energy, origin, credit_name, published, published_at, updated_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ? WHERE EXISTS (SELECT 1 FROM submissions WHERE id = ? AND song_id = ?)`,
      )
      .bind(
        songId, slug, id, final.title, final.lyrics, final.chords, final.actions,
        media?.provider ?? null, media?.id ?? null,
        JSON.stringify(final.categories), JSON.stringify(final.sections), final.energy, final.origin, final.creditName,
        t, t, id, songId,
      ),
    auditIfStmt(db, actor, edits ? "submission.edit_approve" : "submission.approve", "submission", id, { title: final.title, slug },
      "SELECT 1 FROM songs WHERE id = ? AND submission_id = ?", [songId, id]),
  ]);
  if (!results[0].meta.changes) throw new Forbidden("Already reviewed");
  return { submission: { ...s, ...{ title: final.title } }, notify: await notifyAddress(db, s), slug };
}

export async function rejectSubmission(db: D1Database, actor: Actor, id: string, note: string | null): Promise<Decision> {
  requireReviewer(actor);
  const s = await getForReview(db, actor, id);
  const t = Date.now();
  const [r] = await db.batch([
    db
      .prepare("UPDATE submissions SET status = 'rejected', review_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ? AND status = 'pending'")
      .bind(note, actor.id, t, t, id),
    auditIfStmt(db, actor, "submission.reject", "submission", id, { title: s.title },
      // changes() is the row count of the UPDATE just before it in this batch.
      "SELECT 1 WHERE changes() > 0", []),
  ]);
  if (!r.meta.changes) throw new Forbidden("Already reviewed");
  return { submission: s, notify: await notifyAddress(db, s) };
}

export async function markDecisionSent(db: D1Database, id: string) {
  await db.prepare("UPDATE submissions SET decision_sent_at = ? WHERE id = ?").bind(Date.now(), id).run();
}

/**
 * Housekeeping, run daily by the scheduled handler:
 *  - unconfirmed submissions older than 7 days are deleted
 *  - submitter emails are wiped 30 days after the decision email
 *  - expired tokens, sessions and rate-limit rows are removed
 */
export async function cleanup(db: D1Database, t = Date.now()) {
  await db.batch([
    db.prepare("DELETE FROM submissions WHERE status = 'unconfirmed' AND created_at < ?").bind(t - UNCONFIRMED_TTL),
    db.prepare("UPDATE submissions SET email = NULL WHERE email IS NOT NULL AND decision_sent_at < ?").bind(t - EMAIL_RETENTION_AFTER_DECISION),
    db.prepare("DELETE FROM email_tokens WHERE expires_at < ? OR used_at IS NOT NULL").bind(t),
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(t),
    db.prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(t - 24 * 3600_000),
    // Accounts that never verified their email within a week.
    db.prepare("DELETE FROM users WHERE email_verified_at IS NULL AND created_at < ?").bind(t - UNCONFIRMED_TTL),
  ]);
}
