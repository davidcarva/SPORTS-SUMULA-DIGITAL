import { Check, Flag, Play, QrCode, SkipForward, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ativos, estadoSync, nomePeriodo, periodoAtual } from "@/lib/estatisticas";
import { horaCurta } from "@/lib/tempo";
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
  onSync,
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
  onSync: () => void;
  onParar: (t: number) => void;
  onRetomar: () => void;
}) {
  const inicio = ativos(jogo).find((e) => e.tipo === "inicio");
  const per = periodoAtual(jogo);
  const sync = estadoSync(jogo);
  const cameras = [...new Set(sync.feitas.flatMap((e) => e.cameras ?? []))].sort((a, b) => a - b);
  const encerrado = !!jogo.jogo.encerrado_em;

  return (
    <div className="flex flex-col gap-3">
      {/* Faixa de altura fixa: muda de cor e texto, mas nunca empurra a grade de jogadores. */}
      <button
        type="button"
        onClick={onSync}
        className={`chanfro chanfro-sm flex h-12 items-center gap-3 px-3 text-left ring-1 ring-inset transition-colors ${
          sync.ok ? "bg-neon-volt/10 ring-neon-volt/40" : "bg-destructive/15 ring-destructive/50"
        }`}
      >
        <AnimatePresence initial={false}>{/* sem "wait": o próximo passo nunca espera o anterior sair */}
          <motion.span
            key={sync.ok ? "ok" : "falta"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="flex min-w-0 flex-1 items-center gap-2.5"
          >
            {sync.ok ? (
              <Check className="h-5 w-5 shrink-0 text-neon-volt" />
            ) : (
              <TriangleAlert className="h-5 w-5 shrink-0 animate-pulse text-destructive" />
            )}
            <span className="min-w-0 truncate text-sm">
              {sync.ok && sync.ultima ? (
                <>
                  {/* Só o PC confirma que a câmera filmou: aqui é "o QR foi mostrado". */}
                  <b className="font-display text-base text-neon-volt">
                    {cameras.length > 1 ? `QR nas câmeras ${cameras.join(", ")}` : cameras.length ? `QR na câmera ${cameras[0]}` : "QR mostrado"}
                  </b>{" "}
                  · {horaCurta(sync.ultima.t)}
                </>
              ) : (
                <>
                  <b className="font-display text-base text-destructive">Sem sincronia</b> · toque e mostre o QR à câmera
                </>
              )}
            </span>
          </motion.span>
        </AnimatePresence>
        <QrCode className={`h-5 w-5 shrink-0 ${sync.ok ? "text-neon-volt" : "text-destructive"}`} />
      </button>

      {/* Os botões mantêm o tamanho e a posição depois de usados: se algo some, a grade
          sobe e o próximo toque do mesário cai no jogador errado. */}
      <div className="grid grid-cols-3 gap-2">
        <Botao onClick={onInicio} disabled={!!inicio || encerrado} className="px-2 text-xs">
          {inicio ? <Check className="h-4 w-4 text-neon-volt" /> : <Play className="h-4 w-4" />}
          {inicio ? `Início ${horaCurta(inicio.t)}${inicio.automatico ? " · auto" : ""}` : "Início do jogo"}
        </Botao>
        {/* Não depende do Início: se o mesário esqueceu, o jogo começa sozinho no primeiro lance ou aqui. */}
        <Botao onClick={onPeriodo} disabled={encerrado} className="px-2 text-xs">
          <SkipForward className="h-4 w-4" /> Fim {nomePeriodo(jogo, per, true)}
        </Botao>
        <Botao onClick={onEncerrar} disabled={encerrado} className="px-2 text-xs">
          <Flag className="h-4 w-4" /> {encerrado ? "Encerrado" : "Encerrar"}
        </Botao>
      </div>

      {/* Parar/retomar: sempre aqui, sempre do mesmo tamanho (desde antes do início, para a grade não descer). */}
      {!encerrado && <BarraPausa jogo={jogo} bloqueado={bloqueado} onParar={onParar} onRetomar={onRetomar} />}

      <PainelTime
        jogo={jogo}
        t={time}
        onTrocarTime={onTrocarTime}
        onMarcar={onMarcar}
        onDireto={onDireto}
        onDesfazer={onDesfazer}
        podeDesfazer={podeDesfazer}
        bloqueado={bloqueado || encerrado}
      />
    </div>
  );
}
