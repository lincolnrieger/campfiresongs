// GLSL for the WebGL2 fire. Three programs:
//   SCENE     flames, logs, coals, stones, smoke and glow, drawn to an offscreen texture
//   COMPOSITE copies that texture to the screen through a heat-haze distortion
//   SPARKS    instanced, velocity-stretched quads for sparks and embers
//
// "Fire space" below means: origin at the base of the flames, y up, and one
// unit equal to the fire's size in pixels.

export const FULLSCREEN_VS = /* glsl */ `#version 300 es
out vec2 vUv;
void main() {
  // One triangle that covers the screen.
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const NOISE = /* glsl */ `
uniform sampler2D uNoise;

// Smooth value noise from a random texture: one fetch, smoothstep-interpolated.
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return texture(uNoise, (i + f + 0.5) / 256.0).r;
}
float vnoiseG(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return texture(uNoise, (i + f + 0.5) / 256.0).g;
}
vec2 hash2(vec2 i) {
  return texelFetch(uNoise, ivec2(mod(i, 256.0)), 0).ba;
}

// Each octave is rotated and doubled so the grid never lines up.
const mat2 OCT = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = OCT * p + vec2(17.1, 3.7); a *= 0.5; }
  return s / 0.96875;
}
float fbm3(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = OCT * p + vec2(9.3, 21.9); a *= 0.5; }
  return s / 0.875;
}

