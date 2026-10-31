import type { FieldErrors } from "./validation";

/** What a form's server action hands back to the page. */
export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: FieldErrors;
  /** What the person typed, so nothing is lost when there's a problem. */
  values?: Record<string, unknown>;
  /** Changes on every attempt, to reset Turnstile. */
  attempt?: number;
};

export const str = (v: unknown) => (typeof v === "string" ? v : "");
export const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

/** Turn a stored submission into form values for editing. */
export function submissionToValues(s: {
  title: string;
  lyrics: string;
  chords: string | null;
  actions: string | null;
  media_url: string | null;
  categories: string[];
  sections: string[];
  energy: string;
  origin: string | null;
  credit_name: string | null;
  notes?: string | null;
}): Record<string, unknown> {
  return {
    title: s.title,
    lyrics: s.lyrics,
    chords: s.chords ?? "",
    actions: s.actions ?? "",
    mediaUrl: s.media_url ?? "",
    categories: s.categories,
    sections: s.sections,
    energy: s.energy,
    origin: s.origin ?? "",
    creditName: s.credit_name ?? "",
    notes: s.notes ?? "",
  };
}
