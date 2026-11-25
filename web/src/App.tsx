import { ChartNoAxesCombined, ClipboardList, Goal, ListOrdered, LogOut, QrCode, Volleyball } from "lucide-react";
import { IconeBasquete } from "@/components/IconeBasquete";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Dialogo, type Pergunta, ToastView, useToast } from "@/components/Avisos";
import { AvisoAtualizacao } from "@/components/Instalacao";
import { AberturaQuadra } from "@/components/AberturaQuadra";
import { FundoLados } from "@/components/FundoLados";
import { LanceIso } from "@/components/LanceIso";
import { concluirAbertura, useAbertura } from "@/lib/abertura";
import { type Escolha, FolhaLance } from "@/components/FolhaLance";
import type { LanceDireto, Marcacao } from "@/components/PainelTime";
import { Placar } from "@/components/Placar";
import { TelaAnalise } from "@/components/TelaAnalise";
import { TelaConfig } from "@/components/TelaConfig";
import { TelaJogo } from "@/components/TelaJogo";
import { TelaLances } from "@/components/TelaLances";
import { TelaSumula } from "@/components/TelaSumula";
import { FolhaPausa } from "@/components/Pausa";
import { TelaSync } from "@/components/TelaSync";
import {
  descrever,
  duracao,
  estadoSync,
  estourou,
  faltasColetivas,
  fimDoPeriodo,
  limitePausa,
  MOTIVOS_ERRO,
  nomePausa,
  nomePeriodo,
  pausaAberta,
  periodoAtual,
  pontoPorErro,
  situacao,
  ultimoLance,
} from "@/lib/estatisticas";
import { alterarEvento, apagarJogo, encerrarJogo, jogoAtual, pausar, registrar, retomar, sairDoJogo, useEstado } from "@/lib/store";
import { PainelCortes } from "@/components/PainelCortes";
import { PainelDrive } from "@/components/PainelDrive";
import { pedirPermissaoDeAviso, usaServidor } from "@/lib/servidor";
import { envioAnterior, mandarSumula } from "@/lib/drive";
import { hora } from "@/lib/tempo";
import { type Modalidade, regras } from "@/lib/regras";
import { type Evento, type Jogo, type TimeId } from "@/lib/tipos";

type Aba = "jogo" | "analise" | "sumula" | "lances";

const ICONE_JOGO: Record<Modalidade, React.ComponentType<{ className?: string }>> = {
  basquete: IconeBasquete,
  futsal: Goal,
  volei: Volleyball,
};

const ABAS: { id: Aba; rotulo: string; icone: React.ComponentType<{ className?: string }> | null }[] = [
  { id: "jogo", rotulo: "Jogo", icone: null },
  { id: "analise", rotulo: "Análise", icone: ChartNoAxesCombined },
  { id: "sumula", rotulo: "Súmula", icone: ClipboardList },
  { id: "lances", rotulo: "Lances", icone: ListOrdered },
];

/** Texto do aviso depois de um lance: falta mostra a contagem, exclusão e estouro. */
function mensagem(jogo: Jogo, e: Evento): string {
  const time = e.time as TimeId;
  const sig = jogo.times[time].sigla;
  if (e.tipo !== "falta") return `${sig} ${descrever(jogo, e)} · ${hora(e.t, true)}`;
  const st = situacao(jogo, time, e.jogador);
  let m = `${sig} ${descrever(jogo, e)}`;
  if (e.jogador) m += ` (${st.faltas.length}ª)`;
  if (st.excluido) m += " · EXCLUÍDO";
  const c = regras(jogo).coletivas;
  if (c && e.jogador && regras(jogo).contaColetiva(e)) {
    const n = faltasColetivas(jogo, time, e.periodo);
    if (estourou(jogo, n)) m += n === c.limite ? " · estourou" : ` · ${c.penalidade}`;
  }
  return m;
}

