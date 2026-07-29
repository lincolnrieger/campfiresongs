# Camp Attendance — barcode on-site / off-site tracking

A prototype for tracking, at any moment, **who is on site and who is off site**
at a scout camp. Everyone gets a printed barcode badge at the entrance. It is
scanned when they arrive, scanned again as they board a bus, and scanned once
more as they get off the bus on their return.

No build step, no dependencies, no server. Open it and it works.

## Try it in two minutes

```bash
python3 -m http.server 3000     # from the repository root
```

Then visit <http://localhost:3000/attendance/>.

1. **Data** tab → **Load demo camp**. That gives you 15 made-up people.
2. **Badges** tab → set size to *Large*. Those are real barcodes.
3. **Scan** tab. Point a barcode scanner at the badges on the screen, or just
   type a code (`SC0001`) and press Enter — a scanner does exactly that.

You do not need a scanner to try it. On the **People** tab, every row has a
**Test scan** button that fires that person's barcode at the scan station.

## The four stations

Pick the station once, at the start of the session, and then only scan. The
station is remembered between reloads, so a laptop left at the gate stays set
to the gate.

| Station | Moves people | From |
| --- | --- | --- |
| **Entrance** | → On site | Not arrived, Signed out |
| **Bus — boarding** | → Off site | On site |
| **Bus — returning** | → On site | Off site |
| **Sign out** | → Signed out | On site |

Each station moves people in one direction only. This is the part that makes it
hard to get wrong: the scanner at the bus door **cannot** mark somebody as
having arrived at the gate, no matter who scans what.

## What makes it foolproof

- **One direction per station.** A scan that does not make sense — boarding a
  bus while already off site, signing out while on a trip — is **blocked**. The
  person's status is not changed and the screen turns amber with the reason.
- **Deliberate overrides.** When a block is plausible (a scout who slipped past
  the gate is now boarding a bus), an **Override** button appears. Overrides are
  recorded and flagged in the log, so they can be reviewed later.
- **Double-scans are ignored.** Scanners fire twice more often than you would
  like. The same badge at the same station within 3 seconds counts once.
- **Unknown badges are loud.** A code that is not on the roster goes red and
  changes nothing.
- **The box never loses focus.** A stray click anywhere puts the caret back in
  the scan box within a second, so the next scan cannot vanish.
- **Distinct sounds.** High blip = accepted. Low double buzz = look at the
  screen. Nobody watches a screen while working through a queue.
- **Undo.** One button reverses the last scan, restoring the previous status and
  trip exactly.
- **Everything is logged.** The Log tab holds every scan with its time, station
  and before/after status, exportable as CSV.

## Barcodes

Badges carry **Code 128** barcodes (subset B), generated as SVG by
`barcode.js` — about 60 lines, no library. IDs are `SC0001`, `SC0002`, … —
short, all-uppercase, and unambiguous on a printed badge.

Any **keyboard-wedge** scanner works with no setup or drivers. That is the
common USB and bluetooth kind: it types the code and presses Enter, which is
all the scan page expects. Nothing needs configuring on the scanner.

Print from the **Badges** tab. The barcodes are laid out three to a row with
the quiet zones (the blank margins scanners need) intact — do not crop them.

## Checking it works

Open [`tests.html`](tests.html). It runs 23 self-checks covering the Code 128
encoder (pattern table integrity, checksum arithmetic, module counts, quiet
zone) and the scan rules (each valid transition, blocked transitions, repeat
suppression, overrides, undo, CSV export). Your camp data is saved and restored
around the tests, so running them is safe.

The rendered barcodes were verified against `zbar`, an independent barcode
reader — it decodes the generated badges back to the right IDs.

## The data lives in this browser only

There is no backend. The roster and every scan are in this browser's
`localStorage`, under the key `camp_attendance_v1`. That means:

- Two laptops at two gates each keep **their own separate copy**. For a real
  camp they must share one database.
- Clearing site data erases the camp. Use **Data → Download backup** to keep a
  copy, and **Restore from backup** to move it to another device.

## Moving this to a server later

Every read and write goes through `store.js` — nothing else in the app touches
storage. That file is the whole migration:

1. Make the exported functions (`scan`, `addPerson`, `counts`, …) `async` and
   have them call your API instead of `localStorage`. Call sites are few and
   all of them already re-render from `subscribe()`.
2. Keep `scan()`'s decision logic **on the server**. It is the part that must
   not be trusted to a laptop at the gate, and it is already a single pure
   function of (person status, station).
3. Replace the polling-free `subscribe()` with a websocket or a short poll so
   the gate and the bus see each other's scans.
4. `exportJSON()` produces the whole camp in one object — that is your seed for
   the first import.

## Files

- `index.html` — shell
- `app.js` — tabs and re-rendering
- `store.js` — data model, storage, and **all** the scan rules
- `barcode.js` — Code 128 encoder → SVG
- `scan.js` — the scan station
- `people.js` — roster and live board
- `badges.js` — printable badges
- `log.js` — scan history
- `data.js` — camp name, demo data, backup, reset
- `ui.js` — escaping, time formatting, beeps, downloads
- `tests.html` / `tests.js` — self-checks
