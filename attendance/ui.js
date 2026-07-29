// Small shared helpers: escaping, time formatting, feedback beeps, downloads.

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function timeOf(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function dateTimeOf(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { day: "numeric", month: "short" })} ${timeOf(iso)}`;
}

export function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

/* ---------------- audio feedback ----------------
   A camp gate is loud and nobody watches the screen while scanning a queue, so
   each outcome gets its own sound: a short high blip for accepted, a low double
   buzz for anything that needs a human to look up. */

let ctx = null;
let muted = localStorage.getItem("camp_muted") === "1";

export function isMuted() { return muted; }
export function setMuted(v) {
  muted = !!v;
  localStorage.setItem("camp_muted", muted ? "1" : "0");
}

function tone(freq, start, duration, gainValue = 0.16) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime + start);
  gain.gain.linearRampToValueAtTime(gainValue, ctx.currentTime + start + 0.008);
  gain.gain.setValueAtTime(gainValue, ctx.currentTime + start + duration - 0.02);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.02);
}

export function beep(kind) {
  if (muted) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    if (kind === "ok") tone(1180, 0, 0.09);
    else if (kind === "repeat") tone(760, 0, 0.07, 0.1);
    else if (kind === "warn") { tone(520, 0, 0.13); tone(430, 0.16, 0.18); }
    else { tone(300, 0, 0.2); tone(220, 0.23, 0.3); }
  } catch {
    /* audio is a nicety; never let it break a scan */
  }
}

/* ---------------- downloads ---------------- */

export function download(filename, text, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
