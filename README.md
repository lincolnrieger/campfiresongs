# Campfire Songs

A basic static landing page used to test the GitHub → Vercel deployment connection.

## Structure

- `index.html` — the landing page
- `styles.css` — styling

## Deploying on Vercel

Vercel auto-detects this as a static site — no build step or configuration
required. Connect the repository in Vercel and every push to the connected
branch will trigger a new deployment.

## Local preview

Open `index.html` in a browser, or serve it:

```bash
python3 -m http.server 3000
# then visit http://localhost:3000
```
