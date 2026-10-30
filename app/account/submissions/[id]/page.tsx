import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { getMySubmission } from "@/lib/data/submissions";
import { db } from "@/lib/env";
import { EditForm } from "./EditForm";

export const metadata: Metadata = { title: "Edit your song", robots: { index: false } };

export default async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/login?next=/account/submissions");
  const { id } = await params;
  const s = await getMySubmission(db(), actor, id).catch(() => null);
  if (!s) notFound();
  return (
    <div className="wrap page">
      <p><Link href="/account/submissions">Songs you&rsquo;ve sent in</Link></p>
      <h1>Edit &ldquo;{s.title}&rdquo;</h1>
      {s.status === "pending" ? (
        <EditForm submission={s} />
      ) : (
        <p className="lede">This one&rsquo;s already been reviewed, so it can&rsquo;t be changed now.</p>
      )}
    </div>
  );
}
