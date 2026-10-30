"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ErrorSummary, ErrorText, Honeypot, TextField } from "@/components/forms/fields";
import { Turnstile } from "@/components/forms/Turnstile";
import { chooseNewPassword, logIn, requestReset, sendMagicLink, signUp } from "@/lib/auth/actions";
import { str, type FormState } from "@/lib/forms";

function Go({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Hang on…" : children}
    </button>
  );
}

function PasswordField({ errors, label = "Password", autoComplete, hint }: { errors?: Record<string, string>; label?: string; autoComplete: string; hint?: string }) {
  const [show, setShow] = useState(false);
  const err = !!errors?.password;
  return (
    <div className="field">
      <label htmlFor="password">{label}</label>
      {hint && <span className="hint" id="password-hint">{hint}</span>}
      <input
        id="password"
        name="password"
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        maxLength={200}
        aria-invalid={err || undefined}
        aria-describedby={[hint ? "password-hint" : "", err ? "password-error" : ""].filter(Boolean).join(" ") || undefined}
      />
      <label className="check" style={{ marginTop: "var(--space-2)", fontSize: "var(--step--1)" }}>
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password
      </label>
      <ErrorText name="password" errors={errors} />
    </div>
  );
}

const LABELS = { email: "Email", password: "Password", displayName: "Display name", ageOk: "Age" };

export function SignUpForm({ siteKey }: { siteKey: string }) {
  const [s, action] = useActionState<FormState, FormData>(signUp, {});
  const v = s.values ?? {};
  return (
    <form action={action} noValidate key={s.attempt ?? 0}>
      <ErrorSummary errors={s.errors} message={s.message} labels={LABELS} />
      <Honeypot />
      <TextField name="email" type="email" label="Email" autoComplete="email" maxLength={254} defaultValue={str(v.email)} errors={s.errors} />
      <PasswordField errors={s.errors} autoComplete="new-password" hint="At least 10 characters. A few random words strung together works well." />
      <TextField
        name="displayName"
        label="Display name"
        optional
        hint="A first name or nickname. Only shown on songs you send in, and only if you want."
        autoComplete="nickname"
        maxLength={40}
        defaultValue={str(v.displayName)}
        errors={s.errors}
      />
      <div className="field">
        <label className="check" htmlFor="ageOk">
          <input id="ageOk" type="checkbox" name="ageOk" value="yes" defaultChecked={v.ageOk === "yes"} aria-describedby={s.errors?.ageOk ? "ageOk-error" : undefined} />
          <span>I&rsquo;m 15 or older, or a parent, carer or leader has said it&rsquo;s okay for me to sign up.</span>
        </label>
        <ErrorText name="ageOk" errors={s.errors} />
      </div>
      <Turnstile siteKey={siteKey} resetKey={s.attempt} />
      <div style={{ marginTop: "var(--space-3)" }}>
        <Go>Make my account</Go>
      </div>
    </form>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [s, action] = useActionState<FormState, FormData>(logIn, {});
  const v = s.values ?? {};
  return (
    <form action={action} noValidate key={s.attempt ?? 0}>
      <ErrorSummary errors={s.errors} message={s.message} labels={LABELS} />
      <input type="hidden" name="next" value={next} />
      <TextField name="email" type="email" label="Email" autoComplete="email" maxLength={254} defaultValue={str(v.email)} errors={s.errors} />
      <PasswordField errors={s.errors} autoComplete="current-password" />
      <p style={{ fontSize: "var(--step--1)" }}>
        <Link href="/reset">Forgotten your password?</Link>
      </p>
      <Go>Sign in</Go>
    </form>
  );
}

export function MagicForm({ next }: { next: string }) {
  const [s, action] = useActionState<FormState, FormData>(sendMagicLink, {});
  if (s.ok) return <p className="notice" role="status">{s.message}</p>;
  return (
    <form action={action} noValidate key={s.attempt ?? 0}>
      <ErrorSummary errors={s.errors} message={s.message} labels={LABELS} />
      <input type="hidden" name="next" value={next} />
      <TextField name="email" type="email" label="Email" autoComplete="email" maxLength={254} defaultValue={str(s.values?.email)} errors={s.errors} />
      <Go>Email me a link</Go>
    </form>
  );
}

export function ResetRequestForm() {
  const [s, action] = useActionState<FormState, FormData>(requestReset, {});
  if (s.ok) return <p className="notice" role="status">{s.message}</p>;
  return (
    <form action={action} noValidate key={s.attempt ?? 0}>
      <ErrorSummary errors={s.errors} message={s.message} labels={LABELS} />
      <TextField name="email" type="email" label="Email" autoComplete="email" maxLength={254} defaultValue={str(s.values?.email)} errors={s.errors} />
      <Go>Send me a reset link</Go>
    </form>
  );
}

export function NewPasswordForm({ token }: { token: string }) {
  const [s, action] = useActionState<FormState, FormData>(chooseNewPassword, {});
  return (
    <form action={action} noValidate key={s.attempt ?? 0}>
      <ErrorSummary errors={s.errors} message={s.message} labels={LABELS} />
      <input type="hidden" name="token" value={token} />
      <PasswordField errors={s.errors} label="New password" autoComplete="new-password" hint="At least 10 characters." />
      <Go>Save my new password</Go>
    </form>
  );
}
