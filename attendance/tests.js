// Self-checks for the two parts that are easy to get quietly wrong: the Code
// 128 encoder and the scan rules. Open tests.html to run them.
//
// The store keeps real camp data, so these tests snapshot it, run against a
// blank slate, and put the original back at the end.

import * as bc from "./barcode.js";
import * as store from "./store.js";

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (err) {
    results.push({ name, ok: false, message: err.message });
  }
}
function eq(actual, expected, what = "value") {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what}: expected ${e}, got ${a}`);
}
function ok(cond, message) {
  if (!cond) throw new Error(message);
}

/* ---------------- Code 128 ---------------- */

test("pattern table has 107 entries", () => {
  eq(bc._internals.PATTERNS.length, 107, "pattern count");
});

test("every symbol is 11 modules wide (stop is 13)", () => {
  bc._internals.PATTERNS.forEach((p, i) => {
    const widths = [...p].map(Number);
    const expectedLen = i === bc._internals.STOP ? 7 : 6;
    const expectedSum = i === bc._internals.STOP ? 13 : 11;
    eq(widths.length, expectedLen, `pattern ${i} element count`);
    eq(widths.reduce((a, b) => a + b, 0), expectedSum, `pattern ${i} module sum`);
    ok(widths.every((w) => w >= 1 && w <= 4), `pattern ${i} has an out-of-range width`);
  });
});

test('"A" encodes to start-B, 33, check 34, stop', () => {
  // 'A' is ASCII 65, so its Code 128B value is 65 - 32 = 33.
  // check = (104 + 1*33) mod 103 = 137 mod 103 = 34.
  eq(bc.symbolValues("A"), [104, 33, 34, 106]);
});

test("checksum matches an independent calculation", () => {
  const text = "SC0042";
  const values = [...text].map((c) => c.charCodeAt(0) - 32);
  let sum = 104;
  values.forEach((v, i) => { sum += v * (i + 1); });
  const expected = [104, ...values, sum % 103, 106];
  eq(bc.symbolValues(text), expected);
  ok(expected[expected.length - 2] >= 0 && expected[expected.length - 2] < 103, "check symbol out of range");
});

test("symbol count and total modules are right for any length", () => {
  ["S", "SC0001", "SC0001-LEADER"].forEach((text) => {
    const vals = bc.symbolValues(text);
    eq(vals.length, text.length + 3, `symbol count for ${text}`);
    const modules = bc.moduleWidths(text).reduce((a, b) => a + b, 0);
    // start + data + check are 11 modules each; stop is 13.
    eq(modules, 11 * (text.length + 2) + 13, `module count for ${text}`);
  });
});

test("bars and spaces alternate starting and ending with a bar", () => {
  const widths = bc.moduleWidths("SC0007");
  // Every symbol contributes 6 elements (bar,space,...) and the stop pattern 7,
  // so the final element is a bar — required for the symbol to be readable.
  eq(widths.length % 2, 1, "element count parity (must end on a bar)");
});

test("rejects characters outside Code 128B", () => {
  ok(!bc.encodable("café"), "accented text should be rejected");
  ok(!bc.encodable(""), "empty text should be rejected");
  ok(bc.encodable("SC0001"), "plain ID should be accepted");
  let threw = false;
  try { bc.symbolValues("café"); } catch { threw = true; }
  ok(threw, "symbolValues should throw on unencodable text");
});

test("SVG includes a quiet zone and one rect per bar", () => {
  const svg = bc.toSVG("SC0001", { quietZone: 10, moduleWidth: 2, showText: false });
  const bars = (svg.match(/<rect x=/g) || []).length;
  eq(bars, Math.ceil(bc.moduleWidths("SC0001").length / 2), "bar count");
  const modules = bc.moduleWidths("SC0001").reduce((a, b) => a + b, 0);
  ok(svg.includes(`viewBox="0 0 ${modules + 20}`), "quiet zone missing from viewBox");
});

/* ---------------- scan rules ---------------- */

