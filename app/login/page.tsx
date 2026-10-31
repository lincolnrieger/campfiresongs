import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm, MagicForm } from "@/components/auth/forms";
import styles from "@/components/auth/auth.module.css";
import { safeNext } from "@/lib/auth/next";

export const metadata: Metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; link?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  return (
    <div className={`wrap page ${styles.split}`}>
      <div>
        <h1>Sign in</h1>
        {sp.link === "expired" && (
          <p className="notice notice-error" role="alert">That sign-in link has run out or been used. Ask for a new one.</p>
        )}
        <LoginForm next={next} />
        <p style={{ marginTop: "var(--space-4)" }}>
          New here? <Link href="/signup">Make an account</Link>.
        </p>
      </div>
      <aside className={styles.aside}>
        <h2>No password? No worries.</h2>
        <p>We can email you a link that signs you straight in.</p>
        <MagicForm next={next} />
      </aside>
    </div>
  );
}
