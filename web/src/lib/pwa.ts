import { useSyncExternalStore } from "react";
import { registerSW } from "virtual:pwa-register";

/** Evento do Chrome/Android que permite abrir a janela de instalação por um botão nosso. */
interface PedidoInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface EstadoPWA {
  atualizacao: boolean;
  podeInstalar: boolean;
}

let estado: EstadoPWA = { atualizacao: false, podeInstalar: false };
let pedido: PedidoInstalacao | null = null;
let aplicar: ((recarregar?: boolean) => Promise<void>) | null = null;
const ouvintes = new Set<() => void>();

function mudar(parcial: Partial<EstadoPWA>) {
  estado = { ...estado, ...parcial };
  ouvintes.forEach((o) => o());
}

function assinar(o: () => void) {
  ouvintes.add(o);
  return () => ouvintes.delete(o);
}

export const usePWA = () => useSyncExternalStore(assinar, () => estado);

export const instalado = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const ehIPhone = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export async function instalar() {
  if (!pedido) return;
  await pedido.prompt();
  await pedido.userChoice;
  pedido = null;
  mudar({ podeInstalar: false });
}

export const atualizar = () => aplicar?.(true);

export function iniciarPWA() {
  aplicar = registerSW({ onNeedRefresh: () => mudar({ atualizacao: true }) });
  // Pede ao sistema para não apagar as súmulas quando faltar espaço no aparelho.
  navigator.storage?.persist?.().catch(() => {});
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    pedido = e as PedidoInstalacao;
    mudar({ podeInstalar: true });
  });
  window.addEventListener("appinstalled", () => {
    pedido = null;
    mudar({ podeInstalar: false });
  });
}
