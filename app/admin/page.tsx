import type { Metadata } from "next";
import { adminOnly } from "@/lib/auth/guards";
import { listStaff } from "@/lib/data/users";
import { db } from "@/lib/env";
import { addReviewer, removeReviewer } from "./actions";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const MSG: Record<string, [string, boolean]> = {
  added: ["Done. They're a reviewer now (they'll need to sign in again).", false],
  removed: ["Done. They're no longer a reviewer.", false],
  "no-account": ["There's no confirmed account with that email. Ask them to sign up first.", true],
  "bad-email": ["That doesn't look like an email address.", true],
  failed: ["That didn't work.", true],
};

export default async function Admin({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const actor = await adminOnly("/admin");
  const { msg } = await searchParams;
  const staff = await listStaff(db(), actor);
  const m = msg ? MSG[msg] : undefined;
  return (
    <div className="wrap page">
      <h1>Admin</h1>
      <AdminNav />
      {m && <p className={`notice ${m[1] ? "notice-error" : ""}`} role={m[1] ? "alert" : "status"}>{m[0]}</p>}
      <h2>The review team</h2>
      <ul style={{ listStyle: "none", padding: 0, maxWidth: "44rem" }}>
        {staff.map((u) => (
          <li key={u.id} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", padding: "0.6rem 0", borderBottom: "1px dashed rgb(184 174 163 / 0.25)" }}>
            <span style={{ overflowWrap: "anywhere" }}>
              <strong>{u.display_name || "No name"}</strong> · {u.email} · {u.role === "admin" ? "admin" : "reviewer"}
            </span>
            {u.role === "reviewer" && (
              <form action={removeReviewer}>
                <input type="hidden" name="id" value={u.id} />
                <button className="btn btn-coal btn-small" type="submit">Remove</button>
              </form>
            )}
          </li>
        ))}
      </ul>
      <h2 style={{ marginTop: "var(--space-5)" }}>Add a reviewer</h2>
      <p>They need to have made an account and confirmed their email first.</p>
      <form action={addReviewer} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end", maxWidth: "40rem" }}>
        <div style={{ flex: "1 1 16rem" }}>
          <label htmlFor="email" style={{ display: "block", fontWeight: 700, marginBottom: "0.35rem" }}>Their email</label>
          <input id="email" name="email" type="email" autoComplete="off" required />
        </div>
        <button className="btn" type="submit">Make reviewer</button>
      </form>
    </div>
  );
}
