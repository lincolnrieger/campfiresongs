import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/forms";
import styles from "@/components/auth/auth.module.css";
import { safeNext } from "@/lib/auth/next";

export const metadata: Metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  return (
    <div className={`wrap page ${styles.narrow}`}>
      <div className="card">
        <h1>Sign in</h1>
        <LoginForm next={next} />
        <p style={{ marginTop: "var(--space-4)", marginBottom: 0 }}>
          New here? <Link href={next === "/account" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`}>Make an account</Link>.
        </p>
      </div>
    </div>
  );
}
