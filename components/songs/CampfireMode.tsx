"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import styles from "./CampfireMode.module.css";

const SIZE_KEY = "campfire:text-size";
const SIZES = [1.3, 1.55, 1.85, 2.2, 2.65, 3.1];

type WakeLock = { release: () => Promise<void> };

/**
 * Big, high-contrast words for reading in the dark. Keeps the screen awake
 * where the browser allows it, and remembers your text size.
 */
export function CampfireMode({ title, lyrics, chords }: { title: string; lyrics: string; chords: string | null }) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(2);
  const [awake, setAwake] = useState<"on" | "off" | "unsupported">("off");
  const lock = useRef<WakeLock | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIZE_KEY);
      const s = raw === null ? NaN : Number(raw);
      if (Number.isInteger(s) && s >= 0 && s < SIZES.length) setSize(s);
    } catch {}
  }, []);

  const changeSize = (d: number) => {
    setSize((s) => {
      const n = Math.max(0, Math.min(SIZES.length - 1, s + d));
      try {
        localStorage.setItem(SIZE_KEY, String(n));
      } catch {}
      return n;
    });
  };

  const requestLock = useCallback(async () => {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLock> } };
    if (!nav.wakeLock) {
      setAwake("unsupported");
      return;
    }
    try {
      lock.current = await nav.wakeLock.request("screen");
      setAwake("on");
    } catch {
      setAwake("off");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void requestLock();
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    // The lock drops when the tab is hidden; take it again on return.
    const onVis = () => document.visibilityState === "visible" && void requestLock();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "+" || e.key === "=") changeSize(1);
      if (e.key === "-") changeSize(-1);
      if (e.key === "Tab" && dialog.current) {
        // Keep focus inside while open.
        const f = dialog.current.querySelectorAll<HTMLElement>("button");
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("keydown", onKey);
      void lock.current?.release().catch(() => {});
      lock.current = null;
      setAwake("off");
      opener.current?.focus();
    };
  }, [open, requestLock]);

  return (
    <>
      <button ref={opener} className="btn" type="button" onClick={() => setOpen(true)}>
        <Icon name="moon" size={20} /> Campfire Mode
      </button>
      {open && (
        <div
          ref={dialog}
          className={styles.mode}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cm-title"
          tabIndex={-1}
          style={{ fontSize: `${SIZES[size]}rem` }}
        >
          <div className={styles.bar}>
            <span className={styles.status} aria-live="polite">
              {awake === "on" ? "Screen will stay on" : awake === "unsupported" ? "Your phone may still dim the screen" : ""}
            </span>
            <div className={styles.controls}>
              <button type="button" onClick={() => changeSize(-1)} disabled={size === 0} aria-label="Smaller text">
                <Icon name="minus" size={22} /> A
              </button>
              <button type="button" onClick={() => changeSize(1)} disabled={size === SIZES.length - 1} aria-label="Bigger text">
                <Icon name="plus" size={22} /> A
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close Campfire Mode">
                <Icon name="close" size={22} />
              </button>
            </div>
          </div>
          <div className={styles.page}>
            <h2 id="cm-title" className={styles.title}>{title}</h2>
            <p className={styles.words}>{lyrics}</p>
            {chords && (
              <>
                <h3 className={styles.sub}>Chords</h3>
                <p className={styles.chords}>{chords}</p>
              </>
            )}
          </div>
          <div className={styles.glow} aria-hidden="true" />
        </div>
      )}
    </>
  );
}
