import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { coresDosLados } from "@/lib/tema";
import type { TimeId } from "@/lib/tipos";

interface Camada {
  id: number;
  cor: string;
}

/**
 * Metade da tela tingida com a cor de um time. Cada cor nova sobe de baixo para cima por cima da
 * anterior, como um líquido enchendo, com uma linha sólida marcando a borda que sobe.
 */
function Metade({ lado, cor, forte }: { lado: TimeId; cor: string; forte: boolean }) {
  const [camadas, setCamadas] = useState<Camada[]>([{ id: 0, cor }]);

  useEffect(() => {
    setCamadas((c) => {
      const ultima = c[c.length - 1];
      return ultima.cor === cor ? c : [ultima, { id: ultima.id + 1, cor }];
    });
  }, [cor]);

  return (
    <div className={`absolute inset-y-0 w-1/2 overflow-hidden ${lado === "A" ? "left-0" : "right-0"}`}>
      {camadas.map((c) => (
        <motion.div
          key={c.id}
          className="absolute inset-x-0 top-0 bottom-0"
          initial={{ y: "105%" }}
          animate={{ y: "0%" }}
          transition={{ duration: 1.9, ease: [0.65, 0, 0.25, 1], delay: lado === "B" ? 0.18 : 0 }}
          onAnimationComplete={() => setCamadas((todas) => (todas.length > 1 && todas[todas.length - 1].id === c.id ? [c] : todas))}
        >
          {/* A borda do líquido: uma onda sólida na cor do time, correndo de lado enquanto sobe. */}
          <div className="absolute inset-x-0 -top-[14px] h-[16px] overflow-hidden">
            <svg className="onda-corre absolute top-0 left-0 h-full w-[200%]" viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden>
              <path
                d="M0 8 Q12.5 0 25 8 T50 8 T75 8 T100 8 T125 8 T150 8 T175 8 T200 8 V16 H0 Z"
                fill={`color-mix(in oklab, ${c.cor} var(--tinta-forte), transparent)`}
              />
              <path d="M0 8 Q12.5 0 25 8 T50 8 T75 8 T100 8 T125 8 T150 8 T175 8 T200 8" fill="none" stroke={c.cor} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to top, color-mix(in oklab, ${c.cor} var(--tinta-forte), transparent), color-mix(in oklab, ${c.cor} var(--tinta-fraca), transparent) 75%, color-mix(in oklab, ${c.cor} var(--tinta-forte), transparent))`,
            }}
          />
        </motion.div>
      ))}
      {/* O lado do time aberto na súmula fica um pouco mais forte. */}
      <motion.div
        className="absolute inset-0"
        style={{ background: `color-mix(in oklab, ${cor} var(--tinta-ativa), transparent)` }}
        initial={false}
        animate={{ opacity: forte ? 1 : 0 }}
        transition={{ duration: 0.35 }}
      />
    </div>
  );
}

/**
 * Fundo da página: esquerda com a cor do time A, direita com a do time B, e a linha do meio da
 * quadra separando os dois. Também publica as cores como --time-a e --time-b para o resto do app.
 */
export function FundoLados({ a, b, ativo = null }: { a: string; b: string; ativo?: TimeId | null }) {
  useEffect(() => coresDosLados(a, b), [a, b]);

  return (
    <div aria-hidden className="bg-arena pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <Metade lado="A" cor={a} forte={ativo === "A"} />
      <Metade lado="B" cor={b} forte={ativo === "B"} />
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--linha)] opacity-50" />
      <div className="absolute top-1/2 left-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--linha)] opacity-30" />
    </div>
  );
}
