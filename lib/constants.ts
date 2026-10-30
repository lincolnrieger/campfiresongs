// Fixed lists used by the form, filters and database.

export const CATEGORIES = [
  { id: "action", label: "Action" },
  { id: "call-response", label: "Call & Response" },
  { id: "repeat", label: "Repeat-after-me" },
  { id: "quiet", label: "Quiet/Reflective" },
  { id: "silly", label: "Silly" },
  { id: "rounds", label: "Rounds" },
  { id: "traditional", label: "Traditional" },
  { id: "scout-classics", label: "Scout Classics" },
] as const;

export const SECTIONS = [
  { id: "joeys", label: "Joeys" },
  { id: "cubs", label: "Cubs" },
  { id: "scouts", label: "Scouts" },
  { id: "venturers", label: "Venturers" },
  { id: "rovers", label: "Rovers" },
  { id: "all", label: "All ages" },
] as const;

export const ENERGIES = [
  { id: "calm", label: "Calm" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
] as const;

export const REPORT_REASONS = [
  { id: "copyright", label: "Copyright problem" },
  { id: "inappropriate", label: "Not suitable for young people" },
  { id: "mistake", label: "Wrong words or chords" },
  { id: "other", label: "Something else" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type SectionId = (typeof SECTIONS)[number]["id"];
export type EnergyId = (typeof ENERGIES)[number]["id"];
export type ReportReason = (typeof REPORT_REASONS)[number]["id"];
export type Role = "user" | "reviewer" | "admin";

export const labelFor = (list: readonly { id: string; label: string }[], id: string) =>
  list.find((x) => x.id === id)?.label ?? id;

// Time.
export const HOUR = 3600_000;
export const DAY = 24 * HOUR;
export const CONFIRM_LINK_TTL = DAY;
export const UNCONFIRMED_TTL = 7 * DAY;
export const VERIFY_LINK_TTL = DAY;
export const RESET_LINK_TTL = HOUR;
export const MAGIC_LINK_TTL = 15 * 60_000;
export const SESSION_TTL = 30 * DAY;
/** Submitter emails are wiped this long after the decision email is sent. */
export const EMAIL_RETENTION_AFTER_DECISION = 30 * DAY;
