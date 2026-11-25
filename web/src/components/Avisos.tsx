import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Botao } from "./arena";

// ------------------------------------------------------------- toast

export interface Toast {
  id: number;
  texto: string;
  cor?: string;
  desfazer?: () => void;
  /** Botões de um toque embaixo do texto (ex.: o motivo do erro do adversário). Opcionais. */
  pergunta?: string;
  opcoes?: { rotulo: string; acao: () => void }[];
}

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mostrar = useCallback((t: Omit<Toast, "id">) => {
    clearTimeout(timer.current);
    setToast({ ...t, id: Date.now() });
    // Com opções, fica um pouco mais: o mesário pode responder entre um rali e outro.
    timer.current = setTimeout(() => setToast(null), t.opcoes?.length ? 9000 : 5000);
  }, []);
  const fechar = useCallback(() => setToast(null), []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, mostrar, fechar };
}

export function ToastView({ toast, onFechar }: { toast: Toast | null; onFechar: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className="chanfro chanfro-sm pointer-events-auto flex max-w-md flex-col gap-2 bg-foreground py-2.5 pr-2.5 pl-4 text-background shadow-2xl"
            style={{ boxShadow: `inset 3px 0 0 ${toast.cor ?? "var(--neon-volt)"}` }}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{toast.texto}</span>
              {toast.desfazer && (
                <button
                  type="button"
                  onClick={() => {
                    toast.desfazer?.();
                    onFechar();
                  }}
                  className="chanfro chanfro-sm shrink-0 bg-background/15 px-3 py-1.5 font-display-reta text-xs text-background hover:bg-background/25"
                >
                  Desfazer
                </button>
              )}
            </div>
            {toast.opcoes?.length ? (
              <div className="flex flex-col gap-1.5">
                {toast.pergunta && <span className="font-display-reta text-[10px] text-background/70">{toast.pergunta}</span>}
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${toast.opcoes.length}, minmax(0, 1fr))` }}>
                  {toast.opcoes.map((o) => (
                    <button
                      key={o.rotulo}
                      type="button"
                      onClick={o.acao}
                      className="chanfro chanfro-sm h-10 bg-background/15 px-2 font-display text-base text-background hover:bg-background/25"
                    >
                      {o.rotulo}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------- diálogo

export interface Pergunta {
  titulo: string;
  texto?: ReactNode;
  confirmar: string;
  perigo?: boolean;
  acao: () => void;
  extra?: { rotulo: string; acao: () => void };
}

export function Dialogo({ pergunta, onFechar }: { pergunta: Pergunta | null; onFechar: () => void }) {
  return (
    <AnimatePresence>
      {pergunta && (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onFechar()}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 480, damping: 32 }}
            className="borda-neon chanfro chanfro-lg w-full max-w-sm"
          >
            <div className="chanfro chanfro-lg bg-popover p-5">
              <h3 className="font-display text-2xl">{pergunta.titulo}</h3>
              {pergunta.texto && <div className="mt-2 text-sm text-muted-foreground">{pergunta.texto}</div>}
              <div className="mt-5 flex flex-col gap-2">
                {pergunta.extra && (
                  <Botao
                    variante="cor"
                    cor="var(--neon-volt)"
                    className="w-full [--txt:#05070d]"
                    onClick={() => {
                      onFechar();
                      pergunta.extra?.acao();
                    }}
                  >
                    {pergunta.extra.rotulo}
                  </Botao>
                )}
                <Botao
                  variante={pergunta.perigo ? "perigo" : "cor"}
                  cor="var(--neon-orange)"
                  className="w-full [--txt:#fff]"
                  onClick={() => {
                    onFechar();
                    pergunta.acao();
                  }}
                >
                  {pergunta.confirmar}
                </Botao>
                <Botao variante="contorno" className="w-full" onClick={onFechar}>
                  Voltar
                </Botao>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
