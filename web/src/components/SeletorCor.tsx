import { ImagePlus, Pipette, Wand2 } from "lucide-react";
import { motion } from "motion/react";
import { useId, useRef, useState } from "react";
import { type CorPaleta, distancia, deHex, legivelNoEscuro, paletaDeArquivo, sugerirDupla } from "@/lib/paleta";
import { CORES_TIME } from "@/lib/tipos";

/** Botão que abre a galeria/câmera e devolve a paleta da imagem. */
export function BotaoImagem({ onPaleta, rotulo = "Da logo / print" }: { onPaleta: (p: CorPaleta[]) => void; rotulo?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState("");
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="chanfro chanfro-sm flex h-9 items-center gap-1.5 bg-secondary px-3 font-display-reta text-[11px] text-foreground"
      >
        <ImagePlus className="h-4 w-4 text-neon-cyan" /> {lendo ? "Lendo…" : rotulo}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setLendo(true);
          setErro("");
          try {
            const p = await paletaDeArquivo(f);
            if (!p.length) setErro("Não achei cores nessa imagem.");
            onPaleta(p);
          } catch {
            setErro("Não consegui abrir essa imagem.");
          }
          setLendo(false);
        }}
      />
      {erro && <span className="text-xs text-destructive">{erro}</span>}
    </>
  );
}

/** Quadradinhos da paleta. */
export function Amostras({ paleta, atual, onEscolher }: { paleta: CorPaleta[]; atual?: string; onEscolher: (hex: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {paleta.map((c) => (
        <motion.button
          key={c.hex}
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={() => onEscolher(c.hex)}
          className="flex flex-col items-center gap-0.5"
          aria-label={`Usar ${c.hex}`}
        >
          <span
            className="chanfro chanfro-sm block h-9 w-11 ring-1 ring-inset ring-white/15"
            style={{ background: c.hex, outline: atual?.toLowerCase() === c.hex ? "2px solid white" : "none", outlineOffset: 2 }}
          />
          <span className="font-mono text-[9px] text-muted-foreground">{Math.round(c.peso * 100)}%</span>
        </motion.button>
      ))}
    </div>
  );
}

/** Escolha da cor de um time: 8 prontas, qualquer cor, ou tirada de uma imagem. */
export function SeletorCor({ cor, onMudar, outra }: { cor: string; onMudar: (hex: string) => void; outra?: string }) {
  const [paleta, setPaleta] = useState<CorPaleta[]>([]);
  const [aviso, setAviso] = useState("");
  const id = useId();

  const aplicar = (hex: string) => {
    const ok = legivelNoEscuro(hex);
    setAviso(ok !== hex.toLowerCase() ? "Era escura demais para o fundo do app: clareei um pouco." : "");
    onMudar(ok);
  };
  const parecida = outra && distancia(deHex(cor), deHex(outra)) < 90;
  const pronta = CORES_TIME.some((c) => c.cor === cor);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {CORES_TIME.map((c) => (
          <motion.button
            key={c.cor}
            type="button"
            whileTap={{ scale: 0.85 }}
            onClick={() => aplicar(c.cor)}
            aria-label={c.nome}
            className="chanfro-oct h-8 w-8 transition"
            style={{
              background: c.cor,
              outline: cor === c.cor ? "2px solid white" : "none",
              outlineOffset: 2,
              opacity: cor === c.cor ? 1 : 0.55,
            }}
          />
        ))}
        <label
          htmlFor={id}
          className="chanfro-oct relative grid h-8 w-8 cursor-pointer place-items-center"
          style={{
            background: pronta ? "conic-gradient(#ff2e88,#ffd400,#39e75f,#00d8ff,#8b5cf6,#ff2e88)" : cor,
            outline: pronta ? "none" : "2px solid white",
            outlineOffset: 2,
          }}
          title="Qualquer cor"
        >
          <Pipette className="h-4 w-4 text-white drop-shadow" />
          <input id={id} type="color" value={cor} onChange={(e) => aplicar(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </label>
        <BotaoImagem onPaleta={setPaleta} />
      </div>
      {paleta.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="font-display-reta text-[10px] text-muted-foreground">Cores da imagem · toque para usar</span>
          <Amostras paleta={paleta} atual={cor} onEscolher={aplicar} />
        </div>
      )}
      {aviso && <p className="text-xs text-neon-volt">{aviso}</p>}
      {parecida && <p className="text-xs text-destructive">Muito parecida com a cor do outro time: vai confundir no placar.</p>}
    </div>
  );
}

/** Uma imagem com as duas cores (ex.: arte do jogo): sugere esquerda e direita, ou escolha uma a uma. */
export function CoresDeUmaImagem({
  siglas,
  cores,
  onMudar,
}: {
  siglas: [string, string];
  cores: [string, string];
  onMudar: (lado: 0 | 1, hex: string) => void;
}) {
  const [paleta, setPaleta] = useState<CorPaleta[]>([]);
  const [lado, setLado] = useState<0 | 1>(0);
  const dupla = sugerirDupla(paleta);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <BotaoImagem onPaleta={setPaleta} rotulo="Enviar logo / print" />
        {dupla && (
          <button
            type="button"
            onClick={() => {
              onMudar(0, legivelNoEscuro(dupla[0]));
              onMudar(1, legivelNoEscuro(dupla[1]));
            }}
            className="chanfro chanfro-sm flex h-9 items-center gap-2 bg-neon-volt/15 px-3 font-display-reta text-[11px] text-neon-volt ring-1 ring-inset ring-neon-volt/40"
          >
            <Wand2 className="h-4 w-4" /> Sugestão
            <span className="h-4 w-4" style={{ background: dupla[0] }} />
            <span className="h-4 w-4" style={{ background: dupla[1] }} />
          </button>
        )}
      </div>
      {paleta.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {([0, 1] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLado(l)}
                className="chanfro chanfro-sm flex h-10 items-center justify-between gap-2 px-3 font-display text-base"
                style={{
                  background: lado === l ? "var(--secondary)" : "transparent",
                  boxShadow: `inset 0 0 0 ${lado === l ? 2 : 1}px ${lado === l ? "white" : "var(--border)"}`,
                }}
              >
                <span>
                  {l === 0 ? "Esquerda" : "Direita"} · {siglas[l]}
                </span>
                <span className="h-5 w-5" style={{ background: cores[l] }} />
              </button>
            ))}
          </div>
          <span className="font-display-reta text-[10px] text-muted-foreground">
            Toque numa cor para o lado {lado === 0 ? "esquerdo" : "direito"}
          </span>
          <Amostras
            paleta={paleta}
            atual={cores[lado]}
            onEscolher={(hex) => {
              onMudar(lado, legivelNoEscuro(hex));
              if (lado === 0) setLado(1);
            }}
          />
        </>
      )}
    </div>
  );
}
