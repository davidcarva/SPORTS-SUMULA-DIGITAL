import { textoSobre } from "./cor";
import { nomePeriodo, placar, pontosNoPeriodo, sets, situacao, totalPeriodos } from "./estatisticas";
import { regras } from "./regras";
import { infoPadrao } from "./store";
import { corQuarto, type Jogo, type TimeId } from "./tipos";

export const STORY_W = 1080;
export const STORY_H = 1920;

const DISPLAY = '"Barlow Condensed", "Arial Narrow", sans-serif';
const TEXTO = '"Inter Variable", Inter, system-ui, sans-serif';
/** Cores do story: as mesmas do app (grafite). */
function paleta() {
  return { papel: "#0b0b0b", cartao: "#141414", tinta: "#f2f0ea", fraco: "#9c988f", linha: "rgba(242,240,234,0.14)", grade: "rgba(242,240,234,0.05)", forte: 0.42, sombra: "rgba(0,0,0,0.6)" };
}

/** Cor do time com transparência (cores dos times são sempre #rrggbb). */
const alfa = (cor: string, a: number) => `${cor}${Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0")}`;

/** Garante as fontes antes de desenhar (o canvas não espera a fonte carregar sozinho). */
export async function carregarFontesStory() {
  try {
    await Promise.all([
      document.fonts.load(`italic 900 100px ${DISPLAY}`),
      document.fonts.load(`italic 800 100px ${DISPLAY}`),
      document.fonts.load(`italic 700 100px ${DISPLAY}`),
      document.fonts.load(`600 40px ${DISPLAY}`),
      document.fonts.load(`600 30px ${TEXTO}`),
    ]);
  } catch {
    /* desenha com a fonte reserva */
  }
}

const disp = (peso: number, tam: number) => `italic ${peso} ${tam}px ${DISPLAY}`;
const reta = (tam: number) => `600 ${tam}px ${DISPLAY}`;

/** Polígono com cantos cortados (o "chanfro" do app). */
function chanfro(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, k: number) {
  c.beginPath();
  c.moveTo(x + k, y);
  c.lineTo(x + w, y);
  c.lineTo(x + w, y + h - k);
  c.lineTo(x + w - k, y + h);
  c.lineTo(x, y + h);
  c.lineTo(x, y + k);
  c.closePath();
}

function octogono(c: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
}

/** Encolhe a fonte até o texto caber. */
function caber(c: CanvasRenderingContext2D, txt: string, max: number, peso: number, tam: number, min = 18) {
  let t = tam;
  c.font = disp(peso, t);
  while (c.measureText(txt).width > max && t > min) {
    t -= 2;
    c.font = disp(peso, t);
  }
  return t;
}

