import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedSong } from "@/lib/data/songs";
import { db, getEnv } from "@/lib/env";
import { ReportForm } from "./ReportForm";

export const metadata: Metadata = { title: "Report a problem", robots: { index: false } };

export default async function Report({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const song = await getPublishedSong(db(), slug);
  if (!song) notFound();
  return (
    <div className="wrap page">
      <p><Link href={`/songs/${song.slug}`}>Back to {song.title}</Link></p>
      <h1>Report a problem</h1>
      <p className="lede">
        Something wrong with &ldquo;{song.title}&rdquo;? Tell us and the site admin will look into it. For copyright
        problems, the song can come down while it&rsquo;s sorted out.
      </p>
      <ReportForm slug={song.slug} siteKey={getEnv().TURNSTILE_SITE_KEY} />
    </div>
  );
}
