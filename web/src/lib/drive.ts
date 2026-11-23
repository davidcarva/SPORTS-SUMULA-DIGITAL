import { baixarBlob, nomeArquivo } from "./exportar";
import type { Jogo } from "./tipos";

/**
 * Caminho sem servidor: a súmula vai para a pasta do Google Drive pela tela de compartilhar do
 * celular, e o vídeo vai para a mesma pasta. O PC lê os dois de lá.
 *
 * O arquivo sai como .txt porque o Chrome do Android recusa compartilhar .json. O conteúdo é o
 * mesmo JSON. O PC reconhece pelo nome (sumula_…) ou, se o Drive trocar o nome, pelo conteúdo.
 */

const CHAVE = "sumula-digital:enviada:";

export type ResultadoEnvio = "enviada" | "baixada" | "cancelada";

function conteudo(jogo: Jogo) {
  return JSON.stringify(jogo, null, 2);
}

/** Resumo curto do conteúdo: basta para saber se a súmula mudou depois de enviada. */
function marca(texto: string) {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (Math.imul(h, 31) + texto.charCodeAt(i)) | 0;
  return `${texto.length}:${h >>> 0}`;
}

function lembrar(jogo: Jogo, como: ResultadoEnvio) {
  try {
    localStorage.setItem(CHAVE + jogo.jogo.id, JSON.stringify({ como, marca: marca(conteudo(jogo)) }));
  } catch {
    /* sem armazenamento: o painel só não lembra que já enviou */
  }
}

/** Como a súmula saiu deste aparelho: null se nunca saiu, e se mudou depois disso. */
export function envioAnterior(jogo: Jogo): { como: ResultadoEnvio; mudou: boolean } | null {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE + jogo.jogo.id) ?? "null") as { como: ResultadoEnvio; marca: string } | null;
    return salvo ? { como: salvo.como, mudou: salvo.marca !== marca(conteudo(jogo)) } : null;
  } catch {
    return null;
  }
}

/**
 * Abre a tela de compartilhar com o arquivo da súmula. Chame dentro de um toque: o celular só
 * abre essa tela logo depois de um toque. Sem compartilhamento (computador), baixa o arquivo.
 */
export async function mandarSumula(jogo: Jogo): Promise<ResultadoEnvio> {
  const arquivo = new File([conteudo(jogo)], nomeArquivo(jogo, "txt"), { type: "text/plain" });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      // O Drive do Android usa o título como nome do arquivo salvo: com o nome do jogo, a súmula
      // chegava como "Time 1 x Time 2", sem o "sumula_" e sem o .txt.
      await navigator.share({ files: [arquivo], title: arquivo.name });
      lembrar(jogo, "enviada");
      return "enviada";
    } catch (erro) {
      if ((erro as Error).name === "AbortError") return "cancelada";
    }
  }
  baixarBlob(arquivo.name, arquivo);
  lembrar(jogo, "baixada");
  return "baixada";
}
