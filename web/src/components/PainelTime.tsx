import { Timer, Undo2 } from "lucide-react";
import { motion } from "motion/react";
import { useRef } from "react";
import { textoSobre } from "@/lib/cor";
import { estourou, faltasColetivas, nomePeriodo, pedidosDeTempo, periodoAtual, sets, situacao } from "@/lib/estatisticas";
import { regras } from "@/lib/regras";
import { horarioDoToque } from "@/lib/tempo";
import { corFalta, type Jogador, type Jogo, NOMES_FALTA, type TimeId, type TipoFalta } from "@/lib/tipos";
import { Selo } from "./arena";

export interface Marcacao {
  time: TimeId;
  jogador: string | null;
  /** Horário do primeiro toque. */
  t: number;
  origem: "jogador" | "time";
}

/** Lance completo num toque só: +1/+2/+3, gol, ponto ou falta, direto da linha do jogador. */
export interface LanceDireto extends Marcacao {
  tipo: "ponto" | "falta";
  valor: number;
  falta?: TipoFalta;
}

/**
 * Guarda o horário do pointerdown e só age no click. Assim o horário do lance é o do toque,
 * mesmo que o dedo demore a sair da tela.
 */
export function useToque() {
  const ultimo = useRef(0);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      ultimo.current = horarioDoToque(e);
    },
    tempo: () => {
      const t = ultimo.current;
      ultimo.current = 0;
      // Click por teclado ou toque antigo demais: usa o agora.
      return t && Date.now() - t < 4000 ? t : Date.now();
    },
  };
}

type Toque = ReturnType<typeof useToque>;

/** Linha da súmula: quem é, faltas e pontos à esquerda; +1 +2 +3 F à direita. */
function Linha({
  jogo,
  t,
  jogador,
  toque,
  bloqueado,
  onMarcar,
  onDireto,
  indice,
}: {
  jogo: Jogo;
  t: TimeId;
  jogador: Jogador | null;
  toque: Toque;
  bloqueado: boolean;
  onMarcar: (m: Marcacao) => void;
  onDireto: (l: LanceDireto) => void;
  indice: number;
}) {
  const time = jogo.times[t];
  const id = jogador?.id ?? null;
  const st = situacao(jogo, t, id);
  const txt = textoSobre(time.cor);
  const base = { time: t, jogador: id, origem: "jogador" as const };
  const r = regras(jogo);
  // Botão rápido de falta: pessoal (basquete) ou falta (futsal) do jogador; técnica no banco do basquete.
  const falta: TipoFalta | null = jogador ? r.faltaRapida : r.faltasBanco.length === 1 && r.coletivas ? r.faltasBanco[0] : null;
  const umValor = r.valores.length === 1;
  const largura = umValor ? "w-[76px] text-lg max-[370px]:w-[68px]" : "w-11 text-xl max-[370px]:w-10";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(indice, 14) * 0.018, type: "spring", stiffness: 420, damping: 32 }}
      className="grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70"
    >
      <button
        type="button"
        disabled={bloqueado}
        onPointerDown={toque.onPointerDown}
        onClick={() => onMarcar({ ...base, t: toque.tempo() })}
        className={`grid min-w-0 grid-cols-[38px_minmax(0,1fr)] items-center gap-2.5 py-1 text-left ${st.excluido ? "opacity-55" : ""}`}
        aria-label={`Mais opções para ${jogador ? jogador.nome : "a equipe"}`}
      >
        {jogador ? (
          <Selo cor={time.cor} className="h-[38px] w-[38px] text-xl">
            {jogador.numero || "–"}
          </Selo>
        ) : (
          <span className="chanfro-oct grid h-[38px] w-[38px] place-items-center bg-secondary font-display text-sm text-muted-foreground">
            EQ
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate font-display-reta text-[15px] leading-tight">{jogador ? jogador.nome : "Equipe"}</span>
          <span className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
            {st.excluido ? (
              <span className="shrink-0 bg-destructive/20 px-1 font-display-reta text-[10px] text-destructive">Excluído</span>
            ) : jogador ? (
              <span className="flex shrink-0 gap-[2px]" aria-label={`${st.faltas.length} faltas e cartões`}>
                {Array.from({ length: Math.max(r.coletivas ? 5 : 2, st.faltas.length) }, (_, k) => {
                  const f = st.faltas[k];
                  const tom = f && corFalta(f.falta);
                  return (
                    <span
                      key={k}
                      className={`h-[10px] w-[9px] -skew-x-12 ${
                        !f ? "ring-1 ring-inset ring-border" : tom === "comum" ? "bg-foreground/85" : tom === "amarelo" ? "bg-[#ffd400]" : "bg-destructive"
                      }`}
                    />
                  );
                })}
              </span>
            ) : (
              <span className="truncate">{st.faltas.length ? `${st.faltas.length} no banco` : "sem autor · banco"}</span>
            )}
            <b className="shrink-0 font-display text-sm tabular-nums" style={{ color: st.pontos ? time.cor : undefined }}>
              {r.abrev(st.pontos)}
            </b>
          </span>
        </span>
      </button>

      <div className="flex gap-1">
        {r.valores.map((v) => (
          <motion.button
            key={v}
            type="button"
            disabled={bloqueado}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 800, damping: 30 }}
            onPointerDown={toque.onPointerDown}
            onClick={() => onDireto({ ...base, t: toque.tempo(), tipo: "ponto", valor: v })}
            className={`chanfro chanfro-sm relative h-12 overflow-hidden font-display ${largura}`}
            style={{ background: `linear-gradient(150deg, ${time.cor}, color-mix(in oklab, ${time.cor} 62%, #111111))`, color: txt }}
            aria-label={`${r.rotuloValor(v)} para ${jogador ? jogador.nome : time.nome}`}
          >
            <span className="listras absolute inset-0 opacity-25" />
            <span className="relative">{r.rotuloValor(v)}</span>
          </motion.button>
        ))}
        {/* Sem falta rápida, o lugar fica vazio: as colunas não mudam entre jogador e equipe. */}
        {falta ? (
          <motion.button
            type="button"
            disabled={bloqueado}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 800, damping: 30 }}
            onPointerDown={toque.onPointerDown}
            onClick={() => onDireto({ ...base, t: toque.tempo(), tipo: "falta", valor: 0, falta })}
            className="chanfro chanfro-sm h-12 w-11 bg-transparent font-display text-xl text-foreground ring-2 ring-inset ring-foreground/50 max-[370px]:w-10"
            aria-label={`${NOMES_FALTA[falta]} de ${jogador ? jogador.nome : "banco"}`}
          >
            {falta === "P" ? "F" : falta}
          </motion.button>
        ) : (
          r.faltaRapida && <span className="w-11 max-[370px]:w-10" aria-hidden />
        )}
      </div>
    </motion.div>
  );
}

