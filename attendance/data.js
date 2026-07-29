// Camp name, demo data, backup / restore, and the reset button.
//
// Everything here is deliberately blunt: this prototype keeps its data in one
// browser, so exporting a backup is the only way to move it anywhere else.

import * as store from "./store.js";
import { esc, isMuted, setMuted, download, stamp } from "./ui.js";

export function view() {
  const c = store.counts();
  return `
  <section class="data">
    <div class="panel">
      <h3>Camp</h3>
      <label class="field">
        <span>Camp name (shown on badges)</span>
        <input id="camp-name" type="text" value="${esc(store.campName())}" maxlength="40" />
      </label>
      <label class="check">
        <input type="checkbox" id="mute" ${isMuted() ? "checked" : ""} />
        Silence scan beeps
      </label>
    </div>

    <div class="panel">
      <h3>Try it out</h3>
      <p class="muted">Loads 15 made-up scouts and leaders so you can print badges and
      run the whole flow without typing a roster first.</p>
      <button class="btn" id="seed">Load demo camp</button>
    </div>

    <div class="panel">
      <h3>Backup</h3>
      <p class="muted">${c.total} people, ${store.scans().length} scans. There is no server —
      this is the only copy, and it lives in this browser.</p>
      <div class="row">
        <button class="btn-ghost" id="export">Download backup (JSON)</button>
        <label class="btn-ghost file">
          Restore from backup<input type="file" id="import" accept="application/json,.json" hidden />
        </label>
      </div>
    </div>

    <div class="panel danger">
      <h3>Reset</h3>
      <p class="muted">Deletes every person and every scan on this device.</p>
      <button class="btn-warn" id="reset">Erase everything</button>
    </div>
  </section>`;
}

export function mount(root, rerender) {
  const name = root.querySelector("#camp-name");
  name.addEventListener("change", () => store.setCampName(name.value));

  root.querySelector("#mute").addEventListener("change", (e) => setMuted(e.target.checked));

  root.querySelector("#seed").addEventListener("click", () => {
    if (store.people().length && !confirm("Add 15 demo people to the existing roster?")) return;
    store.seedDemo();
    rerender();
  });

  root.querySelector("#export").addEventListener("click", () => {
    download(`camp-backup-${stamp()}.json`, store.exportJSON(), "application/json");
  });

  root.querySelector("#import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm("Restoring replaces everything currently on this device. Continue?")) {
      e.target.value = "";
      return;
    }
    try {
      store.importJSON(await file.text());
      rerender();
    } catch (err) {
      alert(`Could not restore: ${err.message}`);
    }
    e.target.value = "";
  });

  root.querySelector("#reset").addEventListener("click", () => {
    if (confirm("Erase all people and scans on this device? This cannot be undone.")) {
      store.resetAll();
      rerender();
    }
  });
}
