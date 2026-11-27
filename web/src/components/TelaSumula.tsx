import { Download, FileText, Plus, Share2, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { textoSobre } from "@/lib/cor";
import { emOrdemDeQuadra, limites, nomePeriodo, placar, pontosNoPeriodo, sets, situacao, totalPeriodos, vencedor } from "@/lib/estatisticas";
import { regras } from "@/lib/regras";
import { baixarBlob, baixarPDF, nomeArquivo } from "@/lib/exportar";
import { alterarCorTime, alterarInfo, alterarJogadores, alterarLimites, alterarTempo, infoPadrao, novoJogadorId } from "@/lib/store";
import { carregarFontesStory, desenharStory, storyComoBlob } from "@/lib/story";
import { corFalta, corQuarto, NOMES_FALTA, type InfoPartida, type Jogo, type LimitesPausa, type TimeId, TIMES } from "@/lib/tipos";
import { Botao, Cartao, TituloSecao } from "./arena";
import { CampoNumero, GradeNumeros, repetidos } from "./ListaJogadores";
import { CoresDeUmaImagem, SeletorCor } from "./SeletorCor";

/** Casinha de cesta, gol ou ponto: valor dentro, cor do período. */
function Casa({ jogo, valor, periodo }: { jogo: Jogo; valor: number; periodo: number }) {
  const cor = corQuarto(periodo);
  return (
    <span
      className="grid h-5 w-5 shrink-0 place-items-center font-display text-[13px] sm:h-6 sm:w-6 sm:text-sm"
      style={{ background: cor, color: textoSobre(cor) }}
      title={nomePeriodo(jogo, periodo)}
    >
      {valor}
    </span>
  );
}

function QuadroTime({ jogo, t }: { jogo: Jogo; t: TimeId }) {
  const time = jogo.times[t];
  const r = regras(jogo);
  const p = placar(jogo);
  const ganhos = sets(jogo);
  const nPer = totalPeriodos(jogo);
  const eq = situacao(jogo, t, null);
  const linhas = [
    ...emOrdemDeQuadra(time.jogadores).map((j) => ({ id: j.id as string | null, num: j.numero, nome: j.nome, capitao: !!j.capitao, reserva: !!j.reserva })),
    ...(eq.cestas.length || eq.faltas.length ? [{ id: null, num: "EQ", nome: "Equipe", capitao: false, reserva: false }] : []),
  ];
  const sts = linhas.map((l) => situacao(jogo, t, l.id));
  const melhor = Math.max(0, ...sts.filter((_, i) => linhas[i].id).map((s) => s.pontos));

  return (
    <Cartao cor={time.cor} cor2={time.cor} miolo="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2" style={{ background: time.cor, color: textoSobre(time.cor) }}>
        <span className="truncate font-display text-xl">{time.nome}</span>
        <span className="font-display text-2xl tabular-nums">
          {r.porSets ? `${ganhos[t]} set${ganhos[t] === 1 ? "" : "s"} · ${p[t]} pts` : p[t]}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="font-display-reta text-[10px] text-muted-foreground">
              <th className="w-9 py-1.5 pl-3 text-left font-normal">Nº</th>
              <th className="w-[26%] py-1.5 text-left font-normal">Jogador</th>
              <th className="w-[66px] py-1.5 text-left font-normal sm:w-[92px]">{r.coletivas ? "Faltas" : "Cartões"}</th>
              <th className="py-1.5 text-left font-normal">{r.pontos[0].toUpperCase() + r.pontos.slice(1)}</th>
              <th className="w-11 py-1.5 pr-3 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => {
              const st = sts[i];
              return (
                <tr key={l.id ?? "eq"} className="border-t border-border/70">
                  <td className="py-1.5 pl-3 font-display text-base" style={{ color: time.cor }}>
                    {l.num || "–"}
                  </td>
                  <td className="truncate py-1.5 pr-1 font-display-reta text-[13px]">
                    {l.nome}
                    {l.capitao && (
                      <span className="ml-1 px-1 font-display text-[11px]" style={{ background: time.cor, color: textoSobre(time.cor) }}>
                        C
                      </span>
                    )}
                    {l.reserva && <span className="ml-1 text-[10px] text-muted-foreground">res.</span>}
                    {st.excluido && <span className="ml-1.5 bg-destructive/20 px-1 text-[10px] text-destructive">Excl.</span>}
                  </td>
                  <td className="py-1.5">
                    <span className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, k) => {
                        const f = st.faltas[k];
                        return (
                          <span
                            key={k}
                            className={`grid h-5 w-3 place-items-center font-mono text-[9px] font-bold sm:w-4 sm:text-[10px] ${
                              !f
                                ? "ring-1 ring-inset ring-border"
                                : corFalta(f.falta) === "comum"
                                  ? "bg-foreground text-background"
                                  : corFalta(f.falta) === "amarelo"
                                    ? "bg-[#ffd400] text-[#111111]"
                                    : "bg-destructive text-white"
                            }`}
                          >
                            {f?.falta}
                          </span>
                        );
                      })}
                    </span>
                  </td>
                  <td className="py-1.5 pr-1">
                    <span className="flex flex-wrap gap-0.5">
                      {st.cestas.length ? st.cestas.map((e) => <Casa key={e.id} jogo={jogo} valor={e.valor} periodo={e.periodo} />) : <span className="text-muted-foreground">—</span>}
                    </span>
                  </td>
                  <td
                    className={`py-1.5 pr-3 text-right font-display text-lg tabular-nums ${l.id && st.pontos && st.pontos === melhor ? "text-neon-orange" : ""}`}
                  >
                    {st.pontos}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-end gap-3 border-t-2 border-border px-3 py-2.5">
        {Array.from({ length: nPer }, (_, i) => (
          <div key={i} className="flex min-w-[42px] flex-col gap-1">
            <span className="h-1.5" style={{ background: corQuarto(i + 1) }} />
            <span className="font-display-reta text-[10px] text-muted-foreground">{nomePeriodo(jogo, i + 1, true)}</span>
            <span className="font-display text-xl leading-none tabular-nums">{pontosNoPeriodo(jogo, t, i + 1)}</span>
          </div>
        ))}
      </div>
    </Cartao>
  );
}

