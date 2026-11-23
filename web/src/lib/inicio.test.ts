import { beforeEach, describe, expect, it } from "vitest";
import { ativos, periodoAtual } from "./estatisticas";
import { criarJogo, jogoAtual, registrar } from "./store";

const time = (nome: string) => ({ nome, sigla: "", cor: nome === "A" ? "#2e7dff" : "#ff6a00", jogadores: [{ numero: "1", nome: "Davi" }] });
const inicios = () => ativos(jogoAtual()!).filter((e) => e.tipo === "inicio");

describe("início do jogo", () => {
  beforeEach(() => {
    criarJogo("Teste", time("A"), time("B"));
  });

  it("começa sozinho no primeiro lance se o mesário esqueceu", () => {
    registrar({ tipo: "ponto", t: 10_000, time: "A", jogador: "A1", valor: 2 });
    registrar({ tipo: "ponto", t: 20_000, time: "B", jogador: "B1", valor: 3 });
    expect(inicios()).toHaveLength(1);
    expect(inicios()[0]).toMatchObject({ t: 9_999, automatico: true });
  });

  it("o fim do quarto funciona mesmo sem o início", () => {
    registrar({ tipo: "periodo", t: 50_000 });
    expect(inicios()).toHaveLength(1);
    expect(periodoAtual(jogoAtual()!)).toBe(2);
  });

  it("não mexe no início marcado pelo mesário", () => {
    registrar({ tipo: "inicio", t: 5_000 });
    registrar({ tipo: "ponto", t: 10_000, time: "A", jogador: "A1", valor: 2 });
    expect(inicios()).toHaveLength(1);
    expect(inicios()[0].automatico).toBeUndefined();
  });
});
