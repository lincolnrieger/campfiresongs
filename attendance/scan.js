// The scan station. This is the screen that lives on a laptop at the gate or
// on the bus, so it is deliberately the plainest thing in the app: pick the
// station once, then scan. Nothing else on this screen needs touching.

import * as store from "./store.js";
import { esc, timeOf, beep } from "./ui.js";

// A keyboard-wedge barcode scanner (the usual USB / bluetooth kind) simply
// types the code and presses Enter, so the input below does not need any
// scanner-specific driver. It just has to stay focused.

let station = localStorage.getItem("camp_station") || "entrance";
let trip = localStorage.getItem("camp_trip") || "";
let last = null;          // last scan result, shown big
let pending = null;       // a blocked scan awaiting an override decision
let refocusTimer = null;

export function view() {
  const c = store.counts();
  const st = store.STATIONS[station];

  return `
  <section class="scan">
    <div class="station-picker" role="group" aria-label="Scanning station">
      ${Object.entries(store.STATIONS).map(([key, s]) => `
        <button class="station ${key === station ? "is-on" : ""}" data-station="${key}"
                aria-pressed="${key === station}">
          <span class="station-label">${esc(s.label)}</span>
          <span class="station-sub">${esc(s.sub)}</span>
        </button>`).join("")}
    </div>

    ${st.usesTrip ? `
      <label class="trip-row">
        <span>Bus / trip name <em>(optional)</em></span>
        <input id="trip" type="text" value="${esc(trip)}" placeholder="e.g. Hillfort walk"
               autocomplete="off" maxlength="40" />
      </label>` : ""}

    <form id="scan-form" class="scan-box" autocomplete="off">
      <label for="code">Scan a badge <span class="muted">— or type the code and press Enter</span></label>
      <input id="code" name="code" type="text" inputmode="text" autocomplete="off"
             autocapitalize="characters" spellcheck="false" placeholder="Ready to scan…" />
      <button type="submit" class="btn">Enter</button>
    </form>

    <div class="result ${resultClass()}" id="result" aria-live="assertive">
      ${resultHTML()}
    </div>

    <div class="counts">
      <div class="count ok"><b>${c.on_site}</b><span>On site</span></div>
      <div class="count away"><b>${c.off_site}</b><span>Off site</span></div>
      <div class="count idle"><b>${c.expected}</b><span>Not arrived</span></div>
      <div class="count idle"><b>${c.departed}</b><span>Signed out</span></div>
    </div>

    <div class="scan-foot">
      <button class="btn-ghost" id="undo">Undo last scan</button>
      <span class="muted">Station: <b>${esc(st.label)}</b> → marks people <b>${esc(store.STATUS[st.to].label)}</b></span>
    </div>

    ${recentHTML()}
  </section>`;
}

// An override is accepted, but it must not look like a routine scan — staff
// should be able to tell across the room that one went through by hand.
function resultClass() {
  if (!last) return "is-idle";
  if (last.result === "ok" && last.forced) return "is-forced";
  return `is-${last.result}`;
}

function resultHTML() {
  if (!last) {
    return `<p class="result-idle">Waiting for a scan…</p>`;
  }
  if (last.result === "unknown") {
    return `
      <div class="result-head">Not recognised</div>
      <div class="result-name">${esc(last.code || "—")}</div>
      <p class="result-msg">${esc(last.message)}${last.hint ? ` ${esc(last.hint)}` : ""}</p>`;
  }

  const p = last.person;
  const badge = store.STATUS[p.status];
  const head = last.forced
    ? "Accepted — override"
    : { ok: "Accepted", repeat: "Already scanned", blocked: "Check this", undone: "Undone" }[last.result];

  return `
    <div class="result-head">${head}</div>
    <div class="result-name">${esc(p.name)}</div>
    <div class="result-meta">${esc(p.id)}${p.group ? ` · ${esc(p.group)}` : ""}${p.trip ? ` · ${esc(p.trip)}` : ""}</div>
    <p class="result-msg">${esc(last.message)}${last.forced ? " Forced through by hand — it is flagged in the log." : ""}</p>
    <div class="result-status">Now: <b>${esc(badge.label)}</b></div>
    ${last.result === "blocked" && last.canOverride ? `
      <div class="override">
        <button class="btn-warn" id="override">Override — mark ${esc(store.STATUS[store.STATIONS[last.station].to].label.toLowerCase())} anyway</button>
        <button class="btn-ghost" id="dismiss">Cancel</button>
      </div>` : ""}`;
}