function Story({ jogo, onAviso }: { jogo: Jogo; onAviso: (t: string) => void }) {
  const ganhou = vencedor(jogo);
  const [time, setTime] = useState<TimeId>(ganhou ?? "A");
  const [titulo, setTitulo] = useState(ganhou ? "Vitória" : "Súmula");
  const [faixa, setFaixa] = useState(`${regras(jogo).nome} · ${infoPadrao(jogo).campeonato || jogo.jogo.nome}`);
  const ref = useRef<HTMLCanvasElement>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let vivo = true;
    carregarFontesStory().then(() => vivo && setPronto(true));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (pronto && ref.current) desenharStory(ref.current, jogo, { time, titulo, faixa });
  }, [pronto, jogo, time, titulo, faixa]);

  const arquivo = () => nomeArquivo(jogo, "png").replace("sumula_", `story_${jogo.times[time].sigla.toLowerCase()}_`);

  const compartilhar = async () => {
    if (!ref.current) return;
    const blob = await storyComoBlob(ref.current);
    if (!blob) return onAviso("Não consegui gerar a imagem.");
    const file = new File([blob], arquivo(), { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: titulo });
      } catch {
        /* cancelou */
      }
    } else {
      baixarBlob(file.name, blob);
      onAviso("Este navegador não compartilha imagem: baixei o PNG.");
    }
  };

  const baixar = async () => {
    if (!ref.current) return;
    const blob = await storyComoBlob(ref.current);
    if (blob) baixarBlob(arquivo(), blob);
  };

  return (
    <Cartao miolo="p-3">
      <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
        <canvas
          ref={ref}
          width={1080}
          height={1920}
          className="mx-auto aspect-[9/16] w-full max-w-[200px] bg-arena shadow-lg ring-1 ring-border"
          aria-label="Prévia do story"
        />
        <div className="flex min-w-0 flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {TIMES.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTime(id)}
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
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Título grande
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="campo" maxLength={14} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Faixa
            <input value={faixa} onChange={(e) => setFaixa(e.target.value)} className="campo" maxLength={40} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Botao variante="cor" cor="var(--neon-orange)" onClick={compartilhar} className="text-white">
              <Share2 className="h-4 w-4" /> Compartilhar
            </Botao>
            <Botao onClick={baixar}>
              <Download className="h-4 w-4" /> PNG
            </Botao>
          </div>
          <p className="text-xs text-muted-foreground">1080×1920, pronto para story. Ex.: "Campeã", "Final", "Vitória".</p>
        </div>
      </div>
    </Cartao>
  );
}

const CAMPOS: { k: keyof InfoPartida; rotulo: string; tipo?: string }[] = [
  { k: "campeonato", rotulo: "Campeonato" },
  { k: "local", rotulo: "Local" },
  { k: "data", rotulo: "Data", tipo: "date" },
  { k: "horario", rotulo: "Horário", tipo: "time" },
  { k: "arbitros", rotulo: "Árbitros" },
  { k: "anotador", rotulo: "Anotador" },
];

