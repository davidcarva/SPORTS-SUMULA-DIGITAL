"""Versão vertical (9:16) de cada clipe, com a tarja do lance queimada no vídeo.

Adaptado do programa "Repositório Cortes" (src/render.py e src/captions.py):
  • o quadro 1080x1920 tem o próprio vídeo ampliado e desfocado no fundo e o vídeo nítido
    por cima (ou, com "preencher", o vídeo enche a tela e as laterais são cortadas);
  • o texto vai num arquivo .ass, que o ffmpeg queima com a libass.

Diferença: lá a legenda sai da transcrição da fala. Aqui não há fala para transcrever; a
tarja sai da própria súmula — quem fez, o que fez, o período e o placar depois do lance —
e entra no instante do toque do mesário, na cor do time.

O enquadramento pode ser ajustado em `cortes.json` (na pasta do projeto), chave "vertical".
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

LARGURA, ALTURA = 1080, 1920
FUNDO_W, FUNDO_H = 270, 480  # o fundo é desfocado pequeno e depois ampliado: rápido e mais liso

FONTES_WINDOWS = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")
CONFIG = Path(__file__).resolve().parent / "cortes.json"

PADRAO = {
    "blur": 22,
    "escurecer": 0.12,
    # largura do vídeo da frente em relação ao quadro (1.0 = largura toda; acima disso sangra)
    "largura": 1.0,
    "pos_x": 0.5,
    "pos_y": 0.42,
    # zoom recorta uma janela do vídeo antes de posicionar: tira arquibancada e teto de cena
    "zoom": 1.0,
    "pan_x": 0.5,
    "pan_y": 0.5,
    # sem blur: o vídeo enche os 9:16 e as laterais são descartadas
    "preencher": False,
    "recorte_x": 0.5,
    "fonte": "Arial Black",
    "crf": 21,
    "preset": "veryfast",
}


def ler_config() -> dict:
    cfg = dict(PADRAO)
    if CONFIG.is_file():
        try:
            cfg.update(json.loads(CONFIG.read_text(encoding="utf-8")).get("vertical", {}))
        except (OSError, json.JSONDecodeError, AttributeError):
            pass
    return cfg


# ---------------------------------------------------------------- filtro (do Cortes)

def _escapar_caminho(caminho: str) -> str:
    """Caminho dentro de um filter_complex: o ':' passa por dois parsers do ffmpeg."""
    return caminho.replace("\\", "/").replace(":", "\\\\:")


def _filtro_texto() -> str:
    """Roda com cwd na pasta temporária, então o .ass é relativo (sem escapar)."""
    f = "subtitles=tarja.ass"
    if os.path.isdir(FONTES_WINDOWS):
        f += ":fontsdir=" + _escapar_caminho(FONTES_WINDOWS)
    return f


def montar_filtro(largura_video: int, altura_video: int, cfg: dict, com_texto: bool) -> str:
    if cfg["preencher"]:
        x = f"(iw-{LARGURA})*{float(cfg['recorte_x']):.4f}"
        base = (
            f"[0:v]scale={LARGURA}:{ALTURA}:force_original_aspect_ratio=increase,"
            f"crop={LARGURA}:{ALTURA}:{x}:(ih-{ALTURA})/2,setsar=1[base]"
        )
    else:
        zoom = max(1.0, float(cfg["zoom"]))
        recorte = ""
        if zoom > 1.001:
            recorte = (
                f"crop=iw/{zoom:.4f}:ih/{zoom:.4f}:"
                f"(iw-iw/{zoom:.4f})*{float(cfg['pan_x']):.4f}:(ih-ih/{zoom:.4f})*{float(cfg['pan_y']):.4f},"
            )
        fw = max(2, int(round(LARGURA * float(cfg["largura"]) / 2)) * 2)
        fh = max(2, int(round(fw * altura_video / max(largura_video, 1) / 2)) * 2)
        x = int(round(LARGURA * float(cfg["pos_x"]) - fw / 2))
        y = int(round(ALTURA * float(cfg["pos_y"]) - fh / 2))
        sigma = max(0.1, float(cfg["blur"]) / 2)
        fundo = (
            f"[0:v]scale={FUNDO_W}:{FUNDO_H}:force_original_aspect_ratio=increase,"
            f"crop={FUNDO_W}:{FUNDO_H},gblur=sigma={sigma:.2f},"
            f"scale={LARGURA}:{ALTURA},eq=brightness={-float(cfg['escurecer']):.3f},setsar=1[bg]"
        )
        frente = f"[0:v]{recorte}scale={fw}:-2,setsar=1[fg]"
        base = f"{fundo};{frente};[bg][fg]overlay={x}:{y}[base]"
    return f"{base};[base]{_filtro_texto()}[v]" if com_texto else f"{base};[base]null[v]"


# ---------------------------------------------------------------- tarja (ASS)

@dataclass
class Tarja:
    """O que aparece no clipe vertical."""
    nome: str         # "#7 JOÃO"
    lance: str        # "+3", "GOL", "PONTO"
    time: str         # "ENGENHARIA"
    cor: str          # cor do time (#rrggbb)
    periodo: str      # "2ºQ", "SET 3"
    placar: str       # "ENG 54 x 48 DIR"
    jogo: str         # nome do jogo, no topo
    entra: float      # segundos dentro do clipe em que o lance acontece


def cor_ass(hex_cor: str, alfa: int = 0) -> str:
    """#RRGGBB -> &HAABBGGRR (o ASS guarda a cor invertida, em BGR)."""
    h = (hex_cor or "#FFFFFF").lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if not re.fullmatch(r"[0-9a-fA-F]{6}", h):
        h = "FFFFFF"
    return f"&H{alfa:02X}{h[4:6]}{h[2:4]}{h[0:2]}".upper()


