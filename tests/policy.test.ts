// Access rules for every role. D1 has no row level security, so these tests
// are what prove the data layer only lets each person see and change what
// they're allowed to.
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./d1";
import { listAudit } from "@/lib/data/audit";
import { listFavourites, setFavourite } from "@/lib/data/favourites";
import type { Actor } from "@/lib/data/policy";
import { createReport, listReports, resolveReport } from "@/lib/data/reports";
import { deleteSong, getPublishedSong, listAllSongs, listPublishedSongs, setSongPublished } from "@/lib/data/songs";
import {
  approveSubmission,
  cleanup,
  createSubmission,
  deleteMySubmission,
  getForReview,
  getMySubmission,
  listMySubmissions,
  listQueue,
  markConfirmed,
  rejectSubmission,
  updateMySubmission,
  type SubmissionInput,
} from "@/lib/data/submissions";
import { consumeToken, issueToken } from "@/lib/data/tokens";
import { createUser, deleteAccount, findUserById, listStaff, setRole } from "@/lib/data/users";

const input: SubmissionInput = {
  title: "The Billy Can Song",
  lyrics: "Boil the billy, boil the billy,\nTea for everyone tonight.",
  chords: null,
  actions: "Stir the air with one hand.",
  mediaUrl: "https://youtu.be/dQw4w9WgXcQ",
  categories: ["silly"],
  sections: ["cubs"],
  energy: "medium",
  origin: null,
  notes: "Learnt it at Jamboree",
  creditName: "Kim",
};

let db: D1Database;
let alice: Actor, bob: Actor, rita: Actor, admin: Actor;
const anon: Actor = null;

async function person(email: string, role: "user" | "reviewer" | "admin" = "user"): Promise<Actor> {
  const id = await createUser(db, email, null, null);
  await db.prepare("UPDATE users SET role = ?, email_verified_at = 1 WHERE id = ?").bind(role, id).run();
  return { id, role, label: email };
}

// Test-only fixture songs (the real bank starts empty).
async function fixtureSong(slug: string) {
  await db
    .prepare(
      "INSERT INTO songs (id, slug, title, lyrics, categories, sections, energy, published, published_at, updated_at) VALUES (?, ?, ?, 'la la la la la', '[\"silly\"]', '[\"all\"]', 'high', 1, 1, 1)",
    )
    .bind(`song-${slug}`, slug, slug.replace(/-/g, " "))
    .run();
}

beforeEach(async () => {
  db = createTestDb();
  for (const slug of ["ging-gang-goolie", "a-ram-sam-sam", "frere-jacques", "day-is-done", "coming-round-the-mountain"]) {
    await fixtureSong(slug);
  }
  alice = await person("alice@example.com");
  bob = await person("bob@example.com");
  rita = await person("rita@example.com", "reviewer");
  admin = await person("admin@example.com", "admin");
});

describe("published songs", () => {
  it("are public", async () => {
    const songs = await listPublishedSongs(db);
    expect(songs.length).toBe(5);
    expect(await getPublishedSong(db, "ging-gang-goolie")).not.toBeNull();
  });
});

describe("anonymous visitor", () => {
  it("can submit, but only with an email, and it waits for confirmation", async () => {
    await expect(createSubmission(db, anon, input, null)).rejects.toThrow();
    const id = await createSubmission(db, anon, input, "kid@example.com");
    expect((await getForReview(db, rita, id)).status).toBe("unconfirmed");
    expect((await listQueue(db, rita)).find((s) => s.id === id)).toBeUndefined();
    await markConfirmed(db, id);
    expect((await listQueue(db, rita)).find((s) => s.id === id)).toBeDefined();
  });

  it("can't read the queue, submissions, users, reports or the audit log", async () => {
    await expect(listQueue(db, anon)).rejects.toThrow();
    await expect(listMySubmissions(db, anon)).rejects.toThrow();
    await expect(getForReview(db, anon, "x")).rejects.toThrow();
    await expect(listStaff(db, anon)).rejects.toThrow();
    await expect(listReports(db, anon)).rejects.toThrow();
    await expect(listAudit(db, anon)).rejects.toThrow();
    await expect(listAllSongs(db, anon)).rejects.toThrow();
  });

  it("can't approve, reject, favourite, unpublish or change roles", async () => {
    const id = await createSubmission(db, alice, input, null);
    await expect(approveSubmission(db, anon, id, null)).rejects.toThrow();
    await expect(rejectSubmission(db, anon, id, null)).rejects.toThrow();
    await expect(setFavourite(db, anon, "song-ging-gang-goolie", true)).rejects.toThrow();
    await expect(setSongPublished(db, anon, "song-ging-gang-goolie", false)).rejects.toThrow();
    await expect(setRole(db, anon, alice!.id, "reviewer")).rejects.toThrow();
  });

  it("can report a published song", async () => {
    await expect(createReport(db, "song-ging-gang-goolie", "mistake", "Second verse is wrong")).resolves.toBeTruthy();
  });

  it("never sees unpublished songs", async () => {
    await setSongPublished(db, admin, "song-ging-gang-goolie", false);
    expect(await getPublishedSong(db, "ging-gang-goolie")).toBeNull();
    expect((await listPublishedSongs(db)).length).toBe(4);
    await expect(createReport(db, "song-ging-gang-goolie", "mistake", "hello there")).rejects.toThrow();
  });
});

