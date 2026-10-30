import type { Metadata } from "next";
import { getEnv } from "@/lib/env";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = { title: "Contact" };

export default async function Contact({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  return (
    <div className="wrap page" style={{ maxWidth: "44rem", marginInline: "auto" }}>
      <h1>Get in touch</h1>
      {sent ? (
        <p className="lede" role="status">Thanks, that&rsquo;s on its way. We&rsquo;ll get back to you as soon as we can.</p>
      ) : (
        <>
          <p className="lede">
            Questions, ideas, keen to join the review team, or want something taken down? Drop us a line.
          </p>
          <p>
            If it&rsquo;s about one song, the &ldquo;Report a problem&rdquo; link on that song is quickest.
          </p>
          <ContactForm siteKey={getEnv().TURNSTILE_SITE_KEY} />
        </>
      )}
    </div>
  );
}
