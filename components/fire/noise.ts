// Small deterministic noise helpers shared by the renderers and the particle sim.

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1D value noise in [0, 1]. Used for flicker, so it's cheap. */
export function makeNoise1D(seed: number) {
  const rand = mulberry32(seed);
  const table = new Float32Array(256);
  for (let i = 0; i < 256; i++) table[i] = rand();
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    const a = table[i & 255];
    const b = table[(i + 1) & 255];
    return a + (b - a) * u;
  };
}

/**
 * A tiling 256x256 RGBA texture of independent random values. The shaders turn
 * it into smooth value noise with a single texture fetch per octave, which is
 * far cheaper on phones than computing simplex noise in the shader.
 */
export function makeNoiseTexels(size = 256, seed = 7) {
  const rand = mulberry32(seed);
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i++) data[i] = Math.floor(rand() * 256);
  return data;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
