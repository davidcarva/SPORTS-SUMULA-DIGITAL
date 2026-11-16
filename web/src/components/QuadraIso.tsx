import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Modalidade } from "@/lib/regras";

/**
 * Quadra em perspectiva isométrica, desenhada em linhas finas como um projeto técnico.
 * As únicas peças sólidas são as dos times: cada metade da quadra e os jogadores (blocos com o número).
 *
 * Tudo é medido em metros, no chão da quadra: x ao longo do comprimento (time A à esquerda),
 * y na largura e z para cima. A câmera gira e inclina; com giro 0° e inclinação 90° a quadra fica
 * vista de cima, com a linha do meio na vertical, igual à divisão do fundo do app.
 */

export type P3 = [number, number, number];
export type P2 = [number, number];

export interface Camera {
  /** Giro em torno do eixo vertical, em graus. */
  giro: number;
  /** Inclinação: 90° é vista de cima. */
  inclina: number;
}

export const CAM_ISO: Camera = { giro: 30, inclina: 35 };
export const CAM_TOPO: Camera = { giro: 0, inclina: 90 };
/** Na abertura, de pé no celular: mais girada e mais de cima, para a quadra ocupar a tela. */
export const CAM_ABERTURA: Camera = { giro: 38, inclina: 44 };

const rad = (g: number) => (g * Math.PI) / 180;

export function projetor(c: Camera) {
  const t = rad(c.giro);
  const f = rad(c.inclina);
  const ct = Math.cos(t);
  const st = Math.sin(t);
  const sf = Math.sin(f);
  const cf = Math.cos(f);
  return {
    p: ([x, y, z]: P3): P2 => [x * ct - y * st, (x * st + y * ct) * sf - z * cf],
    /** Maior = mais perto de quem olha (desenha por último). */
    fundo: (x: number, y: number) => x * st + y * ct,
  };
}

// ------------------------------------------------------------------ geometria

function ret(x0: number, y0: number, x1: number, y1: number, z = 0): P3[] {
  return [
    [x0, y0, z],
    [x1, y0, z],
    [x1, y1, z],
    [x0, y1, z],
    [x0, y0, z],
  ];
}

function arco(cx: number, cy: number, r: number, a0: number, a1: number, z = 0, n = 28): P3[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a), z] as P3;
  });
}

export const circulo = (cx: number, cy: number, r: number, z = 0) => arco(cx, cy, r, 0, Math.PI * 2, z, 36);

const lados = [-1, 1] as const;

export interface Desenho {
  /** Metade do comprimento e da largura da quadra de jogo. */
  hx: number;
  hy: number;
  /** Piso (quadra + área livre): x0, y0, x1, y1. */
  piso: [number, number, number, number];
  /** Marcas no chão. */
  marcas: P3[][];
  /** Peças em pé: tabelas, gols, rede. */
  pecas: P3[][];
  /** Superfícies translúcidas (a rede do vôlei). */
  telas: P3[][];
  /** Onde ficam os jogadores do time A (o B é espelhado). */
  formacao: [number, number][];
  bola: { cor: string; z: number };
}

function basquete(): Desenho {
  const hx = 14;
  const hy = 7.5;
  const marcas: P3[][] = [ret(-hx, -hy, hx, hy), [[0, -hy, 0], [0, hy, 0]], circulo(0, 0, 1.8)];
  const pecas: P3[][] = [];
  const b = Math.atan2(6.6, 1.415);
  for (const s of lados) {
    const aro = s * (hx - 1.575);
    marcas.push(ret(s * hx, -2.45, s * (hx - 5.8), 2.45));
    marcas.push(circulo(s * (hx - 5.8), 0, 1.8));
    marcas.push([
      [s * hx, -6.6, 0],
      ...arco(aro, 0, 6.75, s === 1 ? -(Math.PI - b) : -b, s === 1 ? -(Math.PI + b) : b),
      [s * hx, 6.6, 0],
    ]);
    const tx = s * (hx - 1.2);
    pecas.push([
      [tx, -0.9, 2.9],
      [tx, 0.9, 2.9],
      [tx, 0.9, 3.95],
      [tx, -0.9, 3.95],
      [tx, -0.9, 2.9],
    ]);
    pecas.push(circulo(aro, 0, 0.23, 3.05));
    pecas.push([
      [s * (hx + 1), 0, 0],
      [s * (hx + 1), 0, 3.4],
      [tx, 0, 3.4],
    ]);
  }
  return {
    hx,
    hy,
    piso: [-16.5, -9.5, 16.5, 9.5],
    marcas,
    pecas,
    telas: [],
    formacao: [
      [-2.5, 0.5],
      [-6, -4.5],
      [-6.5, 4],
      [-10.5, -2],
      [-11, 2.8],
    ],
    bola: { cor: "#ff6a00", z: 1.6 },
  };
}

