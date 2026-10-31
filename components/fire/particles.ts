// Sparks and embers. Simulated on the CPU (a few hundred particles is nothing
// for JS) and drawn by whichever renderer is active.
//
// Units are render-target pixels with y pointing down, like a 2D canvas.

import { mulberry32 } from "./noise";

export const FLOATS_PER_PARTICLE = 8; // x, y, vx, vy, heat, size, seed, kind

export type Pointer = { x: number; y: number; vx: number; vy: number; active: boolean };

export type SimFrame = {
  t: number;
  dt: number;
  /** Fire base position in pixels. */
  fx: number;
  fy: number;
  /** Fire size in pixels. */
  size: number;
  wind: number;
  sparkRate: number;
  intensity: number;
  turbulence: number;
  cap: number;
  pointer: Pointer;
  width: number;
  height: number;
  /** Pixel ratio of the render target, so sparks stay a sensible size. */
  px: number;
};

export class Particles {
  readonly max: number;
  count = 0;
  private x: Float32Array;
  private y: Float32Array;
  private vx: Float32Array;
  private vy: Float32Array;
  private age: Float32Array;
  private life: Float32Array;
  private size: Float32Array;
  private seed: Float32Array;
  private kind: Uint8Array;
  private spawnDebt = 0;
  private rand = mulberry32(1234);
  readonly out: Float32Array;

  constructor(max = 1500) {
    this.max = max;
    this.x = new Float32Array(max);
    this.y = new Float32Array(max);
    this.vx = new Float32Array(max);
    this.vy = new Float32Array(max);
    this.age = new Float32Array(max);
    this.life = new Float32Array(max);
    this.size = new Float32Array(max);
    this.seed = new Float32Array(max);
    this.kind = new Uint8Array(max);
    this.out = new Float32Array(max * FLOATS_PER_PARTICLE);
  }

  clear() {
    this.count = 0;
  }

  /** Keep particles in place when the render target changes size. */
  rescale(sx: number, sy: number) {
    for (let i = 0; i < this.count; i++) {
      this.x[i] *= sx;
      this.y[i] *= sy;
      this.vx[i] *= sx;
      this.vy[i] *= sy;
      this.size[i] *= sx;
    }
  }

  private spawn(f: SimFrame, opts: { x?: number; y?: number; power?: number; ember?: boolean } = {}) {
    if (this.count >= Math.min(this.max, f.cap)) return;
    const r = this.rand;
    const i = this.count++;
    const S = f.size;
    const ember = opts.ember ?? r() < 0.28;
    const power = opts.power ?? 1;
    // Most sparks leave from the hot middle of the fire, a few from the edges.
    const spread = (r() + r() + r() - 1.5) / 1.5;
    this.x[i] = opts.x ?? f.fx + spread * S * 0.32;
    this.y[i] = opts.y ?? f.fy - S * (0.12 + r() * 0.45);
    const up = ember ? 0.35 + r() * 0.6 : 0.7 + r() * 1.2;
    const side = (r() - 0.5) * (ember ? 0.35 : 0.7);
    this.vx[i] = side * S * power;
    this.vy[i] = -up * S * power;
    this.age[i] = 0;
    this.life[i] = ember ? 2.5 + r() * 3.5 : 0.5 + r() * 1.6;
    this.size[i] = (ember ? 2.0 + r() * 2.4 : 1.1 + r() * 1.3) * f.px;
    this.seed[i] = r();
    this.kind[i] = ember ? 1 : 0;
  }

  /** A sudden handful of sparks, like a log settling. */
  burst(f: SimFrame, x: number, y: number, n: number, power = 1.6) {
    for (let k = 0; k < n; k++) {
      const r = this.rand;
      this.spawn(f, {
        x: x + (r() - 0.5) * f.size * 0.25,
        y: y - r() * f.size * 0.1,
        power: power * (0.6 + r() * 0.7),
        ember: r() < 0.15,
      });
    }
  }

