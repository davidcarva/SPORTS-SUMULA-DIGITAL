import { CircleAlert, CloudUpload, FolderOpen } from "lucide-react";
import { useState } from "react";
import { envioAnterior, mandarSumula } from "@/lib/drive";
import type { Jogo } from "@/lib/tipos";

export const PASTA_DRIVE = "Súmula Digital";

/** Depois do Encerrar, sem servidor: lembra de pôr a súmula e o vídeo na pasta do Drive. */
export function PainelDrive({ jogo }: { jogo: Jogo }) {
  const [, atualizar] = useState(0);
  const envio = envioAnterior(jogo);
  const ok = envio && !envio.mudou;

  const mandar = () => void mandarSumula(jogo).then(() => atualizar((n) => n + 1));

  return (
    <section
      className="chanfro chanfro-sm mt-3 bg-card px-3 py-2.5"
      style={{ boxShadow: `inset 0 0 0 1px ${ok ? "var(--neon-volt)" : "var(--destructive)"}` }}
      aria-live="polite"
    >
      {ok ? (
        <div className="flex items-start gap-2 text-sm">
          <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-neon-volt" />
          <p className="min-w-0 flex-1">
            <b className="block font-display text-base">
              {envio.como === "baixada" ? "Súmula baixada." : "Súmula enviada."}
            </b>
            <span className="text-muted-foreground">
              {envio.como === "baixada" ? `Coloque o arquivo na pasta ${PASTA_DRIVE} do Drive. ` : ""}
              Mande o vídeo para a mesma pasta. Os clipes aparecem em {PASTA_DRIVE} › Cortes.
            </span>
          </p>
        </div>
      ) : (
        <p className="flex items-start gap-2 text-sm">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <span>
            <b className="block font-display text-base">
              {envio?.mudou ? "A súmula mudou depois de enviada." : "Falta mandar a súmula."}
            </b>
            Salve na pasta {PASTA_DRIVE} do Google Drive{envio?.mudou ? " para os clipes saírem certos" : ""}.
          </span>
        </p>
      )}
      <button
        type="button"
        onClick={mandar}
        className={`chanfro chanfro-sm mt-2 flex h-11 w-full items-center justify-center gap-2 font-display-reta text-xs ${
          ok ? "bg-secondary text-foreground" : "bg-neon-volt text-[var(--sobre-ok)]"
        }`}
      >
        <CloudUpload className="h-4 w-4" /> {ok ? "Mandar de novo" : "Mandar súmula para o Drive"}
      </button>
    </section>
  );
}
