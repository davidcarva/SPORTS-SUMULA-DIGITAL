#!/usr/bin/env python3
"""Corta os highlights de cada atleta a partir da súmula digital e do vídeo do jogo.

Uso básico:
    python cortar.py sumula.json video.mp4

Como funciona:
1. Procura no vídeo o QR de sincronização que o app da súmula mostra para a câmera.
   O QR traz o horário do aparelho do mesário, então dá para saber a que momento
   do vídeo corresponde cada lance (os relógios dos aparelhos não precisam bater).
2. Para cada ponto ou lance da súmula, corta um clipe de PRE segundos antes do
   toque do mesário até POS segundos depois (o mesário sempre anota com atraso).
3. Gera uma galeria (index.html) com os clipes por atleta e botões para avaliar
   se a jogada aparece. É assim que se mede o acerto no teste em campo.

Se o QR não aparecer no vídeo, use --ancora com o tempo do vídeo (MM:SS) em que
aconteceu o "Início do jogo" marcado no app.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import statistics
import subprocess
import sys
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

FORMATOS = {"sumula-highlights/1", "sumula-highlights/2"}
# Passo do QR de sincronização: o valor V aparece na tela de V até V + passo.
#   SDH1|<id>|<ms>        → app antigo, redesenha a cada 200 ms
#   SDH2:<ID>:<ms base36> → app atual (web/src/lib/qr.ts), quantizado em 100 ms
QR_PASSO_MS = {"SDH1": 200, "SDH2": 100}
TIPOS_COM_CLIPE = {"ponto", "lance"}

import formato_vertical as vertical  # noqa: E402  (render 9:16 vindo do programa Cortes)
MIN_LEITURAS = 5          # leituras mínimas para aceitar um trecho de QR
INCERTEZA_ALERTA_MS = 120 # acima disso, avisa que o alinhamento está fraco


# ---------------------------------------------------------------- utilidades

def falhar(msg: str) -> None:
    print(f"\nERRO: {msg}", file=sys.stderr)
    sys.exit(1)


def slug(texto: str, limite: int = 40) -> str:
    t = unicodedata.normalize("NFKD", str(texto)).encode("ascii", "ignore").decode()
    t = re.sub(r"[^a-zA-Z0-9]+", "-", t).strip("-").lower()
    return t[:limite] or "x"


def ler_tempo(texto: str) -> float:
    """Converte '83.5', '1:23.5' ou '0:01:23.5' em segundos."""
    partes = texto.strip().split(":")
    try:
        total = 0.0
        for p in partes:
            total = total * 60 + float(p)
        return total
    except ValueError:
        falhar(f"tempo inválido: {texto!r}. Use segundos (83.5) ou MM:SS (1:23.5).")
    return 0.0


def fmt_tempo(seg: float) -> str:
    m, s = divmod(max(seg, 0.0), 60)
    return f"{int(m):02d}:{s:04.1f}"


def exigir_ffmpeg() -> None:
    for prog in ("ffmpeg", "ffprobe"):
        if not shutil.which(prog):
            falhar(f"{prog} não encontrado no PATH. Instale o FFmpeg (ex.: winget install Gyan.FFmpeg).")


def duracao(video: Path) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(video)],
        capture_output=True, text=True,
    )
    try:
        return float(r.stdout.strip())
    except ValueError:
        falhar(f"não consegui ler a duração de {video}: {r.stderr.strip()}")
    return 0.0


# ---------------------------------------------------------------- súmula

@dataclass
class Sumula:
    dados: dict
    jogadores: dict = field(default_factory=dict)

    @classmethod
    def ler(cls, caminho: Path) -> "Sumula":
        try:
            dados = json.loads(caminho.read_text(encoding="utf-8-sig"))
        except (OSError, json.JSONDecodeError) as e:
            falhar(f"não consegui ler a súmula {caminho}: {e}")
        if dados.get("formato") not in FORMATOS:
            falhar(f"{caminho} não parece uma súmula exportada pelo app (formato {dados.get('formato')!r}).")
        s = cls(dados)
        for t in ("A", "B"):
            for j in dados["times"][t]["jogadores"]:
                s.jogadores[j["id"]] = {**j, "time": t}
        return s

    @property
    def id(self) -> str:
        return self.dados["jogo"]["id"]

    @property
    def nome(self) -> str:
        return self.dados["jogo"].get("nome") or "Jogo"

    @property
    def fuso(self) -> timezone:
        return timezone(timedelta(minutes=self.dados["jogo"].get("fuso_minutos", 0)))

    def time_nome(self, t: str | None) -> str:
        return self.dados["times"][t]["nome"] if t in ("A", "B") else ""

    def eventos(self, tipos: set[str] | None = None) -> list[dict]:
        evs = [e for e in self.dados["eventos"] if not e.get("removido")]
        if tipos is not None:
            evs = [e for e in evs if e["tipo"] in tipos]
        return sorted(evs, key=lambda e: e["t"])

    def hora(self, ms: float) -> str:
        return datetime.fromtimestamp(ms / 1000, self.fuso).strftime("%H:%M:%S")

    def syncs(self) -> list[dict]:
        """Momentos em que a tela do QR ficou aberta (app atual registra início e fim)."""
        return [e for e in self.eventos({"sync"}) if e.get("t_fim")]

    def descrever(self, e: dict) -> tuple[str, str]:
        """(quem, o quê) de um evento."""
        j = self.jogadores.get(e.get("jogador") or "")
        quem = (f"#{j['numero']} " if j and j.get("numero") else "") + (j["nome"] if j else "Sem jogador")
        mod = self.dados["jogo"]["modalidade"]
        if e["tipo"] == "lance":
            oque = "Lance"
        elif mod == "basquete":
            oque = f"+{e['valor']}"
        elif mod == "volei":
            oque = "Ponto"
        else:
            oque = "Gol"
        return quem, oque

    def periodo_nome(self, p: int) -> str:
        mod = self.dados["jogo"].get("modalidade", "basquete")
        if mod == "volei":
            return f"Set {p}"
        n = 2 if mod == "futsal" else 4
        letra = "T" if mod == "futsal" else "Q"
        return f"{p}º{letra}" if p <= n else f"PR{p - n}"

    def placares(self) -> dict[str, str]:
        """Placar logo depois de cada ponto (id do evento -> "ENG 54 x 48 DIR").
        No vôlei, o placar é o do set em que o ponto saiu."""
        mod = self.dados["jogo"].get("modalidade", "basquete")
        sig = {t: self.dados["times"][t].get("sigla") or t for t in ("A", "B")}
        soma: dict[tuple[int, str], int] = {}
        out: dict[str, str] = {}
        for e in self.eventos({"ponto"}):
            t = e.get("time")
            if t not in ("A", "B"):
                continue
            chave = int(e.get("periodo", 1)) if mod == "volei" else 0
            soma[(chave, t)] = soma.get((chave, t), 0) + int(e.get("valor") or 1)
            out[e["id"]] = f"{sig['A']} {soma.get((chave, 'A'), 0)} x {soma.get((chave, 'B'), 0)} {sig['B']}"
        return out

    def tarja(self, e: dict, entra: float, placares: dict[str, str]) -> "vertical.Tarja":
        """Texto queimado no clipe vertical: entra `entra` segundos depois do início do clipe."""
        quem, oque = self.descrever(e)
        t = e.get("time")
        time = self.dados["times"].get(t, {}) if t in ("A", "B") else {}
        return vertical.Tarja(
            nome=quem, lance=oque, time=time.get("nome", ""), cor=time.get("cor", "#ffffff"),
            periodo=self.periodo_nome(int(e.get("periodo", 1))), placar=placares.get(e["id"], ""),
            jogo=self.nome, entra=entra,
        )


# ---------------------------------------------------------------- sincronização

@dataclass
class Sinc:
    """Relação entre o relógio da súmula (ms) e o tempo do vídeo (s)."""
    pontos: list[tuple[float, float]]  # (tempo do vídeo em s, deslocamento em ms)
    metodo: str
    detalhes: list[str] = field(default_factory=list)
    incerteza: float = 0.0  # ± ms no pior trecho

    def deslocamento(self, pts: float) -> float:
        """Deslocamento (ms) no tempo pts do vídeo; interpola entre pontos de sincronização."""
        p = sorted(self.pontos)
        if len(p) == 1 or pts <= p[0][0]:
            return p[0][1]
        if pts >= p[-1][0]:
            return p[-1][1]
        for (t0, d0), (t1, d1) in zip(p, p[1:]):
            if t0 <= pts <= t1:
                return d0 + (d1 - d0) * (pts - t0) / (t1 - t0)
        return p[-1][1]

    def video_de(self, ms: float) -> float:
        """Tempo do vídeo (s) para um horário da súmula (ms)."""
        pts = (ms - self.pontos[0][1]) / 1000
        for _ in range(3):
            pts = (ms - self.deslocamento(pts)) / 1000
        return pts

    def horario_de(self, pts: float) -> float:
        return pts * 1000 + self.deslocamento(pts)


@dataclass
class Leitura:
    pts: float     # tempo do quadro no vídeo (s)
    ms: int        # horário mostrado no QR (ms, relógio da súmula)
    jogo: str      # id do jogo no QR
    passo: int     # passo do QR (ms)


def interpretar_qr(texto: str) -> tuple[str, int, int] | None:
    """(id do jogo, horário em ms, passo em ms) ou None se não for QR de sincronização."""
    texto = texto.strip()
    if texto.startswith("SDH2:"):
        partes = texto.split(":")
        if len(partes) == 3 and partes[1].isalnum() and partes[2].isalnum():
            try:
                return partes[1].lower(), int(partes[2], 36), QR_PASSO_MS["SDH2"]
            except ValueError:
                return None
    if texto.startswith("SDH1|"):
        partes = texto.split("|")
        if len(partes) == 3 and partes[2].isdigit():
            return partes[1].lower(), int(partes[2]), QR_PASSO_MS["SDH1"]
    return None


class LeitorQR:
    """Tenta ler o QR de três jeitos: direto, ampliado e com o detector ArUco (mais robusto)."""

    def __init__(self) -> None:
        import cv2  # noqa: PLC0415

        self.cv2 = cv2
        self.detectores = [cv2.QRCodeDetector()]
        if hasattr(cv2, "QRCodeDetectorAruco"):
            self.detectores.append(cv2.QRCodeDetectorAruco())

    def ler(self, quadro) -> tuple[str, int, int] | None:
        cv2 = self.cv2
        cinza = cv2.cvtColor(quadro, cv2.COLOR_BGR2GRAY) if quadro.ndim == 3 else quadro
        tentativas = [cinza]
        if max(cinza.shape[:2]) < 2000:
            tentativas.append(cv2.resize(cinza, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC))
        for det in self.detectores:
            for img in tentativas:
                try:
                    texto, _, _ = det.detectAndDecode(img)
                except cv2.error:
                    continue
                if texto:
                    r = interpretar_qr(texto)
                    if r:
                        return r
        return None


def ler_qrs(video: Path, janelas: list[tuple[float, float]], passo: int) -> list[Leitura]:
    """Leitura fina: quadro a quadro (1 a cada `passo`) nas janelas (início, fim) em segundos.
    Usa o tempo exato de cada quadro, que é o que dá precisão ao alinhamento."""
    try:
        import cv2  # noqa: PLC0415
    except ImportError:
        falhar("OpenCV não instalado. Rode: pip install -r requirements.txt")

    leitor = LeitorQR()
    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        falhar(f"o OpenCV não conseguiu abrir {video}")
    achados: list[Leitura] = []
    for ini, fim in janelas:
        cap.set(cv2.CAP_PROP_POS_MSEC, max(0.0, ini) * 1000)
        n = 0
        while cap.grab():
            pts = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
            if pts > fim:
                break
            if pts < ini:
                continue
            n += 1
            if n % passo:
                continue
            ok, quadro = cap.retrieve()
            if not ok:
                continue
            r = leitor.ler(quadro)
            if r:
                achados.append(Leitura(pts, r[1], r[0], r[2]))
    cap.release()
    return achados


def busca_rapida(video: Path, dur: float, janelas: list[tuple[float, float]] | None, fps: float = 5.0) -> list[float]:
    """Busca grossa: decodifica com o FFmpeg em baixa resolução e poucos quadros por segundo
    e devolve os tempos (s) em que o QR apareceu. Com `janelas=None`, varre o vídeo inteiro."""
    import cv2  # noqa: PLC0415
    import numpy as np  # noqa: PLC0415

    w, h = 960, 540
    det = cv2.QRCodeDetector()
    tempos: list[float] = []
    for ini, fim in janelas or [(0.0, dur)]:
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", f"{max(0.0, ini):.3f}", "-i", str(video),
               "-t", f"{max(0.1, fim - ini):.3f}", "-an",
               "-vf", f"fps={fps},scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:-1:-1",
               "-pix_fmt", "gray", "-f", "rawvideo", "-"]
        tamanho = w * h
        with subprocess.Popen(cmd, stdout=subprocess.PIPE) as proc:
            i = 0
            while True:
                dados = proc.stdout.read(tamanho) if proc.stdout else b""
                if len(dados) < tamanho:
                    break
                t = max(0.0, ini) + i / fps
                if janelas is None and i % int(fps * 60) == 0:
                    print(f"\r    {fmt_tempo(t)} / {fmt_tempo(dur)}", end="", flush=True)
                texto, _, _ = det.detectAndDecode(np.frombuffer(dados, np.uint8).reshape(h, w))
                if texto and interpretar_qr(texto):
                    tempos.append(t)
                i += 1
        if janelas is None:
            print()
    return tempos


def juntar(janelas: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Une janelas sobrepostas, para não ler o mesmo trecho duas vezes."""
    juntas: list[tuple[float, float]] = []
    for a, b in sorted(janelas):
        if juntas and a <= juntas[-1][1]:
            juntas[-1] = (juntas[-1][0], max(juntas[-1][1], b))
        else:
            juntas.append((a, b))
    return juntas


