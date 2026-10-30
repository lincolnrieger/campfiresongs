import Link from "next/link";
import { site } from "@/config/site";
import { getUser } from "@/lib/auth/session";
import { Icon } from "../ui/Icon";
import styles from "./Header.module.css";

export async function Header() {
  const user = await getUser();
  const reviewer = user?.role === "reviewer" || user?.role === "admin";
  const links = (
    <>
      <li><Link href="/songs">Songs</Link></li>
      <li><Link href="/about">About</Link></li>
      {reviewer && <li><Link href="/review">Review</Link></li>}
      {user?.role === "admin" && <li><Link href="/admin">Admin</Link></li>}
      <li>
        {user ? (
          <Link href="/account" className={styles.account}>
            <Icon name="person" size={18} /> {user.display_name || "Your stuff"}
          </Link>
        ) : (
          <Link href="/login">Sign in</Link>
        )}
      </li>
      <li>
        <Link href="/submit" className={`btn btn-small ${styles.add}`}>
          <Icon name="plus" size={18} /> Add a song
        </Link>
      </li>
    </>
  );
  return (
    <header className={styles.header}>
      <a className="skip" href="#main">Skip to content</a>
      <div className={`wrap ${styles.bar}`}>
        <Link href="/" className={styles.brand} aria-label={`${site.name} home`}>
          <Icon name="billy" size={34} className={styles.billy} />
          <span>
            Campfire<span className={styles.songs}>Songs</span>
          </span>
        </Link>
        <nav aria-label="Main" className={styles.wide}>
          <ul>{links}</ul>
        </nav>
        <details className={styles.menu}>
          <summary>
            <span>Menu</span>
          </summary>
          <nav aria-label="Main">
            <ul>{links}</ul>
          </nav>
        </details>
      </div>
    </header>
  );
}
