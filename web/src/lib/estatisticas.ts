import { regras } from "./regras";
import { type Evento, type Jogador, type Jogo, type LimitesPausa, type MotivoErro, MOTIVOS_PAUSA, NOMES_FALTA, type TimeId } from "./tipos";

export type Placar = Record<TimeId, number>;

export function ativos(jogo: Jogo): Evento[] {
  return jogo.eventos.filter((e) => !e.removido).sort((a, b) => a.t - b.t);
}

export function pontos(jogo: Jogo): Evento[] {
  return ativos(jogo).filter((e) => e.tipo === "ponto" && e.time);
}

export function placar(jogo: Jogo): Placar {
  const p: Placar = { A: 0, B: 0 };
  for (const e of pontos(jogo)) p[e.time as TimeId] += e.valor;
  return p;
}

export function periodoAtual(jogo: Jogo): number {
  return 1 + ativos(jogo).filter((e) => e.tipo === "periodo").length;
}

/** Quarto, tempo ou set, conforme a modalidade; depois vêm as prorrogações. */
export function nomePeriodo(jogo: Jogo, p: number, curto = false): string {
  return regras(jogo).nomePeriodo(p, curto);
}

/** "Fim do 1º quarto", "Fim da 1ª prorrogação", "Fim do 2º set". */
export function fimDoPeriodo(jogo: Jogo, p: number): string {
  return `Fim ${regras(jogo).doPeriodo(p)}`;
}

/** Sets ganhos (vôlei): conta os sets terminados e, com o jogo encerrado, o último. */
export function sets(jogo: Jogo): Placar {
  const s: Placar = { A: 0, B: 0 };
  const ultimo = jogo.jogo.encerrado_em ? periodoAtual(jogo) : periodoAtual(jogo) - 1;
  for (let p = 1; p <= ultimo; p++) {
    const a = pontosNoPeriodo(jogo, "A", p);
    const b = pontosNoPeriodo(jogo, "B", p);
    if (a > b) s.A++;
    else if (b > a) s.B++;
  }
  return s;
}

/** O número grande do placar: no vôlei, os pontos do set em andamento; nos outros, o total. */
export function placarPrincipal(jogo: Jogo): Placar {
  if (!regras(jogo).porSets) return placar(jogo);
  const per = periodoAtual(jogo);
  return { A: pontosNoPeriodo(jogo, "A", per), B: pontosNoPeriodo(jogo, "B", per) };
}

/** "Falta pessoal", "Falta", "Cartão amarelo". */
export function nomeFalta(e: Evento): string {
  const f = e.falta ?? "P";
  return ["P", "T", "U", "D"].includes(f) ? `Falta ${NOMES_FALTA[f].toLowerCase()}` : NOMES_FALTA[f];
}

export function encontrarJogador(jogo: Jogo, id: string | null): (Jogador & { time: TimeId }) | null {
  if (!id) return null;
  for (const t of ["A", "B"] as TimeId[]) {
    const j = jogo.times[t].jogadores.find((x) => x.id === id);
    if (j) return { ...j, time: t };
  }
  return null;
}

export function nomeJogador(jogo: Jogo, id: string | null): string {
  const j = encontrarJogador(jogo, id);
  if (!j) return "Sem jogador";
  return `${j.numero ? `#${j.numero} ` : ""}${j.nome}`;
}

/** Os motivos, na ordem dos botões. O texto deixa claro que quem errou foi o OUTRO time. */
export const MOTIVOS_ERRO: { id: MotivoErro; botao: string; texto: string }[] = [
  { id: "saque", botao: "Saque", texto: "erro de saque" },
  { id: "ataque", botao: "Ataque", texto: "erro de ataque" },
  { id: "rede", botao: "Rede", texto: "rede ou invasão" },
  { id: "outro", botao: "Outro", texto: "erro" },
];