def janelas_em_volta(tempos: list[float], dur: float, antes: float = 3, depois: float = 10) -> list[tuple[float, float]]:
    return juntar([(max(0.0, t - antes), min(dur + 1, t + depois)) for t in tempos])


def inicio_gravacao_ms(video: Path) -> float | None:
    """creation_time do arquivo (ms). Alguns celulares gravam o início, outros o fim."""
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format_tags=creation_time",
                        "-of", "default=nw=1:nk=1", str(video)], capture_output=True, text=True)
    txt = r.stdout.strip()
    if not txt:
        return None
    try:
        return datetime.fromisoformat(txt.replace("Z", "+00:00")).timestamp() * 1000
    except ValueError:
        return None


def agrupar(achados: list[Leitura], intervalo: float = 10.0) -> list[list[Leitura]]:
    grupos: list[list[Leitura]] = []
    for a in sorted(achados, key=lambda x: x.pts):
        if grupos and a.pts - grupos[-1][-1].pts <= intervalo:
            grupos[-1].append(a)
        else:
            grupos.append([a])
    return grupos


@dataclass
class Trecho:
    pts: float          # meio do trecho no vídeo (s)
    desloc: float       # horário da súmula − tempo do vídeo (ms)
    incerteza: float    # ± ms
    leituras: int
    inicio: float
    fim: float


