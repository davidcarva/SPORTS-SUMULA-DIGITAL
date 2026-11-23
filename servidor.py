#!/usr/bin/env python3
"""Programa do PC: recebe a súmula, acha o vídeo do jogo e corta os clipes.

Uso com o Google Drive:  python servidor.py --videos "G:\\Meu Drive\\Súmula Digital"

No Encerrar, o app salva a súmula (sumula_….txt) na pasta do Drive, e o vídeo vai para a mesma
pasta. O programa lê os dois de lá, reconhece de qual jogo é o vídeo pelo horário da gravação, roda
o cortar.py e copia os clipes para a subpasta Cortes. O QR dentro do vídeo confirma o jogo.

O app também pode ser aberto pelo próprio PC (--endereco). Aí a súmula chega direto e o celular
recebe aviso quando os cortes ficam prontos.
"""
from __future__ import annotations

import argparse
import base64
import hmac
import http.cookies
import http.server
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import threading
import time
import traceback
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

import cortar as corte
import hub
import requests

RAIZ = Path(__file__).resolve().parent
DIST = RAIZ / "web" / "dist"
EXTENSOES_VIDEO = {".mp4", ".mov", ".m4v"}
FOLGA_MS = 5 * 60 * 1000      # câmera que começou antes ou acabou depois do que a súmula registrou
LIMITE_CORPO = 2_000_000
ALFABETO_CHAVE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
ID_VALIDO = re.compile(r"[A-Za-z0-9_-]{3,32}")
PROGRESSO = re.compile(r"\s*\[\s*(\d+)/(\d+)\]")
ARQUIVO_SUMULA = re.compile(r"sumula_.*\.(txt|json)", re.IGNORECASE)
PROIBIDOS_NO_NOME = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


class Banco:
    """Cada jogo é uma pasta com sumula.json, estado.json e os clipes."""

    def __init__(self, pasta: Path):
        self.pasta = pasta / "jogos"
        self.pasta.mkdir(parents=True, exist_ok=True)
        self.trava = threading.RLock()

    def dir(self, id_jogo: str) -> Path:
        return self.pasta / id_jogo

    def ler(self, id_jogo: str) -> dict | None:
        arq = self.dir(id_jogo) / "estado.json"
        with self.trava:
            return json.loads(arq.read_text(encoding="utf-8")) if arq.is_file() else None

    def gravar(self, e: dict) -> None:
        pasta = self.dir(e["id"])
        pasta.mkdir(parents=True, exist_ok=True)
        with self.trava:
            tmp = pasta / "estado.tmp"
            tmp.write_text(json.dumps(e, ensure_ascii=False, indent=1), encoding="utf-8")
            os.replace(tmp, pasta / "estado.json")

    def mudar(self, id_jogo: str, **campos) -> dict:
        with self.trava:
            e = self.ler(id_jogo)
            e.update(campos)
            self.gravar(e)
            return e

    def todos(self) -> list[dict]:
        with self.trava:
            return [e for p in self.pasta.iterdir() if (e := self.ler(p.name))]


def sumula_valida(d: object) -> bool:
    if not isinstance(d, dict) or d.get("formato") not in corte.FORMATOS:
        return False
    jogo, times, eventos = d.get("jogo"), d.get("times"), d.get("eventos")
    return (isinstance(jogo, dict) and isinstance(jogo.get("id"), str) and bool(ID_VALIDO.fullmatch(jogo["id"]))
            and isinstance(times, dict) and all(isinstance(times.get(t, {}).get("jogadores"), list) for t in "AB")
            and isinstance(eventos, list))


