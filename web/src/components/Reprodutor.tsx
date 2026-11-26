import { ChevronRight, Expand, Loader2, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { arquivoDrive, capaDrive, videoDrive } from "@/lib/hub";

const relogio = (s: number) => {
  const t = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/**
 * O clipe tocando num <video> nosso, direto do arquivo no Drive: sem a interface do Drive, sem
 * faixas pretas e sem esperar o Drive "processar" o vídeo. Toque no vídeo para pausar; a barra
 * na cor do time mostra e muda o ponto do clipe. Se o arquivo não tocar (rede, Drive recusou),
 * cai no player do Drive.
 */
export function Reprodutor({
  id,
  cor,
  titulo,
  vertical = false,
  onProximo,
}: {
  id: string;
  cor: string;
  titulo: string;
  vertical?: boolean;
  onProximo?: () => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [tocando, setTocando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [acabou, setAcabou] = useState(false);
  const [mudo, setMudo] = useState(false);
  const [tempo, setTempo] = useState(0);
  const [duracao, setDuracao] = useState(0);
  const [falhou, setFalhou] = useState(false);

  // Clipe novo: volta ao começo e tenta tocar sozinho (o toque no nome já liberou o som na maioria
  // dos celulares; se o navegador não deixar, fica o botão de play).
  useEffect(() => {
    setFalhou(false);
    setAcabou(false);
    setTempo(0);
    setCarregando(true);
    const v = video.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => setTocando(false));
  }, [id]);

  const alternar = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused || v.ended) {
      setAcabou(false);
      void v.play().catch(() => {});
    } else v.pause();
  };

  const telaCheia = () => {
    const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (caixa.current?.requestFullscreen) void caixa.current.requestFullscreen().catch(() => v?.webkitEnterFullscreen?.());
    else v?.webkitEnterFullscreen?.(); // iPhone: só o próprio vídeo vai para tela cheia
  };

  const arquivo = arquivoDrive(id);
  if (falhou || !arquivo) return <PlayerDrive id={id} titulo={titulo} vertical={vertical} />;

  const progresso = duracao ? (tempo / duracao) * 100 : 0;

  return (
    <div ref={caixa} className="group absolute inset-0 bg-black select-none" onKeyDown={(e) => e.key === " " && (e.preventDefault(), alternar())}>
      <video
        ref={video}
        key={id}
        src={arquivo}
        poster={capaDrive(id)}
        playsInline
        preload="auto"
        muted={mudo}
        aria-label={titulo}
        className="h-full w-full object-contain"
        onClick={alternar}
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onWaiting={() => setCarregando(true)}
        onCanPlay={() => setCarregando(false)}
        onPlaying={() => setCarregando(false)}
        onLoadedMetadata={(e) => setDuracao(e.currentTarget.duration)}
        onTimeUpdate={(e) => setTempo(e.currentTarget.currentTime)}
        onEnded={() => setAcabou(true)}
        onError={() => setFalhou(true)}
      />

      {carregando && !acabou && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 className="h-9 w-9 animate-spin text-white/80" />
        </div>
      )}

      {/* Pausado: um botão grande no meio. No fim: "De novo" e "Próximo lance". */}
      {!tocando && !carregando && !acabou && (
        <button type="button" onClick={alternar} className="absolute inset-0 grid place-items-center" aria-label="Tocar">
          <span className="chanfro grid h-16 w-16 place-items-center shadow-2xl" style={{ background: cor }}>
            <Play className="h-8 w-8 translate-x-0.5 text-white" fill="currentColor" />
          </span>
        </button>
      )}
      {acabou && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/55">
          <button type="button" onClick={alternar} className="chanfro chanfro-sm flex items-center gap-1.5 bg-white px-3 py-2 font-display-reta text-xs text-black">
            <RotateCcw className="h-4 w-4" /> De novo
          </button>
          {onProximo && (
            <button
              type="button"
              onClick={onProximo}
              className="chanfro chanfro-sm flex items-center gap-1 px-3 py-2 font-display-reta text-xs text-white"
              style={{ background: cor }}
            >
              Próximo lance <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Barra de baixo: tocar/pausar, tempo, som, tela cheia e o progresso na cor do time. */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-6 pb-1.5">
        <input
          type="range"
          min={0}
          max={duracao || 1}
          step={0.05}
          value={tempo}
          aria-label="Ponto do clipe"
          onChange={(e) => {
            const v = video.current;
            if (v) v.currentTime = Number(e.target.value);
            setTempo(Number(e.target.value));
            setAcabou(false);
          }}
          className="block h-4 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-white"
          style={{ background: `linear-gradient(to right, ${cor} ${progresso}%, rgb(255 255 255 / 0.25) ${progresso}%) center / 100% 4px no-repeat` }}
        />
        <div className="flex items-center gap-1 text-white">
          <button type="button" onClick={alternar} className="grid h-8 w-8 place-items-center" aria-label={tocando ? "Pausar" : "Tocar"}>
            {tocando ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
          </button>
          <span className="font-mono text-[11px] tabular-nums text-white/85">
            {relogio(tempo)} / {relogio(duracao)}
          </span>
          <button type="button" onClick={() => setMudo((m) => !m)} className="ml-auto grid h-8 w-8 place-items-center" aria-label={mudo ? "Ligar o som" : "Tirar o som"}>
            {mudo ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button type="button" onClick={telaCheia} className="grid h-8 w-8 place-items-center" aria-label="Tela cheia">
            <Expand className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * O player do Drive, montado num tamanho em que ele fica inteiro e reduzido para caber na caixa.
 *
 * Por quê: abaixo de uns 400 px de altura o player do Drive se desmonta no celular (a barra sobe
 * para o topo, o vídeo desce e os botões de pausar e o tempo ficam cortados). Em 720×405 (ou
 * 405×720 no vertical) ele aparece certo; aqui ele é carregado assim e encolhido por igual, como
 * uma miniatura. Na tela cheia a caixa cresce e ele cresce junto.
 */
function PlayerDrive({ id, titulo, vertical }: { id: string; titulo: string; vertical: boolean }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0);
  const [w, h] = vertical ? [405, 720] : [720, 405];

  useLayoutEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => setEscala(Math.min(el.clientWidth / w, el.clientHeight / h));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);

  return (
    <div ref={caixa} className="absolute inset-0 overflow-hidden bg-black">
      <iframe
        key={id}
        src={videoDrive(id)}
        title={titulo}
        allow="autoplay; fullscreen"
        allowFullScreen
        className="absolute top-1/2 left-1/2 border-0"
        style={{
          width: w,
          height: h,
          transform: `translate(-50%, -50%) scale(${escala})`,
          visibility: escala ? "visible" : "hidden",
        }}
      />
    </div>
  );
}
