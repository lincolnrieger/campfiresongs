// All camp data + the rules that decide what a scan is allowed to do.
//
// STORAGE: everything lives in this browser's localStorage. There is no server
// and no shared database — two laptops at the gate would each have their own
// separate copy. See README.md for what swapping this for a real database
// involves; every read/write in the app goes through this file, on purpose.

const KEY = "camp_attendance_v1";

/* ---------------- statuses & stations ---------------- */

export const STATUS = {
  expected: { label: "Not arrived", short: "Not arrived", tone: "idle" },
  on_site: { label: "On site", short: "On site", tone: "ok" },
  off_site: { label: "Off site", short: "Off site", tone: "away" },
  departed: { label: "Signed out", short: "Signed out", tone: "idle" },
};

// A station is one physical scanning point. Each one only ever moves people in
// one direction, which is what keeps this foolproof: the scanner at the bus
// door cannot accidentally mark somebody as arrived at the gate.
export const STATIONS = {
  entrance: {
    label: "Entrance",
    sub: "Arriving at camp",
    to: "on_site",
    from: ["expected", "departed"],
    verb: "checked in",
  },
  bus_out: {
    label: "Bus — boarding",
    sub: "Leaving site",
    to: "off_site",
    from: ["on_site"],
    verb: "boarded",
    usesTrip: true,
  },
  bus_in: {
    label: "Bus — returning",
    sub: "Back on site",
    to: "on_site",
    from: ["off_site"],
    verb: "returned",
    usesTrip: true,
  },
  signout: {
    label: "Sign out",
    sub: "Leaving camp for good",
    to: "departed",
    from: ["on_site"],
    verb: "signed out",
  },
};

/* ---------------- persistence ---------------- */

function blank() {
  return { version: 1, campName: "Scout Camp", people: [], scans: [], nextSeq: 1 };
}

let state = null;

function read() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? { ...blank(), ...JSON.parse(raw) } : blank();
  } catch {
    state = blank();
  }
  return state;
}

function write() {
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((fn) => fn(state));
}

const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState() { return read(); }
export function people() { return read().people; }
export function scans() { return read().scans; }
export function campName() { return read().campName; }

export function setCampName(name) {
  read().campName = name.trim() || "Scout Camp";
  write();
}

/* ---------------- people ---------------- */

/** Barcode IDs are short and unambiguous: SC + 4 digits, e.g. SC0007. */
function nextId() {
  const s = read();
  let id;
  do {
    id = "SC" + String(s.nextSeq++).padStart(4, "0");
  } while (s.people.some((p) => p.id === id));
  return id;
}

export function findPerson(id) {
  const needle = String(id || "").trim().toUpperCase();
  return read().people.find((p) => p.id === needle) || null;
}

export function addPerson({ name, group = "", role = "scout" }) {
  name = String(name || "").trim();
  if (!name) throw new Error("Please enter a name.");
  const s = read();
  const person = {
    id: nextId(),
    name,
    group: String(group || "").trim(),
    role,
    status: "expected",
    trip: "",
    lastScanAt: null,
  };
  s.people.push(person);
  write();
  return person;
}

export function updatePerson(id, changes) {
  const p = findPerson(id);
  if (!p) throw new Error(`No such barcode: ${id}`);
  if ("name" in changes) {
    const name = String(changes.name).trim();
    if (!name) throw new Error("Name cannot be empty.");
    p.name = name;
  }
  if ("group" in changes) p.group = String(changes.group).trim();
  if ("role" in changes) p.role = changes.role;
  write();
  return p;
}

/** Removes a person and their scan history. Used by the roster editor. */
export function removePerson(id) {
  const s = read();
  s.people = s.people.filter((p) => p.id !== id);
  s.scans = s.scans.filter((sc) => sc.personId !== id);
  write();
}

export function counts() {
  const c = { expected: 0, on_site: 0, off_site: 0, departed: 0, total: 0 };
  read().people.forEach((p) => { c[p.status]++; c.total++; });
  return c;
}

/* ---------------- scanning ---------------- */

// Scanners fire twice more often than you would like, and a scout waving a
// badge at the reader can trigger a burst. A repeat of the same code at the
// same station inside this window is treated as one scan.
export const REPEAT_WINDOW_MS = 3000;

/**
 * Handle one scan.
 *
 * Returns a result object; it never throws for bad input, because the person
 * holding the scanner needs an answer on screen, not an exception.
 *   { result: "ok" | "repeat" | "blocked" | "unknown", ... }
 *
 * A "blocked" result means the barcode is valid but the move makes no sense at
 * this station (boarding a bus while already off site). Nothing is changed;
 * `canOverride` says whether staff may force it through with `override: true`.
 */