/** Ponto do vôlei na linha Equipe: o time pontuou porque o adversário errou. */
export function pontoPorErro(jogo: Jogo, e: Evento): boolean {
  return jogo.jogo.modalidade === "volei" && e.tipo === "ponto" && !e.jogador && (e.time === "A" || e.time === "B");
}

/** "Erro de saque do adversário (Direito)": o ponto é do time, quem errou foi o outro. */
export function textoErro(jogo: Jogo, e: Evento): string {
  const outro = e.time === "A" ? jogo.times.B : jogo.times.A;
  const m = MOTIVOS_ERRO.find((x) => x.id === e.erro);
  const como = m ? m.texto : "erro";
  return `${como[0].toUpperCase()}${como.slice(1)} do adversário (${outro.nome})`;
}

export function descrever(jogo: Jogo, e: Evento): string {
  switch (e.tipo) {
    case "ponto":
      if (pontoPorErro(jogo, e)) return `Ponto · ${textoErro(jogo, e)}`;
      return `${regras(jogo).rotuloValor(e.valor)} · ${nomeJogador(jogo, e.jogador)}`;
    case "lance":
      return `Lance · ${nomeJogador(jogo, e.jogador)}`;
    case "falta":
      return `${nomeFalta(e)} · ${e.jogador ? nomeJogador(jogo, e.jogador) : "banco"}`;
    case "pausa":
      return `Parada · ${nomePausa(jogo, e)}${e.t_fim ? ` · ${duracao(e.t_fim - e.t)}` : " · em andamento"}`;
    case "inicio":
      return "Início do jogo";
    case "periodo":
      return fimDoPeriodo(jogo, e.periodo);
    case "sync":
      return "Câmera sincronizada";
    case "fim":
      return "Fim de jogo";
  }
}

// ------------------------------------------------------------- por quarto

export interface LinhaPeriodo {
  periodo: number;
  rotulo: string;
  A: number;
  B: number;
}

export function porPeriodo(jogo: Jogo): LinhaPeriodo[] {
  const total = Math.max(periodoAtual(jogo), ...pontos(jogo).map((e) => e.periodo), 1);
  const linhas: LinhaPeriodo[] = Array.from({ length: total }, (_, i) => ({
    periodo: i + 1,
    rotulo: nomePeriodo(jogo, i + 1, true),
    A: 0,
    B: 0,
  }));
  for (const e of pontos(jogo)) linhas[e.periodo - 1][e.time as TimeId] += e.valor;
  return linhas;
}

// ------------------------------------------------------------- fluxo do jogo

export interface PontoFluxo extends Record<string, unknown> {
  date: Date;
  A: number;
  B: number;
  rotulo: string;
  descricao: string;
  time: TimeId | null;
}

/** Placar acumulado depois de cada cesta. A primeira linha é 0 × 0 no início do jogo. */
export function fluxo(jogo: Jogo): PontoFluxo[] {
  const evs = pontos(jogo);
  const inicio = ativos(jogo).find((e) => e.tipo === "inicio");
  const t0 = inicio ? Math.min(inicio.t, evs[0]?.t ?? inicio.t) : (evs[0]?.t ?? jogo.jogo.criado_em) - 1000;
  const linhas: PontoFluxo[] = [
    { date: new Date(t0), A: 0, B: 0, rotulo: "Início", descricao: "Início do jogo", time: null },
  ];
  const acc: Placar = { A: 0, B: 0 };
  for (const e of evs) {
    acc[e.time as TimeId] += e.valor;
    linhas.push({
      date: new Date(e.t),
      A: acc.A,
      B: acc.B,
      rotulo: nomePeriodo(jogo, e.periodo, true),
      descricao: `${jogo.times[e.time as TimeId].sigla} ${descrever(jogo, e)}`,
      time: e.time,
    });
  }
  return linhas;
}

// ------------------------------------------------------------- atletas

