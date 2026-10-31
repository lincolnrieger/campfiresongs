import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { logOut } from "@/lib/auth/actions";
import { getUser, toActor } from "@/lib/auth/session";
import { ENERGIES, labelFor } from "@/lib/constants";
import { listFavourites } from "@/lib/data/favourites";
import { db } from "@/lib/env";
import { removeAccount } from "./actions";
import { ProfileForm } from "./ProfileForm";
import styles from "./account.module.css";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function Account({ searchParams }: { searchParams: Promise<{ welcome?: string; reset?: string; confirm?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/account");
  const sp = await searchParams;
  const saved = await listFavourites(db(), toActor(user));
  return (
    <div className={`wrap page ${styles.layout}`}>
      <div className={styles.main}>
        <h1>{user.display_name ? `Hi, ${user.display_name}` : "My account"}</h1>
        {sp.welcome && <p className="notice" role="status">You&rsquo;re all set up. Welcome to the fire.</p>}
        {sp.reset && <p className="notice" role="status">Password changed. You&rsquo;ve been signed out everywhere else.</p>}

        <section aria-labelledby="saved">
          <h2 id="saved"><Icon name="star" size={28} className={styles.icon} /> Saved songs</h2>
          {saved.length === 0 ? (
            <p className={styles.empty}>
              Nothing saved yet. Press <strong>Save</strong> on any song and it&rsquo;ll show up here.{" "}
              <Link href="/songs">Have a look through the bank.</Link>
            </p>
          ) : (
            <ul className={`song-list ${styles.list}`}>
              {saved.map((s) => (
                <li key={s.id}>
                  <Link href={`/songs/${s.slug}`}>
                    <strong>{s.title}</strong>
                    <span className="tag" data-energy={s.energy}>{labelFor(ENERGIES, s.energy)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className={styles.subs}>
          <Link href="/account/submissions" className="btn btn-coal">
            <Icon name="note" size={20} /> Songs you&rsquo;ve sent in
          </Link>
        </p>
      </div>

      <aside className={styles.side}>
        <section aria-labelledby="you" className="card">
          <h2 id="you">Your details</h2>
          <p className={styles.email}>Signed in as <strong>{user.email}</strong></p>
          <ProfileForm displayName={user.display_name ?? ""} showName={!!user.show_name} />
          <form action={logOut}>
            <button className="btn btn-coal btn-small" type="submit">Sign out</button>
          </form>
        </section>

        <section aria-labelledby="delete-h" id="delete" className={`card ${styles.danger}`}>
          <h2 id="delete-h">Delete your account</h2>
          <p>
            This deletes your account, your saved songs and any songs still waiting for review. Songs already in the bank
            stay there for everyone, but your name comes off them. You can&rsquo;t undo it.
          </p>
          <form action={removeAccount}>
            <div className="field">
              <label htmlFor="confirm">Type <strong>delete</strong> to confirm</label>
              <input id="confirm" name="confirm" type="text" autoComplete="off" aria-invalid={sp.confirm ? true : undefined} aria-describedby={sp.confirm ? "confirm-error" : undefined} />
              {sp.confirm && <p className="error" id="confirm-error" role="alert">Type the word delete to confirm.</p>}
            </div>
            <button className="btn btn-danger btn-small" type="submit">Delete my account</button>
          </form>
        </section>
      </aside>
    </div>
  );
}
