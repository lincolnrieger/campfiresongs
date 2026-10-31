import Link from "next/link";
import { site } from "@/config/site";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.inner}`}>
        <p>{site.name}: campfire songs, checked by young people, free for everyone.</p>
        <nav aria-label="Footer">
          <ul>
            <li><Link href="/songs">Songs</Link></li>
            <li><Link href="/submit">Add a song</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/contact">Contact</Link></li>
            <li><Link href="/privacy">Privacy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
