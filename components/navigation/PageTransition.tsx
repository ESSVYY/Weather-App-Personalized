"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const reduced = useReducedMotion();
  return <motion.div className="site-page-transition" key={pathname} initial={{ opacity: 0, y: reduced ? 0 : 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? .12 : .42, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}