class Servico:
    def __init__(self, a: argparse.Namespace):
        self.dados: Path = a.dados
        self.videos: Path = a.videos
        self.entrega: Path = a.entrega or a.videos / "Cortes"
        self.endereco: str = (a.endereco or "").rstrip("/")
        self.intervalo: float = a.intervalo
        self.estavel: float = a.estavel
        self.dados.mkdir(parents=True, exist_ok=True)
        self.videos.mkdir(parents=True, exist_ok=True)
        self.entrega.mkdir(parents=True, exist_ok=True)
        self.lidas: dict[Path, tuple[int, float, dict | None]] = {}
        self.aplicadas: dict[str, tuple[str, int, float]] = {}
        self.banco = Banco(self.dados)
        self.chave = self._carregar_chave()
        self.vapid_pem = self.dados / "vapid.pem"
        self.vapid_publica = self._carregar_vapid()
        self.vistos: dict[Path, tuple[int, float, float]] = {}
        self.info: dict[tuple[str, int, float], tuple[float | None, float] | None] = {}
        self.hub = hub.Hub.abrir(RAIZ)
        for e in self.banco.todos():  # o PC reiniciou no meio de um corte
            if e["estado"] == "cortando":
                self.banco.mudar(e["id"], estado="aguardando_video", feitos=0)

    def _carregar_chave(self) -> str:
        arq = self.dados / "chave.txt"
        if arq.is_file():
            return arq.read_text(encoding="utf-8").strip()
        chave = "".join(secrets.choice(ALFABETO_CHAVE) for _ in range(10))
        arq.write_text(chave, encoding="utf-8")
        return chave

    def _carregar_vapid(self) -> str:
        from cryptography.hazmat.primitives import serialization
        from py_vapid import Vapid02

        if self.vapid_pem.is_file():
            v = Vapid02.from_file(str(self.vapid_pem))
        else:
            v = Vapid02()
            v.generate_keys()
            v.save_key(str(self.vapid_pem))
        bruto = v.public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
        return base64.urlsafe_b64encode(bruto).decode().rstrip("=")

    # ---- súmula e estado

    def receber(self, dados: dict) -> dict:
        id_jogo = dados["jogo"]["id"]
        texto = json.dumps(dados, ensure_ascii=False, sort_keys=True)
        arq = self.banco.dir(id_jogo) / "sumula.json"
        with self.banco.trava:
            e = self.banco.ler(id_jogo)
            if e and arq.is_file() and arq.read_text(encoding="utf-8") == texto:
                return e
            arq.parent.mkdir(parents=True, exist_ok=True)
            arq.write_text(texto, encoding="utf-8")
            a, b = dados["times"]["A"].get("nome", "A"), dados["times"]["B"].get("nome", "B")
            base = {"estado": "aguardando_video", "mensagem": "", "feitos": 0, "total": 0, "clipes": 0, "tentados": []}
            if e is None:
                e = {"id": id_jogo, "confronto": f"{a} contra {b}", "videos": [], "inscricoes": [], **base}
            elif e["estado"] == "cortando":
                e["recortar"] = True  # súmula corrigida durante o corte: corta de novo no fim
            else:
                e.update(base, confronto=f"{a} contra {b}")
            self.banco.gravar(e)
            return e

    def inscrever(self, id_jogo: str, inscricao: dict) -> bool:
        with self.banco.trava:
            e = self.banco.ler(id_jogo)
            if e is None:
                return False
            atuais = [i for i in e["inscricoes"] if i.get("endpoint") != inscricao["endpoint"]]
            self.banco.mudar(id_jogo, inscricoes=[*atuais, inscricao][-20:])
            return True

    def url_clipes(self, id_jogo: str) -> str:
        return f"./clipes/{id_jogo}/index.html?chave={self.chave}"

    def resumo(self, e: dict) -> dict:
        r = {k: e[k] for k in ("id", "confronto", "estado", "mensagem", "feitos", "total", "clipes")}
        if e["estado"] == "pronto":
            r["url"] = self.url_clipes(e["id"])
        return r

    # ---- notificação

    def avisar(self, e: dict, titulo: str, corpo: str, url: str = "./") -> None:
        if not e["inscricoes"]:
            return
        from pywebpush import WebPushException, webpush

        carga = json.dumps({"titulo": titulo, "corpo": corpo, "url": url}, ensure_ascii=False)
        vivas = []
        for inscricao in e["inscricoes"]:
            try:
                webpush(inscricao, data=carga, vapid_private_key=str(self.vapid_pem), ttl=86400,
                        vapid_claims={"sub": self.endereco or "mailto:sumula@example.com"})
                vivas.append(inscricao)
            except WebPushException as erro:
                status = getattr(erro.response, "status_code", None)
                print(f"  aviso não entregue ({status}): {erro}")
                if status not in (404, 410):  # 404/410: o celular cancelou a inscrição
                    vivas.append(inscricao)
            except Exception as erro:  # sem internet no PC não pode derrubar o servidor
                print(f"  aviso não entregue: {erro}")
                vivas.append(inscricao)
        self.banco.mudar(e["id"], inscricoes=vivas)

    # ---- pasta de vídeos

    def na_pasta(self) -> list[Path]:
        """Arquivos da pasta vigiada, sem os clipes já entregues."""
        return [p for p in self.videos.rglob("*")
                if p.is_file() and p != self.entrega and self.entrega not in p.parents]

    def ler_sumulas(self) -> None:
        """Súmulas salvas na pasta pelo app. Vale a mais recente de cada jogo."""
        mais_nova: dict[str, tuple[float, Path, int, dict]] = {}
        for p in self.na_pasta():
            if not ARQUIVO_SUMULA.fullmatch(p.name):
                continue
            st = p.stat()
            lida = self.lidas.get(p)
            if not lida or lida[:2] != (st.st_size, st.st_mtime):
                try:
                    dados = json.loads(p.read_text(encoding="utf-8-sig")) if st.st_size <= LIMITE_CORPO else None
                except (OSError, ValueError):
                    dados = None  # ainda sendo copiado: lê de novo quando mudar
                lida = self.lidas[p] = (st.st_size, st.st_mtime, dados if sumula_valida(dados) else None)
            if lida[2] is None:
                continue
            id_jogo = lida[2]["jogo"]["id"]
            if id_jogo not in mais_nova or st.st_mtime > mais_nova[id_jogo][0]:
                mais_nova[id_jogo] = (st.st_mtime, p, st.st_size, lida[2])
        for id_jogo, (mtime, p, tam, dados) in mais_nova.items():
            marca = (str(p), tam, mtime)
            if self.aplicadas.get(id_jogo) != marca:
                arq = self.banco.dir(id_jogo) / "sumula.json"
                antes = arq.read_text(encoding="utf-8") if arq.is_file() else None
                e = self.receber(dados)
                self.aplicadas[id_jogo] = marca
                if antes is None:
                    print(f"Súmula recebida: {e['confronto']}")
                elif antes != arq.read_text(encoding="utf-8"):
                    print(f"Súmula corrigida: {e['confronto']}. Os clipes saem de novo.")

    def videos_prontos(self) -> tuple[list[Path], bool]:
        """(vídeos que pararam de crescer, se ainda tem algum sendo copiado)."""
        agora, prontos, copiando = time.time(), [], False
        presentes = [p for p in self.na_pasta() if p.suffix.lower() in EXTENSOES_VIDEO]
        for p in presentes:
            st = p.stat()
            visto = self.vistos.get(p)
            if not visto or visto[:2] != (st.st_size, st.st_mtime):
                self.vistos[p] = (st.st_size, st.st_mtime, agora)
                copiando = True
            elif agora - visto[2] >= self.estavel:
                prontos.append(p)
            else:
                copiando = True
        return prontos, copiando

    def ler_info(self, v: Path) -> tuple[float | None, float] | None:
        st = v.stat()
        k = (str(v), st.st_size, st.st_mtime)
        if k not in self.info:
            try:
                self.info[k] = (corte.inicio_gravacao_ms(v), corte.duracao(v))
            except SystemExit:  # arquivo incompleto: tenta de novo se ele mudar
                self.info[k] = None
        return self.info[k]

    def chave_video(self, v: Path) -> str:
        return v.relative_to(self.videos).as_posix()

    def candidatos(self, e: dict, arquivos: list[Path], unico_pendente: bool) -> list[Path]:
        sumula = corte.Sumula.ler(self.banco.dir(e["id"]) / "sumula.json")
        marcos = [m["t"] for m in sumula.eventos({"ponto", "lance", "inicio", "sync"})]
        if not marcos:
            return []
        ini, fim = min(marcos), max(marcos)
        de_outros = {v for o in self.banco.todos() if o["id"] != e["id"] and o["estado"] == "pronto" for v in o["videos"]}
        por_horario, sem_horario = [], []
        for v in arquivos:
            nome = self.chave_video(v)
            info = self.ler_info(v)
            if nome in e["tentados"] or nome in de_outros or info is None:
                continue
            criacao, dur = info
            if criacao is None:
                if v.stat().st_mtime * 1000 >= ini - 3_600_000:
                    sem_horario.append(v)
            elif any(b - FOLGA_MS <= fim and b + dur * 1000 + FOLGA_MS >= ini for b in (criacao, criacao - dur * 1000)):
                por_horario.append((criacao, v))
        if por_horario:
            return [v for _, v in sorted(por_horario, key=lambda x: (x[0], str(x[1])))]
        # Arquivo sem horário de gravação: só arrisca se não houver dúvida de jogo. O QR ainda confere.
        return sorted(sem_horario, key=lambda v: (v.stat().st_mtime, str(v))) if unico_pendente else []

    def cortar_jogo(self, id_jogo: str, videos: list[Path]) -> None:
        nomes = [self.chave_video(v) for v in videos]
        pasta = self.banco.dir(id_jogo)
        sumula = corte.Sumula.ler(pasta / "sumula.json")
        total = len(sumula.eventos(corte.TIPOS_COM_CLIPE))
        print(f"Cortando {id_jogo}: {', '.join(nomes)}")
        self.banco.mudar(id_jogo, estado="cortando", mensagem="", videos=nomes, feitos=0, total=total)
        saida = pasta / "clipes"
        shutil.rmtree(saida, ignore_errors=True)
        cmd = [sys.executable, str(RAIZ / "cortar.py"), str(pasta / "sumula.json"), *map(str, videos), "--saida", str(saida)]
        ambiente = {**os.environ, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"}
        erro, avisos = "", []
        with open(pasta / "corte.log", "w", encoding="utf-8") as log:
            p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                                 encoding="utf-8", errors="replace", env=ambiente, cwd=RAIZ)
            for linha in p.stdout:
                log.write(linha)
                log.flush()
                if m := PROGRESSO.match(linha):
                    self.banco.mudar(id_jogo, feitos=int(m[1]), total=int(m[2]))
                elif linha.startswith("ERRO:"):
                    erro = linha[5:].strip()
                elif "SEM QR" in linha:
                    avisos.append("O QR não apareceu no vídeo: alinhei pelo horário da câmera e alarguei os clipes.")
                elif "ficaram fora do vídeo" in linha:
                    avisos.append(linha.strip().rstrip(":") + ".")
            codigo = p.wait()
        clipes = len(list(saida.glob("*.mp4"))) if saida.is_dir() else 0

        e = self.banco.ler(id_jogo)
        if e.get("recortar"):
            e.pop("recortar")
            e.update(estado="aguardando_video", feitos=0, tentados=[])
            self.banco.gravar(e)
            return
        destino = self.pasta_entrega(e, sumula)
        if codigo == 0 and clipes:
            self.entregar(e, destino, origem=saida, aviso=" ".join(avisos))  # "pronto" só com os clipes no lugar
            e = self.banco.mudar(id_jogo, estado="pronto", clipes=clipes, feitos=clipes, mensagem=" ".join(avisos))
            self.avisar(e, "Cortes prontos", f"{e['confronto']}: {clipes} clipes.", self.url_clipes(id_jogo))
            print(f"Pronto: {e['confronto']}, {clipes} clipes em {destino}")
        else:
            motivo = erro or "Nenhum lance da súmula aparece neste vídeo."
            e = self.banco.mudar(id_jogo, estado="erro", mensagem=motivo, tentados=[*e["tentados"], *nomes])
            self.entregar(e, destino, erro=f"{motivo}\n\nVídeo usado: {', '.join(nomes)}\n"
                          "Coloque o vídeo certo na pasta e o corte recomeça sozinho.")
            self.avisar(e, "Não consegui cortar", f"{e['confronto']}: {motivo}")
            print(f"Falhou: {e['confronto']}: {motivo}")

    def pasta_entrega(self, e: dict, sumula: corte.Sumula) -> Path:
        marcos = [m["t"] for m in sumula.eventos({"ponto", "lance", "inicio", "sync", "fim"})]
        dia = time.strftime(" %d-%m-%Y", time.localtime(min(marcos) / 1000)) if marcos else ""
        nome = PROIBIDOS_NO_NOME.sub("", e["confronto"]).strip(" .") or e["id"]
        return self.entrega / f"{nome}{dia}"

    def entregar(self, e: dict, destino: Path, origem: Path | None = None, aviso: str = "", erro: str = "") -> None:
        """Copia os clipes para a pasta Cortes (no Drive, eles sobem sozinhos). Troca a entrega anterior."""
        try:
            for antiga in {e.get("entregue"), str(destino)} - {None}:
                p = Path(antiga)
                if p.parent == self.entrega and p.is_dir():
                    shutil.rmtree(p)
            if origem:
                shutil.copytree(origem, destino)
                if aviso:
                    (destino / "AVISO.txt").write_text(aviso + "\n", encoding="utf-8")
            else:
                destino.mkdir(parents=True, exist_ok=True)
                (destino / "NAO_CONSEGUI_CORTAR.txt").write_text(erro, encoding="utf-8")
            self.banco.mudar(e["id"], entregue=str(destino))
        except OSError as falha:  # pasta do Drive indisponível: os clipes continuam em servidor_dados
            print(f"  não consegui copiar para {destino}: {falha}")

    # ---- hub (o link de jogos com os clipes de cada lance)

    def ids_drive(self, destino: Path, h: dict) -> dict[str, str]:
        """{caminho do clipe: id no Drive}. Libera a pasta do jogo para quem tiver o link."""
        try:
            relativo = destino.relative_to(self.videos)
        except ValueError:
            return {}  # entrega fora da pasta do Drive: não há como achar os clipes lá
        pasta = self.hub.pasta([self.videos.name, *relativo.parts])
        if not pasta:
            return {}
        if h.get("liberada") != pasta:
            self.hub.liberar(pasta)
            h["liberada"] = pasta
        return self.hub.arquivos(pasta)

    def publicar_hub(self) -> None:
        """Publica cada jogo no hub assim que a súmula chega, e de novo quando os clipes sobem no Drive.
        O Drive do PC leva alguns minutos para subir os clipes: tenta a cada minuto, por até 2 dias."""
        if not self.hub:
            return
        agora = time.time()
        for e in self.banco.todos():
            pasta = self.banco.dir(e["id"])
            arq = pasta / "sumula.json"
            if not arq.is_file():
                continue
            st = arq.stat()
            marca = f"{st.st_size}:{st.st_mtime}:{e['estado']}:{e.get('entregue', '')}:{e.get('clipes', 0)}"
            h = dict(e.get("hub") or {})
            if h.get("erro") and agora - h.get("quando", 0) < 300:
                continue
            mudou = h.get("marca") != marca
            if not mudou:
                esperando = h.get("faltam", 0) > 0 and agora - h.get("desde", agora) < 48 * 3600
                if not esperando or agora - h.get("quando", 0) < 60:
                    continue
            try:
                sumula = corte.Sumula.ler(arq)
                lista = pasta / "clipes" / "clipes.json"
                clipes = json.loads(lista.read_text(encoding="utf-8")) if e["estado"] == "pronto" and lista.is_file() else []
                ids = self.ids_drive(Path(e["entregue"]), h) if clipes and e.get("entregue") else {}
                doc = hub.montar_documento(sumula, e["estado"], clipes, ids)
                self.hub.publicar(doc)
                faltam = sum(1 for c in clipes if not ids.get(c.get("vertical") or c.get("arquivo") or ""))
                if mudou or faltam != h.get("faltam"):
                    situacao = f"{doc['clipes']} de {doc['lances']} lances com vídeo" if clipes else "sem clipes ainda"
                    print(f"Hub: {e['confronto']} publicado ({situacao}).")
                h.update(marca=marca, quando=agora, faltam=faltam, erro="", desde=agora if mudou else h.get("desde", agora))
            except (hub.ErroHub, requests.RequestException, OSError, ValueError, SystemExit) as erro:
                if str(erro) != h.get("erro"):
                    print(f"Hub: não publiquei {e['confronto']}: {erro}")
                h.update(quando=agora, erro=str(erro) or "erro")
            self.banco.mudar(e["id"], hub=h)

    def uma_rodada(self) -> None:
        self.ler_sumulas()
        try:
            self.publicar_hub()
        except Exception:  # o hub nunca pode parar os cortes
            traceback.print_exc()
        arquivos, copiando = self.videos_prontos()
        if copiando:  # espera a cópia acabar, para pegar todas as partes do jogo juntas
            return
        pendentes = [e for e in self.banco.todos() if e["estado"] in ("aguardando_video", "erro")]
        for e in pendentes:
            achados = self.candidatos(e, arquivos, len(pendentes) == 1)
            if achados:
                self.cortar_jogo(e["id"], achados)
                return

    def vigiar(self) -> None:
        while True:
            try:
                self.uma_rodada()
            except Exception:
                traceback.print_exc()
            time.sleep(self.intervalo)


