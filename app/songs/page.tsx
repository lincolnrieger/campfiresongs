import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, ENERGIES, SECTIONS, labelFor } from "@/lib/constants";
import { listPublishedSongs } from "@/lib/data/songs";
import { db } from "@/lib/env";
import styles from "./songs.module.css";

export const metadata: Metadata = {
  title: "The song bank",
  description: "Search campfire songs by name or words, and filter by type, section and energy.",
};

type SP = { q?: string; category?: string; section?: string; energy?: string };

const pick = (v: string | undefined, list: readonly { id: string }[]) => (v && list.some((x) => x.id === v) ? v : undefined);

export default async function Songs({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 100);
  const f = {
    q,
    category: pick(sp.category, CATEGORIES),
    section: pick(sp.section, SECTIONS),
    energy: pick(sp.energy, ENERGIES),
  };
  const songs = await listPublishedSongs(db(), f);
  const filtered = !!(f.q || f.category || f.section || f.energy);

  return (
    <div className="wrap page">
      <div className={styles.head}>
        <h1>Songs</h1>
        <p className="lede">Every song here has been checked by the youth review team.</p>
      </div>

      <form className={`card ${styles.filters}`} method="get" role="search" aria-label="Find a song">
        <div>
          <label htmlFor="q">Search</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Title or words" autoComplete="off" />
        </div>
        <div>
          <label htmlFor="category">Type</label>
          <select id="category" name="category" defaultValue={f.category ?? ""}>
            <option value="">Any</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="section">Section</label>
          <select id="section" name="section" defaultValue={f.section ?? ""}>
            <option value="">Any</option>
            {SECTIONS.filter((s) => s.id !== "all").map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="energy">Energy</label>
          <select id="energy" name="energy" defaultValue={f.energy ?? ""}>
            <option value="">Any</option>
            {ENERGIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <button className="btn" type="submit">Search</button>
        {filtered && (
          <p className={styles.clear}>
            <Link href="/songs">Clear search</Link>
          </p>
        )}
      </form>

      <section aria-labelledby="results">
        <h2 id="results" className={styles.count} aria-live="polite">
          {songs.length === 0
            ? filtered
              ? "No songs match that"
              : "No songs yet"
            : `${songs.length} song${songs.length === 1 ? "" : "s"}${filtered ? " found" : ""}`}
        </h2>
        {songs.length === 0 ? (
          <p>
            {filtered ? "Try fewer words or a different filter. " : "The bank is brand new. "}
            <Link href="/submit">Add a song</Link>
          </p>
        ) : (
          <ul className="song-list">
            {songs.map((s) => (
              <li key={s.id}>
                <Link href={`/songs/${s.slug}`}>
                  <span className={styles.item}>
                    <strong>{s.title}</strong>
                    <span className={styles.firstLine}>{s.lyrics.split("\n").find((l) => l.trim()) ?? ""}</span>
                  </span>
                  <span className="tag" data-energy={s.energy}>{labelFor(ENERGIES, s.energy)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
