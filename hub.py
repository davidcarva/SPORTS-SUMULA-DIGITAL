"""Hub de jogos: publica cada jogo, com os clipes de cada lance, para qualquer um ver pelo app.

Como funciona:
  • os clipes continuam no Google Drive (pasta Súmula Digital › Cortes), que já recebe tudo;
  • este módulo acha cada clipe no Drive, libera a pasta do jogo para "qualquer pessoa com o link"
    e anota o id de cada arquivo;
  • a súmula resumida (placar, jogadores, lances e o id do clipe de cada lance) vai para o
    Firestore, na coleção "jogos". O app lê de lá, só leitura (regras em firestore.rules).

Precisa da chave da conta de serviço do Firebase (o .json "...-firebase-adminsdk-...") na pasta do
projeto ou em SUMULA_CHAVE_FIREBASE, e da pasta "Súmula Digital" compartilhada com o e-mail da
chave (Editor). Sem chave, o hub fica desligado e o corte segue normal.
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

import requests

import cortar as corte

ESCOPOS = ["https://www.googleapis.com/auth/datastore", "https://www.googleapis.com/auth/drive"]
DRIVE = "https://www.googleapis.com/drive/v3"
PASTA_TIPO = "application/vnd.google-apps.folder"
VERSAO = 1


class ErroHub(RuntimeError):
    pass


def achar_chave(raiz: Path) -> Path | None:
    if os.environ.get("SUMULA_SEM_HUB"):  # testes: nunca publicar jogos de mentira no hub de verdade
        return None
    env = os.environ.get("SUMULA_CHAVE_FIREBASE")
    if env and Path(env).is_file():
        return Path(env)
    achadas = sorted(raiz.glob("*-firebase-adminsdk-*.json"))
    return achadas[0] if achadas else None


# ---------------------------------------------------------------- documento do jogo

def _sets(sumula: corte.Sumula, encerrado: bool) -> dict[str, int] | None:
    """Sets ganhos no vôlei: conta os sets já fechados (há um período depois, ou o jogo acabou)."""
    if sumula.dados["jogo"].get("modalidade") != "volei":
        return None
    por_set: dict[int, dict[str, int]] = {}
    for e in sumula.eventos({"ponto"}):
        if e.get("time") in ("A", "B"):
            s = por_set.setdefault(int(e.get("periodo", 1)), {"A": 0, "B": 0})
            s[e["time"]] += int(e.get("valor") or 1)
    ultimo = max(por_set, default=0)
    ganhos = {"A": 0, "B": 0}
    for p, s in por_set.items():
        if (p < ultimo or encerrado) and s["A"] != s["B"]:
            ganhos["A" if s["A"] > s["B"] else "B"] += 1
    return ganhos


def montar_documento(sumula: corte.Sumula, estado: str, clipes: list[dict], ids: dict[str, str]) -> dict:
    """O jogo como o hub mostra: placar, cada jogador com os lances e o id do clipe de cada lance."""
    d = sumula.dados
    jogo = d["jogo"]
    eventos = sumula.eventos()
    lances = sumula.eventos(corte.TIPOS_COM_CLIPE)
    por_evento: dict[str, list[dict]] = {}  # um clipe por câmera que filmou o lance
    for c in sorted(clipes, key=lambda c: c.get("camera") or 1):
        por_evento.setdefault(c["evento"], []).append(c)
    marcos = [e["t"] for e in eventos if e["tipo"] not in ("sync",)]
    inicio = next((e["t"] for e in eventos if e["tipo"] == "inicio"), min(marcos, default=jogo.get("criado_em", 0)))
    fim = jogo.get("encerrado_em") or max(marcos, default=inicio)

    jogadores: dict[str, dict] = {}
    for t in ("A", "B"):
        for j in d["times"][t]["jogadores"]:
            jogadores[j["id"]] = {"id": j["id"], "time": t, "numero": j.get("numero", ""), "nome": j.get("nome", ""),
                                  "pontos": 0, "lances": []}
    placar = {"A": 0, "B": 0}
    for e in lances:
        t = e.get("time")
        if t not in ("A", "B"):
            continue
        chave = e.get("jogador") or f"sem-{t}"
        if chave not in jogadores:
            jogadores[chave] = {"id": chave, "time": t, "numero": "", "nome": "Equipe", "pontos": 0, "lances": []}
        _, oque = sumula.descrever(e)
        valor = int(e.get("valor") or (1 if e["tipo"] == "ponto" else 0)) if e["tipo"] == "ponto" else 0
        if e["tipo"] == "ponto":
            placar[t] += valor
            jogadores[chave]["pontos"] += valor
        angulos = [{"c": c.get("camera") or 1,
                    "v": ids.get(c.get("vertical") or "") or None,
                    "o": ids.get(c.get("arquivo") or "") or None} for c in por_evento.get(e["id"], [])]
        angulos = [x for x in angulos if x["v"] or x["o"]] or angulos
        c = angulos[0] if angulos else {}
        jogadores[chave]["lances"].append({
            "id": e["id"],
            "oque": oque,
            "valor": valor,
            "periodo": sumula.periodo_nome(int(e.get("periodo", 1))),
            "p": int(e.get("periodo", 1)),
            "hora": sumula.hora(e["t"])[:5],
            "t": e["t"],
            # ids dos arquivos no Drive (vertical com a tarja e o original) da primeira câmera; None
            # enquanto não sobem. "a": cada câmera que filmou o lance (só com mais de uma).
            "v": c.get("v"),
            "o": c.get("o"),
            **({"a": angulos} if len(angulos) > 1 else {}),
        })

    lista = sorted(jogadores.values(), key=lambda j: (j["time"], -j["pontos"], -len(j["lances"]),
                                                      int(j["numero"]) if str(j["numero"]).isdigit() else 999))
    times = {t: {k: d["times"][t].get(k, "") for k in ("nome", "sigla", "cor")} for t in ("A", "B")}
    com_clipe = sum(1 for j in lista for x in j["lances"] if x["v"] or x["o"])
    return {
        "v": VERSAO,
        "id": jogo["id"],
        "nome": sumula.nome,
        "modalidade": jogo.get("modalidade", "basquete"),
        "campeonato": (jogo.get("info") or {}).get("campeonato", ""),
        "local": (jogo.get("info") or {}).get("local", ""),
        "inicio": int(inicio),
        "fim": int(fim),
        "fuso": jogo.get("fuso_minutos", 0),
        "estado": estado,
        "times": times,
        "placar": placar,
        "sets": _sets(sumula, bool(jogo.get("encerrado_em"))),
        "lances": len(lances),
        "clipes": com_clipe,
        "jogadores": lista,
        "atualizado": int(time.time() * 1000),
    }


def resumo(doc: dict) -> dict:
    """O que a lista do hub precisa (o resto só carrega ao abrir o jogo)."""
    return {k: doc[k] for k in ("id", "nome", "modalidade", "campeonato", "local", "inicio", "fim", "fuso", "estado",
                                "times", "placar", "sets", "lances", "clipes")}


# ---------------------------------------------------------------- Firestore e Drive

class Hub:
    def __init__(self, chave: Path):
        from google.oauth2 import service_account

        info = json.loads(chave.read_text(encoding="utf-8"))
        self.projeto: str = info["project_id"]
        self.email: str = info["client_email"]
        self.cred = service_account.Credentials.from_service_account_info(info, scopes=ESCOPOS)
        self.pastas: dict[tuple[str, ...], str] = {}

    @classmethod
    def abrir(cls, raiz: Path) -> "Hub | None":
        chave = achar_chave(raiz)
        if not chave:
            return None
        try:
            return cls(chave)
        except Exception as erro:  # biblioteca faltando ou chave inválida: o corte segue sem hub
            print(f"Hub desligado: {erro}")
            return None

    def _cab(self) -> dict:
        import google.auth.transport.requests as gtr

        if not self.cred.valid:
            self.cred.refresh(gtr.Request())
        return {"Authorization": f"Bearer {self.cred.token}"}

    def _checar(self, r: requests.Response, o_que: str) -> dict:
        if r.status_code >= 400:
            try:
                msg = r.json()["error"]["message"]
            except (ValueError, KeyError, TypeError):
                msg = r.text[:200]
            raise ErroHub(f"{o_que}: {r.status_code} {msg}")
        return r.json() if r.content else {}

    # ---- Firestore

    def publicar(self, doc: dict) -> None:
        url = (f"https://firestore.googleapis.com/v1/projects/{self.projeto}/databases/(default)"
               f"/documents/jogos/{doc['id']}")
        corpo = {"fields": {
            "inicio": {"integerValue": str(doc["inicio"])},
            "resumo": {"stringValue": json.dumps(resumo(doc), ensure_ascii=False)},
            "dados": {"stringValue": json.dumps(doc, ensure_ascii=False)},
        }}
        self._checar(requests.patch(url, json=corpo, headers=self._cab(), timeout=30), "Firestore")

    # ---- Drive

    def _listar(self, q: str, campos: str = "files(id,name,mimeType)") -> list[dict]:
        itens, pagina = [], None
        while True:
            params = {"q": q, "fields": f"nextPageToken,{campos}", "pageSize": 1000,
                      "supportsAllDrives": "true", "includeItemsFromAllDrives": "true"}
            if pagina:
                params["pageToken"] = pagina
            r = self._checar(requests.get(f"{DRIVE}/files", params=params, headers=self._cab(), timeout=30), "Drive")
            itens += r.get("files", [])
            pagina = r.get("nextPageToken")
            if not pagina:
                return itens

    @staticmethod
    def _aspas(nome: str) -> str:
        return nome.replace("\\", "\\\\").replace("'", "\\'")

    def pasta(self, caminho: list[str]) -> str | None:
        """Id da pasta no Drive. O primeiro nome é a pasta compartilhada com a chave (Súmula Digital)."""
        chave = tuple(caminho)
        if chave in self.pastas:
            return self.pastas[chave]
        raiz = self._listar(f"name = '{self._aspas(caminho[0])}' and mimeType = '{PASTA_TIPO}' and trashed = false")
        if not raiz:
            raise ErroHub(f"a pasta '{caminho[0]}' não está compartilhada com {self.email}")
        atual = raiz[0]["id"]
        for nome in caminho[1:]:
            filhos = self._listar(f"'{atual}' in parents and name = '{self._aspas(nome)}' and "
                                  f"mimeType = '{PASTA_TIPO}' and trashed = false")
            if not filhos:
                return None  # o Drive do PC ainda não subiu essa pasta
            atual = filhos[0]["id"]
        self.pastas[chave] = atual
        return atual

    def arquivos(self, pasta_id: str, prefixo: str = "") -> dict[str, str]:
        """{caminho relativo: id} dos vídeos da pasta e das subpastas (ex.: 'Vertical/001_x.mp4')."""
        ids: dict[str, str] = {}
        for f in self._listar(f"'{pasta_id}' in parents and trashed = false"):
            if f["mimeType"] == PASTA_TIPO:
                ids.update(self.arquivos(f["id"], f"{prefixo}{f['name']}/"))
            elif f["name"].lower().endswith(".mp4"):
                ids[f"{prefixo}{f['name']}"] = f["id"]
        return ids

    def liberar(self, pasta_id: str) -> None:
        """Qualquer pessoa com o link vê a pasta do jogo (os arquivos herdam)."""
        r = requests.post(f"{DRIVE}/files/{pasta_id}/permissions",
                          params={"supportsAllDrives": "true", "sendNotificationEmail": "false"},
                          json={"role": "reader", "type": "anyone"}, headers=self._cab(), timeout=30)
        self._checar(r, "Drive (liberar link)")
