// Roster + live board: who is here, who is out, and everyone's barcode.

import * as store from "./store.js";
import { esc, dateTimeOf, initials, download, stamp } from "./ui.js";

let filter = "all";
let query = "";

const FILTERS = [
  ["all", "Everyone"],
  ["on_site", "On site"],
  ["off_site", "Off site"],
  ["expected", "Not arrived"],
  ["departed", "Signed out"],
];

function visible() {
  const q = query.trim().toLowerCase();
  return store.people().filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) ||
      p.group.toLowerCase().includes(q);
  });
}

export function view() {
  const c = store.counts();
  const rows = visible();
  const offSite = store.people().filter((p) => p.status === "off_site");
  const trips = [...new Set(offSite.map((p) => p.trip || "No trip name"))];

  return `
  <section class="people">
    <div class="board">
      ${FILTERS.slice(1).map(([key, label]) => `
        <button class="board-card ${filter === key ? "is-on" : ""} tone-${store.STATUS[key].tone}"
                data-filter="${key}">
          <b>${c[key]}</b><span>${label}</span>
        </button>`).join("")}
    </div>

    ${offSite.length ? `
      <p class="trip-summary">Off site: ${trips.map((t) =>
        `<b>${esc(t)}</b> (${offSite.filter((p) => (p.trip || "No trip name") === t).length})`).join(", ")}</p>` : ""}

    <div class="toolbar">
      <input id="q" type="search" placeholder="Search name, group or barcode" value="${esc(query)}"
             autocomplete="off" />
      <button class="btn-ghost ${filter === "all" ? "is-on" : ""}" data-filter="all">Everyone</button>
      <button class="btn-ghost" id="export-people">Export CSV</button>
    </div>

    <form id="add-form" class="add-form">
      <input name="name" placeholder="Full name" autocomplete="off" required />
      <input name="group" placeholder="Patrol / group" autocomplete="off" list="groups" />
      <select name="role">
        <option value="scout">Scout</option>
        <option value="leader">Leader</option>
        <option value="visitor">Visitor</option>
      </select>
      <button class="btn" type="submit">Add &amp; issue barcode</button>
    </form>
    <datalist id="groups">
      ${[...new Set(store.people().map((p) => p.group).filter(Boolean))]
        .map((g) => `<option value="${esc(g)}"></option>`).join("")}
    </datalist>

    ${rows.length ? `
      <ul class="roster">
        ${rows.map(rowHTML).join("")}
      </ul>` : `<p class="empty">${store.people().length
        ? "Nobody matches that."
        : "No one on the roster yet. Add someone above, or load the demo camp from the Data tab."}</p>`}
  </section>`;
}

function rowHTML(p) {
  const s = store.STATUS[p.status];
  return `
  <li class="person" data-id="${p.id}">
    <span class="avatar tone-${s.tone}">${esc(initials(p.name))}</span>
    <span class="who">
      <b>${esc(p.name)}</b>
      <small>${esc(p.id)}${p.group ? ` · ${esc(p.group)}` : ""}${p.role !== "scout" ? ` · ${esc(p.role)}` : ""}</small>
    </span>
    <span class="state tone-${s.tone}">
      ${esc(s.label)}${p.trip ? `<small>${esc(p.trip)}</small>` : ""}
    </span>
    <span class="when">${dateTimeOf(p.lastScanAt)}</span>
    <span class="row-actions">
      <button class="btn-ghost tiny" data-test="${p.id}" title="Send this barcode to the scan station">Test scan</button>
      <button class="btn-ghost tiny" data-remove="${p.id}" title="Remove from roster">Remove</button>
    </span>
  </li>`;
}

export function mount(root, rerender, { testScan }) {
  const q = root.querySelector("#q");
  q.addEventListener("input", () => {
    query = q.value;
    rerender({ keepFocus: "#q" });
  });

  root.querySelectorAll("[data-filter]").forEach((b) => {
    b.addEventListener("click", () => { filter = b.dataset.filter; rerender(); });
  });

  root.querySelector("#add-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const p = store.addPerson({
        name: f.get("name"), group: f.get("group"), role: f.get("role"),
      });
      query = "";
      rerender();
      // Point them straight at the badge they now need to print.
      window.dispatchEvent(new CustomEvent("camp:added", { detail: p }));
    } catch (err) {
      alert(err.message);
    }
  });

  root.querySelectorAll("[data-test]").forEach((b) => {
    b.addEventListener("click", () => testScan(b.dataset.test));
  });

  root.querySelectorAll("[data-remove]").forEach((b) => {
    b.addEventListener("click", () => {
      const p = store.findPerson(b.dataset.remove);
      if (p && confirm(`Remove ${p.name} (${p.id}) and their scan history?`)) {
        store.removePerson(p.id);
        rerender();
      }
    });
  });

  root.querySelector("#export-people").addEventListener("click", () => {
    download(`camp-people-${stamp()}.csv`, store.peopleCSV(), "text/csv");
  });
}
