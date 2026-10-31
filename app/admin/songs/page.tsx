import type { Metadata } from "next";
import Link from "next/link";
import { adminOnly } from "@/lib/auth/guards";
import { listAllSongs } from "@/lib/data/songs";
import { db } from "@/lib/env";
import { publishSong, removeSong } from "../actions";
import { AdminNav } from "../AdminNav";

export const metadata: Metadata = { title: "All songs", robots: { index: false } };

export default async function AdminSongs({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const actor = await adminOnly("/admin/songs");
  const { msg } = await searchParams;
  const songs = await listAllSongs(db(), actor);
  return (
    <div className="wrap page">
      <h1>All songs</h1>
      <AdminNav />
      {msg === "deleted" && <p className="notice" role="status">Deleted for good.</p>}
      {msg === "confirm" && <p className="notice notice-error" role="alert">Tick the box to confirm deleting.</p>}
      <p>Taking a song down hides it straight away and can be undone. Deleting can&rsquo;t.</p>
      <ul style={{ listStyle: "none", padding: 0, maxWidth: "52rem" }}>
        {songs.map((s) => (
          <li key={s.id} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.75rem", padding: "0.75rem 0", borderBottom: "1px dashed var(--line)" }}>
            <span>
              {s.published ? <Link href={`/songs/${s.slug}`}>{s.title}</Link> : <span>{s.title}</span>}
              {!s.published && <span style={{ color: "var(--danger)", marginLeft: "0.5rem" }}>(taken down)</span>}
            </span>
            <span style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <form action={publishSong}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="on" value={s.published ? "0" : "1"} />
                <button className="btn btn-coal btn-small" type="submit">{s.published ? "Take down" : "Put back up"}</button>
              </form>
              <form action={removeSong} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <input type="hidden" name="id" value={s.id} />
                <label style={{ fontSize: "0.93rem", display: "flex", gap: "0.3rem", alignItems: "center" }}>
                  <input type="checkbox" name="confirm" value="yes" /> sure
                </label>
                <button className="btn btn-danger btn-small" type="submit" aria-label={`Delete ${s.title} for good`}>Delete</button>
              </form>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