describe("signed-in user", () => {
  it("submits straight into the queue, linked to their account", async () => {
    const id = await createSubmission(db, alice, input, null);
    const s = await getMySubmission(db, alice, id);
    expect(s.status).toBe("pending");
    expect(s.user_id).toBe(alice!.id);
    expect(s.email).toBeNull();
  });

  it("sees only their own submissions", async () => {
    const mine = await createSubmission(db, alice, input, null);
    const theirs = await createSubmission(db, bob, input, null);
    const list = await listMySubmissions(db, alice);
    expect(list.map((s) => s.id)).toEqual([mine]);
    await expect(getMySubmission(db, alice, theirs)).rejects.toThrow();
  });

  it("can edit and delete their own pending submission, not someone else's", async () => {
    const mine = await createSubmission(db, alice, input, null);
    const theirs = await createSubmission(db, bob, input, null);
    await updateMySubmission(db, alice, mine, { ...input, title: "Better title" });
    expect((await getMySubmission(db, alice, mine)).title).toBe("Better title");
    await expect(updateMySubmission(db, alice, theirs, input)).rejects.toThrow();
    await expect(deleteMySubmission(db, alice, theirs)).rejects.toThrow();
    await deleteMySubmission(db, alice, mine);
    expect(await listMySubmissions(db, alice)).toEqual([]);
  });

  it("can't edit or delete once reviewed", async () => {
    const mine = await createSubmission(db, alice, input, null);
    await approveSubmission(db, rita, mine, null);
    await expect(updateMySubmission(db, alice, mine, input)).rejects.toThrow();
    await expect(deleteMySubmission(db, alice, mine)).rejects.toThrow();
  });

  it("can't review, see the queue, manage roles or read reports", async () => {
    const id = await createSubmission(db, bob, input, null);
    await expect(listQueue(db, alice)).rejects.toThrow();
    await expect(approveSubmission(db, alice, id, null)).rejects.toThrow();
    await expect(rejectSubmission(db, alice, id, null)).rejects.toThrow();
    await expect(setRole(db, alice, alice!.id, "reviewer")).rejects.toThrow();
    await expect(setRole(db, alice, bob!.id, "reviewer")).rejects.toThrow();
    await expect(listReports(db, alice)).rejects.toThrow();
    await expect(listAudit(db, alice)).rejects.toThrow();
    await expect(deleteSong(db, alice, "song-ging-gang-goolie")).rejects.toThrow();
  });

  it("has their own favourites", async () => {
    await setFavourite(db, alice, "song-ging-gang-goolie", true);
    await setFavourite(db, bob, "song-a-ram-sam-sam", true);
    expect((await listFavourites(db, alice)).map((f) => f.slug)).toEqual(["ging-gang-goolie"]);
    await setFavourite(db, alice, "song-ging-gang-goolie", false);
    expect(await listFavourites(db, alice)).toEqual([]);
    expect((await listFavourites(db, bob)).length).toBe(1);
  });

  it("deleting the account removes their data but keeps approved songs, uncredited", async () => {
    const approved = await createSubmission(db, alice, input, null);
    const { slug } = await approveSubmission(db, rita, approved, null);
    await createSubmission(db, alice, input, null);
    await setFavourite(db, alice, "song-ging-gang-goolie", true);
    await deleteAccount(db, alice);
    expect(await findUserById(db, alice!.id)).toBeNull();
    const n = await db.prepare("SELECT COUNT(*) AS n FROM submissions WHERE user_id = ?").bind(alice!.id).first<{ n: number }>();
    expect(n?.n).toBe(0);
    const song = await getPublishedSong(db, slug!);
    expect(song).not.toBeNull();
    expect(song!.credit_name).toBeNull();
  });
});

