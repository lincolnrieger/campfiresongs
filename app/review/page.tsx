import type { Metadata } from "next";
import Link from "next/link";
import { reviewerOnly } from "@/lib/auth/guards";
import { listQueue, listRecentDecisions } from "@/lib/data/submissions";
import { db } from "@/lib/env";
import styles from "./review.module.css";

export const metadata: Metadata = { title: "Review queue", robots: { index: false } };

const ago = (t: number) => {
  const d = Math.floor((Date.now() - t) / 86400_000);
  return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};

export default async function Review({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const actor = await reviewerOnly("/review");
  const sp = await searchParams;
  const [queue, recent] = await Promise.all([listQueue(db(), actor), listRecentDecisions(db(), actor, 15)]);
  return (
    <div className={`wrap page ${styles.layout}`}>
      <div>
        <h1>Review queue</h1>
        {sp.done && (
          <p className="notice" role="status">
            {sp.done === "approved" ? "Approved and in the bank. We've emailed the person who sent it." : "Done. We've let them know, with your note."}
          </p>
        )}
        {queue.length === 0 ? (
          <p className="lede">The queue&rsquo;s empty. Time to put the billy on.</p>
        ) : (
          <>
            <p className="lede">{queue.length} song{queue.length === 1 ? "" : "s"} waiting, oldest first.</p>
            <ol className={styles.queue}>
              {queue.map((s) => (
                <li key={s.id}>
                  <Link href={`/review/${s.id}`}>{s.title}</Link>
                  <span>
                    sent {ago(s.created_at)} · {s.user_id ? "account" : "no account"}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
      <aside className={styles.side}>
        <h2>Lately</h2>
        {recent.length === 0 ? (
          <p className={styles.muted}>Nothing reviewed yet.</p>
        ) : (
          <ul>
            {recent.map((s) => (
              <li key={s.id}>
                <span data-status={s.status}>{s.status === "approved" ? "In" : "Not in"}</span> {s.title}
              </li>
            ))}
          </ul>
        )}
        <p><Link href="/review/log">Full activity log</Link></p>
        <h2>Checklist</h2>
        <ul className={styles.check}>
          <li>Right for all ages? Nothing rude, mean or scary for little ones.</li>
          <li>Okay to share? Traditional, written by them, or they have permission. Modern pop songs usually aren&rsquo;t.</li>
          <li>Not already in the bank under another name?</li>
          <li>No personal details in the words, notes or credit.</li>
          <li>Typos? Use &ldquo;Fix and approve&rdquo;.</li>
        </ul>
      </aside>
    </div>
  );
}
