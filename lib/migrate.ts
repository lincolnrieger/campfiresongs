// Creates and updates the database tables automatically, so a fresh deploy
// works without running any commands. Uses the same `d1_migrations` table as
// `wrangler d1 migrations apply`, so the two never disagree.
import m0001 from "../migrations/0001_init.sql?raw";

const MIGRATIONS: [name: string, sql: string][] = [["0001_init.sql", m0001]];

/** Split a SQL file into statements, keeping trigger bodies (BEGIN ... END;) whole. */
export function splitSql(sql: string): string[] {
  const out: string[] = [];
  let buf = "";
  let depth = 0;
  for (const raw of sql.split("\n")) {
    const line = raw.replace(/--.*$/, "").trim();
    if (!line) continue;
    buf += (buf ? "\n" : "") + line;
    if (/\bBEGIN\b/i.test(line) && /^CREATE\s+TRIGGER/i.test(buf)) depth++;
    if (/^END;$/i.test(line)) depth = Math.max(0, depth - 1);
    if (line.endsWith(";") && depth === 0) {
      out.push(buf.replace(/;$/, ""));
      buf = "";
    }
  }
  if (buf.trim()) out.push(buf);
  return out;
}

let done: Promise<void> | null = null;

export function ensureMigrated(db: D1Database) {
  done ??= run(db).catch((err) => {
    done = null; // try again on the next request
    throw err;
  });
  return done;
}

async function run(db: D1Database) {
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)",
    )
    .run();
  const { results } = await db.prepare("SELECT name FROM d1_migrations").all<{ name: string }>();
  const applied = new Set(results.map((r) => r.name));
  for (const [name, sql] of MIGRATIONS) {
    if (applied.has(name)) continue;
    try {
      // One batch = one transaction. If two requests race, the second fails on
      // the UNIQUE name and rolls back, which is fine.
      await db.batch([
        ...splitSql(sql).map((s) => db.prepare(s)),
        db.prepare("INSERT INTO d1_migrations (name) VALUES (?)").bind(name),
      ]);
    } catch (err) {
      const again = await db.prepare("SELECT 1 FROM d1_migrations WHERE name = ?").bind(name).first();
      if (!again) throw err;
    }
  }
}
