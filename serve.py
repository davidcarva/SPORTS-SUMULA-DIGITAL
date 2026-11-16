#!/usr/bin/env python3
"""Serve o app da súmula na rede local para abrir no celular do mesário.

Uso:  python serve.py            (porta 8000)
      python serve.py 8080

O celular precisa estar no mesmo Wi-Fi do computador. Depois de aberto, o app
funciona sem internet: os lances ficam salvos no próprio celular.
"""
import functools
import http.server
import socket
import sys
from pathlib import Path

PASTA = Path(__file__).resolve().parent / "web" / "dist"


def ips_locais() -> list[str]:
    ips = set()
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))  # não envia nada; só descobre a interface de saída
            ips.add(s.getsockname()[0])
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(info[4][0])
    except OSError:
        pass
    return sorted(ip for ip in ips if not ip.startswith("127."))


def main() -> None:
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    if not (PASTA / "index.html").is_file():
        sys.exit("O app ainda não foi gerado. Rode antes:  cd web  e  npm install  e  npm run build")
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(PASTA))
    with http.server.ThreadingHTTPServer(("0.0.0.0", porta), handler) as srv:
        print("App da súmula no ar. No celular (mesmo Wi-Fi), abra:")
        for ip in ips_locais() or ["<ip-do-computador>"]:
            print(f"   http://{ip}:{porta}")
        print(f"Neste computador: http://localhost:{porta}")
        print("Ctrl+C para parar.")
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
