import { motion, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useRef } from "react";
import { textoSobre } from "@/lib/cor";
import { cn } from "@/lib/utils";

export type Direcao = "esquerda" | "direita" | "cima" | "baixo";

const FECHADO: Record<Direcao, string> = {
  esquerda: "inset(0% 100% 0% 0%)",
  direita: "inset(0% 0% 0% 100%)",
  cima: "inset(0% 0% 100% 0%)",
  baixo: "inset(100% 0% 0% 0%)",
};
const ABERTO = "inset(0% 0% 0% 0%)";

/**
 * Texto marcado: um bloco de cor desliza por trás da palavra e o texto troca de cor por cima dele.
 * São duas cópias do texto: a de baixo na cor normal e a de cima, recortada, sobre o bloco.
 * Para repetir a animação (ex.: a cada período novo), mude a `key` no componente pai.
 */
export function Destaque({
  children,
  de = "baixo",
  atraso = 0,
  cor,
  texto,
  naTela = false,
  className,
}: {
  children: ReactNode;
  de?: Direcao;
  atraso?: number;
  /** Cor do bloco. Sem ela, usa a tinta do tema (preto no off-white, off-white no grafite). */
  cor?: string;
  /** Cor do texto em cima do bloco. Sem ela, escolhe preto ou branco pelo contraste. */
  texto?: string;
  /** Só anima quando aparece na tela (títulos lá embaixo na página). */
  naTela?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const visto = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const reduz = useReducedMotion();
  const fundo = cor ?? "var(--foreground)";
  const letra = texto ?? (cor?.startsWith("#") ? textoSobre(cor) : cor ? "#ffffff" : "var(--background)");
  const ativo = !naTela || visto;

  return (
    <span ref={ref} className={cn("relative inline-block px-[0.16em]", className)}>
      <span>{children}</span>
      <motion.span
        aria-hidden
        className="absolute inset-0 px-[0.16em]"
        style={{ background: fundo, color: letra }}
        initial={{ clipPath: reduz ? ABERTO : FECHADO[de] }}
        animate={ativo ? { clipPath: ABERTO } : undefined}
        transition={{ duration: 0.75, delay: atraso, ease: [0.77, 0, 0.18, 1] }}
      >
        {children}
      </motion.span>
    </span>
  );
}
