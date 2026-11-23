import type { Modalidade } from "./regras";
import { useSyncExternalStore } from "react";
import { ativos, pausaAberta, periodoAtual } from "./estatisticas";
import { novoId } from "./tempo";
import { type Evento, FORMATO, type TipoEvento, type InfoPartida, type Jogador, type Jogo, LIMITES_PADRAO, type LimitesPausa, type MotivoPausa, type Time, type TimeId, VERSAO_APP } from "./tipos";

const CHAVE = "sumula-digital:v2:jogo";
const CHAVE_COPIA = "sumula-digital:v2:copia";

interface Estado {
  jogo: Jogo | null;
  /** Falhou ao salvar no aparelho (modo anônimo, armazenamento cheio…). */
  erroSalvar: boolean;
}

function carregar(): Estado {
  for (const chave of [CHAVE, CHAVE_COPIA]) {
    try {
      const s = localStorage.getItem(chave);
      if (!s) continue;
      const j = JSON.parse(s) as Jogo;
      if (j?.formato === FORMATO) return { jogo: j, erroSalvar: false };
    } catch {
      /* tenta a cópia */
    }
  }
  return { jogo: null, erroSalvar: false };
}

let estado: Estado = carregar();
const ouvintes = new Set<() => void>();

function salvar(jogo: Jogo | null): boolean {
  try {
    if (jogo) {
      const s = JSON.stringify(jogo);
      // Duas cópias: se uma escrita for interrompida (bateria, app fechado), a outra sobra.
      localStorage.setItem(CHAVE_COPIA, localStorage.getItem(CHAVE) ?? s);
      localStorage.setItem(CHAVE, s);
    } else {
      localStorage.removeItem(CHAVE);
      localStorage.removeItem(CHAVE_COPIA);
    }
    return true;
  } catch {
    return false;
  }
}

function definir(jogo: Jogo | null) {
  const ok = salvar(jogo);
  estado = { jogo, erroSalvar: !ok };
  for (const f of ouvintes) f();
}

function assinar(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

export function useEstado(): Estado {
  return useSyncExternalStore(assinar, () => estado);
}

export function jogoAtual(): Jogo | null {
  return estado.jogo;
}

// ------------------------------------------------------------- ações

/** Linha do cadastro: número da camisa (1 a 99) e nome. Linhas vazias são ignoradas. */
export interface CadastroJogador {
  numero: string;
  nome: string;
}

export interface ConfigTime {
  nome: string;
  sigla: string;
  cor: string;
  jogadores: CadastroJogador[];
}

/** Transforma as linhas do cadastro em jogadores. O id sai do número, como na súmula. */
export function montarJogadores(lista: CadastroJogador[], time: TimeId): Jogador[] {
  const usados = new Set<string>();
  return lista
    .map((l) => ({ numero: l.numero.trim(), nome: l.nome.trim() }))
    .filter((l) => l.numero || l.nome)
    .map((l, i) => {
      const nome = l.nome || (l.numero ? `Camisa ${l.numero}` : `Jogador ${i + 1}`);
      let id = `${time}${l.numero || `x${i + 1}`}`;
      while (usados.has(id)) id += "b";
      usados.add(id);
      return { id, numero: l.numero, nome };
    });
}

/** Lê "4 Matheus" por linha (formato antigo do cadastro; ainda usado nos testes). */
export function lerJogadores(texto: string, time: TimeId): Jogador[] {
  const lista = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = /^#?(\d{1,3})\s*[-–.:]?\s*(.*)$/.exec(l);
      return { numero: m ? m[1] : "", nome: (m ? m[2] : l).trim() };
    });
  return montarJogadores(lista, time);
}

const tresLetras = (nome: string) => nome.replace(/\s+/g, "").slice(0, 3).toUpperCase();
const iniciais = (nome: string) =>
  nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (/^\d+$/.test(w) ? w : w[0]))
    .join("")
    .toUpperCase()
    .slice(0, 4);

