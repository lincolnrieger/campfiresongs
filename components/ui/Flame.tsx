import styles from "./Flame.module.css";

/** A small flickering flame. Pure SVG and CSS, so it costs next to nothing. */
export function Flame({ size = 40, still = false }: { size?: number; still?: boolean }) {
  return (
    <span className={`${styles.flame} ${still ? styles.still : ""}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <path className={styles.outer} d="M20 3c2 6 9 10 9 19a9 9 0 0 1-18 0c0-5 3-8 4-12 1 3 3 4 4 4-1-4 0-8 1-11z" />
        <path className={styles.inner} d="M20 17c1 3 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 3 2 0-2 0-4 0-6z" />
      </svg>
    </span>
  );
}
