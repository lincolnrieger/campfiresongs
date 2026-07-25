import { songs, bySlug } from "./songs.js";
import * as auth from "./auth.js";

const app = document.getElementById("app");

/* ---------------- Flame (shared, more sculpted shape) ---------------- */
function flame(cls = "") {
  return `
  <svg class="flame ${cls}" viewBox="0 0 120 160" aria-hidden="true">
    <defs>
      <linearGradient id="fl-outer" x1="0" y1="1" x2="0.15" y2="0">
        <stop offset="0" stop-color="#ff2d1f"/>
        <stop offset="0.45" stop-color="#ff6a12"/>
        <stop offset="0.8" stop-color="#ffa721"/>
        <stop offset="1" stop-color="#ffd24a"/>
      </linearGradient>
      <linearGradient id="fl-inner" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#ff8f1f"/>
        <stop offset="0.55" stop-color="#ffde5c"/>
        <stop offset="1" stop-color="#fff7d6"/>
      </linearGradient>
    </defs>
    <path class="flame-outer" fill="url(#fl-outer)" d="
      M66 6
      C 63 30, 78 40, 86 60
      C 96 84, 95 108, 80 126
      C 71 137, 60 143, 60 143
      C 60 143, 46 138, 37 126
      C 27 113, 26 95, 35 80
      C 40 72, 47 70, 49 57
      C 52 68, 58 70, 58 70
      C 68 57, 58 30, 66 6 Z" />
    <path class="flame-inner" fill="url(#fl-inner)" d="
      M63 70
      C 62 84, 72 92, 73 106
      C 74 118, 66 128, 60 129
      C 54 128, 47 119, 48 107
      C 49 94, 57 88, 58 76
      C 59 84, 62 84, 63 70 Z" />
  </svg>`;
}

const HEART = `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;

/* ---------------- ChordPro-lite rendering ---------------- */
function segments(line) {
  const matches = [...line.matchAll(/\[([^\]]+)\]/g)];
  if (!matches.length) return [{ chord: "", text: line }];
  const segs = [];
  if (matches[0].index > 0) segs.push({ chord: "", text: line.slice(0, matches[0].index) });
  matches.forEach((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : line.length;
    segs.push({ chord: m[1], text: line.slice(start, end) });
  });
  return segs;
}
function lineHTML(line) {
  if (!line.trim()) return `<div class="line blank"></div>`;
  const inner = segments(line)
    .map(({ chord, text }) =>
      `<span class="seg"><span class="chord">${escapeHTML(chord)}</span><span class="lyric">${escapeHTML(text || " ")}</span></span>`)
    .join("");
  return `<div class="line">${inner}</div>`;
}
function escapeHTML(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ---------------- Header ---------------- */
function headerHTML(active) {
  const s = auth.currentSession();
  const favCount = auth.getFavourites().length;
  const who = s ? s.name : "";
  return `
  <header class="topbar">
    <a class="logo" href="#/">${flame("logo-flame")}<span>Campfire&nbsp;Songs</span></a>
    <nav class="nav">
      <a href="#/" class="${active === "songs" ? "on" : ""}">Songs</a>
      <a href="#/favourites" class="${active === "favourites" ? "on" : ""}">
        Favourites${favCount ? ` <span class="pill">${favCount}</span>` : ""}
      </a>
    </nav>
    <div class="user">
      <span class="uname">${escapeHTML(who)}</span>
      <button class="btn-ghost" id="logout">Log out</button>
    </div>
  </header>`;
}
function wireHeader() {
  const lo = document.getElementById("logout");
  if (lo) lo.onclick = () => { auth.logOut(); go("#/login"); };
}

/* ---------------- Login ---------------- */
function renderLogin() {
  document.body.classList.add("on-login");
  let mode = "login"; // or "signup"

  app.innerHTML = `
  <div class="auth">
    <div class="auth-card">
      <div class="auth-brand">${flame("auth-flame")}<h1>Campfire Songs</h1>
        <p class="auth-tag">Lyrics and chords for singing around the fire.</p>
      </div>
      <div class="seg-toggle" role="tablist">
        <button data-mode="login" class="on">Log in</button>
        <button data-mode="signup">Create account</button>
      </div>
      <form id="auth-form" novalidate>
        <label class="fld signup-only" hidden><span>Name</span><input name="name" autocomplete="name" /></label>
        <label class="fld"><span>Email</span><input name="email" type="email" autocomplete="email" /></label>
        <label class="fld"><span>Password</span><input name="password" type="password" autocomplete="current-password" /></label>
        <p class="auth-error" id="auth-error" hidden></p>
        <button class="btn-primary" type="submit" id="auth-submit">Log in</button>
      </form>
      <div class="auth-or"><span>or</span></div>
      <button class="btn-guest" id="guest">Continue as guest</button>
      <p class="auth-fine">Accounts are stored only on this device — this is a demo sign-in, so don't use a password you rely on elsewhere.</p>
    </div>
  </div>`;

  const form = document.getElementById("auth-form");
  const errEl = document.getElementById("auth-error");
  const submit = document.getElementById("auth-submit");
  const toggle = app.querySelector(".seg-toggle");

  function setMode(next) {
    mode = next;
    toggle.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.mode === mode));
    app.querySelectorAll(".signup-only").forEach((el) => (el.hidden = mode !== "signup"));
    submit.textContent = mode === "signup" ? "Create account" : "Log in";
    form.password.autocomplete = mode === "signup" ? "new-password" : "current-password";
    errEl.hidden = true;
  }
  toggle.onclick = (e) => { const b = e.target.closest("button"); if (b) setMode(b.dataset.mode); };

  form.onsubmit = async (e) => {
    e.preventDefault();
    errEl.hidden = true;
    submit.disabled = true;
    try {
      if (mode === "signup") await auth.signUp(form.name.value, form.email.value, form.password.value);
      else await auth.logIn(form.email.value, form.password.value);
      go("#/");
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    } finally {
      submit.disabled = false;
    }
  };

  document.getElementById("guest").onclick = () => { auth.continueAsGuest(); go("#/"); };
}

/* ---------------- Song list / favourites ---------------- */
function renderList(favouritesOnly) {
  document.body.classList.remove("on-login");
  const favs = auth.getFavourites();
  let items = favouritesOnly ? songs.filter((s) => favs.includes(s.slug)) : songs.slice();
  items.sort((a, b) => a.title.localeCompare(b.title));

  const rows = items
    .map(
      (song) => `
      <li class="row">
        <a class="row-main" href="#/song/${song.slug}">
          <span class="row-title">${escapeHTML(song.title)}</span>
          <span class="row-meta">${escapeHTML(song.by)} · Key of ${song.key}</span>
        </a>
        <button class="fav ${favs.includes(song.slug) ? "is-fav" : ""}" data-slug="${song.slug}"
          aria-label="Toggle favourite" aria-pressed="${favs.includes(song.slug)}">${HEART}</button>
      </li>`
    )
    .join("");

  const intro = favouritesOnly
    ? `<p class="list-intro">Songs you've starred.</p>`
    : `<p class="list-intro">Four to get everyone singing. Star the ones you love.</p>`;

  const empty = favouritesOnly && !items.length
    ? `<p class="empty">No favourites yet. Tap the heart on any song to save it here.</p>`
    : "";

  app.innerHTML = `
    ${headerHTML(favouritesOnly ? "favourites" : "songs")}
    <main class="wrap">
      <h1 class="page-title">${favouritesOnly ? "Favourites" : "Songs"}</h1>
      ${intro}
      <ul class="song-list">${rows}</ul>
      ${empty}
    </main>`;

  wireHeader();
  app.querySelectorAll(".fav").forEach((btn) => {
    btn.onclick = () => { auth.toggleFavourite(btn.dataset.slug); renderList(favouritesOnly); };
  });
}

