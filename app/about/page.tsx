import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import styles from "./about.module.css";

export const metadata: Metadata = { title: "About", description: `Why ${site.name} exists and who looks after it.` };

export default function About() {
  return (
    <div className={`wrap page ${styles.layout}`}>
      <div className="prose">
        <h1>About the fire</h1>
        <p className="lede">
          Campfire songs get passed on the way they always have: someone starts one, everyone else picks it up, and the
          words drift a little every year. That&rsquo;s half the fun. But it also means good songs get lost.
        </p>
        <p>
          {site.name} is a place to keep them. Anyone can send in a song. A small review team of young people checks each
          one, and the good ones go in the bank, free for anyone to sing at their next campfire.
        </p>
        <h2>Made for and with young people</h2>
        <p>
          The people singing these songs are mostly young, so young people decide what goes in. The review team checks
          that every song is right for everyone from the littlest Joey to the oldest Rover, and that it&rsquo;s okay to
          share.
        </p>
        <h2>Kept safe on purpose</h2>
        <ul>
          <li>No profiles, no messages, no comments. Nobody can contact anybody through the site.</li>
          <li>The only thing ever shown about a person is a first name or nickname on a song, and only if they want it.</li>
          <li>You don&rsquo;t need an account to sing or to send a song in.</li>
          <li>We keep as little about you as we can, and delete it when it&rsquo;s not needed. <Link href="/privacy">Here&rsquo;s exactly what.</Link></li>
        </ul>
        <h2>Lend a hand</h2>
        <p>
          The best thing you can do is <Link href="/submit">send in a song</Link> your group loves. If you&rsquo;re keen
          to join the review team, or you&rsquo;ve spotted something wrong, <Link href="/contact">get in touch</Link>.
        </p>
      </div>
    </div>
  );
}
