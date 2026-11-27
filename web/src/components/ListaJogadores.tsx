import { ChevronDown, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { textoSobre } from "@/lib/cor";

/** Camisas aceitas: de 1 a 99. */
export const NUMEROS = Array.from({ length: 99 }, (_, i) => String(i + 1));

/** Só dígitos, sem zero à esquerda, no máximo 99. */
export function limparNumero(texto: string): string {
  const d = texto.replace(/\D/g, "").replace(/^0+/, "").slice(0, 2);
  return d;
}

export interface LinhaJogador {
  chave: string;
  numero: string;
  nome: string;
  capitao?: boolean;
  reserva?: boolean;
}

let contador = 0;
export const novaLinha = (numero = "", nome = ""): LinhaJogador => ({ chave: `l${++contador}`, numero, nome });

/** O menor número de 1 a 99 que ainda não está no time: cada jogador novo já chega numerado. */
export function proximoNumero(linhas: LinhaJogador[]): string {
  const usados = new Set(linhas.map((l) => l.numero));
  return NUMEROS.find((n) => !usados.has(n)) ?? "";
}

/** Acrescenta `quantas` linhas, cada uma com o próximo número livre (1, 2, 3…). */
export function comNumeros(linhas: LinhaJogador[], quantas: number): LinhaJogador[] {
  const todas = [...linhas];
  for (let i = 0; i < quantas; i++) todas.push(novaLinha(proximoNumero(todas)));
  return todas;
}

/** Números repetidos dentro do mesmo time. */
export function repetidos(numeros: string[]): Set<string> {
  const vistos = new Set<string>();
  const rep = new Set<string>();
  for (const n of numeros) {
    if (!n) continue;
    if (vistos.has(n)) rep.add(n);
    vistos.add(n);
  }
  return rep;
}

/**
 * Número da camisa: dá para digitar (teclado numérico) ou tocar na seta e escolher na grade.
 * A grade fica embaixo da linha, na largura toda, para os números caberem no dedo.
 */
export function CampoNumero({
  valor,
  repetido,
  aberto,
  onMudar,
  onAbrir,
}: {
  valor: string;
  repetido: boolean;
  aberto: boolean;
  onMudar: (n: string) => void;
  onAbrir: () => void;
}) {
  return (
    <div
      className={`chanfro chanfro-sm flex h-11 items-stretch bg-secondary ${repetido ? "ring-2 ring-inset ring-destructive" : aberto ? "ring-2 ring-inset ring-neon-cyan" : ""}`}
    >
      <input
        value={valor}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        placeholder="Nº"
        onChange={(e) => onMudar(limparNumero(e.target.value))}
        onFocus={(e) => e.target.select()}
        className="w-10 min-w-0 bg-transparent text-center font-display text-xl outline-none placeholder:font-display-reta placeholder:text-xs placeholder:text-muted-foreground"
        aria-label="Número da camisa"
        aria-invalid={repetido}
      />
      <button
        type="button"
        onClick={onAbrir}
        className="grid w-7 place-items-center text-muted-foreground"
        aria-label="Escolher o número na grade"
        aria-expanded={aberto}
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}

/** Grade de 1 a 99. Os números de outros jogadores do time ficam apagados. */
export function GradeNumeros({
  valor,
  ocupados,
  cor,
  onEscolher,
}: {
  valor: string;
  ocupados: Set<string>;
  cor: string;
  onEscolher: (n: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className="overflow-hidden"
    >
      <div className="grid grid-cols-10 gap-1 py-2" role="listbox" aria-label="Números de camisa">
        {NUMEROS.map((n) => {
          const atual = n === valor;
          const ocupado = !atual && ocupados.has(n);
          return (
            <button
              key={n}
              type="button"
              role="option"
              aria-selected={atual}
              disabled={ocupado}
              onClick={() => onEscolher(n)}
              className="grid h-8 place-items-center font-display text-sm tabular-nums disabled:opacity-20"
              style={atual ? { background: cor, color: textoSobre(cor) } : { background: "var(--secondary)" }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

/**
 * Uma linha por jogador: número, nome, C (capitão, um por time) e T/R (titular ou reserva).
 * "Adicionar jogador" abre mais uma linha; passando dos titulares, ela já chega como reserva.
 */
export function ListaJogadores({
  linhas,
  cor,
  titulares,
  onMudar,
}: {
  linhas: LinhaJogador[];
  cor: string;
  /** Quantos começam em quadra (5 no basquete e no futsal, 6 no vôlei). */
  titulares: number;
  onMudar: (l: LinhaJogador[]) => void;
}) {
  const [aberto, setAberto] = useState<string | null>(null);
  const rep = repetidos(linhas.map((l) => l.numero));
  const mudar = (chave: string, campo: "numero" | "nome", v: string) =>
    onMudar(linhas.map((l) => (l.chave === chave ? { ...l, [campo]: v } : l)));
  const capitao = (chave: string) => onMudar(linhas.map((l) => ({ ...l, capitao: l.chave === chave ? !l.capitao : false })));
  const reserva = (chave: string) => onMudar(linhas.map((l) => (l.chave === chave ? { ...l, reserva: !l.reserva } : l)));
  const emQuadra = linhas.filter((l) => !l.reserva && (l.nome.trim() || l.numero)).length;
  const txt = textoSobre(cor);

  return (
    <div className="flex flex-col">
      {linhas.map((l, i) => {
        const ocupados = new Set(linhas.filter((x) => x.chave !== l.chave).map((x) => x.numero));
        return (
          <div key={l.chave} className="border-b border-border/60 py-1.5 last:border-b-0">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_34px_34px_34px] items-center gap-1">
              <CampoNumero
                valor={l.numero}
                repetido={rep.has(l.numero)}
                aberto={aberto === l.chave}
                onMudar={(n) => mudar(l.chave, "numero", n)}
                onAbrir={() => setAberto(aberto === l.chave ? null : l.chave)}
              />
              <input
                value={l.nome}
                onChange={(e) => mudar(l.chave, "nome", e.target.value)}
                onFocus={() => setAberto(null)}
                placeholder={`Jogador ${i + 1}`}
                autoCapitalize="words"
                className="chanfro chanfro-sm h-11 w-full min-w-0 bg-secondary px-3 outline-none focus:ring-2 focus:ring-ring"
                aria-label={`Nome do jogador ${i + 1}`}
              />
              <button
                type="button"
                onClick={() => capitao(l.chave)}
                className="chanfro chanfro-sm grid h-11 place-items-center font-display text-base"
                style={l.capitao ? { background: cor, color: txt } : { background: "var(--secondary)", color: "var(--muted-foreground)" }}
                aria-pressed={!!l.capitao}
                aria-label={`${l.capitao ? "Tirar" : "Marcar"} ${l.nome.trim() || `o jogador ${i + 1}`} como capitão`}
                title="Capitão"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => reserva(l.chave)}
                className={`chanfro chanfro-sm grid h-11 place-items-center font-display text-base ${
                  l.reserva ? "bg-transparent text-muted-foreground ring-1 ring-inset ring-border" : "bg-foreground text-background"
                }`}
                aria-label={`${l.nome.trim() || `Jogador ${i + 1}`}: ${l.reserva ? "reserva" : "titular"}. Toque para trocar`}
                title={l.reserva ? "Reserva" : "Titular"}
              >
                {l.reserva ? "R" : "T"}
              </button>
              <button
                type="button"
                onClick={() => onMudar(linhas.filter((x) => x.chave !== l.chave))}
                className="chanfro chanfro-sm grid h-11 place-items-center bg-secondary text-muted-foreground"
                aria-label={`Remover o jogador ${i + 1}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {rep.has(l.numero) && <p className="mt-1 text-xs text-destructive">Número {l.numero} repetido neste time.</p>}
            <AnimatePresence initial={false}>
              {aberto === l.chave && (
                <GradeNumeros
                  valor={l.numero}
                  ocupados={ocupados}
                  cor={cor}
                  onEscolher={(n) => {
                    mudar(l.chave, "numero", n);
                    setAberto(null);
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => {
          // Já chega com o próximo número livre; a grade fica fechada (dá para trocar pela seta).
          const nova = comNumeros(linhas, 1);
          const ultima = nova[nova.length - 1];
          if (linhas.filter((x) => !x.reserva).length >= titulares) ultima.reserva = true;
          onMudar(nova);
          setAberto(null);
        }}
        className="chanfro chanfro-sm mt-2 flex h-11 items-center justify-center gap-2 font-display-reta text-sm ring-1 ring-inset ring-dashed ring-border"
      >
        <Plus className="h-4 w-4" /> Adicionar jogador
      </button>
      <p className={`mt-2 text-xs ${emQuadra > titulares ? "text-[#ffd400]" : "text-muted-foreground"}`}>
        <b className="text-foreground">C</b> capitão (opcional) · <b className="text-foreground">T</b> titular ·{" "}
        <b className="text-foreground">R</b> reserva · {emQuadra} titular{emQuadra === 1 ? "" : "es"}
        {emQuadra > titulares ? ` (o normal são ${titulares})` : ""}
      </p>
    </div>
  );
}
