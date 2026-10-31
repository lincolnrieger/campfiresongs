"use server";

import { redirect } from "next/navigation";
import { getActor, getUser } from "@/lib/auth/session";
import { CONFIRM_LINK_TTL } from "@/lib/constants";
import { createSubmission, markConfirmed } from "@/lib/data/submissions";
import { consumeToken, issueToken } from "@/lib/data/tokens";
import { sendEmail } from "@/lib/email/send";
import { confirmSubmissionEmail, submissionReceivedEmail } from "@/lib/email/templates";
import { appUrl, db } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { logError } from "@/lib/log";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { verifyTurnstile } from "@/lib/turnstile";
import { anonymousSubmissionSchema, fieldErrors, formToObject, submissionSchema } from "@/lib/validation";

const ARRAYS = ["categories", "sections"];

export async function submitSong(prev: FormState, form: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const values = formToObject(form, ARRAYS);
  const fail = (s: Omit<FormState, "values" | "attempt">): FormState => ({ ...s, values, attempt });

  // Bots fill the hidden field. Pretend it worked and quietly drop it.
  if (form.get("website")) redirect("/submit/thanks");

  const ip = await clientIp();
  if (!(await rateLimit("submitIp", ip))) {
    return fail({ message: "That's a lot of songs in a short time. Have a break and try again in an hour." });
  }
  if (!(await verifyTurnstile(form.get("cf-turnstile-response"), ip))) {
    return fail({ message: "We couldn't check you're a person. Please wait for the tick box below to finish, then try again." });
  }

  const user = await getUser();
  const parsed = (user ? submissionSchema : anonymousSubmissionSchema).safeParse(values);
  if (!parsed.success) return fail({ errors: fieldErrors(parsed.error) });
  const data = parsed.data;
  const email = "email" in data ? (data.email as string) : null;

  if (email && !(await rateLimit("submitEmail", email))) {
    return fail({ message: "You've sent a few already this hour. Try again a bit later." });
  }

  try {
    const id = await createSubmission(db(), await getActor(), data, email);
    if (user) {
      await sendEmail(user.email, submissionReceivedEmail(data.title));
    } else {
      const token = await issueToken(db(), "confirm_submission", CONFIRM_LINK_TTL, { submissionId: id });
      const sent = await sendEmail(email!, confirmSubmissionEmail(data.title, `${appUrl()}/submit/confirm?token=${token}`));
      if (!sent) {
        // Without the confirm email this would sit unconfirmed forever, so don't keep it.
        await db().prepare("DELETE FROM submissions WHERE id = ? AND status = 'unconfirmed'").bind(id).run();
        return fail({ message: "We couldn't send the confirmation email just now, so your song wasn't saved. Please try again a bit later." });
      }
    }
  } catch (err) {
    logError("submit", err);
    return fail({ message: "Something went wrong on our end and your song didn't save. Please try again in a minute." });
  }
  redirect(user ? "/submit/thanks" : "/submit/thanks?check=email");
}

/** The "Yes, that was me" button on the confirm page. A button, not the link itself, so email scanners can't use the token. */
export async function confirmSubmission(form: FormData) {
  const token = String(form.get("token") ?? "");
  let status: "ok" | "expired" | "error" = "expired";
  try {
    const ref = await consumeToken(db(), "confirm_submission", token);
    if (ref?.submission_id) {
      const s = await markConfirmed(db(), ref.submission_id);
      if (s?.email) await sendEmail(s.email, submissionReceivedEmail(s.title));
      status = s ? "ok" : "expired";
    }
  } catch (err) {
    logError("confirm", err);
    status = "error";
  }
  redirect(status === "ok" ? "/submit/thanks?confirmed=1" : `/submit/confirm?status=${status}`);
}
