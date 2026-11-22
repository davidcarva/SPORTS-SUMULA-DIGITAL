import { describe, expect, it } from "vitest";
import { montarJogadores } from "@/lib/store";
import { comNumeros, novaLinha, proximoNumero } from "./ListaJogadores";

describe("números padrão dos jogadores", () => {
  it("o time em branco já vem 1, 2, 3, 4, 5", () => {
    expect(comNumeros([], 5).map((l) => l.numero)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("o jogador novo pega o menor número livre, sem repetir os trocados à mão", () => {
    const linhas = [novaLinha("1"), novaLinha("23"), novaLinha("3")];
    expect(proximoNumero(linhas)).toBe("2");
    expect(comNumeros(linhas, 3).map((l) => l.numero)).toEqual(["1", "23", "3", "2", "4", "5"]);
  });

  it("sem nome, o jogador entra pelo número (baba sem cadastro)", () => {
    const js = montarJogadores(comNumeros([], 2), "A");
    expect(js.map((j) => [j.id, j.numero])).toEqual([
      ["A1", "1"],
      ["A2", "2"],
    ]);
  });
});
