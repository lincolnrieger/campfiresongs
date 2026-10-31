import type { Metadata } from "next";
import Link from "next/link";
import { Flame } from "@/components/ui/Flame";
import { getUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { SubmitForm } from "./SubmitForm";
import styles from "./submit.module.css";

export const metadata: Metadata = {
  title: "Add a song",
  description: "Send a campfire song to the review team.",
};

export default async function SubmitPage() {
  const user = await getUser();
  return (
    <div className={`wrap page ${styles.layout}`}>
      <h1>Add a song</h1>
      {user ? (
        <>
          <p className="lede">
            Write it the way you&rsquo;d sing it. Our youth review team will check it, and we&rsquo;ll email you when
            it&rsquo;s in.
          </p>
          <SubmitForm siteKey={getEnv().TURNSTILE_SITE_KEY} defaultCredit={user.show_name ? (user.display_name ?? "") : ""} />
        </>
      ) : (
        <div className={`card ${styles.gate}`}>
          <Flame size={48} />
          <h2>Sign in to add a song</h2>
          <p>
            You need an account to send in songs, so you can keep track of them and we can let you know when
            they&rsquo;re in. It only takes a minute.
          </p>
          <p className={styles.gateButtons}>
            <Link className="btn" href="/signup?next=/submit">Make an account</Link>
            <Link className="btn btn-coal" href="/login?next=/submit">Sign in</Link>
          </p>
        </div>
      )}
    </div>
  );
}