/* ---------------- Song page ---------------- */
function renderSong(song) {
  document.body.classList.remove("on-login");
  const faved = auth.isFavourite(song.slug);
  const hideChords = localStorage.getItem("cfs_hideChords") === "1";

  const body = song.sections
    .map((sec) => {
      const chorus = /chorus/i.test(sec.label) ? " chorus" : "";
      return `<section class="section${chorus}">
        <h2 class="section-label">${escapeHTML(sec.label)}</h2>
        ${sec.lines.map(lineHTML).join("")}
      </section>`;
    })
    .join("");

  app.innerHTML = `
    ${headerHTML("songs")}
    <main class="wrap song ${hideChords ? "hide-chords" : ""}">
      <a class="back" href="#/">← All songs</a>
      <div class="song-head">
        <div>
          <h1>${escapeHTML(song.title)}</h1>
          <p class="song-meta">Key of ${song.key} · ${escapeHTML(song.by)}</p>
        </div>
        <button class="fav big ${faved ? "is-fav" : ""}" id="fav" aria-pressed="${faved}" aria-label="Toggle favourite">${HEART}</button>
      </div>
      ${song.note ? `<p class="song-note">${escapeHTML(song.note)}</p>` : ""}
      <button class="btn-toggle" id="toggle">${hideChords ? "Show chords" : "Hide chords"}</button>
      <div class="song-body">${body}</div>
    </main>`;

  wireHeader();

  document.getElementById("fav").onclick = (e) => {
    const now = auth.toggleFavourite(song.slug);
    e.currentTarget.classList.toggle("is-fav", now);
    e.currentTarget.setAttribute("aria-pressed", String(now));
  };
  document.getElementById("toggle").onclick = (e) => {
    const main = app.querySelector("main.song");
    const hidden = main.classList.toggle("hide-chords");
    localStorage.setItem("cfs_hideChords", hidden ? "1" : "0");
    e.target.textContent = hidden ? "Show chords" : "Hide chords";
  };
  window.scrollTo(0, 0);
}

/* ---------------- Router ---------------- */
function go(hash) {
  if (location.hash === hash) router();
  else location.hash = hash;
}

function router() {
  const session = auth.currentSession();
  const hash = location.hash.replace(/^#/, "");

  if (!session) { renderLogin(); return; }
  if (hash === "/login") { go("#/"); return; }

  const songMatch = hash.match(/^\/song\/(.+)$/);
  if (songMatch && bySlug.has(songMatch[1])) renderSong(bySlug.get(songMatch[1]));
  else if (hash === "/favourites") renderList(true);
  else renderList(false);
}

window.addEventListener("hashchange", router);
router();
