import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CampfireMode } from "@/components/songs/CampfireMode";
import { Icon } from "@/components/ui/Icon";
import { getActor } from "@/lib/auth/session";
import { CATEGORIES, ENERGIES, SECTIONS, labelFor } from "@/lib/constants";
import { isFavourite } from "@/lib/data/favourites";
import { getPublishedSong } from "@/lib/data/songs";
import { db } from "@/lib/env";
import { embedUrl, PROVIDER_LABEL } from "@/lib/media";
import { toggleFavourite } from "./actions";
import styles from "./song.module.css";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ saved?: string; reported?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const song = await getPublishedSong(db(), (await params).slug);
  if (!song) return { title: "Song not found" };
  return { title: song.title, description: song.lyrics.split("\n").slice(0, 2).join(" / ").slice(0, 150) };
}

export default async function SongPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const song = await getPublishedSong(db(), slug);
  if (!song) notFound();
  const actor = await getActor();
  const saved = await isFavourite(db(), actor, song.id);
  const embed = song.media_provider && song.media_id ? embedUrl({ provider: song.media_provider, id: song.media_id }) : null;

  const isVideo = song.media_provider === "youtube" || song.media_provider === "vimeo";
  return (
    <article className="wrap page">
      <header className={styles.head}>
        <p className={styles.crumb}>
          <Link href="/songs">&larr; All songs</Link>
        </p>
        <h1>{song.title}</h1>
        <ul className={styles.tags} aria-label="About this song">
          <li className="tag" data-energy={song.energy}>{labelFor(ENERGIES, song.energy)} energy</li>
          {song.categories.map((c) => <li key={c}>{labelFor(CATEGORIES, c)}</li>)}
          <li>{song.sections.map((s) => labelFor(SECTIONS, s)).join(", ")}</li>
        </ul>
        <div className={styles.tools}>
          <CampfireMode title={song.title} lyrics={song.lyrics} chords={song.chords} />
          {actor ? (
            <form action={toggleFavourite}>
              <input type="hidden" name="slug" value={song.slug} />
              <input type="hidden" name="on" value={saved ? "0" : "1"} />
              <button className="btn btn-coal" type="submit" aria-pressed={saved}>
                <Icon name={saved ? "starFilled" : "star"} size={18} /> {saved ? "Saved" : "Save"}
              </button>
            </form>
          ) : (
            <Link className="btn btn-coal" href={`/login?next=/songs/${song.slug}`}>
              <Icon name="star" size={18} /> Save
            </Link>
          )}
        </div>
        {sp.saved && <p className="notice" role="status">Saved. Find it any time in <Link href="/account">My account</Link>.</p>}
        {sp.reported && <p className="notice" role="status">Thanks for letting us know. We&rsquo;ll have a look.</p>}
      </header>

      <div className={styles.layout}>
        <div className="card">
          <h2 className="visually-hidden">Words</h2>
          <p className={styles.lyrics}>{song.lyrics}</p>
        </div>

        <aside className={styles.side}>
          {song.chords && (
            <section className="card">
              <h2>Chords</h2>
              <p className={styles.pre}>{song.chords}</p>
            </section>
          )}
          {song.actions && (
            <section className="card">
              <h2>How to lead it</h2>
              <p className={styles.pre}>{song.actions}</p>
            </section>
          )}
          {embed && song.media_provider && (
            <section>
              <h2 className="visually-hidden">Listen</h2>
              <div className={`${styles.media} ${isVideo ? styles.video : styles.audio}`}>
                <iframe
                  src={embed}
                  title={`${song.title} on ${PROVIDER_LABEL[song.media_provider]}`}
                  loading="lazy"
                  allow="encrypted-media; picture-in-picture; fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin"
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                />
              </div>
            </section>
          )}
          {(song.origin || song.credit_name) && (
            <section className="card">
              <h2>Where it&rsquo;s from</h2>
              {song.origin && <p className={styles.pre}>{song.origin}</p>}
              {song.credit_name && <p className={styles.credit}>Sent in by {song.credit_name}</p>}
            </section>
          )}
          <p className={styles.report}>
            <Link href={`/songs/${song.slug}/report`}>Report a problem with this song</Link>
          </p>
        </aside>
      </div>
    </article>
  );
}
