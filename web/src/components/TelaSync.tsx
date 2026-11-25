import { Check, ChevronRight, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { conteudoSync, matrizQR, quantizar } from "@/lib/qr";
import { hora } from "@/lib/tempo";

const SEGURAR_MS = 5000;
const MARGEM_MODULOS = 4;
const CAMERAS = [1, 2, 3, 4];

/**
 * Tela branca com o QR de sincronização. O código muda a cada 100 ms e traz o horário
 * deste aparelho e o número da câmera que está filmando. Com duas câmeras, mostre para a 1,
 * toque em "Próxima câmera" e mostre para a 2: o PC separa os ângulos de cada lance.
 * Ao fechar, a súmula registra quando a tela ficou aberta; o cortar.py usa isso para saber
 * onde procurar o QR no vídeo.
 */
export function TelaSync({
  idJogo,
  onFechar,
}: {
  idJogo: string;
  onFechar: (inicio: number, fim: number, cameras: number[]) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const inicio = useRef(Date.now());
  const [camera, setCamera] = useState(1);
  const cameraRef = useRef(1);
  const inicioCamera = useRef(Date.now());
  const [relogio, setRelogio] = useState(Date.now());
  const [decorrido, setDecorrido] = useState(0);
  const [prontas, setProntas] = useState<number[]>([]);

  useEffect(() => {
    let quadro = 0;
    let mostrado = "";
    const desenhar = () => {
      const agora = Date.now();
      const v = quantizar(agora);
      const texto = conteudoSync(idJogo, v, cameraRef.current);
      if (texto !== mostrado && canvas.current) {
        mostrado = texto;
        const m = matrizQR(texto);
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
        const passou = agora - inicioCamera.current;
        setDecorrido(passou);
        if (passou >= SEGURAR_MS) {
          const n = cameraRef.current;
          setProntas((p) => (p.includes(n) ? p : [...p, n].sort()));
        }
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

  const escolher = (n: number) => {
    cameraRef.current = n;
    inicioCamera.current = Date.now();
    setCamera(n);
    setDecorrido(0);
  };

  const pronto = decorrido >= SEGURAR_MS;
  const proxima = CAMERAS.find((n) => n > camera);
  const fechar = () => onFechar(inicio.current, Date.now(), prontas.length ? prontas : [camera]);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-3 bg-white px-4 text-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Qual câmera está filmando agora: vai dentro do QR. */}
      <div className="flex w-[min(94vw,420px)] items-center gap-2" role="radiogroup" aria-label="Câmera">
        <span className="shrink-0 text-xs font-semibold tracking-wide text-black/60 uppercase">Câmera</span>
        <div className="grid flex-1 grid-cols-4 gap-1 bg-black/5 p-1">
          {CAMERAS.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={camera === n}
              onClick={() => escolher(n)}
              className={`relative h-10 font-display text-xl transition-colors ${camera === n ? "bg-black text-white" : "text-black/70"}`}
            >
              {n}
              {prontas.includes(n) && <Check className="absolute top-1 right-1 h-3.5 w-3.5 text-[#16a34a]" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </div>

      <motion.canvas
        ref={canvas}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="aspect-square w-[min(94vw,62vh)] [image-rendering:pixelated]"
        aria-label={`QR code da câmera ${camera} com o horário da súmula`}
      />
      <div className="flex items-baseline gap-3">
        <span className="font-display text-[clamp(22px,6vw,34px)]">Câmera {camera}</span>
        <span className="font-mono text-[clamp(24px,7vw,44px)] font-bold tabular-nums">{hora(relogio, true)}</span>
      </div>

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
            ? proxima
              ? `Câmera ${camera} sincronizada. Tem outra câmera? Toque em "Câmera ${proxima}".`
              : `Câmera ${camera} sincronizada. Pode fechar.`
            : `Aponte a câmera ${camera} para esta tela, de perto, e segure firme até a barra encher.`}
        </p>
      </div>

      <div className="flex gap-2">
        {pronto && proxima && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => escolher(proxima)}
            className="chanfro chanfro-sm flex items-center gap-1.5 bg-black/10 px-5 py-3 font-display text-xl"
          >
            Câmera {proxima} <ChevronRight className="h-5 w-5" />
          </motion.button>
        )}
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={fechar}
          className="chanfro chanfro-sm flex items-center gap-2 px-6 py-3 font-display text-xl text-white"
          style={{ background: pronto || prontas.length ? "#16a34a" : "#111" }}
        >
          {pronto || prontas.length ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
          {pronto || prontas.length ? "Pronto" : "Fechar"}
        </motion.button>
      </div>
    </motion.div>
  );
}
