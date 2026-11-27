import { CirclePause, Play, Timer } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { textoSobre } from "@/lib/cor";
import { duracao, ladosNaTela, limitePausa, nomePausa, pausaAberta, pedidosDeTempo, periodoAtual } from "@/lib/estatisticas";
import { bipe } from "@/lib/som";
import { hora } from "@/lib/tempo";
import { type Jogo, MOTIVOS_PAUSA, type MotivoPausa, type TimeId } from "@/lib/tipos";
import { Folha } from "./Folha";
import { useToque } from "./PainelTime";
import { useRelogio } from "./useRelogio";

/** Toca e vibra quando a parada chega perto do limite e quando estoura. */
function useAlertaPausa(id: string | undefined, faltam: number) {
  const avisado = useRef<{ id?: string; perto: boolean; estourou: boolean }>({ perto: false, estourou: false });
  useEffect(() => {
    if (!id) return;
    const a = avisado.current;
    if (a.id !== id) avisado.current = { id, perto: faltam <= 10_000, estourou: faltam <= 0 };
    else if (!a.estourou && faltam <= 0) {
      a.estourou = true;
      bipe(3);
      navigator.vibrate?.([250, 120, 250, 120, 250]);
    } else if (!a.perto && faltam <= 10_000) {
      a.perto = true;
      bipe(1, 880);
      navigator.vibrate?.(120);
    }
  }, [id, faltam]);
}

/**
 * Faixa sempre no mesmo lugar e do mesmo tamanho:
 * jogo rolando → "PARAR JOGO"; jogo parado → cronômetro grande + "RETOMAR".
 */
export function BarraPausa({
  jogo,
  bloqueado,
  onParar,
  onRetomar,
}: {
  jogo: Jogo;
  bloqueado: boolean;
  onParar: (t: number) => void;
  onRetomar: () => void;
}) {
  const aberta = pausaAberta(jogo);
  const agora = useRelogio(250);
  const toque = useToque();
  const ms = aberta ? agora - aberta.t : 0;
  const limite = aberta ? limitePausa(jogo, aberta) : 1;
  const faltam = limite - ms;
  const estourou = !!aberta && faltam <= 0;
  useAlertaPausa(aberta?.id, faltam);

  if (!aberta) {
    return (
      <motion.button
        type="button"
        disabled={bloqueado}
        whileTap={{ scale: 0.97 }}
        onPointerDown={toque.onPointerDown}
        onClick={() => onParar(toque.tempo())}
        className="chanfro relative flex h-[68px] w-full items-center gap-3 overflow-hidden bg-[#ffd400] px-4 text-left text-[#111111] disabled:opacity-50"
      >
        <span className="listras absolute inset-0 opacity-15" />
        <CirclePause className="relative h-9 w-9 shrink-0" strokeWidth={2.4} />
        <span className="relative min-w-0">
          <span className="block font-display text-[26px] leading-none">Parar jogo</span>
          <span className="block truncate text-xs font-semibold opacity-80">tempo, lesão, falta grave, arbitragem…</span>
        </span>
      </motion.button>
    );
  }

  const cor = estourou ? "#ff3b5c" : "#ffd400";
  const fracao = Math.min(1, ms / limite);
  const ehTempo = aberta.motivo === "tempo" && aberta.time;
  return (
    <div
      className={`chanfro relative flex h-[68px] w-full items-center gap-3 overflow-hidden px-3 ${estourou ? "animate-pulse" : ""}`}
      style={{ background: `color-mix(in oklab, ${cor} 20%, #0d1428)`, boxShadow: `inset 0 0 0 2px ${cor}` }}
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate font-display-reta text-[11px]" style={{ color: cor }}>
          <span className="h-2 w-2 animate-ping rounded-full" style={{ background: cor }} />
          Jogo parado ·{" "}
          {ehTempo ? (
            <span className="px-1 font-display" style={{ background: jogo.times[aberta.time!].cor, color: textoSobre(jogo.times[aberta.time!].cor) }}>
              {nomePausa(jogo, aberta)}
            </span>
          ) : (
            nomePausa(jogo, aberta)
          )}
        </span>
        <span className="flex items-baseline gap-2">
          <span className="font-display text-[34px] leading-none tabular-nums text-foreground">{duracao(ms)}</span>
          <span className="truncate text-xs font-semibold tabular-nums" style={{ color: cor }}>
            {estourou ? `+${duracao(-faltam)} acima` : `de ${duracao(limite)} · desde ${hora(aberta.t)}`}
          </span>
        </span>
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={onRetomar}
        className="chanfro chanfro-sm flex h-12 shrink-0 items-center gap-1.5 bg-neon-volt px-4 font-display text-xl text-[var(--sobre-ok)]"
      >
        <Play className="h-5 w-5 fill-current" /> Retomar
      </motion.button>
      <span className="absolute inset-x-0 bottom-0 h-1 bg-foreground/10">
        <span className="block h-full transition-[width] duration-300" style={{ width: `${fracao * 100}%`, background: cor }} />
      </span>
    </div>
  );
}