/**
 * As siglas que o jogo vai usar. Sem sigla digitada, vale o começo do nome (Engenharia → ENG). Se os
 * dois começos forem iguais ("Time 1" e "Time 2" dariam TIM x TIM), a sigla automática vira as
 * iniciais com o número (T1 x T2) ou, sem como diferenciar, ganha a letra do time (TIMA x TIMB).
 */
export function siglasDosTimes(a: Pick<ConfigTime, "nome" | "sigla">, b: Pick<ConfigTime, "nome" | "sigla">): [string, string] {
  const digitada = (c: Pick<ConfigTime, "sigla">) => c.sigla.trim().toUpperCase().slice(0, 4);
  const auto = (c: Pick<ConfigTime, "nome">, id: TimeId) => tresLetras(c.nome) || id;
  let sa = digitada(a) || auto(a, "A");
  let sb = digitada(b) || auto(b, "B");
  if (sa === sb) {
    const ia = iniciais(a.nome);
    const ib = iniciais(b.nome);
    const separa = ia.length >= 2 && ib.length >= 2 && ia !== ib;
    if (!digitada(a)) sa = separa ? ia : `${sa.slice(0, 3)}A`;
    if (!digitada(b)) sb = separa ? ib : `${sb.slice(0, 3)}B`;
  }
  return [sa, sb];
}

export function criarJogo(nome: string, a: ConfigTime, b: ConfigTime, modalidade: Modalidade = "basquete"): Jogo {
  const siglas = siglasDosTimes(a, b);
  const time = (c: ConfigTime, id: TimeId): Time => ({
    nome: c.nome.trim() || `Time ${id}`,
    sigla: siglas[id === "A" ? 0 : 1],
    cor: c.cor,
    jogadores: montarJogadores(c.jogadores, id),
  });
  const A = time(a, "A");
  const B = time(b, "B");
  const jogo: Jogo = {
    formato: FORMATO,
    jogo: {
      id: novoId(6),
      nome: nome.trim() || `${A.nome} x ${B.nome}`,
      modalidade,
      criado_em: Date.now(),
      fuso_minutos: -new Date().getTimezoneOffset(),
      app: VERSAO_APP,
    },
    times: { A, B },
    eventos: [],
  };
  definir(jogo);
  return jogo;
}

type NovoEvento = Pick<Evento, "tipo" | "t"> & Partial<Omit<Evento, "id">>;

/** O que só acontece com a bola rolando: se o mesário esqueceu o "Início do jogo", o jogo começa aqui. */
const COMECAM_O_JOGO = new Set<TipoEvento>(["ponto", "lance", "falta", "pausa", "periodo"]);

export function registrar(ev: NovoEvento): Evento | null {
  const jogo = estado.jogo;
  if (!jogo) return null;
  const anteriores = [...jogo.eventos];
  if (COMECAM_O_JOGO.has(ev.tipo) && !jogo.jogo.encerrado_em && !ativos(jogo).some((x) => x.tipo === "inicio")) {
    // Sem o início, "Fim do quarto" e "Parar" não têm de onde contar e tudo ficaria no 1º período.
    anteriores.push({
      id: novoId(8),
      tipo: "inicio",
      t: ev.t - 1,
      t_confirmado: Date.now(),
      time: null,
      jogador: null,
      valor: 0,
      removido: false,
      periodo: 1,
      automatico: true,
    });
  }
  const e: Evento = {
    id: novoId(8),
    time: null,
    jogador: null,
    valor: 0,
    removido: false,
    periodo: periodoAtual(jogo),
    t_confirmado: Date.now(),
    ...ev,
  };
  definir({ ...jogo, eventos: [...anteriores, e] });
  return e;
}

export function alterarEvento(id: string, mudanca: Partial<Evento>) {
  const jogo = estado.jogo;
  if (!jogo) return;
  definir({ ...jogo, eventos: jogo.eventos.map((e) => (e.id === id ? { ...e, ...mudanca } : e)) });
}

