import { curveStep, curveStepAfter } from "d3-shape";
import { Crown, Flame, Repeat, Scale, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Area, AreaChart } from "@/components/charts/area-chart";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip, TooltipContent } from "@/components/charts/tooltip";
import { XAxis } from "@/components/charts/x-axis";
import { atletas, destaques, fluxo, nomePeriodo, placar, porPeriodo } from "@/lib/estatisticas";
import { regras } from "@/lib/regras";
import { horaCurta } from "@/lib/tempo";
import type { Jogo, TimeId } from "@/lib/tipos";
import { Cartao, Selo, TituloSecao } from "./arena";
import { Paralisacoes } from "./Paralisacoes";

const entrada = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { type: "spring" as const, stiffness: 260, damping: 28 },
};

function Vazio({ children }: { children: ReactNode }) {
  return (
    <div className="listras chanfro chanfro-sm grid h-40 place-items-center px-6 text-center text-sm text-muted-foreground ring-1 ring-inset ring-border">
      {children}
    </div>
  );
}

/** Tooltip em português: título vem do próprio dado (a cesta ou o quarto), não da data. */
function tooltip(jogo: Jogo, titulo: (p: Record<string, unknown>, i: number) => string) {
  return ({ point, index }: { point: Record<string, unknown>; index: number }) => (
    <TooltipContent
      title={titulo(point, index)}
      rows={(["A", "B"] as TimeId[]).map((t) => ({
        color: jogo.times[t].cor,
        label: jogo.times[t].sigla,
        value: Number(point[t] ?? 0),
      }))}
    />
  );
}

function GraficoFluxo({ jogo }: { jogo: Jogo }) {
  const dados = fluxo(jogo);
  if (dados.length < 3) return <Vazio>O fluxo aparece depois {regras(jogo).ponto === "cesta" ? "das primeiras cestas" : `dos primeiros ${regras(jogo).pontos}`}.</Vazio>;
  const rotulos = dados.map((d, i) => (i === 0 ? "Início" : `${d.rotulo} ${horaCurta(d.date.getTime())}`));
  return (
    <AreaChart data={dados} aspectRatio="16 / 9" margin={{ top: 16, right: 34, bottom: 36, left: 26 }}>
      <Grid horizontal numTicksRows={4} />
      <Area dataKey="A" curve={curveStepAfter} fill={jogo.times.A.cor} fillOpacity={0.35} strokeWidth={2.5} />
      <Area dataKey="B" curve={curveStepAfter} fill={jogo.times.B.cor} fillOpacity={0.35} strokeWidth={2.5} />
      <XAxis labels={rotulos} numTicks={3} />
      <ChartTooltip dateLabels={rotulos} content={tooltip(jogo, (p) => String(p.descricao ?? ""))} />
    </AreaChart>
  );
}

function GraficoQuartos({ jogo }: { jogo: Jogo }) {
  const linhas = porPeriodo(jogo);
  if (linhas.length < 2) return <Vazio>O comparativo aparece a partir do {nomePeriodo(jogo, 2)}.</Vazio>;
  // O gráfico é de série temporal: cada quarto vira um "dia" e o rótulo mostra o quarto.
  const dados = linhas.map((l) => ({ date: new Date(2000, 0, l.periodo), A: l.A, B: l.B }));
  const rotulos = linhas.map((l) => l.rotulo);
  return (
    <AreaChart data={dados} aspectRatio="16 / 9" margin={{ top: 16, right: 26, bottom: 36, left: 26 }}>
      <Grid horizontal numTicksRows={4} />
      <Area dataKey="A" curve={curveStep} fill={jogo.times.A.cor} fillOpacity={0.3} strokeWidth={2.5} showMarkers />
      <Area dataKey="B" curve={curveStep} fill={jogo.times.B.cor} fillOpacity={0.3} strokeWidth={2.5} showMarkers />
      <XAxis labels={rotulos} numTicks={rotulos.length} />
      <ChartTooltip dateLabels={rotulos} content={tooltip(jogo, (_, i) => nomePeriodo(jogo, linhas[i]?.periodo ?? 1))} />
    </AreaChart>
  );
}