// Voronoi: x = distance to nearest cell point, y = gap to the second nearest
// (small along cracks), zw = id of the nearest cell.
vec4 voronoi(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  vec2 id = vec2(0.0);
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = hash2(i + g);
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; id = i + g; }
    else if (d < d2) { d2 = d; }
  }
  return vec4(d1, d2 - d1, id);
}
`;

export const SCENE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform vec2 uRes;
uniform vec3 uFire;      // base x, base y (GL pixels), size (pixels)
uniform float uTime;     // flame time, already scaled by speed
uniform float uClock;    // real time, for slow things like coal breathing
uniform float uIntensity;
uniform float uHeight;
uniform float uWidth;
uniform float uLean;
uniform float uTurb;
uniform float uSmoke;
uniform float uGlow;
uniform float uEmbers;
uniform float uExposure;
uniform float uFlicker;  // -1..1, shared with the page lighting
uniform float uFlare;    // 0..1, a log just shifted
uniform float uStones;
uniform vec3 uCore;
uniform vec3 uMid;
uniform vec3 uEdge;

${NOISE}

vec3 tone(vec3 c) { return 1.0 - exp(-c * uExposure); }
float maxc(vec3 c) { return max(c.r, max(c.g, c.b)); }

// Premultiplied "over".
void over(inout vec4 acc, vec4 src) { acc = src + acc * (1.0 - src.a); }
// Light adds; alpha grows so it shows on a transparent canvas.
void addLight(inout vec4 acc, vec3 c) {
  acc.rgb += c;
  acc.a = clamp(max(acc.a, maxc(c)), 0.0, 1.0);
}

const vec2 FIRE_C = vec2(0.0, 0.32); // where the light comes from
const float BASE = 0.78;              // size of the wood and stones relative to the flames

// Light falling on a surface at p, with normal n, from the heart of the fire.
vec3 fireLight(vec2 p, vec3 n, float z) {
  vec3 L = vec3(FIRE_C - p, z);
  float d = length(L);
  float diff = max(dot(n, L / d), 0.0);
  float fall = 1.0 / (1.0 + d * d * 3.0);
  float k = (0.85 + 0.25 * uFlicker + 0.6 * uFlare) * uIntensity * uGlow;
  return vec3(1.0, 0.52, 0.22) * diff * fall * k * 2.4;
}

// ---- Flames ---------------------------------------------------------------

float flameHeat(vec2 p, float t) {
  float h = max(p.y, 0.0);
  // Wind and the pointer push the upper flames; the base stays anchored.
  p.x -= uLean * h * h * 0.55;
  // Slow, large sway of the whole fire.
  p.x += (fbm3(vec2(t * 0.3, p.y * 0.7)) - 0.5) * 0.24 * h;

  // Domain warp, mostly sideways and growing with height: this is what
  // makes the flames twist and fold over.
  vec2 wq = vec2(p.x * 2.6, p.y * 1.3 - t * 1.4);
  vec2 w = vec2(fbm(wq), fbm(wq + vec2(5.2, 1.3))) - 0.5;
  vec2 q = p + w * vec2(0.55, 0.2) * (0.06 + h * 1.15) * uTurb;

  // Several flames rise from different points along the logs, each with its
  // own height that rises and falls. The middle burns tallest.
  float H = uHeight * (0.95 + 0.1 * uFlicker + 0.25 * uFlare);
  float body = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float xi = (fi - 2.0) * 0.14 * uWidth + (vnoise(vec2(t * 0.21, fi * 7.0)) - 0.5) * 0.09;
    float hi = (0.35 + 0.9 * vnoise(vec2(t * 0.5 + fi * 3.1, fi * 11.0))) * (1.0 - abs(fi - 2.0) * 0.18);
    float wi = 0.085 * uWidth * (1.0 + 0.4 * hi);
    float dx = (q.x - xi) / wi;
    float tongue = exp(-dx * dx) * max(1.0 - q.y / (H * hi), 0.0);
    // Soft union so neighbouring flames merge at the base.
    body = body + tongue - body * tongue;
  }
  // A broad, short sheet of flame along the whole bed of coals.
  float bx = q.x / (0.4 * uWidth);
  body = max(body, exp(-bx * bx * bx * bx) * max(1.0 - q.y / (0.32 * H), 0.0));

  // Hot gas accelerates as it rises: stretch the noise upwards so features
  // crawl at the base and race at the tips. Stretched tall, so it tears the
  // flames into vertical tongues.
  float ys = 1.8 * pow(max(q.y + 0.2, 0.0), 0.72);
  float n = fbm(vec2(q.x * 4.4, ys * 1.6 - t * 2.3));
  float d = fbm3(vec2(q.x * 9.5 + 3.0, ys * 3.4 - t * 3.7));
  float turb = (n - 0.5) * 1.9 + (d - 0.5) * (0.6 + 0.6 * h);

  // Turbulence may only add flame inside a soft plume above the fire, so
  // tongues can break off near the tips but never appear from nowhere.
  float px_ = q.x / (0.27 * uWidth * (1.0 + 0.25 * h));
  float env = exp(-px_ * px_) * (1.0 - smoothstep(H * 0.55, H * 1.25, q.y));
  float k = body * 1.3 + turb * (0.18 + h * 1.0) * uTurb * mix(env, 1.0, smoothstep(0.0, 0.3, body));
  // The bottom tucks in behind the logs.
  k *= smoothstep(-0.16, 0.04, p.y);
  return k * uIntensity;
}

vec3 flameColor(float k) {
  vec3 c = mix(uEdge * 0.6, uEdge, smoothstep(0.04, 0.2, k));
  c = mix(c, uMid, smoothstep(0.2, 0.55, k));
  c = mix(c, uCore, smoothstep(0.6, 0.95, k));
  c = mix(c, vec3(1.0, 0.95, 0.82), smoothstep(1.0, 1.4, k));
  // Hotter is brighter, not just yellower.
  return c * (0.35 + 1.2 * k);
}

// ---- Logs -----------------------------------------------------------------

vec4 logLayer(vec2 p, vec2 a, vec2 b, float r, float seed, float px) {
  vec2 ba = b - a;
  float L = length(ba);
  vec2 dir = ba / L;
  vec2 nrm = vec2(-dir.y, dir.x);
  if (nrm.y < 0.0) nrm = -nrm;   // nrm always points to the top of the log
  vec2 pa = p - a;
  float u = dot(pa, dir);
  float v = dot(pa, nrm);
  float rr = r * (0.9 + 0.12 * vnoise(vec2(u * 7.0 + seed * 31.0, seed * 5.0)));
  // Square-ish cut ends, slightly rounded.
  float du = max(abs(u - L * 0.5) - L * 0.5, 0.0);
  float d = length(vec2(du, max(abs(v) - rr, 0.0))) + min(max(du - rr, abs(v) - rr), 0.0);
  float mask = 1.0 - smoothstep(-px, px, d);
  if (mask <= 0.0) return vec4(0.0);

  float s = clamp(v / rr, -1.0, 1.0);
  vec3 n = vec3(nrm * s, sqrt(max(1.0 - s * s, 0.0)));
  // Cut ends face the viewer.
  float endFace = smoothstep(-0.02, 0.01, max(-u, u - L));
  n = normalize(mix(n, vec3(dir * sign(u - L * 0.5) * 0.3, 1.0), endFace));

  // How close this part of the log is to the heart of the fire.
  float heat = 1.0 - smoothstep(0.08, 0.55, length((p - vec2(0.0, 0.0)) * vec2(1.0, 1.6)));

  // Bark: grooves run along the log.
  float bark = fbm(vec2(u * 2.6 + seed * 10.0, s * 5.5 + seed));
  vec3 wood = mix(vec3(0.11, 0.07, 0.045), vec3(0.2, 0.13, 0.08), bark);
  vec3 charcoal = vec3(0.045, 0.035, 0.032) * (0.7 + 0.6 * bark);
  vec3 albedo = mix(wood, charcoal, smoothstep(0.0, 0.5, heat + 0.15 * bark));
  // End grain: rings.
  float rings = 0.5 + 0.5 * sin(length(vec2(v, 0.0)) / rr * 18.0 + bark * 6.0);
  // Cut ends show rings, but only on the cooler outer ends of the logs.
  float outer = smoothstep(0.35, 0.65, length(p * vec2(1.0, 1.6)));
  albedo = mix(albedo, vec3(0.16, 0.11, 0.075) * (0.7 + 0.3 * rings), endFace * outer);
  albedo = mix(albedo, charcoal, endFace * (1.0 - outer));

  vec3 col = albedo * fireLight(p, n, 0.35);
  col += albedo * vec3(0.03, 0.035, 0.06) * (0.5 + 0.5 * n.y); // a little sky light

  // Glowing cracks: charcoal splits into a grid of plates.
  vec2 cp = vec2(u * 7.0, (s + 1.0) * 1.7) + seed * 13.0;
  cp += (vec2(vnoise(cp * 1.7), vnoiseG(cp * 1.7 + 3.0)) - 0.5) * 0.9;
  vec4 vo = voronoi(cp);
  float crack = 1.0 - smoothstep(0.015, 0.06, vo.y);
  crack *= smoothstep(0.35, 0.6, vnoise(cp * 0.6 + 4.0) + heat * 0.4);
  float cell = texelFetch(uNoise, ivec2(mod(vo.zw, 256.0)), 0).r;
  float pulse = 0.5 + 0.5 * sin(uClock * (0.6 + cell * 0.9) + cell * 40.0);
  pulse = mix(pulse, vnoise(vec2(uClock * 0.5 + cell * 50.0, seed)), 0.5);
  float glow = crack * smoothstep(0.3, 0.85, heat) * (0.35 + 0.9 * pulse);
  // The underside, resting in the coals, smoulders.
  glow += smoothstep(-0.1, -0.9, s) * smoothstep(0.2, 0.8, heat) * (0.25 + 0.3 * pulse) * (1.0 - endFace);
  vec3 emit = mix(vec3(0.6, 0.06, 0.01), vec3(1.0, 0.42, 0.08), pulse * crack) * glow
            * uEmbers * (0.8 + 0.3 * uFlicker + uFlare) * 1.6;

  return vec4((tone(col) + tone(emit)) * mask, mask);
}

// ---- Coals ----------------------------------------------------------------

vec4 coalLayer(vec2 p, float px) {
  vec2 c = vec2(0.0, -0.13);
  vec2 rad = vec2(0.58, 0.13);
  float e = length((p - c) / rad);
  float mask = 1.0 - smoothstep(0.8, 1.05, e + (vnoise(p * 18.0) - 0.5) * 0.25);
  if (mask <= 0.0) return vec4(0.0);
  vec4 vo = voronoi(vec2(p.x * 17.0, p.y * 38.0));
  float id = texelFetch(uNoise, ivec2(mod(vo.zw + 31.0, 256.0)), 0).g;
  // Each lump breathes on its own slow rhythm.
  float breathe = vnoise(vec2(uClock * (0.35 + id * 0.4) + id * 90.0, id * 7.0));
  float core = 1.0 - smoothstep(0.0, 0.85, e);
  float lump = 1.0 - smoothstep(0.0, 0.75, vo.x);
  float heat = core * (0.35 + 0.65 * breathe) * (0.5 + 0.5 * id);
  heat *= 0.55 + 0.45 * lump;
  heat *= (0.85 + 0.2 * uFlicker + 0.5 * uFlare) * uEmbers;
  float gap = smoothstep(0.0, 0.08, vo.y);
  vec3 emit = mix(vec3(0.45, 0.04, 0.01), vec3(1.0, 0.45, 0.1), smoothstep(0.25, 0.75, heat))
            * heat * 1.9;
  emit = mix(emit * 0.15, emit, gap);
  // Cooler coals at the rim are grey ash.
  vec3 ash = vec3(0.09, 0.08, 0.075) * (0.4 + 0.6 * lump) * (1.0 - core);
  vec3 col = tone(emit) + ash * fireLight(p, vec3(0.0, 0.7, 0.7), 0.3) * 3.0;
  return vec4(col * mask, mask);
}

// ---- Stones ---------------------------------------------------------------

vec4 stone(vec2 p, float ang, float i, float px) {
  vec2 c = vec2(0.0, -0.17) + vec2(cos(ang) * 0.98, sin(ang) * 0.24);
  float h1 = texelFetch(uNoise, ivec2(int(i) * 7 + 3, 11), 0).r;
  float h2 = texelFetch(uNoise, ivec2(int(i) * 7 + 5, 13), 0).g;
  vec2 rad = vec2(0.085 + 0.045 * h1, 0.055 + 0.03 * h2) * (0.85 + 0.3 * (0.5 - 0.5 * sin(ang)));
  vec2 lp = (p - c) / rad;
  float a = atan(lp.y, lp.x);
  float bump = (vnoise(vec2(a * 1.6 + i * 9.0, i)) - 0.5) * 0.35;
  float e = length(lp) - 1.0 - bump;
  float mask = 1.0 - smoothstep(-px * 12.0, px * 12.0, e);
  if (mask <= 0.0) return vec4(0.0);
  vec2 nl = lp / (1.0 + bump);
  vec3 n = normalize(vec3(nl * 0.9, sqrt(max(1.0 - dot(nl, nl), 0.02))));
  float tex = fbm3(p * 30.0 + i * 3.0);
  vec3 albedo = mix(vec3(0.16, 0.14, 0.13), vec3(0.27, 0.24, 0.21), tex) * (0.8 + 0.4 * h2);
  bool front = sin(ang) < 0.0;
  vec3 col = albedo * fireLight(p, n, front ? -0.05 : 0.45) * (front ? 2.6 : 2.2);
  // Soot on the side that faces the fire.
  col *= 1.0 - 0.4 * smoothstep(0.3, 1.0, dot(normalize(FIRE_C - c), nl));
  col += albedo * vec3(0.025, 0.03, 0.05) * max(n.y, 0.0);
  return vec4(tone(col) * mask, mask);
}

// ---- Smoke ----------------------------------------------------------------

vec4 smokeLayer(vec2 p, float t) {
  float y = p.y;
  if (y < 0.5) return vec4(0.0);
  vec2 sp = p;
  sp.x -= (uLean * 0.5 + 0.12) * pow(max(y - 0.4, 0.0), 1.25);
  float spread = 0.18 + 0.28 * max(y - 0.7, 0.0);
  float col = exp(-pow(sp.x / spread, 2.0));
  if (col < 0.01) return vec4(0.0);
  vec2 wq = vec2(sp.x * 1.4, y * 0.8 - t * 0.22);
  vec2 w = vec2(fbm3(wq), fbm3(wq + 4.7)) - 0.5;
  float s = fbm(vec2(sp.x * 1.8, y * 1.1 - t * 0.3) + w * 1.6);
  s = smoothstep(0.42, 0.78, s) * col;
  s *= smoothstep(0.6, 1.4, y) * (1.0 - smoothstep(1.8, 3.6, y));
  float a = s * uSmoke * 0.32;
  // Lit warm from below, grey-blue higher up.
  vec3 c = mix(vec3(0.5, 0.3, 0.2), vec3(0.32, 0.31, 0.36), smoothstep(1.0, 2.2, y));
  c *= 0.55 + 0.25 * uFlicker * (1.0 - smoothstep(0.8, 1.6, y));
  return vec4(c * a, a);
}

// ---- Scene ----------------------------------------------------------------

void main() {
  vec2 frag = vUv * uRes;
  float S = uFire.z;
  vec2 p = (frag - uFire.xy) / S;
  float px = 1.0 / S;
  float t = uTime;
  vec4 acc = vec4(0.0);

  // Smoke drifts high above the fire.
  over(acc, smokeLayer(p, uClock));

  // Warm air around the fire, and light pooling on the ground.
  {
    vec2 g = (p - vec2(0.0, 0.35)) / vec2(0.85, 1.0);
    float k = (0.85 + 0.3 * uFlicker + 0.7 * uFlare) * uIntensity;
    vec3 air = vec3(1.0, 0.42, 0.12) * exp(-dot(g, g) * 2.0 / max(uGlow, 0.05)) * 0.22 * uGlow * k;
    vec2 gp = (p - vec2(0.0, -0.18)) / vec2(1.7, 0.42);
    vec3 ground = vec3(0.7, 0.2, 0.05) * exp(-dot(gp, gp) * 2.2) * 0.28 * uGlow * k;
    addLight(acc, tone(air + ground));
  }

  // The wood and stones sit a little smaller than the flames.
  vec2 pb = p / BASE;
  float pxb = px / BASE;
  bool nearBase = abs(pb.x) < 1.25 && pb.y > -0.5 && pb.y < 0.4;

  // Stones behind the fire.
  if (uStones > 0.5 && nearBase) {
    // Only at the sides: a stone right behind the flames just reads as a blob.
    for (int i = 0; i < 4; i++) {
      float ang = i < 2 ? 0.15 + float(i) * 0.5 : 2.5 + float(i - 2) * 0.5;
      over(acc, stone(pb, ang, float(i), pxb));
    }
  }

  if (abs(pb.x) < 0.75 && pb.y > -0.3 && pb.y < 0.05) over(acc, coalLayer(pb, pxb));

  // Logs at the back, then the little upright stick.
  if (nearBase) {
    over(acc, logLayer(pb, vec2(-0.74, -0.07), vec2(0.42, 0.1), 0.082, 1.0, pxb));
    over(acc, logLayer(pb, vec2(0.76, -0.06), vec2(-0.34, 0.12), 0.078, 2.0, pxb));
    over(acc, logLayer(pb, vec2(-0.12, -0.08), vec2(0.13, 0.27), 0.045, 3.0, pxb));
  }

  // Flames.
  if (abs(p.x) < 0.95 && p.y > -0.2 && p.y < uHeight * 2.0 + 0.3) {
    float k = flameHeat(p, t);
    if (k > 0.0) {
      // Fairly crisp edges: real flames have a visible boundary.
      vec3 fc = flameColor(k) * smoothstep(0.07, 0.2, k);
      addLight(acc, tone(fc));
    }
  }

  // Front log, then front stones.
  if (nearBase) {
    over(acc, logLayer(pb, vec2(-0.66, -0.21), vec2(0.6, -0.13), 0.092, 4.0, pxb));
  }
  if (uStones > 0.5 && nearBase) {
    for (int i = 0; i < 5; i++) {
      float ang = 3.6 + float(i) * 0.58;
      over(acc, stone(pb, ang, float(i + 4), pxb));
    }
  }

  outColor = acc;
}`;

