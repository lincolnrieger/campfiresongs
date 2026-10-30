import type { Metadata } from "next";
import Link from "next/link";
import { NewPasswordForm } from "@/components/auth/forms";
import styles from "@/components/auth/auth.module.css";
import { peekToken } from "@/lib/data/tokens";
import { db } from "@/lib/env";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function NewPassword({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const valid = token ? await peekToken(db(), "reset", token) : false;
  return (
    <div className={`wrap page ${styles.narrow}`}>
      <h1>Choose a new password</h1>
      {valid && token ? (
        <NewPasswordForm token={token} />
      ) : (
        <p className="lede">
          That link has run out or already been used. <Link href="/reset">Ask for a new one</Link>.
        </p>
      )}
    </div>
  );
}
