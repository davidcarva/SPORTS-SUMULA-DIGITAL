import { Download, RefreshCw } from "lucide-react";
import { atualizar, ehIPhone, instalado, instalar, usePWA } from "@/lib/pwa";
import type { Jogo } from "@/lib/tipos";

/** Na tela de novo jogo: botão no Android, instrução no iPhone. Some depois de instalado. */
export function CartaoInstalar() {
  const { podeInstalar } = usePWA();
  if (instalado()) return null;
  if (podeInstalar) {
    return (
      <button
        type="button"
        onClick={() => void instalar()}
        className="chanfro chanfro-sm flex w-full items-center justify-center gap-2 bg-secondary px-3 py-3 font-display-reta text-sm"
      >
        <Download className="h-4 w-4 text-neon-cyan" /> Instalar no celular · funciona sem internet
      </button>
    );
  }
  if (ehIPhone() && window.isSecureContext) {
    return (
      <p className="chanfro chanfro-sm bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
        <b className="text-foreground">Para instalar no iPhone:</b> no Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.
      </p>
    );
  }
  return null;
}

/** Versão nova só é oferecida sem jogo em andamento: atualizar recarrega o app. */
export function AvisoAtualizacao({ jogo }: { jogo: Jogo | null }) {
  const { atualizacao } = usePWA();
  if (!atualizacao || (jogo && !jogo.jogo.encerrado_em)) return null;
  return (
    <div className="chanfro chanfro-sm fixed inset-x-3 top-[calc(0.5rem+env(safe-area-inset-top))] z-40 mx-auto flex max-w-md items-center gap-3 bg-neon-volt px-3 py-2 text-[var(--sobre-ok)]">
      <span className="min-w-0 flex-1 text-sm font-semibold">Nova versão do app disponível.</span>
      <button
        type="button"
        onClick={() => void atualizar()}
        className="chanfro chanfro-sm flex shrink-0 items-center gap-1.5 bg-[var(--sobre-ok)] px-3 py-1.5 font-display-reta text-xs text-[var(--ok)]"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Atualizar
      </button>
    </div>
  );
}
