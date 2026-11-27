import { jsPDF } from "jspdf";
import {
  duracao,
  emOrdemDeQuadra,
  faltasColetivas,
  nomePeriodo,
  pedidosDeTempo,
  periodoAtual,
  placar,
  pontosNoPeriodo,
  resumoPausas,
  sets,
  situacao,
  totalPeriodos,
} from "./estatisticas";
import { regras } from "./regras";
import { infoPadrao } from "./store";
import { textoSobre } from "./cor";
import { corFalta, corQuarto, type Jogo, NOMES_FALTA, type TimeId, TIMES, type TipoFalta } from "./tipos";

type RGB = [number, number, number];
const rgb = (hex: string): RGB => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const ARENA: RGB = [6, 9, 18];
const CARTAO: RGB = [13, 20, 40];
const LARANJA: RGB = [255, 106, 0];
const LINHA: RGB = [214, 218, 228];
const FUNDO_ALT: RGB = [244, 246, 250];
const TINTA: RGB = [14, 18, 32];
const MUDO: RGB = [96, 104, 124];
const BRANCO: RGB = [255, 255, 255];
const CLARO: RGB = [190, 198, 216];
const VERMELHO: RGB = [214, 40, 57];
const AMARELO: RGB = [255, 212, 0];
/** Fundo e texto da casinha de falta ou cartão. */
const tomFalta = (f: TipoFalta | undefined): [RGB, RGB] => {
  const t = corFalta(f);
  return t === "comum" ? [TINTA, BRANCO] : t === "amarelo" ? [AMARELO, TINTA] : [VERMELHO, BRANCO];
};

const limpar = (s: string) => String(s ?? "").replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
const dataBR = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

