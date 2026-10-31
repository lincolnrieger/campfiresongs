"use client";

import { useActionState } from "react";
import { ErrorSummary } from "@/components/forms/fields";
import { SongFields } from "@/components/forms/SongFields";
import { submissionToValues, type FormState } from "@/lib/forms";
import type { Submission } from "@/lib/data/submissions";
import { LABELS } from "@/app/submit/SubmitForm";
import styles from "@/app/submit/submit.module.css";
import { editSubmission } from "../../actions";

export function EditForm({ submission }: { submission: Submission }) {
  const [s, action, pending] = useActionState<FormState, FormData>(editSubmission, {});
  const v = s.values ?? submissionToValues(submission);
  return (
    <form action={action} noValidate key={s.attempt ?? 0} className={styles.form} style={{ maxWidth: "48rem" }}>
      <ErrorSummary errors={s.errors} message={s.message} labels={LABELS} />
      <input type="hidden" name="id" value={submission.id} />
      <SongFields values={v} errors={s.errors} groupClass={styles.group} lyricsClass={styles.lyrics} />
      <button className="btn" type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
    </form>
  );
}
