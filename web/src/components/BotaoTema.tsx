import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { trocarTema, useTema } from "@/lib/tema";

/** Alterna entre off-white e grafite. A escolha fica salva no aparelho. */
export function BotaoTema({ className = "" }: { className?: string }) {
  const tema = useTema();
  const escuro = tema === "escuro";
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={() => trocarTema(escuro ? "claro" : "escuro")}
      className={`chanfro chanfro-sm relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden bg-secondary text-foreground ${className}`}
      aria-label={escuro ? "Usar tema claro (off-white)" : "Usar tema escuro (grafite)"}
      title={escuro ? "Tema claro" : "Tema escuro"}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={tema}
          initial={{ y: 18, rotate: -60, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: -18, rotate: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          {escuro ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
