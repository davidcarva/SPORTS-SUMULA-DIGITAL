import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { regras } from "@/lib/regras";
import type { Jogo } from "@/lib/tipos";
import { Destaque } from "./Destaque";
import { CAM_ABERTURA as CAM_ISO, CAM_TOPO, QuadraIso, TEMPO } from "./QuadraIso";

/** Depois da quadra montada: segura, vira para a vista de cima e mergulha na súmula. */
const SEGURA = 4500;
const VIRA = [SEGURA, 5500] as const;
const SOME = [5100, 5800] as const;
const FIM = 5800;

const limitar = (v: number) => Math.min(1, Math.max(0, v));
const entre = (ms: number, [a, b]: readonly [number, number]) => limitar((ms - a) / (b - a));
const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Abertura do jogo: a quadra do esporte se monta em isométrico, os times ocupam cada lado e a
 * câmera gira até a vista de cima. A linha do meio da quadra cai exatamente na divisão do fundo
 * do app, e a súmula aparece por trás. Um toque pula.
 */
export function AberturaQuadra({ jogo, onFim }: { jogo: Jogo; onFim: () => void }) {
  const [ms, setMs] = useState(0);
  const fim = useRef(onFim);
  fim.current = onFim;

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fim.current();
      return;
    }
    let quadro = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const e = agora - inicio;
      setMs(e);
      if (e < FIM) quadro = requestAnimationFrame(passo);
      else fim.current();
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, []);

  const r = regras(jogo);
  const { A, B } = jogo.times;
  const qtd = jogo.jogo.modalidade === "volei" ? 6 : 5;
  const vira = suave(entre(ms, VIRA));
  const some = suave(entre(ms, SOME));
  const camera = {
    giro: CAM_ISO.giro + (CAM_TOPO.giro - CAM_ISO.giro) * vira,
    inclina: CAM_ISO.inclina + (CAM_TOPO.inclina - CAM_ISO.inclina) * vira,
  };
  const textos = 1 - entre(ms, [SEGURA - 100, SEGURA + 250]);

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden px-4"
      style={{ background: `color-mix(in oklab, var(--background) ${Math.round((1 - some) * 100)}%, transparent)` }}
      onClick={() => fim.current()}
      role="presentation"
    >
      <div className="absolute top-[calc(2.5rem+env(safe-area-inset-top))] inset-x-4 flex flex-col items-center gap-3 text-center" style={{ opacity: textos }}>
        <p className="font-display-reta text-xs text-muted-foreground">
          {r.nome} · {jogo.jogo.nome}
        </p>
        <h2 className="flex items-center gap-3 font-display text-5xl">
          <Destaque cor={A.cor} de="esquerda" atraso={0.25}>
            {A.sigla}
          </Destaque>
          <span className="text-2xl text-muted-foreground">x</span>
          <Destaque cor={B.cor} de="direita" atraso={0.45}>
            {B.sigla}
          </Destaque>
        </h2>
      </div>

      <div className="w-[112%] max-w-2xl shrink-0" style={{ transform: `scale(${1 + vira * 1.5})`, opacity: 1 - some }}>
        <QuadraIso
          modalidade={jogo.jogo.modalidade}
          corA={A.cor}
          corB={B.cor}
          numerosA={A.jogadores.slice(0, qtd).map((j) => j.numero)}
          numerosB={B.jogadores.slice(0, qtd).map((j) => j.numero)}
          nomesA={A.jogadores.slice(0, qtd).map((j) => j.nome)}
          nomesB={B.jogadores.slice(0, qtd).map((j) => j.nome)}
          ms={Math.min(ms, TEMPO.fim)}
          quique={ms > TEMPO.jogadores[1] - 300 ? ms - (TEMPO.jogadores[1] - 300) : undefined}
          camera={camera}
          className="h-auto w-full overflow-visible"
        />
      </div>

      <p
        className="absolute bottom-[calc(2rem+env(safe-area-inset-bottom))] font-display-reta text-[11px] text-muted-foreground"
        style={{ opacity: textos * 0.8 }}
      >
        Toque para pular
      </p>
    </motion.div>
  );
}