function TabelaQuartos({ jogo }: { jogo: Jogo }) {
  const linhas = porPeriodo(jogo);
  const total = placar(jogo);
  return (
    <div className="sem-barra overflow-x-auto">
      <table className="w-full min-w-[320px] border-separate border-spacing-y-1.5 text-center tabular-nums">
        <thead>
          <tr className="font-display-reta text-[11px] text-muted-foreground">
            <th className="text-left font-semibold">Time</th>
            {linhas.map((l) => (
              <th key={l.periodo} className="font-semibold">
                {l.rotulo}
              </th>
            ))}
            <th className="font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {(["A", "B"] as TimeId[]).map((t) => {
            const outro: TimeId = t === "A" ? "B" : "A";
            return (
              <tr key={t}>
                <td className="text-left">
                  <span className="font-display text-lg" style={{ color: jogo.times[t].cor }}>
                    {jogo.times[t].sigla}
                  </span>
                </td>
                {linhas.map((l) => {
                  const venceu = l[t] > l[outro];
                  return (
                    <td key={l.periodo}>
                      <span
                        className="chanfro chanfro-sm inline-block min-w-9 px-1.5 py-1 font-display text-xl"
                        style={venceu ? { background: `color-mix(in oklab, ${jogo.times[t].cor} 28%, transparent)`, color: "#fff" } : { color: "var(--muted-foreground)" }}
                      >
                        {l[t]}
                      </span>
                    </td>
                  );
                })}
                <td className="font-display text-2xl text-foreground">{total[t]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Destaque({ icone, rotulo, valor, cor }: { icone: ReactNode; rotulo: string; valor: ReactNode; cor: string }) {
  return (
    <motion.div {...entrada} className="borda-neon chanfro chanfro-sm" style={{ "--cor": cor, "--cor2": "transparent" } as React.CSSProperties}>
      <div className="chanfro chanfro-sm h-full bg-card p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span style={{ color: cor }}>{icone}</span>
          <span className="font-display-reta text-[10px]">{rotulo}</span>
        </div>
        <div className="mt-1 font-display text-2xl text-foreground">{valor}</div>
      </div>
    </motion.div>
  );
}

function Destaques({ jogo }: { jogo: Jogo }) {
  const d = destaques(jogo);
  const sig = (t: TimeId) => jogo.times[t].sigla;
  const cor = (t: TimeId) => jogo.times[t].cor;
  const vant: TimeId = d.maiorVantagem.A >= d.maiorVantagem.B ? "A" : "B";
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      <Destaque icone={<Repeat className="h-3.5 w-3.5" />} rotulo="Trocas de liderança" valor={d.trocasDeLideranca} cor="var(--neon-cyan)" />
      <Destaque icone={<Scale className="h-3.5 w-3.5" />} rotulo="Empates" valor={d.empates} cor="var(--neon-violet)" />
      <Destaque
        icone={<TrendingUp className="h-3.5 w-3.5" />}
        rotulo="Maior vantagem"
        valor={d.maiorVantagem[vant] > 0 ? `${sig(vant)} +${d.maiorVantagem[vant]}` : "—"}
        cor={cor(vant)}
      />
      <Destaque
        icone={<Flame className="h-3.5 w-3.5" />}
        rotulo="Maior sequência"
        valor={d.maiorSequencia ? `${sig(d.maiorSequencia.time)} ${d.maiorSequencia.pontos}–0` : "—"}
        cor={d.maiorSequencia ? cor(d.maiorSequencia.time) : "var(--neon-orange)"}
      />
      {d.melhorPeriodo && (
        <div className="col-span-2 md:col-span-4">
          <Destaque
            icone={<Crown className="h-3.5 w-3.5" />}
            rotulo={`Melhor ${regras(jogo).umPeriodo}`}
            valor={`${sig(d.melhorPeriodo.time)} · ${regras(jogo).abrev(d.melhorPeriodo.pontos)} no ${nomePeriodo(jogo, d.melhorPeriodo.periodo)}`}
            cor={cor(d.melhorPeriodo.time)}
          />
        </div>
      )}
    </div>
  );
}

function Cestinhas({ jogo }: { jogo: Jogo }) {
  const lista = atletas(jogo).filter((l) => l.pontos > 0 || l.lances > 0);
  if (!lista.length) return <Vazio>Nenhum ponto registrado ainda.</Vazio>;
  const max = Math.max(...lista.map((l) => l.pontos), 1);
  return (
    <ol className="flex flex-col gap-2">
      {lista.map((l, i) => {
        const cor = jogo.times[l.time].cor;
        return (
          <motion.li
            key={l.jogador.id}
            layout
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03, type: "spring", stiffness: 380, damping: 30 }}
            className="chanfro chanfro-sm relative flex items-center gap-3 overflow-hidden bg-card px-3 py-2"
          >
            <motion.span
              className="absolute inset-y-0 left-0 opacity-20"
              style={{ background: `linear-gradient(90deg, ${cor}, transparent)` }}
              initial={{ width: 0 }}
              animate={{ width: `${(l.pontos / max) * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 22 }}
            />
            <span className="relative w-5 font-display text-lg text-muted-foreground">{i + 1}</span>
            <Selo cor={cor} className="relative h-9 w-9 text-xl">
              {l.jogador.numero || "–"}
            </Selo>
            <div className="relative min-w-0 flex-1">
              <div className="truncate font-semibold">{l.jogador.nome}</div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {regras(jogo).valores.length > 1 ? `${l.c3}×3 · ${l.c2}×2 · ${l.c1}×1` : regras(jogo).abrev(l.pontos)}
                {l.lances ? ` · ${l.lances}★` : ""}
              </div>
            </div>
            <div className="relative font-display text-3xl" style={{ color: cor }}>
              {l.pontos}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

export function TelaAnalise({ jogo }: { jogo: Jogo }) {
  return (
    <div className="flex flex-col gap-6">
      <motion.section {...entrada}>
        <TituloSecao>{`${regras(jogo).id === "futsal" ? "Gols" : "Pontos"} por ${regras(jogo).umPeriodo}`}</TituloSecao>
        <Cartao cor={jogo.times.A.cor} cor2={jogo.times.B.cor} miolo="p-3">
          <TabelaQuartos jogo={jogo} />
          <div className="mt-2">
            <GraficoQuartos jogo={jogo} />
          </div>
        </Cartao>
      </motion.section>

      <motion.section {...entrada}>
        <TituloSecao extra={<span className="font-display-reta text-[10px] text-muted-foreground">placar acumulado</span>}>
          Fluxo do jogo
        </TituloSecao>
        <Cartao cor={jogo.times.A.cor} cor2={jogo.times.B.cor} miolo="p-3">
          <GraficoFluxo jogo={jogo} />
        </Cartao>
      </motion.section>

      <motion.section {...entrada}>
        <TituloSecao extra={<span className="font-display-reta text-[10px] text-muted-foreground">tempos, lesões, arbitragem</span>}>
          Paradas
        </TituloSecao>
        <Paralisacoes jogo={jogo} />
      </motion.section>

      <section>
        <TituloSecao>Destaques</TituloSecao>
        <Destaques jogo={jogo} />
      </section>

      <motion.section {...entrada}>
        <TituloSecao>{{ basquete: "Cestinhas", futsal: "Artilheiros", volei: "Quem mais pontuou" }[regras(jogo).id]}</TituloSecao>
        <Cestinhas jogo={jogo} />
      </motion.section>
    </div>
  );
}
