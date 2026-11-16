import { useSyncExternalStore } from "react";

/** A abertura com a quadra roda uma vez, logo depois de "Começar jogo". */
let pendente = false;
const ouvintes = new Set<() => void>();

function avisar() {
  for (const f of ouvintes) f();
}

export function pedirAbertura() {
  pendente = true;
  avisar();
}

export function concluirAbertura() {
  pendente = false;
  avisar();
}

export function useAbertura(): boolean {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => pendente,
  );
}
