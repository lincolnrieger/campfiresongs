import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { listMySubmissions, type SubmissionStatus } from "@/lib/data/submissions";
import { db } from "@/lib/env";
import { removeSubmission } from "../actions";
import styles from "./subs.module.css";

export const metadata: Metadata = { title: "Songs you've sent in", robots: { index: false } };

const STATUS: Record<SubmissionStatus, string> = {
  unconfirmed: "Waiting for you to confirm",
  pending: "With the reviewers",
  approved: "In the bank",
  rejected: "Not this time",
};

const date = (t: number) => new Date(t).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

export default async function MySubmissions({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string; error?: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/login?next=/account/submissions");
  const sp = await searchParams;
  const subs = await listMySubmissions(db(), actor);
  return (
    <div className="wrap page">
      <p><Link href="/account">Your stuff</Link></p>
      <h1>Songs you&rsquo;ve sent in</h1>
      {sp.saved && <p className="notice" role="status">Changes saved.</p>}
      {sp.deleted && <p className="notice" role="status">Deleted.</p>}
      {sp.error && <p className="notice notice-error" role="alert">That one couldn&rsquo;t be deleted. It may have just been reviewed.</p>}
      {subs.length === 0 ? (
        <p className="lede">
          Nothing yet. <Link href="/submit">Send in a song</Link> and you can follow it here.
        </p>
      ) : (
        <ul className={styles.list}>
          {subs.map((s) => (
            <li key={s.id} className={styles.item}>
              <div>
                <h2 className={styles.title}>{s.title}</h2>
                <p className={styles.meta}>
                  <span className={styles.status} data-status={s.status}>{STATUS[s.status]}</span> · sent {date(s.created_at)}
                </p>
                {s.review_note && (
                  <p className={styles.note}>
                    <strong>Note from the reviewer:</strong> {s.review_note}
                  </p>
                )}
              </div>
              <div className={styles.actions}>
                {s.status === "approved" && s.song_id && (
                  <Link className="btn btn-coal btn-small" href="/songs">See it in the bank</Link>
                )}
                {s.status === "pending" && (
                  <>
                    <Link className="btn btn-coal btn-small" href={`/account/submissions/${s.id}`}>Edit</Link>
                    <form action={removeSubmission}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="btn btn-danger btn-small" type="submit" aria-label={`Delete ${s.title}`}>Delete</button>
                    </form>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
