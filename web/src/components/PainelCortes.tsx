import { CircleAlert, Clapperboard, CloudOff, LoaderCircle, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { acompanhar, guardarChave, type StatusCorte } from "@/lib/servidor";
import type { Jogo } from "@/lib/tipos";

const ESPERA_MS = 12_000;

function CodigoServidor({ onSalvar }: { onSalvar: () => void }) {
  const [codigo, setCodigo] = useState("");
  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        guardarChave(codigo);
        onSalvar();
      }}
    >
      <input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="Código do servidor"
        autoCapitalize="characters"
        className="campo min-w-0 flex-1 font-mono uppercase"
      />
      <button type="submit" disabled={!codigo.trim()} className="chanfro chanfro-sm bg-neon-volt px-4 font-display-reta text-xs text-[var(--sobre-ok)] disabled:opacity-50">
        Salvar
      </button>
    </form>
  );
}

/** Depois do Encerrar: envia a súmula sozinho e mostra em que pé estão os cortes. */
export function PainelCortes({ jogo }: { jogo: Jogo }) {
  const [s, setS] = useState<StatusCorte>({ estado: "procurando" });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let vivo = true;
    let espera: ReturnType<typeof setTimeout>;
    const ciclo = async () => {
      clearTimeout(espera);
      const r = await acompanhar(jogo);
      if (!vivo) return;
      setS(r);
      espera = setTimeout(ciclo, ESPERA_MS);
    };
    espera = setTimeout(ciclo, 400);
    window.addEventListener("online", ciclo);
    return () => {
      vivo = false;
      clearTimeout(espera);
      window.removeEventListener("online", ciclo);
    };
  }, [jogo, tentativa]);

  const progresso = s.total ? Math.round(((s.feitos ?? 0) / s.total) * 100) : 0;
  const corBorda =
    s.estado === "pronto" ? "var(--neon-volt)" : s.estado === "erro" || s.estado === "sem_chave" ? "var(--destructive)" : "var(--border)";

  return (
    <section className="chanfro chanfro-sm mt-3 bg-card px-3 py-2.5" style={{ boxShadow: `inset 0 0 0 1px ${corBorda}` }} aria-live="polite">
      {s.estado === "procurando" && (
        <p className="flex items-center gap-2 text-sm">
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" /> Enviando a súmula…
        </p>
      )}
      {s.estado === "sem_servidor" && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
          Sem conexão com o servidor. A súmula segue salva aqui e sai sozinha quando houver internet.
        </p>
      )}
      {s.estado === "sem_chave" && (
        <>
          <p className="flex items-start gap-2 text-sm">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> Digite o código do servidor para enviar a súmula.
          </p>
          <CodigoServidor onSalvar={() => setTentativa((n) => n + 1)} />
        </>
      )}
      {s.estado === "aguardando_video" && (
        <p className="flex items-start gap-2 text-sm">
          <Video className="mt-0.5 h-4 w-4 shrink-0 text-neon-cyan" />
          <span>
            <b className="font-display text-base">Súmula enviada.</b> Os cortes começam quando o vídeo chegar ao computador. O celular avisa.
          </span>
        </p>
      )}
      {s.estado === "cortando" && (
        <>
          <p className="flex items-center gap-2 text-sm">
            <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-neon-cyan" />
            <b className="font-display text-base">Cortando</b>
            <span className="tabular-nums text-muted-foreground">
              {s.feitos ?? 0} de {s.total ?? "…"} clipes
            </span>
          </p>
          <span className="mt-2 block h-1.5 bg-foreground/10">
            <span className="block h-full bg-neon-cyan transition-[width] duration-500" style={{ width: `${progresso}%` }} />
          </span>
        </>
      )}
      {s.estado === "pronto" && (
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-sm">
            <b className="block font-display text-lg leading-tight text-neon-volt">Cortes prontos · {s.clipes} clipes</b>
            <span className="text-muted-foreground">{s.mensagem || s.confronto}</span>
          </p>
          <a href={s.url} target="_blank" rel="noreferrer" className="chanfro chanfro-sm flex h-11 shrink-0 items-center gap-1.5 bg-neon-volt px-3 font-display-reta text-xs text-[var(--sobre-ok)]">
            <Clapperboard className="h-4 w-4" /> Ver clipes
          </a>
        </div>
      )}
      {s.estado === "erro" && (
        <p className="flex items-start gap-2 text-sm">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <span>
            <b className="font-display text-base">Não consegui cortar.</b> {s.mensagem} Coloque o vídeo certo na pasta e o corte recomeça.
          </span>
        </p>
      )}
    </section>
  );
}
