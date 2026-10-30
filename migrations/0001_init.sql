-- CampfireSongs schema (Cloudflare D1 / SQLite).
--
-- D1 has no row level security, so every read and write goes through the
-- server-only data layer in lib/data, which checks the caller's role on every
-- call. The database itself is only reachable from the Worker.

PRAGMA foreign_keys = ON;

-- People with accounts. Role is checked on the server for every request.
CREATE TABLE users (
  id                TEXT PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,          -- stored lower-case
  password_hash     TEXT,                          -- null for magic-link-only accounts
  display_name      TEXT,
  show_name         INTEGER NOT NULL DEFAULT 0,    -- 1 = show display name on songs
  role              TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'reviewer', 'admin')),
  email_verified_at INTEGER,
  created_at        INTEGER NOT NULL
);

-- Login sessions. Only a SHA-256 hash of the cookie value is stored.
CREATE TABLE sessions (
  id_hash    TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

-- One-time tokens sent by email. Only the hash is stored.
CREATE TABLE email_tokens (
  token_hash    TEXT PRIMARY KEY,
  purpose       TEXT NOT NULL CHECK (purpose IN ('verify', 'reset', 'magic', 'confirm_submission')),
  user_id       TEXT REFERENCES users(id) ON DELETE CASCADE,
  submission_id TEXT REFERENCES submissions(id) ON DELETE CASCADE,
  expires_at    INTEGER NOT NULL,
  used_at       INTEGER,
  created_at    INTEGER NOT NULL
);

-- Everything people send in. Private: never shown publicly.
CREATE TABLE submissions (
  id             TEXT PRIMARY KEY,
  status         TEXT NOT NULL CHECK (status IN ('unconfirmed', 'pending', 'approved', 'rejected')),
  title          TEXT NOT NULL,
  lyrics         TEXT NOT NULL,
  chords         TEXT,
  actions        TEXT,
  media_url      TEXT,
  categories     TEXT NOT NULL DEFAULT '[]',       -- JSON array
  sections       TEXT NOT NULL DEFAULT '[]',       -- JSON array
  energy         TEXT NOT NULL CHECK (energy IN ('calm', 'medium', 'high')),
  origin         TEXT,
  notes          TEXT,                              -- notes for reviewers
  credit_name    TEXT,
  email          TEXT,                              -- only for people without an account
  user_id        TEXT REFERENCES users(id) ON DELETE CASCADE,
  review_note    TEXT,
  reviewed_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at    INTEGER,
  decision_sent_at INTEGER,
  song_id        TEXT,
  created_at     INTEGER NOT NULL,
  confirmed_at   INTEGER,
  updated_at     INTEGER NOT NULL
);
CREATE INDEX submissions_status ON submissions(status, created_at);
CREATE INDEX submissions_user ON submissions(user_id);

-- The public song bank. Only rows with published = 1 are ever shown.
CREATE TABLE songs (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  submission_id  TEXT REFERENCES submissions(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  lyrics         TEXT NOT NULL,
  chords         TEXT,
  actions        TEXT,
  media_provider TEXT CHECK (media_provider IN ('youtube', 'spotify', 'soundcloud', 'vimeo')),
  media_id       TEXT,
  categories     TEXT NOT NULL DEFAULT '[]',
  sections       TEXT NOT NULL DEFAULT '[]',
  energy         TEXT NOT NULL CHECK (energy IN ('calm', 'medium', 'high')),
  origin         TEXT,
  credit_name    TEXT,
  published      INTEGER NOT NULL DEFAULT 1,
  published_at   INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);
CREATE INDEX songs_published ON songs(published, title);

-- Full-text search over title and lyrics.
CREATE VIRTUAL TABLE songs_fts USING fts5(title, lyrics, content='songs', content_rowid='rowid', tokenize='unicode61 remove_diacritics 2');
CREATE TRIGGER songs_ai AFTER INSERT ON songs BEGIN
  INSERT INTO songs_fts(rowid, title, lyrics) VALUES (new.rowid, new.title, new.lyrics);
END;
CREATE TRIGGER songs_ad AFTER DELETE ON songs BEGIN
  INSERT INTO songs_fts(songs_fts, rowid, title, lyrics) VALUES ('delete', old.rowid, old.title, old.lyrics);
END;
CREATE TRIGGER songs_au AFTER UPDATE ON songs BEGIN
  INSERT INTO songs_fts(songs_fts, rowid, title, lyrics) VALUES ('delete', old.rowid, old.title, old.lyrics);
  INSERT INTO songs_fts(rowid, title, lyrics) VALUES (new.rowid, new.title, new.lyrics);
END;

CREATE TABLE favourites (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id    TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, song_id)
);

-- Who did what. Rows are only ever inserted.
CREATE TABLE audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id    TEXT,
  actor_label TEXT NOT NULL,     -- display name or email at the time, so the log survives account deletion
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  detail      TEXT,
  created_at  INTEGER NOT NULL
);
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;

-- "Report a problem" on a song.
CREATE TABLE reports (
  id          TEXT PRIMARY KEY,
  song_id     TEXT REFERENCES songs(id) ON DELETE SET NULL,
  song_title  TEXT NOT NULL,
  reason      TEXT NOT NULL CHECK (reason IN ('copyright', 'inappropriate', 'mistake', 'other')),
  message     TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  resolved_at INTEGER,
  resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL
);

-- Fixed-window rate limit counters. Keys are hashed, never raw IPs or emails.
CREATE TABLE rate_limits (
  key          TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL
);
