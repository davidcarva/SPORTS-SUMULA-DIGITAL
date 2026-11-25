import { beforeEach, describe, expect, it } from "vitest";
import { descrever, pontoPorErro } from "./estatisticas";
import { alterarEvento, criarJogo, jogoAtual, registrar } from "./store";

const time = (nome: string, cor: string) => ({
  nome,
  sigla: "",
  cor,
  jogadores: [1, 2, 3, 4, 5, 6].map((n) => ({ numero: String(n), nome: `J${n}` })),
});

describe("vôlei: ponto por erro do adversário", () => {
  beforeEach(() => {
    criarJogo("Teste", time("Engenharia", "#2e7dff"), time("Direito", "#ff6a00"), "volei");
  });

  it("o ponto é do time e o texto diz que quem errou foi o outro", () => {
    const e = registrar({ tipo: "ponto", t: 10_000, time: "A", jogador: null, valor: 1 })!;
    expect(pontoPorErro(jogoAtual()!, e)).toBe(true);
    expect(descrever(jogoAtual()!, e)).toBe("Ponto · Erro do adversário (Direito)");
    alterarEvento(e.id, { erro: "saque" });
    const salvo = jogoAtual()!.eventos.find((x) => x.id === e.id)!;
    expect(descrever(jogoAtual()!, salvo)).toBe("Ponto · Erro de saque do adversário (Direito)");
  });

  it("ponto de atleta não pergunta motivo", () => {
    const e = registrar({ tipo: "ponto", t: 10_000, time: "B", jogador: "B1", valor: 1 })!;
    expect(pontoPorErro(jogoAtual()!, e)).toBe(false);
  });
});
