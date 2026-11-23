import { describe, expect, it } from "vitest";
import { siglasDosTimes } from "./store";

const t = (nome: string, sigla = "") => ({ nome, sigla });

describe("siglasDosTimes", () => {
  it("usa o começo do nome quando não há sigla", () => {
    expect(siglasDosTimes(t("Engenharia"), t("Direito"))).toEqual(["ENG", "DIR"]);
  });

  it("não repete a sigla de nomes que começam igual", () => {
    expect(siglasDosTimes(t("Time 1"), t("Time 2"))).toEqual(["T1", "T2"]);
    expect(siglasDosTimes(t("Timão"), t("Timbu"))).toEqual(["TIMA", "TIMB"]);
  });

  it("respeita a sigla digitada", () => {
    expect(siglasDosTimes(t("Time 1", "azu"), t("Time 2"))).toEqual(["AZU", "TIM"]);
    expect(siglasDosTimes(t("Time 1", "X"), t("Time 2", "X"))).toEqual(["X", "X"]);
  });

  it("sem nome, fica a letra do time", () => {
    expect(siglasDosTimes(t(""), t(""))).toEqual(["A", "B"]);
  });
});
