// Procedural campfire for the home hero. Loaded on demand (dynamic import)
// so song pages stay lightweight. Returns a stop() to cancel the loop.
import * as THREE from "./vendor/three.module.min.js";

export function initFire(canvas, reduce = false) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
  };

  const material = new THREE.ShaderMaterial({
    transparent: true,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uRes;

      vec2 hash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                       dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
                   mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                       dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
        return v;
      }

      void main() {
        vec2 uv = vUv;
        float aspect = uRes.x / uRes.y;
        vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);
        float t = uTime;

        vec2 q = vec2(p.x * 2.2, p.y * 1.4 - t * 0.9);
        float n = fbm(q + fbm(q + t * 0.15));

        float sway = 0.045 * sin(p.y * 3.4 + t * 1.6) * (0.3 + p.y);
        float x = p.x + sway + 0.06 * n;

        float width = mix(0.46, 0.03, pow(smoothstep(0.0, 1.05, uv.y), 0.72));
        float body = 1.0 - smoothstep(0.0, width, abs(x));

        float base = smoothstep(-0.02, 0.12, uv.y);
        float top = 1.0 - smoothstep(0.66, 1.04, uv.y);
        float flame = body * base * top;
        flame *= 0.82 + 0.55 * n;
        flame = clamp(flame, 0.0, 1.0);

        float heat = flame * (1.35 - 0.45 * uv.y);
        vec3 col = vec3(0.0);
        col = mix(col, vec3(0.6, 0.05, 0.0), smoothstep(0.05, 0.35, heat));
        col = mix(col, vec3(1.0, 0.35, 0.0), smoothstep(0.30, 0.60, heat));
        col = mix(col, vec3(1.0, 0.75, 0.15), smoothstep(0.55, 0.85, heat));
        col = mix(col, vec3(1.0, 0.96, 0.78), smoothstep(0.85, 1.15, heat));

        float sparks = 0.0;
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          float sy = fract(uv.y * 1.3 + t * (0.5 + fi * 0.17) + fi * 0.37);
          float s = noise(vec2(p.x * 3.0, sy * 8.0) + fi * 13.0);
          sparks += smoothstep(0.75, 1.0, s) * (1.0 - uv.y) * base;
        }
        col += vec3(1.0, 0.7, 0.3) * sparks * 0.9;

        float alpha = clamp(flame + sparks, 0.0, 1.0);
        alpha = max(alpha, flame * 0.6);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(quad);

  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(r.width, r.height, false);
    uniforms.uRes.value.set(r.width, r.height);
  }
  window.addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();
  let raf = 0;
  let stopped = false;

  function frame() {
    if (stopped) return;
    uniforms.uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  if (reduce) {
    uniforms.uTime.value = 2.0;
    renderer.render(scene, camera);
  } else {
    frame();
  }

  return function stop() {
    stopped = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    material.dispose();
    quad.geometry.dispose();
    renderer.dispose();
  };
}
