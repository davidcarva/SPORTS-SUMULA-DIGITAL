import { describe, expect, it } from "vitest";
import { descrever, duracao, limitePausa, pausaAberta, pausas, pedidosDeTempo, resumoPausas } from "./estatisticas";
import { extrairPaleta, legivelNoEscuro, sugerirDupla } from "./paleta";
import { lerJogadores } from "./store";
import { type Evento, FORMATO, type Jogo } from "./tipos";

const T0 = 1_800_000_000_000;
let seq = 0;
const ev = (p: Partial<Evento> & Pick<Evento, "tipo">): Evento => {
  seq++;
  return { id: `p${seq}`, t: T0 + seq * 1000, t_confirmado: 0, time: null, jogador: null, valor: 0, periodo: 1, removido: false, ...p };
};
const jogo = (eventos: Evento[], limites?: Jogo["jogo"]["limites"]): Jogo => ({
  formato: FORMATO,
  jogo: { id: "abc123", nome: "T", modalidade: "basquete", criado_em: T0, fuso_minutos: -180, app: "t", limites },
  times: {
    A: { nome: "Engenharia", sigla: "ENG", cor: "#2e7dff", jogadores: lerJogadores("4 Matheus", "A") },
    B: { nome: "Direito", sigla: "DIR", cor: "#ff6a00", jogadores: lerJogadores("5 Rafael", "B") },
  },
  eventos,
});

describe("paradas", () => {
  it("duração legível", () => {
    expect(duracao(0)).toBe("0:00");
    expect(duracao(65_400)).toBe("1:05");
    expect(duracao(3_723_000)).toBe("1:02:03");
  });

  it("limite por motivo; intervalo depois do 2º quarto é o do meio", () => {
    const j = jogo([]);
    expect(limitePausa(j, ev({ tipo: "pausa", motivo: "tempo" }))).toBe(60_000);
    expect(limitePausa(j, ev({ tipo: "pausa", motivo: "intervalo", periodo: 2 }))).toBe(120_000);
    expect(limitePausa(j, ev({ tipo: "pausa", motivo: "intervalo", periodo: 3 }))).toBe(600_000);
    expect(limitePausa(j, ev({ tipo: "pausa", motivo: "lesao" }))).toBe(180_000);
    expect(limitePausa(jogo([], { tempo: 45, intervalo: 60, meio: 300, outras: 120 }), ev({ tipo: "pausa", motivo: "tempo" }))).toBe(45_000);
  });

  it("parada aberta, excesso e resumo", () => {
    const tempo = ev({ tipo: "pausa", motivo: "tempo", time: "A" });
    tempo.t_fim = tempo.t + 75_000; // 15 s acima
    const lesao = ev({ tipo: "pausa", motivo: "lesao" });
    lesao.t_fim = lesao.t + 120_000;
    const aberta = ev({ tipo: "pausa", motivo: "arbitragem" });
    const j = jogo([tempo, lesao, aberta]);
    expect(pausaAberta(j)?.id).toBe(aberta.id);
    const lista = pausas(j, aberta.t + 200_000);
    expect(lista.map((p) => p.excesso)).toEqual([15_000, 0, 20_000]);
    const r = resumoPausas(j, aberta.t + 200_000);
    expect(r.quantidade).toBe(3);
    expect(r.totalMs).toBe(395_000);
    expect(r.acimaDoLimite).toBe(2);
    expect(r.maior?.nome).toBe("Arbitragem / conversa");
    expect(descrever(j, tempo)).toBe("Parada · Tempo ENG · 1:15");
    expect(descrever(j, aberta)).toContain("em andamento");
  });

  it("pedidos de tempo: 2 no 1º tempo, 3 no 2º, 1 por prorrogação", () => {
    const j = jogo([
      ev({ tipo: "pausa", motivo: "tempo", time: "A", periodo: 1 }),
      ev({ tipo: "pausa", motivo: "tempo", time: "A", periodo: 2 }),
      ev({ tipo: "pausa", motivo: "tempo", time: "A", periodo: 3 }),
      ev({ tipo: "pausa", motivo: "tempo", time: "B", periodo: 4 }),
      ev({ tipo: "pausa", motivo: "tempo", time: "A", periodo: 2, removido: true }),
      ev({ tipo: "pausa", motivo: "lesao", time: "A", periodo: 2 }),
    ]);
    expect(pedidosDeTempo(j, "A", 2)).toEqual({ usados: 2, limite: 2, rotulo: "1º tempo" });
    expect(pedidosDeTempo(j, "A", 4)).toEqual({ usados: 1, limite: 3, rotulo: "2º tempo" });
    expect(pedidosDeTempo(j, "B", 3)?.usados).toBe(1);
    expect(pedidosDeTempo(j, "A", 5)?.limite).toBe(1);
  });
});

describe("cores de uma imagem", () => {
  const pixels = (partes: [number, number, number, number, number][]) =>
    partes.flatMap(([r, g, b, a, n]) => Array.from({ length: n }, () => [r, g, b, a]).flat());

  it("ignora fundo branco e transparente, prefere cores vivas", () => {
    const px = pixels([
      [255, 255, 255, 255, 600], // fundo branco
      [0, 0, 0, 0, 300], // transparente
      [85, 37, 131, 255, 250], // roxo
      [253, 185, 39, 255, 100], // dourado
      [10, 10, 10, 255, 50], // contorno preto
    ]);
    const p = extrairPaleta(px);
    expect(p[0].hex).toBe("#552583");
    expect(p[1].hex).toBe("#fdb927");
    expect(p.find((c) => c.hex === "#ffffff")?.neutra).toBe(true);
    expect(sugerirDupla(p)).toEqual(["#552583", "#fdb927"]);
  });

  it("junta tons quase iguais (sombra/JPEG) numa cor só", () => {
    const p = extrairPaleta(pixels([[200, 30, 40, 255, 100], [206, 34, 44, 255, 100], [30, 90, 200, 255, 60]]));
    expect(p).toHaveLength(2);
  });

  it("clareia cor escura demais para o fundo do app", () => {
    expect(legivelNoEscuro("#0a0a14")).not.toBe("#0a0a14");
    expect(legivelNoEscuro("#ff6a00")).toBe("#ff6a00");
  });
});
