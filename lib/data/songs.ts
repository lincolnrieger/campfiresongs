import type { CategoryId, EnergyId, SectionId } from "../constants";
import { newId } from "../crypto";
import type { MediaProvider } from "../media";
import { auditStmt } from "./audit";
import { NotFound, requireAdmin, type Actor } from "./policy";

export type Song = {
  id: string;
  slug: string;
  title: string;
  lyrics: string;
  chords: string | null;
  actions: string | null;
  media_provider: MediaProvider | null;
  media_id: string | null;
  categories: CategoryId[];
  sections: SectionId[];
  energy: EnergyId;
  origin: string | null;
  credit_name: string | null;
  published: number;
  published_at: number;
};

type Row = Omit<Song, "categories" | "sections"> & { categories: string; sections: string };

const COLS =
  "id, slug, title, lyrics, chords, actions, media_provider, media_id, categories, sections, energy, origin, credit_name, published, published_at";

function parse(r: Row): Song {
  return { ...r, categories: JSON.parse(r.categories), sections: JSON.parse(r.sections) };
}

export type SongFilters = {
  q?: string;
  category?: string;
  section?: string;
  energy?: string;
};

/** Public: published songs only. */
export async function listPublishedSongs(db: D1Database, f: SongFilters = {}) {
  const where = ["s.published = 1"];
  const args: unknown[] = [];
  let from = "songs s";
  const q = (f.q ?? "").trim();
  if (q) {
    // Each word becomes a prefix search; quotes stop FTS syntax being injected.
    const terms = q
      .split(/\s+/)
      .map((w) => w.replace(/["*^():]/g, ""))
      .filter(Boolean)
      .slice(0, 8)
      .map((w) => `"${w}"*`);
    if (terms.length) {
      from = "songs_fts JOIN songs s ON s.rowid = songs_fts.rowid";
      where.push("songs_fts MATCH ?");
      args.push(terms.join(" "));
    }
  }
  if (f.category) {
    where.push("EXISTS (SELECT 1 FROM json_each(s.categories) WHERE value = ?)");
    args.push(f.category);
  }
  if (f.section) {
    where.push("(EXISTS (SELECT 1 FROM json_each(s.sections) WHERE value = ?) OR EXISTS (SELECT 1 FROM json_each(s.sections) WHERE value = 'all'))");
    args.push(f.section);
  }
  if (f.energy) {
    where.push("s.energy = ?");
    args.push(f.energy);
  }
  const cols = COLS.split(", ").map((c) => `s.${c}`).join(", ");
  const { results } = await db
    .prepare(`SELECT ${cols} FROM ${from} WHERE ${where.join(" AND ")} ORDER BY s.title COLLATE NOCASE LIMIT 300`)
    .bind(...args)
    .all<Row>();
  return results.map(parse);
}

/** Public: one published song. */
export async function getPublishedSong(db: D1Database, slug: string) {
  const r = await db.prepare(`SELECT ${COLS} FROM songs WHERE slug = ? AND published = 1`).bind(slug).first<Row>();
  return r ? parse(r) : null;
}

export async function countPublished(db: D1Database) {
  const r = await db.prepare("SELECT COUNT(*) AS n FROM songs WHERE published = 1").first<{ n: number }>();
  return r?.n ?? 0;
}

export async function latestSongs(db: D1Database, n = 4) {
  const { results } = await db
    .prepare(`SELECT ${COLS} FROM songs WHERE published = 1 ORDER BY published_at DESC LIMIT ?`)
    .bind(n)
    .all<Row>();
  return results.map(parse);
}

/** Admin: every song, published or not. */
export async function listAllSongs(db: D1Database, actor: Actor) {
  requireAdmin(actor);
  const { results } = await db.prepare(`SELECT ${COLS} FROM songs ORDER BY title COLLATE NOCASE`).all<Row>();
  return results.map(parse);
}

export async function setSongPublished(db: D1Database, actor: Actor, id: string, published: boolean) {
  requireAdmin(actor);
  const song = await db.prepare("SELECT id, title FROM songs WHERE id = ?").bind(id).first<{ id: string; title: string }>();
  if (!song) throw new NotFound();
  await db.batch([
    db.prepare("UPDATE songs SET published = ?, updated_at = ? WHERE id = ?").bind(published ? 1 : 0, Date.now(), id),
    auditStmt(db, actor, published ? "song.republish" : "song.unpublish", "song", id, { title: song.title }),
  ]);
}

export async function deleteSong(db: D1Database, actor: Actor, id: string) {
  requireAdmin(actor);
  const song = await db.prepare("SELECT id, title FROM songs WHERE id = ?").bind(id).first<{ id: string; title: string }>();
  if (!song) throw new NotFound();
  await db.batch([
    db.prepare("DELETE FROM songs WHERE id = ?").bind(id),
    auditStmt(db, actor, "song.delete", "song", id, { title: song.title }),
  ]);
}

export function slugify(title: string) {
  return (
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "song"
  );
}

export async function uniqueSlug(db: D1Database, title: string) {
  const base = slugify(title);
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const hit = await db.prepare("SELECT 1 FROM songs WHERE slug = ?").bind(slug).first();
    if (!hit) return slug;
  }
  return `${base}-${newId().slice(0, 8)}`;
}
