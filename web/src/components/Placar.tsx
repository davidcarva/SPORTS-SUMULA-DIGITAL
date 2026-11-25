import { AnimatePresence, motion } from "motion/react";
import { duracao, estadoSync, limitePausa, nomePeriodo, pausaAberta, periodoAtual, placarPrincipal, sets } from "@/lib/estatisticas";
import { regras } from "@/lib/regras";
import { hora } from "@/lib/tempo";
import type { Jogo, TimeId } from "@/lib/tipos";
import { NumeroAnimado } from "./arena";
import { Destaque } from "./Destaque";
import { useRelogio } from "./useRelogio";

/** `ganhos`: sets ganhos, só no vôlei (o número grande é o set em andamento). */
function LadoTime({ jogo, t, pontos, ganhos }: { jogo: Jogo; t: TimeId; pontos: number; ganhos?: number }) {
  const time = jogo.times[t];
  const direita = t === "B";
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

export function Placar({ jogo, onSync }: { jogo: Jogo; onSync: () => void }) {
  const p = placarPrincipal(jogo);
  const ganhos = regras(jogo).porSets ? sets(jogo) : null;
  const per = periodoAtual(jogo);
  const sync = estadoSync(jogo);
  const agora = useRelogio();
  const parada = pausaAberta(jogo);
  const estourou = !!parada && agora - parada.t > limitePausa(jogo, parada);

  return (
    <div className="borda-neon chanfro chanfro-lg" style={{ "--cor": jogo.times.A.cor, "--cor2": jogo.times.B.cor } as React.CSSProperties}>
      <div className="chanfro chanfro-lg relative overflow-hidden bg-card/95 px-4 pt-3 pb-3">
        <div className="listras pointer-events-none absolute inset-x-0 top-0 h-1.5 opacity-60" />
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <LadoTime jogo={jogo} t="A" pontos={p.A} ganhos={ganhos?.A} />
          <div className="flex flex-col items-center gap-1.5">
            {/* A cada período novo, o bloco desliza de novo por trás do nome. */}
            <Destaque key={per} de="esquerda" className="py-0.5 font-display text-lg">
              {nomePeriodo(jogo, per, true)}
            </Destaque>
            {parada ? (
              <span
                className={`px-1.5 font-display text-sm tabular-nums text-[#111111] ${estourou ? "animate-pulse bg-[#ff3b5c]" : "bg-[#ffd400]"}`}
                title="Jogo parado"
              >
                ⏸ {duracao(agora - parada.t)}
              </span>
            ) : (
              <span className="font-mono text-xs text-muted-foreground tabular-nums">{hora(agora)}</span>
            )}
            <button
              type="button"
              onClick={onSync}
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider"
            >
              <span className="relative flex h-2 w-2">
                {!sync.ok && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${sync.ok ? "bg-neon-volt" : "bg-destructive"}`} />
              </span>
              <span className={sync.ok ? "text-neon-volt" : "text-destructive"}>{sync.ok ? "QR mostrado" : "Sem sync"}</span>
            </button>
          </div>
          <LadoTime jogo={jogo} t="B" pontos={p.B} ganhos={ganhos?.B} />
        </div>
      </div>
    </div>
  );
}
