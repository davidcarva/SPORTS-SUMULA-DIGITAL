import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

/** Folha que sobe de baixo (bottom sheet) com mola. */
export function Folha({
  aberta,
  onFechar,
  children,
}: {
  aberta: boolean;
  onFechar: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {aberta && (
        <motion.div
          className="fixed inset-0 z-[55] flex items-end justify-center bg-black/45 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onFechar()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="borda-neon chanfro chanfro-lg w-full max-w-xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onFechar();
            }}
          >
            <div className="chanfro chanfro-lg max-h-[85vh] overflow-y-auto bg-popover px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <div className="mx-auto mb-3 h-1 w-12 -skew-x-12 bg-muted-foreground/40" />
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
