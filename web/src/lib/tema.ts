import { useSyncExternalStore } from "react";

/** Off-white (claro) ou grafite (escuro). Sem escolha salva, segue o celular. */
export type Tema = "claro" | "escuro";

const CHAVE = "sumula-digital:tema";
const FUNDO: Record<Tema, string> = { claro: "#f2f0ea", escuro: "#0b0b0b" };

function inicial(): Tema {
  try {
    const t = localStorage.getItem(CHAVE);
    if (t === "claro" || t === "escuro") return t;
  } catch {
    /* sem armazenamento: segue o sistema */
  }
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
}

let atual: Tema = inicial();
const ouvintes = new Set<() => void>();

export function aplicarTema(t: Tema = atual) {
  const html = document.documentElement;
  html.classList.toggle("dark", t === "escuro");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", FUNDO[t]);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", t === "escuro" ? "dark" : "light");
}

export function trocarTema(t: Tema) {
  atual = t;
  try {
    localStorage.setItem(CHAVE, t);
  } catch {
    /* só não lembra da próxima vez */
  }
  aplicarTema(t);
  for (const f of ouvintes) f();
}

export function useTema(): Tema {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => atual,
  );
}

/** As cores dos times viram variáveis da página: --time-a (esquerda) e --time-b (direita). */
export function coresDosLados(a: string, b: string) {
  const s = document.documentElement.style;
  s.setProperty("--time-a", a);
  s.setProperty("--time-b", b);
}
