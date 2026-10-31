"use client";

import { useActionState } from "react";
import { ErrorSummary, Honeypot, TextArea, TextField } from "@/components/forms/fields";
import { Turnstile } from "@/components/forms/Turnstile";
import { str, type FormState } from "@/lib/forms";
import { sendContact } from "./actions";

export function ContactForm({ siteKey }: { siteKey: string }) {
  const [s, action, pending] = useActionState<FormState, FormData>(sendContact, {});
  const v = s.values ?? {};
  return (
    <form action={action} noValidate key={s.attempt ?? 0}>
      <ErrorSummary errors={s.errors} message={s.message} labels={{ name: "Name", email: "Email", message: "Message" }} />
      <Honeypot />
      <TextField name="name" label="Your name" optional autoComplete="given-name" maxLength={80} defaultValue={str(v.name)} errors={s.errors} />
      <TextField name="email" type="email" label="Your email" hint="So we can write back. Nothing else." autoComplete="email" maxLength={254} defaultValue={str(v.email)} errors={s.errors} />
      <TextArea name="message" label="Message" rows={6} maxLength={4000} defaultValue={str(v.message)} errors={s.errors} />
      <Turnstile siteKey={siteKey} resetKey={s.attempt} />
      <div style={{ marginTop: "var(--space-3)" }}>
        <button className="btn" type="submit" disabled={pending}>{pending ? "Sending…" : "Send"}</button>
      </div>
    </form>
  );
}
