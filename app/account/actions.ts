"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { endSession, getActor } from "@/lib/auth/session";
import { deleteMySubmission, updateMySubmission } from "@/lib/data/submissions";
import { deleteAccount, updateProfile } from "@/lib/data/users";
import { db } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { logError } from "@/lib/log";
import { displayNameSchema, fieldErrors, formToObject, submissionSchema } from "@/lib/validation";

async function signedIn() {
  const actor = await getActor();
  if (!actor) redirect("/login?next=/account");
  return actor;
}

export async function saveProfile(prev: FormState, form: FormData): Promise<FormState> {
  const actor = await signedIn();
  const values = formToObject(form);
  const parsed = z.object({ displayName: displayNameSchema }).safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values, attempt: (prev.attempt ?? 0) + 1 };
  await updateProfile(db(), actor, parsed.data.displayName, form.get("showName") === "yes");
  return { ok: true, message: "Saved.", values, attempt: (prev.attempt ?? 0) + 1 };
}

const ID = z.uuid();

export async function editSubmission(prev: FormState, form: FormData): Promise<FormState> {
  const actor = await signedIn();
  const attempt = (prev.attempt ?? 0) + 1;
  const id = ID.safeParse(form.get("id"));
  const values = formToObject(form, ["categories", "sections"]);
  if (!id.success) return { message: "We couldn't find that submission.", values, attempt };
  const parsed = submissionSchema.safeParse({ ...values, copyright: "yes" });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values, attempt };
  try {
    await updateMySubmission(db(), actor, id.data, parsed.data);
  } catch (err) {
    logError("edit-submission", err);
    return { message: "That one can't be changed any more. It may have just been reviewed.", values, attempt };
  }
  redirect("/account/submissions?saved=1");
}

export async function removeSubmission(form: FormData) {
  const actor = await signedIn();
  const id = ID.safeParse(form.get("id"));
  if (id.success) {
    try {
      await deleteMySubmission(db(), actor, id.data);
    } catch (err) {
      logError("delete-submission", err);
      redirect("/account/submissions?error=1");
    }
  }
  redirect("/account/submissions?deleted=1");
}

export async function removeAccount(form: FormData) {
  const actor = await signedIn();
  if (form.get("confirm") !== "delete") redirect("/account?confirm=1#delete");
  await deleteAccount(db(), actor);
  await endSession();
  redirect("/?goodbye=1");
}
