/** O app é sempre grafite (o modo claro saiu). Aqui só ficam as cores dos times. */

/** Liga o tema grafite no <html> (o index.html já liga antes do primeiro desenho). */
export function aplicarTema() {
  document.documentElement.classList.add("dark");
}

/** As cores dos times viram variáveis da página: --time-a (esquerda) e --time-b (direita). */
export function coresDosLados(a: string, b: string) {
  const s = document.documentElement.style;
  s.setProperty("--time-a", a);
  s.setProperty("--time-b", b);
}