/** Por que parou? Um toque e o cronômetro já está correndo desde o toque em "Parar jogo". */
export function FolhaPausa({
  jogo,
  t,
  onFechar,
  onEscolher,
}: {
  jogo: Jogo;
  t: number | null;
  onFechar: () => void;
  onEscolher: (motivo: MotivoPausa, time: TimeId | null) => void;
}) {
  const per = periodoAtual(jogo);
  const outros: MotivoPausa[] = ["lesao", "falta", "arbitragem", "intervalo", "outro"];
  return (
    <Folha aberta={t !== null} onFechar={onFechar}>
      {t !== null && (
        <div>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="font-display-reta text-[11px] text-muted-foreground">Parar jogo</p>
              <h3 className="font-display text-3xl">Por que parou?</h3>
            </div>
            <div className="chanfro chanfro-sm flex shrink-0 items-center gap-1.5 bg-secondary px-2.5 py-1.5 font-mono text-sm tabular-nums">
              <Timer className="h-4 w-4 text-[var(--pausa-texto)]" />
              {hora(t, true)}
            </div>
          </div>

          <p className="mb-1.5 font-display-reta text-[11px] text-muted-foreground">Pedido de tempo</p>
          <div className="grid grid-cols-2 gap-2">
            {ladosNaTela(jogo).map((id) => {
              const tm = jogo.times[id];
              // Na prorrogação do futsal não há pedido de tempo: o botão continua, sem contagem.
              const pt = pedidosDeTempo(jogo, id, per) ?? { usados: 0, limite: 0, rotulo: "" };
              const acabou = pt.limite > 0 && pt.usados >= pt.limite;
              return (
                <motion.button
                  key={id}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onEscolher("tempo", id)}
                  className="chanfro relative flex h-[72px] flex-col items-start justify-center overflow-hidden px-3"
                  style={{ background: `linear-gradient(140deg, ${tm.cor}, color-mix(in oklab, ${tm.cor} 55%, #111111))`, color: textoSobre(tm.cor) }}
                >
                  <span className="listras absolute inset-0 opacity-20" />
                  <span className="relative font-display text-2xl leading-none">Tempo {tm.sigla}</span>
                  <span className="relative mt-1 flex items-center gap-1 text-[11px] font-semibold">
                    {Array.from({ length: pt.limite }, (_, k) => (
                      <span key={k} className={`h-2.5 w-2.5 -skew-x-12 ${k < pt.usados ? "bg-current" : "ring-1 ring-current ring-inset opacity-60"}`} />
                    ))}
                    {pt.limite > 0 && (
                      <span className="ml-1">
                        {pt.usados}/{pt.limite} no {pt.rotulo}
                      </span>
                    )}
                  </span>
                  {acabou && (
                    <span className="relative mt-0.5 bg-[#111111] px-1 text-[10px] font-bold text-[#ff3b5c]">sem tempos sobrando</span>
                  )}
                </motion.button>
              );
            })}
          </div>

          <p className="mt-4 mb-1.5 font-display-reta text-[11px] text-muted-foreground">Outra parada</p>
          <div className="grid grid-cols-2 gap-2">
            {outros.map((m) => (
              <motion.button
                key={m}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => onEscolher(m, null)}
                className={`chanfro chanfro-sm h-14 px-3 text-left font-display-reta text-sm ring-1 ring-inset ${
                  m === "falta" ? "text-destructive ring-destructive/60" : "bg-card ring-border"
                } ${m === "outro" ? "col-span-2" : ""}`}
              >
                {MOTIVOS_PAUSA[m]}
              </motion.button>
            ))}
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="chanfro chanfro-sm mt-4 w-full bg-secondary py-3 font-display-reta text-sm text-muted-foreground"
          >
            Cancelar (o jogo não parou)
          </button>
        </div>
      )}
    </Folha>
  );
}