export function PainelTime({
  jogo,
  t,
  onTrocarTime,
  onMarcar,
  onDireto,
  onDesfazer,
  podeDesfazer,
  bloqueado,
}: {
  jogo: Jogo;
  t: TimeId;
  onTrocarTime: (t: TimeId) => void;
  onMarcar: (m: Marcacao) => void;
  onDireto: (l: LanceDireto) => void;
  onDesfazer: () => void;
  podeDesfazer: boolean;
  bloqueado: boolean;
}) {
  const time = jogo.times[t];
  const toque = useToque();
  const per = periodoAtual(jogo);
  const fc = faltasColetivas(jogo, t, per);
  const r = regras(jogo);
  const c = r.coletivas;
  const ganhos = sets(jogo);
  const tempos = pedidosDeTempo(jogo, t, per);

  return (
    <section className="flex flex-col">
      {/* Troca de time: as duas abas têm sempre o mesmo tamanho. */}
      <div className="grid grid-cols-2 gap-2">
        {(["A", "B"] as TimeId[]).map((id) => {
          const tm = jogo.times[id];
          const ativo = id === t;
          const n = faltasColetivas(jogo, id, per);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTrocarTime(id)}
              className="chanfro chanfro-sm relative flex h-12 items-center justify-between gap-2 overflow-hidden px-3 transition-colors"
              style={
                ativo
                  ? { background: `linear-gradient(120deg, ${tm.cor}, color-mix(in oklab, ${tm.cor} 55%, #111111))`, color: textoSobre(tm.cor) }
                  : { background: "var(--secondary)", color: "var(--muted-foreground)" }
              }
              aria-pressed={ativo}
            >
              {ativo && <span className="listras absolute inset-0 opacity-25" />}
              <span className="relative truncate font-display text-xl">{tm.sigla}</span>
              <span className={`relative shrink-0 font-display-reta text-[11px] ${estourou(jogo, n) ? "text-destructive" : ""}`}
                style={estourou(jogo, n) && ativo ? { color: textoSobre(tm.cor) } : undefined}
              >
                {c ? `${n} falta${n === 1 ? "" : "s"}` : `${ganhos[id]} set${ganhos[id] === 1 ? "" : "s"}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Faixa de altura fixa: faltas coletivas (ou tempos do set, no vôlei), marcar agora e desfazer. */}
      <div className="mt-2 flex h-11 items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <span className="truncate font-display-reta text-[10px] text-muted-foreground">
            {c
              ? `Coletivas ${per > c.somaDesde ? `${nomePeriodo(jogo, c.somaDesde, true)}+PR` : nomePeriodo(jogo, per, true)}`
              : `Tempos ${time.sigla} · ${nomePeriodo(jogo, per)}`}
          </span>
          <span className="flex items-center gap-1">
            {Array.from({ length: c ? c.limite : (tempos?.limite ?? 0) }, (_, k) => (
              <span
                key={k}
                className={`h-3 w-3 -skew-x-12 ${k < (c ? fc : (tempos?.usados ?? 0)) ? "bg-neon-orange" : "ring-1 ring-inset ring-border"}`}
              />
            ))}
            {c && estourou(jogo, fc) && (
              <span className="ml-1 whitespace-nowrap bg-destructive px-1 font-display-reta text-[10px] text-white" title={`Próxima falta é ${c.penalidade}`}>
                Estourou · {c.abrev}
              </span>
            )}
          </span>
        </div>
        <motion.button
          type="button"
          disabled={bloqueado}
          whileTap={{ scale: 0.94 }}
          onPointerDown={toque.onPointerDown}
          onClick={() => onMarcar({ time: t, jogador: null, t: toque.tempo(), origem: "time" })}
          className="chanfro chanfro-sm flex h-10 shrink-0 items-center gap-1.5 px-3 font-display-reta text-xs"
          style={{ background: `color-mix(in oklab, ${time.cor} 22%, transparent)`, color: "var(--foreground)", boxShadow: `inset 0 0 0 1px ${time.cor}` }}
        >
          <Timer className="h-4 w-4" /> Marcar agora
        </motion.button>
        <motion.button
          type="button"
          disabled={!podeDesfazer || bloqueado}
          whileTap={{ scale: 0.94 }}
          onClick={onDesfazer}
          className="chanfro chanfro-sm flex h-10 shrink-0 items-center gap-1.5 bg-secondary px-3 font-display-reta text-xs disabled:opacity-40"
          aria-label="Desfazer o último lance"
        >
          <Undo2 className="h-4 w-4" />
          <span className="max-[400px]:hidden">Desfazer</span>
        </motion.button>
      </div>

      <div className="mt-1" key={t}>
        {time.jogadores.map((j, i) => (
          <Linha
            key={j.id}
            jogo={jogo}
            t={t}
            jogador={j}
            toque={toque}
            bloqueado={bloqueado}
            onMarcar={onMarcar}
            onDireto={onDireto}
            indice={i}
          />
        ))}
        <Linha
          jogo={jogo}
          t={t}
          jogador={null}
          toque={toque}
          bloqueado={bloqueado}
          onMarcar={onMarcar}
          onDireto={onDireto}
          indice={time.jogadores.length}
        />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {r.id === "basquete" &&
          "+1 +2 +3 e F registram na hora, com o horário do toque. Toque no nome para técnica, antidesportiva, desqualificante, lance sem ponto e pontos por quarto."}
        {r.id === "futsal" &&
          "Gol e F registram na hora, com o horário do toque. Toque no nome para cartão amarelo, vermelho e lance sem gol. Gol contra ou sem autor: linha Equipe."}
        {r.id === "volei" &&
          "Ponto registra na hora, com o horário do toque. Erro do adversário: Ponto na linha Equipe. Toque no nome para cartões e lance sem ponto."}{" "}
        Sem tempo de ver quem foi? <b>Marcar agora</b> guarda o horário e você completa depois.
      </p>
    </section>
  );
}
