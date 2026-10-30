"use server";

import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { setFavourite } from "@/lib/data/favourites";
import { createReport, type Report } from "@/lib/data/reports";
import { getPublishedSong } from "@/lib/data/songs";
import { sendEmail } from "@/lib/email/send";
import { reportEmail } from "@/lib/email/templates";
import { appUrl, db, getEnv } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { labelFor, REPORT_REASONS } from "@/lib/constants";
import { logError } from "@/lib/log";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { verifyTurnstile } from "@/lib/turnstile";
import { fieldErrors, formToObject, reportSchema } from "@/lib/validation";

const SLUG = /^[a-z0-9-]{1,80}$/;

export async function toggleFavourite(form: FormData) {
  const slug = String(form.get("slug") ?? "");
  if (!SLUG.test(slug)) redirect("/songs");
  const actor = await getActor();
  if (!actor) redirect(`/login?next=/songs/${slug}`);
  const song = await getPublishedSong(db(), slug);
  if (song) await setFavourite(db(), actor, song.id, form.get("on") === "1");
  redirect(`/songs/${slug}${form.get("on") === "1" ? "?saved=1" : ""}`);
}

export async function reportSong(prev: FormState, form: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const values = formToObject(form);
  const slug = String(form.get("slug") ?? "");
  if (form.get("website")) redirect(`/songs/${slug}?reported=1`);
  const ip = await clientIp();
  if (!(await rateLimit("reportIp", ip))) {
    return { message: "You've sent a few reports already. Please try again later.", values, attempt };
  }
  if (!(await verifyTurnstile(form.get("cf-turnstile-response"), ip))) {
    return { message: "We couldn't check you're a person. Please wait for the tick, then try again.", values, attempt };
  }
  const parsed = reportSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values, attempt };
  const song = SLUG.test(slug) ? await getPublishedSong(db(), slug) : null;
  if (!song) return { message: "We couldn't find that song.", values, attempt };
  try {
    await createReport(db(), song.id, parsed.data.reason as Report["reason"], parsed.data.message);
    await sendEmail(
      getEnv().ADMIN_EMAIL,
      reportEmail(song.title, `${appUrl()}/songs/${song.slug}`, labelFor(REPORT_REASONS, parsed.data.reason), parsed.data.message),
    );
  } catch (err) {
    logError("report", err);
    return { message: "Something went wrong sending that. Please try again.", values, attempt };
  }
  redirect(`/songs/${slug}?reported=1`);
}
