import "server-only";
import { site } from "@/config/site";
import { getEnv } from "../env";
import { logError } from "../log";
import type { EmailContent } from "./templates";

/**
 * Send through Cloudflare Email Service. Without the EMAIL binding (local
 * development) the email is printed to the terminal instead.
 */
export async function sendEmail(to: string, content: EmailContent, replyTo?: string) {
  const env = getEnv();
  if (!env.EMAIL) {
    if (/^http:\/\/localhost(:\d+)?$/.test(env.APP_URL ?? "")) {
      console.log(`\n--- email (dev, not sent) ---\nSubject: ${content.subject}\n\n${content.text}\n---\n`);
      return true;
    } else {
      // Production without the EMAIL binding: say so, but never log the contents (they hold links and addresses).
      console.warn("[email] Not sent: the EMAIL binding isn't set up yet. See README, step 'Email: sending'.");
    }
    return false;
  }
  try {
    await env.EMAIL.send({
      from: { email: site.email.noreply, name: site.name },
      to,
      subject: content.subject,
      text: content.text,
      html: content.html,
      ...(replyTo ? { replyTo } : {}),
    });
    return true;
  } catch (err) {
    logError("email", err);
    return false;
  }
}
