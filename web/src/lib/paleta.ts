/**
 * Cores predominantes de uma imagem (logo, print de post).
 * Agrupa os pixels em caixas de cor, junta as parecidas e prefere as vivas: fundo branco,
 * preto de contorno e cinza contam menos, porque raramente são "a cor do time".
 */

export interface CorPaleta {
  hex: string;
  /** Fração dos pixels considerados (0–1). */
  peso: number;
  /** A cor é quase branca, quase preta ou cinza. */
  neutra: boolean;
}

const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, "0");
export const paraHex = (r: number, g: number, b: number) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

export function deHex(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function saturacaoLuz(r: number, g: number, b: number) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  return { s, l };
}

/** Distância perceptiva aproximada ("redmean"). */
export function distancia(a: [number, number, number], b: [number, number, number]) {
  const rm = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

/** Pixels RGBA (como os de getImageData) → até `max` cores, das mais marcantes para as menos. */
export function extrairPaleta(px: Uint8ClampedArray | number[], max = 6): CorPaleta[] {
  const caixas = new Map<number, { r: number; g: number; b: number; n: number }>();
  let total = 0;
  for (let i = 0; i + 3 < px.length; i += 4) {
    if (px[i + 3] < 128) continue; // transparente
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const c = caixas.get(k);
    if (c) {
      c.r += r;
      c.g += g;
      c.b += b;
      c.n++;
    } else caixas.set(k, { r, g, b, n: 1 });
    total++;
  }
  if (!total) return [];

  // Junta caixas parecidas, da mais cheia para a mais vazia.
  const grupos: { cor: [number, number, number]; n: number }[] = [];
  for (const c of [...caixas.values()].sort((a, b) => b.n - a.n)) {
    const cor: [number, number, number] = [c.r / c.n, c.g / c.n, c.b / c.n];
    const g = grupos.find((x) => distancia(x.cor, cor) < 70);
    if (g) {
      const n = g.n + c.n;
      g.cor = [(g.cor[0] * g.n + cor[0] * c.n) / n, (g.cor[1] * g.n + cor[1] * c.n) / n, (g.cor[2] * g.n + cor[2] * c.n) / n];
      g.n = n;
    } else grupos.push({ cor, n: c.n });
  }

  return grupos
    .map((g) => {
      const { s, l } = saturacaoLuz(...g.cor);
      const neutra = s < 0.18 || l > 0.92 || l < 0.08;
      const peso = g.n / total;
      // Cor viva vale mais; neutra só aparece se ocupar muito da imagem.
      const nota = peso * (neutra ? 0.25 : 0.6 + s);
      return { hex: paraHex(...g.cor), peso, neutra, nota };
    })
    .filter((c) => c.peso >= 0.004)
    .sort((a, b) => b.nota - a.nota)
    .slice(0, max)
    .map(({ hex, peso, neutra }) => ({ hex, peso, neutra }));
}

/** Sugestão de lado esquerdo e direito: a cor mais marcante e a mais diferente dela. */
export function sugerirDupla(p: CorPaleta[]): [string, string] | null {
  const vivas = p.filter((c) => !c.neutra);
  const base = vivas.length ? vivas : p;
  if (!base.length) return null;
  const a = base[0];
  const resto = p.filter((c) => c !== a);
  if (!resto.length) return [a.hex, a.hex];
  const b = resto.reduce((m, c) =>
    distancia(deHex(c.hex), deHex(a.hex)) * (c.neutra ? 0.6 : 1) > distancia(deHex(m.hex), deHex(a.hex)) * (m.neutra ? 0.6 : 1) ? c : m,
  );
  return [a.hex, b.hex];
}

/** Cor muito escura some no fundo do app: clareia até ficar visível. */
export function legivelNoEscuro(hex: string): string {
  let [r, g, b] = deHex(hex);
  for (let i = 0; i < 12; i++) {
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (lum >= 0.22) break;
    r += (255 - r) * 0.15;
    g += (255 - g) * 0.15;
    b += (255 - b) * 0.15;
  }
  return paraHex(r, g, b);
}

/** Lê um arquivo de imagem e devolve a paleta (reduz para 96 px antes, é rápido). */
export async function paletaDeArquivo(arquivo: File, max = 6): Promise<CorPaleta[]> {
  const bmp = await createImageBitmap(arquivo);
  const lado = 96;
  const esc = Math.min(1, lado / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * esc));
  const h = Math.max(1, Math.round(bmp.height * esc));
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d", { willReadFrequently: true });
  if (!c) return [];
  c.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return extrairPaleta(c.getImageData(0, 0, w, h).data, max);
}
