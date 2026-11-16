import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { situacao } from "@/lib/estatisticas";
import type { Evento, Jogo, TipoFalta } from "@/lib/tipos";
import { Destaque } from "./Destaque";
import {
  type Bloco,
  CAM_ABERTURA,
  type Contexto,
  caminho,
  circulo,
  DESENHOS,
  DesenhoBloco,
  DesenhoBola,
  entre,
  limitar,
  nomeCurto,
  type P3,
  QuadraIso,
  suave,
} from "./QuadraIso";

/**
 * A cada lance, uma cena curta na quadra isométrica: cesta, gol, ponto de vôlei, falta ou cartão.
 * Tudo corre até o momento do impacto; ali o tempo congela (hitstop), a câmera treme, a tela pisca
 * na cor do time e o nome do lance entra com um soco. Não bloqueia toques: o mesário segue marcando.
 */

/** Quanto o tempo fica congelado no impacto. */
const HITSTOP = 170;
const TREME = 380;

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: P3, b: P3, k: number): P3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
/** Trajetória de bola: reta no chão, parábola na altura (`topo` é a altura máxima). */
const voo = (a: P3, b: P3, topo: number, k: number): P3 => {
  const base = lerp3(a, b, k);
  const h = Math.max(0, topo - (a[2] + b[2]) / 2);
  return [base[0], base[1], base[2] + 4 * h * k * (1 - k)];
};
const sobe = (t: number) => 1 - (1 - t) ** 3;

interface Cena {
  /** Momento do impacto, no tempo da animação (sem contar o hitstop). */
  impacto: number;
  duracao: number;
  /** Ponto da quadra para onde a câmera olha. */
  foco: P3;
  zoom: number;
  titulo: string;
  sub: string;
  atores: (c: Contexto, t: number) => ReactNode;
}

interface Pessoa {
  numero: string;
  nome: string;
  cor: string;
}

const CARTAO: Partial<Record<TipoFalta, { cor: string; nome: string }>> = {
  A: { cor: "#ffd400", nome: "Amarelo" },
  V: { cor: "#e11d2e", nome: "Vermelho" },
  D: { cor: "#e11d2e", nome: "Desqualificante" },
  U: { cor: "#ff8a00", nome: "Antidesportiva" },
  T: { cor: "#f2f0ea", nome: "Técnica" },
};

/** Anel que se espalha no chão (bola batendo, aro balançando). */
function Onda({ c, x, y, z = 0, t, cor, raio = 2.4 }: { c: Contexto; x: number; y: number; z?: number; t: number; cor: string; raio?: number }) {
  if (t <= 0 || t >= 1) return null;
  const r = (0.2 + sobe(t) * raio) * c.escala;
  return (
    <path d={caminho(circulo(x, y, r, z).map(c.p), true)} fill="none" stroke={cor} strokeWidth={c.px * (4 - 3 * t)} opacity={1 - t} />
  );
}