function futsal(): Desenho {
  const hx = 20;
  const hy = 10;
  const marcas: P3[][] = [ret(-hx, -hy, hx, hy), [[0, -hy, 0], [0, hy, 0]], circulo(0, 0, 3), circulo(0, 0, 0.15)];
  const pecas: P3[][] = [];
  for (const s of lados) {
    const gx = s * hx;
    // Área: dois quartos de círculo (raio 6) em volta das traves, ligados por uma reta.
    const a = s === 1 ? [-Math.PI / 2, -Math.PI, Math.PI, Math.PI / 2] : [-Math.PI / 2, 0, 0, Math.PI / 2];
    marcas.push([...arco(gx, -1.58, 6, a[0], a[1]), ...arco(gx, 1.58, 6, a[2], a[3])]);
    marcas.push(circulo(s * (hx - 6), 0, 0.15));
    marcas.push(circulo(s * (hx - 10), 0, 0.15));
    const fx = s * (hx + 1);
    pecas.push([
      [gx, -1.5, 0],
      [gx, -1.5, 2],
      [gx, 1.5, 2],
      [gx, 1.5, 0],
    ]);
    pecas.push([
      [gx, -1.5, 2],
      [fx, -1.5, 0.3],
      [fx, -1.5, 0],
    ]);
    pecas.push([
      [gx, 1.5, 2],
      [fx, 1.5, 0.3],
      [fx, 1.5, 0],
    ]);
    pecas.push([
      [fx, -1.5, 0.3],
      [fx, 1.5, 0.3],
    ]);
    pecas.push([
      [fx, -1.5, 0],
      [fx, 1.5, 0],
    ]);
  }
  return {
    hx,
    hy,
    piso: [-23, -12.5, 23, 12.5],
    marcas,
    pecas,
    telas: [],
    formacao: [
      [-18.5, 0],
      [-13, -4.5],
      [-13, 4.5],
      [-7, -2],
      [-3.5, 3.5],
    ],
    bola: { cor: "var(--foreground)", z: 0.9 },
  };
}

function volei(): Desenho {
  const hx = 9;
  const hy = 4.5;
  const marcas: P3[][] = [ret(-hx, -hy, hx, hy), [[0, -hy, 0], [0, hy, 0]], [[-3, -hy, 0], [-3, hy, 0]], [[3, -hy, 0], [3, hy, 0]]];
  const pecas: P3[][] = [
    [[0, -5.2, 0], [0, -5.2, 2.55]],
    [[0, 5.2, 0], [0, 5.2, 2.55]],
    [[0, -5.2, 2.43], [0, 5.2, 2.43]],
    [[0, -4.75, 1.43], [0, 4.75, 1.43]],
    [[0, -4.5, 1.43], [0, -4.5, 3.23]],
    [[0, 4.5, 1.43], [0, 4.5, 3.23]],
  ];
  for (let y = -4.75 + 0.95; y < 4.75; y += 0.95) pecas.push([[0, y, 1.43], [0, y, 2.43]]);
  return {
    hx,
    hy,
    piso: [-12.5, -7.5, 12.5, 7.5],
    marcas,
    pecas,
    telas: [
      [
        [0, -4.75, 1.43],
        [0, 4.75, 1.43],
        [0, 4.75, 2.43],
        [0, -4.75, 2.43],
      ],
    ],
    formacao: [
      [-1.4, -3],
      [-1.4, 0],
      [-1.4, 3],
      [-6.2, -3],
      [-6.2, 0],
      [-6.2, 3],
    ],
    bola: { cor: "#ffd400", z: 3.3 },
  };
}

export const DESENHOS: Record<Modalidade, Desenho> = { basquete: basquete(), futsal: futsal(), volei: volei() };

// ------------------------------------------------------------------ tempo

/** Marcos da animação de entrada, em milissegundos. */
export const TEMPO = {
  linhas: [0, 1600],
  metades: [1000, 2000],
  jogadores: [1800, 3000],
  fim: 3200,
} as const;
const PASSO_JOGADOR = 95;

