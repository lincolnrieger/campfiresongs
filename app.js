import { songs } from "./songs.js";

const app = document.getElementById("app");

const slug = (s) =>
  s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const bySlug = new Map(songs.map((s) => [slug(s.title), s]));

// ---- ChordPro-lite: split a line into {chord, text} segments ----
function segments(line) {
  const matches = [...line.matchAll(/\[([^\]]+)\]/g)];
  if (matches.length === 0) return [{ chord: "", text: line }];
  const segs = [];
  if (matches[0].index > 0) segs.push({ chord: "", text: line.slice(0, matches[0].index) });
  matches.forEach((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : line.length;
    segs.push({ chord: m[1], text: line.slice(start, end) });
  });
  return segs;
}

function renderLine(line) {
  const div = document.createElement("div");
  if (!line.trim()) {
    div.className = "line blank";
    return div;
  }
  div.className = "line";
  for (const { chord, text } of segments(line)) {
    const seg = document.createElement("span");
    seg.className = "seg";
    const c = document.createElement("span");
    c.className = "chord";
    c.textContent = chord;
    const t = document.createElement("span");
    t.className = "lyric";
    t.textContent = text || " ";
    seg.append(c, t);
    div.append(seg);
  }
  return div;
}

// ---------- Views ----------
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let stopFire = null;

function teardownFire() {
  if (stopFire) {
    stopFire();
    stopFire = null;
  }
}

function renderIndex() {
  document.title = "Campfire Songs";
  app.className = "view-index";
  app.innerHTML = "";

  const hero = document.createElement("section");
  hero.className = "hero";
  hero.innerHTML =
    '<div class="firepit">' +
      '<canvas class="fire" aria-hidden="true"></canvas>' +
      '<div class="logs" aria-hidden="true"><span class="log log-a"></span><span class="log log-b"></span></div>' +
    "</div>" +
    '<h1 class="hero-title">Campfire Songs</h1>' +
    '<p class="hero-sub">Songs worth passing a guitar around for — grab a seat and sing along.</p>';
  app.append(hero);

  const canvas = hero.querySelector(".fire");
  import("./fire.js")
    .then((m) => {
      if (canvas.isConnected) stopFire = m.initFire(canvas, reduceMotion);
    })
    .catch(() => hero.classList.add("no-fire"));

  const search = document.createElement("input");
  search.type = "search";
  search.className = "search";
  search.placeholder = "Search songs…";
  search.setAttribute("aria-label", "Search songs");
  app.append(search);

  const list = document.createElement("ul");
  list.className = "song-list";

  const sorted = [...songs].sort((a, b) => a.title.localeCompare(b.title));
  for (const song of sorted) {
    const li = document.createElement("li");
    li.dataset.search = (song.title + " " + song.by).toLowerCase();
    const a = document.createElement("a");
    a.href = "#/song/" + slug(song.title);
    a.innerHTML =
      `<span class="s-title">${song.title}</span>` +
      `<span class="s-meta"><span class="s-by">${song.by}</span>` +
      `<span class="s-key">Key of ${song.key}</span></span>`;
    li.append(a);
    list.append(li);
  }
  app.append(list);

  const empty = document.createElement("p");
  empty.className = "no-results";
  empty.textContent = "No songs match that.";
  empty.hidden = true;
  app.append(empty);

  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    for (const li of list.children) {
      const match = !q || li.dataset.search.includes(q);
      li.hidden = !match;
      if (match) shown++;
    }
    empty.hidden = shown > 0;
  });
}

function renderSong(song) {
  document.title = song.title + " — Campfire Songs";
  app.className = "view-song";
  if (localStorage.getItem("hideChords") === "1") app.classList.add("hide-chords");
  app.innerHTML = "";

  const back = document.createElement("a");
  back.className = "back";
  back.href = "#/";
  back.textContent = "← All songs";
  app.append(back);

  const head = document.createElement("div");
  head.className = "song-head";
  const meta = [`Key of ${song.key}`, song.by].join("  ·  ");
  head.innerHTML = `<h1>${song.title}</h1><p class="song-meta">${meta}</p>`;
  app.append(head);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "toggle";
  const syncToggle = () => {
    const hidden = app.classList.contains("hide-chords");
    toggle.textContent = hidden ? "Show chords" : "Hide chords";
    toggle.setAttribute("aria-pressed", String(hidden));
  };
  syncToggle();
  toggle.addEventListener("click", () => {
    app.classList.toggle("hide-chords");
    localStorage.setItem("hideChords", app.classList.contains("hide-chords") ? "1" : "0");
    syncToggle();
  });
  app.append(toggle);

  const body = document.createElement("div");
  body.className = "song-body";
  for (const section of song.sections) {
    const sec = document.createElement("section");
    sec.className = "section" + (/chorus/i.test(section.label) ? " chorus" : "");
    const label = document.createElement("h2");
    label.className = "section-label";
    label.textContent = section.label;
    sec.append(label);
    for (const line of section.lines) sec.append(renderLine(line));
    body.append(sec);
  }
  app.append(body);
  window.scrollTo(0, 0);
}

// ---------- Router ----------
function router() {
  teardownFire();
  const hash = location.hash.replace(/^#/, "");
  const m = hash.match(/^\/song\/(.+)$/);
  if (m && bySlug.has(m[1])) {
    renderSong(bySlug.get(m[1]));
  } else {
    renderIndex();
  }
}

window.addEventListener("hashchange", router);
router();
