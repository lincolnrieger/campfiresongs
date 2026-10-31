import type { Metadata } from "next";
import Link from "next/link";
import { confirmSubmission } from "../actions";

export const metadata: Metadata = { title: "Confirm your song", robots: { index: false } };

export default async function Confirm({ searchParams }: { searchParams: Promise<{ token?: string; status?: string }> }) {
  const { token, status } = await searchParams;
  if (status || !token) {
    return (
      <div className="wrap page">
        <h1>{status === "error" ? "Something went wrong" : "That link has run out"}</h1>
        <p className="lede">
          {status === "error"
            ? "We couldn't confirm your song just now. Please try the link again in a minute."
            : "Confirm links only work once and only for 24 hours. If you've already confirmed, you're all good. Otherwise, you're welcome to send the song in again."}
        </p>
        <p>
          <Link href="/submit">Send a song in</Link>
        </p>
      </div>
    );
  }
  return (
    <div className="wrap page">
      <h1>Was this you?</h1>
      <p className="lede">Press the button to send your song to the review team.</p>
      <form action={confirmSubmission}>
        <input type="hidden" name="token" value={token} />
        <button className="btn" type="submit">
          Yes, send my song in
        </button>
      </form>
      <p style={{ marginTop: "var(--space-4)" }}>
        Didn&rsquo;t send a song? Just close this page and it&rsquo;ll be deleted in a week.
      </p>
    </div>
  );
}
