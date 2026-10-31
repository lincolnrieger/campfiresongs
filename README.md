# CampfireSongs

A bank of campfire songs. Anyone can send one in, a youth review team checks it, and approved songs go in the bank for
everyone. Accounts are optional and only for saving songs and tracking what you've sent.

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
| Styles | Plain CSS + CSS modules, no UI kit |
| Fire | Hand-written WebGL2 shader (`components/fire/`), canvas 2D fallback |

D1 has no row level security, so access rules live in one server-only layer, `lib/data/`. Pages and actions never
query the database directly. See [SECURITY.md](SECURITY.md).

```
app/            pages, server actions
components/     fire, sky, forms, site chrome
config/site.ts  name + domain
lib/data/       every database query, with role checks
lib/auth/       sessions, sign-in actions, guards
lib/email/      sending + templates
migrations/     D1 schema
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

Create the local database:

```bash
npm run db:migrate:local
```

Build and run the real Worker locally:

```bash
npm run build && npm run start
```

Open http://localhost:8787. Emails aren't really sent locally: Wrangler prints each one in the terminal and saves the
text and HTML under `dist/server/.wrangler/tmp/email/`, so you can click the links.

The hidden fire tuning page is at http://localhost:8787/fire.

Tests:

```bash
npm run check
```

## Set up Cloudflare (once)

Everything below is in the Cloudflare dashboard at https://dash.cloudflare.com unless it's a command.

### 1. Put the domain on Cloudflare

Add `campfiresongs.org` as a site and switch your registrar's nameservers to the two Cloudflare gives you. Wait until
the dashboard says it's active.

### 2. Workers plan

Use the **Workers Paid** plan (US$5/month). Password hashing needs more CPU per request than the free plan's 10ms
allows, so sign-up and login will fail on the free plan.

### 3. Database

```bash
npx wrangler login
```

```bash
npx wrangler d1 create campfiresongs
```

Copy the `database_id` it prints into `wrangler.jsonc` (replace the zeros), commit it, then create the tables:

```bash
npm run db:migrate
```

### 4. Turnstile

Go to **Turnstile → Add widget**. Name it CampfireSongs, add the hostname `campfiresongs.org`, and choose **Managed**.

- Put the **site key** in `wrangler.jsonc` under `vars.TURNSTILE_SITE_KEY` (it's public).
- Set the **secret key** as a secret:

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
```

### 5. Rate-limit secret

```bash
openssl rand -base64 32
```

```bash
npx wrangler secret put RATE_LIMIT_SECRET
```

### 6. Email: sending

Go to **Compute & AI → Email Service → Email Sending** and onboard `campfiresongs.org` (or run
`npx wrangler email sending enable campfiresongs.org`). Because the domain is on Cloudflare, it adds the sending
records for you:

- **SPF**: a TXT record authorising Cloudflare to send for the domain.
- **DKIM**: records used to sign every email.

Check them with:

```bash
npx wrangler email sending dns get campfiresongs.org
```

Then add **DMARC** yourself under **DNS → Records → Add record**:

| Type | Name | Content |
| --- | --- | --- |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:hello@campfiresongs.org` |

Start with `p=quarantine`. Once a few weeks of reports look clean, you can move to `p=reject`.

The site sends from `noreply@campfiresongs.org`.

### 7. Email: receiving `hello@`

Reports and contact messages go to `ADMIN_EMAIL` (`hello@campfiresongs.org`). To read them, go to **Email → Email
Routing**, enable it (it adds MX and SPF records), and create a rule forwarding `hello@campfiresongs.org` to your own
inbox. Verify that inbox when Cloudflare asks.

### 8. Deploy from GitHub

Go to **Workers & Pages → Create → Import a repository**, pick this repo, and set:

- **Build command:** `npm run build`
- **Deploy command:** `npm run deploy` (this also applies any new database migrations)
- **Production branch:** `main`

Every push to `main` deploys. Other branches get preview builds.

### 9. Connect campfiresongs.org

In the Worker, go to **Settings → Domains & Routes → Add → Custom domain** and add `campfiresongs.org`. Add
`www.campfiresongs.org` too if you want it. Cloudflare sets up DNS and HTTPS.

### 10. Make yourself admin

Sign up on the live site with your email and click the confirm link. Then:

```bash
npx wrangler d1 execute campfiresongs --remote --command "UPDATE users SET role='admin' WHERE email='you@example.com'"
```

Sign out and back in. You'll see **Admin** in the menu. From there you can make reviewers: they sign up first, then you
add them by email.

## Go-live checklist

- [ ] Domain active on Cloudflare, HTTPS working, `www` redirects or is added
- [ ] Workers Paid plan
- [ ] Real `database_id` in `wrangler.jsonc`, migrations applied (`npm run db:migrate`)
- [ ] Real Turnstile site key in `wrangler.jsonc`, secret set
- [ ] `RATE_LIMIT_SECRET` set
- [ ] `TURNSTILE_DEV_BYPASS` and `APP_URL` **not** set in production
- [ ] Email Sending onboarded; SPF and DKIM showing as verified; DMARC added
- [ ] Email Routing forwards `hello@` to a real inbox; send a test via the Contact page
- [ ] Send a test song without an account; confirm link arrives and works; "received" email arrives
- [ ] Sign up, confirm, log in, reset password, magic link all work
- [ ] You're admin; at least one other reviewer added; approve and reject a test song; both emails arrive
- [ ] Report a test song; email arrives at `hello@`; take it down and put it back up
- [ ] Delete the test account and test songs
- [ ] Cron trigger shows in **Worker → Settings → Triggers** (daily clean-up)
- [ ] Check headers at https://securityheaders.com and the mobile score in Lighthouse
- [ ] Read the Privacy and Terms pages once more and check they still match what you do

## Changing things

- **Name or domain:** `config/site.ts`, then the `ADMIN_EMAIL` var in `wrangler.jsonc`.
- **The fire:** tune it at `/fire`, press **Copy settings**, and paste into `DEFAULT_FIRE` in `components/fire/settings.ts`.
- **Categories, sections, limits, time limits:** `lib/constants.ts` and `lib/ratelimit.ts`.
- **Emails:** `lib/email/templates.ts`.
