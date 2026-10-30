import type { Metadata } from "next";

export const metadata: Metadata = { title: "Check your email", robots: { index: false } };

export default function Check() {
  return (
    <div className="wrap page">
      <h1>Check your email</h1>
      <p className="lede">
        We&rsquo;ve sent you an email. Click the link in it to finish setting up. It runs out in 24 hours.
      </p>
      <p>Nothing there? Look in your junk folder. If you already have an account, the email will tell you how to sign in.</p>
    </div>
  );
}
