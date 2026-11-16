/**
 * Horário (relógio de parede, ms) em que o dedo TOCOU a tela.
 *
 * O handler roda alguns milissegundos depois do toque, e o "click" só dispara quando o
 * dedo sobe (às vezes 100–300 ms depois). Por isso o app usa o pointerdown e desconta o
 * atraso entre o evento e o momento em que o código rodou.
 */
export function horarioDoToque(e: { timeStamp: number }): number {
  const agora = Date.now();
  const atraso = performance.now() - e.timeStamp;
  return atraso > 0 && atraso < 2000 ? Math.round(agora - atraso) : agora;
}

export function hora(ms: number, decimos = false): string {
  const d = new Date(ms);
  const p = (x: number) => String(x).padStart(2, "0");
  const base = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  return decimos ? `${base}.${Math.floor(d.getMilliseconds() / 100)}` : base;
}

export function horaCurta(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789";

export function novoId(n = 6): string {
  const r = new Uint8Array(n);
  crypto.getRandomValues(r);
  return Array.from(r, (x) => ALFABETO[x % ALFABETO.length]).join("");
}