const snapshot = store.exportJSON();
try {
  store.resetAll();
  const ava = store.addPerson({ name: "Ava Whitlock", group: "Kestrels" });
  const ben = store.addPerson({ name: "Ben Oyelaran", group: "Kestrels" });
  let t = Date.parse("2026-07-29T09:00:00Z");
  const at = (mins) => t + mins * 60000;

  test("new people get sequential barcodes and start off the roll", () => {
    eq(ava.id, "SC0001");
    eq(ben.id, "SC0002");
    eq(ava.status, "expected");
  });

  test("unknown barcodes are rejected and not logged", () => {
    const before = store.scans().length;
    const r = store.scan("SC9999", "entrance", { now: at(0) });
    eq(r.result, "unknown");
    eq(store.scans().length, before, "scan count");
  });

  test("barcodes are matched case-insensitively and trimmed", () => {
    const r = store.scan("  sc0001 ", "entrance", { now: at(1) });
    eq(r.result, "ok");
    eq(store.findPerson("SC0001").status, "on_site");
  });

  test("boarding the bus moves someone off site and records the trip", () => {
    const r = store.scan("SC0001", "bus_out", { trip: "Hillfort walk", now: at(10) });
    eq(r.result, "ok");
    eq(store.findPerson("SC0001").status, "off_site");
    eq(store.findPerson("SC0001").trip, "Hillfort walk");
  });

  test("a repeated scan inside the repeat window changes nothing", () => {
    const before = store.scans().length;
    const r = store.scan("SC0001", "bus_out", { trip: "Hillfort walk", now: at(10) + 500 });
    eq(r.result, "repeat");
    eq(store.scans().length, before, "scan count");
    eq(store.findPerson("SC0001").status, "off_site");
  });

  test("the wrong scanner is blocked, not silently applied", () => {
    const r = store.scan("SC0001", "bus_out", { now: at(20) });
    eq(r.result, "blocked");
    eq(r.canOverride, false, "already off site — nothing to override");
    eq(store.findPerson("SC0001").status, "off_site");
  });

  test("signing out while off site is blocked", () => {
    const r = store.scan("SC0001", "signout", { now: at(21) });
    eq(r.result, "blocked");
    eq(store.findPerson("SC0001").status, "off_site");
  });

  test("returning on the bus brings them back on site and clears the trip", () => {
    const r = store.scan("SC0001", "bus_in", { now: at(30) });
    eq(r.result, "ok");
    eq(store.findPerson("SC0001").status, "on_site");
    eq(store.findPerson("SC0001").trip, "");
  });

  test("someone who never checked in is blocked at the bus, with an override", () => {
    const r = store.scan("SC0002", "bus_out", { trip: "Hillfort walk", now: at(31) });
    eq(r.result, "blocked");
    eq(r.canOverride, true);
    eq(store.findPerson("SC0002").status, "expected");
  });

  test("an override forces the move and is flagged in the log", () => {
    const r = store.scan("SC0002", "bus_out", { trip: "Hillfort walk", override: true, now: at(32) });
    eq(r.result, "ok");
    eq(r.forced, true);
    eq(store.findPerson("SC0002").status, "off_site");
    eq(store.scans()[store.scans().length - 1].forced, true, "log entry forced flag");
  });

  test("undo puts the person back exactly as they were", () => {
    const undone = store.undoLastScan();
    eq(undone.personId, "SC0002");
    eq(store.findPerson("SC0002").status, "expected");
    eq(store.findPerson("SC0002").trip, "");
    eq(store.findPerson("SC0002").lastScanAt, null, "last scan time");
  });

  test("counts add up to the roster", () => {
    const c = store.counts();
    eq(c.total, 2);
    eq(c.on_site, 1);
    eq(c.expected, 1);
    eq(c.on_site + c.off_site + c.expected + c.departed, c.total, "status totals");
  });

  test("signing out at the end of camp works from on site", () => {
    const r = store.scan("SC0001", "signout", { now: at(600) });
    eq(r.result, "ok");
    eq(store.findPerson("SC0001").status, "departed");
  });

  test("CSV exports carry a header and one row per record", () => {
    const people = store.peopleCSV().trim().split("\n");
    eq(people.length, 3, "people CSV line count");
    ok(people[0].startsWith("barcode,name"), "people CSV header");
    const scans = store.scansCSV().trim().split("\n");
    eq(scans.length, store.scans().length + 1, "scan CSV line count");
  });

  test("every roster barcode can actually be printed as a barcode", () => {
    store.people().forEach((p) => ok(bc.encodable(p.id), `${p.id} is not encodable`));
  });
} finally {
  store.importJSON(snapshot);
}

/* ---------------- report ---------------- */

const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
document.getElementById("summary").innerHTML =
  `<b class="${failed ? "bad" : "good"}">${passed}/${results.length} passed</b>` +
  (failed ? ` — ${failed} failed` : " — everything checks out");
document.getElementById("summary").className = failed ? "bad" : "good";
document.getElementById("results").innerHTML = results.map((r) => `
  <li class="${r.ok ? "good" : "bad"}">
    <span>${r.ok ? "PASS" : "FAIL"}</span>
    <div>${r.name}${r.message ? `<em>${r.message.replace(/[<&]/g, (c) => (c === "<" ? "&lt;" : "&amp;"))}</em>` : ""}</div>
  </li>`).join("");
