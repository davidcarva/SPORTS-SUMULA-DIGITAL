# Súmula digital + highlights (protótipo: basquete, futsal e vôlei)

O mesário registra cada cesta, gol ou ponto num celular. A câmera, que é **outro aparelho**, grava o jogo.
Depois, um script cruza o horário de cada anotação com o vídeo e corta um clipe de cada lance
para cada atleta.

O objetivo deste protótipo é **provar, num jogo real, que os clipes saem certos** antes de investir
em streaming, nuvem ou app de loja.

## O que tem aqui

| Pasta/arquivo | Para quê |
|---|---|
| `web/` | App da súmula (React + Vite). Gráficos do [Bklit](https://bklit.com) e animações do [Motion](https://motion.dev). Funciona offline. |
| `serve.py` | Serve o app (já compilado) na rede local para abrir no celular do mesário. |
| `cortar.py` | Lê a súmula (.json) e o vídeo, sincroniza os dois e gera os clipes e uma galeria. |
| `tests/teste_ponta_a_ponta.py` | Testa o corte e a sincronização com vídeos sintéticos. |
| `reports/` | Pesquisa de concorrência. |

## Como a súmula e o vídeo se alinham

São dois aparelhos, cada um com o seu relógio. Saber "a cesta foi às 15:44:12" não basta:
é preciso saber em que segundo do vídeo isso caiu. O `cortar.py` tenta, nesta ordem:

1. **QR de sincronização (o certo).** No app, o botão **Sincronizar** mostra um QR com o horário
   do celular do mesário, trocado a cada 100 ms. A câmera filma esse QR por 5 s. O script lê o QR
   em todos os quadros e calcula o alinhamento com precisão de **±17 ms** (medida nos testes),
   menos de um quadro de vídeo. Faça isso **no início e no fim** do jogo: com dois pontos, o script
   confere se os relógios andaram juntos e corrige se não andaram.
2. **Horário gravado pela câmera (plano B).** Todo vídeo de celular guarda a hora em que foi
   gravado. Ele sozinho erra: os dois relógios podem diferir em segundos, o MP4 guarda o horário
   arredondado ao segundo, alguns celulares gravam o início e outros o fim, e reenviar por WhatsApp
   pode apagar esse dado. Por isso ele serve para **achar o QR rápido** e, se não houver QR, como
   plano B. Nesse caso o script avisa em destaque e **alarga cada clipe em 2 s** para a jogada não
   ficar de fora.
3. **Âncora manual** (`--ancora MM:SS`): você diz em que segundo do vídeo foi o "Início do jogo"
   marcado no app. A precisão é de cerca de 0,5 s, e o clipe é alargado nessa medida.

O script **recusa** cortar se o QR filmado for de outro jogo, para não gerar clipes errados.

### O que o app faz para o horário do lance ser o certo

- O horário é o do **primeiro toque** do mesário, no jogador ou no botão MARCAR, e não o da
  confirmação. A escolha de +1/+2/+3 pode demorar sem afetar o clipe.
- O toque é medido no `pointerdown`, descontando o atraso do navegador. Não espera o dedo subir.
- Nada muda de lugar na tela durante o jogo. Botões usados ficam desativados no mesmo lugar, e o
  aviso de sincronização tem altura fixa. Quando algo some, a grade sobe e o próximo toque cai no
  jogador errado.
- O aviso de "Desfazer" fica atrás da folha do lance, para não ser tocado sem querer.
- A súmula é salva no aparelho a cada toque, em duas cópias, e o app avisa antes de fechar a página.
- Lances podem ser **corrigidos** depois (trocar atleta ou valor). O clipe sai com o atleta certo
  porque é gerado a partir da súmula.

## Instalação (uma vez)

Precisa de Python 3.10+, Node 20+ e FFmpeg no PATH.

```bash
python -m venv .venv
```

```bash
.venv\Scripts\python -m pip install -r requirements.txt
```

```bash
cd web && npm install && npm run build
```

## Modalidades

A modalidade é escolhida ao criar o jogo e muda pontos, períodos, faltas e cartões. As regras
ficam em `web/src/lib/regras.ts`.

| | Basquete | Futsal | Vôlei |
|---|---|---|---|
| Pontuar | +1 +2 +3 | Gol | Ponto (erro do adversário: linha Equipe) |
| Períodos | 4 quartos + prorrogações | 2 tempos + prorrogações | sets |
| Faltas | P, T, U, D (FIBA); 5 exclui | F; cartões amarelo e vermelho | só cartões |
| Coletivas | 5ª vira lance livre | 6ª vira tiro livre | não há |
| Pedidos de tempo | 2 + 3 + 1 por prorrogação | 1 por tempo | 2 por set |
| Placar grande | total | total | pontos do set; sets embaixo |

## Instalar no celular

O app fica num site gratuito do Google (Firebase Hosting), com HTTPS. Uma vez, faça o login e
publique:

```bash
npx.cmd firebase-tools login
```

```bash
cd web && npm run build && cd .. && npx.cmd firebase-tools deploy --only hosting
```

Abra o endereço `https://SEU-PROJETO.web.app` no celular. No Android, toque em **Instalar no
celular** na tela de novo jogo. No iPhone, use Compartilhar → Adicionar à Tela de Início no Safari.
Depois disso o app abre sem internet.

## Como os cortes acontecem sozinhos

1. O mesário toca em **Encerrar**. O celular abre a tela de compartilhar: escolha **Drive** e a
   pasta **Súmula Digital**. Se cancelar, o app mostra o botão **Mandar súmula para o Drive**.
2. O vídeo da câmera vai para a mesma pasta, pelo app do Google Drive.
3. No PC, o Google Drive para computador traz os dois arquivos, e o programa corta:

```bash
.venv\Scripts\python servidor.py --videos "G:\Meu Drive\Súmula Digital"
```

4. Os clipes aparecem em **Súmula Digital › Cortes › Time A contra Time B (data)**. Se algum lance
   ficou fora do vídeo, a pasta tem um `AVISO.txt`; se não deu para cortar, `NAO_CONSEGUI_CORTAR.txt`.

Súmula corrigida depois (lance trocado ou apagado) gera os clipes de novo: é só mandar outra vez.
O PC precisa estar ligado com o `servidor.py` aberto. Um vídeo de 8 a 10 GB pode levar horas para
subir pelo Drive; pelo cabo, copie para a mesma pasta.

O app também pode ser servido pelo próprio PC (`servidor.py --endereco https://…`): aí a súmula
chega direto, sem o Drive, e o celular recebe aviso quando os cortes ficam prontos.

## No dia do jogo

1. **Abrir o app instalado no celular do mesário.** Veja [Instalar no celular](#instalar-no-celular).

2. **Cadastrar o jogo.** Nomes, siglas, cores e jogadores, um por linha (`7 João`).
3. **Montar a câmera.** Celular no tripé, o mais alto possível, pegando a quadra inteira, em 1080p
   e com modo avião ligado.
4. **Sincronizar.** Comece a gravar. O mesário toca em **Sincronizar** e mostra a tela para a
   câmera, a 30–50 cm, até a barra encher (5 s).
5. **Jogo.** Toque **Início do jogo** no salto inicial. A cada cesta, toque no jogador **assim que
   a bola cair** e depois no valor. Se não achar o jogador na hora, toque **MARCAR** do time: o
   horário fica guardado e você escolhe quem foi em seguida. Tocos, roubos e assistências vão em
   **Lance sem ponto**. No fim de cada quarto, toque **Fim do quarto**.
6. **Fim.** Toque **Encerrar**, salve a súmula no Drive, pare a gravação e mande o vídeo para a pasta. Um QR basta; o
   app só lembra dele no Encerrar se a câmera ainda não tiver visto nenhum.

A aba **Análise** mostra os pontos por quarto (tabela e gráfico em degraus), o fluxo do placar ao
longo do jogo, destaques (trocas de liderança, maior vantagem, maior sequência, melhor quarto) e os
cestinhas com 3/2/1.

## Gerar os clipes manualmente

Só é necessário sem o `servidor.py`. A súmula sai em **Lances** (.json).

```bash
.venv\Scripts\python cortar.py sumula_xxx.json video_do_jogo.mp4
```

Os clipes e a galeria (`index.html`) ficam em `highlights/<jogo>/`.

| Opção | Efeito |
|---|---|
| `--pre 12 --pos 3` | Segundos antes e depois do toque do mesário. |
| `--ancora 1:23` | Sem QR e sem horário no vídeo: diz em que tempo do vídeo foi o "Início do jogo". |
| `--varrer-tudo` | Vai direto para a busca do QR no vídeo inteiro. |
| `--copiar` | Corta sem recodificar. É mais rápido, mas o clipe começa no quadro-chave anterior. |
| `--formato ambos` | Padrão. Sai o clipe no formato filmado **e** a versão vertical. `original` ou `vertical` gera só um. |
| vários vídeos | `cortar.py sumula.json parte1.mp4 parte2.mp4`. Cada parte é sincronizada sozinha. |

### Versão vertical (story / reels)

Vem do programa **Repositório Cortes** (`formato_vertical.py`). Cada lance ganha um clipe
1080x1920 na subpasta `Vertical/`. O fundo é o próprio vídeo ampliado e desfocado, e o
vídeo nítido fica por cima. No instante do lance entra a tarja na cor do time: o lance
(`+3`, `GOL`, `PONTO`), o atleta, o time e o placar logo depois do lance. No topo ficam o
jogo e o período. No vôlei, o placar é o do set.

Lá a legenda sai da transcrição da fala. Aqui o texto sai da própria súmula, então não
precisa de GPU, de IA nem de chave.

O enquadramento muda em `cortes.json`, na pasta do projeto (todos os campos são opcionais):

```json
{ "vertical": { "zoom": 1.4, "pan_y": 0.55, "largura": 1.2, "pos_y": 0.42, "preencher": false } }
```

- `zoom` recorta o vídeo antes de posicionar e tira teto e arquibancada de cena.
- `largura` acima de 1 deixa o vídeo maior que a tela; as sobras são cortadas.
- `preencher: true` tira o desfoque: o vídeo enche a tela e `recorte_x` escolhe qual parte da largura fica.

## O teste em campo: o que medir

Abra a galeria e marque cada clipe como **Aparece**, **Cortou** ou **Errado**. A galeria calcula a
porcentagem e exporta um CSV.

| Pergunta | Como medir | Meta |
|---|---|---|
| O clipe mostra a jogada? | % de "Aparece" | ≥ 90% |
| Quanto o mesário atrasa? | Nos "Cortou", quantos segundos antes do fim a jogada aconteceu | Ajuste o `--pre` |
| A sincronização ficou boa? | Linha "precisão ±N ms" na saída do `cortar.py` | ≤ ±50 ms |
| A imagem serve para postar? | Mostre os clipes aos atletas | Eles postariam? |

## Desenvolvimento

```bash
cd web && npm run dev
```

```bash
cd web && npm test
```

```bash
.venv\Scripts\python tests\teste_ponta_a_ponta.py
```

O teste ponta a ponta gera vídeos sintéticos com o QR do app e um "relógio da verdade" em cada
quadro, e confere as bordas de cada clipe em seis cenários: QR no início e no fim, QR só no meio,
relógio da câmera adiantado, âncora manual, súmula de outro jogo (precisa recusar) e vídeo sem QR.
Leva alguns minutos.

```bash
.venv\Scripts\python tests\teste_servidor.py
```

Confere o fluxo automático: súmula enviada, vídeo errado ignorado, corte com um único QR, acesso por
código e aviso enviado a um serviço de push falso.

```bash
.venv\Scripts\python tests\teste_drive.py
```

Confere o caminho pelo Google Drive: súmula .txt e vídeo na mesma pasta, clipes em Cortes, súmula
corrigida e PC reiniciado.

## Limitações conhecidas

- **Sem transmissão ao vivo:** os clipes saem depois que o vídeo é passado para o computador.
- **Câmera fixa,** sem zoom nem acompanhamento do lance.
- **Um celular de súmula por jogo.** Se a súmula trocar de aparelho no meio, o outro tem outro relógio.
- **Tela sempre acesa** só funciona em HTTPS ou `localhost`. Pela rede local (`http://192.168…`),
  ajuste o bloqueio de tela do celular do mesário.
- **Imagem dos atletas:** peça autorização de uso de imagem na inscrição, com atenção a menores.
