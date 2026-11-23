import { useSyncExternalStore } from "react";

/** Rotas simples por endereço: "/" é o app do mesário, "/hub/..." é o hub de jogos. */

const EVENTO = "sumula:rota";

function assinar(f: () => void) {
  window.addEventListener("popstate", f);
  window.addEventListener(EVENTO, f);
  return () => {
    window.removeEventListener("popstate", f);
    window.removeEventListener(EVENTO, f);
  };
}

export const useEndereco = () => useSyncExternalStore(assinar, () => location.pathname + location.search);

export function ir(caminho: string, substituir = false) {
  if (substituir) history.replaceState(null, "", caminho);
  else history.pushState(null, "", caminho);
  window.dispatchEvent(new Event(EVENTO));
  window.scrollTo({ top: 0 });
}

export const noHub = (caminho = location.pathname) => caminho === "/hub" || caminho.startsWith("/hub/");
