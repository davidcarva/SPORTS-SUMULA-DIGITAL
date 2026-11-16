import { Copy, Download, FileSpreadsheet, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { descrever, nomePeriodo } from "@/lib/estatisticas";
import { baixarCSV, baixarJSON, copiarJSON } from "@/lib/exportar";
import { alterarEvento } from "@/lib/store";
import { hora } from "@/lib/tempo";
import type { Evento, Jogo } from "@/lib/tipos";
import { Botao, Cartao, TituloSecao } from "./arena";

export function TelaLances({
  jogo,
  onEditar,
  onAviso,
  onEncerrar,
  onNovo,
}: {
  jogo: Jogo;
  onEditar: (e: Evento) => void;
  onAviso: (texto: string) => void;
  onEncerrar: () => void;
  onNovo: () => void;
}) {
  const evs = [...jogo.eventos].sort((a, b) => b.t - a.t);
  const grupos = new Map<number, Evento[]>();
  for (const e of evs) grupos.set(e.periodo, [...(grupos.get(e.periodo) ?? []), e]);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <TituloSecao>Exportar</TituloSecao>
        <Cartao miolo="p-3">
          <div className="grid grid-cols-3 gap-2">
            <Botao onClick={() => baixarJSON(jogo)} className="flex-col gap-1 py-3 text-[11px]">
              <Download className="h-5 w-5 text-neon-cyan" /> Súmula .json
            </Botao>
            <Botao onClick={() => baixarCSV(jogo)} className="flex-col gap-1 py-3 text-[11px]">
              <FileSpreadsheet className="h-5 w-5 text-neon-volt" /> Planilha .csv
            </Botao>
            <Botao
              onClick={async () => onAviso((await copiarJSON(jogo)) ? "JSON copiado." : "Não deu para copiar aqui. Use o download.")}
              className="flex-col gap-1 py-3 text-[11px]"
            >
              <Copy className="h-5 w-5 text-neon-pink" /> Copiar
            </Botao>
          </div>
          <p className="mt-2.5 text-xs text-muted-foreground">
            Leve o .json e o vídeo da câmera para o computador e rode o <code className="text-foreground">cortar.py</code>.
          </p>
        </Cartao>
      </section>

      <section>
        <TituloSecao extra={<span className="text-xs text-muted-foreground">lápis: trocar atleta, valor ou falta</span>}>
          Lances
        </TituloSecao>
        {evs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum lance ainda.</p>}
        <div className="flex flex-col gap-4">
          {[...grupos.entries()].map(([per, lista]) => (
            <div key={per}>
              <div className="mb-1.5 font-display text-sm text-muted-foreground">{nomePeriodo(jogo, per)}</div>
              <ul className="flex flex-col gap-1.5">
                <AnimatePresence initial={false}>
                  {lista.map((e) => {
                    const cor = e.time ? jogo.times[e.time].cor : "var(--muted-foreground)";
                    const editavel = e.tipo === "ponto" || e.tipo === "lance" || e.tipo === "falta";
                    return (
                      <motion.li
                        key={e.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: e.removido ? 0.4 : 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="chanfro chanfro-sm flex items-center gap-3 bg-card py-2 pr-2 pl-3"
                        style={{ boxShadow: `inset 3px 0 0 ${cor}` }}
                      >
                        <span className="w-[62px] shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{hora(e.t)}</span>
                        <span className={`min-w-0 flex-1 truncate text-sm ${e.removido ? "line-through" : ""}`}>
                          {e.time && (
                            <b className="mr-1.5 font-display" style={{ color: cor }}>
                              {jogo.times[e.time].sigla}
                            </b>
                          )}
                          <span className={e.tipo === "falta" && e.falta !== "P" ? "text-destructive" : undefined}>
                            {descrever(jogo, e)}
                          </span>
                          {e.editado_em ? <span className="ml-1.5 text-[10px] text-neon-volt">editado</span> : null}
                        </span>
                        {editavel && !e.removido && (
                          <button
                            type="button"
                            aria-label="Editar lance"
                            onClick={() => onEditar(e)}
                            className="chanfro chanfro-sm grid h-8 w-8 place-items-center bg-secondary text-muted-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={e.removido ? "Restaurar lance" : "Remover lance"}
                          onClick={() => alterarEvento(e.id, { removido: !e.removido })}
                          className="chanfro chanfro-sm grid h-8 w-8 place-items-center bg-secondary text-muted-foreground"
                        >
                          {e.removido ? <RotateCcw className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        {!jogo.jogo.encerrado_em && (
          <Botao variante="contorno" onClick={onEncerrar} className="w-full">
            Encerrar jogo
          </Botao>
        )}
        <Botao variante="perigo" onClick={onNovo} className="w-full">
          Apagar e começar novo jogo
        </Botao>
      </section>
    </div>
  );
}
