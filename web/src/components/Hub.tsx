import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  Folder,
  FolderOpen,
  Goal,
  RectangleHorizontal,
  RectangleVertical,
  RefreshCw,
  Share2,
  Video,
  Volleyball,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  abrirJogo,
  abrirNoDrive,
  agruparPorPeriodo,
  baixarDoDrive,
  compartilharLink,
  type JogadorHub,
  type JogoHub,
  linkJogo,
  listarJogos,
  type Pasta,
  type ResumoHub,
  rotuloPontos,
  videoDrive,
} from "@/lib/hub";
import type { Modalidade } from "@/lib/regras";
import { REGRAS } from "@/lib/regras";
import { ir, useEndereco } from "@/lib/rota";
import { corQuarto } from "@/lib/tipos";
import { textoSobre } from "@/lib/cor";
import { Cartao, Selo } from "./arena";
import { ConferenciaPC } from "./Conferencia";
import { Destaque } from "./Destaque";
import { Folha } from "./Folha";
import { FundoLados } from "./FundoLados";
import { IconeBasquete } from "./IconeBasquete";

const ICONE: Record<Modalidade, React.ComponentType<{ className?: string }>> = {
  basquete: IconeBasquete,
  futsal: Goal,
  volei: Volleyball,
};

const horaCurta = (ms: number) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dataCurta = (ms: number) => new Date(ms).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

/** Placar curto: no vôlei, sets (e os pontos ficam no detalhe). */
function placarTexto(j: ResumoHub) {
  return j.sets ? { A: j.sets.A, B: j.sets.B, rotulo: "sets" } : { A: j.placar.A, B: j.placar.B, rotulo: "" };
}

function Aviso({ texto, onTentar }: { texto: string; onTentar?: () => void }) {
  return (
    <div className="chanfro chanfro-sm flex items-center gap-3 bg-secondary px-3 py-3 text-sm">
      <span className="min-w-0 flex-1 text-muted-foreground">{texto}</span>
      {onTentar && (
        <button type="button" onClick={onTentar} className="chanfro chanfro-sm flex items-center gap-1.5 bg-foreground px-3 py-1.5 font-display-reta text-xs text-background">
          <RefreshCw className="h-3.5 w-3.5" /> De novo
        </button>
      )}
    </div>
  );
}