export default function App() {
  const { jogo, erroSalvar } = useEstado();
  const [aba, setAba] = useState<Aba>("jogo");
  const [timeAtivo, setTimeAtivo] = useState<TimeId>("A");
  /** Horário do toque em "Parar jogo" enquanto o mesário escolhe o motivo. */
  const [paradaT, setParadaT] = useState<number | null>(null);
  const [marcacao, setMarcacao] = useState<Marcacao | null>(null);
  const [edicao, setEdicao] = useState<Evento | null>(null);
  const [sync, setSync] = useState(false);
  const [pergunta, setPergunta] = useState<Pergunta | null>(null);
  const [envios, setEnvios] = useState(0);
  const abertura = useAbertura();
  /** Lance que está passando na quadra 3D lá em cima. */
  const [lanceVisto, setLanceVisto] = useState<Evento | null>(null);
  const { toast, mostrar, fechar } = useToast();

  // Avisa antes de fechar/recarregar a página no meio do jogo.
  useEffect(() => {
    if (!jogo || jogo.jogo.encerrado_em) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [jogo]);

  // Tela sempre acesa durante o jogo (só funciona em HTTPS ou localhost).
  useEffect(() => {
    if (!jogo) return;
    let trava: WakeLockSentinel | null = null;
    const pedir = () =>
      navigator.wakeLock
        ?.request("screen")
        .then((t) => {
          trava = t;
        })
        .catch(() => {});
    pedir();
    const voltar = () => document.visibilityState === "visible" && pedir();
    document.addEventListener("visibilitychange", voltar);
    return () => {
      document.removeEventListener("visibilitychange", voltar);
      trava?.release().catch(() => {});
    };
  }, [jogo?.jogo.id]);

  if (!jogo) {
    return (
      <MotionConfig reducedMotion="user">
        <AvisoAtualizacao jogo={null} />
        <TelaConfig />
      </MotionConfig>
    );
  }

  const lancar = (t: number, origem: Marcacao["origem"], esc: Escolha) => {
    // Cesta ou lance com o jogo "parado": a bola já voltou. Encerra a parada no horário do lance.
    let retomou = "";
    const aberta = pausaAberta(jogo);
    if (aberta && esc.tipo !== "falta" && t > aberta.t) {
      const p = retomar(t);
      if (p) retomou = ` · parada encerrada (${duracao((p.t_fim ?? t) - p.t)})`;
    }
    const e = registrar({
      tipo: esc.tipo,
      valor: esc.tipo === "ponto" ? esc.valor : 0,
      falta: esc.tipo === "falta" ? (esc.falta ?? "P") : undefined,
      time: esc.time,
      jogador: esc.jogador,
      t,
      origem,
    });
    const atual = jogoAtual();
    if (!e || !atual) return;
    setLanceVisto(e);
    const st = esc.tipo === "falta" ? situacao(atual, esc.time, esc.jogador) : null;
    const desfazer = () => alterarEvento(e.id, { removido: true });
    // Vôlei, ponto na linha Equipe: o time pontuou porque o OUTRO errou. Um toque (opcional) diz como.
    const porErro = pontoPorErro(atual, e);
    mostrar({
      texto: mensagem(atual, e) + retomou,
      cor: st?.excluido ? "var(--destructive)" : atual.times[esc.time].cor,
      desfazer,
      ...(porErro && {
        pergunta: `Como o ${atual.times[esc.time === "A" ? "B" : "A"].nome} errou? (opcional)`,
        opcoes: MOTIVOS_ERRO.map((m) => ({
          rotulo: m.botao,
          acao: () => {
            alterarEvento(e.id, { erro: m.id });
            const depois = jogoAtual();
            if (depois) mostrar({ texto: `${atual.times[esc.time].sigla} ${descrever(depois, { ...e, erro: m.id })}`, cor: atual.times[esc.time].cor, desfazer });
          },
        })),
      }),
    });
    navigator.vibrate?.(st?.excluido ? [60, 60, 160] : esc.tipo === "falta" ? [20, 50, 20] : 25);
  };

  const confirmarLance = (esc: Escolha) => {
    if (!marcacao) return;
    lancar(marcacao.t, marcacao.origem, esc);
    setMarcacao(null);
  };

  const lancarDireto = (l: LanceDireto) => {
    fechar();
    lancar(l.t, l.origem, { tipo: l.tipo, valor: l.valor, falta: l.falta, time: l.time, jogador: l.jogador });
  };

  const escolherParada = (motivo: Parameters<typeof pausar>[0], time: TimeId | null) => {
    if (paradaT === null) return;
    const e = pausar(motivo, paradaT, time);
    setParadaT(null);
    const atual = jogoAtual();
    if (!e || !atual) return;
    mostrar({
      texto: `Jogo parado · ${nomePausa(atual, e)} · limite ${duracao(limitePausa(atual, e))}`,
      cor: "#ffd400",
      desfazer: () => alterarEvento(e.id, { removido: true }),
    });
    navigator.vibrate?.(40);
  };

  const retomarJogo = () => {
    const p = retomar();
    const atual = jogoAtual();
    if (!p || !atual) return;
    const ms = (p.t_fim ?? Date.now()) - p.t;
    const excesso = ms - limitePausa(atual, p);
    mostrar({
      texto: `Jogo retomado · ${nomePausa(atual, p)} durou ${duracao(ms)}${excesso > 0 ? ` (+${duracao(excesso)} acima)` : ""}`,
      cor: excesso > 0 ? "var(--destructive)" : "var(--neon-volt)",
      desfazer: () => alterarEvento(p.id, { t_fim: undefined }),
    });
    navigator.vibrate?.(30);
  };

  const desfazerUltimo = () => {
    const e = ultimoLance(jogo);
    if (!e) return;
    alterarEvento(e.id, { removido: true });
    mostrar({
      texto: `Desfeito: ${e.time ? `${jogo.times[e.time].sigla} ` : ""}${descrever(jogo, e)}`,
      desfazer: () => alterarEvento(e.id, { removido: false }),
    });
  };

  const confirmarEdicao = (esc: Escolha) => {
    if (!edicao) return;
    alterarEvento(edicao.id, {
      tipo: esc.tipo,
      valor: esc.tipo === "ponto" ? esc.valor : 0,
      falta: esc.tipo === "falta" ? (esc.falta ?? "P") : undefined,
      time: esc.time,
      jogador: esc.jogador,
      editado_em: Date.now(),
    });
    setEdicao(null);
    mostrar({ texto: "Lance corrigido. O clipe sai com o novo atleta.", cor: "var(--neon-volt)" });
  };

  const fimDoSync = (inicio: number, fim: number, cameras: number[]) => {
    setSync(false);
    if (fim - inicio >= 500) {
      registrar({ tipo: "sync", t: inicio, t_fim: fim, cameras });
      const ok = fim - inicio >= 3000;
      // O app sabe que mostrou o QR; quem confirma que a câmera filmou é o PC, ao ler o vídeo.
      const quais = cameras.length > 1 ? `QR mostrado às câmeras ${cameras.join(" e ")}.` : `QR mostrado à câmera ${cameras[0]}.`;
      mostrar({
        texto: ok ? quais : "Muito rápido: segure o QR na frente da câmera por 5 s.",
        cor: ok ? "var(--neon-volt)" : "var(--destructive)",
      });
    }
  };

  const syncOk = estadoSync(jogo).ok;

  // Um QR basta. O aviso só aparece se a câmera ainda não viu nenhum.
  const pedirEncerrar = () => {
    const encerrar = () => {
      encerrarJogo();
      if (usaServidor()) {
        pedirPermissaoDeAviso();
      } else {
        // Ainda dentro do toque: o celular só abre a tela de compartilhar logo depois de um toque.
        const fim = jogoAtual();
        if (fim) void mandarSumula(fim).then(() => setEnvios((n) => n + 1));
      }
      setAba("analise");
    };
    setPergunta(
      syncOk
        ? { titulo: "Encerrar o jogo?", confirmar: "Encerrar", acao: encerrar }
        : {
            titulo: "Encerrar o jogo?",
            texto: "A câmera ainda não viu o QR. Mostre agora, com a gravação rodando, para os clipes saírem no tempo certo.",
            confirmar: "Encerrar sem sincronizar",
            extra: { rotulo: "Sincronizar agora", acao: () => setSync(true) },
            acao: encerrar,
          },
    );
  };

  const pedirSaida = () => {
    const sair = () => {
      if (!sairDoJogo()) {
        mostrar({ texto: "Não consegui guardar a cópia neste aparelho. Baixe a súmula em Lances antes de sair.", cor: "var(--destructive)" });
        return;
      }
      setAba("jogo");
      setLanceVisto(null);
    };
    const envio = usaServidor() ? null : envioAnterior(jogo);
    const pendente = !usaServidor() && (!envio || envio.mudou);
    setPergunta({
      titulo: "Sair da partida?",
      texto: pendente
        ? "A súmula ainda não foi para o Drive. Uma cópia fica guardada neste aparelho, mas mande agora para os cortes saírem."
        : "O jogo fica guardado neste aparelho e você volta para a tela de novo jogo.",
      confirmar: pendente ? "Sair mesmo assim" : "Sair",
      extra: pendente
        ? {
            rotulo: "Mandar súmula e sair",
            acao: () =>
              void mandarSumula(jogo).then((r) => {
                if (r !== "cancelada") sair();
                else setEnvios((n) => n + 1);
              }),
          }
        : undefined,
      acao: sair,
    });
  };

  return (
    <MotionConfig reducedMotion="user">
      <FundoLados a={jogo.times.A.cor} b={jogo.times.B.cor} ativo={aba === "jogo" ? timeAtivo : null} />
      <AvisoAtualizacao jogo={jogo} />
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <header className="mb-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display-reta text-[10px] text-muted-foreground">
              {regras(jogo).nome} · {jogo.jogo.id.toUpperCase()}
            </p>
            <h1 className="truncate font-display text-xl">{jogo.jogo.nome}</h1>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => setSync(true)}
            className="chanfro chanfro-sm flex items-center gap-2 px-3 py-2 font-display-reta text-xs"
            style={{
              background: syncOk ? "var(--secondary)" : "var(--destructive)",
              color: syncOk ? "var(--foreground)" : "#fff",
            }}
          >
            <QrCode className="h-4 w-4" /> Sincronizar
          </motion.button>
        </header>

        <Placar jogo={jogo} onSync={() => setSync(true)} />

        {jogo.jogo.encerrado_em && (usaServidor() ? <PainelCortes jogo={jogo} /> : <PainelDrive key={envios} jogo={jogo} />)}
        {jogo.jogo.encerrado_em && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={pedirSaida}
            className="chanfro chanfro-sm mt-2 flex h-12 w-full items-center justify-center gap-2 bg-foreground font-display-reta text-sm text-background"
          >
            <LogOut className="h-4 w-4" /> Sair da partida
          </motion.button>
        )}

        {erroSalvar && (
          <p className="chanfro chanfro-sm mt-3 bg-destructive/15 px-3 py-2 text-sm text-destructive">
            Não consegui salvar neste aparelho. Exporte a súmula agora em Lances.
          </p>
        )}

        <main className="mt-4 flex-1">
          {/* Sem animação de saída: a aba nova nunca espera a anterior terminar de sair. */}
          <motion.div
              key={aba}
              initial={{ opacity: 0, x: 18, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.18 }}
            >
              {aba === "jogo" && (
                <TelaJogo
                  jogo={jogo}
                  bloqueado={!!marcacao}
                  time={timeAtivo}
                  onTrocarTime={setTimeAtivo}
                  onDireto={lancarDireto}
                  onDesfazer={desfazerUltimo}
                  podeDesfazer={!!ultimoLance(jogo)}
                  onMarcar={(m) => {
                    // O aviso do lance anterior some: o "Desfazer" não pode ficar por cima da folha.
                    fechar();
                    setMarcacao(m);
                  }}
                  onSync={() => setSync(true)}
                  onParar={(t) => {
                    fechar();
                    setParadaT(t);
                  }}
                  onRetomar={retomarJogo}
                  onInicio={() => {
                    const e = registrar({ tipo: "inicio", t: Date.now() });
                    if (e) mostrar({ texto: `Início do jogo · ${hora(e.t)}`, desfazer: () => alterarEvento(e.id, { removido: true }) });
                  }}
                  onPeriodo={() => {
                    const per = periodoAtual(jogo);
                    setPergunta({
                      titulo: `${fimDoPeriodo(jogo, per)}?`,
                      confirmar: `Encerrar ${nomePeriodo(jogo, per, true)}`,
                      acao: () => {
                        const e = registrar({ tipo: "periodo", t: Date.now() });
                        // O intervalo começa sozinho; "Retomar" quando a bola subir de novo.
                        const iv = e ? pausar("intervalo", e.t) : null;
                        if (e)
                          mostrar({
                            texto: `${fimDoPeriodo(jogo, per)} · intervalo correndo`,
                            desfazer: () => {
                              alterarEvento(e.id, { removido: true });
                              if (iv) alterarEvento(iv.id, { removido: true });
                            },
                          });
                      },
                    });
                  }}
                  onEncerrar={pedirEncerrar}
                />
              )}
              {aba === "analise" && <TelaAnalise jogo={jogo} />}
              {aba === "sumula" && <TelaSumula jogo={jogo} onAviso={(texto) => mostrar({ texto })} />}
              {aba === "lances" && (
                <TelaLances
                  jogo={jogo}
                  onEditar={setEdicao}
                  onAviso={(texto) => mostrar({ texto })}
                  onEncerrar={pedirEncerrar}
                  onNovo={() =>
                    setPergunta({
                      titulo: "Apagar este jogo?",
                      texto: "A súmula sai deste aparelho. Baixe o .json antes, senão os clipes não podem ser gerados.",
                      confirmar: "Apagar",
                      perigo: true,
                      acao: () => {
                        apagarJogo();
                        setAba("jogo");
                      },
                    })
                  }
                />
              )}
            </motion.div>
        </main>
      </div>

      {/* Navegação inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-4 px-3 py-2">
          {ABAS.map(({ id, rotulo, icone }) => {
            const Icone = icone ?? ICONE_JOGO[regras(jogo).id];
            return (
            <button
              key={id}
              type="button"
              onClick={() => setAba(id)}
              className="relative flex flex-col items-center gap-0.5 py-1.5"
            >
              {aba === id && (
                <motion.span
                  layoutId="aba-ativa"
                  className="chanfro chanfro-sm absolute inset-0 bg-foreground"
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                />
              )}
              <Icone className={`relative h-5 w-5 transition-colors ${aba === id ? "text-background" : "text-muted-foreground"}`} />
              <span className={`relative font-display-reta text-[11px] transition-colors ${aba === id ? "text-background" : "text-muted-foreground"}`}>
                {rotulo}
              </span>
            </button>
            );
          })}
        </div>
      </nav>

      <FolhaLance
        jogo={jogo}
        marcacao={marcacao}
        onFechar={() => setMarcacao(null)}
        onConfirmar={confirmarLance}
        onApagar={
          marcacao?.origem === "jogador"
            ? (e) => {
                alterarEvento(e.id, { removido: true });
                setMarcacao(null);
                mostrar({ texto: `Apagado: ${descrever(jogo, e)}`, desfazer: () => alterarEvento(e.id, { removido: false }) });
              }
            : undefined
        }
      />
      <FolhaLance
        jogo={jogo}
        titulo="Corrigir lance"
        permitirTrocarTime
        marcacao={
          edicao && edicao.time
            ? { time: edicao.time, jogador: edicao.jogador, t: edicao.t, origem: "jogador" }
            : null
        }
        onFechar={() => setEdicao(null)}
        onConfirmar={confirmarEdicao}
      />
      <FolhaPausa jogo={jogo} t={paradaT} onFechar={() => setParadaT(null)} onEscolher={escolherParada} />
      <AnimatePresence>{sync && <TelaSync idJogo={jogo.jogo.id} onFechar={fimDoSync} />}</AnimatePresence>
      <Dialogo pergunta={pergunta} onFechar={() => setPergunta(null)} />
      <ToastView toast={toast} onFechar={fechar} />
      {lanceVisto && !abertura && <LanceIso key={lanceVisto.id} jogo={jogo} evento={lanceVisto} onFim={() => setLanceVisto(null)} />}
      {abertura && <AberturaQuadra jogo={jogo} onFim={concluirAbertura} />}
    </MotionConfig>
  );
}
