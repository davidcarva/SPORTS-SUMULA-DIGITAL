import type { Evento, Jogo, LimitesPausa, TempoJogo, TipoFalta } from "./tipos";

export type Modalidade = "basquete" | "futsal" | "volei";
export const MODALIDADES: Modalidade[] = ["basquete", "futsal", "volei"];

/** Pedidos de tempo valem para uma faixa de períodos (no basquete, metade do jogo). */
export interface FaixaTempo {
  de: number;
  ate: number;
  limite: number;
  rotulo: string;
}

/** O que muda de uma modalidade para outra. As telas leem daqui e não supõem basquete. */
export interface Regras {
  id: Modalidade;
  nome: string;
  /** Botões de pontuar na linha do jogador. */
  valores: number[];
  rotuloValor: (v: number) => string;
  /** "cesta"/"cestas", "gol"/"gols", "ponto"/"pontos". */
  ponto: string;
  pontos: string;
  /** Abreviação ao lado do número: "12 pts", "2 gols". */
  abrev: (n: number) => string;
  semPonto: string;
  /** Períodos que sempre aparecem nas tabelas. */
  periodos: number;
  nomePeriodo: (p: number, curto: boolean) => string;
  /** "do 1º quarto", "da 1ª prorrogação". */
  doPeriodo: (p: number) => string;
  /** Legenda das cores dos períodos. */
  nomePeriodos: string;
  /** "quarto", "tempo", "set". */
  umPeriodo: string;
  /** Faltas e cartões que dá para dar a um jogador. A primeira é o botão rápido da linha. */
  faltas: TipoFalta[];
  /** Botão rápido na linha do jogador (null: só pela folha). */
  faltaRapida: TipoFalta | null;
  /** Faltas da equipe/banco, sem jogador. */
  faltasBanco: TipoFalta[];
  /** Faltas coletivas: a partir de `limite`, a próxima vira `penalidade`. */
  coletivas: { limite: number; penalidade: string; abrev: string; somaDesde: number } | null;
  contaColetiva: (e: Evento) => boolean;
  exclusao: (faltas: Evento[]) => string | null;
  tempos: (periodo: number) => FaixaTempo | null;
  /** Faixas para listar os pedidos de tempo na súmula impressa. */
  faixasTempo: number[];
  /** O intervalo que começa este período é o "do meio" (mais longo). 0: não há. */
  periodoDoMeio: number;
  limites: LimitesPausa;
  rotulosLimites: { intervalo: string; meio: string | null };
  /** Vence quem ganha mais sets (vôlei), e o placar grande mostra o set atual. */
  porSets: boolean;
  /** Jogadores cadastrados por time, no mínimo, para começar o jogo (vôlei: os 6 da rotação). */
  minJogadores: number;
  /** Quantos começam em quadra. */
  titulares: number;
  /** Relógio de cada período (null: sem relógio, como no vôlei) e as durações para escolher. */
  tempo: TempoJogo | null;
  opcoesTempo: number[];
}

const ord = (n: number) => `${n}º`;
const conta = (faltas: Evento[], k: TipoFalta) => faltas.filter((f) => f.falta === k).length;

const BASQUETE: Regras = {
  id: "basquete",
  nome: "Basquete",
  valores: [1, 2, 3],
  rotuloValor: (v) => `+${v}`,
  ponto: "cesta",
  pontos: "cestas",
  abrev: (n) => `${n} pts`,
  semPonto: "Lance sem ponto (toco, roubo, assistência…)",
  periodos: 4,
  nomePeriodo: (p, curto) => (p <= 4 ? (curto ? `${p}ºQ` : `${ord(p)} quarto`) : curto ? `PR${p - 4}` : `${p - 4}ª prorrogação`),
  doPeriodo: (p) => (p <= 4 ? `do ${ord(p)} quarto` : `da ${p - 4}ª prorrogação`),
  nomePeriodos: "Quartos",
  umPeriodo: "quarto",
  faltas: ["P", "T", "U", "D"],
  faltaRapida: "P",
  faltasBanco: ["T"],
  coletivas: { limite: 4, penalidade: "lance livre", abrev: "LL", somaDesde: 4 },
  contaColetiva: (e) => !!e.jogador,
  exclusao: (f) =>
    conta(f, "D") > 0 ? "Desqualificante" : conta(f, "T") + conta(f, "U") >= 2 ? "2 técnicas/antidesportivas" : f.length >= 5 ? "5 faltas" : null,
  tempos: (p) =>
    p <= 2
      ? { de: 1, ate: 2, limite: 2, rotulo: "1º tempo" }
      : p <= 4
        ? { de: 3, ate: 4, limite: 3, rotulo: "2º tempo" }
        : { de: p, ate: p, limite: 1, rotulo: `${p - 4}ª prorrogação` },
  faixasTempo: [1, 3],
  periodoDoMeio: 3,
  limites: { tempo: 60, intervalo: 120, meio: 600, outras: 180 },
  rotulosLimites: { intervalo: "Intervalo entre quartos (min)", meio: "Intervalo do meio (min)" },
  porSets: false,
  minJogadores: 1,
  titulares: 5,
  tempo: { periodo: 10, prorrogacao: 5 },
  opcoesTempo: [5, 8, 10, 12],
};