/** Estrela de impacto: traços saindo do ponto, desenhados na tela (não no chão). */
function Estouro({ c, em, t, cor }: { c: Contexto; em: P3; t: number; cor: string }) {
  if (t <= 0 || t >= 1) return null;
  const [x, y] = c.p(em);
  const r0 = (0.5 + t * 1.6) * c.escala;
  const r1 = r0 + (1.4 - t) * 1.2 * c.escala;
  return (
    <g opacity={1 - t * t}>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.3;
        return (
          <line
            key={i}
            x1={x + Math.cos(a) * r0}
            y1={y + Math.sin(a) * r0 * 0.8}
            x2={x + Math.cos(a) * r1}
            y2={y + Math.sin(a) * r1 * 0.8}
            stroke={i % 2 ? "var(--foreground)" : cor}
            strokeWidth={c.px * 3}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

/** Desenha os blocos do mais distante para o mais perto. */
function Blocos({ c, blocos }: { c: Contexto; blocos: Bloco[] }) {
  return (
    <>
      {[...blocos]
        .sort((a, b) => c.fundo(a.x, a.y) - c.fundo(b.x, b.y))
        .map((b) => (
          <DesenhoBloco key={b.chave} c={c} b={b} />
        ))}
    </>
  );
}

// ------------------------------------------------------------------ cenas

function cesta(s: number, quem: Pessoa, rival: string, valor: number): Cena {
  const d = DESENHOS.basquete;
  const bola = d.bola.cor;
  const aro: P3 = [s * (d.hx - 1.575), 0, 3.05];
  const pe: [number, number] = valor === 1 ? [s * (d.hx - 5.8), 0] : valor === 3 ? [s * (d.hx - 8.4), 2.4 * s] : [s * (d.hx - 4.4), -2.2 * s];
  const defesa: [number, number] = [lerp(pe[0], aro[0], 0.32), pe[1] + 0.9];
  const lancaEm = valor === 1 ? 380 : 470;
  const impacto = valor === 3 ? 1150 : valor === 1 ? 980 : 1020;
  const topo = valor === 3 ? 7.8 : valor === 1 ? 5.6 : 6.4;
  const salto = valor === 1 ? 0.15 : 1.1;

  return {
    impacto,
    duracao: impacto + 1250,
    foco: [lerp(pe[0], aro[0], 0.55), lerp(pe[1], 0, 0.5), 2],
    zoom: valor === 3 ? 1.7 : 1.95,
    titulo: `+${valor}`,
    sub: valor === 1 ? "Lance livre" : valor === 3 ? "Bola de três" : "Cesta",
    atores: (c, t) => {
      const agacha = entre(t, [0, 260]);
      const voa = entre(t, [260, 480]);
      const cai = entre(t, [700, 950]);
      const z = salto * (valor === 1 ? Math.sin(voa * Math.PI) : sobe(voa) * (1 - cai));
      const esticar = t < 260 ? 1 - 0.25 * agacha : t < 480 ? 0.75 + 0.4 * voa : 1.15 - 0.15 * cai;
      // Bola: na mão até o arremesso, voa até o aro, cai pela rede e quica.
      const mao: P3 = [pe[0], pe[1], z + 2.4];
      let b: P3;
      if (t < lancaEm) b = mao;
      else if (t < impacto) b = voo(mao, [aro[0], aro[1], aro[2] + 0.25], topo, (t - lancaEm) / (impacto - lancaEm));
      else {
        const q = entre(t, [impacto, impacto + 420]);
        const quique = entre(t, [impacto + 420, impacto + 800]);
        b = [aro[0] - s * 0.4 * q, 0.2 * q, q < 1 ? aro[2] * (1 - q * q) : 0.9 * Math.sin(quique * Math.PI)];
      }
      const pulaDefesa = entre(t, [lancaEm - 80, lancaEm + 320]);
      return (
        <>
          <Blocos
            c={c}
            blocos={[
              { chave: "def", x: defesa[0], y: defesa[1], z: Math.sin(pulaDefesa * Math.PI) * 0.8, cor: rival, opacidade: 0.85 },
              { chave: "eu", x: pe[0], y: pe[1], z, esticar, cor: quem.cor, numero: quem.numero, nome: quem.nome, destaque: true },
            ]}
          />
          <Onda c={c} x={aro[0]} y={aro[1]} z={aro[2]} t={entre(t, [impacto, impacto + 520])} cor={quem.cor} raio={1.4} />
          <DesenhoBola c={c} x={b[0]} y={b[1]} z={b[2]} cor={bola} />
          <Estouro c={c} em={aro} t={entre(t, [impacto, impacto + 360])} cor={quem.cor} />
        </>
      );
    },
  };
}

function gol(s: number, quem: Pessoa, rival: string): Cena {
  const d = DESENHOS.futsal;
  const bola = d.bola.cor;
  const pe: [number, number] = [s * (d.hx - 8), -2.6 * s];
  const alvo: P3 = [s * (d.hx + 0.35), 0.8, 1.15];
  const goleiro: [number, number] = [s * (d.hx - 0.9), -0.2];
  const chute = 460;
  const impacto = 860;
  return {
    impacto,
    duracao: impacto + 1300,
    foco: [s * (d.hx - 3.5), -0.5, 1],
    zoom: 2.1,
    titulo: "Gol",
    sub: "Bola na rede",
    atores: (c, t) => {
      const corre = sobe(entre(t, [0, chute]));
      const x = pe[0] - s * 3 * (1 - corre);
      const pender = t < chute ? s * 0.3 * corre : s * 0.6 * (1 - entre(t, [chute, chute + 400]));
      let b: P3;
      if (t < chute) b = [x + s * 0.7, pe[1] + 0.2, 0];
      else if (t < impacto) b = voo([pe[0] + s * 0.7, pe[1] + 0.2, 0], alvo, 1.6, (t - chute) / (impacto - chute));
      else {
        const q = entre(t, [impacto, impacto + 500]);
        b = [alvo[0] + s * 0.5 * Math.sin(q * Math.PI), alvo[1], alvo[2] * (1 - q)];
      }
      // Rede estufa no impacto e balança até parar.
      const r = entre(t, [impacto, impacto + 900]);
      const estufa = t < impacto ? 0 : Math.sin(r * Math.PI * 3) * (1 - r) * 1.1;
      const fundo = d.hx + 1 + estufa;
      const mergulho = entre(t, [chute + 60, impacto + 80]);
      const rede = [
        [[s * d.hx, -1.5, 2], [s * fundo, 0.8, 0.9], [s * d.hx, 1.5, 2]],
        [[s * d.hx, -1.5, 0], [s * fundo, 0.8, 0.9], [s * d.hx, 1.5, 0]],
        [[s * d.hx, 0, 2], [s * fundo, 0.8, 0.9], [s * d.hx, 0, 0]],
      ] as P3[][];
      return (
        <>
          {estufa !== 0 &&
            rede.map((l, i) => <path key={i} d={caminho(l.map(c.p))} fill="none" stroke={quem.cor} strokeWidth={c.px * 2} />)}
          <Blocos
            c={c}
            blocos={[
              {
                chave: "gk",
                x: goleiro[0],
                y: goleiro[1] + 1.3 * sobe(mergulho),
                z: Math.sin(mergulho * Math.PI) * 0.6,
                esticar: 1 - 0.35 * mergulho,
                pender: s * -0.5 * mergulho,
                cor: rival,
                opacidade: 0.85,
              },
              { chave: "eu", x, y: pe[1], pender, cor: quem.cor, numero: quem.numero, nome: quem.nome, destaque: true },
            ]}
          />
          <DesenhoBola c={c} x={b[0]} y={b[1]} z={b[2]} cor={bola} raio={0.34} />
          <Estouro c={c} em={alvo} t={entre(t, [impacto, impacto + 380])} cor={quem.cor} />
        </>
      );
    },
  };
}

function pontoVolei(s: number, quem: Pessoa, rival: string): Cena {
  const bola = DESENHOS.volei.bola.cor;
  const ataque: [number, number] = [-s * 1.1, 1.4 * s];
  const bloqueio: [number, number] = [s * 0.8, 1.2 * s];
  const levantou: P3 = [-s * 3.2, -1.2 * s, 2.4];
  const contato: P3 = [-s * 0.8, 1.4 * s, 3.6];
  const chao: P3 = [s * 5.6, -2.3 * s, 0];
  const bate = 640;
  const impacto = 860;
  return {
    impacto,
    duracao: impacto + 1300,
    foco: [s * 1.5, 0, 1.5],
    zoom: 1.45,
    titulo: "Ponto",
    sub: "Ataque",
    atores: (c, t) => {
      const pulo = entre(t, [330, 720]);
      const z = Math.sin(pulo * Math.PI) * 1.15;
      const esticar = t < 330 ? 1 - 0.22 * entre(t, [120, 330]) : 1.1;
      let b: P3;
      if (t < bate) b = voo(levantou, contato, 5.2, entre(t, [0, bate]));
      else if (t < impacto) b = lerp3(contato, chao, (t - bate) / (impacto - bate));
      else {
        const q = entre(t, [impacto, impacto + 700]);
        b = voo(chao, [chao[0] + s * 3.5, chao[1] - 1.5 * s, 0], 1.8, q);
      }
      const bloco = entre(t, [430, 820]);
      return (
        <>
          <Onda c={c} x={chao[0]} y={chao[1]} t={entre(t, [impacto, impacto + 600])} cor={quem.cor} raio={3} />
          <Onda c={c} x={chao[0]} y={chao[1]} t={entre(t, [impacto + 120, impacto + 760])} cor="var(--foreground)" raio={2} />
          <Blocos
            c={c}
            blocos={[
              { chave: "bl", x: bloqueio[0], y: bloqueio[1], z: Math.sin(bloco * Math.PI) * 0.9, cor: rival, opacidade: 0.85 },
              { chave: "eu", x: ataque[0], y: ataque[1], z, esticar, pender: s * 0.35 * pulo, cor: quem.cor, numero: quem.numero, nome: quem.nome, destaque: true },
            ]}
          />
          <DesenhoBola c={c} x={b[0]} y={b[1]} z={b[2]} cor={bola} raio={0.3} />
          <Estouro c={c} em={chao} t={entre(t, [impacto, impacto + 380])} cor={quem.cor} />
        </>
      );
    },
  };
}

function falta(jogo: Jogo, s: number, quem: Pessoa, rival: string, tipo: TipoFalta, excluido: boolean): Cena {
  const d = DESENHOS[jogo.jogo.modalidade];
  const e = d.hx / 14;
  // A falta acontece na defesa de quem cometeu: perto da própria linha de fundo.
  const local: [number, number] = [-s * d.hx * 0.45, 0.3];
  const vitima: [number, number] = [local[0], local[1]];
  const ini: [number, number] = [local[0] + s * 2.6 * e, local[1] - 0.9 * e];
  const impacto = 520;
  const cartao = CARTAO[tipo];
  const titulo = excluido ? "Excluído" : cartao ? cartao.nome : "Falta";
  return {
    impacto,
    duracao: impacto + (cartao || excluido ? 1700 : 1250),
    foco: [local[0] + s * 1 * e, local[1], 1.5 * e],
    zoom: 2.2,
    titulo,
    sub: cartao && !excluido ? "Cartão" : excluido ? "Fora do jogo" : "Apito",
    atores: (c, t) => {
      const vem = sobe(entre(t, [0, impacto]));
      const fx = lerp(ini[0], vitima[0] + s * 0.95 * e, vem);
      const fy = lerp(ini[1], vitima[1] - 0.2 * e, vem);
      const empurra = entre(t, [impacto, impacto + 600]);
      const cai = sobe(empurra);
      const sobeCartao = sobe(entre(t, [impacto + 250, impacto + 800]));
      const gira = t * 0.006;
      const cz = 2.6 * e + sobeCartao * 2 * e;
      const w = 0.55 * e;
      const h = 0.8 * e;
      const cx = fx;
      const cy = fy;
      const card: P3[] = [
        [cx - Math.cos(gira) * w, cy - Math.sin(gira) * w, cz],
        [cx + Math.cos(gira) * w, cy + Math.sin(gira) * w, cz],
        [cx + Math.cos(gira) * w, cy + Math.sin(gira) * w, cz + h * 2],
        [cx - Math.cos(gira) * w, cy - Math.sin(gira) * w, cz + h * 2],
      ];
      const balao = c.p([vitima[0], vitima[1], 2.3 * e]);
      return (
        <>
          <Blocos
            c={c}
            blocos={[
              {
                chave: "vit",
                x: vitima[0] - s * 1.4 * e * cai,
                y: vitima[1] + 0.3 * cai,
                z: Math.sin(empurra * Math.PI) * 0.6 * e,
                pender: -s * 0.9 * e * cai,
                esticar: 1 - 0.25 * cai,
                cor: rival,
                opacidade: 0.85,
              },
              { chave: "eu", x: fx, y: fy, pender: -s * 0.4 * e * vem, cor: quem.cor, numero: quem.numero, nome: quem.nome, destaque: true },
            ]}
          />
          {t > impacto && t < impacto + 700 && (
            <text
              x={balao[0]}
              y={balao[1]}
              textAnchor="middle"
              fontSize={1.6 * e}
              fill="var(--foreground)"
              opacity={1 - entre(t, [impacto + 300, impacto + 700])}
              style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 900 }}
            >
              PRII!
            </text>
          )}
          {(cartao || excluido) && sobeCartao > 0 && (
            <path
              d={caminho(card.map(c.p), true)}
              fill={cartao?.cor ?? "#e11d2e"}
              stroke="var(--foreground)"
              strokeWidth={c.px * 1.5}
              opacity={Math.min(1, sobeCartao * 2)}
            />
          )}
          <Estouro c={c} em={[vitima[0], vitima[1], 1.2 * e]} t={entre(t, [impacto, impacto + 360])} cor={cartao?.cor ?? quem.cor} />
        </>
      );
    },
  };
}

function montarCena(jogo: Jogo, ev: Evento): Cena | null {
  if (!ev.time || (ev.tipo !== "ponto" && ev.tipo !== "falta")) return null;
  const time = jogo.times[ev.time];
  const outro = jogo.times[ev.time === "A" ? "B" : "A"];
  const j = time.jogadores.find((x) => x.id === ev.jogador);
  const quem: Pessoa = { numero: j?.numero ?? "", nome: j ? nomeCurto(j.nome) : "Equipe", cor: time.cor };
  // O time A ataca para a direita (+x); o B, para a esquerda.
  const s = ev.time === "A" ? 1 : -1;
  if (ev.tipo === "falta") {
    const st = ev.jogador ? situacao(jogo, ev.time, ev.jogador) : null;
    return falta(jogo, s, quem, outro.cor, ev.falta ?? "P", !!st?.excluido);
  }
  if (jogo.jogo.modalidade === "futsal") return gol(s, quem, outro.cor);
  if (jogo.jogo.modalidade === "volei") return pontoVolei(s, quem, outro.cor);
  return cesta(s, quem, outro.cor, ev.valor || 2);
}

export function LanceIso({ jogo, evento, onFim }: { jogo: Jogo; evento: Evento; onFim: () => void }) {
  const [cena] = useState(() => montarCena(jogo, evento));
  const [real, setReal] = useState(0);
  const fim = useRef(onFim);
  fim.current = onFim;

  useEffect(() => {
    if (!cena || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fim.current();
      return;
    }
    let quadro = 0;
    let vibrou = false;
    const inicio = performance.now();
    const total = cena.duracao + HITSTOP;
    const passo = (agora: number) => {
      const e = agora - inicio;
      setReal(e);
      if (!vibrou && e >= cena.impacto) {
        vibrou = true;
        navigator.vibrate?.([0, 45]);
      }
      if (e < total) quadro = requestAnimationFrame(passo);
      else fim.current();
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [cena]);

  if (!cena) return null;

  // Hitstop: no impacto o relógio da cena para por um instante, e depois segue.
  const I = cena.impacto;
  const t = real < I ? real : real < I + HITSTOP ? I : real - HITSTOP;
  const bateu = real >= I;
  const treme = bateu ? 1 - limitar((real - I) / (HITSTOP + TREME)) : 0;
  const amp = 0.45 * DESENHOS[jogo.jogo.modalidade].hx / 14;
  const tremor: [number, number] = [Math.sin(real * 0.21) * amp * treme, Math.cos(real * 0.27) * amp * treme];
  // Câmera: aproxima devagar e dá um "soco" de zoom no impacto.
  const empurra = suave(limitar(real / (cena.duracao + HITSTOP)));
  const soco = bateu ? 0.22 * (1 - limitar((real - I) / 320)) : 0;
  const zoom = cena.zoom * (0.9 + 0.12 * empurra) + soco;
  const pisca = bateu ? 1 - limitar((real - I) / (HITSTOP + 160)) : 0;
  const sai = entre(real, [cena.duracao + HITSTOP - 320, cena.duracao + HITSTOP]);
  const cor = evento.time ? jogo.times[evento.time].cor : "var(--foreground)";
  const { A, B } = jogo.times;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[45] flex justify-center"
      style={{ opacity: 1 - sai }}
      aria-live="polite"
    >
      <div
        className="relative h-[min(46vh,420px)] w-full max-w-3xl overflow-hidden"
        style={{ background: "var(--background)", borderBottom: `3px solid ${cor}`, boxShadow: "0 18px 40px -12px rgb(0 0 0 / 0.45)" }}
      >
        <QuadraIso
          modalidade={jogo.jogo.modalidade}
          corA={A.cor}
          corB={B.cor}
          jogadores={false}
          camera={CAM_ABERTURA}
          foco={{ x: cena.foco[0], y: cena.foco[1], z: cena.foco[2], zoom }}
          tremor={tremor}
          atores={(c) => cena.atores(c, t)}
          className="absolute inset-0 h-full w-full"
        />
        {/* Clarão na cor do time */}
        <div className="absolute inset-0" style={{ background: cor, opacity: pisca * 0.38, mixBlendMode: "normal" }} />
        <div className="absolute inset-x-4 bottom-6 flex items-end justify-between gap-3">
          <AnimatePresence>
            {bateu && (
              <motion.div
                initial={{ scale: 1.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 700, damping: 18, delay: HITSTOP / 1000 - 0.08 }}
                className="origin-bottom-left"
              >
                <p className="font-display-reta text-[11px] text-muted-foreground">{cena.sub}</p>
                <h3 className="font-display text-6xl leading-none">
                  <Destaque cor={cor.startsWith("#") ? cor : undefined} de="esquerda" atraso={HITSTOP / 1000}>
                    {cena.titulo}
                  </Destaque>
                </h3>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
