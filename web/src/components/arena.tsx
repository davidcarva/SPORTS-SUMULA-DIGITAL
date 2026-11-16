import { AnimatePresence, type HTMLMotionProps, motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { textoSobre } from "@/lib/cor";
import { cn } from "@/lib/utils";
import { Destaque } from "./Destaque";

type Estilo = CSSProperties & Record<`--${string}`, string | number>;

/** Cartão chanfrado com borda em gradiente neon. */
export function Cartao({
  cor,
  cor2,
  className,
  miolo,
  children,
  chanfro = "chanfro",
}: {
  cor?: string;
  cor2?: string;
  className?: string;
  miolo?: string;
  children: ReactNode;
  chanfro?: string;
}) {
  const estilo: Estilo = {};
  if (cor) estilo["--cor"] = cor;
  if (cor2) estilo["--cor2"] = cor2;
  return (
    <div className={cn("borda-neon", chanfro, className)} style={estilo}>
      <div className={cn(chanfro, "h-full bg-card/95 backdrop-blur", miolo)}>{children}</div>
    </div>
  );
}

/** Botão chanfrado com "aperto" ao tocar. */
export function Botao({
  className,
  variante = "neutro",
  cor,
  children,
  style,
  ...resto
}: HTMLMotionProps<"button"> & { variante?: "neutro" | "cor" | "contorno" | "perigo"; cor?: string }) {
  const base =
    "chanfro chanfro-sm relative inline-flex select-none items-center justify-center gap-2 px-4 py-3 font-display-reta text-sm transition-colors disabled:pointer-events-none disabled:opacity-45";
  const variantes = {
    neutro: "bg-secondary text-secondary-foreground hover:bg-accent",
    cor: "text-[var(--txt)] bg-[var(--cor)] hover:brightness-110",
    contorno: "bg-transparent text-foreground ring-1 ring-inset ring-border hover:bg-secondary",
    perigo: "bg-destructive/15 text-destructive hover:bg-destructive/25",
  } as const;
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 700, damping: 30 }}
      className={cn(base, variantes[variante], className)}
      style={{ ...(cor ? { "--cor": cor } : {}), ...style } as Estilo}
      {...resto}
    >
      {children}
    </motion.button>
  );
}

/** Número que "troca de placa" quando muda. */
export function NumeroAnimado({ valor, className }: { valor: number | string; className?: string }) {
  return (
    <span className={cn("relative inline-grid overflow-hidden px-[0.12em] align-bottom", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={String(valor)}
          initial={{ y: "70%", opacity: 0, filter: "blur(8px)", skewX: -12 }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)", skewX: 0 }}
          exit={{ y: "-70%", opacity: 0, filter: "blur(8px)", skewX: 12 }}
          transition={{ type: "spring", stiffness: 520, damping: 34 }}
          className="col-start-1 row-start-1"
        >
          {valor}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Selo octogonal (estilo brasão) com o número da camisa. */
export function Selo({ cor, children, className }: { cor: string; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn("chanfro-oct grid place-items-center font-display", className)}
      style={{ background: `linear-gradient(140deg, ${cor}, color-mix(in oklab, ${cor} 45%, #111111))`, color: textoSobre(cor) }}
    >
      {children}
    </span>
  );
}

export function TituloSecao({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-display text-xl text-foreground">
        <Destaque de="esquerda" naTela>
          {children}
        </Destaque>
      </h2>
      {extra}
    </div>
  );
}
