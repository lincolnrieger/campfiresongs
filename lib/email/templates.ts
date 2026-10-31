// Every email the site sends. Plain words, a warm sign-off, and user text is
// always escaped in the HTML version.
import { site } from "@/config/site";

export type EmailContent = { subject: string; text: string; html: string };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function build(subject: string, paras: (string | { link: string; label: string })[], footer?: string): EmailContent {
  const sign = `See you round the fire,\nThe ${site.name} crew`;
  const foot = footer ?? `You're getting this because someone used this email address on ${site.domain}.`;
  const text = [
    ...paras.map((p) => (typeof p === "string" ? p : `${p.label}:\n${p.link}`)),
    sign,
    `--\n${foot}`,
  ].join("\n\n");
  const body = paras
    .map((p) =>
      typeof p === "string"
        ? `<p style="margin:0 0 16px">${esc(p).replace(/\n/g, "<br>")}</p>`
        : `<p style="margin:24px 0"><a href="${esc(p.link)}" style="background:#f26b1d;color:#160f0b;padding:12px 20px;border-radius:4px;text-decoration:none;font-weight:bold">${esc(p.label)}</a></p><p style="margin:0 0 16px;font-size:13px;color:#6b5f55">Or paste this into your browser:<br>${esc(p.link)}</p>`,
    )
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f6efe3;padding:24px;font-family:Georgia,serif;color:#2a211c;font-size:16px;line-height:1.5">
<div style="max-width:520px;margin:0 auto;background:#fffaf1;padding:28px;border-radius:6px;border-top:4px solid #f26b1d">
<p style="margin:0 0 20px;font-size:20px">${esc(site.name)}</p>${body}
<p style="margin:24px 0 0">${esc(sign).replace(/\n/g, "<br>")}</p>
<p style="margin:24px 0 0;font-size:12px;color:#7a6d62">${esc(foot)}</p></div></body></html>`;
  return { subject, text, html };
}

export const submissionReceivedEmail = (title: string) =>
  build(`We've got your song: ${title}`, [
    `"${title}" is now with our review team.`,
    "They're a small group of young people who check every song before it goes in the bank. We'll email you as soon as they've had a look.",
  ]);

export const approvedEmail = (title: string, link: string, note: string | null) =>
  build(`Your song is in the bank: ${title}`, [
    `Good news. "${title}" has been approved and is now in the song bank for everyone to sing.`,
    ...(note ? [`A note from the reviewer:\n${note}`] : []),
    { link, label: "See your song" },
  ]);

export const notApprovedEmail = (title: string, note: string | null) =>
  build(`About your song: ${title}`, [
    `Thanks for sending in "${title}". This time the review team decided not to add it to the bank.`,
    note ? `Here's what they said:\n${note}` : "They didn't leave a note this time.",
    "Please don't let that stop you. If you can fix the problem, you're very welcome to send it in again.",
  ]);

export const verifyEmail = (link: string) =>
  build(`Check your email for ${site.name}`, [
    "Click the button to finish setting up your account. The link works once and runs out in 24 hours.",
    { link, label: "Confirm my email" },
    "If you didn't sign up, ignore this email and nothing will happen.",
  ]);

export const resetEmail = (link: string) =>
  build(`Reset your ${site.name} password`, [
    "Someone asked to reset the password for this account. If it was you, use the button below. It works once and runs out in an hour.",
    { link, label: "Choose a new password" },
    "If it wasn't you, ignore this email. Your password won't change.",
  ]);

export const magicLinkEmail = (link: string) =>
  build(`Your ${site.name} sign-in link`, [
    "Here's your link to sign in. It works once and runs out in 15 minutes.",
    { link, label: "Sign me in" },
    "If you didn't ask for this, ignore this email.",
  ]);

export const alreadyRegisteredEmail = (loginLink: string, resetLink: string) =>
  build(`You already have a ${site.name} account`, [
    "Someone tried to sign up with this email, but you already have an account.",
    { link: loginLink, label: "Sign in" },
    `Forgotten your password? You can reset it here: ${resetLink}`,
    "If this wasn't you, you can ignore this email.",
  ]);

export const reportEmail = (title: string, songLink: string, reason: string, message: string) =>
  build(
    `Problem reported: ${title}`,
    [`Someone reported a problem with "${title}".`, `Reason: ${reason}`, `What they said:\n${message}`, { link: songLink, label: "Open the song" }],
    "Sent to the site admin. Manage reports from the admin pages.",
  );

export const contactEmail = (name: string | null, from: string, message: string) =>
  build(
    `Message from the ${site.name} contact form`,
    [`From: ${name ? `${name} <${from}>` : from}`, message],
    "Sent to the site admin from the contact form. Reply to answer them.",
  );
