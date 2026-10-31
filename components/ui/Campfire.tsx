import type { ReactNode } from "react";
import styles from "./Campfire.module.css";

/** A drawn campfire: two crossed logs, a few flames and a soft glow. SVG + CSS only. */
export function Campfire({ size = 220 }: { size?: number }) {
  return (
    <div className={styles.fire} style={{ width: size, height: size }} aria-hidden="true">
      <div className={styles.glow} />
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <g className={styles.flames}>
          <path className={styles.f1} d="M100 30c6 22 34 40 34 78a34 34 0 0 1-68 0c0-20 12-32 16-48 4 10 10 14 14 14-3-14 0-30 4-44z" />
          <path className={styles.f2} d="M72 92c2 12 16 20 16 38a16 16 0 0 1-32 0c0-12 8-16 9-26 2 5 5 7 7 7-1-7-1-13 0-19z" />
          <path className={styles.f3} d="M130 88c3 13 18 22 18 41a17 17 0 0 1-34 0c0-12 7-17 9-27 2 5 5 7 7 7-1-8-1-14 0-21z" />
          <path className={styles.core} d="M100 82c3 12 16 20 16 40a16 16 0 0 1-32 0c0-10 6-15 8-23 2 5 5 7 7 7-1-8-1-16 1-24z" />
        </g>
        <g className={styles.logs}>
          <rect x="38" y="146" width="124" height="18" rx="9" transform="rotate(-14 100 155)" />
          <rect x="38" y="146" width="124" height="18" rx="9" transform="rotate(14 100 155)" />
          <circle cx="44" cy="171" r="7" className={styles.end} />
          <circle cx="156" cy="171" r="7" className={styles.end} />
        </g>
      </svg>
    </div>
  );
}

/** Night sky band: stars, a treeline along the bottom. Children sit on top. */
export function NightBand({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`${styles.band} ${className ?? ""}`}>
      <div className={styles.stars} aria-hidden="true">
        {STARS.map(([x, y, s, d], i) => (
          <span key={i} style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, animationDelay: `${d}s` }} />
        ))}
      </div>
      {children}
      <svg className={styles.trees} viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 80V52l20-18 14 14 22-30 20 28 16-14 24 26 18-20 26 22 14-12 30 24 22-34 18 26 20-16 26 22 16-14 30 20 18-28 24 30 20-12 28 18 16-22 22 26 20-14 26 20 14-26 24 32 20-16 24 18 18-30 26 30 20-12 30 22 16-24 22 28 18-14 28 16 20-30 24 30 18-12 26 20 22-26 20 24 18-16 28 22V80z" />
      </svg>
    </div>
  );
}

// [left %, top %, size px, twinkle delay s]
const STARS: [number, number, number, number][] = [
  [6, 18, 2, 0], [14, 42, 3, 1.2], [22, 12, 2, 2.1], [31, 30, 2, 0.6], [38, 8, 3, 1.8],
  [47, 22, 2, 2.6], [56, 10, 2, 0.3], [63, 34, 3, 1.5], [71, 16, 2, 2.9], [79, 40, 2, 0.9],
  [86, 9, 3, 2.2], [93, 28, 2, 1.1], [10, 62, 2, 2.4], [90, 58, 2, 0.4], [52, 48, 2, 1.7],
];
