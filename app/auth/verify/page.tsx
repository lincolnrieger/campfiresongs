import type { Metadata } from "next";
import Link from "next/link";
import { confirmEmail } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };

export default async function Verify({ searchParams }: { searchParams: Promise<{ token?: string; status?: string }> }) {
  const { token, status } = await searchParams;
  if (!token || status) {
    return (
      <div className="wrap page">
        <h1>That link has run out</h1>
        <p className="lede">Confirm links work once, for 24 hours. Try signing in: if the password&rsquo;s right, we&rsquo;ll send a fresh link.</p>
        <p><Link href="/login">Sign in</Link></p>
      </div>
    );
  }
  return (
    <div className="wrap page">
      <h1>Nearly there</h1>
      <p className="lede">Press the button to confirm your email and finish making your account.</p>
      <form action={confirmEmail}>
        <input type="hidden" name="token" value={token} />
        <button className="btn" type="submit">Confirm my email</button>
      </form>
    </div>
  );
}
