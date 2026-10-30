// Every piece of incoming data is checked here, on the server.
import { z } from "zod";
import { CATEGORIES, ENERGIES, REPORT_REASONS, SECTIONS } from "./constants";
import { parseMediaUrl } from "./media";

const ids = <T extends readonly { id: string }[]>(list: T) =>
  list.map((x) => x.id) as unknown as [T[number]["id"], ...T[number]["id"][]];

/** Trim, normalise line endings, drop control characters (keeping newlines and tabs). */
export const cleanText = (s: string) =>
  s
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
    .trim();

const text = (max: number) => z.string().transform(cleanText).pipe(z.string().max(max, `Keep this under ${max} characters.`));
const optionalText = (max: number) =>
  text(max).transform((s) => (s === "" ? null : s));

export const emailSchema = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.email("That doesn't look like an email address.").max(254));

export const displayNameSchema = optionalText(40).refine(
  (s) => s === null || /^[\p{L}\p{N} .'_-]+$/u.test(s),
  "Use letters, numbers, spaces, dots, dashes or apostrophes.",
);

export const songFields = {
  title: text(120).pipe(z.string().min(1, "Give the song a title.")),
  lyrics: text(10000).pipe(z.string().min(10, "Add the words to the song.")),
  chords: optionalText(3000),
  actions: optionalText(3000),
  mediaUrl: optionalText(300).refine(
    (s) => s === null || parseMediaUrl(s) !== null,
    "We can only take YouTube, Spotify, SoundCloud or Vimeo links.",
  ),
  categories: z.array(z.enum(ids(CATEGORIES))).min(1, "Pick at least one type.").max(8),
  sections: z.array(z.enum(ids(SECTIONS))).min(1, "Pick at least one section.").max(6),
  energy: z.enum(ids(ENERGIES), { error: "Pick an energy level." }),
  origin: optionalText(500),
};

export const submissionSchema = z.object({
  ...songFields,
  notes: optionalText(1500),
  creditName: displayNameSchema,
  copyright: z.literal("yes", { error: "Please tick this box to confirm." }),
});

export const anonymousSubmissionSchema = submissionSchema.extend({ email: emailSchema });

export const reviewEditSchema = z.object({
  ...songFields,
  creditName: displayNameSchema,
});

export const reviewNoteSchema = optionalText(1500);

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200, "That's a very long password. Keep it under 200 characters.");

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
  ageOk: z.literal("yes", { error: "Please confirm this before signing up." }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(200),
});

export const reportSchema = z.object({
  reason: z.enum(ids(REPORT_REASONS), { error: "Pick a reason." }),
  message: text(2000).pipe(z.string().min(5, "Tell us a little about the problem.")),
});

export const contactSchema = z.object({
  name: optionalText(80),
  email: emailSchema,
  message: text(4000).pipe(z.string().min(5, "Write a message.")),
});

/** Turn FormData into a plain object, collecting repeated keys into arrays. */
export function formToObject(form: FormData, arrays: string[] = []) {
  const out: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    if (key.startsWith("$ACTION") || key === "cf-turnstile-response" || key === "website") continue;
    const all = form.getAll(key).filter((v): v is string => typeof v === "string");
    out[key] = arrays.includes(key) ? all : (all[0] ?? "");
  }
  for (const key of arrays) out[key] ??= [];
  return out;
}

export type FieldErrors = Record<string, string>;

export function fieldErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
