"use client";

import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __cfTurnstileLoading?: Promise<void>;
  }
}

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  window.__cfTurnstileLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile"));
    document.head.appendChild(s);
  });
  return window.__cfTurnstileLoading;
}

/**
 * Cloudflare's bot check. It adds a hidden "cf-turnstile-response" field to
 * the form, which the server checks. `resetKey` re-runs it after a failed submit.
 */
export function Turnstile({ siteKey, resetKey }: { siteKey: string; resetKey?: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let id: string | undefined;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        id = window.turnstile.render(ref.current, { sitekey: siteKey, theme: "dark", size: "flexible" });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (id) window.turnstile?.remove(id);
    };
  }, [siteKey, resetKey]);
  return <div ref={ref} className="turnstile" />;
}
