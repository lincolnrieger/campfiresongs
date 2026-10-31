import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/auth/forms";
import styles from "@/components/auth/auth.module.css";
import { getEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Make an account" };

export default function SignUp() {
  return (
    <div className={`wrap page ${styles.split}`}>
      <div>
        <h1>Make an account</h1>
        <p className="lede">You don&rsquo;t need one to sing or to send in songs. It&rsquo;s just for saving favourites and keeping track of what you&rsquo;ve sent.</p>
        <SignUpForm siteKey={getEnv().TURNSTILE_SITE_KEY} />
      </div>
      <aside className={styles.aside}>
        <h2>What we keep</h2>
        <p>Your email, a scrambled version of your password, and a display name if you give one. That&rsquo;s it.</p>
        <p>No profiles, no messages, nothing anyone else can see except the name on songs you send in.</p>
        <p>
          You can delete your account and everything in it whenever you like. <Link href="/privacy">More about privacy</Link>.
        </p>
        <p>
          Already got one? <Link href="/login">Sign in</Link>.
        </p>
      </aside>
    </div>
  );
}
