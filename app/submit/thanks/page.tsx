import type { Metadata } from "next";
import Link from "next/link";
import { Flame } from "@/components/ui/Flame";

export const metadata: Metadata = { title: "Thanks", robots: { index: false } };

export default async function Thanks({ searchParams }: { searchParams: Promise<{ check?: string; confirmed?: string }> }) {
  const sp = await searchParams;
  const check = sp.check === "email";
  return (
    <div className="wrap page" style={{ maxWidth: "44rem" }}>
      <Flame size={56} />
      <h1>{check ? "Nearly there. Check your email." : "Thanks! Your song's on its way."}</h1>
      {check ? (
        <>
          <p className="lede">
            We&rsquo;ve sent you an email with a link. Click it and press the button to send your song to the review
            team. The link runs out in 24 hours.
          </p>
          <p>Can&rsquo;t see it? Have a look in your junk or spam folder. It comes from our noreply address.</p>
        </>
      ) : (
        <>
          <p className="lede">
            {sp.confirmed
              ? "Thanks for confirming. Your song is now with the review team."
              : "Your song is now with the review team."}{" "}
            We&rsquo;ll email you once they&rsquo;ve had a look.
          </p>
        </>
      )}
      <p>
        <Link href="/submit">Add another song</Link> or <Link href="/songs">have a look through the bank</Link>.
      </p>
    </div>
  );
}
