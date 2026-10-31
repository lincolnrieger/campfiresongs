"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ErrorSummary, ErrorText, Honeypot, TextField } from "@/components/forms/fields";
import { SongFields } from "@/components/forms/SongFields";
import { Turnstile } from "@/components/forms/Turnstile";
import { str, type FormState } from "@/lib/forms";
import { submitSong } from "./actions";
import styles from "./submit.module.css";

export const LABELS: Record<string, string> = {
  title: "Song title",
  lyrics: "Words",
  chords: "Chords",
  actions: "Actions",
  mediaUrl: "Link",
  categories: "Type of song",
  sections: "Suitable for",
  energy: "Energy",
  origin: "Where it's from",
  creditName: "Your name",
  notes: "Notes",
  email: "Email",
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

export function SubmitForm({ signedIn, siteKey, defaultCredit }: { signedIn: boolean; siteKey: string; defaultCredit: string }) {
  const [state, action] = useActionState<FormState, FormData>(submitSong, {});
  const v = state.values ?? {};
  const e = state.errors;
  return (
    <form action={action} className={styles.form} noValidate key={state.attempt ?? 0}>
      <ErrorSummary errors={e} message={state.message} labels={LABELS} />
      <Honeypot />

      <SongFields values={v} errors={e} defaultCredit={defaultCredit} groupClass={styles.group} lyricsClass={styles.lyrics} />

      <section className={styles.group} aria-labelledby="g-you">
        <h2 id="g-you">Nearly done</h2>
        {!signedIn && (
          <TextField
            name="email"
            type="email"
            label="Your email"
            hint="We only use it to send you emails about this song. It's never shown to anyone, and we delete it 30 days after the review."
            required
            autoComplete="email"
            maxLength={254}
            defaultValue={str(v.email)}
            errors={e}
          />
        )}
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
            <span>This song is traditional or public domain, I wrote it, or I have permission to share it.</span>
          </label>
          <ErrorText name="copyright" errors={e} />
        </div>
        <Turnstile siteKey={siteKey} resetKey={state.attempt} />
        <Send />
      </section>
    </form>
  );
}
