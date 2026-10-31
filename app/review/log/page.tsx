import type { Metadata } from "next";
import Link from "next/link";
import { reviewerOnly } from "@/lib/auth/guards";
import { listAudit } from "@/lib/data/audit";
import { db } from "@/lib/env";

export const metadata: Metadata = { title: "Activity log", robots: { index: false } };

const ACTIONS: Record<string, string> = {
  "submission.approve": "approved",
  "submission.edit_approve": "fixed and approved",
  "submission.reject": "turned down",
  "song.unpublish": "took down",
  "song.republish": "put back up",
  "song.delete": "deleted",
  "role.grant_reviewer": "made a reviewer:",
  "role.revoke_reviewer": "removed reviewer:",
  "report.resolve": "closed a report",
};

export default async function Log() {
  const actor = await reviewerOnly("/review/log");
  const rows = await listAudit(db(), actor, 300);
  return (
    <div className="wrap page">
      <p><Link href="/review">Back to the queue</Link></p>
      <h1>Activity log</h1>
      <p className="lede">Every review and admin action, newest first. Nothing here can be changed or deleted.</p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.93rem" }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--text)" }}>
            <th scope="col">When</th>
            <th scope="col">Who</th>
            <th scope="col">What</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            let detail = "";
            try {
              const d = r.detail ? (JSON.parse(r.detail) as { title?: string; who?: string }) : {};
              detail = d.title ? `“${d.title}”` : d.who ?? "";
            } catch {}
            return (
              <tr key={r.id} style={{ borderBottom: "1px dashed var(--line)" }}>
                <td style={{ padding: "0.5rem 0.75rem 0.5rem 0", whiteSpace: "nowrap" }}>{new Date(r.created_at).toLocaleString("en-AU")}</td>
                <td style={{ padding: "0.5rem 0.75rem 0.5rem 0" }}>{r.actor_label}</td>
                <td style={{ padding: "0.5rem 0" }}>{ACTIONS[r.action] ?? r.action} {detail}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
