// Small form building blocks. Every input has a label, a hint if useful, and
// an error that's linked with aria-describedby so screen readers read it out.
import type { ReactNode } from "react";
import type { FieldErrors } from "@/lib/validation";

type Common = {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  optional?: boolean;
  errors?: FieldErrors;
};

const describedBy = (name: string, hint: boolean, err: boolean) =>
  [hint ? `${name}-hint` : "", err ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;

export function ErrorText({ name, errors }: { name: string; errors?: FieldErrors }) {
  const msg = errors?.[name];
  if (!msg) return null;
  return (
    <p className="error" id={`${name}-error`}>
      <span aria-hidden="true">!</span> {msg}
    </p>
  );
}

function Label({ name, label, optional }: { name: string; label: ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={name}>
      {label} {optional && <span className="optional">(optional)</span>}
    </label>
  );
}

export function TextField({
  type = "text",
  defaultValue,
  autoComplete,
  required,
  maxLength,
  ...c
}: Common & { type?: string; defaultValue?: string; autoComplete?: string; required?: boolean; maxLength?: number }) {
  const err = !!c.errors?.[c.name];
  return (
    <div className="field">
      <Label name={c.name} label={c.label} optional={c.optional} />
      {c.hint && <span className="hint" id={`${c.name}-hint`}>{c.hint}</span>}
      <input
        id={c.name}
        name={c.name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
        maxLength={maxLength}
        aria-invalid={err || undefined}
        aria-describedby={describedBy(c.name, !!c.hint, err)}
      />
      <ErrorText name={c.name} errors={c.errors} />
    </div>
  );
}

export function TextArea({
  rows = 5,
  defaultValue,
  required,
  maxLength,
  className,
  ...c
}: Common & { rows?: number; defaultValue?: string; required?: boolean; maxLength?: number; className?: string }) {
  const err = !!c.errors?.[c.name];
  return (
    <div className="field">
      <Label name={c.name} label={c.label} optional={c.optional} />
      {c.hint && <span className="hint" id={`${c.name}-hint`}>{c.hint}</span>}
      <textarea
        id={c.name}
        name={c.name}
        rows={rows}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
        className={className}
        aria-invalid={err || undefined}
        aria-describedby={describedBy(c.name, !!c.hint, err)}
      />
      <ErrorText name={c.name} errors={c.errors} />
    </div>
  );
}

export function ChoiceGroup({
  type,
  options,
  defaultValue,
  ...c
}: Common & {
  type: "checkbox" | "radio";
  options: readonly { id: string; label: string }[];
  defaultValue?: string | string[];
}) {
  const err = !!c.errors?.[c.name];
  const picked = new Set(Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []);
  return (
    <fieldset aria-describedby={describedBy(c.name, !!c.hint, err)} aria-invalid={err || undefined}>
      <legend>
        {c.label} {c.optional && <span className="optional">(optional)</span>}
      </legend>
      {c.hint && <span className="hint" id={`${c.name}-hint`}>{c.hint}</span>}
      <div className="chips" id={c.name} tabIndex={-1}>
        {options.map((o) => (
          <label key={o.id} className="chip">
            <input type={type} name={c.name} value={o.id} defaultChecked={picked.has(o.id)} />
            {o.label}
          </label>
        ))}
      </div>
      <ErrorText name={c.name} errors={c.errors} />
    </fieldset>
  );
}

/** Shown at the top of a form when something's wrong, and focused so it's announced. */
export function ErrorSummary({
  errors,
  message,
  labels,
}: {
  errors?: FieldErrors;
  message?: string;
  labels?: Record<string, string>;
}) {
  const keys = Object.keys(errors ?? {});
  if (!message && keys.length === 0) return null;
  return (
    <div className="notice notice-error" role="alert" tabIndex={-1} ref={(el) => el?.focus()}>
      <p>
        <strong>{message ?? "A few things need fixing before this can go in:"}</strong>
      </p>
      {keys.length > 0 && (
        <ul>
          {keys.map((k) => (
            <li key={k}>
              <a href={`#${k}`}>{labels?.[k] ? `${labels[k]}: ` : ""}{errors![k]}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Hidden field bots fill in and people never see. */
export function Honeypot() {
  return (
    <div className="trap" aria-hidden="true">
      <label htmlFor="website">Leave this empty</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}
