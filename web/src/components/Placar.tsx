import { ArrowLeftRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { duracao, ladosNaTela, limitePausa, nomePeriodo, pausaAberta, periodoAtual, placarPrincipal, relogio, relogioTexto, sets } from "@/lib/estatisticas";
import { regras } from "@/lib/regras";
import { hora } from "@/lib/tempo";
import type { Jogo, TimeId } from "@/lib/tipos";
import { NumeroAnimado } from "./arena";
import { Destaque } from "./Destaque";
import { useRelogio } from "./useRelogio";

/** `ganhos`: sets ganhos, só no vôlei (o número grande é o set em andamento). */
function LadoTime({ jogo, t, direita, pontos, ganhos }: { jogo: Jogo; t: TimeId; direita: boolean; pontos: number; ganhos?: number }) {
  const time = jogo.times[t];
  return (
    <div className={`relative flex min-w-0 flex-col ${direita ? "items-end text-right" : "items-start"}`}>
      <div className="flex max-w-full items-center gap-2">
        {!direita && <span className="h-4 w-1.5 -skew-x-12" style={{ background: time.cor }} />}
        <span className="truncate font-display text-lg" style={{ color: time.cor }}>
          {time.sigla}
        </span>
        {direita && <span className="h-4 w-1.5 -skew-x-12" style={{ background: time.cor }} />}
      </div>
      <div
        className="brilho font-display text-[64px] leading-none text-foreground tabular-nums"
        style={{ "--cor": time.cor } as React.CSSProperties}
      >
        <NumeroAnimado valor={pontos} />
      </div>
      <span className="max-w-full truncate text-[11px] text-muted-foreground">
        {ganhos !== undefined ? (
          <>
            <b className="font-display text-sm text-foreground tabular-nums">{ganhos}</b> set{ganhos === 1 ? "" : "s"} · {time.nome}
          </>
        ) : (
          time.nome
        )}
      </span>
      {/* Clarão quando o time pontua */}
      <AnimatePresence>
        <motion.span
          key={pontos}
          initial={{ opacity: 0.55, scale: 0.6 }}
          animate={{ opacity: 0, scale: 1.6 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="pointer-events-none absolute top-6 h-16 w-16 rounded-full blur-2xl"
          style={{ background: time.cor, [direita ? "right" : "left"]: 0 }}
        />
      </AnimatePresence>
    </div>
  );
}

/**
 * O meio do placar: o período e o relógio. Com tempo definido, é o relógio de jogo (para em
 * qualquer parada e fica vermelho no último minuto); sem tempo (vôlei), a hora e a parada.
 */
function Centro({ jogo }: { jogo: Jogo }) {
  const per = periodoAtual(jogo);
  const agora = useRelogio(100);
  const rel = relogio(jogo, agora);
  const parada = pausaAberta(jogo);
  const estourou = !!parada && agora - parada.t > limitePausa(jogo, parada);
  const ultimoMinuto = !!rel && rel.iniciado && rel.restante <= 60_000;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* A cada período novo, o bloco desliza de novo por trás do nome. */}
      <Destaque key={per} de="esquerda" className="py-0.5 font-display text-lg">
        {nomePeriodo(jogo, per, true)}
      </Destaque>
      {rel ? (
        <>
          <span
            className={`font-display text-[28px] leading-none tabular-nums ${
              !rel.iniciado ? "text-muted-foreground" : rel.restante === 0 || ultimoMinuto ? "text-[#ff3b5c]" : rel.parado ? "text-[#ffd400]" : "text-foreground"
            }`}
            aria-label="Tempo restante do período"
          >
            {relogioTexto(rel.restante)}
          </span>
          <span className={`font-display-reta text-[10px] ${rel.parado && rel.iniciado ? "text-[#ffd400]" : "text-muted-foreground"}`}>
            {!rel.iniciado ? "não iniciado" : jogo.jogo.encerrado_em ? "encerrado" : rel.restante === 0 ? "tempo esgotado" : parada ? `parado ${duracao(agora - parada.t)}` : "rolando"}
          </span>
        </>
      ) : parada ? (
        <span
          className={`px-1.5 font-display text-sm tabular-nums text-[#111111] ${estourou ? "animate-pulse bg-[#ff3b5c]" : "bg-[#ffd400]"}`}
          title="Jogo parado"
        >
          ⏸ {duracao(agora - parada.t)}
        </span>
      ) : (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{hora(agora)}</span>
      )}
    </div>
  );
}

export function Placar({ jogo, onInverter }: { jogo: Jogo; onInverter: () => void }) {
  const p = placarPrincipal(jogo);
  const ganhos = regras(jogo).porSets ? sets(jogo) : null;
  const [esq, dir] = ladosNaTela(jogo);

  return (
    <div
      className="borda-neon chanfro chanfro-lg"
      style={{ "--cor": jogo.times[esq].cor, "--cor2": jogo.times[dir].cor } as React.CSSProperties}
    >
      <div className="chanfro chanfro-lg relative overflow-hidden bg-card/95 px-4 pt-3 pb-3">
        <div className="listras pointer-events-none absolute inset-x-0 top-0 h-1.5 opacity-60" />
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <LadoTime jogo={jogo} t={esq} direita={false} pontos={p[esq]} ganhos={ganhos?.[esq]} />
          <div className="flex flex-col items-center gap-1.5">
            <Centro jogo={jogo} />
            {/* Os times trocaram de lado na quadra: a tela acompanha, os dados não mudam. */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.9, rotate: 180 }}
              onClick={onInverter}
              className="chanfro chanfro-sm flex items-center gap-1 bg-secondary px-2 py-1 font-display-reta text-[10px] text-muted-foreground"
              aria-label="Trocar os times de lado"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" /> Lados
            </motion.button>
          </div>
          <LadoTime jogo={jogo} t={dir} direita pontos={p[dir]} ganhos={ganhos?.[dir]} />
        </div>
      </div>
    </div>
  );
}
