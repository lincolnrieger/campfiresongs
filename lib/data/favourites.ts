import type { Song } from "./songs";
import { requireUser, type Actor } from "./policy";

export async function listFavourites(db: D1Database, actor: Actor) {
  requireUser(actor);
  const { results } = await db
    .prepare(
      `SELECT s.id, s.slug, s.title, s.energy, s.categories, s.sections FROM favourites f
       JOIN songs s ON s.id = f.song_id WHERE f.user_id = ? AND s.published = 1 ORDER BY f.created_at DESC`,
    )
    .bind(actor.id)
    .all<Pick<Song, "id" | "slug" | "title" | "energy"> & { categories: string; sections: string }>();
  return results.map((r) => ({ ...r, categories: JSON.parse(r.categories) as string[], sections: JSON.parse(r.sections) as string[] }));
}

export async function isFavourite(db: D1Database, actor: Actor, songId: string) {
  if (!actor) return false;
  const r = await db.prepare("SELECT 1 FROM favourites WHERE user_id = ? AND song_id = ?").bind(actor.id, songId).first();
  return !!r;
}

export async function setFavourite(db: D1Database, actor: Actor, songId: string, on: boolean) {
  requireUser(actor);
  if (on) {
    await db
      .prepare("INSERT OR IGNORE INTO favourites (user_id, song_id, created_at) SELECT ?, id, ? FROM songs WHERE id = ? AND published = 1")
      .bind(actor.id, Date.now(), songId)
      .run();
  } else {
    await db.prepare("DELETE FROM favourites WHERE user_id = ? AND song_id = ?").bind(actor.id, songId).run();
  }
}