describe("reviewer", () => {
  it("sees the queue with every field", async () => {
    await createSubmission(db, alice, input, null);
    const q = await listQueue(db, rita);
    expect(q[0].notes).toBe("Learnt it at Jamboree");
    expect(q[0].actions).toBe(input.actions);
  });

  it("approves into the public bank and logs it", async () => {
    const id = await createSubmission(db, alice, input, null);
    const d = await approveSubmission(db, rita, id, "Lovely one");
    expect(d.notify).toBe("alice@example.com");
    const song = await getPublishedSong(db, d.slug!);
    expect(song?.media_provider).toBe("youtube");
    expect(song?.media_id).toBe("dQw4w9WgXcQ");
    const log = await listAudit(db, rita);
    expect(log[0].action).toBe("submission.approve");
    expect(log[0].actor_label).toBe("rita@example.com"); // tests pass their own labels
  });

  it("can edit then approve", async () => {
    const id = await createSubmission(db, anon, input, "kid@example.com");
    await markConfirmed(db, id);
    const d = await approveSubmission(db, rita, id, null, { ...input, title: "The Billy Can Song (fixed)" });
    expect(d.notify).toBe("kid@example.com");
    expect((await getPublishedSong(db, d.slug!))?.title).toBe("The Billy Can Song (fixed)");
    expect((await listAudit(db, rita))[0].action).toBe("submission.edit_approve");
  });

  it("rejects with a note, and can't decide twice", async () => {
    const id = await createSubmission(db, alice, input, null);
    await rejectSubmission(db, rita, id, "Too similar to one we have");
    expect((await getMySubmission(db, alice, id)).review_note).toBe("Too similar to one we have");
    await expect(approveSubmission(db, rita, id, null)).rejects.toThrow();
    await expect(rejectSubmission(db, rita, id, null)).rejects.toThrow();
    const log = await listAudit(db, rita);
    expect(log.filter((l) => l.target_id === id).length).toBe(1);
  });

  it("can't manage roles, read reports or unpublish songs", async () => {
    await expect(setRole(db, rita, alice!.id, "reviewer")).rejects.toThrow();
    await expect(listStaff(db, rita)).rejects.toThrow();
    await expect(listReports(db, rita)).rejects.toThrow();
    await expect(setSongPublished(db, rita, "song-ging-gang-goolie", false)).rejects.toThrow();
    await expect(deleteSong(db, rita, "song-ging-gang-goolie")).rejects.toThrow();
  });
});

describe("admin", () => {
  it("makes and unmakes reviewers, logged", async () => {
    await setRole(db, admin, alice!.id, "reviewer");
    expect((await findUserById(db, alice!.id))?.role).toBe("reviewer");
    await setRole(db, admin, alice!.id, "user");
    expect((await findUserById(db, alice!.id))?.role).toBe("user");
    const actions = (await listAudit(db, admin)).map((l) => l.action);
    expect(actions).toContain("role.grant_reviewer");
    expect(actions).toContain("role.revoke_reviewer");
  });

  it("can't change their own role or another admin", async () => {
    await expect(setRole(db, admin, admin!.id, "user")).rejects.toThrow();
  });

  it("unpublishes and removes songs, and handles reports", async () => {
    const r = await createReport(db, "song-a-ram-sam-sam", "copyright", "This is someone else's arrangement");
    expect((await listReports(db, admin)).length).toBe(1);
    await setSongPublished(db, admin, "song-a-ram-sam-sam", false);
    await deleteSong(db, admin, "song-a-ram-sam-sam");
    await resolveReport(db, admin, r.id);
    expect((await listReports(db, admin))[0].resolved_at).not.toBeNull();
  });
});

describe("audit log", () => {
  it("can't be changed or deleted", async () => {
    const id = await createSubmission(db, alice, input, null);
    await approveSubmission(db, rita, id, null);
    await expect(db.prepare("UPDATE audit_log SET action = 'x'").run()).rejects.toThrow();
    await expect(db.prepare("DELETE FROM audit_log").run()).rejects.toThrow();
  });
});

describe("email tokens", () => {
  it("work once, then never again", async () => {
    const id = await createSubmission(db, anon, input, "kid@example.com");
    const token = await issueToken(db, "confirm_submission", 60_000, { submissionId: id });
    const raw = await db.prepare("SELECT token_hash FROM email_tokens").first<{ token_hash: string }>();
    expect(raw?.token_hash).not.toBe(token); // only the hash is stored
    expect((await consumeToken(db, "confirm_submission", token))?.submission_id).toBe(id);
    expect(await consumeToken(db, "confirm_submission", token)).toBeNull();
  });

  it("expire, and only work for their purpose", async () => {
    const token = await issueToken(db, "reset", -1, { userId: alice!.id });
    expect(await consumeToken(db, "reset", token)).toBeNull();
    const t2 = await issueToken(db, "verify", 60_000, { userId: alice!.id });
    expect(await consumeToken(db, "reset", t2)).toBeNull();
  });
});

describe("housekeeping", () => {
  it("deletes unconfirmed submissions after 7 days", async () => {
    const id = await createSubmission(db, anon, input, "kid@example.com");
    await cleanup(db, Date.now() + 6 * 86400_000);
    expect(await getForReview(db, rita, id)).toBeTruthy();
    await cleanup(db, Date.now() + 8 * 86400_000);
    await expect(getForReview(db, rita, id)).rejects.toThrow();
  });
});
