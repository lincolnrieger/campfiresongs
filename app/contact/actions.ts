"use server";

import { redirect } from "next/navigation";
import { sendEmail } from "@/lib/email/send";
import { contactEmail } from "@/lib/email/templates";
import { getEnv } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { verifyTurnstile } from "@/lib/turnstile";
import { contactSchema, fieldErrors, formToObject } from "@/lib/validation";

export async function sendContact(prev: FormState, form: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const values = formToObject(form);
  if (form.get("website")) redirect("/contact?sent=1");
  const ip = await clientIp();
  if (!(await rateLimit("contactIp", ip))) return { message: "You've sent a few already. Try again in an hour.", values, attempt };
  if (!(await verifyTurnstile(form.get("cf-turnstile-response"), ip))) {
    return { message: "We couldn't check you're a person. Wait for the tick, then try again.", values, attempt };
  }
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values, attempt };
  const { name, email, message } = parsed.data;
  const ok = await sendEmail(getEnv().ADMIN_EMAIL, contactEmail(name, email, message), email);
  if (!ok) return { message: "That didn't send. Please try again in a minute.", values, attempt };
  redirect("/contact?sent=1");
}
