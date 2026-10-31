"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { makeNoise1D } from "../fire/noise";
import styles from "./EmberEdge.module.css";

/**
 * The calm version of the fire for inner pages: a low glow at the bottom of
 * the screen that flickers (by setting --fire-light) and a few embers
 * drifting up off the bottom edge. The home page has the real fire instead.
 */
export function EmberEdge() {
  const path = usePathname();
  const ref = useRef<HTMLCanvasElement>(null);
  const home = path === "/" || path === "/fire";

  useEffect(() => {
    if (home) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const root = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      root.style.setProperty("--fire-light", "0.85");
      return;
    }
    const n1 = makeNoise1D(3);
    const n2 = makeNoise1D(8);
    type E = { x: number; y: number; vx: number; vy: number; life: number; age: number; s: number };
    const embers: E[] = [];
    let w = 0, h = 0, dpr = 1, raf = 0, last = 0, t = 0;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    };
    const spawn = () =>
      embers.push({
        x: w * (0.15 + Math.random() * 0.7),
        y: h + 4,
        vx: (Math.random() - 0.5) * 10,
        vy: -(14 + Math.random() * 22),
        life: 4 + Math.random() * 5,
        age: 0,
        s: 0.8 + Math.random() * 1.4,
      });
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, last ? (now - last) / 1000 : 0);
      last = now;
      t += dt;
      const flicker = (n1(t * 1.6) - 0.5) * 1.2 + (n2(t * 4.7) - 0.5) * 0.5;
      root.style.setProperty("--fire-light", (0.8 + flicker * 0.14).toFixed(3));
      if (embers.length < 14 && Math.random() < dt * 2.2) spawn();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.age += dt;
        if (e.age > e.life) {
          embers.splice(i, 1);
          continue;
        }
        e.vx += Math.sin(t * 1.3 + i) * 6 * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        const heat = 1 - e.age / e.life;
        const a = heat * (0.6 + 0.4 * Math.sin(t * 9 + i * 3));
        ctx.fillStyle = `rgba(255,${Math.round(90 + 110 * heat)},${Math.round(30 * heat)},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.s, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      last = 0;
      if (document.visibilityState === "visible") raf = requestAnimationFrame(loop);
    };
    resize();
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [home]);

  if (home) return null;
  return <canvas ref={ref} className={styles.edge} aria-hidden="true" />;
}
