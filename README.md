# Campfire Songs

A small, readable songbook for singing around the fire — lyrics with chords,
built to be calm and easy on the eyes.

## What's here

- **`index.html`** — app shell (masthead + footer)
- **`app.js`** — client-side routing, search, and the ChordPro-lite renderer
  that lays chords above the lyrics
- **`songs.js`** — the song data; add a song by appending to this array
- **`styles.css`** — the warm "paper" songbook design (light + dark)

All songs are traditional / public domain.

## Adding a song

Append an entry to the `songs` array in `songs.js`:

```js
{
  title: "Song Title",
  by: "Traditional",
  key: "G",
  sections: [
    { label: "Verse", lines: [
      "First [G]line with a [C]chord",
      "Second [D]line",
    ]},
    { label: "Chorus", lines: [ /* ... */ ] },
  ],
}
```

Put a `[Chord]` marker right before the syllable it lands on. A section
labelled "Chorus" is set off with a quiet accent rule automatically.

## Deploying on Vercel

Static site — Vercel auto-detects it, no build step or config. Every push to
the connected branch triggers a new deployment.

## Local preview

```bash
python3 -m http.server 3000
# then visit http://localhost:3000
```
