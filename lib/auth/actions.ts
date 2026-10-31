"use server";

import { redirect } from "next/navigation";
import { MAGIC_LINK_TTL, RESET_LINK_TTL, VERIFY_LINK_TTL } from "../constants";
import { DUMMY_HASH, hashPassword, verifyPassword } from "../crypto";
import { consumeToken, issueToken } from "../data/tokens";
import { createUser, findUserByEmail, findUserById, markVerified, setPassword } from "../data/users";
import { sendEmail } from "../email/send";
import { alreadyRegisteredEmail, magicLinkEmail, resetEmail, verifyEmail } from "../email/templates";
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

export async function signUp(prev: FormState, form: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const values = formToObject(form);
  delete values.password;
  if (form.get("website")) redirect("/signup/check");
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
  try {
    const existing = await findUserByEmail(db(), email);
    let sent: boolean;
    if (existing) {
      // Same response either way, so nobody can find out who has an account.
      const base = appUrl();
      sent = await sendEmail(email, alreadyRegisteredEmail(`${base}/login`, `${base}/reset`));
    } else {
      const id = await createUser(db(), email, await hashPassword(password, iterations()), displayName);
      const token = await issueToken(db(), "verify", VERIFY_LINK_TTL, { userId: id });
      sent = await sendEmail(email, verifyEmail(`${appUrl()}/auth/verify?token=${token}`));
      if (!sent) await db().prepare("DELETE FROM users WHERE id = ? AND email_verified_at IS NULL").bind(id).run();
    }
    if (!sent) {
      return { message: "We couldn't send the confirmation email just now. Please try again a bit later.", values, attempt };
    }
  } catch (err) {
    logError("signup", err);
    return { message: "Something went wrong on our end. Please try again in a minute.", values, attempt };
  }
  redirect("/signup/check");
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
  if (user && good && user.email_verified_at) {
    await createSession(user.id);
    redirect(safeNext(form.get("next")));
  }
  if (user && good && !user.email_verified_at) {
    // Right password, but they never clicked the email. Send it again, quietly.
    const token = await issueToken(db(), "verify", VERIFY_LINK_TTL, { userId: user.id });
    await sendEmail(email, verifyEmail(`${appUrl()}/auth/verify?token=${token}`));
  }
  return {
    message:
      "That email and password don't match, or the account hasn't been confirmed yet. If you've just signed up, check your email for the link.",
    values,
    attempt,
  };
}

export async function logOut() {
  await endSession();
  redirect("/");
}

// ---- Magic link ------------------------------------------------------------

export async function sendMagicLink(prev: FormState, form: FormData): Promise<FormState> {
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
      const token = await issueToken(db(), "magic", MAGIC_LINK_TTL, { userId: user.id });
      const next = safeNext(form.get("next"));
      await sendEmail(email, magicLinkEmail(`${appUrl()}/auth/magic?token=${token}&next=${encodeURIComponent(next)}`));
    }
  } catch (err) {
    logError("magic", err);
  }
  return { ok: true, message: "If there's an account for that email, a sign-in link is on its way. It works for 15 minutes.", attempt };
}

export async function redeemMagicLink(form: FormData) {
  const ref = await consumeToken(db(), "magic", String(form.get("token") ?? ""));
  if (!ref?.user_id) redirect("/login?link=expired");
  await markVerified(db(), ref.user_id); // using the link proves they own the email
  await createSession(ref.user_id);
  redirect(safeNext(form.get("next")));
}

// ---- Verify email ----------------------------------------------------------

export async function confirmEmail(form: FormData) {
  const ref = await consumeToken(db(), "verify", String(form.get("token") ?? ""));
  if (!ref?.user_id) redirect("/auth/verify?status=expired");
  await markVerified(db(), ref.user_id);
  await createSession(ref.user_id);
  redirect("/account?welcome=1");
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