export const COMPOSITE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene;
uniform vec2 uRes;
uniform vec3 uFire;
uniform float uClock;
uniform float uHaze;
uniform float uHeight;
uniform float uLean;
${NOISE}
void main() {
  vec2 p = (vUv * uRes - uFire.xy) / uFire.z;
  p.x -= uLean * max(p.y, 0.0) * max(p.y, 0.0) * 0.3;
  // Shimmer sits in the column of hot air above the flames.
  float m = smoothstep(0.2, 0.75 * uHeight, p.y) * (1.0 - smoothstep(1.4 * uHeight, 2.6 * uHeight, p.y));
  m *= exp(-pow(p.x / (0.28 + 0.18 * max(p.y, 0.0)), 2.0));
  vec2 off = vec2(0.0);
  if (m > 0.002) {
    vec2 q = vec2(p.x * 5.0, p.y * 3.2 - uClock * 2.2);
    off = vec2(vnoise(q) - 0.5, vnoiseG(q + 7.0) - 0.5);
    off += 0.5 * vec2(vnoise(q * 2.3 + 3.0) - 0.5, vnoiseG(q * 2.3 - 5.0) - 0.5);
    off *= m * uHaze * uFire.z * 0.022 / uRes;
  }
  outColor = texture(uScene, vUv + off);
}`;

export const SPARK_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aP0;   // x, y, vx, vy (pixels, y down)
layout(location = 2) in vec4 aP1;   // heat, size, seed, kind
uniform vec2 uRes;
uniform float uTime;
uniform float uShutter;
out vec2 vLocal;
out float vHalf;
out float vW;
out vec4 vInfo;
void main() {
  vec2 vel = aP0.zw;
  float sp = length(vel);
  vec2 dir = sp > 1e-3 ? vel / sp : vec2(0.0, -1.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float w = aP1.y;
  float half_ = sp * uShutter * 0.5 * (aP1.w > 0.5 ? 0.35 : 1.0);
  vec2 local = vec2(aCorner.x * w * 3.0, aCorner.y * (half_ + w * 3.0));
  vec2 pos = aP0.xy + nrm * local.x + dir * local.y;
  vLocal = local;
  vHalf = half_;
  vW = w;
  vInfo = aP1;
  gl_Position = vec4(pos.x / uRes.x * 2.0 - 1.0, 1.0 - pos.y / uRes.y * 2.0, 0.0, 1.0);
}`;

