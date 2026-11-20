import { Flame, Goal, Volleyball } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { type ConfigTime, criarJogo, montarJogadores } from "@/lib/store";
import { type Modalidade, MODALIDADES, REGRAS } from "@/lib/regras";
import type { TimeId } from "@/lib/tipos";
import { pedirAbertura } from "@/lib/abertura";
import { textoSobre } from "@/lib/cor";
import { Botao, Cartao } from "./arena";
import { Destaque } from "./Destaque";
import { FundoLados } from "./FundoLados";
import { QuadraIso, useLinhaDoTempo } from "./QuadraIso";
import { IconeBasquete } from "./IconeBasquete";
import { CartaoInstalar } from "./Instalacao";
import { type LinhaJogador, ListaJogadores, novaLinha, repetidos } from "./ListaJogadores";
import { CoresDeUmaImagem, SeletorCor } from "./SeletorCor";

/** O time na tela de cadastro: as linhas guardam uma chave para o React não embaralhar os campos. */
type Time = Omit<ConfigTime, "jogadores"> & { jogadores: LinhaJogador[] };

const VAZIO = (cor: string): Time => ({ nome: "", sigla: "", cor, jogadores: Array.from({ length: LINHAS_INICIAIS }, () => novaLinha()) });

const ICONES: Record<Modalidade, React.ComponentType<{ className?: string }>> = {
  basquete: IconeBasquete,
  futsal: Goal,
  volei: Volleyball,
};

const ULTIMA = "sumula-digital:modalidade";

function modalidadeSalva(): Modalidade {
  try {
    const m = localStorage.getItem(ULTIMA) as Modalidade | null;
    return m && MODALIDADES.includes(m) ? m : "basquete";
  } catch {
    return "basquete";
  }
}

/** Uma quadra em miniatura por esporte. A escolhida se redesenha e ganha as cores dos times. */
function OpcaoModalidade({ m, ativo, corA, corB, onEscolher }: { m: Modalidade; ativo: boolean; corA: string; corB: string; onEscolher: () => void }) {
  const Icone = ICONES[m];
  const ms = useLinhaDoTempo(ativo);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativo}
      onClick={onEscolher}
      className={`chanfro chanfro-sm flex flex-col items-stretch gap-1 px-1.5 pt-2 pb-2 transition-colors ${
        ativo ? "bg-card ring-2 ring-inset ring-foreground" : "bg-secondary/70 text-muted-foreground"
      }`}
    >
      <QuadraIso modalidade={m} corA={corA} corB={corB} ms={ms} jogadores={false} metades={ativo ? 1 : 0} className="h-14 w-full" />
      <span className="flex items-center justify-center gap-1.5 font-display text-base">
        <Icone className="h-4 w-4" />
        {REGRAS[m].nome}
      </span>
    </button>
  );
}

/** Três opções fixas: a modalidade define pontos, períodos, faltas e cartões do jogo. */
function EscolhaModalidade({ valor, corA, corB, onMudar }: { valor: Modalidade; corA: string; corB: string; onMudar: (m: Modalidade) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Modalidade">
      {MODALIDADES.map((m) => (
        <OpcaoModalidade key={m} m={m} ativo={m === valor} corA={corA} corB={corB} onEscolher={() => onMudar(m)} />
      ))}
    </div>
  );
}

/** O que muda no jogo, em uma linha, para o mesário conferir antes de começar. */
const RESUMO: Record<Modalidade, string> = {
  basquete: "4 quartos · +1 +2 +3 · faltas FIBA (5 exclui) · coletivas: 5ª vira lance livre",
  futsal: "2 tempos · gol · faltas acumuladas: a 6ª vira tiro livre · cartões amarelo e vermelho · 1 tempo técnico por tempo",
  volei: "Sets · ponto a ponto (erro do adversário: linha Equipe) · 2 tempos por set · cartões",
};

const elenco = (lista: [string, string][]) => lista.map(([n, nome]) => novaLinha(n, nome));

const exemplo = (): Record<TimeId, Time> => ({
  A: {
    nome: "Engenharia",
    sigla: "ENG",
    cor: "#2e7dff",
    jogadores: elenco([["4", "Matheus"], ["7", "João"], ["10", "Pedro"], ["12", "Caio"], ["15", "Davi"], ["23", "Lucas"]]),
  },
  B: {
    nome: "Direito",
    sigla: "DIR",
    cor: "#ff6a00",
    jogadores: elenco([["5", "Rafael"], ["8", "Bruno"], ["11", "Thiago"], ["13", "Gabriel"], ["21", "André"], ["30", "Felipe"]]),
  },
});

