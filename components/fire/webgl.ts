// WebGL2 renderer: scene to an offscreen texture, composite with heat haze,
// then sparks on top.

import { makeNoiseTexels, hexToRgb } from "./noise";
import { FLOATS_PER_PARTICLE } from "./particles";
import {
  COMPOSITE_FS,
  FULLSCREEN_VS,
  SCENE_FS,
  SPARK_FS,
  SPARK_VS,
} from "./shaders";
import type { FrameState, Renderer } from "./types";

type Program = { prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("Shader compile failed: " + log);
  }
  return sh;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string, uniforms: string[]): Program {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Program link failed: " + gl.getProgramInfoLog(prog));
  }
  const u: Program["u"] = {};
  for (const name of uniforms) u[name] = gl.getUniformLocation(prog, name);
  return { prog, u };
}

const SCENE_UNIFORMS = [
  "uRes", "uFire", "uTime", "uClock", "uIntensity", "uHeight", "uWidth", "uLean",
  "uTurb", "uSmoke", "uGlow", "uEmbers", "uExposure", "uFlicker", "uFlare",
  "uStones", "uCore", "uMid", "uEdge", "uNoise",
];

export function createWebGLRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  if (!gl) return null;

  let scene: Program, comp: Program, spark: Program;
  try {
    scene = program(gl, FULLSCREEN_VS, SCENE_FS, SCENE_UNIFORMS);
    comp = program(gl, FULLSCREEN_VS, COMPOSITE_FS, [
      "uScene", "uNoise", "uRes", "uFire", "uClock", "uHaze", "uHeight", "uLean",
    ]);
    spark = program(gl, SPARK_VS, SPARK_FS, ["uRes", "uTime", "uShutter"]);
  } catch (err) {
    console.warn("[fire] WebGL setup failed, falling back.", err);
    return null;
  }

  // Noise texture, repeating, linear filtered.
  const noiseTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, noiseTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, makeNoiseTexels());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  // Offscreen target for the scene.
  const sceneTex = gl.createTexture();
  const fbo = gl.createFramebuffer();
  let fbW = 0, fbH = 0;
  function ensureTarget(w: number, h: number) {
    if (w === fbW && h === fbH) return;
    fbW = w;
    fbH = h;
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, sceneTex);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA8, w, h, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, sceneTex, 0);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
  }

  // Spark geometry: one quad, instanced.
  const emptyVao = gl.createVertexArray();
  const sparkVao = gl.createVertexArray();
  const cornerBuf = gl.createBuffer();
  const instBuf = gl.createBuffer();
  let instCapacity = 0;
  gl.bindVertexArray(sparkVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
  const stride = FLOATS_PER_PARTICLE * 4;
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16);
  gl.vertexAttribDivisor(2, 1);
  gl.bindVertexArray(null);

  let lost = false;
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
  };
  canvas.addEventListener("webglcontextlost", onLost);

  let colorKey = "";
  let colors = { core: [1, 1, 1], mid: [1, 1, 1], edge: [1, 1, 1] } as Record<string, number[]>;

  return {
    kind: "webgl",
    get lost() {
      return lost;
    },
    render(f: FrameState) {
      if (lost) return;
      const w = canvas.width, h = canvas.height;
      if (!w || !h) return;
      ensureTarget(w, h);
      const s = f.settings;
      const key = s.core + s.mid + s.edge;
      if (key !== colorKey) {
        colorKey = key;
        colors = { core: hexToRgb(s.core), mid: hexToRgb(s.mid), edge: hexToRgb(s.edge) };
      }
      // Fire base in GL pixels (y up).
      const fx = f.fx, fy = h - f.fy;

      // 1. Scene.
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, w, h);
      gl.disable(gl.BLEND);
      gl.useProgram(scene.prog);
      const u = scene.u;
      gl.uniform2f(u.uRes, w, h);
      gl.uniform3f(u.uFire, fx, fy, f.size);
      gl.uniform1f(u.uTime, f.flameTime);
      gl.uniform1f(u.uClock, f.t);
      gl.uniform1f(u.uIntensity, s.intensity);
      gl.uniform1f(u.uHeight, s.height);
      gl.uniform1f(u.uWidth, s.width);
      gl.uniform1f(u.uLean, f.lean);
      gl.uniform1f(u.uTurb, s.turbulence);
      gl.uniform1f(u.uSmoke, s.smoke);
      gl.uniform1f(u.uGlow, s.glow);
      gl.uniform1f(u.uEmbers, s.embers);
      gl.uniform1f(u.uExposure, s.exposure);
      gl.uniform1f(u.uFlicker, f.flicker);
      gl.uniform1f(u.uFlare, f.flare);
      gl.uniform1f(u.uStones, s.stones ? 1 : 0);
      gl.uniform3fv(u.uCore, colors.core);
      gl.uniform3fv(u.uMid, colors.mid);
      gl.uniform3fv(u.uEdge, colors.edge);
      gl.uniform1i(u.uNoise, 1);
      gl.bindVertexArray(emptyVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 2. Composite with heat haze.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(comp.prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sceneTex);
      gl.uniform1i(comp.u.uScene, 0);
      gl.uniform1i(comp.u.uNoise, 1);
      gl.uniform2f(comp.u.uRes, w, h);
      gl.uniform3f(comp.u.uFire, fx, fy, f.size);
      gl.uniform1f(comp.u.uClock, f.t);
      gl.uniform1f(comp.u.uHaze, s.haze);
      gl.uniform1f(comp.u.uHeight, s.height);
      gl.uniform1f(comp.u.uLean, f.lean);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 3. Sparks, added on top.
      const n = f.particles.count;
      if (n > 0) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.useProgram(spark.prog);
        gl.uniform2f(spark.u.uRes, w, h);
        gl.uniform1f(spark.u.uTime, f.t);
        gl.uniform1f(spark.u.uShutter, 1 / 160);
        gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
        const data = f.particles.out.subarray(0, n * FLOATS_PER_PARTICLE);
        if (n > instCapacity) {
          instCapacity = f.particles.max;
          gl.bufferData(gl.ARRAY_BUFFER, instCapacity * FLOATS_PER_PARTICLE * 4, gl.DYNAMIC_DRAW);
        }
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
        gl.bindVertexArray(sparkVao);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
        gl.bindVertexArray(null);
        gl.disable(gl.BLEND);
      }
    },
    destroy() {
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteTexture(noiseTex);
      gl.deleteTexture(sceneTex);
      gl.deleteFramebuffer(fbo);
      gl.deleteBuffer(cornerBuf);
      gl.deleteBuffer(instBuf);
      gl.deleteVertexArray(emptyVao);
      gl.deleteVertexArray(sparkVao);
      gl.deleteProgram(scene.prog);
      gl.deleteProgram(comp.prog);
      gl.deleteProgram(spark.prog);
    },
  };
}
