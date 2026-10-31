# CampfireSongs

A bank of campfire songs. Anyone can browse and sing them. People sign in to add a song, a youth review team checks
it, and approved songs go in the bank for everyone. Accounts also let people save favourites.

Lives at **campfiresongs.org**. The name and domain are set in one place: [`config/site.ts`](config/site.ts).

## How it's built

| Part | What |
| --- | --- |
| App | Next.js App Router via [vinext](https://github.com/cloudflare/vinext), TypeScript strict |
| Hosting | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite), migrations in `migrations/` |
| Email | Cloudflare Email Service (`send_email` binding) |
| Bot checks | Cloudflare Turnstile |
| Rate limits | Counters in D1 (`lib/ratelimit.ts`) |
| Validation | Zod, on the server |
| Styles | Plain CSS + CSS modules, Nunito font, light and rounded |

D1 has no row level security, so access rules live in one server-only layer, `lib/data/`. Pages and actions never
query the database directly. See [SECURITY.md](SECURITY.md).

```
app/            pages, server actions
components/     forms, header/footer, small UI bits
config/site.ts  name + domain
lib/data/       every database query, with role checks
lib/auth/       sessions, sign-in actions, guards
lib/email/      sending + templates
migrations/     D1 schema (applied automatically on first request, lib/migrate.ts)
tests/          access-rule tests for every role, validation tests
worker/         Worker entry (app + daily clean-up cron)
middleware.ts   security headers, CSP nonce, cross-site POST check
```

## Run it locally

You need Node 22+.

```bash
npm ci
```

```bash
cp .env.example .dev.vars
```

Fill in `.dev.vars` for local use:

```
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
RATE_LIMIT_SECRET=anything-long
APP_URL=http://localhost:8787
```

Build and run the real Worker locally:

```bash
npm run build && npm run start
```

Open http://localhost:8787. The database tables are created on the first request. Emails aren't sent locally: each
one is printed in the terminal, so you can click the links.

Tests:

```bash
npm run check
```

## Put it on Cloudflare

### 1. Deploy (this is all you need to get it running)

In the Cloudflare dashboard go to **Workers & Pages → Create → Import a repository** and pick this repo. Set:

- **Project / Worker name:** `campfiresongs` (must match `name` in `wrangler.jsonc`)
- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`
- **Production branch:** the branch you merge into

That's it. On the first deploy Wrangler creates the D1 database for you, and the site creates its tables on its first
visit. Forms work straight away using Cloudflare's test Turnstile key. Emails don't send until step 4.

If the deploy fails, open the build log in the dashboard and look for the first red line.

### 2. Workers Paid plan

Use the **Workers Paid** plan (US$5/month). Password hashing needs more CPU per request than the free plan's 10ms
allows, so sign-up and login can fail on the free plan.

### 3. Connect campfiresongs.org

Add `campfiresongs.org` to Cloudflare (switch your registrar's nameservers to the two Cloudflare gives you). Then in the
Worker go to **Settings → Domains & Routes → Add → Custom domain** and add `campfiresongs.org`.

### 4. Turn on email

1. Go to **Compute & AI → Email Service → Email Sending** and onboard `campfiresongs.org`. Cloudflare adds the **SPF**
   and **DKIM** records for you.
2. Add **DMARC** yourself under **DNS → Records → Add record**: type `TXT`, name `_dmarc`, content
   `v=DMARC1; p=quarantine; rua=mailto:hello@campfiresongs.org`.
3. Go to **Email → Email Routing**, turn it on, and forward `hello@campfiresongs.org` to your own inbox (reports and
   contact messages go there).
4. In `wrangler.jsonc`, uncomment the `"send_email"` line and push. Emails now send from `noreply@campfiresongs.org`.

### 5. Real Turnstile keys

Go to **Turnstile → Add widget**, add the hostname `campfiresongs.org`, mode **Managed**. Put the **site key** in
`wrangler.jsonc` under `vars.TURNSTILE_SITE_KEY` and push. Set the **secret key** in the Worker under
**Settings → Variables and Secrets → Add → Secret**, named `TURNSTILE_SECRET_KEY`. Also add a secret called
`RATE_LIMIT_SECRET` with any long random text.

### 6. Make yourself admin

Sign up on the live site and click the confirm link. Then in the dashboard go to **Storage & Databases → D1 →
campfiresongs → Console** and run:

```sql
UPDATE users SET role = 'admin', email_verified_at = COALESCE(email_verified_at, 0) WHERE email = 'you@example.com';
```

Sign out and back in. You'll see **Admin** in the menu, where you can add reviewers (they sign up first).

## Go-live checklist

- [ ] Deploy succeeds; the site loads on its workers.dev address
- [ ] Domain active on Cloudflare, HTTPS working, `www` redirects or is added
- [ ] Workers Paid plan
- [ ] Real Turnstile site key in `wrangler.jsonc`, secret set
- [ ] `RATE_LIMIT_SECRET` set
- [ ] `TURNSTILE_DEV_BYPASS` and `APP_URL` **not** set in production
- [ ] Email Sending onboarded; SPF and DKIM showing as verified; DMARC added; `send_email` uncommented
- [ ] Email Routing forwards `hello@` to a real inbox; send a test via the Contact page
- [ ] Sign up, add a test song; the "received" email arrives
- [ ] Sign up, confirm, log in, reset password, magic link all work
- [ ] You're admin; at least one other reviewer added; approve and reject a test song; both emails arrive
- [ ] Report a test song; email arrives at `hello@`; take it down and put it back up
- [ ] Delete the test account and test songs
- [ ] Cron trigger shows in **Worker → Settings → Triggers** (daily clean-up)
- [ ] Check headers at https://securityheaders.com and the mobile score in Lighthouse
- [ ] Read the Privacy and Terms pages once more and check they still match what you do

## Changing things

- **Name or domain:** `config/site.ts`, then the `ADMIN_EMAIL` var in `wrangler.jsonc`.
- **Colours and spacing:** the variables at the top of `app/globals.css`.
- **Categories, sections, limits, time limits:** `lib/constants.ts` and `lib/ratelimit.ts`.
- **Emails:** `lib/email/templates.ts`.
