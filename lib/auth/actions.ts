"use server";

import { redirect } from "next/navigation";
import { RESET_LINK_TTL } from "../constants";
import { DUMMY_HASH, hashPassword, verifyPassword } from "../crypto";
import { consumeToken, issueToken } from "../data/tokens";
import { createUser, findUserByEmail, findUserById, markVerified, setPassword } from "../data/users";
import { sendEmail } from "../email/send";
import { resetEmail } from "../email/templates";
import { appUrl, db, getEnv } from "../env";
import type { FormState } from "../forms";
import { logError } from "../log";
import { clientIp, rateLimit } from "../ratelimit";
import { verifyTurnstile } from "../turnstile";
import { emailSchema, fieldErrors, formToObject, loginSchema, passwordSchema, signUpSchema } from "../validation";
import { safeNext } from "./next";
import { isPwned } from "./pwned";
import { createSession, endSession } from "./session";

const iterations = () => Number(getEnv().PASSWORD_ITERATIONS) || undefined;
const busy = (values: Record<string, unknown>, attempt: number): FormState => ({
  message: "Too many tries. Take a break and try again in 15 minutes.",
  values,
  attempt,
});

// ---- Sign up ---------------------------------------------------------------

/** Make an account and sign straight in. No confirmation email. */
export async function signUp(prev: FormState, form: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const values = formToObject(form);
  delete values.password;
  if (form.get("website")) redirect("/");
  const ip = await clientIp();
  if (!(await rateLimit("signupIp", ip))) return busy(values, attempt);
  if (!(await verifyTurnstile(form.get("cf-turnstile-response"), ip))) {
    return { message: "We couldn't check you're a person. Wait for the tick, then try again.", values, attempt };
  }
  const parsed = signUpSchema.safeParse(formToObject(form));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values, attempt };
  const { email, password, displayName } = parsed.data;
  if (await isPwned(password)) {
    return {
      errors: { password: "That password has turned up in a data breach somewhere, so it's easy to guess. Please pick a different one." },
      values,
      attempt,
    };
  }
  let id: string;
  try {
    if (await findUserByEmail(db(), email)) {
      return { errors: { email: "There's already an account with that email. Sign in instead." }, values, attempt };
    }
    id = await createUser(db(), email, await hashPassword(password, iterations()), displayName);
  } catch (err) {
    logError("signup", err);
    return { message: "Something went wrong on our end. Please try again in a minute.", values, attempt };
  }
  await createSession(id);
  redirect(safeNext(form.get("next"), "/account?welcome=1"));
}

// ---- Log in ----------------------------------------------------------------

export async function logIn(prev: FormState, form: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const values = formToObject(form);
  delete values.password;
  const parsed = loginSchema.safeParse(formToObject(form));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values, attempt };
  const { email, password } = parsed.data;
  const ip = await clientIp();
  if (!(await rateLimit("loginIp", ip)) || !(await rateLimit("loginEmail", email))) return busy(values, attempt);

  const user = await findUserByEmail(db(), email);
  // Always run a hash check so a missing account takes as long as a wrong password.
  const good = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (user && good) {
    // Accounts made back when email confirmation was required become active on first sign-in.
    if (!user.email_verified_at) await markVerified(db(), user.id);
    await createSession(user.id);
    redirect(safeNext(form.get("next")));
  }
  return { message: "That email and password don't match.", values, attempt };
}

export async function logOut() {
  await endSession();
  redirect("/");
}

// ---- Password reset --------------------------------------------------------

export async function requestReset(prev: FormState, form: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const values = formToObject(form);
  const parsed = emailSchema.safeParse(values.email);
  if (!parsed.success) return { errors: { email: parsed.error.issues[0].message }, values, attempt };
  const email = parsed.data;
  const ip = await clientIp();
  if (!(await rateLimit("resetIp", ip)) || !(await rateLimit("resetEmail", email))) return busy(values, attempt);
  try {
    const user = await findUserByEmail(db(), email);
    if (user) {
      const token = await issueToken(db(), "reset", RESET_LINK_TTL, { userId: user.id });
      await sendEmail(email, resetEmail(`${appUrl()}/reset/new?token=${token}`));
    }
  } catch (err) {
    logError("reset", err);
  }
  return { ok: true, message: "If there's an account for that email, we've sent a link to reset the password. It works for an hour.", attempt };
}

export async function chooseNewPassword(prev: FormState, form: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const token = String(form.get("token") ?? "");
  const parsed = passwordSchema.safeParse(form.get("password"));
  if (!parsed.success) return { errors: { password: parsed.error.issues[0].message }, attempt };
  if (await isPwned(parsed.data)) {
    return { errors: { password: "That password has turned up in a data breach somewhere. Please pick a different one." }, attempt };
  }
  const ref = await consumeToken(db(), "reset", token);
  if (!ref?.user_id) return { message: "That reset link has run out or been used. Ask for a new one.", attempt };
  const user = await findUserById(db(), ref.user_id);
  if (!user) return { message: "That reset link has run out or been used. Ask for a new one.", attempt };
  await setPassword(db(), user.id, await hashPassword(parsed.data, iterations()));
  await markVerified(db(), user.id);
  await createSession(user.id);
  redirect("/account?reset=1");
}
