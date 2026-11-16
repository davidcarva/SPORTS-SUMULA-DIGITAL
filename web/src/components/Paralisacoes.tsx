import { textoSobre } from "@/lib/cor";
import { duracao, nomePeriodo, pausas, pedidosDeTempo, periodoAtual, resumoPausas } from "@/lib/estatisticas";
import { regras } from "@/lib/regras";
import { horaCurta } from "@/lib/tempo";
import { type Jogo, TIMES } from "@/lib/tipos";
import { Cartao } from "./arena";
import { useRelogio } from "./useRelogio";

/** Quanto o jogo ficou parado, por quê, e quais paradas passaram do tempo. */
export function Paralisacoes({ jogo }: { jogo: Jogo }) {
  const agora = useRelogio(1000);
  const r = resumoPausas(jogo, agora);
  const lista = pausas(jogo, agora);

  if (!r.quantidade) {
    return (
      <Cartao miolo="p-4">
        <p className="text-sm text-muted-foreground">
          Nenhuma parada registrada. Use <b className="text-[var(--pausa-texto)]">Parar jogo</b> na tela do jogo: o cronômetro mostra quanto o tempo,
          a lesão ou a conversa da arbitragem está durando e avisa quando passa do normal.
        </p>
      </Cartao>
    );
  }

  return (
    <Cartao cor="#ffd400" cor2="#ff3b5c" miolo="p-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Parado no total", duracao(r.totalMs), "text-foreground"],
          ["Paradas", String(r.quantidade), "text-foreground"],
          ["Acima do normal", r.excessoMs ? `+${duracao(r.excessoMs)}` : "0:00", r.excessoMs ? "text-destructive" : "text-neon-volt"],
        ].map(([rot, val, cls]) => (
          <div key={rot} className="chanfro chanfro-sm bg-secondary/70 px-2.5 py-2">
            <p className="font-display-reta text-[10px] text-muted-foreground">{rot}</p>
            <p className={`font-display text-2xl leading-tight tabular-nums ${cls}`}>{val}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {r.porMotivo.map((m) => (
          <span key={m.nome}>
            <b className="text-foreground">{m.nome}</b> {m.quantidade}× · {duracao(m.ms)}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {TIMES.map((t) => {
          const tm = jogo.times[t];
          // Uma linha por faixa: metades no basquete, tempos no futsal, sets jogados no vôlei.
          const faixas = regras(jogo).faixasTempo.length
            ? regras(jogo).faixasTempo
            : Array.from({ length: periodoAtual(jogo) }, (_, i) => i + 1);
          const metades = faixas.map((p) => pedidosDeTempo(jogo, t, p)).filter((m) => m !== null);
          return (
            <div key={t} className="chanfro chanfro-sm px-2.5 py-2" style={{ background: `color-mix(in oklab, ${tm.cor} 16%, transparent)` }}>
              <p className="font-display text-base" style={{ color: tm.cor }}>
                Tempos {tm.sigla}
              </p>
              {metades.map((m) => (
                <p key={m.rotulo} className="text-xs text-muted-foreground tabular-nums">
                  {m.rotulo}: <b className={m.usados > m.limite ? "text-destructive" : "text-foreground"}>{m.usados}</b>/{m.limite}
                </p>
              ))}
            </div>
          );
        })}
      </div>

      <ul className="mt-3 flex flex-col gap-1.5">
        {[...lista].reverse().map((p) => {
          const time = p.evento.time ? jogo.times[p.evento.time] : null;
          const fracao = Math.min(1, p.ms / Math.max(p.limite, 1));
          return (
            <li key={p.evento.id} className="chanfro chanfro-sm relative overflow-hidden bg-card px-3 py-2 ring-1 ring-inset ring-border">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-11 shrink-0 font-mono text-xs text-muted-foreground">{horaCurta(p.evento.t)}</span>
                <span className="min-w-0 flex-1 truncate">
                  {time ? (
                    <b className="mr-1 px-1 font-display" style={{ background: time.cor, color: textoSobre(time.cor) }}>
                      {p.nome}
                    </b>
                  ) : (
                    <b className="mr-1 font-display-reta">{p.nome}</b>
                  )}
                  <span className="text-xs text-muted-foreground">{nomePeriodo(jogo, p.evento.periodo, true)}</span>
                </span>
                <span className="shrink-0 text-right font-display text-lg tabular-nums">
                  {duracao(p.ms)}
                  {p.aberta && <span className="ml-1 text-[10px] text-[var(--pausa-texto)]">correndo</span>}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="h-1 flex-1 bg-foreground/10">
                  <span className="block h-full" style={{ width: `${fracao * 100}%`, background: p.excesso ? "#ff3b5c" : "#ffd400" }} />
                </span>
                {p.excesso ? (
                  <span className="font-semibold text-destructive">+{duracao(p.excesso)} acima</span>
                ) : (
                  <span>normal: {duracao(p.limite)}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Cartao>
  );
}
