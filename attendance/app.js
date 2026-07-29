// Shell: tabs, header counts, and re-rendering. Each tab is a module that
// returns HTML and then wires up its own listeners in mount().

import * as store from "./store.js";
import { esc } from "./ui.js";
import * as scan from "./scan.js";
import * as people from "./people.js";
import * as badges from "./badges.js";
import * as log from "./log.js";
import * as data from "./data.js";

const TABS = [
  ["scan", "Scan", scan],
  ["people", "People", people],
  ["badges", "Badges", badges],
  ["log", "Log", log],
  ["data", "Data", data],
];

const app = document.getElementById("app");
let current = (location.hash.replace("#", "") || "scan");
if (!TABS.some(([k]) => k === current)) current = "scan";

function render({ keepFocus = null } = {}) {
  const tab = TABS.find(([k]) => k === current);
  const c = store.counts();

  app.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <span class="mark">▌▌▐</span>
        <span>
          <b>${esc(store.campName())}</b>
          <small>Attendance</small>
        </span>
      </div>
      <div class="tally">
        <span class="tone-ok"><b>${c.on_site}</b> on site</span>
        <span class="tone-away"><b>${c.off_site}</b> off site</span>
      </div>
    </header>

    <nav class="tabs">
      ${TABS.map(([key, label]) => `
        <a href="#${key}" class="${key === current ? "is-on" : ""}">${label}</a>`).join("")}
    </nav>

    <main>${tab[2].view()}</main>

    <footer class="foot">
      Prototype — all data is stored in this browser only. Not connected to a server.
    </footer>`;

  tab[2].mount(app.querySelector("main"), render, { testScan });

  if (keepFocus) {
    const el = app.querySelector(keepFocus);
    if (el) { el.focus(); el.setSelectionRange?.(el.value.length, el.value.length); }
  }
}

/** People tab -> "Test scan": jump to the scan station and feed it that code. */
function testScan(code) {
  current = "scan";
  history.replaceState(null, "", "#scan");
  render();
  scan.handle(code, render);
}

window.addEventListener("hashchange", () => {
  const next = location.hash.replace("#", "") || "scan";
  if (!TABS.some(([k]) => k === next) || next === current) return;
  if (current === "scan") scan.unmount();
  current = next;
  render();
});

// Adding a person is usually followed by printing their badge; say so rather
// than silently leaving them on the roster screen.
window.addEventListener("camp:added", (e) => {
  const el = app.querySelector(".add-form");
  if (!el) return;
  const note = document.createElement("p");
  note.className = "flash";
  note.textContent = `${e.detail.name} added — barcode ${e.detail.id}. Print it from the Badges tab.`;
  el.after(note);
  setTimeout(() => note.remove(), 6000);
});

store.subscribe(() => {
  // Header counts must never lag behind the roster.
  const tally = app.querySelector(".tally");
  if (!tally) return;
  const c = store.counts();
  tally.innerHTML = `<span class="tone-ok"><b>${c.on_site}</b> on site</span>
    <span class="tone-away"><b>${c.off_site}</b> off site</span>`;
});

render();
