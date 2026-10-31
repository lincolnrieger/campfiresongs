import type { Metadata } from "next";
import Link from "next/link";
import { adminOnly } from "@/lib/auth/guards";
import { labelFor, REPORT_REASONS } from "@/lib/constants";
import { listReports } from "@/lib/data/reports";
import { db } from "@/lib/env";
import { closeReport, publishSong } from "../actions";
import { AdminNav } from "../AdminNav";

export const metadata: Metadata = { title: "Reports", robots: { index: false } };

export default async function Reports() {
  const actor = await adminOnly("/admin/reports");
  const reports = await listReports(db(), actor);
  return (
    <div className="wrap page">
      <h1>Reports</h1>
      <AdminNav />
      {reports.length === 0 && <p className="lede">No reports. Good news.</p>}
      <ul style={{ listStyle: "none", padding: 0, maxWidth: "48rem" }}>
        {reports.map((r) => (
          <li key={r.id} style={{ padding: "1rem 0", borderBottom: "1px dashed var(--line)", opacity: r.resolved_at ? 0.6 : 1 }}>
            <h2 style={{ fontSize: "1.15rem", marginBottom: "0.3rem" }}>
              {r.slug ? <Link href={`/songs/${r.slug}`}>{r.song_title}</Link> : r.song_title}
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "0.93rem", margin: 0 }}>
              {labelFor(REPORT_REASONS, r.reason)} · {new Date(r.created_at).toLocaleString("en-AU")}
              {r.resolved_at ? " · closed" : ""}
            </p>
            <p style={{ whiteSpace: "pre-wrap", margin: "0.5rem 0" }}>{r.message}</p>
            {!r.resolved_at && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {r.song_id && (
                  <form action={publishSong}>
                    <input type="hidden" name="id" value={r.song_id} />
                    <input type="hidden" name="on" value="0" />
                    <input type="hidden" name="back" value="reports" />
                    <button className="btn btn-danger btn-small" type="submit">Take the song down</button>
                  </form>
                )}
                <form action={closeReport}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="btn btn-coal btn-small" type="submit">Close report</button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
