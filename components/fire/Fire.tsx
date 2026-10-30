"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { EngineStats, FireHandle } from "./engine";
import { DEFAULT_FIRE, type FireAnchor, type FireSettings } from "./settings";
import styles from "./Fire.module.css";

export type FireProps = {
  settings?: FireSettings;
  anchor?: FireAnchor;
  anchorNarrow?: FireAnchor;
  /** Force a renderer, for testing the fallback. */
  renderer?: "auto" | "webgl" | "canvas";
  /** Force the still (reduced-motion) fire, for testing. */
  still?: boolean;
  /** Set --fire-light on <html> so the page can glow in time with the flames. */
  lightsPage?: boolean;
  className?: string;
  /** Pin a quality tier (0 low, 2 high). Normally chosen automatically. */
  quality?: number;
  onStats?: (s: EngineStats) => void;
};

const DEFAULT_ANCHOR: FireAnchor = { x: 0.5, y: 0.82, scale: 0.36 };

/**
 * The campfire. Renders a cheap CSS glow immediately, then loads the WebGL
 * engine once the browser is idle so it never slows the first paint.
 *
 * Other parts of the page can throw sparks into it with:
 *   window.dispatchEvent(new CustomEvent("campfire:burst", { detail: { strength: 1 } }))
 */
export function Fire({
  settings = DEFAULT_FIRE,
  anchor = DEFAULT_ANCHOR,
  anchorNarrow,
  renderer = "auto",
  still,
  lightsPage = true,
  className,
  quality,
  onStats,
}: FireProps) {
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<FireHandle | null>(null);
  const latest = useRef(settings);
  latest.current = settings;
  const statsRef = useRef(onStats);
  statsRef.current = onStats;
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const isStill = still ?? reduced;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    const start = async () => {
      const { startFire } = await import("./engine");
      if (cancelled) return;
      try {
        handle.current = startFire({
          container: el,
          canvasClassName: styles.canvas,
          settings: latest.current,
          anchor,
          anchorNarrow,
          renderer,
          quality,
          still: isStill,
          lightTarget: lightsPage ? document.documentElement : null,
          onStats: (s) => statsRef.current?.(s),
          onReady: () => setReady(true),
        });
      } catch {
        // No canvas at all: the CSS glow stays, which is still a warm page.
      }
    };
    const hasIdle = "requestIdleCallback" in window;
    const id = hasIdle
      ? window.requestIdleCallback(() => void start(), { timeout: 1200 })
      : window.setTimeout(() => void start(), 200);

    const onBurst = (e: Event) => {
      const strength = (e as CustomEvent<{ strength?: number }>).detail?.strength ?? 1;
      handle.current?.burst(strength);
    };
    window.addEventListener("campfire:burst", onBurst);

    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(id);
      else clearTimeout(id);
      window.removeEventListener("campfire:burst", onBurst);
      handle.current?.destroy();
      handle.current = null;
      setReady(false);
    };
    // Anchors are layout, so a change restarts the engine; settings don't.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderer, quality, isStill, lightsPage, JSON.stringify(anchor), JSON.stringify(anchorNarrow)]);

  useEffect(() => {
    handle.current?.setSettings(settings);
  }, [settings]);

  const a = anchor;
  return (
    <div
      ref={host}
      className={[styles.fire, ready ? styles.ready : "", isStill ? styles.still : "", className ?? ""].join(" ")}
      style={{ "--fx": `${a.x * 100}%`, "--fy": `${a.y * 100}%` } as CSSProperties}
      aria-hidden="true"
    >
      <div className={styles.placeholder} />
    </div>
  );
}