function recentHTML() {
  const rows = store.scans().slice(-6).reverse();
  if (!rows.length) return "";
  return `
    <div class="recent">
      <h3>Last few scans</h3>
      <ul>
        ${rows.map((s) => {
          const p = store.findPerson(s.personId);
          return `<li>
            <span class="t">${timeOf(s.at)}</span>
            <span class="n">${esc(p ? p.name : s.personId)}</span>
            <span class="s tone-${store.STATUS[s.to].tone}">${esc(store.STATUS[s.to].label)}</span>
            <span class="w">${esc(store.STATIONS[s.station].label)}${s.forced ? " · forced" : ""}</span>
          </li>`;
        }).join("")}
      </ul>
    </div>`;
}

export function mount(root, rerender) {
  const input = root.querySelector("#code");
  const focus = () => { if (input && document.body.contains(input)) input.focus(); };
  focus();

  // Keep the caret in the box no matter what gets clicked. Without this a stray
  // click sends the next scan into the void, which is exactly the failure this
  // system cannot have.
  clearInterval(refocusTimer);
  refocusTimer = setInterval(() => {
    const active = document.activeElement;
    const typingElsewhere = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" ||
      active.tagName === "SELECT" || active.isContentEditable);
    if (!typingElsewhere) focus();
  }, 600);

  root.querySelectorAll("[data-station]").forEach((b) => {
    b.addEventListener("click", () => {
      station = b.dataset.station;
      localStorage.setItem("camp_station", station);
      last = null;
      pending = null;
      rerender();
    });
  });

  const tripInput = root.querySelector("#trip");
  if (tripInput) {
    tripInput.addEventListener("input", () => {
      trip = tripInput.value;
      localStorage.setItem("camp_trip", trip);
    });
  }

  root.querySelector("#scan-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = input.value;
    input.value = "";
    if (!code.trim()) return;
    handle(code, rerender);
  });

  const overrideBtn = root.querySelector("#override");
  if (overrideBtn) {
    overrideBtn.addEventListener("click", () => {
      if (!pending) return;
      last = store.scan(pending.code, pending.station, { trip, override: true });
      pending = null;
      beep(last.result === "ok" ? "ok" : "error");
      rerender();
    });
  }
  const dismiss = root.querySelector("#dismiss");
  if (dismiss) dismiss.addEventListener("click", () => { last = null; pending = null; rerender(); });

  root.querySelector("#undo").addEventListener("click", () => {
    const undone = store.undoLastScan();
    if (!undone) { last = null; pending = null; return rerender(); }
    last = {
      result: "undone",
      person: undone.person || { name: undone.personId, id: undone.personId, group: "", status: undone.from, trip: "" },
      message: `Undone — ${store.STATIONS[undone.station].label} scan reversed.`,
    };
    pending = null;
    beep("repeat");
    rerender();
  });
}

/** Exposed so the People tab can fire a test scan without a physical scanner. */
export function handle(code, rerender) {
  last = store.scan(code, station, { trip });
  pending = last.result === "blocked" && last.canOverride ? { code, station } : null;
  beep({ ok: "ok", repeat: "repeat", blocked: "warn", unknown: "error" }[last.result]);
  rerender();
}

export function currentStation() { return store.STATIONS[station].label; }

export function unmount() { clearInterval(refocusTimer); refocusTimer = null; }
