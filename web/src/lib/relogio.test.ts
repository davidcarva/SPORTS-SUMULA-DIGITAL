import { beforeEach, describe, expect, it } from "vitest";
import { emOrdemDeQuadra, ladosNaTela, relogio } from "./estatisticas";
import { criarJogo, inverterLados, jogoAtual, montarJogadores, pausar, registrar, retomar } from "./store";

const time = (nome: string) => ({ nome, sigla: "", cor: nome === "A" ? "#2e7dff" : "#ff6a00", jogadores: [{ numero: "1", nome: "Davi" }] });
const MIN = 60_000;

describe("relógio do período", () => {
  beforeEach(() => {
    criarJogo("Teste", time("A"), time("B"), "basquete", { periodo: 10, prorrogacao: 5 });
  });

  it("antes do Iniciar jogo, mostra o tempo cheio e não corre", () => {
    const r = relogio(jogoAtual()!, 5 * MIN)!;
    expect(r).toMatchObject({ iniciado: false, restante: 10 * MIN, zerou: null });
  });

  it("corre com a bola rolando e para nas paradas", () => {
    registrar({ tipo: "inicio", t: 0 });
    pausar("tempo", 3 * MIN, "A");
    retomar(4 * MIN); // 1 min parado: não conta
    const r = relogio(jogoAtual()!, 6 * MIN)!;
    expect(r.jogado).toBe(5 * MIN);
    expect(r.restante).toBe(5 * MIN);
    expect(r.parado).toBe(false);
  });

  it("fica parado enquanto a parada está aberta", () => {
    registrar({ tipo: "inicio", t: 0 });
    pausar("lesao", 2 * MIN);
    const r = relogio(jogoAtual()!, 9 * MIN)!;
    expect(r.jogado).toBe(2 * MIN);
    expect(r.parado).toBe(true);
  });

  it("diz o momento exato em que zerou, descontando as paradas", () => {
    registrar({ tipo: "inicio", t: 0 });
    pausar("tempo", 5 * MIN, "B");
    retomar(7 * MIN);
    const r = relogio(jogoAtual()!, 20 * MIN)!;
    expect(r.zerou).toBe(12 * MIN); // 10 min de bola + 2 min parados
    expect(r.restante).toBe(0);
  });

  it("o período seguinte conta a partir do fim do intervalo", () => {
    registrar({ tipo: "inicio", t: 0 });
    registrar({ tipo: "periodo", t: 10 * MIN });
    pausar("intervalo", 10 * MIN);
    retomar(12 * MIN);
    const r = relogio(jogoAtual()!, 15 * MIN)!;
    expect(r.jogado).toBe(3 * MIN);
  });

  it("a prorrogação usa o tempo dela", () => {
    registrar({ tipo: "inicio", t: 0 });
    for (let p = 1; p <= 4; p++) registrar({ tipo: "periodo", t: p * 10 * MIN });
    expect(relogio(jogoAtual()!, 41 * MIN)!.total).toBe(5 * MIN);
  });

  it("sem tempo definido, não há relógio", () => {
    criarJogo("Sem relógio", time("A"), time("B"), "basquete", { periodo: 0, prorrogacao: 5 });
    expect(relogio(jogoAtual()!)).toBeNull();
    criarJogo("Vôlei", time("A"), time("B"), "volei");
    expect(relogio(jogoAtual()!)).toBeNull();
  });
});

describe("lados, capitão e reservas", () => {
  it("trocar de lado só muda a tela", () => {
    criarJogo("Teste", time("A"), time("B"));
    expect(ladosNaTela(jogoAtual()!)).toEqual(["A", "B"]);
    inverterLados();
    expect(ladosNaTela(jogoAtual()!)).toEqual(["B", "A"]);
    expect(jogoAtual()!.times.A.nome).toBe("A");
  });

  it("guarda capitão e reserva e põe os reservas depois dos titulares", () => {
    const js = montarJogadores(
      [
        { numero: "4", nome: "Reserva", reserva: true },
        { numero: "7", nome: "Capitão", capitao: true },
        { numero: "9", nome: "Titular" },
      ],
      "A",
    );
    expect(js[1]).toMatchObject({ capitao: true });
    expect(js[2].capitao).toBeUndefined();
    expect(emOrdemDeQuadra(js).map((j) => j.nome)).toEqual(["Capitão", "Titular", "Reserva"]);
  });
});
