import { ArrowLeft, Star, Timer, Trash2, UserX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { textoSobre } from "@/lib/cor";
import { descrever, nomeJogador, nomePeriodo, pontosNoPeriodo, situacao, totalPeriodos, ultimoLance } from "@/lib/estatisticas";
import { hora } from "@/lib/tempo";
import { regras } from "@/lib/regras";
import { corFalta, type Evento, type Jogo, NOMES_FALTA, type TimeId, type TipoFalta } from "@/lib/tipos";
import { Selo } from "./arena";
import { Folha } from "./Folha";
import type { Marcacao } from "./PainelTime";

export interface Escolha {
  tipo: "ponto" | "lance" | "falta";
  valor: number;
  falta?: TipoFalta;
  jogador: string | null;
  time: TimeId;
}

/**
 * Folha para completar um lance. O horário já foi capturado no primeiro toque;
 * aqui o mesário só diz quem foi e quanto valeu.
 */
export function FolhaLance({
  jogo,
  marcacao,
  titulo,
  permitirTrocarTime = false,
  onFechar,
  onConfirmar,
  onApagar,
}: {
  jogo: Jogo;
  marcacao: Marcacao | null;
  titulo?: string;
  permitirTrocarTime?: boolean;
  onFechar: () => void;
  onConfirmar: (e: Escolha) => void;
  /** Mostra o resumo do jogador e o botão de apagar o último lance dele. */
  onApagar?: (e: Evento) => void;
}) {
  const [time, setTime] = useState<TimeId>("A");
  const [jogador, setJogador] = useState<string | null>(null);
  const [passo, setPasso] = useState<"jogador" | "valor">("valor");

  useEffect(() => {
    if (!marcacao) return;
    setTime(marcacao.time);
    setJogador(marcacao.jogador);
    setPasso(marcacao.origem === "time" ? "jogador" : "valor");
  }, [marcacao]);

  const t = jogo.times[time];
  const txt = textoSobre(t.cor);
  const confirmar = (tipo: Escolha["tipo"], valor: number, falta?: TipoFalta) =>
    onConfirmar({ tipo, valor, jogador, time, falta });
  const st = situacao(jogo, time, jogador);
  const nPer = totalPeriodos(jogo);
  const ultimo = onApagar ? ultimoLance(jogo, time, jogador) : null;
  const r = regras(jogo);
  const tiposFalta: TipoFalta[] = jogador ? r.faltas : r.faltasBanco;

  return (
    <Folha aberta={!!marcacao} onFechar={onFechar}>
      {marcacao && (
        <div>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display-reta text-[11px] text-muted-foreground">
                {titulo ?? t.nome}
                {passo === "valor" && (
                  <>
                    {" "}· {r.abrev(st.pontos)} · {st.faltas.length}{" "}
                    {r.coletivas ? (st.faltas.length === 1 ? "falta" : "faltas") : st.faltas.length === 1 ? "cartão" : "cartões"}
                    {st.excluido && <b className="text-destructive"> · excluído</b>}
                  </>
                )}
              </p>
              <h3 className="truncate font-display text-3xl" style={{ color: t.cor }}>
                {passo === "jogador" ? "Quem foi?" : nomeJogador(jogo, jogador)}
              </h3>
            </div>
            <div className="chanfro chanfro-sm flex shrink-0 items-center gap-1.5 bg-secondary px-2.5 py-1.5 font-mono text-sm tabular-nums">
              <Timer className="h-4 w-4 text-neon-volt" />
              {hora(marcacao.t, true)}
            </div>
          </div>

          {permitirTrocarTime && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              {(["A", "B"] as TimeId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTime(id);
                    if (id !== time) {
                      setJogador(null);
                      setPasso("jogador");
                    }
                  }}
                  className="chanfro chanfro-sm py-2 font-display text-lg transition"
                  style={
                    time === id
                      ? { background: jogo.times[id].cor, color: textoSobre(jogo.times[id].cor) }
                      : { background: "var(--secondary)", color: "var(--muted-foreground)" }
                  }
                >
                  {jogo.times[id].sigla}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence initial={false}>{/* sem "wait": o próximo passo nunca espera o anterior sair */}
            {passo === "jogador" ? (
              <motion.div
                key="jogador"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.16 }}
                className="grid grid-cols-3 gap-2 sm:grid-cols-4"
              >
                {t.jogadores.map((j) => (
                  <motion.button
                    key={j.id}
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      setJogador(j.id);
                      setPasso("valor");
                    }}
                    className="chanfro chanfro-sm flex flex-col items-center gap-1 bg-card px-1 py-2.5 ring-1 ring-inset ring-border"
                  >
                    <Selo cor={t.cor} className="h-10 w-10 text-2xl">
                      {j.numero || "–"}
                    </Selo>
                    <span className="w-full truncate text-center text-xs">{j.nome}</span>
                  </motion.button>
                ))}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    setJogador(null);
                    setPasso("valor");
                  }}
                  className="chanfro chanfro-sm flex flex-col items-center justify-center gap-1 px-1 py-2.5 text-muted-foreground ring-1 ring-inset ring-dashed ring-border"
                >
                  <UserX className="h-6 w-6" />
                  <span className="text-xs">Sem jogador</span>
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="valor"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.16 }}
              >
                <div className={`grid gap-2.5 ${r.valores.length === 1 ? "grid-cols-1" : "grid-cols-3"}`}>
                  {r.valores.map((v, i) => (
                    <motion.button
                      key={v}
                      type="button"
                      initial={{ opacity: 0, y: 16, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: i * 0.04, type: "spring", stiffness: 500, damping: 26 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => confirmar("ponto", v)}
                      className="chanfro relative overflow-hidden py-6 font-display text-5xl"
                      style={{
                        background: `linear-gradient(150deg, ${t.cor}, color-mix(in oklab, ${t.cor} 55%, #111111))`,
                        color: txt,
                      }}
                    >
                      <span className="listras absolute inset-0 opacity-30" />
                      <span className="relative">{r.rotuloValor(v)}</span>
                    </motion.button>
                  ))}
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => confirmar("lance", 0)}
                  className="chanfro chanfro-sm mt-2.5 flex w-full items-center justify-center gap-2 bg-neon-volt/12 py-3.5 font-display-reta text-sm text-neon-volt ring-1 ring-inset ring-neon-volt/40"
                >
                  <Star className="h-4 w-4" /> {r.semPonto}
                </motion.button>
                {tiposFalta.length > 0 && (
                  <>
                    <p className="mt-4 mb-1.5 font-display-reta text-[11px] text-muted-foreground">
                      {r.coletivas ? "Falta" : "Cartão"}
                    </p>
                    <div className={`grid gap-2 ${tiposFalta.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                      {tiposFalta.map((f) => {
                        const tom = corFalta(f);
                        return (
                          <motion.button
                            key={f}
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => confirmar("falta", 0, f)}
                            className={`chanfro chanfro-sm flex h-12 items-center justify-center gap-2 font-display-reta text-sm ring-2 ring-inset ${
                              tom === "comum"
                                ? "text-foreground ring-foreground/45"
                                : tom === "amarelo"
                                  ? "text-[var(--pausa-texto)] ring-[#ffd400]/60"
                                  : "text-destructive ring-destructive/60"
                            } ${tiposFalta.length === 3 && f === tiposFalta[0] ? "col-span-2" : ""}`}
                          >
                            <b className="font-display text-lg">{f}</b> {NOMES_FALTA[f]}
                            {!jogador && " (banco)"}
                          </motion.button>
                        );
                      })}
                    </div>
                  </>
                )}
                {onApagar && (
                  <>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-center text-sm tabular-nums">
                        <thead>
                          <tr className="text-[11px] text-muted-foreground">
                            <th className="py-1 text-left font-normal" />
                            {Array.from({ length: nPer }, (_, i) => (
                              <th key={i} className="py-1 font-display-reta font-normal">
                                {nomePeriodo(jogo, i + 1, true)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-border">
                            <th className="py-1.5 text-left text-[11px] font-normal text-muted-foreground">
                              {r.id === "futsal" ? "Gols" : "Pts"}
                            </th>
                            {Array.from({ length: nPer }, (_, i) => (
                              <td key={i} className="py-1.5 font-display text-base">
                                {pontosNoPeriodo(jogo, time, i + 1, jogador) || "·"}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-t border-border">
                            <th className="py-1.5 text-left text-[11px] font-normal text-muted-foreground">
                              {r.coletivas ? "Faltas" : "Cartões"}
                            </th>
                            {Array.from({ length: nPer }, (_, i) => (
                              <td key={i} className="py-1.5 font-mono text-xs">
                                {st.faltas
                                  .filter((f) => f.periodo === i + 1)
                                  .map((f) => f.falta)
                                  .join(" ") || "·"}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {ultimo && (
                      <button
                        type="button"
                        onClick={() => onApagar(ultimo)}
                        className="chanfro chanfro-sm mt-3 flex w-full items-center justify-center gap-2 py-3 text-sm text-muted-foreground ring-1 ring-inset ring-dashed ring-border"
                      >
                        <Trash2 className="h-4 w-4" /> Apagar o último: {descrever(jogo, ultimo).split(" · ")[0]} ·{" "}
                        {nomePeriodo(jogo, ultimo.periodo, true)}
                      </button>
                    )}
                  </>
                )}
                {marcacao.origem === "time" || permitirTrocarTime ? (
                  <button
                    type="button"
                    onClick={() => setPasso("jogador")}
                    className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" /> Trocar jogador
                  </button>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={onFechar}
            className="chanfro chanfro-sm mt-4 w-full bg-secondary py-3 font-display-reta text-sm text-muted-foreground"
          >
            Cancelar
          </button>
        </div>
      )}
    </Folha>
  );
}
