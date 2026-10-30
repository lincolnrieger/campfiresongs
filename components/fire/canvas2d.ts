// Canvas 2D fallback for devices without WebGL2. The flames here are built
// from hundreds of soft additive puffs, which reads convincingly as fire at a
// fraction of the cost. Wood, stones and coals are painted once per resize.

import { hexToRgb, mulberry32 } from "./noise";
import { FLOATS_PER_PARTICLE, sparkColor } from "./particles";
import type { FrameState, Renderer } from "./types";

type Puff = { x: number; y: number; vx: number; vy: number; age: number; life: number; r: number; seed: number };

const LOGS: [number, number, number, number, number, boolean][] = [
  // ax, ay, bx, by, radius, front
  [-0.74, -0.07, 0.42, 0.1, 0.082, false],
  [0.76, -0.06, -0.34, 0.12, 0.078, false],
  [-0.12, -0.08, 0.13, 0.27, 0.045, false],
  [-0.66, -0.21, 0.6, -0.13, 0.092, true],
];

function sprite(rgb: [number, number, number], size = 64) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const [r, gg, b] = rgb.map((v) => Math.round(v * 255));
  grad.addColorStop(0, `rgba(${r},${gg},${b},1)`);
  grad.addColorStop(0.35, `rgba(${r},${gg},${b},0.55)`);
  grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export function createCanvasRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const rand = mulberry32(99);
  const puffs: Puff[] = [];
  let puffDebt = 0;
  let sprites: HTMLCanvasElement[] = [];
  let colorKey = "";
  let layers: {
    back: HTMLCanvasElement;
    coals: HTMLCanvasElement;
    front: HTMLCanvasElement;
    cracks: HTMLCanvasElement;
  } | null = null;
  let layerKey = "";

  function paintLayers(w: number, h: number, fx: number, fy: number, S: number, stones: boolean) {
    const mk = () => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      return c;
    };
    const back = mk(), coals = mk(), front = mk(), cracks = mk();
    const r = mulberry32(5);
    // Same proportions as the WebGL version: wood a little smaller than the flames.
    const B = S * 0.78;
    const inFire = (g: CanvasRenderingContext2D) => g.setTransform(B, 0, 0, -B, fx, fy);

    const stone = (g: CanvasRenderingContext2D, ang: number) => {
      const cx = Math.cos(ang) * 0.98, cy = -0.17 + Math.sin(ang) * 0.24;
      const rx = 0.11 + r() * 0.06, ry = 0.07 + r() * 0.035;
      const front = Math.sin(ang) < 0;
      const grad = g.createRadialGradient(cx * 0.9, cy + (front ? ry * 0.8 : 0), 0, cx, cy, rx * 1.3);
      grad.addColorStop(0, front ? "#3a261b" : "#6a4028");
      grad.addColorStop(1, "#120e0d");
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
    };
    const log = (g: CanvasRenderingContext2D, l: (typeof LOGS)[number]) => {
      const [ax, ay, bx, by, rad] = l;
      g.save();
      g.translate(ax, ay);
      const ang = Math.atan2(by - ay, bx - ax);
      g.rotate(ang);
      const len = Math.hypot(bx - ax, by - ay);
      const grad = g.createLinearGradient(0, -rad, 0, rad);
      grad.addColorStop(0, "#120c0a");
      grad.addColorStop(0.45, "#3a2416");
      grad.addColorStop(1, "#0c0807");
      g.fillStyle = grad;
      g.beginPath();
      g.roundRect(0, -rad, len, rad * 2, rad * 0.4);
      g.fill();
      g.restore();
    };
    const crack = (g: CanvasRenderingContext2D, l: (typeof LOGS)[number]) => {
      const [ax, ay, bx, by, rad] = l;
      g.save();
      g.translate(ax, ay);
      g.rotate(Math.atan2(by - ay, bx - ax));
      const len = Math.hypot(bx - ax, by - ay);
      g.strokeStyle = "#ff5a12";
      g.lineWidth = 0.008;
      for (let k = 0; k < 26; k++) {
        const u = r() * len;
        const worldX = ax + u * Math.cos(Math.atan2(by - ay, bx - ax));
        if (Math.abs(worldX) > 0.45) continue;
        const v = (r() - 0.5) * rad * 1.6;
        g.beginPath();
        g.moveTo(u, v);
        g.lineTo(u + (r() - 0.5) * 0.08, v + (r() - 0.5) * 0.05);
        g.lineTo(u + (r() - 0.5) * 0.12, v + (r() - 0.5) * 0.06);
        g.stroke();
      }
      g.restore();
    };

    const b = back.getContext("2d")!;
    inFire(b);
    if (stones) for (const ang of [0.15, 0.65, 2.5, 3.0]) stone(b, ang);
    for (const l of LOGS) if (!l[5]) log(b, l);
    const f = front.getContext("2d")!;
    inFire(f);
    for (const l of LOGS) if (l[5]) log(f, l);
    if (stones) for (let i = 0; i < 5; i++) stone(f, 3.6 + i * 0.58);
    const c = cracks.getContext("2d")!;
    inFire(c);
    for (const l of LOGS) crack(c, l);
    const cb = coals.getContext("2d")!;
    inFire(cb);
    for (let k = 0; k < 90; k++) {
      const x = (r() - 0.5) * 1.0, y = -0.13 + (r() - 0.5) * 0.18;
      if ((x / 0.55) ** 2 + ((y + 0.13) / 0.12) ** 2 > 1) continue;
      cb.fillStyle = r() < 0.5 ? "#ff6a1a" : "#c2280a";
      cb.beginPath();
      cb.ellipse(x, y, 0.02 + r() * 0.025, 0.01 + r() * 0.01, 0, 0, Math.PI * 2);
      cb.fill();
    }
    layers = { back, coals, front, cracks };
  }

  return {
    kind: "canvas",
    lost: false,
    render(fr: FrameState) {
      const w = canvas.width, h = canvas.height;
      const s = fr.settings;
      const S = fr.size;
      const key = s.core + s.mid + s.edge;
      if (key !== colorKey) {
        colorKey = key;
        sprites = [sprite(hexToRgb(s.edge)), sprite(hexToRgb(s.mid)), sprite(hexToRgb(s.core)), sprite([1, 0.95, 0.85])];
      }
      const lk = `${w}x${h}:${fr.fx}:${fr.fy}:${S}:${s.stones}`;
      if (lk !== layerKey) {
        layerKey = lk;
        paintLayers(w, h, fr.fx, fr.fy, S, s.stones);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const light = (0.85 + 0.25 * fr.flicker + 0.6 * fr.flare) * s.intensity;

      // Glow.
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(fr.fx, fr.fy - S * 0.3, 0, fr.fx, fr.fy - S * 0.3, S * 1.3 * Math.max(s.glow, 0.1));
      g.addColorStop(0, `rgba(255,110,30,${0.32 * light * s.glow})`);
      g.addColorStop(1, "rgba(255,80,20,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(layers!.back, 0, 0);
      const pulse = Math.max(0, (0.45 + 0.3 * Math.sin(fr.t * 0.9) + 0.2 * fr.flicker) * s.embers);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.min(1, pulse);
      ctx.drawImage(layers!.coals, 0, 0);
      ctx.globalAlpha = 1;

      // Flame puffs.
      ctx.globalCompositeOperation = "lighter";
      const dt = fr.dt;
      puffDebt += dt * 170 * s.intensity;
      while (puffDebt > 1 && puffs.length < 260) {
        puffDebt -= 1;
        const spread = (rand() + rand() + rand() - 1.5) / 1.5;
        puffs.push({
          x: spread * 0.36 * s.width,
          y: -0.02 + rand() * 0.08,
          vx: (rand() - 0.5) * 0.15,
          vy: 0.5 + rand() * 0.6,
          age: 0,
          life: (0.45 + rand() * 0.55) * s.height * (1 - Math.abs(spread) * 0.5),
          r: 0.09 + rand() * 0.08,
          seed: rand() * 100,
        });
      }
      const ft = fr.flameTime;
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.age += dt * s.speed;
        const k = p.age / p.life;
        if (k >= 1) {
          puffs.splice(i, 1);
          continue;
        }
        p.vy += dt * s.speed * 1.4; // accelerate upwards
        p.x += (p.vx + Math.sin(ft * 6 + p.seed + p.y * 9) * 0.25 * s.turbulence * k) * dt * s.speed;
        p.x += fr.lean * p.y * dt * s.speed * 0.9;
        p.y += p.vy * dt * s.speed;
        p.x -= p.x * dt * 0.8 * s.speed; // draw towards the middle so the fire tapers
        const heat = 1 - k;
        const idx = heat > 0.92 ? 3 : heat > 0.65 ? 2 : heat > 0.3 ? 1 : 0;
        const rad = p.r * (1 - k * 0.6) * S;
        ctx.globalAlpha = Math.min(1, heat * 1.3) * 0.3 * light;
        ctx.drawImage(sprites[idx], fr.fx + p.x * S - rad, fr.fy - p.y * S - rad * 1.3, rad * 2, rad * 2.6);
      }
      ctx.globalAlpha = 1;

      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(layers!.front, 0, 0);

      // Cracks and coals pulse slowly.
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.min(1, pulse);
      ctx.drawImage(layers!.cracks, 0, 0);
      ctx.globalAlpha = 1;

      // Sparks.
      const n = fr.particles.count;
      const o = fr.particles.out;
      ctx.lineCap = "round";
      for (let i = 0, j = 0; i < n; i++, j += FLOATS_PER_PARTICLE) {
        const heat = o[j + 4];
        const [r, gg, b] = sparkColor(heat);
        const a = Math.min(1, heat * 4) * (0.6 + 0.4 * Math.sin(fr.t * 20 + o[j + 6] * 80));
        ctx.strokeStyle = `rgba(${(r * 255) | 0},${(gg * 255) | 0},${(b * 255) | 0},${a})`;
        ctx.lineWidth = o[j + 5];
        ctx.beginPath();
        ctx.moveTo(o[j], o[j + 1]);
        ctx.lineTo(o[j] - o[j + 2] / 140, o[j + 1] - o[j + 3] / 140);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    },
    destroy() {
      puffs.length = 0;
      layers = null;
    },
  };
}
