// Audio/video links. We only ever store a provider and a checked ID, and
// build embed URLs ourselves, so a submitted link can never inject anything.

export type MediaProvider = "youtube" | "spotify" | "soundcloud" | "vimeo";
export type Media = { provider: MediaProvider; id: string };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const VIMEO_ID = /^\d{6,12}$/;
const SC_PART = /^[A-Za-z0-9_-]{1,100}$/;

export function parseMediaUrl(raw: string): Media | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtube.com" || host === "music.youtube.com") {
    let id: string | null = null;
    if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") id = parts[1] ?? null;
    return id && YT_ID.test(id) ? { provider: "youtube", id } : null;
  }
  if (host === "youtu.be") {
    const id = parts[0];
    return id && YT_ID.test(id) ? { provider: "youtube", id } : null;
  }
  if (host === "open.spotify.com") {
    // Optional locale prefix like /intl-en/track/ID
    const p = parts[0]?.startsWith("intl-") ? parts.slice(1) : parts;
    const [kind, id] = p;
    if ((kind === "track" || kind === "album" || kind === "playlist" || kind === "episode") && id && SPOTIFY_ID.test(id)) {
      return { provider: "spotify", id: `${kind}/${id}` };
    }
    return null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = parts[0] === "video" ? parts[1] : parts[0];
    return id && VIMEO_ID.test(id) ? { provider: "vimeo", id } : null;
  }
  if (host === "soundcloud.com") {
    const [user, track] = parts;
    if (user && track && parts.length === 2 && SC_PART.test(user) && SC_PART.test(track) && user !== "discover") {
      return { provider: "soundcloud", id: `${user}/${track}` };
    }
    return null;
  }
  return null;
}

/** Rebuild a safe embed URL from a stored provider and ID. Re-checks the ID. */
export function embedUrl(m: Media): string | null {
  switch (m.provider) {
    case "youtube":
      return YT_ID.test(m.id) ? `https://www.youtube-nocookie.com/embed/${m.id}` : null;
    case "vimeo":
      return VIMEO_ID.test(m.id) ? `https://player.vimeo.com/video/${m.id}?dnt=1` : null;
    case "spotify": {
      const [kind, id] = m.id.split("/");
      return ["track", "album", "playlist", "episode"].includes(kind) && id && SPOTIFY_ID.test(id)
        ? `https://open.spotify.com/embed/${kind}/${id}`
        : null;
    }
    case "soundcloud": {
      const [user, track] = m.id.split("/");
      if (!user || !track || !SC_PART.test(user) || !SC_PART.test(track)) return null;
      const target = encodeURIComponent(`https://soundcloud.com/${user}/${track}`);
      return `https://w.soundcloud.com/player/?url=${target}&color=%23f26b1d&visual=false&show_comments=false`;
    }
  }
}

export const PROVIDER_LABEL: Record<MediaProvider, string> = {
  youtube: "YouTube",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  vimeo: "Vimeo",
};
