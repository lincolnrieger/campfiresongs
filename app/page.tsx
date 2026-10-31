import Link from "next/link";
import { Campfire, NightBand } from "@/components/ui/Campfire";
import { ENERGIES, labelFor } from "@/lib/constants";
import { countPublished, latestSongs } from "@/lib/data/songs";
import { db } from "@/lib/env";
import styles from "./home.module.css";

export default async function Home() {
  const [songs, count] = await Promise.all([latestSongs(db(), 6), countPublished(db())]);
  return (
    <>
      <NightBand>
        <div className={`wrap ${styles.hero}`}>
          <div className={styles.heroText}>
            <p className={styles.kicker}>Pull up a log</p>
            <h1>The songs we sing around the fire</h1>
            <p className={styles.lede}>
              Words, chords and actions for campfire songs, sent in by people who love them and checked by young
              people before they go in.
            </p>
            <form action="/songs" method="get" role="search" className={styles.search}>
              <label htmlFor="hero-q" className="visually-hidden">Search for a song</label>
              <input id="hero-q" name="q" type="search" placeholder="Search for a song" autoComplete="off" />
              <button className="btn" type="submit">Search</button>
            </form>
          </div>
          <Campfire size={240} />
        </div>
      </NightBand>

      <div className="wrap">
        <section className={styles.section} aria-labelledby="latest">
          <div className={styles.sectionHead}>
            <h2 id="latest">New around the fire</h2>
            {count > 1 && <Link href="/songs">All {count} songs</Link>}
          </div>
          {songs.length === 0 ? (
            <p className={styles.empty}>
              No songs yet. The fire&rsquo;s only just been lit. <Link href="/submit">Add the first one.</Link>
            </p>
          ) : (
            <ol className={`song-list ${styles.setlist}`}>
              {songs.map((s) => (
                <li key={s.id}>
                  <Link href={`/songs/${s.slug}`}>
                    <strong>{s.title}</strong>
                    <span className="tag" data-energy={s.energy}>{labelFor(ENERGIES, s.energy)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={styles.invite} aria-labelledby="invite">
          <div>
            <h2 id="invite">Know one we haven&rsquo;t got?</h2>
            <p>
              Every group has a song that only comes out after dark. Sign in, write it down, and our youth review team
              will have a look. If it&rsquo;s a goer, everyone gets to sing it.
            </p>
          </div>
          <Link href="/submit" className="btn">Add a song</Link>
        </section>
      </div>
    </>
  );
}
