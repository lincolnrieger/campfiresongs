# Campfire Songs

A single "coming soon" page with a pixel-art campfire.

## Files

- `index.html` — the page
- `styles.css` — layout and type
- `fire.js` — the pixel fire

The fire is a small cellular fire simulation rendered on a 56×76 canvas and
scaled up with `image-rendering: pixelated`, so it stays crisply 8-bit. A
flame-shaped envelope keeps the silhouette tidy, and it honours
`prefers-reduced-motion` by settling to a still frame. No dependencies.

## Deploying on Vercel

Static site — Vercel auto-detects it, no build step or config. Every push to
the connected branch triggers a new deployment.

## Local preview

```bash
python3 -m http.server 3000
# then visit http://localhost:3000
```
