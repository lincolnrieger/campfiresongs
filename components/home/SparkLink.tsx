"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/** A link that throws a handful of sparks into the fire when you reach for it. */
export function SparkLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const burst = () => window.dispatchEvent(new CustomEvent("campfire:burst", { detail: { strength: 0.8 } }));
  return (
    <Link href={href} className={className} onPointerEnter={burst} onFocus={burst}>
      {children}
    </Link>
  );
}
