import type { Metadata } from "next";
import { redeemMagicLink } from "@/lib/auth/actions";
import { safeNext } from "@/lib/auth/next";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Magic({ searchParams }: { searchParams: Promise<{ token?: string; next?: string }> }) {
  const { token, next } = await searchParams;
  return (
    <div className="wrap page">
      <h1>Sign in</h1>
      <p className="lede">Press the button to sign in.</p>
      <form action={redeemMagicLink}>
        <input type="hidden" name="token" value={token ?? ""} />
        <input type="hidden" name="next" value={safeNext(next)} />
        <button className="btn" type="submit">Sign me in</button>
      </form>
    </div>
  );
}