function Elenco({ jogo, t }: { jogo: Jogo; t: TimeId }) {
  const time = jogo.times[t];
  const [aberto, setAberto] = useState<string | null>(null);
  const usados = new Set(jogo.eventos.filter((e) => !e.removido).map((e) => e.jogador));
  const rep = repetidos(time.jogadores.map((j) => j.numero));
  const mudar = (id: string, campo: "numero" | "nome", valor: string) =>
    alterarJogadores(
      t,
      time.jogadores.map((j) => (j.id === id ? { ...j, [campo]: valor } : j)),
    );
  return (
    <div>
      <p className="mb-2 font-display text-lg" style={{ color: time.cor }}>
        {time.nome}
      </p>
      <div className="flex flex-col gap-1.5">
        {time.jogadores.map((j) => (
          <div key={j.id}>
            <div className="grid grid-cols-[auto_minmax(0,1fr)_40px] gap-1.5">
              <CampoNumero
                valor={j.numero}
                repetido={rep.has(j.numero)}
                aberto={aberto === j.id}
                onMudar={(n) => mudar(j.id, "numero", n)}
                onAbrir={() => setAberto(aberto === j.id ? null : j.id)}
              />
              <input
                value={j.nome}
                onChange={(e) => mudar(j.id, "nome", e.target.value)}
                onFocus={() => setAberto(null)}
                className="campo"
                aria-label="Nome"
              />
              <button
                type="button"
                disabled={usados.has(j.id)}
                title={usados.has(j.id) ? "Tem lances registrados" : "Remover"}
                onClick={() => alterarJogadores(t, time.jogadores.filter((x) => x.id !== j.id))}
                className="chanfro chanfro-sm grid place-items-center bg-secondary text-muted-foreground disabled:opacity-30"
                aria-label={`Remover ${j.nome}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {rep.has(j.numero) && <p className="mt-1 text-xs text-destructive">Número {j.numero} repetido neste time.</p>}
            <AnimatePresence initial={false}>
              {aberto === j.id && (
                <GradeNumeros
                  valor={j.numero}
                  ocupados={new Set(time.jogadores.filter((x) => x.id !== j.id).map((x) => x.numero))}
                  cor={time.cor}
                  onEscolher={(n) => {
                    mudar(j.id, "numero", n);
                    setAberto(null);
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      <Botao
        variante="contorno"
        className="mt-2 w-full"
        onClick={() => {
          const id = novoJogadorId(jogo, t);
          alterarJogadores(t, [...time.jogadores, { id, numero: "", nome: "Novo jogador" }]);
          setAberto(id);
        }}
      >
        <Plus className="h-4 w-4" /> Adicionar jogador
      </Botao>
    </div>
  );
}

const CAMPOS_LIMITE: { k: keyof LimitesPausa; rotulo: string; minutos: boolean }[] = [
  { k: "tempo", rotulo: "Pedido de tempo (s)", minutos: false },
  { k: "intervalo", rotulo: "Intervalo entre quartos (min)", minutos: true },
  { k: "meio", rotulo: "Intervalo do meio (min)", minutos: true },
  { k: "outras", rotulo: "Lesão, arbitragem, outras (min)", minutos: true },
];

function Limites({ jogo }: { jogo: Jogo }) {
  const l = limites(jogo);
  const r = regras(jogo);
  const tempo = jogo.jogo.tempo;
  return (
    <Cartao miolo="p-3">
      <div className="grid grid-cols-2 gap-2.5">
        {r.tempo && (
          <>
            <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
              Cada {r.umPeriodo} (min, 0 = sem relógio)
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                value={tempo?.periodo ?? 0}
                onChange={(e) => alterarTempo({ periodo: Math.max(0, Math.min(60, Math.round(Number(e.target.value) || 0))) })}
                className="campo font-display text-lg"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
              Prorrogação (min)
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                value={tempo?.prorrogacao ?? r.tempo.prorrogacao}
                onChange={(e) => {
                  const v = Math.round(Number(e.target.value));
                  if (v > 0) alterarTempo({ prorrogacao: Math.min(30, v) });
                }}
                className="campo font-display text-lg"
              />
            </label>
          </>
        )}
        {CAMPOS_LIMITE.filter((c) => c.k !== "meio" || regras(jogo).rotulosLimites.meio).map((c) => (
          <label key={c.k} className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
            {c.k === "intervalo" ? regras(jogo).rotulosLimites.intervalo : c.k === "meio" ? regras(jogo).rotulosLimites.meio : c.rotulo}
            <input
              type="number"
              inputMode="decimal"
              min={c.minutos ? 0.5 : 10}
              step={c.minutos ? 0.5 : 5}
              value={c.minutos ? l[c.k] / 60 : l[c.k]}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) alterarLimites({ [c.k]: Math.round(c.minutos ? v * 60 : v) });
              }}
              className="campo font-display text-lg"
            />
          </label>
        ))}
      </div>
      <p className="mt-2.5 text-xs text-muted-foreground">
        Quando uma parada passa disso, o cronômetro fica vermelho, o celular apita e vibra, e a parada entra como "acima do normal" na
        análise e no PDF.
      </p>
    </Cartao>
  );
}

export function TelaSumula({ jogo, onAviso }: { jogo: Jogo; onAviso: (t: string) => void }) {
  const info = infoPadrao(jogo);
  const [gerando, setGerando] = useState(false);
  const nPer = totalPeriodos(jogo);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <TituloSecao>Súmula</TituloSecao>
        <Botao
          variante="cor"
          cor="var(--neon-orange)"
          className="mb-3 w-full py-4 text-base text-white"
          disabled={gerando}
          onClick={async () => {
            setGerando(true);
            try {
              await baixarPDF(jogo);
            } catch {
              onAviso("Não consegui gerar o PDF.");
            }
            setGerando(false);
          }}
        >
          <FileText className="h-5 w-5" /> {gerando ? "Gerando…" : "Baixar súmula em PDF"}
        </Botao>
        <div className="flex flex-col gap-3">
          {TIMES.map((t) => (
            <QuadroTime key={t} jogo={jogo} t={t} />
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
          <span className="font-display-reta">{regras(jogo).nomePeriodos}</span>
          {Array.from({ length: nPer }, (_, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="h-3 w-3" style={{ background: corQuarto(i + 1) }} />
              {nomePeriodo(jogo, i + 1, true)}
            </span>
          ))}
          <span className="font-display-reta">{regras(jogo).coletivas ? "Faltas" : "Cartões"}</span>
          <span>{regras(jogo).faltas.map((f) => `${f} ${NOMES_FALTA[f].toLowerCase()}`).join(" · ")}</span>
        </div>
      </section>

      <section>
        <TituloSecao>Story do jogo</TituloSecao>
        <Story jogo={jogo} onAviso={onAviso} />
      </section>

      <section>
        <TituloSecao>Cores dos times</TituloSecao>
        <Cartao miolo="p-3">
          <CoresDeUmaImagem
            siglas={[jogo.times.A.sigla, jogo.times.B.sigla]}
            cores={[jogo.times.A.cor, jogo.times.B.cor]}
            onMudar={(lado, cor) => alterarCorTime(lado === 0 ? "A" : "B", cor)}
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {TIMES.map((t) => (
              <div key={t}>
                <p className="mb-2 font-display text-lg" style={{ color: jogo.times[t].cor }}>
                  {t === "A" ? "Esquerda" : "Direita"} · {jogo.times[t].nome}
                </p>
                <SeletorCor
                  cor={jogo.times[t].cor}
                  outra={jogo.times[t === "A" ? "B" : "A"].cor}
                  onMudar={(cor) => alterarCorTime(t, cor)}
                />
              </div>
            ))}
          </div>
        </Cartao>
      </section>

      <section>
        <TituloSecao>Dados da partida</TituloSecao>
        <Cartao miolo="p-3">
          <div className="grid grid-cols-2 gap-2.5">
            {CAMPOS.map((c) => (
              <label key={c.k} className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
                {c.rotulo}
                <input
                  type={c.tipo ?? "text"}
                  value={info[c.k]}
                  onChange={(e) => alterarInfo({ [c.k]: e.target.value })}
                  className="campo"
                  autoComplete="off"
                />
              </label>
            ))}
          </div>
        </Cartao>
      </section>

      <section>
        <TituloSecao>Duração normal das paradas</TituloSecao>
        <Limites jogo={jogo} />
      </section>

      <section>
        <TituloSecao extra={<span className="text-xs text-muted-foreground">quem tem lance não sai da lista</span>}>Elenco</TituloSecao>
        <Cartao miolo="p-3">
          <div className="grid gap-5 sm:grid-cols-2">
            {TIMES.map((t) => (
              <Elenco key={t} jogo={jogo} t={t} />
            ))}
          </div>
        </Cartao>
      </section>
    </div>
  );
}
