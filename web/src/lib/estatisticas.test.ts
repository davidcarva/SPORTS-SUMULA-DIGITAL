import { describe, expect, it } from "vitest";
import {
  atletas,
  destaques,
  estadoSync,
  faltasColetivas,
  fluxo,
  periodoAtual,
  placar,
  pontosNoPeriodo,
  porPeriodo,
  situacao,
  ultimoLance,
} from "./estatisticas";
import { conteudoSync, lerConteudoSync, matrizQR, QR_PASSO_MS, quantizar } from "./qr";
import { lerJogadores } from "./store";
import { horarioDoToque } from "./tempo";
import { type Evento, FORMATO, type Jogo } from "./tipos";

const T0 = 1_800_000_000_000;
let seq = 0;

function ev(p: Partial<Evento> & Pick<Evento, "tipo">): Evento {
  seq++;
  return {
    id: `e${seq}`,
    t: T0 + seq * 1000,
    t_confirmado: T0 + seq * 1000 + 500,
    time: null,
    jogador: null,
    valor: 0,
    periodo: 1,
    removido: false,
    ...p,
  };
}

function jogo(eventos: Evento[]): Jogo {
  return {
    formato: FORMATO,
    jogo: { id: "abc123", nome: "Teste", modalidade: "basquete", criado_em: T0, fuso_minutos: -180, app: "teste" },
    times: {
      A: { nome: "Engenharia", sigla: "ENG", cor: "#2e7dff", jogadores: lerJogadores("4 Matheus\n7 João", "A") },
      B: { nome: "Direito", sigla: "DIR", cor: "#ff6a00", jogadores: lerJogadores("5 Rafael\n8 Bruno", "B") },
    },
    eventos,
  };
}

describe("placar e quartos", () => {
  const evs = [
    ev({ tipo: "inicio" }),
    ev({ tipo: "ponto", time: "A", jogador: "A4", valor: 3 }),
    ev({ tipo: "ponto", time: "B", jogador: "B5", valor: 2 }),
    ev({ tipo: "ponto", time: "B", jogador: "B5", valor: 2, removido: true }),
    ev({ tipo: "periodo" }),
    ev({ tipo: "ponto", time: "A", jogador: "A7", valor: 2, periodo: 2 }),
    ev({ tipo: "ponto", time: "A", jogador: null, valor: 1, periodo: 2 }),
    ev({ tipo: "lance", time: "B", jogador: "B8", periodo: 2 }),
  ];
  const j = jogo(evs);

  it("ignora lances removidos e lances sem ponto", () => {
    expect(placar(j)).toEqual({ A: 6, B: 2 });
  });

  it("conta o período pelos fins de quarto registrados", () => {
    expect(periodoAtual(j)).toBe(2);
  });

  it("separa os pontos por quarto", () => {
    expect(porPeriodo(j).map((l) => [l.rotulo, l.A, l.B])).toEqual([
      ["1ºQ", 3, 2],
      ["2ºQ", 3, 0],
    ]);
  });

  it("monta o fluxo acumulado começando em 0 × 0", () => {
    const f = fluxo(j);
    expect(f.map((l) => [l.A, l.B])).toEqual([
      [0, 0],
      [3, 0],
      [3, 2],
      [5, 2],
      [6, 2],
    ]);
    expect(f[0].date.getTime()).toBe(evs[0].t);
  });

  it("soma 1/2/3 por atleta e lances", () => {
    const porId = new Map(atletas(j).map((l) => [l.jogador.id, l]));
    expect(porId.get("A4")).toMatchObject({ pontos: 3, c3: 1 });
    expect(porId.get("A7")).toMatchObject({ pontos: 2, c2: 1 });
    expect(porId.get("B5")).toMatchObject({ pontos: 2, c2: 1 });
    expect(porId.get("B8")).toMatchObject({ pontos: 0, lances: 1 });
  });
});

describe("destaques", () => {
  it("conta trocas de liderança, empates, vantagem e sequência", () => {
    const j = jogo([
      ev({ tipo: "ponto", time: "A", valor: 2 }), // A 2-0
      ev({ tipo: "ponto", time: "B", valor: 2 }), // 2-2 empate
      ev({ tipo: "ponto", time: "B", valor: 3 }), // B lidera 2-5 (troca? não havia líder antes do empate: A liderava)
      ev({ tipo: "ponto", time: "B", valor: 2 }), // 2-7, sequência B 7
      ev({ tipo: "ponto", time: "A", valor: 3 }), // 5-7
      ev({ tipo: "ponto", time: "A", valor: 3 }), // 8-7, A volta a liderar
    ]);
    const d = destaques(j);
    expect(d.empates).toBe(1);
    expect(d.trocasDeLideranca).toBe(2);
    expect(d.maiorVantagem).toEqual({ A: 2, B: 5 });
    expect(d.maiorSequencia).toEqual({ time: "B", pontos: 7 });
  });
});