/** Futsal (regra FIFA): 2 tempos, 5 faltas acumuladas por tempo, 1 pedido de tempo por tempo. */
const FUTSAL: Regras = {
  id: "futsal",
  nome: "Futsal",
  valores: [1],
  rotuloValor: () => "Gol",
  ponto: "gol",
  pontos: "gols",
  abrev: (n) => `${n} ${n === 1 ? "gol" : "gols"}`,
  semPonto: "Lance sem gol (defesa, chute, assistência…)",
  periodos: 2,
  nomePeriodo: (p, curto) => (p <= 2 ? (curto ? `${p}ºT` : `${ord(p)} tempo`) : curto ? `PR${p - 2}` : `${p - 2}ª prorrogação`),
  doPeriodo: (p) => (p <= 2 ? `do ${ord(p)} tempo` : `da ${p - 2}ª prorrogação`),
  nomePeriodos: "Tempos",
  umPeriodo: "tempo",
  faltas: ["F", "A", "V"],
  faltaRapida: "F",
  faltasBanco: ["A", "V"],
  // As faltas da prorrogação somam com as do 2º tempo.
  coletivas: { limite: 5, penalidade: "tiro livre", abrev: "TL", somaDesde: 2 },
  contaColetiva: (e) => !!e.jogador && e.falta === "F",
  exclusao: (f) => (conta(f, "V") > 0 ? "Cartão vermelho" : conta(f, "A") >= 2 ? "2 amarelos" : null),
  tempos: (p) => (p <= 2 ? { de: p, ate: p, limite: 1, rotulo: `${ord(p)} tempo` } : null),
  faixasTempo: [1, 2],
  periodoDoMeio: 2,
  limites: { tempo: 60, intervalo: 120, meio: 600, outras: 180 },
  rotulosLimites: { intervalo: "Intervalo da prorrogação (min)", meio: "Intervalo do meio (min)" },
  porSets: false,
  minJogadores: 1,
  titulares: 5,
  tempo: { periodo: 20, prorrogacao: 5 },
  opcoesTempo: [10, 15, 20, 25],
};

/** Vôlei: sets sem relógio, 2 pedidos de tempo por set, só cartões. */
const VOLEI: Regras = {
  id: "volei",
  nome: "Vôlei",
  valores: [1],
  rotuloValor: () => "Ponto",
  ponto: "ponto",
  pontos: "pontos",
  abrev: (n) => `${n} pts`,
  semPonto: "Lance sem ponto (defesa, levantamento, bloqueio…)",
  periodos: 3,
  nomePeriodo: (p, curto) => (curto ? `S${p}` : `${ord(p)} set`),
  doPeriodo: (p) => `do ${ord(p)} set`,
  nomePeriodos: "Sets",
  umPeriodo: "set",
  faltas: ["A", "V"],
  faltaRapida: null,
  faltasBanco: ["A", "V"],
  coletivas: null,
  contaColetiva: () => false,
  exclusao: () => null,
  tempos: (p) => ({ de: p, ate: p, limite: 2, rotulo: `${ord(p)} set` }),
  faixasTempo: [],
  periodoDoMeio: 0,
  limites: { tempo: 30, intervalo: 180, meio: 180, outras: 180 },
  rotulosLimites: { intervalo: "Intervalo entre sets (min)", meio: null },
  porSets: true,
  minJogadores: 6,
  titulares: 6,
  tempo: null,
  opcoesTempo: [],
};

export const REGRAS: Record<Modalidade, Regras> = { basquete: BASQUETE, futsal: FUTSAL, volei: VOLEI };

export function regras(jogo: Pick<Jogo, "jogo">): Regras {
  return REGRAS[jogo.jogo.modalidade] ?? BASQUETE;
}