def estimar(g: list[Leitura]) -> Trecho:
    """Alinhamento de um trecho de QR.

    Cada leitura diz: no quadro de tempo p, o relógio da súmula estava entre v e v + passo.
    Então o deslocamento (relógio − vídeo) está em [v − p, v − p + passo]. A interseção de
    todas as leituras estreita o intervalo até ~1 quadro. Descartamos a leitura mais
    extrema de cada lado para tolerar um quadro com tempo ruim.
    """
    d = sorted(l.ms - l.pts * 1000 for l in g)
    passo = g[0].passo
    corte = 1 if len(d) >= 10 else 0
    baixo = d[-1 - corte]        # maior limite inferior
    alto = d[corte] + passo      # menor limite superior
    if baixo <= alto:
        desloc, inc = (baixo + alto) / 2, (alto - baixo) / 2
    else:  # leituras inconsistentes (taxa de quadros variável, cortes): usa a mediana
        desloc = statistics.median(d) + passo / 2
        inc = passo / 2 + (baixo - alto) / 2
    pts = [l.pts for l in g]
    return Trecho(statistics.median(pts), desloc, inc, len(g), min(pts), max(pts))


def sincronizar_qr(video: Path, sumula: Sumula, dur: float, varrer: float, tudo: bool, passo: int) -> Sinc | None:
    detalhes: list[str] = []
    tempos: list[float] = []

    def buscar(janelas: list[tuple[float, float]] | None, rotulo: str) -> None:
        if janelas is not None and not janelas:
            return
        print(f"  procurando o QR ({rotulo})…", flush=True)
        tempos.extend(busca_rapida(video, dur, janelas))

    # Busca grossa, do lugar mais provável ao menos provável.
    # 1) Onde o app diz que mostrou o QR, convertido para o tempo do vídeo pelo creation_time.
    criacao = inicio_gravacao_ms(video)
    syncs = sumula.syncs()
    if criacao and syncs and not tudo:
        janelas = []
        for s in syncs:
            for base in (criacao, criacao - dur * 1000):  # o celular grava o início ou o fim
                a = (s["t"] - base) / 1000 - 90
                b = (s["t_fim"] - base) / 1000 + 90
                if b > 0 and a < dur:
                    janelas.append((max(0.0, a), min(dur, b)))
        buscar(juntar(janelas), "perto dos horários registrados no app")

    # 2) Começo e fim do vídeo.
    if not tempos and not tudo:
        buscar(juntar([(0.0, min(dur, varrer)), (max(0.0, dur - varrer), dur)]), f"primeiros e últimos {varrer:g} s")

    # 3) Vídeo inteiro.
    if not tempos:
        buscar(None, "vídeo inteiro, pode levar alguns minutos")

    if not tempos:
        return None

    # Leitura fina: todos os quadros em volta de onde o QR apareceu.
    print("  lendo quadro a quadro os trechos com QR…", flush=True)
    achados = ler_qrs(video, janelas_em_volta(tempos, dur, antes=1.5, depois=1.5), passo)
    if not achados:
        return None
    outros = {a.jogo for a in achados if a.jogo != sumula.id}
    achados = [a for a in achados if a.jogo == sumula.id]
    if not achados:
        falhar(f"o vídeo tem QR de outro jogo ({', '.join(sorted(outros))}), não de {sumula.id}. "
               "Confira se escolheu a súmula certa.")

    trechos = [estimar(g) for g in agrupar(achados) if len(g) >= MIN_LEITURAS]
    if not trechos:
        falhar(f"o QR apareceu em só {len(achados)} quadro(s), pouco para sincronizar com segurança. "
               "Filme o QR por 5 s, mais perto e sem tremer, ou use --ancora.")

    for t in trechos:
        detalhes.append(f"QR em {fmt_tempo(t.inicio)}–{fmt_tempo(t.fim)}: {t.leituras} leituras, "
                        f"precisão ±{t.incerteza:.0f} ms")
        if t.incerteza > INCERTEZA_ALERTA_MS:
            detalhes.append("  ATENÇÃO: precisão baixa neste trecho (QR longe, tremido ou com reflexo).")
        # Confere com o que o app registrou: o QR tem de cair dentro de uma sincronização.
        horario = t.pts * 1000 + t.desloc
        if syncs and not any(s["t"] - 2000 <= horario <= s["t_fim"] + 2000 for s in syncs):
            detalhes.append("  ATENÇÃO: este QR não bate com nenhuma sincronização registrada no app.")
    if len(trechos) > 1:
        deriva = trechos[-1].desloc - trechos[0].desloc
        detalhes.append(f"diferença entre o primeiro e o último QR: {deriva:+.0f} ms")
        if abs(deriva) > 1000:
            detalhes.append("ATENÇÃO: mais de 1 s de diferença. O vídeo pode ter cortes ou taxa de quadros "
                            "variável; usei interpolação entre os trechos.")
    else:
        detalhes.append("1 trecho de QR: suficiente para os clipes.")
    s = Sinc([(t.pts, t.desloc) for t in trechos], "qr", detalhes)
    s.incerteza = max(t.incerteza for t in trechos)
    return s