export interface LinhaAtleta {
  jogador: Jogador;
  time: TimeId;
  pontos: number;
  c1: number;
  c2: number;
  c3: number;
  lances: number;
  faltas: number;
}

export function atletas(jogo: Jogo): LinhaAtleta[] {
  const mapa = new Map<string, LinhaAtleta>();
  for (const t of ["A", "B"] as TimeId[]) {
    for (const j of jogo.times[t].jogadores) {
      mapa.set(j.id, { jogador: j, time: t, pontos: 0, c1: 0, c2: 0, c3: 0, lances: 0, faltas: 0 });
    }
  }
  for (const e of ativos(jogo)) {
    const l = e.jogador ? mapa.get(e.jogador) : undefined;
    if (!l) continue;
    if (e.tipo === "ponto") {
      l.pontos += e.valor;
      if (e.valor === 1) l.c1++;
      else if (e.valor === 2) l.c2++;
      else if (e.valor === 3) l.c3++;
    } else if (e.tipo === "lance") {
      l.lances++;
    } else if (e.tipo === "falta") {
      l.faltas++;
    }
  }
  return [...mapa.values()].sort((a, b) => b.pontos - a.pontos || b.lances - a.lances);
}

// ------------------------------------------------------------- destaques

export interface Destaques {
  trocasDeLideranca: number;
  empates: number;
  maiorVantagem: Record<TimeId, number>;
  maiorSequencia: { time: TimeId; pontos: number } | null;
  melhorPeriodo: { time: TimeId; periodo: number; pontos: number } | null;
}

export function destaques(jogo: Jogo): Destaques {
  const acc: Placar = { A: 0, B: 0 };
  let lider: TimeId | null = null;
  let trocas = 0;
  let empates = 0;
  const maiorVantagem: Record<TimeId, number> = { A: 0, B: 0 };
  let seq: { time: TimeId; pontos: number } | null = null;
  let maiorSeq: { time: TimeId; pontos: number } | null = null;

  for (const e of pontos(jogo)) {
    const t = e.time as TimeId;
    acc[t] += e.valor;
    seq = seq && seq.time === t ? { time: t, pontos: seq.pontos + e.valor } : { time: t, pontos: e.valor };
    if (!maiorSeq || seq.pontos > maiorSeq.pontos) maiorSeq = { ...seq };

    const dif = acc.A - acc.B;
    const agora: TimeId | null = dif > 0 ? "A" : dif < 0 ? "B" : null;
    if (agora === null) empates++;
    else {
      if (lider !== null && lider !== agora) trocas++;
      lider = agora;
    }
    maiorVantagem.A = Math.max(maiorVantagem.A, dif);
    maiorVantagem.B = Math.max(maiorVantagem.B, -dif);
  }

  let melhorPeriodo: Destaques["melhorPeriodo"] = null;
  for (const l of porPeriodo(jogo)) {
    for (const t of ["A", "B"] as TimeId[]) {
      if (l[t] > 0 && (!melhorPeriodo || l[t] > melhorPeriodo.pontos)) {
        melhorPeriodo = { time: t, periodo: l.periodo, pontos: l[t] };
      }
    }
  }

  return { trocasDeLideranca: trocas, empates, maiorVantagem, maiorSequencia: maiorSeq, melhorPeriodo };
}

// ------------------------------------------------------------- sincronização

export interface EstadoSync {
  feitas: Evento[];
  /** Houve sincronização de pelo menos 3 s? */
  ok: boolean;
  ultima: Evento | null;
}

export const SYNC_MINIMO_MS = 3000;

export function estadoSync(jogo: Jogo): EstadoSync {
  const feitas = ativos(jogo).filter((e) => e.tipo === "sync" && (e.t_fim ?? e.t) - e.t >= SYNC_MINIMO_MS);
  return { feitas, ok: feitas.length > 0, ultima: feitas.at(-1) ?? null };
}

// ------------------------------------------------------------- faltas e súmula

