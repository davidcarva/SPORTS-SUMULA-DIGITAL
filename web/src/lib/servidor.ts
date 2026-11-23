import type { Jogo } from "./tipos";

const CHAVE_LS = "sumula-digital:chave";
const MODO_LS = "sumula-digital:modo";

/**
 * O app aberto pelo próprio PC (servidor.py) manda a súmula direto para ele. Aberto pelo site,
 * não há servidor: a súmula vai pelo Google Drive. Uma vez encontrado, o servidor fica lembrado,
 * para o Encerrar sem internet no ginásio não mudar de caminho.
 */
export function usaServidor(): boolean {
  try {
    return localStorage.getItem(MODO_LS) === "servidor";
  } catch {
    return false;
  }
}

export async function detectarServidor() {
  try {
    const r = await fetch("/api/servidor", { cache: "no-store" });
    if (r.ok && r.headers.get("content-type")?.includes("json")) localStorage.setItem(MODO_LS, "servidor");
  } catch {
    /* sem resposta: segue pelo Drive */
  }
}

export type EstadoCorte = "procurando" | "sem_servidor" | "sem_chave" | "aguardando_video" | "cortando" | "pronto" | "erro";

export interface StatusCorte {
  estado: EstadoCorte;
  confronto?: string;
  mensagem?: string;
  feitos?: number;
  total?: number;
  clipes?: number;
  url?: string;
}

function lerChave(): string {
  try {
    return localStorage.getItem(CHAVE_LS) ?? "";
  } catch {
    return "";
  }
}

export function guardarChave(chave: string) {
  try {
    localStorage.setItem(CHAVE_LS, chave.trim().toUpperCase());
  } catch {
    /* sem armazenamento: o app pede o código de novo */
  }
}

/** O link de instalação traz o código do servidor. Guarda e tira do endereço. */
export function guardarChaveDoLink() {
  const chave = new URLSearchParams(location.search).get("chave");
  if (!chave) return;
  guardarChave(chave);
  history.replaceState(null, "", location.pathname);
}

const chamar = (caminho: string, init?: RequestInit) =>
  fetch(`/api/${caminho}`, { ...init, headers: { ...init?.headers, "X-Chave": lerChave() } });

/** Pedido feito no toque em Encerrar: o celular só aceita a pergunta logo depois de um toque. */
export function pedirPermissaoDeAviso() {
  if ("Notification" in window && "PushManager" in window && Notification.permission === "default") {
    void Notification.requestPermission().catch(() => {});
  }
}

function base64ParaBytes(b64: string) {
  const bruto = atob(b64.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(b64.length / 4) * 4, "="));
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
}

let inscritoEm = "";

/** Inscreve este celular para receber o aviso do jogo. Não trava o acompanhamento se falhar. */
async function inscrever(id: string) {
  if (inscritoEm === id || !("PushManager" in window) || Notification.permission !== "granted") return;
  inscritoEm = id;
  try {
    const { vapid } = (await fetch("/api/servidor").then((r) => r.json())) as { vapid: string };
    const reg = await navigator.serviceWorker.ready;
    const inscricao =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ParaBytes(vapid) }));
    const r = await chamar(`jogos/${id}/notificar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inscricao),
    });
    if (!r.ok) inscritoEm = "";
  } catch {
    inscritoEm = "";
  }
}

let ultimoEnvio = "";

/** Manda a súmula se ela mudou (primeira vez, reenvio sem internet, correção) e devolve o andamento. */
export async function acompanhar(jogo: Jogo): Promise<StatusCorte> {
  const id = jogo.jogo.id;
  const corpo = JSON.stringify(jogo);
  const enviar = corpo !== ultimoEnvio;
  try {
    const r = enviar
      ? await chamar("jogos", { method: "POST", headers: { "Content-Type": "application/json" }, body: corpo })
      : await chamar(`jogos/${id}`);
    if (r.status === 401) return { estado: "sem_chave" };
    if (!r.ok || !r.headers.get("content-type")?.includes("json")) {
      ultimoEnvio = "";
      return { estado: "sem_servidor" };
    }
    if (enviar) ultimoEnvio = corpo;
    void inscrever(id);
    return (await r.json()) as StatusCorte;
  } catch {
    ultimoEnvio = "";
    return { estado: "sem_servidor" };
  }
}
