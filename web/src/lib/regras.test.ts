import { describe, expect, it } from "vitest";
import {
  descrever,
  estourou,
  faltasColetivas,
  fimDoPeriodo,
  limitePausa,
  nomePeriodo,
  pedidosDeTempo,
  placar,
  placarPrincipal,
  sets,
  situacao,
  totalPeriodos,
  vencedor,
} from "./estatisticas";
import type { Modalidade } from "./regras";
import { lerJogadores } from "./store";
import { type Evento, FORMATO, type Jogo } from "./tipos";

const T0 = 1_800_000_000_000;
let seq = 0;

function ev(p: Partial<Evento> & Pick<Evento, "tipo">): Evento {
  seq++;
  return { id: `e${seq}`, t: T0 + seq * 1000, t_confirmado: T0 + seq * 1000, time: null, jogador: null, valor: 0, periodo: 1, removido: false, ...p };
}

function jogo(modalidade: Modalidade, eventos: Evento[], encerrado = false): Jogo {
  return {
    formato: FORMATO,
    jogo: { id: "abc123", nome: "Teste", modalidade, criado_em: T0, fuso_minutos: -180, app: "teste", ...(encerrado ? { encerrado_em: T0 + 1e7 } : {}) },
    times: {
      A: { nome: "Engenharia", sigla: "ENG", cor: "#2e7dff", jogadores: lerJogadores("4 Matheus\n7 João", "A") },
      B: { nome: "Direito", sigla: "DIR", cor: "#ff6a00", jogadores: lerJogadores("5 Rafael\n8 Bruno", "B") },
    },
    eventos,
  };
}

const ponto = (time: "A" | "B", periodo: number, jogador: string | null = null) => ev({ tipo: "ponto", time, jogador, valor: 1, periodo });
const fimPer = (periodo: number) => ev({ tipo: "periodo", periodo });

describe("futsal", () => {
  it("dá nome aos tempos e às prorrogações", () => {
    const j = jogo("futsal", []);
    expect(nomePeriodo(j, 1, true)).toBe("1ºT");
    expect(nomePeriodo(j, 2)).toBe("2º tempo");
    expect(nomePeriodo(j, 3)).toBe("1ª prorrogação");
    expect(fimDoPeriodo(j, 3)).toBe("Fim da 1ª prorrogação");
    expect(totalPeriodos(j)).toBe(2);
  });

  it("conta só faltas de jogador como acumuladas, e estoura na 5ª", () => {
    const faltas = [1, 2, 3, 4, 5].map(() => ev({ tipo: "falta", falta: "F", time: "A", jogador: "A4", periodo: 1 }));
    const j = jogo("futsal", [
      ...faltas.slice(0, 4),
      ev({ tipo: "falta", falta: "A", time: "A", jogador: "A7", periodo: 1 }), // cartão não é falta acumulada
      ev({ tipo: "falta", falta: "A", time: "A", jogador: null, periodo: 1 }), // banco
    ]);
    expect(faltasColetivas(j, "A", 1)).toBe(4);
    expect(estourou(j, 4)).toBe(false);
    const j5 = jogo("futsal", faltas);
    expect(faltasColetivas(j5, "A", 1)).toBe(5);
    expect(estourou(j5, 5)).toBe(true);
    // A prorrogação continua a contagem do 2º tempo.
    const jp = jogo("futsal", [ev({ tipo: "falta", falta: "F", time: "B", jogador: "B5", periodo: 2 }), ev({ tipo: "falta", falta: "F", time: "B", jogador: "B5", periodo: 3 })]);
    expect(faltasColetivas(jp, "B", 3)).toBe(2);
    expect(faltasColetivas(jp, "B", 1)).toBe(0);
  });

  it("exclui com vermelho ou dois amarelos, não por número de faltas", () => {
    const seisFaltas = [1, 2, 3, 4, 5, 6].map(() => ev({ tipo: "falta", falta: "F", time: "A", jogador: "A4" }));
    expect(situacao(jogo("futsal", seisFaltas), "A", "A4").excluido).toBe(false);
    const amarelos = [ev({ tipo: "falta", falta: "A", time: "A", jogador: "A4" }), ev({ tipo: "falta", falta: "A", time: "A", jogador: "A4" })];
    expect(situacao(jogo("futsal", amarelos), "A", "A4").motivo).toBe("2 amarelos");
    expect(situacao(jogo("futsal", [ev({ tipo: "falta", falta: "V", time: "A", jogador: "A7" })]), "A", "A7").motivo).toBe("Cartão vermelho");
  });

  it("dá 1 pedido de tempo por tempo e nenhum na prorrogação", () => {
    const j = jogo("futsal", [ev({ tipo: "pausa", motivo: "tempo", time: "A", periodo: 2 })]);
    expect(pedidosDeTempo(j, "A", 1)).toEqual({ usados: 0, limite: 1, rotulo: "1º tempo" });
    expect(pedidosDeTempo(j, "A", 2)?.usados).toBe(1);
    expect(pedidosDeTempo(j, "A", 3)).toBeNull();
  });

  it("descreve o gol e o cartão", () => {
    const j = jogo("futsal", []);
    expect(descrever(j, ev({ tipo: "ponto", valor: 1, time: "A", jogador: "A4" }))).toBe("Gol · #4 Matheus");
    expect(descrever(j, ev({ tipo: "falta", falta: "A", time: "B", jogador: "B5" }))).toBe("Cartão amarelo · #5 Rafael");
    expect(descrever(j, ev({ tipo: "falta", falta: "F", time: "B", jogador: "B5" }))).toBe("Falta · #5 Rafael");
  });

  it("usa o intervalo do meio entre o 1º e o 2º tempo", () => {
    const j = jogo("futsal", []);
    expect(limitePausa(j, ev({ tipo: "pausa", motivo: "intervalo", periodo: 2 }))).toBe(600_000);
  });
});

