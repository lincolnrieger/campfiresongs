"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getActor } from "@/lib/auth/session";
import { resolveReport } from "@/lib/data/reports";
import { deleteSong, setSongPublished } from "@/lib/data/songs";
import { findUserForAdmin, setRole } from "@/lib/data/users";
import { db } from "@/lib/env";
import { logError } from "@/lib/log";
import { emailSchema } from "@/lib/validation";

const ID = z.uuid();
const SONG_ID = z.string().min(1).max(80).regex(/^[A-Za-z0-9-]+$/);

export async function addReviewer(form: FormData) {
  const actor = await getActor();
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) redirect("/admin?msg=bad-email");
  const user = await findUserForAdmin(db(), actor, email.data);
  if (!user || !user.email_verified_at) redirect("/admin?msg=no-account");
  try {
    await setRole(db(), actor, user.id, "reviewer");
  } catch (err) {
    logError("add-reviewer", err);
    redirect("/admin?msg=failed");
  }
  redirect("/admin?msg=added");
}

export async function removeReviewer(form: FormData) {
  const actor = await getActor();
  const id = ID.safeParse(form.get("id"));
  if (!id.success) redirect("/admin");
  try {
    await setRole(db(), actor, id.data, "user");
  } catch (err) {
    logError("remove-reviewer", err);
    redirect("/admin?msg=failed");
  }
  redirect("/admin?msg=removed");
}

export async function closeReport(form: FormData) {
  const actor = await getActor();
  const id = ID.safeParse(form.get("id"));
  if (id.success) await resolveReport(db(), actor, id.data);
  redirect("/admin/reports");
}

export async function publishSong(form: FormData) {
  const actor = await getActor();
  const id = SONG_ID.safeParse(form.get("id"));
  if (id.success) await setSongPublished(db(), actor, id.data, form.get("on") === "1");
  redirect(String(form.get("back") ?? "") === "reports" ? "/admin/reports" : "/admin/songs");
}

export async function removeSong(form: FormData) {
  const actor = await getActor();
  const id = SONG_ID.safeParse(form.get("id"));
  if (form.get("confirm") !== "yes") redirect("/admin/songs?msg=confirm");
  if (id.success) await deleteSong(db(), actor, id.data);
  redirect("/admin/songs?msg=deleted");
}
