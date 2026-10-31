import Link from "next/link";

export function AdminNav() {
  return (
    <nav aria-label="Admin" style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", marginBottom: "var(--space-4)" }}>
      <Link href="/admin">People</Link>
      <Link href="/admin/reports">Reports</Link>
      <Link href="/admin/songs">Songs</Link>
      <Link href="/review">Review queue</Link>
      <Link href="/review/log">Activity log</Link>
    </nav>
  );
}