  step(f: SimFrame) {
    const { dt, t, size: S } = f;
    const r = this.rand;

    // Continuous spawning, flickering with the fire.
    const rate = 60 * f.sparkRate * f.intensity;
    this.spawnDebt += rate * dt * (0.6 + 0.8 * r());
    while (this.spawnDebt >= 1) {
      this.spawnDebt -= 1;
      this.spawn(f);
    }

    const p = f.pointer;
    const pr = S * 0.45;
    const turb = f.turbulence;
    let n = this.count;
    for (let i = 0; i < n; i++) {
      this.age[i] += dt;
      const heat = 1 - this.age[i] / this.life[i];
      if (heat <= 0 || this.y[i] < -40 || this.x[i] < -80 || this.x[i] > f.width + 80) {
        // Swap-remove.
        n--;
        this.x[i] = this.x[n];
        this.y[i] = this.y[n];
        this.vx[i] = this.vx[n];
        this.vy[i] = this.vy[n];
        this.age[i] = this.age[n];
        this.life[i] = this.life[n];
        this.size[i] = this.size[n];
        this.seed[i] = this.seed[n];
        this.kind[i] = this.kind[n];
        i--;
        continue;
      }
      const s = this.seed[i];
      const ember = this.kind[i] === 1;
      const rise = Math.max(0, (f.fy - this.y[i]) / S);
      const yy = this.y[i] / S;

      // Hot air keeps pushing up while the spark is hot.
      let ay = -S * (ember ? 0.55 : 0.9) * (0.25 + heat);
      // Turbulence: two drifting sine fields read like eddies in rising air.
      let ax =
        S *
        turb *
        (ember ? 1.6 : 1.5) *
        (Math.sin(yy * 3.1 + t * 1.7 + s * 40) + 0.6 * Math.sin(yy * 7.7 - t * 2.9 + s * 17));
      ay += S * turb * 0.3 * Math.sin(this.x[i] / S * 4.3 + t * 2.1 + s * 9);
      // Wind grows as particles leave the shelter of the fire.
      ax += f.wind * S * 1.6 * Math.min(1.5, 0.2 + rise * 0.6);

      if (p.active) {
        const dx = this.x[i] - p.x;
        const dy = this.y[i] - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < pr * pr) {
          const d = Math.sqrt(d2) + 1;
          const k = (1 - d / pr) ** 2;
          ax += (dx / d) * k * S * 14 + p.vx * k * 2.5;
          ay += (dy / d) * k * S * 14 + p.vy * k * 2.5;
        }
      }

      const drag = ember ? 1.6 : 1.1;
      this.vx[i] = (this.vx[i] + ax * dt) * Math.exp(-drag * dt);
      this.vy[i] = (this.vy[i] + ay * dt) * Math.exp(-drag * dt * 0.7);
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
    }
    this.count = n;

    // Pack for the renderer.
    const o = this.out;
    for (let i = 0, j = 0; i < n; i++, j += FLOATS_PER_PARTICLE) {
      o[j] = this.x[i];
      o[j + 1] = this.y[i];
      o[j + 2] = this.vx[i];
      o[j + 3] = this.vy[i];
      o[j + 4] = 1 - this.age[i] / this.life[i];
      o[j + 5] = this.size[i];
      o[j + 6] = this.seed[i];
      o[j + 7] = this.kind[i];
    }
  }
}

/** Spark colour as it cools: white-yellow, orange, red, then dark. */
export function sparkColor(heat: number): [number, number, number] {
  const h = Math.max(0, Math.min(1, heat));
  const r = Math.min(1, 0.35 + h * 1.4);
  const g = Math.max(0, Math.min(1, (h - 0.15) * 1.25));
  const b = Math.max(0, Math.min(1, (h - 0.7) * 2));
  return [r, g * 0.85, b * 0.6];
}
