import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Terms" };

export default function Terms() {
  return (
    <div className="wrap page prose">
      <h1>The fine print</h1>
      <p className="lede">Campfire rules, more or less. Last updated 30 October 2026.</p>

      <h2>Using the site</h2>
      <p>
        {site.name} is free. Sing the songs at camps, meetings, schools and around any fire you like. Please don&rsquo;t
        copy the whole bank to sell it or to run another site with it.
      </p>

      <h2>Sending in songs</h2>
      <ul>
        <li>Only send songs that are traditional or public domain, that you wrote, or that you have permission to share.</li>
        <li>Keep it right for all ages. No rude, hurtful or scary content.</li>
        <li>Don&rsquo;t put anyone&rsquo;s personal details in a song, a note or a name.</li>
        <li>
          When you send a song, you let us show it on {site.name} for free, forever, and let the review team tidy up
          typos and formatting. If you wrote it, you still own it.
        </li>
        <li>The review team decides what goes in. Their decision is final, but you&rsquo;re welcome to fix a song and send it again.</li>
      </ul>

      <h2>Accounts</h2>
      <ul>
        <li>If you&rsquo;re under 15, you need a parent, carer or leader&rsquo;s okay to make an account.</li>
        <li>Keep your password to yourself. One account per person.</li>
        <li>We can close accounts that break these rules or try to harm the site.</li>
        <li>You can delete your account at any time from your account page.</li>
      </ul>

      <h2>Copyright problems</h2>
      <p>
        If you think a song breaks someone&rsquo;s copyright (including yours), use &ldquo;Report a problem&rdquo; on the
        song or <Link href="/contact">contact us</Link>. We&rsquo;ll take it down while we look into it.
      </p>

      <h2>No promises</h2>
      <p>
        We do our best to keep the words right and the site running, but it&rsquo;s a volunteer project and comes as is.
        Use common sense with actions and games, especially near a fire.
      </p>

      <h2>Changes</h2>
      <p>If these terms change, we&rsquo;ll update the date at the top. Questions? <Link href="/contact">Ask away.</Link></p>
    </div>
  );
}
