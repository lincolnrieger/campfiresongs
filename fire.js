import * as THREE from "three";

const canvas = document.getElementById("fire");
const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const uniforms = {
  uTime: { value: 0 },
  uRes: { value: new THREE.Vector2(1, 1) },
};

// Procedural campfire flame: fractal-brownian-motion noise scrolling upward,
// masked into a flame envelope, then mapped through a hot-to-cool colour ramp.
const material = new THREE.ShaderMaterial({
  transparent: true,
  uniforms,
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec2 uRes;

    // -- value noise + fbm --
    vec2 hash(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                     dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
                 mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                     dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 6; i++) {
        v += a * noise(p);
        p *= 2.02;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      // aspect-correct coordinates, origin at the base centre of the fire
      vec2 uv = vUv;
      float aspect = uRes.x / uRes.y;
      vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);

      float t = uTime;

      // upward-scrolling turbulent domain — this is what makes it lick & flicker
      vec2 q = vec2(p.x * 2.2, p.y * 1.4 - t * 0.9);
      float n = fbm(q + fbm(q + t * 0.15));

      // horizontal wobble so the column sways
      float sway = 0.045 * sin(p.y * 3.4 + t * 1.6) * (0.3 + p.y);
      float x = p.x + sway + 0.06 * n;

      // flame envelope: wide, rounded base tapering to a licking point at the top
      float width = mix(0.44, 0.03, pow(smoothstep(0.0, 1.05, uv.y), 0.75));
      float body = 1.0 - smoothstep(0.0, width, abs(x));

      // vertical falloff + turbulent erosion of the tip
      float base = smoothstep(-0.02, 0.14, uv.y);        // fade in from the logs
      float top = 1.0 - smoothstep(0.5, 1.02, uv.y);     // fade out at the top
      float flame = body * base * top;
      flame *= 0.75 + 0.6 * n;                            // eaten away by noise
      flame = clamp(flame, 0.0, 1.0);

      // heat: hottest at the core & base, cooler at the fringes & tip
      float heat = flame * (1.25 - 0.5 * uv.y);

      // colour ramp: black -> deep red -> orange -> yellow -> white-hot
      vec3 col = vec3(0.0);
      col = mix(col, vec3(0.6, 0.05, 0.0), smoothstep(0.05, 0.35, heat));
      col = mix(col, vec3(1.0, 0.35, 0.0), smoothstep(0.30, 0.60, heat));
      col = mix(col, vec3(1.0, 0.75, 0.15), smoothstep(0.55, 0.85, heat));
      col = mix(col, vec3(1.0, 0.95, 0.75), smoothstep(0.85, 1.15, heat));

      // rising embers — tiny bright specks that drift up through the flame
      float sparks = 0.0;
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float speed = 0.5 + fi * 0.17;
        float sy = fract(uv.y * 1.3 + t * speed + fi * 0.37);
        vec2 sp = vec2(p.x * 3.0, sy * 8.0);
        float s = noise(sp + fi * 13.0);
        float m = smoothstep(0.75, 1.0, s) * (1.0 - uv.y) * base;
        sparks += m;
      }
      col += vec3(1.0, 0.7, 0.3) * sparks * 0.9;

      float alpha = clamp(flame + sparks, 0.0, 1.0);
      // soft outer glow
      alpha = max(alpha, flame * 0.6);
      gl_FragColor = vec4(col, alpha);
    }
  `,
});

const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
scene.add(quad);

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(rect.width, rect.height, false);
  uniforms.uRes.value.set(rect.width, rect.height);
}
window.addEventListener("resize", resize);
resize();

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clock = new THREE.Clock();

function frame() {
  uniforms.uTime.value = reduce ? 2.0 : clock.getElapsedTime();
  renderer.render(scene, camera);
  if (!reduce) requestAnimationFrame(frame);
}
frame();
if (reduce) renderer.render(scene, camera);