export const limitar = (v: number) => Math.min(1, Math.max(0, v));
export const entre = (ms: number, [a, b]: readonly [number, number]) => limitar((ms - a) / (b - a));
export const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const quica = (t: number) => {
  const c = 1.7;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

/** Faz o relógio da animação correr de 0 até `fim` quando `ativo` liga. Desligado, fica no fim. */
export function useLinhaDoTempo(ativo: boolean, fim: number = TEMPO.fim): number {
  const [ms, setMs] = useState(ativo ? 0 : fim);
  useEffect(() => {
    if (!ativo || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMs(fim);
      return;
    }
    let quadro = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const e = agora - inicio;
      setMs(Math.min(e, fim));
      if (e < fim) quadro = requestAnimationFrame(passo);
    };
    setMs(0);
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [ativo, fim]);
  return ms;
}

// ------------------------------------------------------------------ desenho

export const caminho = (pts: P2[], fechar = false) =>
  pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(3)} ${y.toFixed(3)}`).join("") + (fechar ? "Z" : "");

/** O que um ator (jogador, bola, efeito) precisa para se desenhar na mesma quadra. */
export interface Contexto {
  p: (q: P3) => P2;
  fundo: (x: number, y: number) => number;
  /** Um pixel de tela, em metros. */
  px: number;
  /** Tamanho relativo da quadra (basquete = 1). */
  escala: number;
  d: Desenho;
}

export interface Bloco {
  chave: string;
  x: number;
  y: number;
  /** Altura do pé do bloco (pulo). */
  z?: number;
  cor: string;
  numero?: string;
  nome?: string;
  opacidade?: number;
  /** Achatado (agachar antes do pulo) ou esticado: 1 é o normal. */
  esticar?: number;
  /** Inclinação do topo ao longo de x, em metros (corpo indo para a frente ou caindo). */
  pender?: number;
  /** Contorno marcado: o protagonista do lance. */
  destaque?: boolean;
}

/** Jogador: um bloco sólido na cor do time, com o número (e o nome) por cima. */
export function DesenhoBloco({ c, b }: { c: Contexto; b: Bloco }) {
  const { p, escala, px } = c;
  const lado = 0.42 * escala;
  const altura = 1.9 * escala * (b.esticar ?? 1);
  const z0 = b.z ?? 0;
  const z1 = z0 + altura;
  const ix = b.pender ?? 0;
  const [ax, ay, bx, by] = [b.x - lado, b.y - lado, b.x + lado, b.y + lado];
  const tampa = caminho([p([ax + ix, ay, z1]), p([bx + ix, ay, z1]), p([bx + ix, by, z1]), p([ax + ix, by, z1])], true);
  const face = caminho([p([ax + ix, by, z1]), p([bx + ix, by, z1]), p([bx, by, z0]), p([ax, by, z0])], true);
  const flanco = caminho([p([bx + ix, ay, z1]), p([bx + ix, by, z1]), p([bx, by, z0]), p([bx, ay, z0])], true);
  // Número no alto e o nome logo abaixo, os dois em cima do bloco.
  const [nx, ny] = p([b.x + ix, b.y, z1 + (b.nome ? 1.9 : 1.0) * escala]);
  const [mx, my] = p([b.x + ix, b.y, z1 + 0.55 * escala]);
  const contorno = b.destaque ? { stroke: "var(--foreground)", strokeWidth: px * 1.5 } : {};
  return (
    <g opacity={b.opacidade ?? 1}>
      <path d={face} fill={`color-mix(in oklab, ${b.cor} 72%, #000)`} {...contorno} />
      <path d={flanco} fill={`color-mix(in oklab, ${b.cor} 52%, #000)`} {...contorno} />
      <path d={tampa} fill={b.cor} {...contorno} />
      {b.numero && (
        <text
          x={nx}
          y={ny}
          textAnchor="middle"
          fontSize={1.35 * escala}
          fill="var(--foreground)"
          stroke="var(--background)"
          strokeWidth={0.18 * escala}
          paintOrder="stroke"
          style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 800 }}
        >
          {b.numero}
        </text>
      )}
      {b.nome && (
        <text
          x={mx}
          y={my}
          textAnchor="middle"
          fontSize={0.82 * escala}
          fill="var(--foreground)"
          stroke="var(--background)"
          strokeWidth={0.16 * escala}
          paintOrder="stroke"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}
        >
          {b.nome}
        </text>
      )}
    </g>
  );
}