export const SPARK_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vLocal;
in float vHalf;
in float vW;
in vec4 vInfo;
out vec4 outColor;
uniform float uTime;
vec3 sparkColor(float h) {
  return vec3(min(1.0, 0.35 + h * 1.4),
              clamp((h - 0.15) * 1.25, 0.0, 1.0) * 0.85,
              clamp((h - 0.7) * 2.0, 0.0, 1.0) * 0.6);
}
void main() {
  float heat = vInfo.x;
  float seed = vInfo.z;
  bool ember = vInfo.w > 0.5;
  float along = max(abs(vLocal.y) - vHalf, 0.0);
  float d = length(vec2(along, vLocal.x)) / vW;
  float core = exp(-d * d * 1.8);
  float halo = exp(-d * d * 0.35) * (ember ? 0.35 : 0.22);
  // Long streaks spread the same light over more pixels.
  float energy = vW / (vW + vHalf * 0.35);
  float flick = 0.6 + 0.4 * sin(uTime * (14.0 + seed * 30.0) + seed * 80.0);
  if (ember) flick = 0.55 + 0.45 * sin(uTime * (3.0 + seed * 5.0) + seed * 50.0);
  float fade = smoothstep(0.0, 0.25, heat);
  vec3 c = sparkColor(ember ? heat * 0.8 : heat) * (core * 1.6 + halo) * energy * flick * fade;
  c = 1.0 - exp(-c * 1.6);
  outColor = vec4(c, max(c.r, max(c.g, c.b)));
}`;
