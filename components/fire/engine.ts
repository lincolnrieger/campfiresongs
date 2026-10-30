// The fire's main loop. Owns the renderer, the particles, pointer handling,
// flicker, quality scaling, and pausing. Loaded lazily by <Fire>.

import { createCanvasRenderer } from "./canvas2d";
import { makeNoise1D, mulberry32 } from "./noise";
import { Particles, type Pointer, type SimFrame } from "./particles";
import type { FireAnchor, FireSettings } from "./settings";
import type { FrameState, Renderer } from "./types";
import { createWebGLRenderer } from "./webgl";

export type EngineOptions = {
  /** The engine creates its own canvas inside this element. */
  container: HTMLElement;
  canvasClassName?: string;
  settings: FireSettings;
  anchor: FireAnchor;
  /** Used instead of `anchor` when the canvas is taller than it is wide. */
  anchorNarrow?: FireAnchor;
  renderer?: "auto" | "webgl" | "canvas";
  /** Draw one frame and stop: for prefers-reduced-motion. */
  still?: boolean;
  /** Element that receives the --fire-light custom property. */
  lightTarget?: HTMLElement | null;
  interactive?: boolean;
  /** Pin a quality tier (0-2) instead of choosing automatically. */
  quality?: number;
  onStats?: (s: EngineStats) => void;
  onReady?: () => void;
};

export type EngineStats = { renderer: string; tier: number; fps: number; particles: number; scale: number };

export type FireHandle = {
  setSettings(s: FireSettings): void;
  /** Throw a handful of sparks up from the fire. */
  burst(strength?: number): void;
  readonly renderer: string;
  destroy(): void;
};

// Quality tiers: [max device pixel ratio, render scale, particle share].
const TIERS: [number, number, number][] = [
  [1, 0.5, 0.35],
  [1.5, 0.62, 0.6],
  [2, 0.75, 1],
];

function initialTier() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const coarse = matchMedia("(pointer: coarse)").matches;
  if (cores <= 2 || mem <= 2) return 0;
  if (coarse || cores <= 4 || mem <= 4) return 1;
  return 2;
}

