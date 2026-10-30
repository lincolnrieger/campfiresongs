import { Fire } from "@/components/fire/Fire";
import { Starfield } from "@/components/sky/Starfield";
import { site } from "@/config/site";
import styles from "./holding.module.css";

// Temporary home while the fire is being tuned. Replaced in phase 3.
export default function Home() {
  return (
    <main className={styles.main}>
      <Starfield />
      <Fire
       
        anchor={{ x: 0.66, y: 0.84, scale: 0.4 }}
        anchorNarrow={{ x: 0.5, y: 0.86, scale: 0.3 }}
      />
      <h1 className={styles.title}>{site.name}</h1>
    </main>
  );
}