class Pagina(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".webmanifest": "application/manifest+json", ".mp4": "video/mp4"}
    servico: Servico

    def __init__(self, *args, **kw):
        super().__init__(*args, directory=str(DIST), **kw)

    def log_message(self, *args) -> None:  # o endereço pode trazer a chave: não vai para o terminal
        pass

    def end_headers(self) -> None:
        caminho = urlsplit(self.path).path
        if caminho.endswith(("/", "sw.js", "index.html", ".webmanifest")) or caminho.startswith("/api/"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def _chave_enviada(self) -> list[str]:
        cookie = http.cookies.SimpleCookie(self.headers.get("Cookie", ""))
        return [parse_qs(urlsplit(self.path).query).get("chave", [""])[0], self.headers.get("X-Chave", ""),
                cookie["chave"].value if "chave" in cookie else ""]

    def autorizado(self) -> bool:
        return any(c and hmac.compare_digest(c.strip().upper().encode(), self.servico.chave.encode())
                   for c in self._chave_enviada())

    def json(self, codigo: int, dados: dict) -> None:
        corpo = json.dumps(dados, ensure_ascii=False).encode()
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def enviar_arquivo(self, arq: Path) -> None:
        """Com Range: sem isso o vídeo não toca no iPhone."""
        tam = arq.stat().st_size
        ini, fim, codigo = 0, tam - 1, 200
        r = re.fullmatch(r"bytes=(\d*)-(\d*)", self.headers.get("Range", ""))
        if r and (r[1] or r[2]):
            ini = int(r[1]) if r[1] else max(tam - int(r[2]), 0)
            fim = min(int(r[2]), tam - 1) if r[1] and r[2] else tam - 1
            if ini >= tam or ini > fim:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{tam}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            codigo = 206
        self.send_response(codigo)
        self.send_header("Content-Type", self.guess_type(arq.name))
        self.send_header("Content-Length", str(fim - ini + 1))
        self.send_header("Accept-Ranges", "bytes")
        if codigo == 206:
            self.send_header("Content-Range", f"bytes {ini}-{fim}/{tam}")
        q = parse_qs(urlsplit(self.path).query).get("chave", [""])[0]
        if q:  # a galeria carrega os vídeos sem a chave no endereço
            seguro = "; Secure" if self.headers.get("X-Forwarded-Proto") == "https" else ""
            self.send_header("Set-Cookie", f"chave={q}; Path=/clipes; Max-Age=31536000; HttpOnly; SameSite=Lax{seguro}")
        self.end_headers()
        try:
            with open(arq, "rb") as f:
                f.seek(ini)
                falta = fim - ini + 1
                while falta > 0 and (bloco := f.read(min(256 * 1024, falta))):
                    self.wfile.write(bloco)
                    falta -= len(bloco)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self) -> None:
        caminho = unquote(urlsplit(self.path).path)
        if caminho == "/api/servidor":
            return self.json(200, {"ok": True, "vapid": self.servico.vapid_publica, "autorizado": self.autorizado()})
        if m := re.fullmatch(r"/api/jogos/([^/]+)", caminho):
            if not self.autorizado():
                return self.json(401, {"erro": "chave"})
            e = self.servico.banco.ler(m[1]) if ID_VALIDO.fullmatch(m[1]) else None
            return self.json(200, self.servico.resumo(e)) if e else self.json(404, {"erro": "jogo"})
        if caminho.startswith("/api/"):
            return self.json(404, {"erro": "rota"})
        if m := re.fullmatch(r"/clipes/([^/]+)/([^/\\]+)", caminho):
            if not self.autorizado():
                return self.json(401, {"erro": "chave"})
            arq = self.servico.banco.dir(m[1]) / "clipes" / m[2]
            if ID_VALIDO.fullmatch(m[1]) and m[2] not in ("..", ".") and arq.is_file():
                return self.enviar_arquivo(arq)
            return self.json(404, {"erro": "arquivo"})
        super().do_GET()

    def do_POST(self) -> None:
        caminho = unquote(urlsplit(self.path).path)
        if not self.autorizado():
            return self.json(401, {"erro": "chave"})
        tam = int(self.headers.get("Content-Length") or 0)
        if tam > LIMITE_CORPO:
            return self.json(413, {"erro": "grande"})
        try:
            dados = json.loads(self.rfile.read(tam))
        except (ValueError, UnicodeDecodeError):
            return self.json(400, {"erro": "json"})
        if caminho == "/api/jogos":
            if not sumula_valida(dados):
                return self.json(400, {"erro": "sumula"})
            return self.json(200, self.servico.resumo(self.servico.receber(dados)))
        if (m := re.fullmatch(r"/api/jogos/([^/]+)/notificar", caminho)) and ID_VALIDO.fullmatch(m[1]):
            destino = str(dados.get("endpoint", "")) if isinstance(dados, dict) else ""
            if not destino.startswith(("https://", "http://127.0.0.1:")) or not isinstance(dados.get("keys"), dict):
                return self.json(400, {"erro": "inscricao"})
            inscricao = {"endpoint": destino, "keys": dados["keys"]}
            return self.json(200, {"ok": True}) if self.servico.inscrever(m[1], inscricao) else self.json(404, {"erro": "jogo"})
        self.json(404, {"erro": "rota"})