/** Linhas que já começam abertas: o mesário vai acrescentando mais com "Adicionar jogador". */
const LINHAS_INICIAIS = 5;

function CampoTime({
  id,
  valor,
  outra,
  onMudar,
}: {
  id: TimeId;
  valor: Time;
  outra: string;
  onMudar: (v: Time) => void;
}) {
  const n = montarJogadores(valor.jogadores, id).length;
  return (
    <Cartao cor={valor.cor} cor2="rgb(255 255 255 / 0.1)" miolo="p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="chanfro-oct grid h-8 w-8 place-items-center font-display text-lg" style={{ background: valor.cor, color: textoSobre(valor.cor) }}>
          {id}
        </span>
        <span className="font-display text-xl">Time {id}</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-display-reta text-[11px] text-muted-foreground">Nome</span>
          <input
            value={valor.nome}
            onChange={(e) => onMudar({ ...valor, nome: e.target.value })}
            placeholder={id === "A" ? "Engenharia" : "Direito"}
            className="chanfro chanfro-sm w-full min-w-0 bg-secondary px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-display-reta text-[11px] text-muted-foreground">Sigla</span>
          <input
            value={valor.sigla}
            maxLength={4}
            onChange={(e) => onMudar({ ...valor, sigla: e.target.value.toUpperCase() })}
            placeholder={(valor.nome || (id === "A" ? "ENG" : "DIR")).slice(0, 3).toUpperCase()}
            className="chanfro chanfro-sm w-full min-w-0 bg-secondary px-3 py-2.5 font-display text-lg uppercase outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      </div>
      <span className="mt-3 mb-1.5 block font-display-reta text-[11px] text-muted-foreground">Cor</span>
      <SeletorCor cor={valor.cor} outra={outra} onMudar={(cor) => onMudar({ ...valor, cor })} />
      <span className="mt-3 mb-1 block font-display-reta text-[11px] text-muted-foreground">
        Jogadores · número e nome · {n} cadastrado{n === 1 ? "" : "s"}
      </span>
      <ListaJogadores linhas={valor.jogadores} cor={valor.cor} onMudar={(jogadores) => onMudar({ ...valor, jogadores })} />
    </Cartao>
  );
}

/** Garante linhas suficientes para o mínimo da modalidade (vôlei: 6), sem apagar o que já foi digitado. */
const completarLinhas = (t: Time, minimo: number): Time =>
  t.jogadores.length >= minimo ? t : { ...t, jogadores: [...t.jogadores, ...Array.from({ length: minimo - t.jogadores.length }, () => novaLinha())] };

