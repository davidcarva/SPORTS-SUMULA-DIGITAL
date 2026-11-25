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
from datetime import datetime
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


def parece_sumula(p: Path, tamanho: int) -> bool:
    """O app salva "sumula_….txt", mas o Drive do Android às vezes troca o nome pelo título do jogo
    e tira a extensão ("Time 1 x Time 2"). Então vale o conteúdo: arquivo pequeno que começa com "{".
    Quem confirma que é súmula mesmo é sumula_valida."""
    if ARQUIVO_SUMULA.fullmatch(p.name):
        return True
    if tamanho > LIMITE_CORPO or tamanho < 2 or p.name.lower() == "desktop.ini":
        return False
    try:
        with p.open("rb") as f:
            return f.read(64).lstrip(b"\xef\xbb\xbf \t\r\n").startswith(b"{")
    except OSError:
        return False


MODALIDADES = {"basquete": "Basquete", "futsal": "Futsal", "volei": "Vôlei"}


def titulo_do_jogo(sumula: corte.Sumula) -> str:
    """O nome do jogo como o mesário deu (ou "Time A x Time B"), pronto para nome de arquivo."""
    d = sumula.dados
    titulo = d["jogo"].get("nome") or f"{d['times']['A'].get('nome', 'A')} x {d['times']['B'].get('nome', 'B')}"
    return PROIBIDOS_NO_NOME.sub("", titulo).strip(" .")[:80] or sumula.id


def nome_da_pasta(sumula: corte.Sumula) -> str:
    """"2026-11-23 16h16 · Basquete · Time 1 x Time 2": no Drive, os jogos ficam em ordem de data."""
    jogo = sumula.dados["jogo"]
    eventos = sumula.eventos()
    inicio = next((e["t"] for e in eventos if e["tipo"] == "inicio"),
                  min((e["t"] for e in eventos if e["tipo"] != "sync"), default=jogo.get("criado_em", 0)))
    quando = datetime.fromtimestamp(inicio / 1000, sumula.fuso).strftime("%Y-%m-%d %Hh%M")
    modalidade = MODALIDADES.get(jogo.get("modalidade", "basquete"), "Jogo")
    return f"{quando} · {modalidade} · {titulo_do_jogo(sumula)}"


def livre(p: Path) -> Path:
    """O caminho, ou "nome (2)", "nome (3)"… se já existir um arquivo com esse nome."""
    n = 2
    alvo = p
    while alvo.exists():
        alvo = p.with_name(f"{p.stem} ({n}){p.suffix}")
        n += 1
    return alvo


def espelhar(origem: Path, destino: Path) -> None:
    """Deixa `destino` igual a `origem` mexendo só no que mudou. No Drive, clipe que não mudou continua
    o mesmo arquivo (mesmo link no hub) e não sobe de novo."""
    # videos.json fica só no PC: tem os caminhos locais dos vídeos, e Cortes é aberta por link.
    novos = {p.relative_to(origem) for p in origem.rglob("*") if p.is_file() and p.name != "videos.json"}
    for p in sorted(destino.rglob("*"), key=lambda x: len(x.parts), reverse=True):
        rel = p.relative_to(destino)
        if p.is_file() and rel not in novos and p.name.lower() != "desktop.ini":
            p.unlink()
        elif p.is_dir() and not any(x.name.lower() != "desktop.ini" for x in p.iterdir()):
            shutil.rmtree(p, ignore_errors=True)
    for rel in sorted(novos):
        de, para = origem / rel, destino / rel
        if para.is_file():
            a, b = de.stat(), para.stat()
            if a.st_size == b.st_size and abs(a.st_mtime - b.st_mtime) < 2:
                continue
        para.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(de, para)


