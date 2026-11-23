import type { Modalidade } from "./regras";

/**
 * Hub de jogos: lê do Firestore (coleção "jogos", só leitura pública) os jogos que o programa do PC
 * publicou, com o id no Google Drive do clipe de cada lance. Os vídeos tocam pelo player do Drive.
 */

export const PROJETO = "sumula-digital-4b570";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents`;

export interface TimeHub {
  nome: string;
  sigla: string;
  cor: string;
}

export interface LanceHub {
  id: string;
  /** "+3", "Gol", "Ponto", "Lance" */
  oque: string;
  valor: number;
  periodo: string;
  p: number;
  hora: string;
  t: number;
  /** id no Drive do clipe vertical (com a tarja) e do original; null enquanto não subiu */
  v: string | null;
  o: string | null;
}

export interface JogadorHub {
  id: string;
  time: "A" | "B";
  numero: string;
  nome: string;
  pontos: number;
  lances: LanceHub[];
}

export type EstadoHub = "aguardando_video" | "cortando" | "pronto" | "erro";

export interface ResumoHub {
  id: string;
  nome: string;
  modalidade: Modalidade;
  campeonato: string;
  local: string;
  inicio: number;
  fim: number;
  fuso: number;
  estado: EstadoHub;
  times: { A: TimeHub; B: TimeHub };
  placar: { A: number; B: number };
  sets: { A: number; B: number } | null;
  lances: number;
  clipes: number;
}

export interface JogoHub extends ResumoHub {
  jogadores: JogadorHub[];
  atualizado: number;
}

// ------------------------------------------------------------------ leitura

/** Em desenvolvimento, dá para testar sem Firestore: sessionStorage "hub-demo" com uma lista de jogos. */
function demo(): JogoHub[] | null {
  if (!import.meta.env.DEV) return null;
  try {
    const s = sessionStorage.getItem("hub-demo");
    return s ? (JSON.parse(s) as JogoHub[]) : null;
  } catch {
    return null;
  }
}

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) {
    let msg = `${r.status}`;
    try {
      msg = (await r.json())?.error?.message ?? msg;
    } catch {
      /* sem corpo */
    }
    throw new Error(msg);
  }
  return (await r.json()) as T;
}

interface DocFirestore {
  name: string;
  fields?: Record<string, { stringValue?: string; integerValue?: string }>;
}

/** Os jogos mais recentes primeiro. */
export async function listarJogos(limite = 300): Promise<ResumoHub[]> {
  const d = demo();
  if (d) return d.map(({ jogadores: _j, atualizado: _a, ...r }) => r);
  const resp = await pedir<{ document?: DocFirestore }[]>(`${BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "jogos" }],
        select: { fields: [{ fieldPath: "resumo" }, { fieldPath: "inicio" }] },
        orderBy: [{ field: { fieldPath: "inicio" }, direction: "DESCENDING" }],
        limit: limite,
      },
    }),
  });
  return resp.flatMap((x) => {
    const s = x.document?.fields?.resumo?.stringValue;
    if (!s) return [];
    try {
      return [JSON.parse(s) as ResumoHub];
    } catch {
      return [];
    }
  });
}

export async function abrirJogo(id: string): Promise<JogoHub> {
  const d = demo();
  if (d) {
    const j = d.find((x) => x.id === id);
    if (!j) throw new Error("Jogo não encontrado.");
    return j;
  }
  const doc = await pedir<DocFirestore>(`${BASE}/jogos/${encodeURIComponent(id)}?mask.fieldPaths=dados`);
  const s = doc.fields?.dados?.stringValue;
  if (!s) throw new Error("Jogo não encontrado.");
  return JSON.parse(s) as JogoHub;
}

// ------------------------------------------------------------------ pastas por dia e horário

export interface Pasta {
  chave: string;
  /** "Quarta, 19 nov" */
  dia: string;
  /** "19h – 22h" */
  horario: string;
  jogos: ResumoHub[];
}

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** Jogos do mesmo dia com menos de 3 h de intervalo entram na mesma pasta (a mesma rodada). */
const INTERVALO_MAX = 3 * 3600_000;

const hora = (ms: number) => new Date(ms).getHours();

export function agruparPorPeriodo(jogos: ResumoHub[]): Pasta[] {
  const ordem = [...jogos].sort((a, b) => a.inicio - b.inicio);
  const grupos: ResumoHub[][] = [];
  for (const j of ordem) {
    const g = grupos[grupos.length - 1];
    const ultimo = g?.[g.length - 1];
    const mesmoDia = ultimo && new Date(ultimo.inicio).toDateString() === new Date(j.inicio).toDateString();
    if (g && mesmoDia && j.inicio - Math.max(...g.map((x) => x.fim)) < INTERVALO_MAX) g.push(j);
    else grupos.push([j]);
  }
  return grupos
    .map((g) => {
      const d = new Date(g[0].inicio);
      const ini = hora(Math.min(...g.map((x) => x.inicio)));
      const fimMs = Math.max(...g.map((x) => x.fim));
      const fim = hora(fimMs) + (new Date(fimMs).getMinutes() > 0 ? 1 : 0);
      return {
        chave: `${d.toDateString()}-${ini}`,
        dia: `${DIAS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`,
        horario: fim > ini ? `${ini}h – ${fim}h` : `${ini}h`,
        jogos: g.sort((a, b) => b.inicio - a.inicio),
      };
    })
    .reverse();
}

// ------------------------------------------------------------------ Drive e links

export const videoDrive = (id: string) => `https://drive.google.com/file/d/${id}/preview`;
export const abrirNoDrive = (id: string) => `https://drive.google.com/file/d/${id}/view`;
export const baixarDoDrive = (id: string) => `https://drive.google.com/uc?export=download&id=${id}`;

export const rotuloPontos = (m: Modalidade, n: number) =>
  m === "futsal" ? `${n} gol${n === 1 ? "" : "s"}` : `${n} ponto${n === 1 ? "" : "s"}`;

export function linkJogo(id: string, jogador?: string): string {
  const url = new URL(`/hub/${encodeURIComponent(id)}`, location.origin);
  if (jogador) url.searchParams.set("j", jogador);
  return url.toString();
}

/** Compartilha pelo celular (WhatsApp, etc.); no computador, copia o link. Devolve o que fez. */
export async function compartilharLink(url: string, titulo: string): Promise<"compartilhado" | "copiado" | "cancelado"> {
  if (navigator.share) {
    try {
      await navigator.share({ title: titulo, url });
      return "compartilhado";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelado";
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copiado";
  } catch {
    return "cancelado";
  }
}
