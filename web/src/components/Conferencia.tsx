import { CircleAlert, CircleCheck, Clock3, Loader2, RefreshCw, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { buscarJogo, type CameraHub, type JogoHub } from "@/lib/hub";

/** Como o PC alinhou a câmera, em palavras. */
function comoSincronizou(c: CameraHub): { texto: string; ok: boolean } {
  if (c.metodo === "qr") return { texto: `QR ±${c.precisao} ms`, ok: c.precisao <= 120 };
  if (c.metodo === "ancora") return { texto: "âncora manual ±0,5 s", ok: false };
  return { texto: "sem QR: pelo relógio da câmera, ±2 s", ok: false };
}

/**
 * O que o PC confirmou ao ler os vídeos: o app do mesário só sabe que mostrou o QR; quem sabe se a
 * câmera filmou, com que precisão e quantos lances pegou é o PC. Mostra o que ele publicou no hub.
 * `jogo` undefined: carregando; null: o PC ainda não publicou o jogo.
 */
export function ConferenciaPC({
  jogo,
  erro,
  onAtualizar,
  carregando,
}: {
  jogo: JogoHub | null | undefined;
  erro?: string;
  onAtualizar?: () => void;
  carregando?: boolean;
}) {
  let icone = <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />;
  let titulo = "";
  let texto = "";
  let cor = "var(--linha)";
  const linhas: { chave: string; esquerda: string; direita: string; ok: boolean }[] = [];

  if (erro) {
    icone = <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />;
    titulo = "Não consegui conferir agora";
    texto = erro;
  } else if (jogo === undefined) {
    icone = <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />;
    titulo = "Conferindo com o PC…";
  } else if (jogo === null) {
    titulo = "O PC ainda não recebeu a súmula";
    texto = "Ela chega quando o Drive do PC sincronizar, com o programa de cortes aberto.";
  } else if (jogo.estado === "aguardando_video") {
    titulo = "Súmula no PC · esperando o vídeo";
    texto = "Os pontos já estão no hub. Os vídeos entram quando o vídeo de cada câmera chegar à pasta.";
  } else if (jogo.estado === "cortando") {
    icone = <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />;
    titulo = "Cortando os vídeos…";
  } else if (jogo.estado === "erro") {
    icone = <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />;
    cor = "var(--destructive)";
    titulo = "Não deu para cortar";
    texto = jogo.mensagem || "Nenhum lance aparece no vídeo que chegou. Mande o vídeo certo para a pasta.";
  } else {
    const cortados = jogo.cortados ?? jogo.clipes;
    const tudo = cortados >= jogo.lances;
    const ruim = (jogo.cameras ?? []).some((c) => !comoSincronizou(c).ok);
    icone = tudo && !ruim ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ok)]" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pausa-texto)]" />;
    cor = tudo && !ruim ? "var(--ok)" : "var(--pausa-texto)";
    const n = jogo.cameras?.length ?? 0;
    titulo = `Conferido pelo PC${n ? ` · ${n} câmera${n === 1 ? "" : "s"}` : ""}`;
    texto =
      `${cortados} de ${jogo.lances} lances com vídeo` +
      (jogo.clipes < cortados ? ` · ${jogo.clipes} já tocam no hub, o resto está subindo para o Drive` : "") +
      (cortados < jogo.lances ? ". Os outros aconteceram fora do que as câmeras gravaram." : ".");
    for (const c of jogo.cameras ?? []) {
      const s = comoSincronizou(c);
      linhas.push({
        chave: String(c.c),
        esquerda: `Câmera ${c.c}${c.videos > 1 ? ` (${c.videos} vídeos)` : ""}`,
        direita: `${s.texto} · ${c.lances} lance${c.lances === 1 ? "" : "s"}`,
        ok: s.ok,
      });
    }
    if (jogo.ignorados)
      linhas.push({
        chave: "ignorados",
        esquerda: `${jogo.ignorados} vídeo${jogo.ignorados === 1 ? "" : "s"} de lado`,
        direita: "QR de outro jogo",
        ok: false,
      });
  }

  return (
    <section className="chanfro chanfro-sm bg-card px-3 py-2.5" style={{ boxShadow: `inset 0 0 0 1px ${cor}` }} aria-live="polite">
      <div className="flex items-start gap-2 text-sm">
        {icone}
        <p className="min-w-0 flex-1">
          <b className="block font-display text-base leading-tight">{titulo}</b>
          {texto && <span className="text-muted-foreground">{texto}</span>}
        </p>
        {onAtualizar && (
          <button
            type="button"
            onClick={onAtualizar}
            disabled={carregando}
            className="chanfro chanfro-sm grid h-8 w-8 shrink-0 place-items-center bg-secondary disabled:opacity-50"
            aria-label="Conferir de novo"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>
      {linhas.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {linhas.map((l) => (
            <li key={l.chave} className="flex items-center gap-2 bg-secondary/60 px-2 py-1.5 text-xs">
              <Video className={`h-3.5 w-3.5 shrink-0 ${l.ok ? "text-[var(--ok)]" : "text-[var(--pausa-texto)]"}`} />
              <b className="font-display-reta">{l.esquerda}</b>
              <span className="ml-auto text-right text-muted-foreground">{l.direita}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Busca no hub o que o PC publicou deste jogo, e de novo a cada minuto e quando o app volta à tela. */
export function useConferencia(id: string) {
  const [jogo, setJogo] = useState<JogoHub | null | undefined>(undefined);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const atualizar = useCallback(() => {
    setCarregando(true);
    buscarJogo(id)
      .then((j) => {
        setJogo(j);
        setErro("");
      })
      .catch(() => setErro(navigator.onLine ? "O hub não respondeu. Tente de novo daqui a pouco." : "Sem internet neste celular."))
      .finally(() => setCarregando(false));
  }, [id]);

  useEffect(() => {
    atualizar();
    const t = setInterval(atualizar, 60_000);
    const voltou = () => document.visibilityState === "visible" && atualizar();
    document.addEventListener("visibilitychange", voltou);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", voltou);
    };
  }, [atualizar]);

  return { jogo, erro, atualizar, carregando };
}
