import type { Metadata } from "next";
import Link from "next/link";
import { Flame } from "@/components/ui/Flame";

export const metadata: Metadata = { title: "Thanks", robots: { index: false } };

export default function Thanks() {
  return (
    <div className="wrap page" style={{ maxWidth: "40rem", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-3)" }}>
        <Flame size={64} />
      </div>
      <h1>Thanks! It&rsquo;s on its way.</h1>
      <p className="lede" style={{ marginInline: "auto" }}>
        Your song is with the review team now. We&rsquo;ll email you once they&rsquo;ve had a look, and you can check
        on it any time in <Link href="/account/submissions">your songs</Link>.
      </p>
      <p style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", maxWidth: "none" }}>
        <Link className="btn" href="/submit">Add another</Link>
        <Link className="btn btn-coal" href="/songs">Browse songs</Link>
      </p>
    </div>
  );
}
