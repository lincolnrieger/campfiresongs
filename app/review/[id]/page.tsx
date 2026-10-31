import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { reviewerOnly } from "@/lib/auth/guards";
import { CATEGORIES, ENERGIES, SECTIONS, labelFor } from "@/lib/constants";
import { getForReview } from "@/lib/data/submissions";
import { db } from "@/lib/env";
import { parseMediaUrl, PROVIDER_LABEL } from "@/lib/media";
import styles from "../review.module.css";
import { DecisionForms } from "./DecisionForms";

export const metadata: Metadata = { title: "Review a song", robots: { index: false } };

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={value ? undefined : styles.empty}>{value || "Not given"}</dd>
    </div>
  );
}

export default async function ReviewOne({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await reviewerOnly(`/review/${id}`);
  const s = await getForReview(db(), actor, id).catch(() => null);
  if (!s) notFound();
  const media = s.media_url ? parseMediaUrl(s.media_url) : null;
  return (
    <div className={`wrap page ${styles.layout}`}>
      <div>
        <p><Link href="/review">Back to the queue</Link></p>
        <h1>{s.title}</h1>
        <dl className={`card ${styles.fields}`}>
          <div>
            <dt>Words</dt>
            <dd className={styles.lyrics}>{s.lyrics}</dd>
          </div>
          <Row label="Chords / tune" value={s.chords} />
          <Row label="Actions and how to lead it" value={s.actions} />
          <Row label="Recording" value={s.media_url ? `${s.media_url}${media ? ` (${PROVIDER_LABEL[media.provider]})` : ""}` : null} />
          <Row label="Type" value={s.categories.map((c) => labelFor(CATEGORIES, c)).join(", ")} />
          <Row label="Suitable for" value={s.sections.map((c) => labelFor(SECTIONS, c)).join(", ")} />
          <Row label="Energy" value={labelFor(ENERGIES, s.energy)} />
          <Row label="Where it's from" value={s.origin} />
          <Row label="Name to show" value={s.credit_name} />
          <Row label="Notes for reviewers" value={s.notes} />
          <Row label="Sent" value={`${new Date(s.created_at).toLocaleString("en-AU")}`} />
        </dl>
      </div>
      <div>
        {s.status === "pending" ? (
          // Strip the email: reviewers never see who sent it, even in the page source.
          <DecisionForms submission={{ ...s, email: null, user_id: null }} />
        ) : (
          <p className="notice">This one has already been {s.status === "approved" ? "approved" : "turned down"}.</p>
        )}
      </div>
    </div>
  );
}
