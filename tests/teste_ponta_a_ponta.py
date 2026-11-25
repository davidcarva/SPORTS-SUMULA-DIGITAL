"""Teste ponta a ponta do cortar.py com vídeos sintéticos.

Cada vídeo simula a câmera filmando o jogo:
  • nos trechos de sincronização, o QR do app (formato SDH2, muda a cada 100 ms), inclinado,
    com ruído e com o pequeno atraso de tela de um celular de verdade;
  • no resto, um "QR da verdade" no canto com o horário real daquele quadro.

O teste roda o cortar.py e lê o QR da verdade no primeiro e no último quadro de cada clipe
para conferir se o corte caiu no horário certo.

Cenários:
  1. QR no início e no fim do vídeo (uso normal)
  2. QR só no meio do jogo, sem metadados → varredura do vídeo inteiro
  3. Vídeo com creation_time (relógio da câmera 1,7 s adiantado) + sync registrada no app
  4. Âncora manual pelo "Início do jogo"
  5. Súmula de outro jogo → precisa recusar, nunca cortar errado

Uso:  python tests/teste_ponta_a_ponta.py
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np

RAIZ = Path(__file__).resolve().parent.parent
FPS = 30
DUR = 90.0
W, H = 1280, 720
BASE = 1_762_450_000_123  # horário (ms) do relógio da súmula no quadro 0 do vídeo
ID = "tst7kq"
PRE, POS = 12.0, 3.0
TOL_MS = 50               # tolerância de cada borda do clipe
ATRASO_TELA_MS = 15       # o QR novo aparece na tela um pouco depois da virada dos 100 ms

enc = cv2.QRCodeEncoder.create()
det = cv2.QRCodeDetector()
rng = np.random.default_rng(7)


def b36(n: int) -> str:
    dig = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    s = ""
    while n:
        n, r = divmod(n, 36)
        s = dig[r] + s
    return s or "0"


def qr_img(texto: str, lado: int) -> np.ndarray:
    m = enc.encode(texto)
    return cv2.cvtColor(cv2.resize(m, (lado, lado), interpolation=cv2.INTER_NEAREST), cv2.COLOR_GRAY2BGR)


def quadro(k: int, trechos_qr: list[tuple[float, float]], prefixo: str = "SDH2", inicio_ms: float = BASE,
           id_jogo: str = ID) -> np.ndarray:
    t = k / FPS
    real = inicio_ms + t * 1000
    img = np.full((H, W, 3), (70, 95, 120), np.uint8)
    cv2.rectangle(img, (40, 120), (W - 40, H - 40), (200, 200, 200), 3)
    if any(a <= t < b for a, b in trechos_qr):
        v = int((real - ATRASO_TELA_MS) // 100 * 100)
        q = qr_img(f"{prefixo}:{id_jogo.upper()}:{b36(v)}", 290)
        src = np.float32([[0, 0], [290, 0], [290, 290], [0, 290]])
        dst = np.float32([[500, 210], [780, 236], [762, 516], [482, 498]])
        M = cv2.getPerspectiveTransform(src, dst)
        torto = cv2.warpPerspective(q, M, (W, H))
        mascara = cv2.warpPerspective(np.full((290, 290), 255, np.uint8), M, (W, H))
        img[mascara > 0] = torto[mascara > 0]
        img = cv2.GaussianBlur(img, (3, 3), 0.8)  # leve desfoque de câmera
    else:
        img[20:240, W - 240:W - 20] = qr_img(f"TRUTH|{int(round(real))}", 220)
        cv2.putText(img, f"t={t:6.2f}s", (60, 90), cv2.FONT_HERSHEY_SIMPLEX, 1.6, (255, 255, 255), 3)
    ruido = rng.integers(-12, 12, img.shape, dtype=np.int16)
    return np.clip(img.astype(np.int16) + ruido, 0, 255).astype(np.uint8)


def gerar_video(destino: Path, trechos_qr: list[tuple[float, float]], criacao_ms: float | None = None,
                prefixo: str = "SDH2", inicio_ms: float = BASE, id_jogo: str = ID) -> Path:
    """`prefixo` SDK<n> faz o QR dizer a câmera n; `inicio_ms` é o horário real do quadro 0
    (uma segunda câmera que começou a gravar depois)."""
    bruto = destino.with_suffix(".bruto.mp4")
    vw = cv2.VideoWriter(str(bruto), cv2.VideoWriter_fourcc(*"mp4v"), FPS, (W, H))
    for k in range(int(DUR * FPS)):
        vw.write(quadro(k, trechos_qr, prefixo, inicio_ms, id_jogo))
    vw.release()
    meta = []
    if criacao_ms is not None:
        iso = datetime.fromtimestamp(criacao_ms / 1000, timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        meta = ["-metadata", f"creation_time={iso}"]
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(bruto),
                    "-f", "lavfi", "-i", f"sine=frequency=440:duration={DUR}",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-g", "60", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-shortest", *meta, str(destino)], check=True)
    bruto.unlink()
    return destino


def sumula(destino: Path, marcas_s: list[float], syncs_s: list[tuple[float, float]], id_jogo: str = ID) -> list[int]:
    jog = lambda t, n, nome: {"id": f"{t}{n}", "numero": str(n), "nome": nome}  # noqa: E731
    evs = [{"id": "ini", "t": BASE + 10_000, "tipo": "inicio", "time": None, "jogador": None, "valor": 0,
            "periodo": 1, "removido": False, "t_confirmado": BASE + 10_000}]
    for i, (a, b) in enumerate(syncs_s):
        evs.append({"id": f"s{i}", "t": BASE + int(a * 1000) - 400, "t_fim": BASE + int(b * 1000) + 300,
                    "tipo": "sync", "time": None, "jogador": None, "valor": 0, "periodo": 1, "removido": False,
                    "t_confirmado": BASE + int(b * 1000)})
    for i, m in enumerate(marcas_s):
        t = BASE + int(m * 1000)
        evs.append({"id": f"e{i}", "t": t, "t_confirmado": t + 900, "tipo": "ponto" if i != 1 else "lance",
                    "time": "A" if i % 2 == 0 else "B", "jogador": "A4" if i % 2 == 0 else "B8",
                    "valor": 2 if i != 1 else 0, "periodo": 1, "removido": False, "origem": "jogador"})
    evs.append({"id": "rm", "t": BASE + 30_000, "tipo": "ponto", "time": "A", "jogador": "A4", "valor": 3,
                "periodo": 1, "removido": True, "t_confirmado": BASE + 30_500})
    evs.append({"id": "fora", "t": BASE + 500_000, "tipo": "ponto", "time": "B", "jogador": "B8", "valor": 1,
                "periodo": 4, "removido": False, "t_confirmado": BASE + 500_500})
    dados = {
        "formato": "sumula-highlights/2",
        "jogo": {"id": id_jogo, "nome": "Teste sintético", "modalidade": "basquete", "criado_em": BASE,
                 "fuso_minutos": -180, "app": "teste"},
        "times": {"A": {"nome": "Engenharia", "sigla": "ENG", "cor": "#2e7dff", "jogadores": [jog("A", 4, "Matheus")]},
                  "B": {"nome": "Direito", "sigla": "DIR", "cor": "#ff6a00", "jogadores": [jog("B", 8, "Rafael")]}},
        "eventos": evs,
    }
    destino.write_text(json.dumps(dados, ensure_ascii=False), encoding="utf-8")
    return [BASE + int(m * 1000) for m in marcas_s]


def ler_verdade(clipe: Path, ultimo: bool) -> int | None:
    cap = cv2.VideoCapture(str(clipe))
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    img = None
    for alvo in ([n - 1, n - 2] if ultimo else [0]):
        cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, alvo))
        ok, img = cap.read()
        if ok:
            break
    cap.release()
    if img is None:
        return None
    texto, _, _ = det.detectAndDecode(img)
    return int(texto.split("|")[1]) if texto.startswith("TRUTH|") else None


def rodar(sumula_json: Path, video: Path | list[Path], saida: Path, extra: list[str], deve_falhar: bool = False) -> str:
    videos = video if isinstance(video, list) else [video]
    r = subprocess.run([sys.executable, str(RAIZ / "cortar.py"), str(sumula_json), *map(str, videos),
                        "--saida", str(saida), "--pre", str(PRE), "--pos", str(POS), *extra],
                       capture_output=True, text=True, encoding="utf-8")
    print("    " + r.stdout.replace("\n", "\n    ").rstrip())
    if deve_falhar:
        if r.returncode == 0:
            raise SystemExit("cortar.py deveria ter recusado, mas cortou")
        print("    (recusou, como esperado) " + r.stderr.strip().splitlines()[-1])
        return r.stdout + r.stderr
    if r.returncode != 0:
        print(r.stderr)
        raise SystemExit(f"cortar.py falhou ({r.returncode})")
    return r.stdout


def conferir(saida: Path, esperados: list[int], margem_ms: float = 0, tol_ms: float = TOL_MS,
             erro_relogio_ms: float = 0, camera: int | None = None) -> list[str]:
    """Confere as bordas de cada clipe. `margem_ms` é o alargamento que o cortar.py aplica quando o
    alinhamento é incerto; `erro_relogio_ms` é o erro conhecido do relógio da câmera no cenário."""
    clipes = json.loads((saida / "clipes.json").read_text(encoding="utf-8"))
    if camera is not None:
        clipes = [c for c in clipes if c.get("camera") == camera]
    erros = []
    if len(clipes) != len(esperados):
        erros.append(f"{saida.name}: esperava {len(esperados)} clipes, vieram {len(clipes)}")
    for c, t in zip(clipes, esperados):
        ini = ler_verdade(saida / c["arquivo"], ultimo=False)
        fim = ler_verdade(saida / c["arquivo"], ultimo=True)
        if ini is None or fim is None:
            erros.append(f"{saida.name}/{c['arquivo']}: não li o QR da verdade (ini={ini}, fim={fim})")
            continue
        di = ini - (t - PRE * 1000 - margem_ms) - erro_relogio_ms
        df = fim - (t + POS * 1000 + margem_ms) + 1000 / FPS - erro_relogio_ms  # último quadro: 1 quadro antes do fim
        contem = ini <= t <= fim
        print(f"    {c['arquivo']}: início {di:+.0f} ms, fim {df:+.0f} ms, contém o toque: {'sim' if contem else 'NÃO'}")
        if not contem:
            erros.append(f"{saida.name}/{c['arquivo']}: o momento do toque ficou fora do clipe")
        if abs(di) > tol_ms or abs(df) > tol_ms:
            erros.append(f"{saida.name}/{c['arquivo']}: fora da tolerância (início {di:+.0f}, fim {df:+.0f} ms)")
    return erros


def main() -> None:
    erros: list[str] = []
    with tempfile.TemporaryDirectory(prefix="sumula_teste_") as tmp:
        d = Path(tmp)

        print("\n[1] QR no início e no fim")
        v1 = gerar_video(d / "v1.mp4", [(3, 9), (80, 86)])
        e1 = sumula(d / "s1.json", [25.0, 40.5, 60.25], [(3, 9), (80, 86)])
        out = rodar(d / "s1.json", v1, d / "o1", [])
        erros += conferir(d / "o1", e1)
        if "1 lances ficaram fora do vídeo" not in out:
            erros.append("[1] o lance fora do vídeo não foi apontado")
        if out.count("QR em") != 2:
            erros.append("[1] deveria achar 2 trechos de QR")

        print("\n[2] QR só no meio, sem metadados (varredura completa)")
        v2 = gerar_video(d / "v2.mp4", [(40, 46)])
        e2 = sumula(d / "s2.json", [20.0, 65.0, 80.0], [(40, 46)])
        out = rodar(d / "s2.json", v2, d / "o2", ["--varrer", "10"])
        erros += conferir(d / "o2", e2)
        if "vídeo inteiro" not in out:
            erros.append("[2] deveria ter varrido o vídeo inteiro")

        print("\n[3] creation_time com relógio da câmera 1,7 s adiantado + sync registrada no app")
        v3 = gerar_video(d / "v3.mp4", [(40, 46)], criacao_ms=BASE + 1700)
        out = rodar(d / "s2.json", v3, d / "o3", ["--varrer", "10"])
        erros += conferir(d / "o3", e2)
        if "perto dos horários registrados" not in out or "vídeo inteiro" in out:
            erros.append("[3] deveria achar o QR direto pelos horários do app, sem varrer tudo")

        print("\n[4] âncora manual (Início do jogo aos 0:10) — clipe alargado em 0,5 s")
        rodar(d / "s1.json", v1, d / "o4", ["--ancora", "0:10"])
        erros += conferir(d / "o4", e1, margem_ms=500)

        print("\n[6] sem QR nenhum: só o horário da câmera (1,7 s adiantado) — plano B")
        v6 = gerar_video(d / "v6.mp4", [], criacao_ms=BASE + 1700)
        e6 = sumula(d / "s6.json", [20.0, 45.0, 70.0], [])
        out = rodar(d / "s6.json", v6, d / "o6", ["--varrer", "10"])
        # O alinhamento erra (relógio da câmera adiantado e creation_time arredondado ao segundo),
        # mas tem de ficar dentro dos ±2 s prometidos e o alargamento mantém a jogada no clipe.
        erros += conferir(d / "o6", e6, margem_ms=2000, tol_ms=2000)
        if "SEM QR" not in out:
            erros.append("[6] deveria avisar que alinhou sem QR")

        print("\n[7] duas câmeras (a 2ª começou 4 s depois) + um vídeo de outro jogo na mesma leva")
        c1 = gerar_video(d / "cam1.mp4", [(3, 9)], prefixo="SDK1")
        c2 = gerar_video(d / "cam2.mp4", [(3, 9)], prefixo="SDK2", inicio_ms=BASE + 4000)
        alheio = gerar_video(d / "alheio.mp4", [(3, 9)], prefixo="SDK1", id_jogo="outro9")
        e7 = sumula(d / "s7.json", [25.0, 40.5, 60.25], [(3, 9), (7, 13)])
        out = rodar(d / "s7.json", [c1, c2, alheio], d / "o7", [])
        erros += conferir(d / "o7", e7, camera=1)
        erros += conferir(d / "o7", e7, camera=2)
        clipes7 = json.loads((d / "o7" / "clipes.json").read_text(encoding="utf-8"))
        if not all(c["arquivo"].startswith(f"Câmera {c['camera']}/") and (d / "o7" / c["vertical"]).is_file()
                   for c in clipes7):
            erros.append("[7] cada câmera deveria ter a sua pasta, com a versão vertical")
        info7 = json.loads((d / "o7" / "videos.json").read_text(encoding="utf-8"))
        if not any(x.get("outro_jogo") and x["video"].endswith("alheio.mp4") for x in info7):
            erros.append("[7] o vídeo de outro jogo deveria ser deixado de lado (e apontado), sem derrubar o corte")

        print("\n[8] corte de novo com o anterior: nada mudou, nada é recortado")
        out = rodar(d / "s7.json", [c1, c2], d / "o8", ["--reaproveitar", str(d / "o7")])
        if "(6 reaproveitados" not in out:
            erros.append("[8] os 6 clipes deveriam vir do corte anterior")
        erros += conferir(d / "o8", e7, camera=2)

        print("\n[9] o mesário esqueceu de trocar: as duas câmeras filmaram o QR como câmera 1")
        c1b = gerar_video(d / "cam1b.mp4", [(3, 9)], prefixo="SDK1", inicio_ms=BASE + 4000)
        out = rodar(d / "s7.json", [c1, c1b], d / "o9", [])
        clipes9 = json.loads((d / "o9" / "clipes.json").read_text(encoding="utf-8"))
        if sorted({c["camera"] for c in clipes9}) != [1, 2] or "virou a câmera 2" not in out:
            erros.append("[9] dois vídeos ao mesmo tempo com o mesmo número deveriam virar câmeras 1 e 2, com aviso")
        erros += conferir(d / "o9", e7, camera=2)

        print("\n[5] súmula de outro jogo")
        sumula(d / "s5.json", [25.0], [(3, 9)], id_jogo="outro9")
        out = rodar(d / "s5.json", v1, d / "o5", [], deve_falhar=True)
        if "outro jogo" not in out:
            erros.append("[5] a recusa deveria explicar que o QR é de outro jogo")

    if erros:
        print("\nFALHOU:")
        for e in erros:
            print(f"  - {e}")
        raise SystemExit(1)
    print(f"\nOK: com QR ou âncora, todos os clipes ficaram a menos de {TOL_MS} ms do horário certo; "
          "sem QR, dentro dos ±2 s prometidos e com a jogada dentro do clipe. A súmula de outro jogo foi recusada.")


if __name__ == "__main__":
    main()
