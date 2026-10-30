import { sha1Upper } from "../crypto";

/**
 * Has this password turned up in a known data breach? Uses Have I Been
 * Pwned's k-anonymity API: only the first 5 characters of the password's
 * SHA-1 hash ever leave our server. If the check can't run, we let it through.
 */
export async function isPwned(password: string) {
  try {
    const hash = await sha1Upper(password);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
      headers: { "Add-Padding": "true", "User-Agent": "CampfireSongs" },
    });
    if (!res.ok) return false;
    const suffix = hash.slice(5);
    const body = await res.text();
    return body.split("\n").some((line) => {
      const [s, count] = line.trim().split(":");
      return s === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}
