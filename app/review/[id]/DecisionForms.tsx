"use client";

import { useActionState } from "react";
import { ErrorSummary, TextArea } from "@/components/forms/fields";
import { SongFields } from "@/components/forms/SongFields";
import { Icon } from "@/components/ui/Icon";
import type { Submission } from "@/lib/data/submissions";
import { str, submissionToValues, type FormState } from "@/lib/forms";
import { LABELS } from "@/app/submit/SubmitForm";
import { decide } from "../actions";
import styles from "../review.module.css";

export function DecisionForms({ submission }: { submission: Submission }) {
  const [s, action, pending] = useActionState<FormState, FormData>(decide, {});
  const [s2, editAction, pending2] = useActionState<FormState, FormData>(decide, {});
  return (
    <>
      <form action={action} className={styles.decide} noValidate key={`a${s.attempt ?? 0}`}>
        <h2>Your call</h2>
        <ErrorSummary errors={s.errors} message={s.message} labels={{ note: "Note" }} />
        <input type="hidden" name="id" value={submission.id} />
        <TextArea
          name="note"
          label="Note to the person who sent it"
          hint="Needed if you say no. Be kind and say what would fix it. They'll see this in an email."
          rows={4}
          maxLength={1500}
          defaultValue={str(s.values?.note)}
          errors={s.errors}
        />
        <div className={styles.buttons}>
          <button className="btn" type="submit" name="decision" value="approve" disabled={pending}>
            <Icon name="tick" size={20} /> Approve
          </button>
          <button className="btn btn-danger" type="submit" name="decision" value="reject" disabled={pending}>
            <Icon name="close" size={20} /> Not this time
          </button>
        </div>
      </form>

      <details className={`${styles.decide} ${styles.editor}`} open={!!s2.attempt}>
        <summary>Fix and approve</summary>
        <p className="hint">Tidy up typos or formatting, then approve. The original stays in the activity log.</p>
        <form action={editAction} noValidate key={`e${s2.attempt ?? 0}`}>
          <ErrorSummary errors={s2.errors} message={s2.message} labels={LABELS} />
          <input type="hidden" name="id" value={submission.id} />
          <input type="hidden" name="decision" value="edit" />
          <SongFields values={s2.values ?? submissionToValues(submission)} errors={s2.errors} withNotes={false} />
          <TextArea name="note" label="Note to the person who sent it" optional rows={3} maxLength={1500} defaultValue={str(s2.values?.note)} errors={s2.errors} />
          <button className="btn" type="submit" disabled={pending2}>
            <Icon name="tick" size={20} /> Save fixes and approve
          </button>
        </form>
      </details>
    </>
  );
}
