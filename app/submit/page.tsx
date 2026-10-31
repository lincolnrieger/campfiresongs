import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { SubmitForm } from "./SubmitForm";
import styles from "./submit.module.css";

export const metadata: Metadata = {
  title: "Add a song",
  description: "Send a campfire song in to the review team. No account needed.",
};

export default async function SubmitPage() {
  const user = await getUser();
  return (
    <div className={`wrap page ${styles.layout}`}>
      <div className={styles.intro}>
        <h1>Add a song to the fire</h1>
        <p className="lede">
          Got a song your group loves? Write it down here and our youth review team will have a look. If it&rsquo;s a
          goer, it goes in the bank for everyone.
        </p>
        <ul className={styles.tips}>
          <li>Type the words the way you&rsquo;d sing them. Line breaks are kept.</li>
          <li>Chords are handy but not needed. &ldquo;Sung to the tune of&hellip;&rdquo; works too.</li>
          <li>Only send songs that are traditional, that you wrote, or that you have permission to share.</li>
          <li>Keep it suitable for Joeys right up to Rovers.</li>
        </ul>
        {user ? (
          <p className={styles.who}>
            You&rsquo;re signed in, so this will skip the email check and show up under{" "}
            <Link href="/account/submissions">your submissions</Link>.
          </p>
        ) : (
          <p className={styles.who}>
            No account needed. We&rsquo;ll email you a link to confirm it was you.{" "}
            <Link href="/login?next=/submit">Sign in</Link> if you&rsquo;d rather skip that.
          </p>
        )}
      </div>
      <SubmitForm signedIn={!!user} siteKey={getEnv().TURNSTILE_SITE_KEY} defaultCredit={user?.show_name ? (user.display_name ?? "") : ""} />
    </div>
  );
}
