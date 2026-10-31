import Link from "next/link";
import { Flame } from "@/components/ui/Flame";
import { ENERGIES, labelFor } from "@/lib/constants";
import { countPublished, latestSongs } from "@/lib/data/songs";
import { db } from "@/lib/env";
import styles from "./home.module.css";

export default async function Home() {
  const [songs, count] = await Promise.all([latestSongs(db(), 6), countPublished(db())]);
  return (
    <div className="wrap">
      <section className={styles.hero}>
        <Flame size={64} />
        <h1>Campfire songs, all in one place</h1>
        <p className="lede">
          Words, chords and actions for the songs everyone sings after dark. Sent in by anyone, checked by young people,
          free for all.
        </p>
        <form action="/songs" method="get" role="search" className={styles.search}>
          <label htmlFor="hero-q" className="visually-hidden">Search for a song</label>
          <input id="hero-q" name="q" type="search" placeholder="Search for a song" autoComplete="off" />
          <button className="btn" type="submit">Search</button>
        </form>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Latest songs</h2>
          {count > 0 && <Link href="/songs">See all {count}</Link>}
        </div>
        {songs.length === 0 ? (
          <div className={`card ${styles.empty}`}>
            <p>No songs yet. The bank is brand new.</p>
            <Link href="/submit" className="btn">Add the first song</Link>
          </div>
        ) : (
          <ul className="song-list">
            {songs.map((s) => (
              <li key={s.id}>
                <Link href={`/songs/${s.slug}`}>
                  <strong>{s.title}</strong>
                  <span className="meta">{labelFor(ENERGIES, s.energy)} energy</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2>How it works</h2>
        <ol className={styles.steps}>
          <li className="card">
            <span className={styles.num}>1</span>
            <h3>Send in a song</h3>
            <p>Words, chords if you know them, and how to lead it. No account needed.</p>
          </li>
          <li className="card">
            <span className={styles.num}>2</span>
            <h3>Young people check it</h3>
            <p>A small review team makes sure it suits all ages and is okay to share.</p>
          </li>
          <li className="card">
            <span className={styles.num}>3</span>
            <h3>Everyone can sing it</h3>
            <p>It goes in the bank, and we email you to say it&rsquo;s in.</p>
          </li>
        </ol>
        <p className={styles.cta}>
          <Link href="/submit" className="btn">Add a song</Link>
        </p>
      </section>
    </div>
  );
}
