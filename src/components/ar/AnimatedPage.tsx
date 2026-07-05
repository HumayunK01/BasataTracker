import { motion, type Easing } from "motion/react";

const pageEase: Easing = [0.23, 1, 0.32, 1];

export function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: pageEase }}
      className="flex-1 flex flex-col min-w-0 overflow-hidden"
    >
      {children}
    </motion.div>
  );
}
