import qrcode from "qrcode-generator";

/**
 * O QR de sincronização muda a cada 100 ms e mostra o início desse intervalo.
 * Ou seja: quando a câmera vê o valor V, o relógio do mesário está entre V e V + 100 ms.
 * O cortar.py usa exatamente essa regra (QR_PASSO_MS) para calcular o alinhamento.
 */
export const QR_PASSO_MS = 100;

/**
 * Conteúdo do QR: "SDK<câmera>:<ID>:<ms em base 36>", tudo em maiúsculas. O número diz qual
 * câmera está filmando (1 a 9), para o PC separar os ângulos. Tem o mesmo tamanho do formato
 * de antes ("SDH2:…", sem câmera, que o PC ainda lê).
 * Com só letras maiúsculas, números e ":", o QR usa o modo alfanumérico e cabe na
 * versão 1 (21×21 módulos). Módulos maiores = a câmera lê de mais longe e com menos luz.
 */
export function conteudoSync(idJogo: string, ms: number, camera = 1): string {
  return `SDK${camera}:${idJogo.toUpperCase()}:${ms.toString(36).toUpperCase()}`;
}

export function lerConteudoSync(texto: string): { id: string; ms: number; camera: number | null } | null {
  const m = /^SD(?:H2|K([1-9])):([A-Z0-9]+):([A-Z0-9]+)$/i.exec(texto.trim());
  if (!m) return null;
  return { id: m[2].toLowerCase(), ms: parseInt(m[3], 36), camera: m[1] ? Number(m[1]) : null };
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
