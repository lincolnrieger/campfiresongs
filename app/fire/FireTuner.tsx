"use client";

import { useEffect, useState } from "react";
import { Fire } from "@/components/fire/Fire";
import type { EngineStats } from "@/components/fire/engine";
import { DEFAULT_FIRE, SLIDERS, type FireSettings } from "@/components/fire/settings";
import { Starfield } from "@/components/sky/Starfield";
import styles from "./tuner.module.css";

const KEY = "campfire:tuning";

export function FireTuner() {
  const [s, setS] = useState<FireSettings>(DEFAULT_FIRE);
  const [open, setOpen] = useState(true);
  const [renderer, setRenderer] = useState<"auto" | "canvas">("auto");
  const [still, setStill] = useState(false);
  const [stats, setStats] = useState<EngineStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [quality, setQuality] = useState<number | undefined>(undefined);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get("q");
    if (q !== null) setQuality(Math.max(0, Math.min(2, Number(q))));
    const params = new URLSearchParams(location.search);
    if (params.get("r") === "canvas") setRenderer("canvas");
    if (params.has("still")) setStill(true);
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setS({ ...DEFAULT_FIRE, ...JSON.parse(saved) });
    } catch {}
  }, []);

  const update = (patch: Partial<FireSettings>) => {
    setS((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(s, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <main className={styles.main}>
      <Starfield />
      <Fire
       
        settings={s}
        renderer={renderer}
        quality={quality}
        still={still || undefined}
        anchor={{ x: open ? 0.4 : 0.5, y: 0.8, scale: 0.42 }}
        anchorNarrow={{ x: 0.5, y: open ? 0.55 : 0.82, scale: 0.3 }}
        onStats={setStats}
      />

      <button type="button" className={styles.toggle} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "Hide knobs" : "Knobs"}
      </button>

      {open && (
        <section className={styles.panel} aria-label="Fire settings">
          <h1 className={styles.heading}>Tune the fire</h1>
          <p className={styles.stats} aria-live="polite">
            {stats
              ? `${stats.renderer} · ${stats.fps} fps · quality ${stats.tier} · ${stats.particles} sparks`
              : "lighting…"}
          </p>

          {SLIDERS.map((sl) => (
            <label key={sl.key} className={styles.row}>
              <span>{sl.label}</span>
              <input
                type="range"
                min={sl.min}
                max={sl.max}
                step={sl.step}
                value={s[sl.key] as number}
                onChange={(e) => update({ [sl.key]: Number(e.target.value) } as Partial<FireSettings>)}
              />
              <output>{(s[sl.key] as number).toFixed(sl.step < 1 ? 2 : 0)}</output>
            </label>
          ))}

          <div className={styles.colours}>
            {(["core", "mid", "edge"] as const).map((k) => (
              <label key={k}>
                <input type="color" value={s[k]} onChange={(e) => update({ [k]: e.target.value })} />
                <span>{k}</span>
              </label>
            ))}
          </div>

          <label className={styles.check}>
            <input type="checkbox" checked={s.stones} onChange={(e) => update({ stones: e.target.checked })} />
            Ring of stones
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={renderer === "canvas"}
              onChange={(e) => setRenderer(e.target.checked ? "canvas" : "auto")}
            />
            Preview the no-WebGL fallback
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={still} onChange={(e) => setStill(e.target.checked)} />
            Preview reduced motion
          </label>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("campfire:burst", { detail: { strength: 1 } }))}
            >
              Throw a log on
            </button>
            <button type="button" onClick={copy}>
              {copied ? "Copied" : "Copy settings"}
            </button>
            <button type="button" onClick={() => update(DEFAULT_FIRE)}>
              Reset
            </button>
          </div>
          <p className={styles.hint}>
            Move your mouse near the flames, or tap the fire. Copied settings go into{" "}
            <code>components/fire/settings.ts</code>.
          </p>
        </section>
      )}
    </main>
  );
}
