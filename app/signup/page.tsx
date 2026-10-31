import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/auth/forms";
import styles from "@/components/auth/auth.module.css";
import { safeNext } from "@/lib/auth/next";
import { getEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Make an account" };

export default async function SignUp({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, "/account?welcome=1");
  return (
    <div className={`wrap page ${styles.split}`}>
      <div className="card">
        <h1>Make an account</h1>
        <p className="lede">You need one to add songs. It also lets you save your favourites and keep track of what you&rsquo;ve sent in.</p>
        <SignUpForm siteKey={getEnv().TURNSTILE_SITE_KEY} next={next} />
      </div>
      <aside className={`card ${styles.aside}`}>
        <h2>What we keep</h2>
        <p>Your email, a scrambled version of your password, and a display name if you give one. That&rsquo;s it.</p>
        <p>No profiles, no messages, nothing anyone else can see except the name on songs you send in.</p>
        <p>
          You can delete your account and everything in it whenever you like. <Link href="/privacy">More about privacy</Link>.
        </p>
        <p>
          Already got one? <Link href={next.startsWith("/account") ? "/login" : `/login?next=${encodeURIComponent(next)}`}>Sign in</Link>.
        </p>
      </aside>
    </div>
  );
}
