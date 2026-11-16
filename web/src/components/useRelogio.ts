import { useEffect, useState } from "react";

/** Hora atual, atualizada a cada `passo` ms (para cronômetros e relógio do placar). */
export function useRelogio(passo = 500) {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), passo);
    return () => clearInterval(id);
  }, [passo]);
  return agora;
}
