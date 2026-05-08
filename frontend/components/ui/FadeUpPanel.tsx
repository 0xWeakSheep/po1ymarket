"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * App Router: framer-motion only runs in Client Components.
 * Use this wrapper instead of importing `motion` in Server Components (e.g. page shells / grids).
 */
export function FadeUpPanel({
  className,
  children,
  delay = 0,
}: {
  className?: string;
  children: ReactNode;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 40, scale: 0.96, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              duration: 0.7,
              delay,
              ease,
            }
      }
    >
      {children}
    </motion.div>
  );
}
