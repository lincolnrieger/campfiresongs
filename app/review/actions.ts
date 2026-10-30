"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getActor } from "@/lib/auth/session";
import { approveSubmission, markDecisionSent, rejectSubmission, type Decision } from "@/lib/data/submissions";
import { sendEmail } from "@/lib/email/send";
import { approvedEmail, notApprovedEmail } from "@/lib/email/templates";
import { appUrl, db } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { logError } from "@/lib/log";
import { fieldErrors, formToObject, reviewEditSchema, reviewNoteSchema } from "@/lib/validation";

const ID = z.uuid();

async function notify(d: Decision, approved: boolean, note: string | null) {
  if (!d.notify) return;
  const ok = await sendEmail(
    d.notify,
    approved ? approvedEmail(d.submission.title, `${appUrl()}/songs/${d.slug}`, note) : notApprovedEmail(d.submission.title, note),
  );
  if (ok) await markDecisionSent(db(), d.submission.id);
}

export async function decide(prev: FormState, form: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const actor = await getActor();
  const id = ID.safeParse(form.get("id"));
  const decision = form.get("decision");
  const values = formToObject(form, ["categories", "sections"]);
  if (!id.success || (decision !== "approve" && decision !== "reject" && decision !== "edit")) {
    return { message: "Something's off with that form. Reload the page and try again.", attempt };
  }
  const note = reviewNoteSchema.safeParse(form.get("note") ?? "");
  if (!note.success) return { errors: { note: note.error.issues[0].message }, values, attempt };

  let edits;
  if (decision === "edit") {
    const parsed = reviewEditSchema.safeParse(values);
    if (!parsed.success) return { errors: fieldErrors(parsed.error), values, attempt };
    edits = parsed.data;
  }
  if (decision === "reject" && !note.data) {
    return { errors: { note: "Leave a short note so they know why. Be kind!" }, values, attempt };
  }
  try {
    const d =
      decision === "reject"
        ? await rejectSubmission(db(), actor, id.data, note.data)
        : await approveSubmission(db(), actor, id.data, note.data, edits);
    await notify(d, decision !== "reject", note.data);
  } catch (err) {
    logError("review", err);
    return { message: "That didn't work. Someone else may have reviewed it already. Go back to the queue to check.", values, attempt };
  }
  redirect(`/review?done=${decision === "reject" ? "rejected" : "approved"}`);
}
