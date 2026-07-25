// Pixel-art campfire — a low-resolution cellular fire simulation drawn on a
// tiny canvas and scaled up with crisp (non-smoothed) pixels, so it reads as
// deliberate 8-bit art rather than a blurry gradient.

const W = 56; // fire grid width, in pixels
const H = 76; // fire grid height, in pixels
const SEED_Y = 60; // row the flames rise from (top of the log pile)
const SEED_X0 = 19; // seed spans these columns — this sets the flame's base width
const SEED_X1 = 37;
const CX = 28; // flame centre column
const BASE_HALF = 10; // half-width of the flame at its base (tapers to a point)

const canvas = document.getElementById("fire");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// Classic 37-step fire palette: near-black → red → orange → yellow → white.
// Index 0 is drawn transparent so the flame has no black backing box.
const PALETTE = [
  [7, 7, 7], [31, 7, 7], [47, 15, 7], [71, 15, 7], [87, 23, 7], [103, 31, 7],
  [119, 31, 7], [143, 39, 7], [159, 47, 7], [175, 63, 7], [191, 71, 7],
  [199, 71, 7], [223, 79, 7], [223, 87, 7], [223, 87, 7], [215, 95, 7],
  [215, 95, 7], [215, 103, 15], [207, 111, 15], [207, 119, 15], [207, 127, 15],
  [207, 135, 23], [199, 135, 23], [199, 143, 23], [199, 151, 31], [191, 159, 31],
  [191, 159, 31], [191, 167, 39], [191, 167, 39], [191, 175, 47], [183, 175, 47],
  [183, 183, 47], [183, 183, 55], [207, 207, 111], [223, 223, 159],
  [239, 239, 199], [255, 255, 255],
];
const MAX = PALETTE.length - 1;

const fire = new Uint8Array(W * H); // heat value (palette index) per cell
const img = ctx.createImageData(W, H);

function seed() {
  for (let x = SEED_X0; x <= SEED_X1; x++) {
    // hottest in the middle, cooler toward the edges → a rounded base
    const edge = Math.min(x - SEED_X0, SEED_X1 - x);
    let heat = MAX - Math.max(0, 3 - edge) * 2;
    // gentle random flicker so the fire never sits perfectly still
    if (Math.random() < 0.22) heat -= 2 + ((Math.random() * 3) | 0);
    fire[SEED_Y * W + x] = Math.max(0, heat);
  }
}

function spread(src) {
  const px = fire[src];
  if (px === 0) {
    fire[src - W] = 0;
    return;
  }
  const drift = ((Math.random() * 3) | 0) - 1; // -1, 0, +1 — symmetric, no lean
  const cool = Math.random() < 0.58 ? 1 : 0;
  const above = src - W + drift;
  if (above >= 0) fire[above] = Math.max(0, px - cool);
}

// Crop heat to a flame-shaped envelope: wide at the base, pinching to a point
// at the top. Keeps the interior pixel churn but gives a deliberate silhouette.
function shape() {
  for (let y = 0; y <= SEED_Y; y++) {
    const hf = (SEED_Y - y) / SEED_Y; // 0 at base → 1 at top
    const half = 1 + (1 - hf) * (BASE_HALF - 1);
    for (let x = 0; x < W; x++) {
      const over = Math.abs(x - CX) - half;
      if (over > 0) {
        const i = y * W + x;
        if (fire[i] > 0) fire[i] = over > 1.5 ? 0 : Math.max(0, fire[i] - 9);
      }
    }
  }
}

function step() {
  seed();
  for (let x = 0; x < W; x++) {
    for (let y = 1; y <= SEED_Y; y++) spread(y * W + x);
  }
  shape();
}

// --- pixel logs, drawn crisp on top of the flame ---
function px(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
function log(x0, y0, x1, y1, color) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps);
    const y = Math.round(y0 + ((y1 - y0) * i) / steps);
    px(x, y, 3, 3, color);
  }
}
function drawLogs() {
  log(16, 67, 42, 61, "#5a3720"); // back log
  log(16, 61, 42, 67, "#6f452a"); // front log
  px(20, 61, 2, 2, "#3d2416"); // log ends (grain)
  px(37, 65, 2, 2, "#3d2416");
  px(27, 60, 3, 2, "#d8571a"); // ember where they cross
}

function render() {
  const d = img.data;
  for (let i = 0; i < W * H; i++) {
    const c = PALETTE[fire[i]];
    const o = i * 4;
    d[o] = c[0];
    d[o + 1] = c[1];
    d[o + 2] = c[2];
    d[o + 3] = fire[i] === 0 ? 0 : 255;
  }
  ctx.putImageData(img, 0, 0);
  drawLogs();
}

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reduce) {
  for (let i = 0; i < 90; i++) step(); // settle to a steady flame, then hold
  render();
} else {
  let last = 0;
  function loop(t) {
    if (t - last > 32) {
      // ~30 fps for a chunky, retro cadence
      step();
      render();
      last = t;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
