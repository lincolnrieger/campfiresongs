# Security

CampfireSongs is used by young people, so we take security and privacy seriously.

## Reporting a problem

If you think you've found a security problem, please **don't** open a public GitHub issue.

Email **hello@campfiresongs.org** with "Security" in the subject, and include:

- what you found and where (page or URL),
- how to reproduce it,
- what someone could do with it.

We'll reply within 7 days, keep you posted while we fix it, and credit you if you'd like once it's fixed. Please give us
a reasonable chance to fix it before telling anyone else, and don't access or change other people's data while testing.

## How the site is protected

- **Access rules.** Cloudflare D1 has no row level security, so all database access goes through one server-only
  layer (`lib/data/`). Every function checks who's asking (anonymous, user, reviewer, admin) before reading or
  writing. `tests/policy.test.ts` checks each role can only see and change what it should.
- **Validation.** Every form is checked on the server with Zod (`lib/validation.ts`).
- **Output.** User text is always rendered as plain text. Embedded players are built from a checked video ID, never
  from the submitted link.
- **Sessions.** `__Host-` cookies: HttpOnly, Secure, SameSite=Lax. Only a SHA-256 hash of the session ID is stored.
- **Password reset links.** Random 256-bit tokens, single use, expire after an hour, stored only as hashes. Links open a page with a
  button, so email scanners can't use them up.
- **Passwords.** PBKDF2-SHA256 (100,000 rounds), at least 10 characters, checked against known breaches via Have I
  Been Pwned's k-anonymity API.
- **Abuse.** Cloudflare Turnstile on submit, sign-up, report and contact forms. Rate limits on submissions, logins,
  sign-ups, resets, reports and contact (keys are HMACs, never raw IPs or emails). Honeypot fields.
- **Account checks.** Login and password reset give the same answer whether or not the email has an account. Sign-up
  has to say when an email is already taken (there's no confirmation email), so it's protected by Turnstile and a
  per-IP rate limit instead.
- **Headers.** Strict nonce-based Content Security Policy, HSTS, `frame-ancestors 'none'`, X-Frame-Options,
  Referrer-Policy, Permissions-Policy, nosniff. Cross-site POSTs are rejected (Origin / Sec-Fetch-Site check).
- **Errors.** Users never see stack traces. Server logs record the error type only, with emails stripped.
- **Audit log.** Every review and admin action is logged; the database refuses edits or deletes on the log.
