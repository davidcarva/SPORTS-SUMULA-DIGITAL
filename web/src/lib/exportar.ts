import { descrever, encontrarJogador, nomePeriodo } from "./estatisticas";
import { hora } from "./tempo";
import type { Jogo } from "./tipos";

export function baixarBlob(nome: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function baixar(nome: string, conteudo: string, tipo: string) {
  baixarBlob(nome, new Blob([conteudo], { type: tipo }));
}

export function nomeArquivo(jogo: Jogo, ext: string) {
  const slug = jogo.jogo.nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 40);
  return `sumula_${slug || "jogo"}_${jogo.jogo.id}.${ext}`;
}

export function baixarJSON(jogo: Jogo) {
  baixar(nomeArquivo(jogo, "json"), JSON.stringify(jogo, null, 2), "application/json");
}

export function baixarCSV(jogo: Jogo) {
  const q = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const linhas = [["horario", "periodo", "tipo", "valor", "time", "numero", "jogador", "descricao", "removido"].join(";")];
  for (const e of [...jogo.eventos].sort((a, b) => a.t - b.t)) {
    const j = encontrarJogador(jogo, e.jogador);
    linhas.push(
      [
        hora(e.t, true),
        nomePeriodo(jogo, e.periodo, true),
        e.tipo,
        e.valor,
        e.time ? jogo.times[e.time].nome : "",
        j?.numero ?? "",
        j?.nome ?? "",
        descrever(jogo, e),
        e.removido ? "sim" : "nao",
      ]
        .map(q)
        .join(";"),
    );
  }
  baixar(nomeArquivo(jogo, "csv"), `﻿${linhas.join("\r\n")}`, "text/csv");
}

export async function copiarJSON(jogo: Jogo): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(JSON.stringify(jogo));
    return true;
  } catch {
    return false;
  }
}

/** O gerador de PDF só é baixado quando alguém pede o PDF. */
export async function baixarPDF(jogo: Jogo) {
  const { gerarPDF } = await import("./pdf");
  baixarBlob(nomeArquivo(jogo, "pdf"), gerarPDF(jogo).output("blob"));
}