export interface Situacao {
  pontos: number;
  /** Cestas na ordem em que saíram (cada uma vira uma casa na súmula). */
  cestas: Evento[];
  faltas: Evento[];
  lances: number;
  excluido: boolean;
  motivo: string | null;
}

/**
 * Situação de um jogador, ou da equipe (jogador = null: pontos sem autor e faltas do banco).
 * A exclusão segue a modalidade: no basquete, 5 faltas, uma desqualificante, ou duas entre
 * técnicas e antidesportivas; no futsal, vermelho ou dois amarelos.
 */
export function situacao(jogo: Jogo, time: TimeId, jogador: string | null): Situacao {
  const evs = ativos(jogo).filter((e) => e.time === time && e.jogador === jogador);
  const cestas = evs.filter((e) => e.tipo === "ponto");
  const faltas = evs.filter((e) => e.tipo === "falta");
  const motivo = jogador ? regras(jogo).exclusao(faltas) : null;
  return {
    pontos: cestas.reduce((a, e) => a + e.valor, 0),
    cestas,
    faltas,
    lances: evs.filter((e) => e.tipo === "lance").length,
    excluido: motivo !== null,
    motivo,
  };
}

/**
 * Faltas coletivas do time no período. Faltas do banco e cartões não contam.
 * As prorrogações somam com o último período (4º quarto no basquete, 2º tempo no futsal).
 */
export function faltasColetivas(jogo: Jogo, time: TimeId, periodo: number): number {
  const r = regras(jogo);
  if (!r.coletivas) return 0;
  const desde = r.coletivas.somaDesde;
  return ativos(jogo).filter(
    (e) => e.tipo === "falta" && e.time === time && r.contaColetiva(e) && (periodo >= desde ? e.periodo >= desde : e.periodo === periodo),
  ).length;
}

/** Chegou ao limite: a próxima falta vira lance livre (basquete) ou tiro livre (futsal). */
export function estourou(jogo: Jogo, n: number): boolean {
  const c = regras(jogo).coletivas;
  return !!c && n >= c.limite;
}

/** Pontos de um jogador (ou do time inteiro, jogador = undefined) num período. */
export function pontosNoPeriodo(jogo: Jogo, time: TimeId, periodo: number, jogador?: string | null): number {
  return pontos(jogo)
    .filter((e) => e.time === time && e.periodo === periodo && (jogador === undefined || e.jogador === jogador))
    .reduce((a, e) => a + e.valor, 0);
}

export function totalPeriodos(jogo: Jogo): number {
  return Math.max(regras(jogo).periodos, periodoAtual(jogo), ...ativos(jogo).map((e) => e.periodo));
}

/** Último lance desfazível (ponto, lance ou falta), na ordem em que foi registrado. */
export function ultimoLance(jogo: Jogo, time?: TimeId, jogador?: string | null): Evento | null {
  for (let i = jogo.eventos.length - 1; i >= 0; i--) {
    const e = jogo.eventos[i];
    if (e.removido || !["ponto", "lance", "falta"].includes(e.tipo)) continue;
    if (time !== undefined && e.time !== time) continue;
    if (jogador !== undefined && e.jogador !== jogador) continue;
    return e;
  }
  return null;
}

/** Quem ganhou (ou null se empatou). No vôlei, quem ganhou mais sets. */
export function vencedor(jogo: Jogo): TimeId | null {
  const p = regras(jogo).porSets ? sets(jogo) : placar(jogo);
  return p.A === p.B ? null : p.A > p.B ? "A" : "B";
}

// ------------------------------------------------------------- paradas