export function infoPadrao(jogo: Jogo): InfoPartida {
  const d = new Date(jogo.jogo.criado_em);
  const p = (x: number) => String(x).padStart(2, "0");
  return {
    campeonato: "",
    data: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    horario: `${p(d.getHours())}:${p(d.getMinutes())}`,
    local: "",
    arbitros: "",
    anotador: "",
    ...jogo.jogo.info,
  };
}

export function alterarInfo(mudanca: Partial<InfoPartida>) {
  const jogo = estado.jogo;
  if (!jogo) return;
  definir({ ...jogo, jogo: { ...jogo.jogo, info: { ...infoPadrao(jogo), ...mudanca } } });
}

/** Troca o elenco de um time no meio do jogo (atrasado que chegou, número errado). */
export function alterarJogadores(time: TimeId, jogadores: Jogador[]) {
  const jogo = estado.jogo;
  if (!jogo) return;
  definir({ ...jogo, times: { ...jogo.times, [time]: { ...jogo.times[time], jogadores } } });
}

export function alterarCorTime(time: TimeId, cor: string) {
  const jogo = estado.jogo;
  if (!jogo) return;
  definir({ ...jogo, times: { ...jogo.times, [time]: { ...jogo.times[time], cor } } });
}

export function novoJogadorId(jogo: Jogo, time: TimeId): string {
  const usados = new Set(jogo.times[time].jogadores.map((j) => j.id));
  let id = `${time}n${novoId(4)}`;
  while (usados.has(id)) id = `${time}n${novoId(4)}`;
  return id;
}

/** Para o jogo. Se já havia uma parada aberta, ela termina onde a nova começa. */
export function pausar(motivo: MotivoPausa, t: number, time: TimeId | null = null): Evento | null {
  const jogo = estado.jogo;
  if (!jogo) return null;
  const aberta = pausaAberta(jogo);
  if (aberta) alterarEvento(aberta.id, { t_fim: Math.max(aberta.t, t) });
  return registrar({ tipo: "pausa", motivo, t, time });
}

/** O jogo voltou. Devolve a parada encerrada. */
export function retomar(t = Date.now()): Evento | null {
  const jogo = estado.jogo;
  if (!jogo) return null;
  const aberta = pausaAberta(jogo);
  if (!aberta) return null;
  const fim = Math.max(aberta.t, t);
  alterarEvento(aberta.id, { t_fim: fim });
  return { ...aberta, t_fim: fim };
}

export function alterarLimites(mudanca: Partial<LimitesPausa>) {
  const jogo = estado.jogo;
  if (!jogo) return;
  definir({ ...jogo, jogo: { ...jogo.jogo, limites: { ...LIMITES_PADRAO, ...jogo.jogo.limites, ...mudanca } } });
}

export function encerrarJogo() {
  const jogo = estado.jogo;
  if (!jogo) return;
  retomar();
  registrar({ tipo: "fim", t: Date.now() });
  const atual = estado.jogo as Jogo;
  definir({ ...atual, jogo: { ...atual.jogo, encerrado_em: Date.now() } });
}

export function apagarJogo() {
  definir(null);
}

const CHAVE_ARQUIVO = "sumula-digital:v2:arquivo";
/** Quantos jogos encerrados ficam guardados no aparelho depois de sair deles. */
const MAX_ARQUIVO = 30;

/** Jogos que já saíram da tela, do mais novo para o mais antigo. */
export function jogosArquivados(): Jogo[] {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE_ARQUIVO) ?? "[]") as Jogo[];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

/**
 * Sai da partida: guarda uma cópia do jogo no arquivo do aparelho e volta para "Novo jogo".
 * A cópia é a garantia de que a súmula não se perde se ainda não tiver ido para o Drive.
 */
export function sairDoJogo(): boolean {
  const jogo = estado.jogo;
  if (!jogo) return true;
  try {
    const lista = jogosArquivados().filter((j) => j.jogo.id !== jogo.jogo.id);
    localStorage.setItem(CHAVE_ARQUIVO, JSON.stringify([jogo, ...lista].slice(0, MAX_ARQUIVO)));
  } catch {
    return false;
  }
  definir(null);
  return true;
}