METODOS = {"qr": "QR", "ancora": "âncora manual", "criacao": "horário da câmera, SEM QR"}
INCERTEZA_CRIACAO_MS = 2000.0  # relógios de celulares diferentes + creation_time arredondado ao segundo


def sincronizar_criacao(video: Path, sumula: Sumula, dur: float) -> Sinc | None:
    """Plano B, sem QR: usa o horário que a câmera gravou no arquivo (creation_time).

    Dois aparelhos, dois relógios: a diferença entre eles costuma ser de frações de segundo a
    alguns segundos, e o MP4 guarda o horário arredondado ao segundo. Alguns celulares gravam o
    início da gravação, outros o fim; escolhemos a hipótese em que mais registros do app caem
    dentro do vídeo.
    """
    criacao = inicio_gravacao_ms(video)
    if criacao is None:
        return None
    marcos = [e["t"] for e in sumula.eventos({"ponto", "lance", "inicio", "sync"})]
    hipoteses = [("início", criacao), ("fim", criacao - dur * 1000)]

    def dentro(desloc: float) -> int:
        return sum(0 <= (t - desloc) / 1000 <= dur for t in marcos)

    nome, desloc = max(hipoteses, key=lambda h: dentro(h[1]))  # empate: fica o "início"
    if dentro(desloc) == 0:
        return None
    return Sinc([(0.0, desloc)], "criacao", [
        f"SEM QR: alinhado pelo horário gravado pela câmera ({nome} da gravação).",
        f"ATENÇÃO: precisão de ~±{INCERTEZA_CRIACAO_MS / 1000:.0f} s. Os clipes foram alargados para não perder a "
        "jogada. Confira alguns na galeria e, no próximo jogo, filme o QR.",
    ], incerteza=INCERTEZA_CRIACAO_MS)


