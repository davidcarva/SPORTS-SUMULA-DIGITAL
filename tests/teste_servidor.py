"""Teste do fluxo automático: súmula enviada, vídeo cai na pasta, clipes prontos, aviso disparado.

Usa o vídeo sintético do teste ponta a ponta, com um único QR, e um serviço de push falso.

Uso:  python tests/teste_servidor.py
"""
from __future__ import annotations

import base64
import http.server
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

sys.path.insert(0, str(Path(__file__).resolve().parent))
from teste_ponta_a_ponta import BASE, ID, RAIZ, gerar_video, sumula  # noqa: E402

PORTA = 8799
URL = f"http://127.0.0.1:{PORTA}"
recebidos: list[dict] = []


class PushFalso(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        corpo = self.rfile.read(int(self.headers.get("Content-Length") or 0))
        recebidos.append({"auth": self.headers.get("Authorization", ""), "cod": self.headers.get("Content-Encoding", ""), "tam": len(corpo)})
        self.send_response(201)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, *a):
        pass


def pedir(caminho: str, corpo: dict | None = None, chave: str = "", cabecalhos: dict | None = None):
    h = {"Content-Type": "application/json", **(cabecalhos or {})}
    if chave:
        h["X-Chave"] = chave
    req = urllib.request.Request(URL + caminho, data=json.dumps(corpo).encode() if corpo is not None else None, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)


def b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def inscricao_falsa(porta: int) -> dict:
    priv = ec.generate_private_key(ec.SECP256R1())
    pub = priv.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return {"endpoint": f"http://127.0.0.1:{porta}/push", "keys": {"p256dh": b64(pub), "auth": b64(os.urandom(16))}}


def main() -> None:
    erros: list[str] = []
    def conferir(ok: bool, texto: str):
        print(("  ok   " if ok else "  FALHA ") + texto)
        if not ok:
            erros.append(texto)

    push = http.server.ThreadingHTTPServer(("127.0.0.1", 0), PushFalso)
    threading.Thread(target=push.serve_forever, daemon=True).start()

    with tempfile.TemporaryDirectory(prefix="sumula_servidor_") as tmp:
        d = Path(tmp)
        (d / "videos").mkdir()
        print("Gerando vídeos…")
        video = gerar_video(d / "jogo.mp4", [(3, 9)], criacao_ms=BASE)
        outro = d / "antigo.mp4"
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(video), "-c", "copy",
                        "-metadata", "creation_time=2020-01-01T10:00:00Z", str(outro)], check=True)
        sumula(d / "s.json", [25.0, 40.5, 60.25], [(3, 9)])
        dados = json.loads((d / "s.json").read_text(encoding="utf-8"))

        srv = subprocess.Popen(
            [sys.executable, str(RAIZ / "servidor.py"), "--porta", str(PORTA), "--dados", str(d / "dados"), "--videos", str(d / "videos"),
             "--intervalo", "1", "--estavel", "2", "--endereco", "https://exemplo.test"],
            cwd=RAIZ, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace",
            env={**os.environ, "PYTHONUTF8": "1", "SUMULA_SEM_HUB": "1"})
        try:
            for _ in range(60):
                if (d / "dados" / "chave.txt").is_file():
                    try:
                        pedir("/api/servidor")
                        break
                    except urllib.error.URLError:
                        pass
                time.sleep(0.5)
            chave = (d / "dados" / "chave.txt").read_text(encoding="utf-8").strip()

            print("Segurança")
            conferir(pedir("/api/jogos", dados)[0] == 401, "súmula sem código é recusada")
            conferir(pedir("/api/jogos", {"formato": "x"}, chave)[0] == 400, "conteúdo inválido é recusado")
            conferir(pedir(f"/api/jogos/{ID}")[0] == 401, "andamento sem código é recusado")
            conferir(pedir("/clipes/..%2f..%2fchave.txt/x", chave=chave)[0] == 404, "caminho malicioso não sai da pasta")

            print("Fluxo")
            st, corpo, _ = pedir("/api/jogos", dados, chave)
            conferir(st == 200 and json.loads(corpo)["estado"] == "aguardando_video", "súmula recebida, aguardando vídeo")
            conferir(pedir(f"/api/jogos/{ID}/notificar", inscricao_falsa(push.server_address[1]), chave)[0] == 200, "celular inscrito para o aviso")

            shutil.copy(outro, d / "videos" / "antigo.mp4")
            time.sleep(7)
            e = json.loads(pedir(f"/api/jogos/{ID}", chave=chave)[1])
            conferir(e["estado"] == "aguardando_video", "vídeo de outro dia é ignorado")

            shutil.copy(video, d / "videos" / "VID_do_jogo.mp4")
            viu_cortando, e = False, {}
            fim = time.time() + 300
            while time.time() < fim:
                e = json.loads(pedir(f"/api/jogos/{ID}", chave=chave)[1])
                viu_cortando |= e["estado"] == "cortando"
                if e["estado"] in ("pronto", "erro"):
                    break
                time.sleep(0.5)
            conferir(viu_cortando, "estado passou por cortando")
            conferir(e["estado"] == "pronto", f"corte terminou: {e['estado']} {e['mensagem']}")
            conferir(e["clipes"] == 3, f"3 clipes com um único QR (veio {e['clipes']})")
            conferir("fora do vídeo" in e["mensagem"], "avisa o lance que a câmera não pegou")

            print("Clipes")
            pasta = d / "dados" / "jogos" / ID / "clipes"
            arq = sorted(pasta.glob("*.mp4"))[0].name
            conferir(pedir(f"/clipes/{ID}/index.html")[0] == 401, "galeria sem código é recusada")
            st, _, h = pedir(f"/clipes/{ID}/index.html?chave={chave}")
            cookie = h.get("Set-Cookie", "").split(";")[0]
            conferir(st == 200 and cookie.startswith("chave="), "link com código abre e guarda o acesso")
            st, parte, h = pedir(f"/clipes/{ID}/{arq}", cabecalhos={"Cookie": cookie, "Range": "bytes=0-1023"})
            conferir(st == 206 and len(parte) == 1024 and h.get("Accept-Ranges") == "bytes", "vídeo responde em partes (iPhone)")

            print("Aviso")
            time.sleep(1)
            conferir(len(recebidos) == 1, f"uma notificação enviada (veio {len(recebidos)})")
            if recebidos:
                conferir(recebidos[0]["auth"].startswith("vapid ") and recebidos[0]["cod"] == "aes128gcm" and recebidos[0]["tam"] > 0, "notificação assinada e criptografada")

            pedir("/api/jogos", dados, chave)
            e = json.loads(pedir(f"/api/jogos/{ID}", chave=chave)[1])
            conferir(e["estado"] == "pronto", "reenvio igual não corta de novo")

            print("Correção da súmula")
            dados["eventos"][-1]["removido"] = True
            pedir("/api/jogos", dados, chave)
            fim = time.time() + 300
            while time.time() < fim:
                e = json.loads(pedir(f"/api/jogos/{ID}", chave=chave)[1])
                if e["estado"] == "pronto":
                    break
                time.sleep(0.5)
            conferir(e["estado"] == "pronto" and "fora do vídeo" not in e["mensagem"], "súmula corrigida gera novo corte com o mesmo vídeo")
        finally:
            srv.terminate()
            srv.wait(timeout=10)
    push.shutdown()

    if erros:
        print("\nFALHOU:")
        for x in erros:
            print(f"  - {x}")
        raise SystemExit(1)
    print("\nOK: fluxo automático completo.")


if __name__ == "__main__":
    main()
