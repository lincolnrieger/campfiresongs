import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Privacy", description: `What ${site.name} collects, why, how long we keep it and how to delete it.` };

export default function Privacy() {
  return (
    <div className="wrap page prose">
      <h1>Privacy</h1>
      <p className="lede">
        The short version: we collect as little as we can, we never sell or share it, nothing about you is public unless
        you choose a name to show on a song, and you can delete your stuff whenever you like.
      </p>
      <p>
        This page follows the Australian Privacy Principles in the <em>Privacy Act 1988</em>. It was last updated on 30
        October 2026.
      </p>

      <h2>What we collect, and why</h2>
      <h3>If you send in a song without an account</h3>
      <ul>
        <li><strong>The song</strong> and anything you write about it, so the review team can check it and add it to the bank.</li>
        <li><strong>A name to show</strong>, only if you give one. It appears on the song if it&rsquo;s approved.</li>
        <li><strong>Your email</strong>, only to send you the confirm link and to tell you what the reviewers decided. It&rsquo;s never shown to anyone, including the reviewers&rsquo; public pages.</li>
        <li><strong>Notes for reviewers</strong>, seen only by the review team.</li>
      </ul>
      <h3>If you make an account</h3>
      <ul>
        <li><strong>Your email</strong>, to sign you in and send account emails (confirming, password resets, sign-in links).</li>
        <li><strong>Your password</strong>, stored only as a scrambled one-way hash. We can&rsquo;t read it.</li>
        <li><strong>A display name</strong>, if you give one.</li>
        <li><strong>The songs you save</strong> and <strong>the songs you send in</strong>.</li>
      </ul>
      <p>We don&rsquo;t ask for your age, address, phone number, school, Scout group or anything else.</p>
      <h3>If you report a song or use the contact form</h3>
      <p>
        Reports don&rsquo;t record who sent them. Contact messages are emailed to the site admin and aren&rsquo;t stored
        on the site; we use your email only to reply.
      </p>
      <h3>Things every visitor sends</h3>
      <ul>
        <li>
          <strong>Your IP address</strong> is used to stop spam and stop people guessing passwords (by limiting how often
          a form can be used). We don&rsquo;t store it: we keep a scrambled one-way version for up to 24 hours.
        </li>
        <li>
          <strong>Cloudflare Turnstile</strong> checks that people using our forms aren&rsquo;t bots. It looks at
          information from your browser to do that. See <a href="https://www.cloudflare.com/turnstile-privacy-policy/">Cloudflare&rsquo;s Turnstile privacy notice</a>.
        </li>
        <li>We don&rsquo;t use analytics, advertising, tracking pixels or social media trackers.</li>
      </ul>

      <h2>Cookies and storage</h2>
      <ul>
        <li>One cookie keeps you signed in, if you have an account. It can&rsquo;t be read by other websites.</li>
        <li>Turnstile may set its own cookie when you use a form.</li>
        <li>Your Campfire Mode text size is remembered in your browser only. It never reaches us.</li>
      </ul>

      <h2>Embedded players</h2>
      <p>
        Some songs have a YouTube, Spotify, SoundCloud or Vimeo player. These only load on that song&rsquo;s page, and
        when they do, that company can see your visit. We use YouTube&rsquo;s privacy-enhanced mode and Vimeo&rsquo;s
        &ldquo;do not track&rdquo; option where we can.
      </p>

      <h2>How long we keep things</h2>
      <ul>
        <li>Songs you send in without an account that you don&rsquo;t confirm: deleted after 7 days.</li>
        <li>Your email on a song sent without an account: deleted 30 days after we email you the decision.</li>
        <li>Email links: work once, and stop working after 15 minutes to 24 hours depending on what they&rsquo;re for.</li>
        <li>Being signed in: lasts up to 30 days, then you sign in again.</li>
        <li>Accounts that are never confirmed: deleted after 7 days.</li>
        <li>Your account: kept until you delete it.</li>
        <li>
          Approved songs: kept in the bank for everyone. If you delete your account, the song stays but your name is
          taken off it.
        </li>
        <li>
          A log of what reviewers and the admin do (for example &ldquo;approved this song&rdquo;) is kept so decisions can
          be checked later. It records reviewers&rsquo; display names, not emails.
        </li>
      </ul>

      <h2>Who can see your information</h2>
      <ul>
        <li>The <strong>review team</strong> sees the songs waiting for review, including notes for reviewers. They don&rsquo;t see email addresses.</li>
        <li>The <strong>site admin</strong> can see account emails, to manage the review team and keep the site safe.</li>
        <li>Nobody else. We don&rsquo;t sell, rent or share your information.</li>
      </ul>

      <h2>Where it&rsquo;s stored</h2>
      <p>
        {site.name} runs on Cloudflare, which stores and processes data in data centres around the world, which may be
        outside Australia. Emails are sent through Cloudflare&rsquo;s email service. Cloudflare is bound by its own privacy
        commitments and data protection agreement, and we only use it to run this site.
      </p>

      <h2>Young people</h2>
      <p>
        This site is made for young people. If you&rsquo;re under 15, please get a parent, carer or leader&rsquo;s okay
        before making an account. You don&rsquo;t need an account to use the site.
      </p>

      <h2>Seeing, fixing or deleting your information</h2>
      <ul>
        <li>Change your display name on <Link href="/account">your account page</Link>.</li>
        <li>Edit or delete a song you&rsquo;ve sent in, until it&rsquo;s reviewed, from <Link href="/account/submissions">your submissions</Link>.</li>
        <li>Delete your whole account and everything in it from <Link href="/account">your account page</Link>. It happens straight away.</li>
        <li>
          For anything else, including a copy of what we hold about you or deleting a song you sent without an account,{" "}
          <Link href="/contact">contact us</Link>. We&rsquo;ll reply within 30 days.
        </li>
      </ul>

      <h2>Problems and complaints</h2>
      <p>
        If you think we&rsquo;ve mishandled your information, please <Link href="/contact">tell us</Link> first and
        we&rsquo;ll try to put it right. If you&rsquo;re not happy with our answer, you can complain to the{" "}
        <a href="https://www.oaic.gov.au/privacy/privacy-complaints">Office of the Australian Information Commissioner</a>.
      </p>
      <p>
        If there&rsquo;s ever a data breach likely to cause serious harm, we&rsquo;ll tell the people affected and the
        OAIC.
      </p>
    </div>
  );
}