PASTA_DRIVE = "Súmula Digital"


def achar_pasta_drive() -> Path:
    """A pasta do app dentro do Google Drive para computador (G:\\Meu Drive, ou outra letra)."""
    for letra in "GHIJKLMNOPQRSTUVWXYZDEF":
        for raiz in ("Meu Drive", "My Drive"):
            drive = Path(f"{letra}:\\") / raiz
            if drive.is_dir():
                return drive / PASTA_DRIVE
    sys.exit("Não achei o Google Drive para computador (pasta Meu Drive). Abra o Google Drive e entre na conta.")


def main() -> None:
    for fluxo in (sys.stdout, sys.stderr):
        try:
            fluxo.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser(description="Lê súmulas e vídeos da pasta, acha o jogo de cada vídeo e corta os clipes.")
    ap.add_argument("--porta", type=int, default=8000)
    ap.add_argument("--videos", type=Path, default=RAIZ / "videos",
                    help="pasta vigiada, onde chegam súmulas e vídeos (a do Google Drive ou a do cabo)")
    ap.add_argument("--entrega", type=Path, help="para onde vão os clipes prontos (padrão: subpasta Cortes)")
    ap.add_argument("--drive", action="store_true",
                    help=f'vigia a pasta "{PASTA_DRIVE}" do Google Drive para computador (acha a letra sozinho)')
    ap.add_argument("--dados", type=Path, default=RAIZ / "servidor_dados", help="súmulas, clipes e chaves")
    ap.add_argument("--endereco", help="endereço HTTPS público do servidor, usado no link de instalação")
    ap.add_argument("--rede", action="store_true", help="aceita conexões da rede local, não só do túnel HTTPS")
    ap.add_argument("--intervalo", type=float, default=10.0, help="segundos entre olhadas na pasta de vídeos")
    ap.add_argument("--estavel", type=float, default=60.0, help="segundos sem mudar para considerar a cópia terminada")
    a = ap.parse_args()
    if a.drive:
        a.videos = achar_pasta_drive()

    corte.exigir_ffmpeg()
    if not (DIST / "index.html").is_file():
        sys.exit("O app ainda não foi gerado. Rode antes:  cd web  e  npm install  e  npm run build")
    servico = Servico(a)
    Pagina.servico = servico
    threading.Thread(target=servico.vigiar, daemon=True).start()
    with http.server.ThreadingHTTPServer(("0.0.0.0" if a.rede else "127.0.0.1", a.porta), Pagina) as srv:
        base = servico.endereco or f"http://localhost:{a.porta}"
        print(f"Vigiando súmulas e vídeos em: {servico.videos}")
        print(f"Clipes prontos vão para:      {servico.entrega}")
        if servico.hub:
            print(f"Hub de jogos ligado (projeto {servico.hub.projeto}).")
        else:
            print("Hub de jogos desligado: falta a chave do Firebase (...-firebase-adminsdk-....json) nesta pasta.")
        if servico.endereco:
            print(f"App servido em {base}")
            print(f"Link para instalar no celular: {base}/?chave={servico.chave}")
            print(f"Código do servidor: {servico.chave}")
        print("Ctrl+C para parar.", flush=True)
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
