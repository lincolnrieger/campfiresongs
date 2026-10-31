import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap page">
      <h1>Lost in the dark</h1>
      <p className="lede">We couldn&rsquo;t find that page. It might have moved, or the link might be wrong.</p>
      <p>
        <Link href="/">Back to the fire</Link> or <Link href="/songs">look through the song bank</Link>.
      </p>
    </div>
  );
}