describe("sincronização", () => {
  it("só conta sincronizações de pelo menos 3 s", () => {
    const curta = ev({ tipo: "sync", t: T0, t_fim: T0 + 1500 });
    expect(estadoSync(jogo([curta])).ok).toBe(false);
    const boa = ev({ tipo: "sync", t: T0, t_fim: T0 + 5200 });
    expect(estadoSync(jogo([curta, boa])).ok).toBe(true);
  });

  it("o QR cabe na versão 1 (21×21) e volta ao mesmo horário", () => {
    const ms = quantizar(Date.UTC(2059, 0, 1) - 1); // pior caso de tamanho até 2059
    const texto = conteudoSync("k3x9pq", ms);
    expect(texto).toMatch(/^SDH2:K3X9PQ:[0-9A-Z]+$/);
    expect(matrizQR(texto).tamanho).toBe(21);
    expect(lerConteudoSync(texto)).toEqual({ id: "k3x9pq", ms });
  });

  it("quantiza o horário no início de cada janela de 100 ms", () => {
    expect(quantizar(T0 + 199)).toBe(T0 + 100);
    expect(QR_PASSO_MS).toBe(100);
  });

  it("desconta o atraso entre o toque e o handler", () => {
    const agora = performance.now();
    const t = horarioDoToque({ timeStamp: agora - 120 });
    expect(Date.now() - t).toBeGreaterThanOrEqual(119);
    expect(Date.now() - t).toBeLessThan(200);
  });
});

describe("cadastro de jogadores", () => {
  it("entende número e nome e evita ids repetidos", () => {
    const js = lerJogadores("4 Matheus\n#7 - João\nThiago\n4 Outro", "A");
    expect(js.map((j) => [j.id, j.numero, j.nome])).toEqual([
      ["A4", "4", "Matheus"],
      ["A7", "7", "João"],
      ["Ax3", "", "Thiago"],
      ["A4b", "4", "Outro"],
    ]);
  });
});

describe("faltas (mecânica da Súmula Federal)", () => {
  const falta = (jogador: string | null, f: "P" | "T" | "U" | "D", periodo = 1, time: "A" | "B" = "A") =>
    ev({ tipo: "falta", time, jogador, falta: f, periodo });

  it("5 faltas excluem o jogador", () => {
    const j = jogo([1, 1, 2, 3].map((p) => falta("A4", "P", p)));
    expect(situacao(j, "A", "A4").excluido).toBe(false);
    j.eventos.push(falta("A4", "P", 4));
    const st = situacao(j, "A", "A4");
    expect(st.excluido).toBe(true);
    expect(st.motivo).toBe("5 faltas");
  });

  it("desqualificante exclui na hora; técnica + antidesportiva também", () => {
    expect(situacao(jogo([falta("A4", "D")]), "A", "A4").motivo).toBe("Desqualificante");
    expect(situacao(jogo([falta("A4", "T"), falta("A4", "U")]), "A", "A4").excluido).toBe(true);
    expect(situacao(jogo([falta("A4", "T")]), "A", "A4").excluido).toBe(false);
  });

  it("coletivas por quarto; técnica no banco não conta; prorrogação soma com o 4º", () => {
    const j = jogo([
      falta("A4", "P", 1),
      falta("A7", "P", 1),
      falta(null, "T", 1),
      falta("A7", "P", 2),
      falta("A4", "P", 4),
      falta("A7", "P", 5),
      falta("B5", "P", 1, "B"),
    ]);
    expect(faltasColetivas(j, "A", 1)).toBe(2);
    expect(faltasColetivas(j, "A", 2)).toBe(1);
    expect(faltasColetivas(j, "A", 4)).toBe(2);
    expect(faltasColetivas(j, "A", 5)).toBe(2);
    expect(faltasColetivas(j, "B", 1)).toBe(1);
  });

  it("falta não mexe no placar e o último lance é desfazível", () => {
    const j = jogo([
      ev({ tipo: "ponto", time: "A", jogador: "A4", valor: 2, periodo: 1 }),
      ev({ tipo: "ponto", time: "A", jogador: "A4", valor: 3, periodo: 2 }),
      falta("A4", "P", 2),
      ev({ tipo: "sync" }),
    ]);
    expect(placar(j)).toEqual({ A: 5, B: 0 });
    expect(pontosNoPeriodo(j, "A", 2, "A4")).toBe(3);
    expect(situacao(j, "A", "A4").cestas.map((e) => e.valor)).toEqual([2, 3]);
    expect(ultimoLance(j)?.tipo).toBe("falta");
    expect(ultimoLance(j, "A", "A4")?.tipo).toBe("falta");
    expect(atletas(j)[0].faltas).toBe(1);
  });
});
