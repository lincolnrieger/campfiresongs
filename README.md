# Campfire Songs

A small, modern web app for singing around the fire — lyrics and chords, with
a sign-in and per-user favourites.

## Features

- **Songs**: I Met a Bear, Ging Gang Goolie, A Peanut Sat on a Railway Track,
  A Ram Sam Sam (all traditional / public domain).
- **Sign in**: create an account or continue as a guest.
- **Favourites**: star songs; saved per account (guests get their own list).
- **Chords over lyrics** with a "Hide chords" reading toggle.
- Animated flame, responsive/mobile-friendly, no build step.

## Accounts are on-device only

There is no backend. Accounts, password hashes, and favourites all live in the
browser's `localStorage` (`auth.js`). This is a prototype sign-in, **not real
authentication** — the login screen says as much. A future version would move
this to a real auth provider and database.

## Files

- `index.html` — app shell
- `app.js` — routing, views, chord rendering
- `auth.js` — on-device accounts + favourites
- `songs.js` — song data (add a song by appending to the array)
- `styles.css` — styling
- `attendance/` — barcode attendance system (see `attendance/README.md`)

## Barcode attendance

`attendance/` is a separate, self-contained prototype for tracking who is on
site and who is off site on a bus, using printed Code 128 badges and an
ordinary USB barcode scanner. Open `/attendance/` and see
[`attendance/README.md`](attendance/README.md).

## Deploying on Vercel

Static site — Vercel auto-detects it, no build step or config. Every push to
the connected branch triggers a new deployment.

## Local preview

```bash
python3 -m http.server 3000   # then visit http://localhost:3000
```