export function startFire(opts: EngineOptions): FireHandle {
  let settings = opts.settings;
  const makeCanvas = () => {
    const c = document.createElement("canvas");
    c.setAttribute("aria-hidden", "true");
    if (opts.canvasClassName) c.className = opts.canvasClassName;
    opts.container.appendChild(c);
    return c;
  };
  let canvas = makeCanvas();
  let renderer: Renderer | null = null;
  if (opts.renderer !== "canvas") renderer = createWebGLRenderer(canvas);
  if (!renderer) {
    // A canvas that has tried WebGL can't switch to 2D, so start fresh.
    canvas.remove();
    canvas = makeCanvas();
    renderer = createCanvasRenderer(canvas);
  }
  if (!renderer) throw new Error("No canvas support");
  const r = renderer;

  const particles = new Particles(1500);
  const n1 = makeNoise1D(11);
  const n2 = makeNoise1D(23);
  const n3 = makeNoise1D(37);
  const rand = mulberry32(Date.now() & 0xffff);

  let tier = opts.quality ?? initialTier();
  let w = 0, h = 0, px = 1;
  let fx = 0, fy = 0, size = 100;
  let t = 0, flameTime = 0;
  let lean = 0, flare = 0;
  let nextPop = 3 + rand() * 5;
  let raf = 0;
  let last = 0;
  let visible = true;
  let onScreen = true;
  let destroyed = false;
  const pointer: Pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, active: false };
  let pointerSeen = 0;

  // Frame timing for automatic quality.
  let frameSamples: number[] = [];
  let lastTierChange = 0;
  let fps = 60;

  function layout() {
    const rect = canvas.getBoundingClientRect();
    const [dprCap, scale] = TIERS[tier];
    px = Math.min(window.devicePixelRatio || 1, dprCap) * scale;
    const nw = Math.max(1, Math.round(rect.width * px));
    const nh = Math.max(1, Math.round(rect.height * px));
    if (nw !== canvas.width || nh !== canvas.height) {
      if (w && h) particles.rescale(nw / w, nh / h);
      canvas.width = nw;
      canvas.height = nh;
    }
    w = nw;
    h = nh;
    const a = opts.anchorNarrow && rect.height > rect.width ? opts.anchorNarrow : opts.anchor;
    fx = a.x * w;
    fy = a.y * h;
    size = Math.min(a.scale * h, w * 0.42);
  }

  function lightValue(flicker: number) {
    return Math.max(0, settings.intensity * (0.86 + 0.12 * flicker) + flare * 0.5);
  }

  function frame(now: number) {
    if (destroyed) return;
    raf = 0;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    t += dt;
    flameTime += dt * settings.speed;

    // Flicker: slow breathing plus faster jitter, the same signal the page uses.
    const flicker =
      (n1(t * 1.7) - 0.5) * 1.3 + (n2(t * 5.3) - 0.5) * 0.6 + (n3(t * 11.0) - 0.5) * 0.25;

    // Log pops.
    if (settings.pops > 0) {
      nextPop -= dt;
      if (nextPop <= 0) {
        nextPop = (4 + rand() * 10) / settings.pops;
        flare = Math.min(1, flare + 0.45);
        particles.burst(sim(dt, flicker), fx + (rand() - 0.5) * size * 0.5, fy - size * 0.1, 18 + Math.floor(rand() * 30));
      }
    }
    flare *= Math.exp(-dt * 2.6);

    // Lean: steady wind plus a push away from a nearby pointer.
    let target = settings.wind * 0.9 + (n1(t * 0.4 + 50) - 0.5) * 0.25;
    if (pointer.active) {
      const dx = (pointer.x - fx) / size;
      const dy = (fy - pointer.y) / size;
      if (Math.abs(dx) < 1.5 && dy > -0.4 && dy < 2.6) {
        const k = (1 - Math.abs(dx) / 1.5) * (1 - Math.max(0, dy - 1.2) / 1.4);
        target -= Math.sign(dx) * k * 1.1;
      }
      if (now - pointerSeen > 2500) pointer.active = false;
    }
    lean += (target - lean) * (1 - Math.exp(-dt * 3));

    const cap = Math.round(settings.maxParticles * TIERS[tier][2]);
    particles.step(sim(dt, flicker, cap));
    pointer.vx *= 0.85;
    pointer.vy *= 0.85;

    const state: FrameState = {
      t, dt, flameTime, fx, fy, size, lean, flicker, flare,
      settings, particles, px,
    };
    r.render(state);

    if (opts.lightTarget) opts.lightTarget.style.setProperty("--fire-light", lightValue(flicker).toFixed(3));

    measure(dt, now);
    schedule();
  }

  function sim(dt: number, _flicker: number, cap = 0): SimFrame {
    return {
      t, dt, fx, fy, size,
      wind: settings.wind + lean * 0.25,
      sparkRate: settings.sparkRate,
      intensity: settings.intensity,
      turbulence: settings.turbulence,
      cap: cap || Math.round(settings.maxParticles * TIERS[tier][2]),
      pointer, width: w, height: h, px,
    };
  }

  function measure(dt: number, now: number) {
    frameSamples.push(dt);
    if (frameSamples.length >= 60) {
      const avg = frameSamples.reduce((a, b) => a + b, 0) / frameSamples.length;
      fps = 1 / avg;
      frameSamples = [];
      // Step down if we're struggling (after a warm-up, and not too often).
      if (opts.quality === undefined && t > 1.5 && avg > 1 / 48 && tier > 0 && now - lastTierChange > 3000) {
        tier--;
        lastTierChange = now;
        layout();
      }
      opts.onStats?.({ renderer: r.kind, tier, fps: Math.round(fps), particles: particles.count, scale: px });
    }
  }

  function schedule() {
    if (!raf && visible && onScreen && !destroyed && !opts.still) raf = requestAnimationFrame(frame);
  }

  function renderStill() {
    // A settled moment: warm, no sparks.
    t = 7.3;
    flameTime = 7.3;
    lean = settings.wind * 0.9;
    particles.clear();
    r.render({ t, dt: 0, flameTime, fx, fy, size, lean, flicker: 0.15, flare: 0, settings, particles, px });
    opts.lightTarget?.style.setProperty("--fire-light", lightValue(0.15).toFixed(3));
  }

  // --- Events ---------------------------------------------------------------

  const ro = new ResizeObserver(() => {
    layout();
    if (opts.still) renderStill();
  });
  ro.observe(canvas);

  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) {
      last = 0;
      schedule();
    }
  });
  io.observe(canvas);

  const onVis = () => {
    visible = document.visibilityState === "visible";
    if (visible) {
      last = 0;
      schedule();
    }
  };
  document.addEventListener("visibilitychange", onVis);

  const toCanvas = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * w,
      y: ((e.clientY - rect.top) / rect.height) * h,
      inside: e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom,
    };
  };
  const onMove = (e: PointerEvent) => {
    const p = toCanvas(e);
    if (!p.inside) {
      pointer.active = false;
      return;
    }
    if (pointer.active) {
      pointer.vx = (p.x - pointer.x) * 30;
      pointer.vy = (p.y - pointer.y) * 30;
    }
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.active = true;
    pointerSeen = performance.now();
  };
  const onDown = (e: PointerEvent) => {
    const target = e.target as Element | null;
    if (target?.closest("a,button,input,textarea,select,label,[role=button]")) return;
    const p = toCanvas(e);
    if (!p.inside) return;
    const dx = (p.x - fx) / size, dy = (fy - p.y) / size;
    if (Math.abs(dx) < 0.8 && dy > -0.35 && dy < 1.6) {
      flare = Math.min(1, flare + 0.6);
      particles.burst(sim(1 / 60, 0), p.x, Math.min(p.y, fy - size * 0.1), 50, 2.1);
    }
  };
  const onLeave = () => {
    pointer.active = false;
  };
  if (opts.interactive !== false && !opts.still) {
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
  }

  layout();
  if (opts.still) renderStill();
  else schedule();
  opts.onReady?.();

  return {
    get renderer() {
      return r.kind;
    },
    setSettings(s) {
      settings = s;
      if (opts.still) renderStill();
    },
    burst(strength = 1) {
      flare = Math.min(1, flare + 0.5 * strength);
      particles.burst(sim(1 / 60, 0), fx, fy - size * 0.15, Math.round(45 * strength), 1.9 + strength * 0.4);
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      r.destroy();
      canvas.remove();
    },
  };
}
