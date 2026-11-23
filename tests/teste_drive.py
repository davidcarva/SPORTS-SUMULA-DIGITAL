"""Teste do caminho pelo Google Drive: nada passa pela rede, tudo pela pasta.

A súmula (.txt salvo pelo app) e o vídeo caem na mesma pasta. O programa reconhece o jogo, corta e
copia os clipes para a subpasta Cortes. Usa o vídeo sintético do teste ponta a ponta, com um QR.

Uso:  python tests/teste_drive.py
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from teste_ponta_a_ponta import BASE, ID, RAIZ, gerar_video, sumula  # noqa: E402


def main() -> None:
    erros: list[str] = []

    def conferir(ok: bool, texto: str):
        print(("  ok   " if ok else "  FALHA ") + texto)
        if not ok:
            erros.append(texto)

    with tempfile.TemporaryDirectory(prefix="sumula_drive_") as tmp:
        d = Path(tmp)
        drive = d / "Meu Drive" / "Súmula Digital"
        drive.mkdir(parents=True)
        estado_arq = d / "dados" / "jogos" / ID / "estado.json"

        def estado() -> dict:
            try:
                return json.loads(estado_arq.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                return {}

        def esperar(condicao, segundos: float) -> dict:
            fim = time.time() + segundos
            while time.time() < fim:
                if condicao(e := estado()):
                    return e
                time.sleep(0.5)
            return estado()

        print("Gerando vídeos…")
        video = gerar_video(d / "jogo.mp4", [(3, 9)], criacao_ms=BASE)
        outro = d / "antigo.mp4"
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(video), "-c", "copy",
                        "-metadata", "creation_time=2020-01-01T10:00:00Z", str(outro)], check=True)
        sumula(d / "s.json", [25.0, 40.5, 60.25], [(3, 9)])
        dados = json.loads((d / "s.json").read_text(encoding="utf-8"))

        def ligar():
            log = open(d / "programa.log", "a", encoding="utf-8")
            return subprocess.Popen(
                [sys.executable, str(RAIZ / "servidor.py"), "--porta", "8798", "--dados", str(d / "dados"),
                 "--videos", str(drive), "--intervalo", "1", "--estavel", "2"],
                cwd=RAIZ, stdout=log, stderr=subprocess.STDOUT, env={**os.environ, "PYTHONUTF8": "1", "SUMULA_SEM_HUB": "1"})

        srv = ligar()
        try:
            print("Súmula pelo Drive")
            (drive / "sumula_lixo.txt").write_text("isto não é uma súmula", encoding="utf-8")
            (drive / f"sumula_teste-sintetico_{ID}.txt").write_text(json.dumps(dados, indent=2), encoding="utf-8")
            e = esperar(lambda e: e.get("estado") == "aguardando_video", 30)
            conferir(e.get("estado") == "aguardando_video", "súmula .txt lida da pasta, aguardando vídeo")
            conferir(len(list((d / "dados" / "jogos").iterdir())) == 1, "arquivo que não é súmula é ignorado")

            shutil.copy(outro, drive / "antigo.mp4")
            time.sleep(7)
            conferir(estado().get("estado") == "aguardando_video", "vídeo de outro dia é ignorado")

            print("Vídeo pelo Drive")
            shutil.copy(video, drive / "VID_do_jogo.mp4")
            e = esperar(lambda e: e.get("estado") in ("pronto", "erro"), 300)
            conferir(e.get("estado") == "pronto", f"corte terminou: {e.get('estado')} {e.get('mensagem')}")
            pastas = [p for p in (drive / "Cortes").iterdir() if p.is_dir()] if (drive / "Cortes").is_dir() else []
            conferir(len(pastas) == 1, f"uma pasta de entrega em Cortes (veio {[p.name for p in pastas]})")
            if pastas:
                entrega = pastas[0]
                conferir(entrega.name.startswith("Engenharia contra Direito") or "contra" in entrega.name,
                         f"pasta com o nome do confronto e a data: {entrega.name}")
                conferir(len(list(entrega.glob("*.mp4"))) == 3, "3 clipes copiados para o Drive")
                conferir((entrega / "index.html").is_file(), "galeria copiada junto")
                conferir("fora do vídeo" in (entrega / "AVISO.txt").read_text(encoding="utf-8")
                         if (entrega / "AVISO.txt").is_file() else False, "AVISO.txt conta o lance que a câmera não pegou")

            log_corte = d / "dados" / "jogos" / ID / "corte.log"
            antes = log_corte.stat().st_mtime
            time.sleep(6)
            conferir(log_corte.stat().st_mtime == antes and estado().get("estado") == "pronto",
                     "clipes entregues não são confundidos com vídeo novo")

            print("Correção pelo Drive")
            dados["eventos"][-1]["removido"] = True
            time.sleep(1.1)  # o Drive guarda a nova versão com outro nome e horário mais novo
            (drive / f"sumula_teste-sintetico_{ID} (1).txt").write_text(json.dumps(dados, indent=2), encoding="utf-8")
            esperar(lambda e: e.get("estado") != "pronto", 30)
            e = esperar(lambda e: e.get("estado") in ("pronto", "erro"), 300)
            pastas = [p for p in (drive / "Cortes").iterdir() if p.is_dir()]
            conferir(e.get("estado") == "pronto" and len(pastas) == 1, "súmula corrigida gera novo corte, na mesma pasta")
            conferir(bool(pastas) and not (pastas[0] / "AVISO.txt").exists(), "aviso antigo some depois da correção")

            print("PC reiniciado")
            srv.terminate()
            srv.wait(timeout=10)
            antes = log_corte.stat().st_mtime
            srv = ligar()
            time.sleep(8)
            conferir(log_corte.stat().st_mtime == antes and estado().get("estado") == "pronto",
                     "depois de reiniciar, não corta de novo à toa")
        finally:
            srv.terminate()
            srv.wait(timeout=10)
            if erros:
                print("\n--- saída do programa ---")
                print((d / "programa.log").read_text(encoding="utf-8", errors="replace"))

    if erros:
        print("\nFALHOU:")
        for x in erros:
            print(f"  - {x}")
        raise SystemExit(1)
    print("\nOK: caminho pelo Google Drive completo.")


if __name__ == "__main__":
    main()
