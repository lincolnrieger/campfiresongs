// Every knob the fire has. The /fire page edits these live; paste the copied
// JSON back into DEFAULT_FIRE to make a tune permanent.

export type FireSettings = {
  /** Overall brightness and heat of the flames. */
  intensity: number;
  /** Flame height, relative to the fire's size. */
  height: number;
  /** How wide the base of the fire spreads. */
  width: number;
  /** Steady wind. Negative blows left, positive blows right. */
  wind: number;
  /** How much the flames twist and break up. */
  turbulence: number;
  /** Speed of the whole fire. 1 is real time. */
  speed: number;
  /** Sparks per second, as a multiplier on the default rate. */
  sparkRate: number;
  /** Most particles alive at once (before the device's quality cap). */
  maxParticles: number;
  /** How often a log "shifts" and pops a burst of sparks. 0 turns it off. */
  pops: number;
  /** Smoke opacity. */
  smoke: number;
  /** Heat shimmer strength. */
  haze: number;
  /** Size and strength of the warm light around the fire. */
  glow: number;
  /** Brightness of the glowing cracks in the logs and the coal bed. */
  embers: number;
  /** Final exposure. Pushes the whole image brighter or darker. */
  exposure: number;
  /** Colours, hottest to coolest. */
  core: string;
  mid: string;
  edge: string;
  /** Show the ring of stones. */
  stones: boolean;
};

export const DEFAULT_FIRE: FireSettings = {
  intensity: 1,
  height: 1.05,
  width: 1,
  wind: 0.12,
  turbulence: 1,
  speed: 1,
  sparkRate: 1,
  maxParticles: 700,
  pops: 1,
  smoke: 0.75,
  haze: 0.7,
  glow: 1,
  embers: 1,
  exposure: 1,
  core: "#FFD27A",
  mid: "#F26B1D",
  edge: "#8A1C0A",
  stones: true,
};

/** Where the fire sits in its canvas, as fractions of width and height. */
export type FireAnchor = {
  x: number;
  y: number;
  /** Fire size as a fraction of the canvas height. */
  scale: number;
};

export type SliderSpec = {
  key: keyof FireSettings;
  label: string;
  min: number;
  max: number;
  step: number;
};

export const SLIDERS: SliderSpec[] = [
  { key: "intensity", label: "Intensity", min: 0.3, max: 1.8, step: 0.01 },
  { key: "height", label: "Flame height", min: 0.4, max: 1.8, step: 0.01 },
  { key: "width", label: "Width", min: 0.5, max: 1.6, step: 0.01 },
  { key: "wind", label: "Wind", min: -1, max: 1, step: 0.01 },
  { key: "turbulence", label: "Turbulence", min: 0, max: 2, step: 0.01 },
  { key: "speed", label: "Speed", min: 0.2, max: 2, step: 0.01 },
  { key: "sparkRate", label: "Spark rate", min: 0, max: 4, step: 0.05 },
  { key: "maxParticles", label: "Max particles", min: 50, max: 1500, step: 10 },
  { key: "pops", label: "Log pops", min: 0, max: 3, step: 0.05 },
  { key: "smoke", label: "Smoke", min: 0, max: 1.5, step: 0.01 },
  { key: "haze", label: "Heat haze", min: 0, max: 2, step: 0.01 },
  { key: "glow", label: "Glow", min: 0, max: 2, step: 0.01 },
  { key: "embers", label: "Coals & cracks", min: 0, max: 2, step: 0.01 },
  { key: "exposure", label: "Exposure", min: 0.4, max: 2, step: 0.01 },
];
