"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ErrorSummary, ErrorText, Honeypot } from "@/components/forms/fields";
import { SongFields } from "@/components/forms/SongFields";
import { Turnstile } from "@/components/forms/Turnstile";
import type { FormState } from "@/lib/forms";
import { submitSong } from "./actions";
import styles from "./submit.module.css";

export const LABELS: Record<string, string> = {
  title: "Song title",
  lyrics: "Words",
  chords: "Chords",
  actions: "Actions",
  mediaUrl: "Link",
  categories: "Kind of song",
  sections: "Who it's for",
  energy: "Energy",
  origin: "Where it's from",
  creditName: "Name to show",
  notes: "Note",
  copyright: "Permission",
};

function Send() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Sending…" : "Send it in"}
    </button>
  );
}

export function SubmitForm({ siteKey, defaultCredit }: { siteKey: string; defaultCredit: string }) {
  const [state, action] = useActionState<FormState, FormData>(submitSong, {});
  const v = state.values ?? {};
  const e = state.errors;
  return (
    <form action={action} className={`card ${styles.form}`} noValidate key={state.attempt ?? 0}>
      <ErrorSummary errors={e} message={state.message} labels={LABELS} />
      <Honeypot />
      <SongFields values={v} errors={e} defaultCredit={defaultCredit} />
      <div className="field">
        <label className="check" htmlFor="copyright">
          <input
            id="copyright"
            type="checkbox"
            name="copyright"
            value="yes"
            defaultChecked={v.copyright === "yes"}
            aria-invalid={e?.copyright ? true : undefined}
            aria-describedby={e?.copyright ? "copyright-error" : undefined}
          />
          <span>It&rsquo;s traditional, I wrote it, or I have permission to share it.</span>
        </label>
        <ErrorText name="copyright" errors={e} />
      </div>
      <Turnstile siteKey={siteKey} resetKey={state.attempt} />
      <Send />
    </form>
  );
}