def ler_json(p: Path) -> dict | None:
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError):
        return None


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
        # Cada jogo ganha uma pasta em Jogos/ com a súmula, o vídeo bruto e a subpasta Cortes.
        self.entrega: Path = a.entrega or a.videos / "Jogos"
        # Antes os clipes iam para Cortes/<jogo>: esses jogos são trazidos para Jogos/ sozinhos.
        self.legado: Path = a.videos / "Cortes"
        # Súmula e vídeo só mudam de lugar se a pasta dos jogos estiver dentro da pasta vigiada:
        # assim uma súmula corrigida ainda acha o vídeo do jogo.
        self.organiza = self.videos in self.entrega.parents and self.entrega != self.legado
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
        # Vídeo solto já conferido contra cada jogo pronto (id, versão da súmula): não confere de novo.
        self.conferidos: dict[tuple[str, int, float], set[tuple[str, float]]] = {}
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

    def eh_clipe(self, p: Path) -> bool:
        """Arquivo dentro de Jogos/<jogo>/Cortes (ou da pasta Cortes antiga): é clipe pronto, não vídeo novo."""
        if self.legado in p.parents and self.legado != self.videos:
            return True
        try:
            partes = p.relative_to(self.entrega).parts
        except ValueError:
            return False
        return len(partes) >= 3 and partes[1] == "Cortes"

    def na_pasta(self) -> list[Path]:
        """Arquivos da pasta vigiada (a entrada e as pastas dos jogos), sem os clipes já entregues."""
        return [p for p in self.videos.rglob("*") if p.is_file() and not self.eh_clipe(p)]

    def ler_sumulas(self) -> None:
        """Súmulas salvas na pasta pelo app. Vale a mais recente de cada jogo."""
        mais_nova: dict[str, tuple[float, Path, int, dict]] = {}
        for p in self.na_pasta():
            if p.suffix.lower() in EXTENSOES_VIDEO:
                continue
            try:
                st = p.stat()
            except OSError:
                continue
            lida = self.lidas.get(p)
            if not lida or lida[:2] != (st.st_size, st.st_mtime):
                try:
                    dados = json.loads(p.read_text(encoding="utf-8-sig")) if parece_sumula(p, st.st_size) else None
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

    def cameras_novas(self, e: dict, arquivos: list[Path]) -> list[Path]:
        """Vídeos que chegaram depois do corte e caem no horário deste jogo: outra câmera (ou o
        resto da gravação). Cada vídeo é conferido uma vez por versão da súmula."""
        arq = self.banco.dir(e["id"]) / "sumula.json"
        versao = (e["id"], arq.stat().st_mtime)
        soltos = []
        for v in arquivos:
            if self.chave_video(v) in e["videos"]:
                continue
            st = v.stat()
            vistos = self.conferidos.setdefault((str(v), st.st_size, st.st_mtime), set())
            if versao not in vistos:
                vistos.add(versao)
                soltos.append(v)
        if not soltos:
            return []
        return [v for v in self.candidatos(e, soltos, unico_pendente=False) if self.chave_video(v) not in e["videos"]]

    def cortar_jogo(self, id_jogo: str, videos: list[Path], antes: dict | None = None) -> None:
        """Corta (ou recorta) o jogo com estes vídeos. Clipe que não mudou vem do corte anterior,
        sem recodificar. `antes`: o jogo já estava pronto e chegou outra câmera; se o vídeo novo não
        servir, o jogo volta a ser como era."""
        nomes = [self.chave_video(v) for v in videos]
        pasta = self.banco.dir(id_jogo)
        sumula = corte.Sumula.ler(pasta / "sumula.json")
        total = len(sumula.eventos(corte.TIPOS_COM_CLIPE))
        if antes:
            novos = [n for n in nomes if n not in antes["videos"]]
            print(f"Vídeo novo para {antes['confronto']} (outra câmera?): {', '.join(novos)}")
        print(f"Cortando {id_jogo}: {', '.join(nomes)}")
        self.banco.mudar(id_jogo, estado="cortando", mensagem="", videos=nomes, feitos=0, total=total)
        saida, nova = pasta / "clipes", pasta / "clipes.novo"
        shutil.rmtree(nova, ignore_errors=True)
        cmd = [sys.executable, str(RAIZ / "cortar.py"), str(pasta / "sumula.json"), *map(str, videos), "--saida", str(nova)]
        if (saida / "clipes.json").is_file():
            cmd += ["--reaproveitar", str(saida)]
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
        lista = ler_json(nova / "clipes.json") if codigo == 0 else None
        clipes = len(lista) if isinstance(lista, list) else 0
        info = ler_json(nova / "videos.json") if codigo == 0 else None
        info = info if isinstance(info, list) else []

        e = self.banco.ler(id_jogo)
        if e.get("recortar"):
            shutil.rmtree(nova, ignore_errors=True)
            e.pop("recortar")
            e.update(estado="aguardando_video", feitos=0, tentados=[])
            self.banco.gravar(e)
            return
        if antes and not (codigo == 0 and clipes):
            # A câmera nova não serviu (outro jogo, sem QR…): o jogo continua como estava.
            shutil.rmtree(nova, ignore_errors=True)
            novos = [n for n in nomes if n not in antes["videos"]]
            self.banco.mudar(id_jogo, **{k: antes.get(k) for k in ("estado", "mensagem", "videos", "feitos", "total")},
                             tentados=[*antes["tentados"], *novos])
            print(f"  não serviu para {antes['confronto']}: {erro or 'nenhum lance neste vídeo'}")
            return
        destino = self.pasta_jogo(e, sumula) / "Cortes"
        e = self.banco.ler(id_jogo)
        if codigo == 0 and clipes:
            shutil.rmtree(saida, ignore_errors=True)
            nova.rename(saida)
            # Que câmera é cada vídeo; vídeo com QR de outro jogo não é deste (fica na entrada).
            usados = [x for x in info if not x.get("outro_jogo")]
            outros = [self.chave_video(Path(x["video"])) for x in info if x.get("outro_jogo")]
            videos_ok = [self.chave_video(Path(x["video"])) for x in usados] or [n for n in nomes if n not in outros]
            cameras = [x.get("camera") for x in usados] if usados else []
            self.entregar(e, destino, origem=saida, aviso=" ".join(avisos))  # "pronto" só com os clipes no lugar
            e = self.banco.mudar(id_jogo, estado="pronto", clipes=clipes, feitos=clipes, mensagem=" ".join(avisos),
                                 videos=videos_ok, cameras=cameras, tentados=[*e["tentados"], *outros])
            self.avisar(e, "Cortes prontos", f"{e['confronto']}: {clipes} clipes.", self.url_clipes(id_jogo))
            n_cam = len(set(cameras))
            print(f"Pronto: {e['confronto']}, {clipes} clipes" + (f" de {n_cam} câmeras" if n_cam > 1 else "")
                  + f" em {destino}")
            if outros:
                print(f"  deixei de lado (QR de outro jogo): {', '.join(outros)}")
        else:
            shutil.rmtree(nova, ignore_errors=True)
            shutil.rmtree(saida, ignore_errors=True)
            motivo = erro or "Nenhum lance da súmula aparece neste vídeo."
            e = self.banco.mudar(id_jogo, estado="erro", mensagem=motivo, tentados=[*e["tentados"], *nomes])
            self.entregar(e, destino, erro=f"{motivo}\n\nVídeo usado: {', '.join(nomes)}\n"
                          "Coloque o vídeo certo na pasta e o corte recomeça sozinho.")
            self.avisar(e, "Não consegui cortar", f"{e['confronto']}: {motivo}")
            print(f"Falhou: {e['confronto']}: {motivo}")

    # ---- a pasta de cada jogo: Jogos/<data hora · modalidade · jogo>/ com súmula, vídeo e Cortes

    def pasta_jogo(self, e: dict, sumula: corte.Sumula) -> Path:
        """A pasta do jogo. Se o nome mudou (súmula corrigida com outro nome de time), renomeia a antiga:
        no Drive a pasta continua a mesma, com o mesmo link."""
        nova = self.entrega / nome_da_pasta(sumula)
        antiga = Path(e["pasta"]) if e.get("pasta") else None
        if antiga and antiga != nova and antiga.is_dir():
            if nova.exists():
                nova = antiga
            else:
                try:
                    antiga.rename(nova)
                    self.mudou_de_lugar(e["id"], antiga, nova)
                except OSError as falha:
                    print(f"  não consegui renomear a pasta do jogo: {falha}")
                    nova = antiga
        try:
            nova.mkdir(parents=True, exist_ok=True)
        except OSError as falha:
            print(f"  não consegui criar {nova}: {falha}")
        if e.get("pasta") != str(nova):
            self.banco.mudar(e["id"], pasta=str(nova))
        return nova

    def mudou_de_lugar(self, id_jogo: str, antes: Path, depois: Path) -> None:
        """Arquivos que estavam em `antes` agora estão em `depois`: atualiza o que o programa lembra deles."""
        def trocar(p: Path) -> Path:
            return depois / p.relative_to(antes) if p == antes or antes in p.parents else p

        e = self.banco.ler(id_jogo)
        videos = [self.chave_video(trocar(self.videos / v)) for v in e["videos"]]
        entregue = str(trocar(Path(e["entregue"]))) if e.get("entregue") else None
        self.banco.mudar(id_jogo, videos=videos, entregue=entregue)
        self.vistos = {trocar(p): v for p, v in self.vistos.items()}
        self.lidas = {trocar(p): v for p, v in self.lidas.items()}

    def mover(self, de: Path, para: Path) -> Path:
        """Move dentro do Drive (é só uma troca de pasta: nada sobe de novo)."""
        para = livre(para)
        shutil.move(str(de), str(para))
        for memoria in (self.vistos, self.lidas):
            if de in memoria:
                memoria[para] = memoria.pop(de)
        return para

    def organizar(self) -> None:
        """Depois do corte, junta tudo de cada jogo na pasta dele: súmula, vídeo bruto e Cortes.
        Jogo esperando vídeo fica com a súmula na entrada, até o vídeo chegar."""
        if not self.organiza:
            return
        for e in self.banco.todos():
            if e["estado"] not in ("pronto", "erro") or not (self.banco.dir(e["id"]) / "sumula.json").is_file():
                continue
            try:
                self.organizar_jogo(e)
                if e.get("erro_pasta"):
                    self.banco.mudar(e["id"], erro_pasta="")
            except OSError as falha:
                if str(falha) != e.get("erro_pasta"):
                    print(f"Não consegui organizar {e['confronto']}: {falha}")
                    self.banco.mudar(e["id"], erro_pasta=str(falha))
        self.apagar_pasta_antiga()

    def organizar_jogo(self, e: dict) -> None:
        sumula = corte.Sumula.ler(self.banco.dir(e["id"]) / "sumula.json")
        pasta = self.pasta_jogo(e, sumula)
        e = self.banco.ler(e["id"])
        titulo = titulo_do_jogo(sumula)
        self.guardar_sumulas(e, pasta, titulo)
        if e["estado"] != "pronto":  # sem corte, não dá para ter certeza de que o vídeo é deste jogo
            return
        videos = []
        cams = list(e.get("cameras") or [])
        cams += [None] * (len(e["videos"]) - len(cams))
        varias = len(set(cams) - {None}) > 1
        for i, rel in enumerate(e["videos"]):
            v = self.videos / rel
            # "Vídeo - <jogo>.mp4"; com várias câmeras, "Vídeo - <jogo> - Câmera 2.mp4"; e "(parte 2)" se
            # a mesma câmera parou e voltou a gravar.
            mesma = [j for j, c in enumerate(cams) if c == cams[i]] if varias else list(range(len(cams)))
            parte = f" (parte {mesma.index(i) + 1})" if len(mesma) > 1 else ""
            camera = f" - Câmera {cams[i]}" if varias and cams[i] else ""
            nome = f"Vídeo - {titulo}{camera}{parte}{v.suffix.lower()}"
            if v.is_file() and v.parent != pasta:
                v = self.mover(v, pasta / nome)
                print(f"Organizado: {rel} → {v.relative_to(self.videos)}")
            elif v.is_file() and v.name != nome and not (pasta / nome).exists():
                v = self.mover(v, pasta / nome)  # chegou outra câmera: o vídeo antigo ganha o número dele
                print(f"Organizado: {rel} → {v.relative_to(self.videos)}")
            videos.append(self.chave_video(v))
        if videos != e["videos"]:
            self.banco.mudar(e["id"], videos=videos)
        # Jogo cortado antes desta versão: os clipes estavam em Cortes/<jogo>. A pasta vai inteira,
        # com o mesmo link no Drive (o hub continua achando os vídeos).
        entregue = Path(e["entregue"]) if e.get("entregue") else None
        if entregue and entregue.parent == self.legado and entregue.is_dir() and not (pasta / "Cortes").exists():
            shutil.move(str(entregue), str(pasta / "Cortes"))
            self.banco.mudar(e["id"], entregue=str(pasta / "Cortes"))
            print(f"Organizado: cortes de {e['confronto']} → {(pasta / 'Cortes').relative_to(self.videos)}")

    def guardar_sumulas(self, e: dict, pasta: Path, titulo: str) -> None:
        """A súmula que vale vira "Súmula - <jogo>.json" na pasta do jogo. Cópia repetida (o celular
        mandou duas vezes) vai para a lixeira do Drive; versão diferente fica como "versão anterior"."""
        oficial = pasta / f"Súmula - {titulo}.json"
        vale = ler_json(self.banco.dir(e["id"]) / "sumula.json")
        # Só as que estão fora da pasta do jogo: as de dentro já foram guardadas.
        soltas = [p for p, (_, _, d) in self.lidas.items()
                  if d and d["jogo"]["id"] == e["id"] and p.parent != pasta and p.is_file()]
        for p in sorted(soltas, key=lambda x: x.stat().st_mtime):
            dados = self.lidas[p][2]
            if dados != vale:
                self.mover(p, pasta / f"Súmula - {titulo} (versão anterior).json")
            elif oficial.is_file() and ler_json(oficial) == vale:
                p.unlink()
                self.lidas.pop(p, None)
            else:
                if oficial.is_file():
                    self.mover(oficial, pasta / f"Súmula - {titulo} (versão anterior).json")
                self.mover(p, oficial)

    def apagar_pasta_antiga(self) -> None:
        """A pasta Cortes de antes some quando o último jogo dela já foi para Jogos/."""
        if self.legado == self.videos or not self.legado.is_dir():
            return
        if any(x.name.lower() != "desktop.ini" for x in self.legado.iterdir()):
            return
        if any(Path(e.get("entregue") or "").parent == self.legado for e in self.banco.todos()):
            return
        shutil.rmtree(self.legado, ignore_errors=True)

    def entregar(self, e: dict, destino: Path, origem: Path | None = None, aviso: str = "", erro: str = "") -> None:
        """Copia os clipes para Jogos/<jogo>/Cortes (no Drive, eles sobem sozinhos). Troca a entrega anterior,
        mas mantém a pasta: no Drive ela continua com o mesmo link liberado para o hub."""
        try:
            antiga = Path(e["entregue"]) if e.get("entregue") else None
            if antiga and antiga != destino and antiga.is_dir() and (
                    antiga.parent == self.legado or (antiga.name == "Cortes" and self.entrega in antiga.parents)):
                shutil.rmtree(antiga)
            destino.mkdir(parents=True, exist_ok=True)
            if origem:
                espelhar(origem, destino)
                if aviso:
                    (destino / "AVISO.txt").write_text(aviso + "\n", encoding="utf-8")
            else:
                for x in destino.iterdir():
                    if x.name.lower() != "desktop.ini":
                        shutil.rmtree(x) if x.is_dir() else x.unlink()
                (destino / "NAO_CONSEGUI_CORTAR.txt").write_text(erro, encoding="utf-8")
            self.banco.mudar(e["id"], entregue=str(destino))
        except OSError as falha:  # pasta do Drive indisponível: os clipes continuam em servidor_dados
            print(f"  não consegui copiar para {destino}: {falha}")

    # ---- hub (o link de jogos com os clipes de cada lance)

    def ids_drive(self, destino: Path, h: dict) -> dict[str, str] | None:
        """{caminho do clipe: id no Drive}, ou None se a pasta ainda não apareceu no Drive.
        Libera para quem tiver o link só a pasta Cortes do jogo (o vídeo bruto e a súmula ficam privados)."""
        try:
            relativo = destino.relative_to(self.videos)
        except ValueError:
            return {}  # entrega fora da pasta do Drive: não há como achar os clipes lá
        pasta = self.hub.pasta([self.videos.name, *relativo.parts])
        if not pasta:
            return None
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
            # "c2": o documento ganhou a conferência das câmeras; muda a marca para todo jogo publicar de novo.
            marca = (f"c2:{st.st_size}:{st.st_mtime}:{e['estado']}:{e.get('entregue', '')}:{e.get('clipes', 0)}:"
                     f"{e.get('cameras')}:{e.get('mensagem', '')}")
            h = dict(e.get("hub") or {})
            if h.get("erro") and agora - h.get("quando", 0) < 300:
                continue
            if h.get("espera") and agora - h["espera"] < 30:
                continue
            mudou = h.get("marca") != marca
            if not mudou:
                esperando = h.get("faltam", 0) > 0 and agora - h.get("desde", agora) < 48 * 3600
                if not esperando or agora - h.get("quando", 0) < 60:
                    continue
            try:
                sumula = corte.Sumula.ler(arq)
                # Durante um recorte (câmera nova, súmula corrigida) os clipes de antes continuam valendo:
                # o corte novo vai para outra pasta até terminar.
                lista = pasta / "clipes" / "clipes.json"
                clipes = json.loads(lista.read_text(encoding="utf-8")) if lista.is_file() else []
                ids = self.ids_drive(Path(e["entregue"]), h) if clipes and e.get("entregue") else {}
                if ids is None:
                    if h.get("marca"):
                        # Pasta recém-criada ou movida que o Drive ainda não mostra: o hub fica com o que
                        # já tinha (sem apagar os vídeos) e tenta de novo daqui a pouco.
                        h["espera"] = agora
                        self.banco.mudar(e["id"], hub=h)
                        continue
                    ids = {}
                h["espera"] = 0
                info = ler_json(pasta / "clipes" / "videos.json") if clipes else None
                doc = hub.montar_documento(sumula, "pronto" if clipes else e["estado"], clipes, ids,
                                           info if isinstance(info, list) else [], e.get("mensagem", ""))
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
        self.organizar()
        try:
            self.publicar_hub()
        except Exception:  # o hub nunca pode parar os cortes
            traceback.print_exc()
        arquivos, copiando = self.videos_prontos()
        if copiando:  # espera a cópia acabar, para pegar todas as partes do jogo juntas
            return
        todos = self.banco.todos()
        pendentes = [e for e in todos if e["estado"] in ("aguardando_video", "erro")]
        for e in pendentes:
            achados = self.candidatos(e, arquivos, len(pendentes) == 1)
            if achados:
                self.cortar_jogo(e["id"], achados)
                return
        # Jogo já cortado que ganhou vídeo novo no mesmo horário: outra câmera (ou o resto da gravação).
        reclamados = {v for e in todos for v in e["videos"]}
        soltos = [v for v in arquivos if self.chave_video(v) not in reclamados]
        for e in (x for x in todos if x["estado"] == "pronto") if soltos else ():
            novos = self.cameras_novas(e, soltos)
            if novos:
                atuais = [self.videos / v for v in e["videos"] if (self.videos / v).is_file()]
                self.cortar_jogo(e["id"], [*atuais, *novos], antes=e)
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
    ap.add_argument("--entrega", type=Path, help="onde fica a pasta de cada jogo, com os cortes (padrão: subpasta Jogos)")
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
        print(f"Cada jogo ganha uma pasta em: {servico.entrega}")
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
