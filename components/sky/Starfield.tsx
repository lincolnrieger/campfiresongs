"use client";

import { useEffect, useRef } from "react";
import { mulberry32 } from "../fire/noise";
import styles from "./Starfield.module.css";

type Star = { x: number; y: number; r: number; base: number; speed: number; phase: number; tint: number };
type Shooting = { x: number; y: number; vx: number; vy: number; life: number; age: number };

/**
 * A fixed starfield behind the whole site. Drawn on a 2D canvas at a gentle
 * 30fps, with the odd slow shooting star. New stars can be added with:
 *   window.dispatchEvent(new CustomEvent("campfire:star", { detail: { x, y } }))
 * where x and y are viewport pixels.
 */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rand = mulberry32(2024);
    let stars: Star[] = [];
    const extra: Star[] = [];
    let shooting: Shooting | null = null;
    let nextShoot = 8 + Math.random() * 20;
    let w = 0, h = 0, dpr = 1;
    let raf = 0, last = 0, acc = 0, t = 0;

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const count = Math.round((w * h) / 2600);
      stars = [];
      for (let i = 0; i < count; i++) {
        const big = rand() < 0.06;
        stars.push({
          x: rand() * w,
          y: Math.pow(rand(), 1.4) * h, // thinner towards the glowing horizon
          r: big ? 0.9 + rand() * 0.8 : 0.35 + rand() * 0.55,
          base: big ? 0.75 + rand() * 0.25 : 0.25 + rand() * 0.5,
          speed: 0.4 + rand() * 2.2,
          phase: rand() * 6.28,
          tint: rand(),
        });
      }
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const s of stars.concat(extra)) {
        const tw = reduced ? 1 : 0.7 + 0.3 * Math.sin(t * s.speed + s.phase) * Math.sin(t * s.speed * 0.37 + s.phase * 2);
        const horizon = 1 - Math.max(0, (s.y / h - 0.55) / 0.45);
        const a = s.base * tw * horizon;
        if (a <= 0.02) continue;
        const c = s.tint < 0.2 ? "255,214,170" : s.tint > 0.85 ? "200,215,255" : "243,236,225";
        ctx.fillStyle = `rgba(${c},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1) {
          ctx.fillStyle = `rgba(${c},${(a * 0.12).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (shooting) {
        const s = shooting;
        const k = s.age / s.life;
        const fade = Math.sin(Math.PI * k);
        const tail = 110;
        const sp = Math.hypot(s.vx, s.vy);
        const tx = s.x - (s.vx / sp) * tail, ty = s.y - (s.vy / sp) * tail;
        const g = ctx.createLinearGradient(s.x, s.y, tx, ty);
        g.addColorStop(0, `rgba(255,244,225,${0.9 * fade})`);
        g.addColorStop(1, "rgba(255,244,225,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, last ? (now - last) / 1000 : 0);
      last = now;
      acc += dt;
      if (acc < 1 / 30) return; // stars don't need 60fps
      t += acc;
      nextShoot -= acc;
      if (shooting) {
        shooting.age += acc;
        shooting.x += shooting.vx * acc;
        shooting.y += shooting.vy * acc;
        if (shooting.age > shooting.life) shooting = null;
      } else if (nextShoot <= 0) {
        nextShoot = 18 + Math.random() * 35;
        const dir = Math.random() < 0.5 ? -1 : 1;
        shooting = {
          x: w * (0.2 + Math.random() * 0.6),
          y: h * (0.05 + Math.random() * 0.25),
          vx: dir * (260 + Math.random() * 140),
          vy: 90 + Math.random() * 60,
          life: 1.1 + Math.random() * 0.6,
          age: 0,
        };
      }
      acc = 0;
      draw();
    };

    const onStar = (e: Event) => {
      const d = (e as CustomEvent<{ x: number; y: number }>).detail;
      extra.push({ x: d.x, y: d.y, r: 1.4, base: 1, speed: 0.6, phase: 0, tint: 0.1 });
      if (reduced) draw();
    };
    const onResize = () => {
      build();
      draw();
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      last = 0;
      if (document.visibilityState === "visible" && !reduced) raf = requestAnimationFrame(loop);
    };

    build();
    draw();
    if (!reduced) raf = requestAnimationFrame(loop);
    window.addEventListener("resize", onResize);
    window.addEventListener("campfire:star", onStar);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("campfire:star", onStar);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} className={styles.sky} aria-hidden="true" />;
}
