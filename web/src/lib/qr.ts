import qrcode from "qrcode-generator";

/**
 * O QR de sincronização muda a cada 100 ms e mostra o início desse intervalo.
 * Ou seja: quando a câmera vê o valor V, o relógio do mesário está entre V e V + 100 ms.
 * O cortar.py usa exatamente essa regra (QR_PASSO_MS) para calcular o alinhamento.
 */
export const QR_PASSO_MS = 100;

/**
 * Conteúdo do QR: "SDH2:<ID>:<ms em base 36>", tudo em maiúsculas.
 * Com só letras maiúsculas, números e ":", o QR usa o modo alfanumérico e cabe na
 * versão 1 (21×21 módulos). Módulos maiores = a câmera lê de mais longe e com menos luz.
 */
export function conteudoSync(idJogo: string, ms: number): string {
  return `SDH2:${idJogo.toUpperCase()}:${ms.toString(36).toUpperCase()}`;
}

export function lerConteudoSync(texto: string): { id: string; ms: number } | null {
  const m = /^SDH2:([A-Z0-9]+):([A-Z0-9]+)$/i.exec(texto.trim());
  if (!m) return null;
  return { id: m[1].toLowerCase(), ms: parseInt(m[2], 36) };
}

export function quantizar(ms: number): number {
  return Math.floor(ms / QR_PASSO_MS) * QR_PASSO_MS;
}

export interface MatrizQR {
  tamanho: number;
  escuro: (linha: number, coluna: number) => boolean;
}

export function matrizQR(texto: string): MatrizQR {
  const q = qrcode(0, "M");
  q.addData(texto, "Alphanumeric");
  q.make();
  return { tamanho: q.getModuleCount(), escuro: (l, c) => q.isDark(l, c) };
}
