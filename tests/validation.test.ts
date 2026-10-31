import { describe, expect, it } from "vitest";
import { embedUrl, parseMediaUrl } from "@/lib/media";
import { safeNext } from "@/lib/auth/next";
import { anonymousSubmissionSchema, cleanText, signUpSchema } from "@/lib/validation";

describe("media links", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", { provider: "youtube", id: "dQw4w9WgXcQ" }],
    ["https://youtu.be/dQw4w9WgXcQ?t=10", { provider: "youtube", id: "dQw4w9WgXcQ" }],
    ["https://m.youtube.com/shorts/dQw4w9WgXcQ", { provider: "youtube", id: "dQw4w9WgXcQ" }],
    ["https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC", { provider: "spotify", id: "track/4uLU6hMCjMI75M1A2tKUQC" }],
    ["https://open.spotify.com/intl-en/album/4uLU6hMCjMI75M1A2tKUQC", { provider: "spotify", id: "album/4uLU6hMCjMI75M1A2tKUQC" }],
    ["https://vimeo.com/76979871", { provider: "vimeo", id: "76979871" }],
    ["https://soundcloud.com/some-artist/a-song", { provider: "soundcloud", id: "some-artist/a-song" }],
  ])("accepts %s", (url, expected) => {
    expect(parseMediaUrl(url)).toEqual(expected);
  });

  it.each([
    "javascript:alert(1)",
    "https://evil.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ\"><script>",
    "https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ",
    "https://open.spotify.com/track/short",
    "https://soundcloud.com/a/b/c",
    "not a url",
  ])("rejects %s", (url) => {
    expect(parseMediaUrl(url)).toBeNull();
  });

  it("builds embeds only from checked IDs", () => {
    expect(embedUrl({ provider: "youtube", id: "dQw4w9WgXcQ" })).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(embedUrl({ provider: "youtube", id: "bad id/../x" })).toBeNull();
    expect(embedUrl({ provider: "soundcloud", id: "a/b" })).toContain(encodeURIComponent("https://soundcloud.com/a/b"));
  });
});

describe("text cleaning", () => {
  it("keeps line breaks, drops control and bidi characters", () => {
    expect(cleanText("  one\r\ntwo‮three\u0000 ")).toBe("one\ntwothree");
  });
});

describe("submission schema", () => {
  const good = {
    title: "Song",
    lyrics: "La la la la la la",
    chords: "",
    actions: "",
    mediaUrl: "",
    categories: ["silly"],
    sections: ["cubs"],
    energy: "high",
    origin: "",
    notes: "",
    creditName: "",
    copyright: "yes",
    email: "Kid@Example.com ",
  };
  it("accepts a good one and tidies it", () => {
    const r = anonymousSubmissionSchema.parse(good);
    expect(r.email).toBe("kid@example.com");
    expect(r.chords).toBeNull();
  });
  it("needs the copyright tick, a category and a real email", () => {
    expect(anonymousSubmissionSchema.safeParse({ ...good, copyright: "" }).success).toBe(false);
    expect(anonymousSubmissionSchema.safeParse({ ...good, categories: [] }).success).toBe(false);
    expect(anonymousSubmissionSchema.safeParse({ ...good, categories: ["made-up"] }).success).toBe(false);
    expect(anonymousSubmissionSchema.safeParse({ ...good, email: "nope" }).success).toBe(false);
    expect(anonymousSubmissionSchema.safeParse({ ...good, mediaUrl: "https://example.com/x" }).success).toBe(false);
  });
  it("keeps display names simple", () => {
    expect(anonymousSubmissionSchema.safeParse({ ...good, creditName: "<b>hi</b>" }).success).toBe(false);
    expect(anonymousSubmissionSchema.safeParse({ ...good, creditName: "Jo O'Neil" }).success).toBe(true);
  });
});

describe("sign up", () => {
  it("needs a 10+ character password and the age tick", () => {
    expect(signUpSchema.safeParse({ email: "a@b.co", password: "short", displayName: "", ageOk: "yes" }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: "a@b.co", password: "long enough pw", displayName: "", ageOk: "" }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: "a@b.co", password: "long enough pw", displayName: "", ageOk: "yes" }).success).toBe(true);
  });
});

describe("redirects after sign in", () => {
  it("only go to pages on this site", () => {
    expect(safeNext("/songs/x")).toBe("/songs/x");
    expect(safeNext("//evil.com")).toBe("/account");
    expect(safeNext("https://evil.com")).toBe("/account");
    expect(safeNext("/\\evil.com")).toBe("/account");
  });
});
