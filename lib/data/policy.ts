// D1 has no row level security, so these checks are the policy layer.
// Every function in lib/data takes the acting user and checks it before
// touching the database. Pages never query the database directly.

import type { Role } from "../constants";

export type Actor = {
  id: string;
  role: Role;
  /** What the audit log shows for this person. */
  label: string;
} | null;

export class Forbidden extends Error {
  constructor(message = "Not allowed") {
    super(message);
    this.name = "Forbidden";
  }
}

export class NotFound extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFound";
  }
}

export const isReviewer = (a: Actor): a is NonNullable<Actor> => a?.role === "reviewer" || a?.role === "admin";
export const isAdmin = (a: Actor): a is NonNullable<Actor> => a?.role === "admin";

export function requireUser(a: Actor): asserts a is NonNullable<Actor> {
  if (!a) throw new Forbidden("Sign in first");
}
export function requireReviewer(a: Actor): asserts a is NonNullable<Actor> {
  if (!isReviewer(a)) throw new Forbidden("Reviewers only");
}
export function requireAdmin(a: Actor): asserts a is NonNullable<Actor> {
  if (!isAdmin(a)) throw new Forbidden("Admin only");
}

export const now = () => Date.now();
