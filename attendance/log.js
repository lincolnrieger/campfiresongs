// Full scan history, newest first. This is the record you fall back on when
// somebody's status looks wrong and you need to see what actually happened.

import * as store from "./store.js";
import { esc, dateTimeOf, download, stamp } from "./ui.js";

let showForcedOnly = false;

export function view() {
  const all = store.scans();
  const rows = [...all].reverse().filter((s) => !showForcedOnly || s.forced);

  return `
  <section class="log">
    <div class="toolbar">
      <span class="muted">${all.length} scan${all.length === 1 ? "" : "s"} recorded</span>
      <label class="check">
        <input type="checkbox" id="forced" ${showForcedOnly ? "checked" : ""} />
        Overrides only
      </label>
      <button class="btn-ghost" id="export-log">Export CSV</button>
    </div>

    ${rows.length ? `
      <div class="table-wrap">
        <table class="log-table">
          <thead>
            <tr><th>Time</th><th>Who</th><th>Station</th><th>Change</th><th>Trip</th></tr>
          </thead>
          <tbody>
            ${rows.map((s) => {
              const p = store.findPerson(s.personId);
              return `<tr class="${s.forced ? "is-forced" : ""}">
                <td class="nowrap">${dateTimeOf(s.at)}</td>
                <td>${esc(p ? p.name : "(removed)")}<small>${esc(s.personId)}</small></td>
                <td>${esc(store.STATIONS[s.station].label)}${s.forced ? ` <span class="tag">override</span>` : ""}</td>
                <td class="nowrap">
                  <span class="tone-${store.STATUS[s.from].tone}">${esc(store.STATUS[s.from].label)}</span>
                  <span class="arrow">→</span>
                  <span class="tone-${store.STATUS[s.to].tone}">${esc(store.STATUS[s.to].label)}</span>
                </td>
                <td>${esc(s.trip || s.fromTrip || "")}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>` : `<p class="empty">Nothing scanned yet.</p>`}
  </section>`;
}

export function mount(root, rerender) {
  root.querySelector("#forced").addEventListener("change", (e) => {
    showForcedOnly = e.target.checked;
    rerender();
  });
  root.querySelector("#export-log").addEventListener("click", () => {
    download(`camp-scans-${stamp()}.csv`, store.scansCSV(), "text/csv");
  });
}
