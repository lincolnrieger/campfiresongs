"use client";

import { useActionState } from "react";
import { TextField } from "@/components/forms/fields";
import { str, type FormState } from "@/lib/forms";
import { saveProfile } from "./actions";

export function ProfileForm({ displayName, showName }: { displayName: string; showName: boolean }) {
  const [s, action, pending] = useActionState<FormState, FormData>(saveProfile, {});
  const v = s.values;
  return (
    <form action={action} noValidate>
      <TextField
        name="displayName"
        label="Display name"
        optional
        hint="A first name or nickname. Never your full name."
        maxLength={40}
        autoComplete="nickname"
        defaultValue={v ? str(v.displayName) : displayName}
        errors={s.errors}
      />
      <div className="field">
        <label className="check">
          <input type="checkbox" name="showName" value="yes" defaultChecked={v ? v.showName === "yes" : showName} />
          <span>Fill this name in when I send a song (you can always change it per song)</span>
        </label>
      </div>
      <button className="btn btn-coal btn-small" type="submit" disabled={pending}>Save</button>
      {s.ok && <span role="status" style={{ marginLeft: "0.75rem", color: "var(--ok)" }}>Saved.</span>}
    </form>
  );
}