export function TelaConfig() {
  const [modalidade, setModalidade] = useState<Modalidade>(modalidadeSalva);
  const [nome, setNome] = useState("");
  const [a, setA] = useState<Time>(() => completarLinhas(VAZIO("#2e7dff"), REGRAS[modalidadeSalva()].minJogadores));
  const [b, setB] = useState<Time>(() => completarLinhas(VAZIO("#ff6a00"), REGRAS[modalidadeSalva()].minJogadores));
  const [erro, setErro] = useState("");
  const minimo = REGRAS[modalidade].minJogadores;

  const escolherModalidade = (m: Modalidade) => {
    setModalidade(m);
    setA((t) => completarLinhas(t, REGRAS[m].minJogadores));
    setB((t) => completarLinhas(t, REGRAS[m].minJogadores));
    setErro("");
  };

  const comecar = () => {
    if (!montarJogadores(a.jogadores, "A").length || !montarJogadores(b.jogadores, "B").length) {
      setErro("Cadastre pelo menos um jogador em cada time.");
      return;
    }
    for (const [t, sigla] of [[a, "A"], [b, "B"]] as const) {
      const n = montarJogadores(t.jogadores, sigla).length;
      if (n < minimo) {
        setErro(
          `No ${REGRAS[modalidade].nome.toLowerCase()}, cada time precisa de pelo menos ${minimo} jogadores (os ${minimo} da rotação). ` +
            `O time ${t.nome.trim() || sigla} tem ${n}.`,
        );
        return;
      }
    }
    for (const [t, sigla] of [[a, "A"], [b, "B"]] as const) {
      const preenchidas = t.jogadores.filter((l) => l.nome.trim() || l.numero);
      if (preenchidas.some((l) => !l.numero)) {
        setErro(`Escolha o número de cada jogador do time ${t.nome.trim() || sigla}.`);
        return;
      }
      if (repetidos(preenchidas.map((l) => l.numero)).size) {
        setErro(`Há número repetido no time ${t.nome.trim() || sigla}.`);
        return;
      }
    }
    if (a.cor === b.cor) {
      setErro("Escolha cores diferentes para os dois times.");
      return;
    }
    try {
      localStorage.setItem(ULTIMA, modalidade);
    } catch {
      /* só não lembra da próxima vez */
    }
    criarJogo(nome, a, b, modalidade);
    pedirAbertura();
  };

  return (
    <motion.div
      className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-10"
      initial="oculto"
      animate="visivel"
      variants={{ visivel: { transition: { staggerChildren: 0.07 } } }}
    >
      <FundoLados a={a.cor} b={b.cor} />
      <motion.header variants={{ oculto: { opacity: 0, y: -20 }, visivel: { opacity: 1, y: 0 } }} className="flex items-start justify-between gap-3 pt-2">
        <div>
          <p className="font-display-reta text-xs text-muted-foreground">{REGRAS[modalidade].nome} · Súmula + Highlights</p>
          <h1 className="mt-1 font-display text-5xl leading-[0.95]">
            Novo{" "}
            <Destaque de="esquerda" atraso={0.35}>
              jogo
            </Destaque>
          </h1>
        </div>
      </motion.header>

      <CartaoInstalar />

      <motion.div variants={{ oculto: { opacity: 0, y: 20 }, visivel: { opacity: 1, y: 0 } }}>
        <Cartao miolo="p-4">
          <span className="mb-2 block font-display-reta text-[11px] text-muted-foreground">Modalidade</span>
          <EscolhaModalidade valor={modalidade} corA={a.cor} corB={b.cor} onMudar={escolherModalidade} />
          <p className="mt-2 text-xs text-muted-foreground">{RESUMO[modalidade]}</p>
        </Cartao>
      </motion.div>

      <motion.div variants={{ oculto: { opacity: 0, y: 20 }, visivel: { opacity: 1, y: 0 } }}>
        <Cartao miolo="p-4">
          <label className="flex flex-col gap-1">
            <span className="font-display-reta text-[11px] text-muted-foreground">Nome do jogo</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Semifinal masculina — Engenharia x Direito"
              className="chanfro chanfro-sm w-full min-w-0 bg-secondary px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </Cartao>
      </motion.div>

      <motion.div variants={{ oculto: { opacity: 0, y: 20 }, visivel: { opacity: 1, y: 0 } }}>
        <Cartao miolo="p-4">
          <p className="mb-1 font-display-reta text-[11px] text-muted-foreground">Cores dos times a partir de uma imagem</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Mande a arte do jogo, uma logo ou um print de post: o app acha as cores principais e sugere a da esquerda (time A) e a da
            direita (time B).
          </p>
          <CoresDeUmaImagem
            siglas={[a.sigla || a.nome.slice(0, 3).toUpperCase() || "A", b.sigla || b.nome.slice(0, 3).toUpperCase() || "B"]}
            cores={[a.cor, b.cor]}
            onMudar={(lado, cor) => (lado === 0 ? setA((v) => ({ ...v, cor })) : setB((v) => ({ ...v, cor })))}
          />
        </Cartao>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        {(
          [
            ["A", a, setA],
            ["B", b, setB],
          ] as const
        ).map(([id, v, set]) => (
          <motion.div key={id} className="min-w-0" variants={{ oculto: { opacity: 0, y: 24 }, visivel: { opacity: 1, y: 0 } }}>
            <CampoTime id={id} valor={v} outra={id === "A" ? b.cor : a.cor} onMudar={set} />
          </motion.div>
        ))}
      </div>

      <motion.div variants={{ oculto: { opacity: 0 }, visivel: { opacity: 1 } }} className="flex flex-col gap-2">
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <Botao variante="cor" cor="var(--foreground)" className="h-14 w-full text-lg [--txt:var(--background)]" onClick={comecar}>
          <Flame className="h-5 w-5" /> Começar jogo
        </Botao>
        <button
          type="button"
          onClick={() => {
            setNome("Final — Engenharia x Direito");
            const ex = exemplo();
            setA(ex.A);
            setB(ex.B);
            setErro("");
          }}
          className="self-center text-xs text-muted-foreground underline underline-offset-4"
        >
          Preencher com um exemplo
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Com a câmera gravando, toque em <b className="text-foreground">Sincronizar</b> e mostre a tela para ela. Basta uma vez.
        </p>
      </motion.div>
    </motion.div>
  );
}
