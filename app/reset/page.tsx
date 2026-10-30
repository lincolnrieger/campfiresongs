import type { Metadata } from "next";
import { ResetRequestForm } from "@/components/auth/forms";
import styles from "@/components/auth/auth.module.css";

export const metadata: Metadata = { title: "Reset your password" };

export default function Reset() {
  return (
    <div className={`wrap page ${styles.narrow}`}>
      <h1>Forgotten your password?</h1>
      <p className="lede">Pop your email in and we&rsquo;ll send you a link to pick a new one.</p>
      <ResetRequestForm />
    </div>
  );
}