/** Bola com sombra no chão: a sombra encolhe e clareia quando a bola sobe. */
export function DesenhoBola({
  c,
  x,
  y,
  z,
  cor,
  raio = 0.36,
  opacidade = 1,
}: {
  c: Contexto;
  x: number;
  y: number;
  z: number;
  cor: string;
  raio?: number;
  opacidade?: number;
}) {
  const { p, escala, px } = c;
  const r = raio * escala;
  const alto = Math.min(1, z / (6 * escala));
  const [bx, by] = p([x, y, z + r]);
  return (
    <g opacity={opacidade}>
      <path d={caminho(circulo(x, y, r * (1 - alto * 0.5)).map(p), true)} fill="var(--foreground)" opacity={0.22 * (1 - alto * 0.7)} />
      <circle cx={bx} cy={by} r={r} fill={cor} stroke="var(--foreground)" strokeWidth={px} />
    </g>
  );
}

/** Primeiro nome, curto o bastante para caber em cima do bloco. */
export const nomeCurto = (nome = "") => {
  const n = nome.trim().split(/\s+/)[0] ?? "";
  return n.length > 9 ? `${n.slice(0, 8)}.` : n;
};

export function QuadraIso({
  modalidade,
  corA,
  corB,
  numerosA = [],
  numerosB = [],
  nomesA = [],
  nomesB = [],
  ms = TEMPO.fim,
  quique,
  camera = CAM_ISO,
  jogadores = true,
  metades = 1,
  foco,
  tremor = [0, 0],
  atores,
  className,
}: {
  modalidade: Modalidade;
  corA: string;
  corB: string;
  numerosA?: string[];
  numerosB?: string[];
  nomesA?: string[];
  nomesB?: string[];
  /** Momento da animação de entrada (TEMPO). No fim, tudo desenhado. */
  ms?: number;
  /** Relógio da bola quicando no meio (só na abertura). */
  quique?: number;
  camera?: Camera;
  jogadores?: boolean;
  /** Força das metades coloridas (0 a 1), além da animação. */
  metades?: number;
  /** Aproxima a câmera de um ponto da quadra. */
  foco?: { x: number; y: number; z: number; zoom: number };
  /** Tremida da câmera, em metros (impacto). */
  tremor?: [number, number];
  /** Desenha por cima da quadra, na mesma perspectiva (os lances). */
  atores?: (c: Contexto) => ReactNode;
  className?: string;
}) {
  const d = DESENHOS[modalidade];
  const { p, fundo } = projetor(camera);
  const svg = useRef<SVGSVGElement>(null);
  const [largura, setLargura] = useState(300);

  useLayoutEffect(() => {
    const el = svg.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(e.contentRect.width || 300));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Enquadramento: o piso e o que fica em pé, com uma folga.
  const [x0, y0, x1, y1] = d.piso;
  const espessura = (x1 - x0) / 55;
  const cantos: P3[] = [
    [x0, y0, 0],
    [x1, y0, 0],
    [x1, y1, 0],
    [x0, y1, 0],
    [x0, y1, -espessura],
    [x1, y1, -espessura],
    [x1, y0, -espessura],
    [x0, y0, 4],
    [x1, y1, 4],
  ];
  const proj = cantos.map(p);
  const xs = proj.map((q) => q[0]);
  const ys = proj.map((q) => q[1]);
  const folga = (Math.max(...xs) - Math.min(...xs)) * 0.04;
  let vb = [Math.min(...xs) - folga, Math.min(...ys) - folga, Math.max(...xs) - Math.min(...xs) + folga * 2, Math.max(...ys) - Math.min(...ys) + folga * 2];
  if (foco) {
    const [cx, cy] = p([foco.x, foco.y, foco.z]);
    const w = vb[2] / foco.zoom;
    const h = vb[3] / foco.zoom;
    vb = [cx - w / 2, cy - h / 2, w, h];
  }
  vb = [vb[0] + tremor[0], vb[1] + tremor[1], vb[2], vb[3]];
  /** Um pixel de tela, em metros: as linhas ficam finas em qualquer tamanho. */
  const px = vb[2] / largura;
  const escala = d.hx / 14;
  const ctx: Contexto = { p, fundo, px, escala, d };

  const tLinhas = suave(entre(ms, TEMPO.linhas));
  const tMetades = suave(entre(ms, TEMPO.metades)) * metades;

  // Piso com espessura: só as duas laterais viradas para quem olha aparecem.
  const topo = caminho([p([x0, y0, 0]), p([x1, y0, 0]), p([x1, y1, 0]), p([x0, y1, 0])], true);
  const frente = caminho([p([x0, y1, 0]), p([x1, y1, 0]), p([x1, y1, -espessura]), p([x0, y1, -espessura])], true);
  const direita = caminho([p([x1, y0, 0]), p([x1, y1, 0]), p([x1, y1, -espessura]), p([x1, y0, -espessura])], true);

  // Metades: a cor corre da linha de fundo até o meio.
  const metade = (s: -1 | 1) => {
    const ini = s * d.hx;
    const fimX = ini - s * d.hx * tMetades;
    return caminho([p([ini, -d.hy, 0]), p([fimX, -d.hy, 0]), p([fimX, d.hy, 0]), p([ini, d.hy, 0])], true);
  };

  const traco = (pts: P3[], i: number, total: number) => {
    const atraso = (i / Math.max(1, total)) * 0.45;
    const t = limitar((tLinhas - atraso) / 0.55);
    return { d: caminho(pts.map(p)), t };
  };

  // Jogadores: blocos que caem no lugar, um depois do outro.
  const blocos = jogadores
    ? (["A", "B"] as const)
        .flatMap((time) =>
          d.formacao.map(([fx, fy], i) => {
            const s = time === "A" ? 1 : -1;
            const x = fx * s;
            const y = fy * s;
            const ordem = i * 2 + (time === "A" ? 0 : 1);
            const t = entre(ms, [TEMPO.jogadores[0] + ordem * PASSO_JOGADOR, TEMPO.jogadores[0] + ordem * PASSO_JOGADOR + 520]);
            const b: Bloco = {
              chave: `${time}${i}`,
              x,
              y,
              z: (1 - quica(t)) * 4 * escala,
              opacidade: limitar(t * 3),
              cor: time === "A" ? corA : corB,
              numero: (time === "A" ? numerosA : numerosB)[i] ?? "",
              nome: nomeCurto((time === "A" ? nomesA : nomesB)[i]),
            };
            return { b, prof: fundo(x, y) };
          }),
        )
        .sort((a, b) => a.prof - b.prof)
    : [];

  const tBola = entre(ms, [TEMPO.jogadores[1] - 300, TEMPO.fim]);
  // Quicando: |sen| dá o arco de cada quique.
  const zBola = quique !== undefined ? Math.abs(Math.sin((Math.PI * quique) / 520)) * 2.6 * escala : d.bola.z * escala * tBola;

  return (
    <svg ref={svg} viewBox={vb.join(" ")} className={className} role="img" aria-label={`Quadra de ${modalidade}`}>
      <g strokeLinejoin="round" strokeLinecap="round">
        <path d={frente} fill="var(--secondary)" stroke="var(--linha)" strokeWidth={px} opacity={tLinhas} />
        <path d={direita} fill="var(--accent)" stroke="var(--linha)" strokeWidth={px} opacity={tLinhas} />
        <path d={topo} fill="var(--card)" stroke="var(--linha)" strokeWidth={px} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - tLinhas} />

        <path d={metade(-1)} fill={corA} opacity={0.24} />
        <path d={metade(1)} fill={corB} opacity={0.24} />

        {d.marcas.map((m, i) => {
          const { d: dd, t } = traco(m, i, d.marcas.length);
          return (
            <path key={i} d={dd} fill="none" stroke="var(--foreground)" strokeOpacity={0.55} strokeWidth={px * 1.1} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} />
          );
        })}

        {d.telas.map((m, i) => (
          <path key={i} d={caminho(m.map(p), true)} fill="var(--foreground)" opacity={0.07 * tLinhas} />
        ))}

        {blocos.map(({ b }) => (
          <DesenhoBloco key={b.chave} c={ctx} b={b} />
        ))}

        {d.pecas.map((m, i) => {
          const { d: dd, t } = traco(m, i, d.pecas.length);
          return (
            <path key={i} d={dd} fill="none" stroke="var(--foreground)" strokeOpacity={0.75} strokeWidth={px * 1.2} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} />
          );
        })}

        {jogadores && tBola > 0 && <DesenhoBola c={ctx} x={0} y={0} z={zBola} cor={d.bola.cor} raio={0.36 * Math.min(1, tBola * 2)} />}

        {atores?.(ctx)}
      </g>
    </svg>
  );
}