/** "1:05", "12:30", "1:02:03". */
export function duracao(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function nomePausa(jogo: Jogo, e: Evento): string {
  const m = e.motivo ?? "outro";
  if (m === "tempo" && e.time) return `Tempo ${jogo.times[e.time].sigla}`;
  if (m === "intervalo") return e.periodo === regras(jogo).periodoDoMeio ? "Intervalo do meio" : "Intervalo";
  return MOTIVOS_PAUSA[m];
}

export function limites(jogo: Jogo): LimitesPausa {
  return { ...regras(jogo).limites, ...jogo.jogo.limites };
}

/** Quanto essa parada deveria durar (ms). O intervalo do meio (basquete e futsal) é mais longo. */
export function limitePausa(jogo: Jogo, e: Evento): number {
  const l = limites(jogo);
  switch (e.motivo) {
    case "tempo":
      return l.tempo * 1000;
    case "intervalo":
      return (e.periodo === regras(jogo).periodoDoMeio ? l.meio : l.intervalo) * 1000;
    default:
      return l.outras * 1000;
  }
}

/** A parada em andamento (o jogo está parado agora), se houver. */
export function pausaAberta(jogo: Jogo): Evento | null {
  return ativos(jogo).find((e) => e.tipo === "pausa" && !e.t_fim) ?? null;
}

export interface LinhaPausa {
  evento: Evento;
  nome: string;
  ms: number;
  limite: number;
  /** Passou do esperado (ms); 0 se não passou. */
  excesso: number;
  aberta: boolean;
}

export function pausas(jogo: Jogo, agora = Date.now()): LinhaPausa[] {
  return ativos(jogo)
    .filter((e) => e.tipo === "pausa")
    .map((e) => {
      const ms = (e.t_fim ?? agora) - e.t;
      const limite = limitePausa(jogo, e);
      return { evento: e, nome: nomePausa(jogo, e), ms, limite, excesso: Math.max(0, ms - limite), aberta: !e.t_fim };
    });
}

export interface ResumoPausas {
  quantidade: number;
  totalMs: number;
  /** Tempo parado além do esperado, somado. */
  excessoMs: number;
  acimaDoLimite: number;
  maior: LinhaPausa | null;
  porMotivo: { nome: string; quantidade: number; ms: number }[];
}

export function resumoPausas(jogo: Jogo, agora = Date.now()): ResumoPausas {
  const lista = pausas(jogo, agora);
  const mapa = new Map<string, { nome: string; quantidade: number; ms: number }>();
  for (const p of lista) {
    const nome = MOTIVOS_PAUSA[p.evento.motivo ?? "outro"];
    const m = mapa.get(nome) ?? { nome, quantidade: 0, ms: 0 };
    m.quantidade++;
    m.ms += p.ms;
    mapa.set(nome, m);
  }
  return {
    quantidade: lista.length,
    totalMs: lista.reduce((a, p) => a + p.ms, 0),
    excessoMs: lista.reduce((a, p) => a + p.excesso, 0),
    acimaDoLimite: lista.filter((p) => p.excesso > 0).length,
    maior: lista.reduce<LinhaPausa | null>((m, p) => (!m || p.ms > m.ms ? p : m), null),
    porMotivo: [...mapa.values()].sort((a, b) => b.ms - a.ms),
  };
}

/**
 * Pedidos de tempo do time na faixa em que o período cai. Basquete (FIBA): 2 no 1º tempo,
 * 3 no 2º, 1 por prorrogação. Futsal: 1 por tempo. Vôlei: 2 por set. Null: não há pedido.
 */
export function pedidosDeTempo(jogo: Jogo, time: TimeId, periodo: number): { usados: number; limite: number; rotulo: string } | null {
  const faixa = regras(jogo).tempos(periodo);
  if (!faixa) return null;
  const usados = ativos(jogo).filter(
    (e) => e.tipo === "pausa" && e.motivo === "tempo" && e.time === time && e.periodo >= faixa.de && e.periodo <= faixa.ate,
  ).length;
  return { usados, limite: faixa.limite, rotulo: faixa.rotulo };
}

// ------------------------------------------------------------- relógio de jogo e lados da tela

/** Os times como aparecem na tela, da esquerda para a direita (os dados não mudam). */
export function ladosNaTela(jogo: Jogo): [TimeId, TimeId] {
  return jogo.jogo.invertido ? ["B", "A"] : ["A", "B"];
}

/** Titulares primeiro, depois os reservas; dentro de cada grupo, a ordem do cadastro. */
export function emOrdemDeQuadra(jogadores: Jogador[]): Jogador[] {
  return [...jogadores.filter((j) => !j.reserva), ...jogadores.filter((j) => j.reserva)];
}

/** Quando o período começou: o "Início do jogo" no 1º; o fim do anterior nos outros. */
export function inicioDoPeriodo(jogo: Jogo, p = periodoAtual(jogo)): number | null {
  const ev = ativos(jogo);
  if (p === 1) return ev.find((e) => e.tipo === "inicio")?.t ?? null;
  return ev.filter((e) => e.tipo === "periodo")[p - 2]?.t ?? null;
}

/** Minutos do período (os da prorrogação depois dos regulamentares). 0: sem relógio. */
export function minutosDoPeriodo(jogo: Jogo, p: number): number {
  const t = jogo.jogo.tempo;
  if (!t || !t.periodo) return 0;
  return p <= regras(jogo).periodos ? t.periodo : t.prorrogacao || t.periodo;
}

export interface Relogio {
  /** Duração do período, ms. */
  total: number;
  /** Tempo de bola rolando até agora, ms (paradas não contam). */
  jogado: number;
  restante: number;
  /** O relógio não corre: jogo parado, não iniciado ou encerrado. */
  parado: boolean;
  iniciado: boolean;
  /** Quando o tempo acabou (ms, relógio do aparelho), se já acabou. */
  zerou: number | null;
}

/**
 * Relógio do período atual: corre com o jogo rolando e para em qualquer parada (pedido de tempo,
 * lesão, intervalo…). null quando o jogo não tem tempo definido (vôlei, ou "sem tempo").
 */
export function relogio(jogo: Jogo, agora = Date.now()): Relogio | null {
  const p = periodoAtual(jogo);
  const min = minutosDoPeriodo(jogo, p);
  if (!min) return null;
  const total = min * 60_000;
  const ini = inicioDoPeriodo(jogo, p);
  const encerrado = jogo.jogo.encerrado_em;
  if (ini === null) return { total, jogado: 0, restante: total, parado: true, iniciado: false, zerou: null };
  const fim = Math.max(ini, encerrado ?? agora);

  // Paradas dentro do período, juntas quando se sobrepõem.
  const paradas = ativos(jogo)
    .filter((e) => e.tipo === "pausa" && (e.t_fim ?? fim) > ini && e.t < fim)
    .map((e) => [Math.max(e.t, ini), Math.min(e.t_fim ?? fim, fim)] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  let cursor = ini;
  let jogado = 0;
  let zerou: number | null = null;
  const correr = (ate: number) => {
    const trecho = Math.max(0, ate - cursor);
    if (zerou === null && jogado + trecho >= total) zerou = cursor + (total - jogado);
    jogado += trecho;
  };
  for (const [a, b] of paradas) {
    if (b <= cursor) continue;
    correr(a);
    cursor = Math.max(cursor, b);
  }
  correr(fim);
  return {
    total,
    jogado: Math.min(jogado, total),
    restante: Math.max(0, total - jogado),
    parado: !!encerrado || !!pausaAberta(jogo),
    iniciado: true,
    zerou,
  };
}

/** "9:58", e o último minuto com décimos ("0:42.3") como no placar de ginásio. */
export function relogioTexto(ms: number): string {
  if (ms < 60_000 && ms > 0) return `0:${String(Math.floor(ms / 1000)).padStart(2, "0")}.${Math.floor((ms % 1000) / 100)}`;
  return duracao(Math.ceil(ms / 1000) * 1000);
}
