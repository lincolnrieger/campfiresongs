"use server";

import { redirect } from "next/navigation";
import { getActor, getUser } from "@/lib/auth/session";
import { createSubmission } from "@/lib/data/submissions";
import { sendEmail } from "@/lib/email/send";
import { submissionReceivedEmail } from "@/lib/email/templates";
import { db } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { logError } from "@/lib/log";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { verifyTurnstile } from "@/lib/turnstile";
import { fieldErrors, formToObject, submissionSchema } from "@/lib/validation";

const ARRAYS = ["categories", "sections"];

/** Adding a song needs an account: it goes straight into the review queue, linked to it. */
export async function submitSong(prev: FormState, form: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const values = formToObject(form, ARRAYS);
  const fail = (s: Omit<FormState, "values" | "attempt">): FormState => ({ ...s, values, attempt });

  const user = await getUser();
  if (!user) redirect("/login?next=/submit");

  // Bots fill the hidden field. Pretend it worked and quietly drop it.
  if (form.get("website")) redirect("/submit/thanks");

  const ip = await clientIp();
  if (!(await rateLimit("submitIp", ip)) || !(await rateLimit("submitEmail", user.email))) {
    return fail({ message: "That's a lot of songs in a short time. Have a break and try again in an hour." });
  }
  if (!(await verifyTurnstile(form.get("cf-turnstile-response"), ip))) {
    return fail({ message: "We couldn't check you're a person. Please wait for the tick box to finish, then try again." });
  }

  const parsed = submissionSchema.safeParse(values);
  if (!parsed.success) return fail({ errors: fieldErrors(parsed.error) });

  try {
    await createSubmission(db(), await getActor(), parsed.data, null);
    await sendEmail(user.email, submissionReceivedEmail(parsed.data.title));
  } catch (err) {
    logError("submit", err);
    return fail({ message: "Something went wrong on our end and your song didn't save. Please try again in a minute." });
  }
  redirect("/submit/thanks");
}
