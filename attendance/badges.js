// Printable badges. One card per person, each with a real Code 128 barcode
// that a normal scanner reads off paper — or straight off the screen, which is
// the quickest way to try the system before anything is printed.

import * as store from "./store.js";
import { toSVG } from "./barcode.js";
import { esc } from "./ui.js";

let group = "all";
let size = "badge"; // "badge" (print) | "big" (one large barcode for testing)

export function view() {
  const groups = [...new Set(store.people().map((p) => p.group).filter(Boolean))];
  const rows = store.people().filter((p) => group === "all" || p.group === group);

  return `
  <section class="badges">
    <div class="toolbar no-print">
      <label>Group
        <select id="group">
          <option value="all">All (${store.people().length})</option>
          ${groups.map((g) => `<option value="${esc(g)}" ${g === group ? "selected" : ""}>${esc(g)}</option>`).join("")}
        </select>
      </label>
      <label>Size
        <select id="size">
          <option value="badge" ${size === "badge" ? "selected" : ""}>Badge cards (print)</option>
          <option value="big" ${size === "big" ? "selected" : ""}>Large (scan off the screen)</option>
        </select>
      </label>
      <button class="btn" id="print">Print badges</button>
    </div>

    <p class="hint no-print">
      Barcodes are Code 128. Any keyboard-wedge scanner reads them with no setup —
      it types the code and presses Enter, which is all the scan station expects.
      Test it now: open the Scan tab on one device and point the scanner at these.
    </p>

    ${rows.length ? `
      <div class="badge-grid ${size === "big" ? "is-big" : ""}">
        ${rows.map(cardHTML).join("")}
      </div>` : `<p class="empty">No one to print yet.</p>`}
  </section>`;
}

function cardHTML(p) {
  const svg = toSVG(p.id, size === "big"
    ? { height: 90, moduleWidth: 3, showText: true }
    : { height: 64, moduleWidth: 2, showText: true });
  return `
  <article class="badge-card">
    <div class="badge-camp">${esc(store.campName())}</div>
    <div class="badge-name">${esc(p.name)}</div>
    <div class="badge-group">${esc(p.group || " ")}${p.role !== "scout" ? ` · ${esc(p.role)}` : ""}</div>
    <div class="badge-code">${svg}</div>
  </article>`;
}

export function mount(root, rerender) {
  root.querySelector("#group").addEventListener("change", (e) => {
    group = e.target.value;
    rerender();
  });
  root.querySelector("#size").addEventListener("change", (e) => {
    size = e.target.value;
    rerender();
  });
  root.querySelector("#print").addEventListener("click", () => window.print());
}
