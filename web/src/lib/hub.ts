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
  /** Só quando mais de uma câmera filmou o lance: o clipe de cada uma (c = número da câmera). */
  a?: AnguloHub[];
}

export interface AnguloHub {
  c: number;
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

/** O que o PC confirmou de uma câmera ao ler os vídeos. */
export interface CameraHub {
  c: number;
  /** "qr" (o certo), "criacao" (sem QR: pelo horário da câmera, ±2 s) ou "ancora" */
  metodo: string;
  /** ± ms no pior trecho */
  precisao: number;
  videos: number;
  lances: number;
  /** clipes desta câmera que já estão no Drive (os que tocam no hub) */
  no_drive: number;
}

export interface JogoHub extends ResumoHub {
  jogadores: JogadorHub[];
  atualizado: number;
  /** Conferência do PC (jogos publicados antes dela não têm). */
  cameras?: CameraHub[];
  /** Lances que viraram clipe em pelo menos uma câmera. */
  cortados?: number;
  /** Vídeos deixados de lado por terem o QR de outro jogo. */
  ignorados?: number;
  /** Motivo, quando não deu para cortar. */
  mensagem?: string;
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
    throw Object.assign(new Error(msg), { status: r.status });
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

/** Como abrirJogo, mas devolve null se o PC ainda não publicou este jogo. */
export async function buscarJogo(id: string): Promise<JogoHub | null> {
  try {
    return await abrirJogo(id);
  } catch (e) {
    if ((e as { status?: number }).status === 404 || (e as Error).message === "Jogo não encontrado.") return null;
    throw e;
  }
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
/**
 * Chave pública da API do Drive (chave de navegador, restrita a este site e só à Drive API; não é
 * senha). Fica em web/.env.local (VITE_CHAVE_DRIVE=...), fora do git. Com ela, o clipe toca no
 * nosso reprodutor; sem ela, no player do Drive.
 *
 * Por que precisa: o endereço de download do Drive recusa pedidos de vídeo feitos de dentro de
 * outro site (Sec-Fetch-Site: cross-site → 403). A API do Drive aceita, com uma chave.
 */
const CHAVE_DRIVE: string = import.meta.env.VITE_CHAVE_DRIVE ?? "";

/** O arquivo do clipe em si, para o <video> (em pedaços, dá para avançar). null sem a chave. */
export const arquivoDrive = (id: string): string | null =>
  CHAVE_DRIVE ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&key=${CHAVE_DRIVE}` : null;
/** Miniatura do vídeo, para mostrar antes de tocar. */
export const capaDrive = (id: string, largura = 720) => `https://drive.google.com/thumbnail?id=${id}&sz=w${largura}`;

function salvar(href: string, nome?: string) {
  const a = document.createElement("a");
  a.href = href;
  if (nome) a.download = nome;
  else a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Baixa o clipe com um nome que faz sentido ("Davi - +3 - 1ºQ - vertical.mp4"). Sem a chave (ou se
 * a API recusar), vai pelo link de download do Drive, que funciona como navegação.
 */
export async function baixarClipe(id: string, nome: string): Promise<void> {
  const arquivo = arquivoDrive(id);
  if (arquivo) {
    try {
      const r = await fetch(arquivo);
      if (!r.ok) throw new Error(String(r.status));
      const url = URL.createObjectURL(await r.blob());
      salvar(url, nome.replace(/[\\/:*?"<>|]+/g, "").trim() || "lance.mp4");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    } catch {
      /* cai no download do Drive */
    }
  }
  salvar(baixarDoDrive(id));
}

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