def sincronizar_ancora(sumula: Sumula, ancora: float) -> Sinc:
    inicios = sumula.eventos({"inicio"})
    if not inicios:
        falhar("--ancora precisa do evento 'Início do jogo' marcado no app, e esta súmula não tem.")
    t = inicios[0]["t"]
    return Sinc([(ancora, t - ancora * 1000)], "ancora",
                [f"'Início do jogo' ({sumula.hora(t)}) = {fmt_tempo(ancora)} do vídeo (precisão ~0,5 s)"],
                incerteza=500.0)


# ---------------------------------------------------------------- corte

def cortar(video: Path, ini: float, dur: float, saida: Path, copiar: bool) -> bool:
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{ini:.3f}", "-i", str(video),
           "-t", f"{dur:.3f}", "-map", "0:v:0", "-map", "0:a:0?"]
    if copiar:
        cmd += ["-c", "copy", "-avoid_negative_ts", "make_zero"]
    else:
        cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "128k"]
    cmd += ["-movflags", "+faststart", str(saida)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  falhou: {r.stderr.strip()[:300]}", file=sys.stderr)
        return False
    return True


# ---------------------------------------------------------------- galeria

GALERIA = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Highlights — __TITULO__</title>
<style>
:root{--bg:#f4f5f7;--card:#fff;--ink:#111827;--muted:#6b7280;--line:#e5e7eb;--a:#1d4ed8;--b:#b91c1c;--ok:#15803d;--warn:#b45309}
@media (prefers-color-scheme:dark){:root{--bg:#0b1020;--card:#151b2e;--ink:#e5e7eb;--muted:#9ca3af;--line:#26304a;--a:#60a5fa;--b:#f87171;--ok:#4ade80;--warn:#fbbf24}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:1100px;margin:0 auto;padding:16px}h1{font-size:22px;margin:4px 0}h2{font-size:17px;margin:24px 0 10px}
.sub{color:var(--muted);font-size:13px}.chips{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
.chip{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:6px 12px;cursor:pointer;color:var(--ink);font:inherit}
.chip.on{background:var(--ink);color:var(--bg)}.chip .A{color:var(--a)}.chip .B{color:var(--b)}
.grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.clip{background:var(--card);border-radius:14px;overflow:hidden;border:1px solid var(--line)}
.clip video{width:100%;display:block;background:#000;aspect-ratio:16/9}
.info{padding:10px 12px}.info b{font-size:15px}.meta{color:var(--muted);font-size:12px}
.aval{display:flex;gap:6px;margin-top:8px}.aval button{flex:1;border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:8px;padding:6px 4px;font-size:12px;cursor:pointer}
.aval button.on[data-v=ok]{background:var(--ok);color:#fff;border-color:var(--ok)}
.aval button.on[data-v=cortou]{background:var(--warn);color:#fff;border-color:var(--warn)}
.aval button.on[data-v=errado]{background:var(--b);color:#fff;border-color:var(--b)}
.resumo{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:flex;flex-wrap:wrap;gap:16px;align-items:center}
.resumo .n{font-size:22px;font-weight:700}.resumo button{margin-left:auto;border:0;border-radius:8px;padding:8px 12px;background:var(--ink);color:var(--bg);cursor:pointer}
.aviso{font-size:13px;color:var(--muted);margin-top:8px}
</style></head><body><main>
<h1>__TITULO__</h1>
<div class="sub">__SUB__</div>
<div class="resumo" id="resumo"></div>
<div class="aviso">Para cada clipe, marque se a jogada aparece inteira, se o corte pegou só parte dela ou se mostra outra coisa.
As marcações ficam salvas neste navegador; use "Exportar avaliação" para guardar o resultado.</div>
<div class="chips" id="chips"></div>
<div id="lista"></div>
</main>
<script>
const DADOS = __DADOS__;
const CHAVE = "highlights-aval:" + DADOS.jogo_id;
let aval = {};
try { aval = JSON.parse(localStorage.getItem(CHAVE) || "{}"); } catch (e) {}
const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(aval)); } catch (e) {} };
let filtro = "todos";
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function resumo() {
  const n = DADOS.clipes.length, v = Object.values(aval);
  const ok = v.filter((x) => x === "ok").length, cortou = v.filter((x) => x === "cortou").length;
  const errado = v.filter((x) => x === "errado").length, feitos = ok + cortou + errado;
  const pct = feitos ? Math.round(100 * ok / feitos) : 0;
  document.getElementById("resumo").innerHTML =
    `<div><div class="n">${n}</div><div class="sub">clipes</div></div>` +
    `<div><div class="n">${feitos}</div><div class="sub">avaliados</div></div>` +
    `<div><div class="n">${feitos ? pct + "%" : "–"}</div><div class="sub">jogada inteira</div></div>` +
    `<div><div class="n">${cortou} / ${errado}</div><div class="sub">cortou / errado</div></div>` +
    `<button id="exp">Exportar avaliação (.csv)</button>`;
  document.getElementById("exp").onclick = exportar;
}
function exportar() {
  const linhas = ["arquivo;atleta;time;tipo;horario;inicio_no_video;avaliacao"];
  for (const c of DADOS.clipes) linhas.push([c.arquivo, c.quem, c.time, c.oque, c.hora, c.inicio_video, aval[c.arquivo] || ""].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(";"));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\\ufeff" + linhas.join("\\r\\n")], {type: "text/csv"}));
  a.download = "avaliacao_" + DADOS.jogo_id + ".csv"; a.click();
}
function chips() {
  const grupos = {};
  for (const c of DADOS.clipes) grupos[c.chave] = grupos[c.chave] || {quem: c.quem, time: c.time_id, n: 0};
  for (const c of DADOS.clipes) grupos[c.chave].n++;
  const el = document.getElementById("chips");
  const itens = [["todos", `Todos (${DADOS.clipes.length})`, ""]].concat(
    Object.entries(grupos).sort((a, b) => b[1].n - a[1].n).map(([k, g]) => [k, `${esc(g.quem)} (${g.n})`, g.time]));
  el.innerHTML = itens.map(([k, r, t]) => `<button class="chip ${k === filtro ? "on" : ""}" data-k="${esc(k)}"><span class="${t}">●</span> ${r}</button>`).join("");
  el.querySelectorAll(".chip").forEach((b) => b.onclick = () => { filtro = b.dataset.k; chips(); lista(); });
}
function lista() {
  const cl = DADOS.clipes.filter((c) => filtro === "todos" || c.chave === filtro);
  document.getElementById("lista").innerHTML = `<div class="grade">` + cl.map((c) => `
    <div class="clip"><video src="${esc(c.arquivo)}" controls preload="metadata" playsinline></video>
    <div class="info"><b>${esc(c.oque)} · ${esc(c.quem)}</b>
    <div class="meta">${esc(c.time)} · ${esc(c.hora)} · ${c.periodo}º período · vídeo ${esc(c.inicio_video)}</div>
    <div class="aval" data-arq="${esc(c.arquivo)}">
      <button data-v="ok">✓ Aparece</button><button data-v="cortou">Cortou</button><button data-v="errado">Errado</button></div>
    </div></div>`).join("") + `</div>`;
  document.querySelectorAll(".aval").forEach((box) => {
    const arq = box.dataset.arq;
    box.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("on", aval[arq] === b.dataset.v);
      b.onclick = () => { aval[arq] = aval[arq] === b.dataset.v ? undefined : b.dataset.v; if (!aval[arq]) delete aval[arq]; salvar(); lista(); resumo(); };
    });
  });
}
resumo(); chips(); lista();
</script></body></html>
"""


def gerar_galeria(pasta: Path, sumula: Sumula, clipes: list[dict], sub: str) -> Path:
    dados = {"jogo_id": sumula.id, "clipes": clipes}
    js = json.dumps(dados, ensure_ascii=False).replace("</", "<\\/")
    pagina = (GALERIA.replace("__TITULO__", html.escape(sumula.nome))
              .replace("__SUB__", html.escape(sub))
              .replace("__DADOS__", js))
    caminho = pasta / "index.html"
    caminho.write_text(pagina, encoding="utf-8")
    return caminho


# ---------------------------------------------------------------- principal

def main() -> None:
    ap = argparse.ArgumentParser(description="Corta highlights por atleta a partir da súmula digital e do vídeo.")
    ap.add_argument("sumula", type=Path, help="arquivo .json exportado pelo app")
    ap.add_argument("videos", type=Path, nargs="+", help="vídeo(s) do jogo, na ordem")
    ap.add_argument("--saida", type=Path, help="pasta de saída (padrão: highlights/<jogo>)")
    ap.add_argument("--pre", type=float, default=12.0, help="segundos antes do toque do mesário (padrão 12)")
    ap.add_argument("--pos", type=float, default=3.0, help="segundos depois do toque (padrão 3)")
    ap.add_argument("--ancora", help="tempo no vídeo (MM:SS) do 'Início do jogo', se o QR não foi filmado")
    ap.add_argument("--varrer", type=float, default=180.0,
                    help="segundos do início e do fim de cada vídeo em que procurar o QR (padrão 180)")
    ap.add_argument("--varrer-tudo", action="store_true",
                    help="vai direto para a varredura do vídeo inteiro (normalmente só é usada se o QR não "
                         "aparecer perto dos horários do app nem no começo/fim)")
    ap.add_argument("--passo", type=int, default=1,
                    help="analisa 1 a cada N quadros ao ler o QR (padrão 1: todos, para máxima precisão)")
    ap.add_argument("--formato", choices=("original", "vertical", "ambos"), default="ambos",
                    help="original: o vídeo como foi filmado; vertical: 1080x1920 com a tarja do lance "
                         "(story/reels), na subpasta Vertical; ambos (padrão)")
    ap.add_argument("--copiar", action="store_true",
                    help="corta sem recodificar: muito mais rápido, mas o início do clipe vai para o quadro-chave anterior")
    a = ap.parse_args()

    # O console do Windows nem sempre é UTF-8; evita quebrar com acentos e setas.
    for fluxo in (sys.stdout, sys.stderr):
        try:
            fluxo.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass

    exigir_ffmpeg()
    sumula = Sumula.ler(a.sumula)
    eventos = sumula.eventos(TIPOS_COM_CLIPE)
    print(f"Súmula: {sumula.nome} ({sumula.id}) — {len(eventos)} lances para cortar")
    if not eventos:
        falhar("a súmula não tem pontos nem lances.")
    for v in a.videos:
        if not v.is_file():
            falhar(f"vídeo não encontrado: {v}")
    if a.ancora and len(a.videos) > 1:
        falhar("--ancora só funciona com um vídeo. Com vários, filme o QR em cada um.")

    # Sincroniza cada vídeo.
    cobertura: list[tuple[Path, Sinc, float]] = []
    for v in a.videos:
        dur = duracao(v)
        print(f"\nVídeo: {v.name} ({fmt_tempo(dur)})")
        if a.ancora:
            s = sincronizar_ancora(sumula, ler_tempo(a.ancora))
        else:
            s = sincronizar_qr(v, sumula, dur, a.varrer, a.varrer_tudo, max(1, a.passo))
            if s is None:
                print("  QR não encontrado; tentando o horário gravado pela câmera…", flush=True)
                s = sincronizar_criacao(v, sumula, dur)
            if s is None:
                falhar(f"não achei o QR de sincronização em {v.name}, e o vídeo não tem um horário de gravação\n"
                       "  que bata com a súmula (arquivo reenviado por WhatsApp costuma perder isso).\n"
                       "  Use --ancora MM:SS com o tempo do vídeo em que aconteceu o 'Início do jogo'.")
        for d in s.detalhes:
            print(f"  {d}")
        ini_h, fim_h = s.horario_de(0), s.horario_de(dur)
        print(f"  o vídeo cobre {sumula.hora(ini_h)} → {sumula.hora(fim_h)} no relógio da súmula")
        cobertura.append((v, s, dur))

    pasta = a.saida or Path("highlights") / f"{slug(sumula.nome)}_{sumula.id}"
    pasta.mkdir(parents=True, exist_ok=True)

    clipes, fora = [], []
    placares = sumula.placares()
    pasta_vertical = pasta / "Vertical"
    cfg_vertical = vertical.ler_config()
    tamanhos = {v: vertical.tamanho_video(v) for v, _, _ in cobertura} if a.formato != "original" else {}
    print(f"\nCortando em {pasta} …")
    for i, e in enumerate(eventos, 1):
        alvo = None
        for v, s, dur in cobertura:
            pts = s.video_de(e["t"])
            if 0 <= pts <= dur:
                alvo = (v, s, dur, pts)
                break
        quem, oque = sumula.descrever(e)
        if alvo is None:
            fora.append(f"{sumula.hora(e['t'])} {oque} {quem}")
            continue
        v, s, dur, pts = alvo
        # Alinhamento incerto (sem QR): alarga o clipe na mesma medida, para a jogada não ficar de fora.
        margem = s.incerteza / 1000 if s.incerteza > 250 else 0.0
        ini = max(0.0, pts - a.pre - margem)
        fim = min(dur, pts + a.pos + margem)
        nome = f"{i:03d}_{slug(sumula.time_nome(e.get('time')), 15)}_{slug(quem, 25)}_{slug(oque, 6)}.mp4"
        print(f"  [{i:3d}/{len(eventos)}] {sumula.hora(e['t'])} {oque:>5} {quem:<28} vídeo {fmt_tempo(ini)}–{fmt_tempo(fim)}",
              flush=True)
        ok = a.formato == "vertical" or cortar(v, ini, fim - ini, pasta / nome, a.copiar)
        nome_v = ""
        if ok and a.formato != "original":
            feito, erro = vertical.renderizar(v, ini, fim - ini, pasta_vertical / nome,
                                              sumula.tarja(e, pts - ini, placares), cfg_vertical, tamanhos[v])
            if feito:
                nome_v = f"Vertical/{nome}"
            else:
                print(f"  vertical falhou: {erro}", file=sys.stderr)
                ok = a.formato != "vertical"
        if ok:
            clipes.append({
                "vertical": nome_v,
                "arquivo": nome if a.formato != "vertical" else nome_v, "quem": quem, "oque": oque, "chave": e.get("jogador") or f"sem-{e.get('time')}",
                "time": sumula.time_nome(e.get("time")), "time_id": e.get("time") or "",
                "hora": sumula.hora(e["t"]), "periodo": e.get("periodo", 1),
                "inicio_video": fmt_tempo(ini), "video": v.name, "evento": e["id"],
            })

    pior = max(s.incerteza for _, s, _ in cobertura)
    sub = (f"{len(clipes)} clipes · {a.pre:g} s antes e {a.pos:g} s depois de cada anotação · "
           f"sincronização por {METODOS[cobertura[0][1].metodo]} (±{pior:.0f} ms)")
    galeria = gerar_galeria(pasta, sumula, clipes, sub)
    (pasta / "clipes.json").write_text(json.dumps(clipes, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n{len(clipes)} clipes gerados.")
    if fora:
        print(f"{len(fora)} lances ficaram fora do vídeo (a câmera não estava gravando nesse horário):")
        for f in fora:
            print(f"  - {f}")
    print(f"Galeria: {galeria.resolve()}")


if __name__ == "__main__":
    main()