def texto_sobre(hex_cor: str) -> str:
    """Preto sobre cores claras, branco nas demais (igual ao app)."""
    h = (hex_cor or "#000000").lstrip("#")
    try:
        r, g, b = (int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))
    except ValueError:
        return "#FFFFFF"
    lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in (r, g, b)]
    return "#111111" if 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2] > 0.4 else "#FFFFFF"


def tempo_ass(t: float) -> str:
    t = max(t, 0.0)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def _limpar(texto: str) -> str:
    return (texto or "").replace("\\", "").replace("{", "").replace("}", "").replace("\n", " ").strip()


def montar_ass(t: Tarja, duracao: float, fonte: str) -> str:
    """Topo: jogo e placar o clipe todo. Embaixo, no instante do lance: a tarja do atleta,
    que entra deslizando com uma faixa na cor do time e fica até o fim."""
    cor = cor_ass(t.cor)
    letra = cor_ass(texto_sobre(t.cor))
    branco, preto = cor_ass("#FFFFFF"), cor_ass("#111111")
    fim = tempo_ass(duracao + 0.5)
    entra = max(0.0, t.entra - 0.35)
    e0 = tempo_ass(entra)
    # posições em pixels do quadro 1080x1920
    yb = 1460  # linha de base da tarja
    estilos = (
        f"Style: Topo,{fonte},40,{branco},{branco},{preto},&H64000000,0,0,0,0,100,100,1,0,1,4,0,8,60,60,70,1\n"
        f"Style: Lance,{fonte},150,{letra},{letra},{cor},&H00000000,0,1,0,0,100,100,0,0,1,0,0,1,0,0,0,1\n"
        f"Style: Nome,{fonte},74,{branco},{branco},{preto},&H00000000,0,1,0,0,100,100,0,0,1,6,0,1,0,0,0,1\n"
        f"Style: Info,{fonte},40,{branco},{branco},{preto},&H00000000,0,0,0,0,100,100,2,0,1,4,0,1,0,0,0,1\n"
        f"Style: Caixa,{fonte},20,{cor},{cor},{cor},&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n"
    )
    cab = (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {LARGURA}\nPlayResY: {ALTURA}\nWrapStyle: 2\nScaledBorderAndShadow: yes\nYCbCr Matrix: TV.601\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
        "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, "
        "MarginR, MarginV, Encoding\n" + estilos + "\n[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    topo = _limpar(f"{t.jogo}  ·  {t.periodo}").upper()
    linhas = [f"Dialogue: 0,{tempo_ass(0)},{fim},Topo,,0,0,0,,{{\\fad(300,0)}}{topo}"]
    # Faixa diagonal na cor do time (desenho vetorial do ASS), entra da esquerda.
    faixa = "m 0 0 l 700 0 l 660 190 l 0 190"
    linhas.append(
        f"Dialogue: 1,{e0},{fim},Caixa,,0,0,0,,"
        f"{{\\move(-760,{yb - 190},40,{yb - 190},0,260)\\p1\\bord0\\shad0\\1c{cor}}}{faixa}{{\\p0}}"
    )
    # O lance em letras grandes, dentro da faixa, com um "soco" de escala ao entrar.
    linhas.append(
        f"Dialogue: 2,{e0},{fim},Lance,,0,0,0,,"
        f"{{\\pos(70,{yb - 12})\\fscx150\\fscy150\\t(180,360,\\fscx100\\fscy100)\\fad(120,0)}}{_limpar(t.lance).upper()}"
    )
    # Nome do atleta e, embaixo, time e placar.
    linhas.append(
        f"Dialogue: 2,{e0},{fim},Nome,,0,0,0,,"
        f"{{\\move(-200,{yb + 92},70,{yb + 92},120,380)\\fad(150,0)}}{_limpar(t.nome).upper()}"
    )
    info = _limpar(f"{t.time}  ·  {t.placar}").upper()
    linhas.append(
        f"Dialogue: 2,{e0},{fim},Info,,0,0,0,,"
        f"{{\\move(-200,{yb + 150},70,{yb + 150},200,460)\\fad(200,0)}}{info}"
    )
    return cab + "\n".join(linhas) + "\n"


# ---------------------------------------------------------------- render

def _sem_janela() -> dict:
    """Evita piscar janela de console no Windows."""
    if sys.platform != "win32":
        return {}
    si = subprocess.STARTUPINFO()
    si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    return {"startupinfo": si, "creationflags": subprocess.CREATE_NO_WINDOW}


def tamanho_video(video: Path) -> tuple[int, int]:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
         "-of", "csv=p=0:s=x", str(video)],
        capture_output=True, text=True, **_sem_janela(),
    )
    try:
        w, h = r.stdout.strip().splitlines()[0].split("x")[:2]
        return int(w), int(h)
    except (ValueError, IndexError):
        return 1920, 1080


def renderizar(video: Path, ini: float, dur: float, saida: Path, tarja: Tarja | None, cfg: dict | None = None,
               tamanho: tuple[int, int] | None = None) -> tuple[bool, str]:
    """Gera o clipe vertical. Devolve (ok, erro)."""
    cfg = cfg or ler_config()
    w, h = tamanho or tamanho_video(video)
    saida = Path(saida).resolve()
    saida.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="vertical_") as tmp:
        if tarja:
            Path(tmp, "tarja.ass").write_text(montar_ass(tarja, dur, cfg["fonte"]), encoding="utf-8-sig")
        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-ss", f"{ini:.3f}", "-i", str(Path(video).resolve()), "-t", f"{dur:.3f}",
            "-filter_complex", montar_filtro(w, h, cfg, tarja is not None),
            "-map", "[v]", "-map", "0:a:0?",
            "-c:v", "libx264", "-preset", str(cfg["preset"]), "-crf", str(cfg["crf"]), "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart",
            str(saida),
        ]
        r = subprocess.run(cmd, cwd=tmp, capture_output=True, text=True, encoding="utf-8", errors="replace",
                           **_sem_janela())
    if r.returncode != 0:
        return False, (r.stderr or "").strip()[-400:]
    return True, ""
