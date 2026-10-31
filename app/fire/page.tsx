import type { Metadata } from "next";
import { FireTuner } from "./FireTuner";

export const metadata: Metadata = {
  title: "Fire",
  robots: { index: false, follow: false },
};

export default function FirePage() {
  return <FireTuner />;
}
