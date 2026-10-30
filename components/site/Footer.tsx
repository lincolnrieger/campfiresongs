import Link from "next/link";
import { site } from "@/config/site";
import { Icon } from "../ui/Icon";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.inner}`}>
        <div className={styles.sign}>
          <Icon name="constellation" size={46} className={styles.stars} />
          <p>
            {site.name} is made for and with young people, so the songs keep going round the fire.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul>
            <li><Link href="/songs">Song bank</Link></li>
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