describe("vôlei", () => {
  // Set 1: A 25 x 20. Set 2: B 25 x 23. Set 3 em andamento: A 4 x 2.
  const eventos = [
    ...Array.from({ length: 25 }, () => ponto("A", 1)),
    ...Array.from({ length: 20 }, () => ponto("B", 1)),
    fimPer(1),
    ...Array.from({ length: 23 }, () => ponto("A", 2)),
    ...Array.from({ length: 25 }, () => ponto("B", 2, "B5")),
    fimPer(2),
    ...Array.from({ length: 4 }, () => ponto("A", 3)),
    ...Array.from({ length: 2 }, () => ponto("B", 3)),
  ];

  it("conta sets terminados e mostra o set atual no placar grande", () => {
    const j = jogo("volei", eventos);
    expect(sets(j)).toEqual({ A: 1, B: 1 });
    expect(placarPrincipal(j)).toEqual({ A: 4, B: 2 });
    expect(placar(j)).toEqual({ A: 52, B: 47 });
    expect(nomePeriodo(j, 3)).toBe("3º set");
    expect(fimDoPeriodo(j, 3)).toBe("Fim do 3º set");
  });

  it("decide o vencedor por sets, não por pontos", () => {
    // Set 3 fecha 15 x 13 para B: B ganha por 2 sets a 1 mesmo com menos pontos no total.
    const j = jogo(
      "volei",
      [...eventos.slice(0, -6), ...Array.from({ length: 13 }, () => ponto("A", 3)), ...Array.from({ length: 15 }, () => ponto("B", 3))],
      true,
    );
    expect(sets(j)).toEqual({ A: 1, B: 2 });
    expect(placar(j).A).toBeGreaterThan(placar(j).B);
    expect(vencedor(j)).toBe("B");
  });

  it("não tem falta acumulada e dá 2 tempos por set", () => {
    const j = jogo("volei", [ev({ tipo: "pausa", motivo: "tempo", time: "B", periodo: 2 })]);
    expect(faltasColetivas(j, "A", 1)).toBe(0);
    expect(estourou(j, 99)).toBe(false);
    expect(pedidosDeTempo(j, "B", 2)).toEqual({ usados: 1, limite: 2, rotulo: "2º set" });
    // Ponto sem jogador no vôlei: o time B pontuou porque o A errou.
    expect(descrever(j, ev({ tipo: "ponto", valor: 1, time: "B", jogador: null }))).toBe(
      `Ponto · Erro do adversário (${j.times.A.nome})`,
    );
  });
});

describe("basquete continua igual", () => {
  it("mantém quartos, prorrogação e faltas FIBA", () => {
    const j = jogo("basquete", []);
    expect(nomePeriodo(j, 4, true)).toBe("4ºQ");
    expect(fimDoPeriodo(j, 5)).toBe("Fim da 1ª prorrogação");
    expect(descrever(j, ev({ tipo: "ponto", valor: 3, time: "A", jogador: "A4" }))).toBe("+3 · #4 Matheus");
    const cinco = [1, 2, 3, 4, 5].map(() => ev({ tipo: "falta", falta: "P", time: "A", jogador: "A4" }));
    expect(situacao(jogo("basquete", cinco), "A", "A4").motivo).toBe("5 faltas");
    expect(estourou(j, 4)).toBe(true);
  });
});
