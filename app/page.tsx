import Link from "next/link";
import { SparkLink } from "@/components/home/SparkLink";
import { Fire } from "@/components/fire/Fire";
import { Icon } from "@/components/ui/Icon";
import { ENERGIES, labelFor } from "@/lib/constants";
import { countPublished, latestSongs } from "@/lib/data/songs";
import { db } from "@/lib/env";
import styles from "./home.module.css";

export default async function Home() {
  const [songs, count] = await Promise.all([latestSongs(db(), 5), countPublished(db())]);
  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        <Fire
          className={styles.fireBox}
          anchor={{ x: 0.7, y: 0.84, scale: 0.42 }}
          anchorNarrow={{ x: 0.5, y: 0.9, scale: 0.3 }}
        />
        <div className={`wrap ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <h1 id="hero-title">
              Songs for <em>around</em> the fire.
            </h1>
            <p className={styles.lede}>
              Every group has a song that only comes out after dark. This is where we keep them: words, chords and
              actions, checked by young people, free for anyone.
            </p>
            <form action="/songs" method="get" role="search" className={styles.search}>
              <label htmlFor="hero-q">What are we singing tonight?</label>
              <div className={styles.searchRow}>
                <input id="hero-q" name="q" type="search" placeholder="Try “bear” or “goolie”" autoComplete="off" />
                <button className="btn" type="submit">
                  <Icon name="search" size={20} /> Find it
                </button>
              </div>
            </form>
            <p className={styles.add}>
              Know one we haven&rsquo;t got?{" "}
              <SparkLink href="/submit">Add it to the fire</SparkLink>
            </p>
          </div>
        </div>
        <p className={styles.tapHint} aria-hidden="true">
          psst, tap the fire
        </p>
      </section>

      <section className={`wrap ${styles.lower}`}>
        <div className={styles.setlist}>
          <h2>
            <Icon name="note" size={30} className={styles.h2icon} /> Fresh on the fire
          </h2>
          {songs.length === 0 ? (
            <p className={styles.empty}>
              The fire&rsquo;s only just been lit, so the bank is empty for now.{" "}
              <Link href="/submit">Be the first to add a song.</Link>
            </p>
          ) : (
            <>
              <ol className={styles.list}>
                {songs.map((s) => (
                  <li key={s.id}>
                    <Link href={`/songs/${s.slug}`}>{s.title}</Link>
                    <span className={styles.energy} data-energy={s.energy}>
                      {labelFor(ENERGIES, s.energy)}
                    </span>
                  </li>
                ))}
              </ol>
              <p>
                <Link href="/songs" className={styles.all}>
                  All {count} song{count === 1 ? "" : "s"} in the bank <Icon name="arrow" size={18} />
                </Link>
              </p>
            </>
          )}
        </div>

        <div className={styles.trail}>
          <h2>How a song gets in</h2>
          <ol>
            <li>
              <Icon name="pencil" size={30} />
              <div>
                <h3>You send it in</h3>
                <p>Words, chords if you know them, and how to lead it. No account needed.</p>
              </div>
            </li>
            <li>
              <Icon name="tent" size={30} />
              <div>
                <h3>The review team checks it</h3>
                <p>A small crew of young people make sure it&rsquo;s right for all ages and okay to share.</p>
              </div>
            </li>
            <li>
              <Icon name="star" size={30} />
              <div>
                <h3>It goes in the bank</h3>
                <p>Then anyone, anywhere, can sing it at their next campfire. We&rsquo;ll email you when it&rsquo;s in.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </>
  );
}
