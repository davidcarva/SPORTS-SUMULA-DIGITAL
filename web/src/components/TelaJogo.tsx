import { Flag, Play, SkipForward } from "lucide-react";
import { motion } from "motion/react";
import { ativos, minutosDoPeriodo, nomePeriodo, periodoAtual } from "@/lib/estatisticas";
import { regras } from "@/lib/regras";
import type { Jogo, TimeId } from "@/lib/tipos";
import { Botao } from "./arena";
import { type LanceDireto, type Marcacao, PainelTime } from "./PainelTime";
import { BarraPausa } from "./Pausa";

export function TelaJogo({
  jogo,
  bloqueado,
  time,
  onTrocarTime,
  onMarcar,
  onDireto,
  onDesfazer,
  podeDesfazer,
  onInicio,
  onPeriodo,
  onEncerrar,
  onParar,
  onRetomar,
}: {
  jogo: Jogo;
  bloqueado: boolean;
  time: TimeId;
  onTrocarTime: (t: TimeId) => void;
  onMarcar: (m: Marcacao) => void;
  onDireto: (l: LanceDireto) => void;
  onDesfazer: () => void;
  podeDesfazer: boolean;
  onInicio: () => void;
  onPeriodo: () => void;
  onEncerrar: () => void;
  onParar: (t: number) => void;
  onRetomar: () => void;
}) {
  const inicio = ativos(jogo).find((e) => e.tipo === "inicio");
  const per = periodoAtual(jogo);
  const encerrado = !!jogo.jogo.encerrado_em;
  // Antes do "Iniciar jogo" nada corre: fim de período, encerrar, parar e a marcação ficam apagados.
  const naoComecou = !inicio && !encerrado;
  const min = minutosDoPeriodo(jogo, 1);
  const r = regras(jogo);

  return (
    <div className="flex flex-col gap-3">
      {/* Sempre a mesma faixa de 68 px: Iniciar (verde) → Parar jogo (amarelo) → cronômetro da parada. */}
      {naoComecou ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onInicio}
          className="chanfro relative flex h-[68px] w-full items-center gap-3 overflow-hidden bg-neon-volt px-4 text-left text-[var(--sobre-ok)]"
        >
          <span className="listras absolute inset-0 opacity-15" />
          <Play className="relative h-9 w-9 shrink-0 fill-current" strokeWidth={2.4} />
          <span className="relative min-w-0">
            <span className="block font-display text-[26px] leading-none">Iniciar jogo</span>
            <span className="block truncate text-xs font-semibold opacity-80">
              {min ? `${r.nomePeriodo(1, false)} de ${min} min · ` : ""}toque quando a bola subir
            </span>
          </span>
        </motion.button>
      ) : (
        !encerrado && <BarraPausa jogo={jogo} bloqueado={bloqueado} onParar={onParar} onRetomar={onRetomar} />
      )}

      {/* Os botões mantêm o tamanho e a posição: se algo some, a grade sobe e o próximo toque cai no jogador errado. */}
      <div className="grid grid-cols-2 gap-2">
        <Botao onClick={onPeriodo} disabled={naoComecou || encerrado} className="px-2 text-xs">
          <SkipForward className="h-4 w-4" /> Fim {nomePeriodo(jogo, per, true)}
        </Botao>
        <Botao
          variante="cor"
          cor="#e11d2e"
          onClick={onEncerrar}
          disabled={naoComecou || encerrado}
          className="px-2 text-xs [--txt:#ffffff]"
        >
          <Flag className="h-4 w-4" /> {encerrado ? "Partida encerrada" : "Encerrar partida"}
        </Botao>
      </div>

      {naoComecou && (
        <p className="text-center text-xs text-muted-foreground">
          A marcação libera quando o jogo começar. O horário do <b className="text-foreground">Iniciar jogo</b> marca o começo do{" "}
          {r.umPeriodo}
          {min ? " e liga o relógio" : ""}.
        </p>
      )}

      <div className={naoComecou ? "pointer-events-none opacity-35 grayscale" : undefined} aria-disabled={naoComecou}>
        <PainelTime
          jogo={jogo}
          t={time}
          onTrocarTime={onTrocarTime}
          onMarcar={onMarcar}
          onDireto={onDireto}
          onDesfazer={onDesfazer}
          podeDesfazer={podeDesfazer}
          bloqueado={bloqueado || encerrado || naoComecou}
        />
      </div>
    </div>
  );
}