function Carregando() {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      {[0, 1, 2].map((i) => (
        <div key={i} className="chanfro h-20 animate-pulse bg-secondary/70" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}

/** Situação dos vídeos do jogo, numa etiqueta. */
function Etiqueta({ j }: { j: ResumoHub }) {
  const [txt, cls] =
    j.estado === "pronto" && j.clipes >= j.lances
      ? [`${j.clipes} vídeo${j.clipes === 1 ? "" : "s"}`, "bg-[var(--ok)] text-[var(--sobre-ok)]"]
      : j.estado === "pronto"
        ? [`${j.clipes}/${j.lances} vídeos`, "bg-[var(--pausa-texto)] text-[#111]"]
        : j.estado === "cortando"
          ? ["cortando", "bg-secondary text-foreground"]
          : j.estado === "erro"
            ? ["sem vídeo", "bg-destructive/20 text-destructive"]
            : ["esperando vídeo", "bg-secondary text-muted-foreground"];
  return <span className={`chanfro chanfro-sm shrink-0 px-2 py-0.5 font-display-reta text-[10px] ${cls}`}>{txt}</span>;
}

// ------------------------------------------------------------------ lista: pastas por dia e horário

function LinhaJogo({ j }: { j: ResumoHub }) {
  const Icone = ICONE[j.modalidade] ?? IconeBasquete;
  const p = placarTexto(j);
  return (
    <button
      type="button"
      onClick={() => ir(`/hub/${encodeURIComponent(j.id)}`)}
      className="flex w-full items-center gap-3 border-t border-border/70 px-1 py-3 text-left first:border-t-0"
    >
      <Icone className="h-5 w-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-display text-xl tabular-nums">
          <span style={{ color: j.times.A.cor }}>{j.times.A.sigla}</span>
          <span>{p.A}</span>
          <span className="text-sm text-muted-foreground">x</span>
          <span>{p.B}</span>
          <span style={{ color: j.times.B.cor }}>{j.times.B.sigla}</span>
          {p.rotulo && <span className="font-display-reta text-[10px] text-muted-foreground">{p.rotulo}</span>}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {horaCurta(j.inicio)} · {j.nome}
        </span>
      </span>
      <Etiqueta j={j} />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function CartaoPasta({ pasta, aberta, onAlternar }: { pasta: Pasta; aberta: boolean; onAlternar: () => void }) {
  const Icone = aberta ? FolderOpen : Folder;
  return (
    <Cartao miolo="px-3 py-2">
      <button type="button" onClick={onAlternar} className="flex w-full items-center gap-3 py-1.5 text-left" aria-expanded={aberta}>
        <Icone className="h-5 w-5 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-xl leading-tight">{pasta.dia}</span>
          <span className="block font-display-reta text-[11px] text-muted-foreground">
            {pasta.horario} · {pasta.jogos.length} jogo{pasta.jogos.length === 1 ? "" : "s"}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${aberta ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {aberta && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pb-1">
              {pasta.jogos.map((j) => (
                <LinhaJogo key={j.id} j={j} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Cartao>
  );
}

function HubLista() {
  const [jogos, setJogos] = useState<ResumoHub[] | null>(null);
  const [erro, setErro] = useState("");
  const [abertas, setAbertas] = useState<Set<string> | null>(null);

  const carregar = useCallback(() => {
    setErro("");
    setJogos(null);
    listarJogos()
      .then(setJogos)
      .catch((e: Error) => setErro(`Não consegui carregar os jogos (${e.message}).`));
  }, []);
  useEffect(carregar, [carregar]);

  const pastas = useMemo(() => (jogos ? agruparPorPeriodo(jogos) : []), [jogos]);
  // A rodada mais recente já vem aberta.
  const abertasAgora = abertas ?? new Set(pastas.slice(0, 1).map((p) => p.chave));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-12">
      <FundoLados a="#2e7dff" b="#ff6a00" />
      <header className="pt-2">
        <button type="button" onClick={() => ir("/")} className="mb-3 flex items-center gap-1 font-display-reta text-[11px] text-muted-foreground">
          <ChevronLeft className="h-3.5 w-3.5" /> Súmula digital
        </button>
        <h1 className="font-display text-5xl leading-[0.95]">
          Jogos e{" "}
          <Destaque de="esquerda" atraso={0.3}>
            lances
          </Destaque>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Abra o jogo, toque no seu nome e veja os vídeos de cada ponto seu.</p>
      </header>

      {erro ? (
        <Aviso texto={erro} onTentar={carregar} />
      ) : !jogos ? (
        <Carregando />
      ) : !pastas.length ? (
        <Aviso texto="Nenhum jogo publicado ainda. Assim que um jogo for encerrado e a súmula chegar ao Drive, ele aparece aqui." onTentar={carregar} />
      ) : (
        pastas.map((p) => (
          <CartaoPasta
            key={p.chave}
            pasta={p}
            aberta={abertasAgora.has(p.chave)}
            onAlternar={() => {
              const n = new Set(abertasAgora);
              if (n.has(p.chave)) n.delete(p.chave);
              else n.add(p.chave);
              setAbertas(n);
            }}
          />
        ))
      )}
    </div>
  );
}

// ------------------------------------------------------------------ jogo: jogadores com os pontinhos

function Pontinhos({ jogador, modalidade, onAbrir }: { jogador: JogadorHub; modalidade: Modalidade; onAbrir: (i: number) => void }) {
  return (
    <span className="flex flex-wrap gap-1">
      {jogador.lances.map((l, i) => {
        const cor = corQuarto(l.p);
        return (
          <span
            key={l.id}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onAbrir(i);
            }}
            onKeyDown={(e) => e.key === "Enter" && onAbrir(i)}
            title={`${l.oque} · ${l.periodo} · ${l.hora}`}
            className={`chanfro chanfro-sm grid h-6 min-w-6 place-items-center px-1 font-display text-xs tabular-nums ${l.v || l.o ? "" : "opacity-45"}`}
            style={{ background: cor, color: textoSobre(cor) }}
          >
            {modalidade === "basquete" && l.valor ? l.valor : modalidade === "futsal" && l.valor ? "⚽" : "●"}
          </span>
        );
      })}
    </span>
  );
}

function LinhaJogador({ j, cor, modalidade, onAbrir }: { j: JogadorHub; cor: string; modalidade: Modalidade; onAbrir: (i: number) => void }) {
  const vazio = !j.lances.length;
  return (
    <button
      type="button"
      disabled={vazio}
      onClick={() => onAbrir(0)}
      className="flex w-full items-center gap-3 border-t border-border/70 py-2.5 text-left first:border-t-0 disabled:opacity-40"
    >
      <Selo cor={cor} className="h-10 w-10 shrink-0 text-lg">
        {j.numero || "EQ"}
      </Selo>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-display text-lg">{j.nome}</span>
          <span className="shrink-0 font-display-reta text-xs text-muted-foreground">{rotuloPontos(modalidade, j.pontos)}</span>
        </span>
        {!vazio && (
          <span className="mt-1 block">
            <Pontinhos jogador={j} modalidade={modalidade} onAbrir={onAbrir} />
          </span>
        )}
      </span>
      {!vazio && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </button>
  );
}

/** Vertical (com a tarja, para story/reels) ou horizontal (o vídeo como foi filmado). */
type Formato = "vertical" | "horizontal";
const CHAVE_FORMATO = "sumula-digital:hub-formato";

function formatoSalvo(): Formato {
  try {
    return localStorage.getItem(CHAVE_FORMATO) === "horizontal" ? "horizontal" : "vertical";
  } catch {
    return "vertical";
  }
}

const FORMATOS: { f: Formato; rotulo: string; Icone: React.ComponentType<{ className?: string }> }[] = [
  { f: "vertical", rotulo: "Vertical", Icone: RectangleVertical },
  { f: "horizontal", rotulo: "Horizontal", Icone: RectangleHorizontal },
];

function FolhaJogador({ jogo, jogador, inicial, onFechar }: { jogo: JogoHub; jogador: JogadorHub | null; inicial: number; onFechar: () => void }) {
  const [i, setI] = useState(inicial);
  const [aviso, setAviso] = useState("");
  const [formato, setFormato] = useState<Formato>(formatoSalvo);
  // A câmera escolhida vale para todos os lances; lance que ela não filmou mostra a primeira.
  const [camera, setCamera] = useState<number | null>(null);
  useEffect(() => setI(inicial), [inicial, jogador?.id]);
  const time = jogador ? jogo.times[jogador.time] : null;
  const lance = jogador?.lances[i];
  const angulos = lance?.a ?? [];
  const angulo = angulos.find((x) => x.c === camera) ?? angulos[0];
  const l = lance && angulo ? { ...lance, v: angulo.v, o: angulo.o } : lance;
  const n = jogador?.lances.length ?? 0;
  const tem: Record<Formato, boolean> = { vertical: !!l?.v, horizontal: !!l?.o };
  // Se o formato escolhido ainda não subiu para este lance, mostra o outro em vez de nada.
  const usado: Formato = tem[formato] || !tem[formato === "vertical" ? "horizontal" : "vertical"] ? formato : formato === "vertical" ? "horizontal" : "vertical";
  const id = (usado === "vertical" ? l?.v : l?.o) || null;
  const escolher = (f: Formato) => {
    setFormato(f);
    try {
      localStorage.setItem(CHAVE_FORMATO, f);
    } catch {
      /* só não lembra da próxima vez */
    }
  };

  return (
    <Folha aberta={!!jogador} onFechar={onFechar}>
      {jogador && time && l && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Selo cor={time.cor} className="h-12 w-12 shrink-0 text-xl">
              {jogador.numero || "EQ"}
            </Selo>
            <div className="min-w-0">
              <p className="truncate font-display-reta text-[11px] text-muted-foreground">
                {time.nome} · {jogo.nome}
              </p>
              <h2 className="truncate font-display text-3xl leading-none">
                {jogador.nome}{" "}
                <Destaque cor={time.cor} de="esquerda" atraso={0.15} className="text-2xl">
                  {rotuloPontos(jogo.modalidade, jogador.pontos)}
                </Destaque>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 bg-secondary p-1 chanfro chanfro-sm" role="radiogroup" aria-label="Formato do vídeo">
            {FORMATOS.map(({ f, rotulo, Icone }) => {
              const ativo = usado === f;
              return (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  disabled={!tem[f] && (tem.vertical || tem.horizontal)}
                  onClick={() => escolher(f)}
                  className={`chanfro chanfro-sm flex h-9 items-center justify-center gap-1.5 font-display-reta text-xs transition-colors disabled:opacity-35 ${
                    ativo ? "bg-foreground text-background" : "text-muted-foreground"
                  }`}
                >
                  <Icone className="h-4 w-4" /> {rotulo}
                </button>
              );
            })}
          </div>

          {/* Mais de uma câmera filmou este lance: um botão por ângulo. */}
          {angulos.length > 1 && angulo && (
            <div
              className="grid gap-1 bg-secondary p-1 chanfro chanfro-sm"
              style={{ gridTemplateColumns: `repeat(${angulos.length}, minmax(0, 1fr))` }}
              role="radiogroup"
              aria-label="Câmera"
            >
              {angulos.map((x) => {
                const ativo = x.c === angulo.c;
                return (
                  <button
                    key={x.c}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => setCamera(x.c)}
                    className={`chanfro chanfro-sm flex h-9 items-center justify-center gap-1.5 font-display-reta text-xs transition-colors ${
                      ativo ? "bg-foreground text-background" : "text-muted-foreground"
                    }`}
                  >
                    <Video className="h-4 w-4" /> Ângulo {x.c}
                  </button>
                );
              })}
            </div>
          )}

          {/* O vídeo do lance pelo player do Drive: vertical com a tarja ou o horizontal como foi filmado. */}
          <div
            className={`relative mx-auto w-full overflow-hidden bg-black ${
              usado === "vertical" ? "aspect-[9/16] max-w-[min(100%,calc(58vh*9/16))]" : "aspect-video"
            }`}
          >
            {id ? (
              <iframe
                key={id}
                src={videoDrive(id)}
                title={`${l.oque} de ${jogador.nome}`}
                allow="autoplay; fullscreen"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/70">
                <span className="flex flex-col items-center gap-2">
                  <Clock3 className="h-6 w-6" />
                  {jogo.estado === "pronto" ? "Este vídeo ainda está subindo para o Drive. Volte em alguns minutos." : "Os vídeos deste jogo ainda estão sendo preparados."}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} className="chanfro chanfro-sm grid h-11 w-11 shrink-0 place-items-center bg-secondary disabled:opacity-30" aria-label="Lance anterior">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="sem-barra flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
              {jogador.lances.map((x, k) => {
                const cor = corQuarto(x.p);
                const ativo = k === i;
                return (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => setI(k)}
                    className={`chanfro chanfro-sm shrink-0 px-2.5 py-1.5 text-left ${ativo ? "" : "bg-secondary"}`}
                    style={ativo ? { background: cor, color: textoSobre(cor) } : undefined}
                  >
                    <span className="block font-display text-base leading-none">{x.oque}</span>
                    <span className="block font-display-reta text-[10px] opacity-80">
                      {x.periodo} · {x.hora}
                    </span>
                  </button>
                );
              })}
            </div>
            <button type="button" disabled={i >= n - 1} onClick={() => setI(i + 1)} className="chanfro chanfro-sm grid h-11 w-11 shrink-0 place-items-center bg-secondary disabled:opacity-30" aria-label="Próximo lance">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <a
              href={id ? baixarDoDrive(id) : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!id}
              className={`chanfro chanfro-sm flex h-11 items-center justify-center gap-1.5 bg-foreground font-display-reta text-xs text-background ${id ? "" : "pointer-events-none opacity-40"}`}
            >
              <Download className="h-4 w-4" /> Baixar
            </a>
            <a
              href={id ? abrirNoDrive(id) : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!id}
              className={`chanfro chanfro-sm flex h-11 items-center justify-center gap-1.5 bg-secondary font-display-reta text-xs ${id ? "" : "pointer-events-none opacity-40"}`}
            >
              <ExternalLink className="h-4 w-4" /> Drive
            </a>
            <button
              type="button"
              onClick={async () => {
                const r = await compartilharLink(linkJogo(jogo.id, jogador.id), `Lances de ${jogador.nome} · ${jogo.nome}`);
                if (r === "copiado") setAviso("Link copiado.");
              }}
              className="chanfro chanfro-sm flex h-11 items-center justify-center gap-1.5 bg-secondary font-display-reta text-xs"
            >
              <Share2 className="h-4 w-4" /> Enviar
            </button>
          </div>
          {aviso && <p className="text-center text-xs text-muted-foreground">{aviso}</p>}
        </div>
      )}
    </Folha>
  );
}

function HubJogo({ id, jogadorInicial }: { id: string; jogadorInicial: string | null }) {
  const [jogo, setJogo] = useState<JogoHub | null>(null);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState<{ id: string; i: number } | null>(jogadorInicial ? { id: jogadorInicial, i: 0 } : null);
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(() => {
    setErro("");
    abrirJogo(id)
      .then(setJogo)
      .catch((e: Error) => setErro(`Não consegui abrir o jogo (${e.message}).`));
  }, [id]);
  useEffect(carregar, [carregar]);

  // O link da janela acompanha o jogador aberto: quem compartilhar a página leva direto aos lances dele.
  const abrir = (jid: string | null, i = 0) => {
    setAberto(jid ? { id: jid, i } : null);
    const url = new URL(location.href);
    if (jid) url.searchParams.set("j", jid);
    else url.searchParams.delete("j");
    history.replaceState(null, "", url.pathname + url.search);
  };

  const jogador = jogo && aberto ? (jogo.jogadores.find((x) => x.id === aberto.id) ?? null) : null;
  const r = jogo ? REGRAS[jogo.modalidade] : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-12">
      <FundoLados a={jogo?.times.A.cor ?? "#2e7dff"} b={jogo?.times.B.cor ?? "#ff6a00"} />
      <button type="button" onClick={() => ir("/hub")} className="flex items-center gap-1 self-start pt-2 font-display-reta text-[11px] text-muted-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Jogos
      </button>

      {erro ? (
        <Aviso texto={erro} onTentar={carregar} />
      ) : !jogo || !r ? (
        <Carregando />
      ) : (
        <>
          <header className="flex flex-col gap-3">
            <p className="font-display-reta text-[11px] text-muted-foreground">
              {r.nome} · {dataCurta(jogo.inicio)} · {horaCurta(jogo.inicio)}
              {jogo.local ? ` · ${jogo.local}` : ""}
            </p>
            <h1 className="font-display text-2xl leading-tight">{jogo.nome}</h1>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              {(["A", "B"] as const).map((t, k) => {
                const tm = jogo.times[t];
                const p = placarTexto(jogo);
                const lado = (
                  <div key={t} className={`flex flex-col ${k ? "items-end" : "items-start"}`}>
                    <Destaque cor={tm.cor} de={k ? "direita" : "esquerda"} atraso={0.2 + k * 0.15} className="font-display text-3xl">
                      {tm.sigla}
                    </Destaque>
                    <span className="mt-1 font-display text-6xl leading-none tabular-nums">{p[t]}</span>
                    <span className="max-w-full truncate text-xs text-muted-foreground">{tm.nome}</span>
                  </div>
                );
                return k ? [<span key="x" className="font-display text-2xl text-muted-foreground">x</span>, lado] : lado;
              })}
            </div>
            {jogo.sets && (
              <p className="text-center text-xs text-muted-foreground">
                Sets · pontos: {jogo.placar.A} x {jogo.placar.B}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  const res = await compartilharLink(linkJogo(jogo.id), `${jogo.nome} · lances`);
                  if (res === "copiado") setAviso("Link do jogo copiado.");
                }}
                className="chanfro chanfro-sm flex h-11 flex-1 items-center justify-center gap-2 bg-foreground font-display-reta text-sm text-background"
              >
                <Share2 className="h-4 w-4" /> Enviar o link do jogo
              </button>
              <button type="button" onClick={carregar} className="chanfro chanfro-sm grid h-11 w-11 place-items-center bg-secondary" aria-label="Atualizar">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            {aviso && <p className="text-xs text-muted-foreground">{aviso}</p>}
            {/* O que o PC confirmou ao ler os vídeos: câmeras, precisão, lances com vídeo. */}
            <ConferenciaPC jogo={jogo} />
          </header>

          <p className="font-display-reta text-[11px] text-muted-foreground">Toque no seu nome para ver os seus lances</p>

          {(["A", "B"] as const).map((t) => {
            const tm = jogo.times[t];
            const lista = jogo.jogadores.filter((x) => x.time === t);
            return (
              <Cartao key={t} cor={tm.cor} miolo="px-3 py-2">
                <div className="flex items-center gap-2 pt-1 pb-2">
                  <span className="h-4 w-1.5 -skew-x-12" style={{ background: tm.cor }} />
                  <span className="font-display text-xl">{tm.nome}</span>
                </div>
                {lista.map((x) => (
                  <LinhaJogador key={x.id} j={x} cor={tm.cor} modalidade={jogo.modalidade} onAbrir={(i) => abrir(x.id, i)} />
                ))}
              </Cartao>
            );
          })}

          <FolhaJogador jogo={jogo} jogador={jogador} inicial={aberto?.i ?? 0} onFechar={() => abrir(null)} />
        </>
      )}
    </div>
  );
}

/** Raiz do hub: /hub (lista) ou /hub/<id do jogo>[?j=<jogador>]. */
export function Hub() {
  const endereco = useEndereco();
  const url = new URL(endereco, location.origin);
  const partes = url.pathname.split("/").filter(Boolean);
  const id = partes[1] ? decodeURIComponent(partes[1]) : null;
  return (
    <MotionConfig reducedMotion="user">
      {id ? <HubJogo key={id} id={id} jogadorInicial={url.searchParams.get("j")} /> : <HubLista />}
    </MotionConfig>
  );
}
