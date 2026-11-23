"""Teste do caminho pelo Google Drive: nada passa pela rede, tudo pela pasta.

A súmula (.txt salvo pelo app) e o vídeo caem na mesma pasta. O programa reconhece o jogo, corta e
copia os clipes para a subpasta Cortes. Usa o vídeo sintético do teste ponta a ponta, com um QR.

Uso:  python tests/teste_drive.py
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from teste_ponta_a_ponta import BASE, ID, RAIZ, gerar_video, sumula  # noqa: E402


def ler(arquivos) -> dict | None:
    lista = list(arquivos)
    return json.loads(lista[0].read_text(encoding="utf-8")) if len(lista) == 1 else None


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

            def pastas_jogos() -> list[Path]:
                return [p for p in (drive / "Jogos").iterdir() if p.is_dir()] if (drive / "Jogos").is_dir() else []

            def organizado(pasta: Path) -> bool:
                return any(pasta.glob("Vídeo - *.mp4")) and any(pasta.glob("Súmula - *.json"))

            fim = time.time() + 20
            while time.time() < fim and not (pastas_jogos() and organizado(pastas_jogos()[0])):
                time.sleep(0.5)
            pastas = pastas_jogos()
            conferir(len(pastas) == 1, f"uma pasta para o jogo em Jogos (veio {[p.name for p in pastas]})")
            if pastas:
                jogo = pastas[0]
                conferir(re.fullmatch(r"\d{4}-\d\d-\d\d \d\dh\d\d · Basquete · .+", jogo.name) is not None,
                         f"pasta com data, hora, modalidade e nome do jogo: {jogo.name}")
                conferir(len(list(jogo.glob("Súmula - *.json"))) == 1, "súmula guardada na pasta do jogo, com nome bonito")
                conferir(len(list(jogo.glob("Vídeo - *.mp4"))) == 1, "vídeo bruto guardado na pasta do jogo")
                entrega = jogo / "Cortes"
                conferir(len(list(entrega.glob("*.mp4"))) == 3, "3 clipes em Cortes, dentro da pasta do jogo")
                conferir((entrega / "index.html").is_file(), "galeria copiada junto")
                conferir("fora do vídeo" in (entrega / "AVISO.txt").read_text(encoding="utf-8")
                         if (entrega / "AVISO.txt").is_file() else False, "AVISO.txt conta o lance que a câmera não pegou")
            soltos = sorted(p.name for p in drive.iterdir() if p.is_file())
            conferir(soltos == ["antigo.mp4", "sumula_lixo.txt"],
                     f"na entrada só sobra o que não é do jogo (sobrou {soltos})")

            log_corte = d / "dados" / "jogos" / ID / "corte.log"
            antes = log_corte.stat().st_mtime
            time.sleep(6)
            conferir(log_corte.stat().st_mtime == antes and estado().get("estado") == "pronto",
                     "clipes entregues não são confundidos com vídeo novo")

            print("Correção pelo Drive")
            dados["eventos"][-1]["removido"] = True
            time.sleep(1.1)  # o Drive guarda a nova versão com outro nome e horário mais novo
            # O Drive do Android às vezes salva com o título do jogo, sem "sumula_" e sem extensão.
            (drive / "Engenharia x Direito").write_text(json.dumps(dados, indent=2), encoding="utf-8")
            esperar(lambda e: e.get("estado") != "pronto", 30)
            e = esperar(lambda e: e.get("estado") in ("pronto", "erro"), 300)
            fim = time.time() + 20
            while time.time() < fim and (drive / "Engenharia x Direito").exists():
                time.sleep(0.5)
            pastas = pastas_jogos()
            conferir(e.get("estado") == "pronto" and len(pastas) == 1,
                     f"súmula corrigida (sem extensão) acha o vídeo na pasta do jogo e corta de novo: {e.get('estado')} {e.get('mensagem')}")
            conferir(bool(pastas) and not (pastas[0] / "Cortes" / "AVISO.txt").exists(), "aviso antigo some depois da correção")
            if pastas:
                nomes = sorted(p.name for p in pastas[0].glob("Súmula - *.json"))
                conferir(len(nomes) == 2 and any("versão anterior" in n for n in nomes),
                         f"a súmula nova vale e a antiga fica como versão anterior: {nomes}")
                conferir(ler(pastas[0].glob("Súmula - *[!)].json")) == dados, "a súmula oficial é a corrigida")
            conferir(not (drive / "Engenharia x Direito").exists(), "súmula corrigida sai da entrada")

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
