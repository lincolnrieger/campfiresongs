import type { Particles } from "./particles";
import type { FireSettings } from "./settings";

export type FrameState = {
  /** Real seconds since start. */
  t: number;
  dt: number;
  /** Flame time: like t, but scaled by the speed setting. */
  flameTime: number;
  /** Fire base in render pixels (y down) and size in pixels. */
  fx: number;
  fy: number;
  size: number;
  /** Current lean of the flames (wind plus pointer). */
  lean: number;
  /** -1..1 low-frequency flicker shared with the page lighting. */
  flicker: number;
  /** 0..1 brief flare after a log shifts or a tap. */
  flare: number;
  settings: FireSettings;
  particles: Particles;
  /** Pixel ratio of the render target. */
  px: number;
};

export type Renderer = {
  kind: "webgl" | "canvas";
  readonly lost: boolean;
  render(frame: FrameState): void;
  destroy(): void;
};