export function scan(rawCode, stationKey, { trip = "", override = false, now = Date.now() } = {}) {
  const station = STATIONS[stationKey];
  if (!station) throw new Error(`Unknown station: ${stationKey}`);

  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) return { result: "unknown", code, message: "Nothing scanned." };

  const person = findPerson(code);
  if (!person) {
    return {
      result: "unknown",
      code,
      message: `Barcode ${code} is not on the roster.`,
      hint: "Check the badge, or add them on the People tab.",
    };
  }

  const s = read();
  if (!override) {
    const last = s.scans[s.scans.length - 1];
    if (last && last.personId === person.id && last.station === stationKey &&
        now - Date.parse(last.at) < REPEAT_WINDOW_MS) {
      return {
        result: "repeat", person, station: stationKey,
        message: `${person.name} was already ${station.verb} a moment ago.`,
      };
    }
  }

  const allowed = station.from.includes(person.status);
  if (!allowed && !override) {
    return {
      result: "blocked",
      person,
      station: stationKey,
      canOverride: person.status !== station.to,
      message: blockedMessage(person, station, stationKey),
    };
  }

  const from = person.status;
  const fromTrip = person.trip;
  person.status = station.to;
  person.trip = station.usesTrip && station.to === "off_site" ? trip.trim() : "";
  person.lastScanAt = new Date(now).toISOString();

  s.scans.push({
    at: person.lastScanAt,
    personId: person.id,
    station: stationKey,
    from,
    to: person.status,
    fromTrip,
    trip: person.trip,
    forced: !!override && !allowed,
  });
  write();

  return {
    result: "ok",
    person,
    station: stationKey,
    from,
    to: person.status,
    forced: !!override && !allowed,
    message: `${person.name} ${station.verb}.`,
  };
}

function blockedMessage(person, station, stationKey) {
  if (person.status === station.to) {
    return `${person.name} is already ${STATUS[person.status].label.toLowerCase()}.`;
  }
  if (person.status === "expected") {
    return `${person.name} has not checked in at the entrance yet.`;
  }
  if (person.status === "departed") {
    return `${person.name} was signed out of camp.`;
  }
  if (stationKey === "bus_out" && person.status === "off_site") {
    return `${person.name} is already off site${person.trip ? ` (${person.trip})` : ""}.`;
  }
  if (stationKey === "signout" && person.status === "off_site") {
    return `${person.name} is off site — only sign them out if they left straight from the trip.`;
  }
  return `${person.name} is ${STATUS[person.status].label.toLowerCase()}.`;
}

/** Reverses the most recent state-changing scan. Returns it, or null. */
export function undoLastScan() {
  const s = read();
  const last = s.scans.pop();
  if (!last) return null;
  const person = findPerson(last.personId);
  if (person) {
    person.status = last.from;
    person.trip = last.fromTrip || "";
    const prev = [...s.scans].reverse().find((sc) => sc.personId === person.id);
    person.lastScanAt = prev ? prev.at : null;
  }
  write();
  return { ...last, person };
}

/* ---------------- demo data, export, reset ---------------- */

const DEMO = [
  ["Ava Whitlock", "Kestrels", "scout"], ["Ben Oyelaran", "Kestrels", "scout"],
  ["Cara Nightingale", "Kestrels", "scout"], ["Dylan Frost", "Kestrels", "scout"],
  ["Esme Rahal", "Otters", "scout"], ["Finn Kowalski", "Otters", "scout"],
  ["Gracie Lam", "Otters", "scout"], ["Hari Mensah", "Otters", "scout"],
  ["Isla Brennan", "Badgers", "scout"], ["Jonah Petrie", "Badgers", "scout"],
  ["Kit Adeyemi", "Badgers", "scout"], ["Lena Vasquez", "Badgers", "scout"],
  ["Marta Sorensen", "Leaders", "leader"], ["Niall Okonkwo", "Leaders", "leader"],
  ["Priya Raman", "Leaders", "leader"],
];

export function seedDemo() {
  DEMO.forEach(([name, group, role]) => addPerson({ name, group, role }));
  return read().people;
}

export function resetAll() {
  state = blank();
  write();
}

export function exportJSON() {
  return JSON.stringify(read(), null, 2);
}

export function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.people)) throw new Error("That file does not look like a camp export.");
  state = { ...blank(), ...data };
  write();
}

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function peopleCSV() {
  const rows = [["barcode", "name", "group", "role", "status", "trip", "last_scan"]];
  read().people.forEach((p) => rows.push([p.id, p.name, p.group, p.role, STATUS[p.status].label, p.trip, p.lastScanAt || ""]));
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

export function scansCSV() {
  const rows = [["time", "barcode", "name", "station", "from", "to", "trip", "forced"]];
  read().scans.forEach((sc) => {
    const p = findPerson(sc.personId);
    rows.push([sc.at, sc.personId, p ? p.name : "(removed)", STATIONS[sc.station].label,
      STATUS[sc.from].label, STATUS[sc.to].label, sc.trip || "", sc.forced ? "yes" : ""]);
  });
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}