/** Súmula em A4 deitado, uma página por time (estilo da Súmula Federal). */
export function gerarPDF(jogo: Jogo): jsPDF {
  const d = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;
  const M = 10;
  const info = infoPadrao(jogo);
  const p = placar(jogo);
  const r = regras(jogo);
  // No vôlei o placar final é de sets; os pontos de cada set vão nas parciais.
  const final = r.porSets ? sets(jogo) : p;
  const nPer = totalPeriodos(jogo);
  const per = Array.from({ length: nPer }, (_, i) => i + 1);
  const A = jogo.times.A;
  const B = jogo.times.B;

  const T = (txt: string, x: number, y: number, o: Record<string, unknown> = {}) =>
    d.text(limpar(txt), x, y, { baseline: "middle", ...o });
  const fonte = (tam: number, estilo: "normal" | "bold" = "normal", cor: RGB = TINTA) => {
    d.setFont("helvetica", estilo);
    d.setFontSize(tam);
    d.setTextColor(...cor);
  };
  const casa = (x: number, y: number, w: number, h: number, q: number) => {
    d.setFillColor(...rgb(corQuarto(q)));
    d.rect(x, y, w, h, "F");
    return rgb(textoSobre(corQuarto(q)));
  };

  TIMES.forEach((tid: TimeId, pagina) => {
    if (pagina > 0) d.addPage();
    const time = jogo.times[tid];
    const cor = rgb(time.cor);
    const sobreCor = rgb(textoSobre(time.cor));

    // ---- faixa do cabeçalho
    const HB = 36;
    d.setFillColor(...ARENA);
    d.rect(0, 0, W, HB, "F");
    d.setFillColor(...LARANJA);
    d.rect(0, HB, W, 1.4, "F");
    fonte(8, "bold", LARANJA);
    T(`SÚMULA · ${r.nome}${info.campeonato ? ` · ${info.campeonato}` : ""}`.toUpperCase(), M, 9, { charSpace: 0.6 });
    fonte(20, "bold", BRANCO);
    T(`${A.nome} X ${B.nome}`.toUpperCase(), M, 18.5);
    fonte(8.5, "normal", CLARO);
    T(
      [
        dataBR(info.data),
        info.horario,
        info.local.toUpperCase(),
        info.arbitros && `Árbitros: ${info.arbitros}`,
        info.anotador && `Anotador: ${info.anotador}`,
        `Jogo ${jogo.jogo.id.toUpperCase()}`,
      ]
        .filter(Boolean)
        .join("   ·   "),
      M,
      28.5,
    );

    // placar final
    const pw = 58;
    const px = W - M - pw;
    d.setFillColor(...CARTAO);
    d.rect(px, 5, pw, 26, "F");
    d.setFillColor(...rgb(A.cor));
    d.rect(px, 5, pw / 2, 1.6, "F");
    d.setFillColor(...rgb(B.cor));
    d.rect(px + pw / 2, 5, pw / 2, 1.6, "F");
    fonte(8, "bold", CLARO);
    T(A.sigla, px + pw / 4, 11, { align: "center", charSpace: 0.4 });
    T(B.sigla, px + (3 * pw) / 4, 11, { align: "center", charSpace: 0.4 });
    fonte(24, "bold", BRANCO);
    T(String(final.A), px + pw / 4, 22, { align: "center" });
    T(String(final.B), px + (3 * pw) / 4, 22, { align: "center" });
    fonte(12, "bold", LARANJA);
    T("×", px + pw / 2, 22, { align: "center" });
    if (r.porSets) {
      fonte(5.5, "bold", CLARO);
      T("SETS", px + pw / 2, 28, { align: "center", charSpace: 0.4 });
    }

    // parciais por quarto
    const qw = 15;
    const qg = 2;
    let qx = px - 6 - per.length * (qw + qg) + qg;
    for (const q of per) {
      d.setFillColor(...rgb(corQuarto(q)));
      d.rect(qx, 6, qw, 2.2, "F");
      fonte(6.5, "bold", CLARO);
      T(nomePeriodo(jogo, q, true), qx + qw / 2, 12, { align: "center" });
      fonte(11, "bold", BRANCO);
      T(`${pontosNoPeriodo(jogo, "A", q)}-${pontosNoPeriodo(jogo, "B", q)}`, qx + qw / 2, 19.5, { align: "center" });
      const fc = r.coletivas && q <= r.periodos ? faltasColetivas(jogo, tid, q) : null;
      fonte(5.5, "normal", CLARO);
      if (fc !== null) T(`${fc} falta${fc === 1 ? "" : "s"} ${time.sigla}`, qx + qw / 2, 26, { align: "center" });
      qx += qw + qg;
    }

    // ---- tabela do time
    let y = HB + 6;
    const linhas = emOrdemDeQuadra(time.jogadores).map((j) => ({
      nome: `${j.nome.toUpperCase()}${j.capitao ? " (C)" : ""}${j.reserva ? " · RES" : ""}`,
      num: j.numero,
      id: j.id as string | null,
    }));
    if (situacao(jogo, tid, null).cestas.length || situacao(jogo, tid, null).faltas.length)
      linhas.push({ nome: "EQUIPE (SEM AUTOR / BANCO)", num: "EQ", id: null });
    const sts = linhas.map((l) => situacao(jogo, tid, l.id));
    const melhor = Math.max(0, ...sts.filter((_, i) => linhas[i].id).map((s) => s.pontos));

    const numW = 12;
    const nomeW = 58;
    const fW = 6;
    const xNum = M;
    const xNome = xNum + numW;
    const xF = xNome + nomeW;
    const xDiv = xF + fW * 5 + 2;
    const xP = xDiv + 4.5;
    const totW = 16;
    const xT = W - M - totW;
    const N = Math.max(24, ...sts.map((s) => s.cestas.length));
    const cw = (xT - 2 - xP) / N;
    const cabH = 8;
    const precisa = 18;
    const rh = Math.max(5, Math.min(7.4, (H - M - precisa - y - cabH - 8) / (linhas.length + 1)));

    // faixa com o nome do time
    d.setFillColor(...cor);
    d.rect(M, y, W - 2 * M, 8, "F");
    fonte(11, "bold", sobreCor);
    T(`${time.nome.toUpperCase()} (${time.sigla})`, M + 3, y + 4);
    T(
      r.porSets ? `${final[tid]} SETS · ${p[tid]} PONTOS` : `${p[tid]} ${r.pontos.toUpperCase()}`,
      W - M - 3,
      y + 4,
      { align: "right" },
    );
    y += 8;

    const topo = y;
    d.setFillColor(...CARTAO);
    d.rect(M, y, W - 2 * M, cabH, "F");
    fonte(7, "bold", BRANCO);
    T("Nº", xNum + numW / 2, y + cabH / 2, { align: "center" });
    T("JOGADOR", xNome + 2, y + cabH / 2, { charSpace: 0.3 });
    T(r.coletivas ? "FALTAS" : "CARTÕES", xF + fW * 2.5, y + cabH / 2, { align: "center", charSpace: 0.3 });
    T(
      `${r.pontos.toUpperCase()}  ·  cada casa é ${r.ponto === "cesta" ? "uma" : "um"} ${r.ponto}, a cor diz o ${r.umPeriodo}`,
      xP + 1,
      y + cabH / 2,
      { charSpace: 0.2 },
    );
    T("TOTAL", xT + totW / 2, y + cabH / 2, { align: "center", charSpace: 0.3 });
    y += cabH;

    linhas.forEach((l, i) => {
      const st = sts[i];
      const cy = y + rh / 2;
      const top = !!l.id && st.pontos > 0 && st.pontos === melhor;
      d.setFillColor(...(i % 2 ? FUNDO_ALT : BRANCO));
      d.rect(M, y, W - 2 * M, rh, "F");

      const bs = Math.min(rh - 1.6, 5.6);
      d.setFillColor(...(l.id ? cor : LINHA));
      d.rect(xNum + numW / 2 - bs / 2 - 0.6, cy - bs / 2, bs + 1.2, bs, "F");
      fonte(String(l.num).length > 2 ? 6 : 8, "bold", l.id ? sobreCor : MUDO);
      T(String(l.num || ""), xNum + numW / 2, cy + 0.2, { align: "center" });

      let tam = 8.5;
      fonte(tam, "bold", TINTA);
      const nome = limpar(l.nome);
      const espaco = nomeW - 3 - (st.excluido ? 15 : 0);
      while (d.getTextWidth(nome) > espaco && tam > 5.5) {
        tam -= 0.5;
        d.setFontSize(tam);
      }
      T(nome, xNome + 2, cy);
      if (st.excluido) {
        d.setFillColor(...VERMELHO);
        d.rect(xNome + nomeW - 15, cy - 1.8, 13.5, 3.6, "F");
        fonte(5.5, "bold", BRANCO);
        T("EXCLUÍDO", xNome + nomeW - 8.25, cy + 0.1, { align: "center" });
      }

      for (let k = 0; k < 5; k++) {
        const f = st.faltas[k];
        const bx = xF + fW * k + 0.6;
        const bw = fW - 1.2;
        const bh = Math.min(rh - 1.6, 5.2);
        if (f) {
          const [fundo, letra] = tomFalta(f.falta);
          d.setFillColor(...fundo);
          d.rect(bx, cy - bh / 2, bw, bh, "F");
          fonte(6.5, "bold", letra);
          T(f.falta ?? "P", bx + bw / 2, cy - 0.5, { align: "center" });
          fonte(3.6, "normal", letra);
          T(nomePeriodo(jogo, f.periodo, true), bx + bw - 0.3, cy + bh / 2 - 0.9, { align: "right" });
        } else {
          d.setDrawColor(...LINHA);
          d.setLineWidth(0.25);
          d.rect(bx, cy - bh / 2, bw, bh, "S");
        }
      }

      const ph = Math.min(rh - 1.4, 5.4);
      for (let k = 0; k < N; k++) {
        const bx = xP + cw * k + 0.35;
        const bw = cw - 0.7;
        const e = st.cestas[k];
        if (e) {
          const txt = casa(bx, cy - ph / 2, bw, ph, e.periodo);
          fonte(7.5, "bold", txt);
          T(String(e.valor), bx + bw / 2, cy + 0.2, { align: "center" });
        } else {
          d.setDrawColor(...LINHA);
          d.setLineWidth(0.2);
          d.rect(bx, cy - ph / 2, bw, ph, "S");
        }
      }

      if (top) {
        d.setFillColor(...LARANJA);
        d.rect(xT + 1, y + 0.7, totW - 2, rh - 1.4, "F");
      }
      fonte(10, "bold", top ? BRANCO : st.pontos ? TINTA : MUDO);
      T(String(st.pontos), xT + totW / 2, cy + 0.2, { align: "center" });
      y += rh;
    });

    d.setFillColor(...ARENA);
    d.rect(M, y, W - 2 * M, rh + 1, "F");
    fonte(8.5, "bold", BRANCO);
    T(`TOTAL ${time.sigla}`, xNome + 2, y + (rh + 1) / 2, { charSpace: 0.4 });
    fonte(7, "normal", CLARO);
    T(per.map((q) => `${nomePeriodo(jogo, q, true)} ${pontosNoPeriodo(jogo, tid, q)}`).join("   "), xP + 1, y + (rh + 1) / 2);
    d.setFillColor(...LARANJA);
    d.rect(xT + 1, y + 0.8, totW - 2, rh - 0.6, "F");
    fonte(11, "bold", BRANCO);
    T(String(p[tid]), xT + totW / 2, y + (rh + 1) / 2 + 0.2, { align: "center" });
    d.setFillColor(...cor);
    d.rect(xDiv, topo, 2.5, y - topo, "F");
    y += rh + 1 + 5;

    // legenda
    let lx = M;
    fonte(7, "bold", MUDO);
    T(r.nomePeriodos.toUpperCase(), lx, y, { charSpace: 0.4 });
    lx += 17;
    for (const q of per) {
      casa(lx, y - 2, 5, 4, q);
      fonte(7, "normal", TINTA);
      const r = nomePeriodo(jogo, q, true);
      T(r, lx + 6.5, y);
      lx += 8 + d.getTextWidth(r) + 4;
    }
    lx += 6;
    fonte(7, "bold", MUDO);
    T(r.coletivas ? "FALTAS" : "CARTÕES", lx, y, { charSpace: 0.4 });
    lx += 15;
    for (const k of r.faltas) {
      const [fundo, letra] = tomFalta(k);
      const rot = NOMES_FALTA[k].toLowerCase();
      d.setFillColor(...fundo);
      d.rect(lx, y - 2, 4.5, 4, "F");
      fonte(6, "bold", letra);
      T(k, lx + 2.25, y, { align: "center" });
      fonte(7, "normal", TINTA);
      T(rot, lx + 6, y);
      lx += 8 + d.getTextWidth(rot) + 4;
    }

    // pedidos de tempo e paradas
    y += 7;
    fonte(7, "bold", MUDO);
    T("PEDIDOS DE TEMPO", M, y, { charSpace: 0.4 });
    let tx = M + 33;
    const faixas = r.faixasTempo.length ? r.faixasTempo : Array.from({ length: periodoAtual(jogo) }, (_, i) => i + 1);
    for (const ref of faixas) {
      const pt = pedidosDeTempo(jogo, tid, ref);
      if (!pt) continue;
      fonte(7, "normal", TINTA);
      T(pt.rotulo, tx, y);
      tx += d.getTextWidth(pt.rotulo) + 2;
      for (let k = 0; k < Math.max(pt.limite, pt.usados); k++) {
        d.setFillColor(...(k < pt.usados ? (k < pt.limite ? cor : VERMELHO) : BRANCO));
        d.setDrawColor(...LINHA);
        d.setLineWidth(0.25);
        d.rect(tx, y - 2, 4, 4, k < pt.usados ? "F" : "S");
        tx += 5;
      }
      tx += 6;
    }
    const rp = resumoPausas(jogo);
    if (rp.quantidade) {
      fonte(7, "bold", MUDO);
      T("PARADAS", tx + 4, y, { charSpace: 0.4 });
      fonte(7, "normal", TINTA);
      T(
        `${rp.quantidade} · ${duracao(rp.totalMs)} parado` +
          (rp.excessoMs ? ` · ${rp.acimaDoLimite} acima do normal (+${duracao(rp.excessoMs)})` : "") +
          (rp.maior ? ` · maior: ${rp.maior.nome} ${duracao(rp.maior.ms)}` : ""),
        tx + 21,
        y,
      );
    }

    // assinaturas
    const sy = Math.min(H - 14, y + 13);
    const nomes = ["Árbitro", "Anotador", `Capitão / Técnico ${time.nome}`];
    const sw = (W - 2 * M - 2 * 16) / 3;
    nomes.forEach((n, k) => {
      const sx = M + k * (sw + 16);
      d.setDrawColor(...TINTA);
      d.setLineWidth(0.35);
      d.line(sx, sy, sx + sw, sy);
      fonte(7.5, "normal", MUDO);
      T(n, sx + sw / 2, sy + 4, { align: "center" });
    });
  });

  // rodapé em todas as páginas
  const paginas = d.getNumberOfPages();
  const agora = new Date();
  const p2 = (x: number) => String(x).padStart(2, "0");
  const carimbo = `Gerada em ${p2(agora.getDate())}/${p2(agora.getMonth() + 1)}/${agora.getFullYear()} às ${p2(agora.getHours())}:${p2(agora.getMinutes())} · horários de cada lance no .json`;
  for (let pg = 1; pg <= paginas; pg++) {
    d.setPage(pg);
    d.setFillColor(...ARENA);
    d.rect(0, H - 6, W, 6, "F");
    d.setFillColor(...LARANJA);
    d.rect(0, H - 6, W, 0.8, "F");
    fonte(6.5, "bold", LARANJA);
    T(`${A.sigla} ${p.A} × ${p.B} ${B.sigla}`, M, H - 2.8, { charSpace: 0.4 });
    fonte(6.5, "normal", CLARO);
    T(`${carimbo}  ·  página ${pg}/${paginas}`, W - M, H - 2.8, { align: "right" });
  }
  return d;
}
