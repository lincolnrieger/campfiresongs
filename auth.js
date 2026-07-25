// Lightweight, on-device accounts. There is no server: users, password hashes,
// and favourites all live in this browser's localStorage. This is fine for a
// prototype but is NOT real authentication — the UI says so plainly, and no one
// should reuse an important password here.

const USERS_KEY = "cfs_users";
const SESSION_KEY = "cfs_session";

async function sha256(text) {
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // fallback (non-secure contexts only): simple non-crypto digest
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return "x" + (h >>> 0).toString(16);
}

const load = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
  catch { return fallback; }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

function getUsers() { return load(USERS_KEY, {}); }

export function currentSession() { return load(SESSION_KEY, null); }

export async function signUp(name, email, password) {
  name = name.trim();
  email = email.trim().toLowerCase();
  if (!name) throw new Error("Please enter your name.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Please enter a valid email.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  const users = getUsers();
  if (users[email]) throw new Error("An account with that email already exists on this device.");

  const salt = crypto.getRandomValues(new Uint32Array(2)).join("-");
  users[email] = { name, salt, hash: await sha256(salt + password) };
  save(USERS_KEY, users);

  const session = { type: "user", email, name };
  save(SESSION_KEY, session);
  return session;
}

export async function logIn(email, password) {
  email = email.trim().toLowerCase();
  const user = getUsers()[email];
  if (!user) throw new Error("No account found for that email on this device.");
  if ((await sha256(user.salt + password)) !== user.hash) throw new Error("Incorrect password.");

  const session = { type: "user", email, name: user.name };
  save(SESSION_KEY, session);
  return session;
}

export function continueAsGuest() {
  const session = { type: "guest", name: "Guest" };
  save(SESSION_KEY, session);
  return session;
}

export function logOut() { localStorage.removeItem(SESSION_KEY); }

// ---- Favourites, scoped to the current session ----
function favKey() {
  const s = currentSession();
  return "cfs_fav_" + (s && s.type === "user" ? s.email : "guest");
}
export function getFavourites() { return load(favKey(), []); }
export function isFavourite(slug) { return getFavourites().includes(slug); }
export function toggleFavourite(slug) {
  const favs = getFavourites();
  const i = favs.indexOf(slug);
  if (i === -1) favs.push(slug);
  else favs.splice(i, 1);
  save(favKey(), favs);
  return i === -1; // true if now favourited
}
