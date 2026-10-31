"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ChoiceGroup, ErrorSummary, Honeypot, TextArea } from "@/components/forms/fields";
import { Turnstile } from "@/components/forms/Turnstile";
import { REPORT_REASONS } from "@/lib/constants";
import { str, type FormState } from "@/lib/forms";
import { reportSong } from "../actions";

function Send() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Sending…" : "Send report"}
    </button>
  );
}

export function ReportForm({ slug, siteKey }: { slug: string; siteKey: string }) {
  const [state, action] = useActionState<FormState, FormData>(reportSong, {});
  const v = state.values ?? {};
  return (
    <form action={action} noValidate key={state.attempt ?? 0}>
      <ErrorSummary errors={state.errors} message={state.message} labels={{ reason: "Reason", message: "Details" }} />
      <Honeypot />
      <input type="hidden" name="slug" value={slug} />
      <ChoiceGroup type="radio" name="reason" label="What's the problem?" options={REPORT_REASONS} defaultValue={str(v.reason)} errors={state.errors} />
      <TextArea
        name="message"
        label="Tell us more"
        hint="Which bit is wrong, or who owns the song. Please don't include anyone's personal details."
        rows={5}
        maxLength={2000}
        defaultValue={str(v.message)}
        errors={state.errors}
      />
      <Turnstile siteKey={siteKey} resetKey={state.attempt} />
      <div style={{ marginTop: "var(--space-3)" }}>
        <Send />
      </div>
    </form>
  );
}
