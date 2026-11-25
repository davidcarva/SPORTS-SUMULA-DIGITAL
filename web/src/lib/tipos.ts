import type { Modalidade } from "./regras";

// Formato do arquivo exportado. O cortar.py aceita este e o anterior (/1).
export const FORMATO = "sumula-highlights/2" as const;
export const VERSAO_APP = "2.1.0";

export type TimeId = "A" | "B";
export const TIMES: TimeId[] = ["A", "B"];

export interface Jogador {
  id: string;
  numero: string;
  nome: string;
}

export interface Time {
  nome: string;
  sigla: string;
  cor: string;
  jogadores: Jogador[];
}

export type TipoEvento = "ponto" | "lance" | "falta" | "pausa" | "inicio" | "periodo" | "sync" | "fim";

/**
 * Basquete (FIBA): pessoal, técnica, antidesportiva, desqualificante.
 * Futsal: falta (conta na coletiva). Futsal e vôlei: cartão amarelo e vermelho.
 */
export type TipoFalta = "P" | "T" | "U" | "D" | "F" | "A" | "V";
export const NOMES_FALTA: Record<TipoFalta, string> = {
  P: "Pessoal",
  T: "Técnica",
  U: "Antidesportiva",
  D: "Desqualificante",
  F: "Falta",
  A: "Cartão amarelo",
  V: "Cartão vermelho",
};
/** Faltas comuns ficam em tinta; as graves e os cartões vermelhos, em vermelho. O amarelo é amarelo. */
export const corFalta = (f: TipoFalta | undefined): "comum" | "amarelo" | "grave" =>
  f === "P" || f === "F" ? "comum" : f === "A" ? "amarelo" : "grave";
/** Por que o jogo parou. */
export type MotivoPausa = "tempo" | "lesao" | "falta" | "arbitragem" | "intervalo" | "outro";
export const MOTIVOS_PAUSA: Record<MotivoPausa, string> = {
  tempo: "Pedido de tempo",
  lesao: "Lesão",
  falta: "Falta grave / confusão",
  arbitragem: "Arbitragem / conversa",
  intervalo: "Intervalo",
  outro: "Outro",
};

/** Duração esperada de cada parada, em segundos (dá para mudar na aba Súmula). */
export interface LimitesPausa {
  tempo: number;
  intervalo: number;
  meio: number;
  outras: number;
}
export const LIMITES_PADRAO: LimitesPausa = { tempo: 60, intervalo: 120, meio: 600, outras: 180 };

export interface Evento {
  id: string;
  tipo: TipoEvento;
  /** Horário (ms, relógio deste aparelho) do PRIMEIRO toque do mesário. É ele que vira o clipe. */
  t: number;
  /** Horário em que o lance foi confirmado. A diferença mostra quanto o mesário levou para escolher. */
  t_confirmado: number;
  time: TimeId | null;
  jogador: string | null;
  /** Pontos (1, 2 ou 3) para "ponto"; 0 nos demais. */
  valor: number;
  /** Só em "falta". */
  falta?: TipoFalta;
  /** Só em "pausa". O fim fica em t_fim; sem t_fim, o jogo ainda está parado. */
  motivo?: MotivoPausa;
  periodo: number;
  removido: boolean;
  /** Em "sync": quando a tela do QR foi fechada. Em "pausa": quando o jogo voltou. */
  t_fim?: number;
  /** Onde foi o primeiro toque: no jogador ou no botão "marcar" do time. */
  origem?: "jogador" | "time";
  /** Edições feitas depois (troca de atleta ou de valor). */
  editado_em?: number;
  /** Só em "inicio": o mesário não tocou em "Início do jogo" e o jogo começou sozinho no primeiro lance. */
  automatico?: boolean;
  /** Só em "sync": as câmeras que filmaram o QR nesta abertura da tela (o QR leva o número). */
  cameras?: number[];
}

/** Cabeçalho da súmula (sai no PDF e no story). */
export interface InfoPartida {
  campeonato: string;
  data: string;
  horario: string;
  local: string;
  arbitros: string;
  anotador: string;
}

export interface Jogo {
  formato: typeof FORMATO;
  jogo: {
    id: string;
    nome: string;
    modalidade: Modalidade;
    criado_em: number;
    fuso_minutos: number;
    app: string;
    encerrado_em?: number;
    info?: InfoPartida;
    limites?: LimitesPausa;
  };
  times: Record<TimeId, Time>;
  eventos: Evento[];
}

export const CORES_TIME = [
  { nome: "Azul elétrico", cor: "#2e7dff" },
  { nome: "Laranja", cor: "#ff6a00" },
  { nome: "Rosa neon", cor: "#ff2e88" },
  { nome: "Roxo", cor: "#8b5cf6" },
  { nome: "Ciano", cor: "#00d8ff" },
  { nome: "Verde lima", cor: "#39e75f" },
  { nome: "Amarelo", cor: "#ffd400" },
  { nome: "Vermelho", cor: "#ff3b3b" },
] as const;

/** Cor de cada período nas casas da súmula (5 em diante: mesma cor). */
export const CORES_QUARTO: Record<number, string> = {
  1: "#00b8e6",
  2: "#8b5cf6",
  3: "#ff6a00",
  4: "#ff2e88",
  5: "#c8ff1a",
};
export const corQuarto = (p: number) => CORES_QUARTO[Math.min(Math.max(p, 1), 5)];
