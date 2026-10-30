import "server-only";
import { notFound, redirect } from "next/navigation";
import { isAdmin, isReviewer } from "../data/policy";
import { getActor } from "./session";

/** For reviewer pages. Not signed in: go sign in. Signed in but not staff: a plain 404. */
export async function reviewerOnly(path: string) {
  const actor = await getActor();
  if (!actor) redirect(`/login?next=${path}`);
  if (!isReviewer(actor)) notFound();
  return actor;
}

export async function adminOnly(path: string) {
  const actor = await getActor();
  if (!actor) redirect(`/login?next=${path}`);
  if (!isAdmin(actor)) notFound();
  return actor;
}
