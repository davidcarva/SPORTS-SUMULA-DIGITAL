import { Check, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { conteudoSync, matrizQR, quantizar } from "@/lib/qr";
import { hora } from "@/lib/tempo";

const SEGURAR_MS = 5000;
const MARGEM_MODULOS = 4;

/**
 * Tela branca com o QR de sincronização. O código muda a cada 100 ms e traz o horário
 * deste aparelho. Ao fechar, a súmula registra quando a tela ficou aberta; o cortar.py
 * usa isso para saber onde procurar o QR no vídeo.
 */
export function TelaSync({ idJogo, onFechar }: { idJogo: string; onFechar: (inicio: number, fim: number) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const inicio = useRef(Date.now());
  const [relogio, setRelogio] = useState(Date.now());
  const [decorrido, setDecorrido] = useState(0);

  useEffect(() => {
    let quadro = 0;
    let mostrado = -1;
    const desenhar = () => {
      const agora = Date.now();
      const v = quantizar(agora);
      if (v !== mostrado && canvas.current) {
        mostrado = v;
        const m = matrizQR(conteudoSync(idJogo, v));
        const total = m.tamanho + MARGEM_MODULOS * 2;
        const escala = 16;
        const c = canvas.current;
        if (c.width !== total * escala) {
          c.width = total * escala;
          c.height = total * escala;
        }
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.fillStyle = "#000";
          for (let l = 0; l < m.tamanho; l++)
            for (let col = 0; col < m.tamanho; col++)
              if (m.escuro(l, col))
                ctx.fillRect((col + MARGEM_MODULOS) * escala, (l + MARGEM_MODULOS) * escala, escala, escala);
        }
        setRelogio(v);
        setDecorrido(agora - inicio.current);
      }
      quadro = requestAnimationFrame(desenhar);
    };
    quadro = requestAnimationFrame(desenhar);

    let trava: WakeLockSentinel | null = null;
    navigator.wakeLock
      ?.request("screen")
      .then((t) => {
        trava = t;
      })
      .catch(() => {});
    return () => {
      cancelAnimationFrame(quadro);
      trava?.release().catch(() => {});
    };
  }, [idJogo]);

  const pronto = decorrido >= SEGURAR_MS;
  const fechar = () => onFechar(inicio.current, Date.now());

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-white px-4 text-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.canvas
        ref={canvas}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="aspect-square w-[min(94vw,68vh)] [image-rendering:pixelated]"
        aria-label="QR code com o horário da súmula"
      />
      <div className="font-mono text-[clamp(28px,9vw,52px)] font-bold tabular-nums">{hora(relogio, true)}</div>

      <div className="w-[min(94vw,420px)]">
        <div className="h-2.5 w-full overflow-hidden bg-black/10">
          <div
            className="h-full transition-[width] duration-100 ease-linear"
            style={{
              width: `${Math.min(100, (decorrido / SEGURAR_MS) * 100)}%`,
              background: pronto ? "#16a34a" : "linear-gradient(90deg,#ff6a00,#ff2e88)",
            }}
          />
        </div>
        <p className="mt-2 text-center text-sm font-medium text-black/70">
          {pronto
            ? "Sincronizado. Pode fechar."
            : "Aponte a câmera para esta tela, de perto, e segure firme até a barra encher."}
        </p>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={fechar}
        className="chanfro chanfro-sm flex items-center gap-2 px-6 py-3 font-display text-xl text-white"
        style={{ background: pronto ? "#16a34a" : "#111" }}
      >
        {pronto ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
        {pronto ? "Pronto" : "Fechar"}
      </motion.button>
    </motion.div>
  );
}
