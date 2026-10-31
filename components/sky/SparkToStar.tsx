"use client";

import { useEffect, useState, type CSSProperties } from "react";
import styles from "./SparkToStar.module.css";

/** A spark lifts off the page and settles into the sky as a new star. */
export function SparkToStar() {
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const x = window.innerWidth * (0.25 + Math.random() * 0.5);
    const y = window.innerHeight * (0.08 + Math.random() * 0.18);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.dispatchEvent(new CustomEvent("campfire:star", { detail: { x, y } }));
      return;
    }
    setTarget({ x, y });
    const done = setTimeout(() => window.dispatchEvent(new CustomEvent("campfire:star", { detail: { x, y } })), 2600);
    return () => clearTimeout(done);
  }, []);

  if (!target) return null;
  return (
    <span
      className={styles.spark}
      aria-hidden="true"
      style={{ "--tx": `${target.x}px`, "--ty": `${target.y}px` } as CSSProperties}
    />
  );
}
