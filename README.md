# WT.AG · Credenciais 2026

Apresentação de credenciais da WT.AG em HTML, 26 slides, palco fixo de 1920×1080
escalado para caber na janela. Sem build, sem dependência: é abrir o
`index.html` no navegador.

```bash
open index.html
```

Funciona por `file://` (offline) e servida por HTTP. Três vídeos vêm do YouTube e
esses precisam de internet — ver [Vídeos](#vídeos).

## Como navegar

| tecla | ação |
|---|---|
| `→` `←` `espaço` | avança e volta |
| `S` | sumário |
| `Esc` | fecha player, sumário ou painel de texto |
| `F` | tela cheia, com o player aberto |

Nos slides de case: clique na mídia para abrir o player, em `＋ Texto completo`
para o texto integral, e na pílula **Clientes** no topo para ir às marcas
parceiras. No slide de marcas parceiras, passar o mouse num logo que tem case
mostra uma prévia.

## Estrutura

```
index.html              o deck — os 26 slides
index_review.html       GERADO. não edite: sai do index.html
gerar-review.py         gera o de cima, com a camada de comentários
comprimir-videos.sh     recomprime os vídeos a partir dos masters
css/deck.css            todo o visual
css/review.css          camada de revisão
js/deck.js              navegação, player, animações
js/review.js            camada de revisão
assets/
  img/                  fotos, logos, selos
  video/                8 vídeos, 143 MB
  fonts/                Special Gothic Condensed One + Geist
  logo/                 marcas WT.AG e Grupo WE
  logos-imprensa/       acervo de prêmios e veículos, com originais
```

## A regra que mais dá dor de cabeça

`deck.css` e `deck.js` entram com `?v=NN` no `index.html`. **Toda vez que você
mexer no CSS ou no JS, suba esse número.** Sem isso o navegador serve a versão
velha do cache e parece que a alteração não funcionou — já custou horas de
depuração de um bug que não existia.

```bash
sed -i '' 's/?v=108/?v=109/g' index.html && python3 gerar-review.py
```

## Modo revisão

O `index_review.html` é o deck com uma camada de comentários por cima: arraste
sobre o slide para marcar uma área, escreva, e exporte em Markdown ou JSON. As
marcações ficam no `localStorage` do navegador, então **exporte antes de trocar
de máquina ou limpar o navegador.**

```bash
python3 gerar-review.py              # os 26 slides
python3 gerar-review.py --variantes  # anexa também as variantes de layout
```

O gerador confere a estrutura dos cases a cada execução e acusa se algum perder
um bloco — existe porque uma edição por regex já apagou três miniaturas de vídeo
sem que nenhuma outra validação percebesse.

## Vídeos

Oito arquivos, 143 MB, todos abaixo de 24 MB. Vieram de masters que somavam
881 MB: o `case-sicredi.mp4` tinha 312 MB porque saiu do editor a 20,9 Mbit/s,
bitrate de exportação e não de entrega.

Os masters em resolução cheia **não estão neste repositório**. Ficam no Drive, em
`_Assets/Videos-Alta/`, com um LEIA-ME explicando cada decisão. Para recomprimir:

```bash
./comprimir-videos.sh --conferir
./comprimir-videos.sh
```

**Três vídeos vêm do YouTube** — os depoimentos do Sicredi, que somavam 22
minutos e 267 MB. Eles são os únicos que precisam de internet.

## Publicando no GitHub Pages

O deck é estático, então Pages serve direto do branch. Em **Settings → Pages**,
escolha o branch `main` e a raiz `/`. Nada a construir.

Um detalhe: o `.nojekyll` na raiz impede o Jekyll de processar o site. Sem ele,
qualquer pasta que comece com `_` (como `_originais/` dentro de
`assets/logos-imprensa/`) é ignorada na publicação e os arquivos não aparecem.

## Pendências de conteúdo

- Logo do **Marcas Mais**, o único veículo de imprensa que falta. Aparece em 4
  dos 5 cases; enquanto não chega, o item simplesmente não entra no rodapé.
- **Números do Odontoprev** — três dos seis espaços mostram `(nº)`.
- **URLs de LinkedIn** do time. O selo só aparece em quem tem URL declarada.
- **Foto do slide 11**, marcada `(Foto a trocar)`.
## No celular

O palco é 16:9 fixo, escalado por `min(largura/1920, altura/1080)`. Num iPhone em
**retrato** isso dá escala 0,203: o slide fica com 390×219, uma tira de 26% da
altura no meio do fundo — abre, mas ilegível. Por isso, em aparelho de toque com
tela estreita e em retrato, aparece um aviso pedindo para girar.

Em **paisagem** funciona: a mesma tela dá 693×390, usando a altura toda.

Os alvos de toque precisaram de dois tratamentos diferentes, porque metade da
interface vive fora do palco e metade dentro:

| onde | contexto | como o alvo é calculado |
|---|---|---|
| pontinhos do HUD, `#ui` | fora do palco, sem escala | 34px direto |
| `＋ Texto completo`, pílula `Clientes` | dentro do palco, escalado | `calc(44px / var(--escala))` |

Dentro do palco, um alvo de 44px viraria 16px de tela. Dividir pela `--escala`
(que o `deck.js` publica no `#stage`) devolve os 44px reais. O botão de texto
completo tem 54×7 px de desenho e 98×44 px de área de acerto.

### O limite que continua

Em paisagem no celular, a tipografia grande, as imagens e os vídeos ficam bem. O
**texto corrido dos cases não fica**: 13,5px × 0,36 = 4,9px de tela. Os rótulos
de KPI ficam em 3,8px.

O escape existe e é o botão `＋ Texto completo`: o painel que ele abre fica fora
do palco, com 18px reais, e é legível. Foi por isso que o alvo de toque dele virou
prioridade. Leitura confortável dos cases mesmo, porém, pede tablet em paisagem
(escala 0,615) ou desktop.

## Uma armadilha que já custou um vídeo quebrado

Os masters ficam no Google Drive, e **o Drive pode entregar leitura parcial** de
um arquivo que ainda não materializou por completo: os primeiros 8 MiB vêm certos
e o resto vem corrompido. Aconteceu com o `case-magalu.mp4` — o vídeo publicado
pulava trecho e congelava, e nada acusou na hora, porque o ffmpeg contorna erro
de origem em silêncio e a duração continuou batendo.

O `comprimir-videos.sh` agora se protege disso: lê cada master por inteiro antes
(forçando a materialização), decodifica e **para** se houver erro, e no fim
compara o frame count da saída com o do master. Duração sozinha não serve de
conferência — um vídeo com frames faltando mantém a duração.

Se for copiar arquivo de dentro do Drive à mão, **confira por hash**:

```bash
shasum -a 1 origem.mp4 destino.mp4
```