function quebrar(c: CanvasRenderingContext2D, txt: string, max: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const parte of txt.split(" · ")) {
    const tentativa = atual ? `${atual} · ${parte}` : parte;
    if (c.measureText(tentativa).width > max && atual) {
      linhas.push(atual);
      atual = parte;
    } else atual = tentativa;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

export interface OpcoesStory {
  time: TimeId;
  titulo: string;
  faixa: string;
}

export function desenharStory(canvas: HTMLCanvasElement, jogo: Jogo, o: OpcoesStory) {
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const c = canvas.getContext("2d");
  if (!c) return;
  const W = STORY_W;
  const tid = o.time;
  const outro: TimeId = tid === "A" ? "B" : "A";
  const time = jogo.times[tid];
  const adv = jogo.times[outro];
  const cor = time.cor;
  const sobre = textoSobre(cor);
  const info = infoPadrao(jogo);
  const r = regras(jogo);
  // No vôlei o placar grande é de sets.
  const p = r.porSets ? sets(jogo) : placar(jogo);
  const ano = info.data.slice(0, 4) || String(new Date().getFullYear());
  const dataCurta = /^(\d{4})-(\d{2})-(\d{2})$/.exec(info.data);
  const dataTxt = dataCurta ? `${dataCurta[3]}.${dataCurta[2]}.${dataCurta[1].slice(2)}` : info.data;

  // ---- fundo: papel com grade fina; cada metade com a cor de um time, mais forte embaixo
  const P = paleta();
  const corA = jogo.times.A.cor;
  const corB = jogo.times.B.cor;
  c.fillStyle = P.papel;
  c.fillRect(0, 0, W, STORY_H);
  for (const [x0, cl] of [[0, corA], [W / 2, corB]] as const) {
    const g = c.createLinearGradient(0, STORY_H, 0, 0);
    g.addColorStop(0, alfa(cl, P.forte));
    g.addColorStop(0.7, alfa(cl, P.forte * 0.25));
    g.addColorStop(1, alfa(cl, P.forte * 0.6));
    c.fillStyle = g;
    c.fillRect(x0, 0, W / 2, STORY_H);
    // a borda da "onda" que encheu a metade
    c.strokeStyle = cl;
    c.lineWidth = 5;
    c.beginPath();
    for (let x = 0; x <= W / 2; x += 4) {
      const y = 1880 + Math.sin((x / (W / 2)) * Math.PI * 4) * 10;
      if (x === 0) c.moveTo(x0 + x, y);
      else c.lineTo(x0 + x, y);
    }
    c.stroke();
  }
  c.strokeStyle = P.grade;
  c.lineWidth = 1;
  for (let x = 0; x <= W; x += 54) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, STORY_H);
    c.stroke();
  }
  for (let y = 0; y <= STORY_H; y += 54) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(W, y);
    c.stroke();
  }
  // linha do meio e círculo central, como na quadra
  c.strokeStyle = P.linha;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(W / 2, 0);
  c.lineTo(W / 2, STORY_H);
  c.stroke();
  c.beginPath();
  c.arc(W / 2, STORY_H / 2, 260, 0, Math.PI * 2);
  c.stroke();

  // ---- topo
  c.textBaseline = "middle";
  c.fillStyle = P.tinta;
  c.font = reta(30);
  c.textAlign = "left";
  c.fillText(ano, 64, 78);
  c.textAlign = "right";
  c.fillStyle = P.fraco;
  c.fillText((info.local || r.nome).toUpperCase(), W - 64, 78);
  c.textAlign = "center";
  c.fillStyle = P.tinta;
  c.font = disp(800, 34);
  c.fillText((info.campeonato || jogo.jogo.nome).toUpperCase().slice(0, 34), W / 2, 78);

  // cinco brasões
  for (let i = 0; i < 5; i++) {
    octogono(c, W / 2 + (i - 2) * 58, 150, 20);
    c.fillStyle = i === 2 ? P.tinta : i < 2 ? corA : corB;
    c.fill();
  }

  // ---- título
  const titulo = (o.titulo || "Vitória").toUpperCase();
  const tt = caber(c, titulo, W - 120, 900, 220, 90);
  c.font = disp(900, tt);
  // Bloco de destaque, como no app: cor do time deslocada atrás, tinta na frente, letra em papel.
  const tw = c.measureText(titulo).width + 70;
  const th = tt * 0.92;
  c.fillStyle = cor;
  c.fillRect(W / 2 - tw / 2 + 16, 300 - th / 2 + 16, tw, th);
  c.fillStyle = P.tinta;
  c.fillRect(W / 2 - tw / 2, 300 - th / 2, tw, th);
  c.fillStyle = P.papel;
  c.fillText(titulo, W / 2, 300 + tt * 0.04);

  // faixa inclinada
  const faixa = (o.faixa || `${r.nome} · ${jogo.jogo.nome}`).toUpperCase();
  c.save();
  c.translate(W / 2, 450);
  c.rotate((-2 * Math.PI) / 180);
  const tf = caber(c, faixa, W - 380, 800, 58, 26);
  c.font = disp(800, tf);
  const fw = c.measureText(faixa).width + 60;
  c.fillStyle = cor;
  chanfro(c, -fw / 2 + 10, -38 + 10, fw, 76, 14);
  c.fill();
  c.fillStyle = P.cartao;
  chanfro(c, -fw / 2, -38, fw, 76, 14);
  c.fill();
  c.strokeStyle = cor;
  c.lineWidth = 3;
  c.stroke();
  c.fillStyle = P.tinta;
  c.fillText(faixa, 0, 2);
  c.restore();

  // ---- placar
  const py = 560;
  const ph = 330;
  const lado = (t: TimeId, x: number, w: number, destaque: boolean) => {
    const tm = jogo.times[t];
    c.save();
    chanfro(c, x, py, w, ph, 36);
    c.fillStyle = destaque ? tm.cor : P.cartao;
    c.fill();
    c.strokeStyle = tm.cor;
    c.lineWidth = 4;
    c.stroke();
    c.clip();
    c.fillStyle = destaque ? textoSobre(tm.cor) : P.tinta;
    c.textAlign = "center";
    c.font = disp(800, 58);
    c.fillText(tm.sigla, x + w / 2, py + 62);
    c.font = disp(900, 220);
    c.fillText(String(p[t]), x + w / 2, py + 200);
    c.font = reta(26);
    const nm = tm.nome.toUpperCase();
    let tn = 26;
    while (c.measureText(nm).width > w - 50 && tn > 14) {
      tn -= 2;
      c.font = reta(tn);
    }
    c.fillText(nm, x + w / 2, py + ph - 36);
    c.restore();
  };
  lado(tid, 70, 430, true);
  lado(outro, W - 70 - 430, 430, false);
  c.fillStyle = P.fraco;
  c.font = disp(900, 90);
  c.textAlign = "center";
  c.fillText("×", W / 2, py + ph / 2);

  // selo
  c.save();
  c.translate(W - 128, py + 18);
  c.rotate((13 * Math.PI) / 180);
  octogono(c, 0, 0, 92);
  c.fillStyle = P.tinta;
  c.fill();
  octogono(c, 0, 0, 79);
  c.strokeStyle = P.papel;
  c.lineWidth = 4;
  c.stroke();
  c.fillStyle = P.papel;
  c.font = disp(900, 36);
  c.fillText(p[tid] > p[outro] ? "VENCEU" : p[tid] === p[outro] ? "EMPATE" : "FINAL", 0, -14);
  c.font = reta(26);
  c.fillText(dataTxt, 0, 26);
  c.restore();

  // ---- cartão da súmula
  const cx = 70;
  const cy = 960;
  const cw = W - 140;
  const lista = time.jogadores
    .map((j) => ({ j, st: situacao(jogo, tid, j.id) }))
    .filter((l) => l.st.pontos > 0)
    .sort((a, b) => b.st.pontos - a.st.pontos)
    .slice(0, 6);
  const rh = 64;
  const ch = 76 + 40 + Math.max(1, lista.length) * rh + 170;

  c.save();
  c.translate(cx + cw / 2, cy + ch / 2);
  c.rotate((-2 * Math.PI) / 180);
  c.translate(-(cx + cw / 2), -(cy + ch / 2));
  c.shadowColor = P.sombra;
  c.shadowBlur = 50;
  c.shadowOffsetY = 30;
  chanfro(c, cx, cy, cw, ch, 30);
  c.fillStyle = P.cartao;
  c.fill();
  c.shadowColor = "transparent";
  c.strokeStyle = cor;
  c.lineWidth = 3;
  c.stroke();

  // cabeçalho do cartão
  c.save();
  chanfro(c, cx, cy, cw, ch, 30);
  c.clip();
  c.fillStyle = cor;
  c.fillRect(cx, cy, cw, 76);
  c.restore();
  c.fillStyle = sobre;
  c.textAlign = "left";
  c.font = disp(800, 40);
  c.fillText(`SÚMULA · ${time.sigla} × ${adv.sigla}`, cx + 36, cy + 40);
  c.textAlign = "right";
  c.font = reta(24);
  c.fillText([dataTxt, info.horario].filter(Boolean).join(" · "), cx + cw - 32, cy + 40);

  // colunas
  const colNum = cx + 32;
  const colNome = cx + 104;
  const colCestas = cx + cw - 32 - 80 - 330;
  const colPts = cx + cw - 32;
  c.fillStyle = P.fraco;
  c.font = reta(18);
  c.textAlign = "left";
  const yl = cy + 76 + 22;
  c.fillText("Nº", colNum, yl);
  c.fillText("JOGADOR", colNome, yl);
  c.fillText(`${r.pontos.toUpperCase()} (cor = ${r.umPeriodo})`, colCestas, yl);
  c.textAlign = "right";
  c.fillText("PTS", colPts, yl);

  let y = cy + 76 + 40;
  if (!lista.length) {
    c.textAlign = "center";
    c.fillStyle = P.fraco;
    c.font = reta(28);
    c.fillText(r.ponto === "cesta" ? "Sem cestas registradas" : `Sem ${r.pontos} registrados`, cx + cw / 2, y + rh / 2);
  }
  lista.forEach(({ j, st }, i) => {
    const meio = y + rh / 2;
    if (i === 0) {
      chanfro(c, cx + 18, y + 3, cw - 36, rh - 6, 12);
      c.fillStyle = cor;
      c.fill();
    } else {
      c.strokeStyle = P.linha;
      c.setLineDash([8, 8]);
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(cx + 30, y);
      c.lineTo(cx + cw - 30, y);
      c.stroke();
      c.setLineDash([]);
    }
    const ink = i === 0 ? sobre : P.tinta;
    c.textAlign = "left";
    c.fillStyle = i === 0 ? sobre : cor;
    c.font = disp(800, 34);
    c.fillText(j.numero || "–", colNum, meio);
    c.fillStyle = ink;
    const nome = j.nome.toUpperCase();
    const espaco = colCestas - colNome - (i === 0 ? 150 : 20);
    caber(c, nome, espaco, 800, 36, 20);
    c.fillText(nome, colNome, meio);
    if (i === 0) {
      const nw = c.measureText(nome).width;
      c.font = reta(17);
      const tw = c.measureText("CESTINHA").width + 18;
      c.fillStyle = P.tinta;
      c.fillRect(colNome + nw + 14, meio - 15, tw, 30);
      c.fillStyle = cor;
      c.fillText("CESTINHA", colNome + nw + 23, meio + 1);
    }
    // casas de cesta
    const n = st.cestas.length;
    const lado = Math.max(18, Math.min(44, (330 - (n - 1) * 6) / Math.max(n, 1)));
    st.cestas.forEach((e, k) => {
      const bx = colCestas + k * (lado + 6);
      if (bx + lado > colCestas + 340) return;
      c.fillStyle = corQuarto(e.periodo);
      c.fillRect(bx, meio - lado / 2, lado, lado);
      if (i === 0) {
        c.strokeStyle = P.papel;
        c.lineWidth = 2;
        c.strokeRect(bx, meio - lado / 2, lado, lado);
      }
      c.fillStyle = textoSobre(corQuarto(e.periodo));
      c.textAlign = "center";
      c.font = disp(800, Math.round(lado * 0.62));
      c.fillText(String(e.valor), bx + lado / 2, meio + 1);
    });
    c.textAlign = "right";
    c.fillStyle = ink;
    c.font = disp(900, 44);
    c.fillText(String(st.pontos), colPts, meio);
    y += rh;
  });

  // parciais e total
  y += 18;
  c.fillStyle = cor;
  c.fillRect(cx + 32, y, cw - 64, 4);
  y += 26;
  const nPer = Math.min(totalPeriodos(jogo), 6);
  const larg = (cw - 64 - 230) / nPer;
  for (let q = 1; q <= nPer; q++) {
    const qx = cx + 32 + (q - 1) * larg;
    c.fillStyle = corQuarto(q);
    c.fillRect(qx, y, larg - 14, 10);
    c.fillStyle = P.fraco;
    c.textAlign = "left";
    c.font = reta(18);
    c.fillText(nomePeriodo(jogo, q, true), qx, y + 34);
    c.fillStyle = P.tinta;
    c.font = disp(900, 60);
    c.fillText(String(pontosNoPeriodo(jogo, tid, q)), qx, y + 86);
  }
  c.textAlign = "right";
  c.fillStyle = cor;
  c.font = reta(24);
  c.fillText(r.porSets ? "SETS" : "TOTAL", cx + cw - 32, y + 14);
  c.fillStyle = P.tinta;
  c.font = disp(900, 130);
  c.fillText(String(p[tid]), cx + cw - 32, y + 82);
  c.restore();

  // ---- elenco
  const ey = Math.max(cy + ch + 70, 1700);
  c.textAlign = "center";
  c.fillStyle = P.fraco;
  c.font = disp(800, 30);
  c.fillText(`ELENCO · ${time.nome.toUpperCase()}`, W / 2, ey);
  c.fillStyle = P.tinta;
  c.font = reta(25);
  const elenco = time.jogadores.map((j) => `${j.numero} ${j.nome}`.trim().toUpperCase()).join(" · ");
  quebrar(c, elenco, W - 160)
    .slice(0, 4)
    .forEach((l, i) => c.fillText(l, W / 2, ey + 46 + i * 34));

  // rodapé
  c.fillStyle = P.fraco;
  c.font = reta(18);
  c.fillText(`súmula digital · jogo ${jogo.jogo.id.toUpperCase()}`, W / 2, STORY_H - 34);
}

export function storyComoBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((r) => canvas.toBlob(r, "image/png"));
}
