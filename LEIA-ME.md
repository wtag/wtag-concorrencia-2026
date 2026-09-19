# WT.AG — Concorrência 2026 · deck HTML

> **Este projeto é uma bifurcação do deck de credenciais**
> (`wtag-credenciais-2026`), feita em 21.09 a partir dos direcionais do Lucas.
> O deck de credenciais continua existindo, rodando e sendo mantido em separado:
> nada aqui volta para lá.
>
> **O que difere do deck de origem**
>
> | | Credenciais | Concorrência |
> |---|---|---|
> | Público | institucional | pitch para um anunciante |
> | Idioma padrão | português | **inglês** (o toggle PT continua) |
> | Telas | 31 | 29 |
> | Grupo WE | abre o deck | **fora** — há um concorrente do anunciante entre os clientes do grupo |
> | Cases | dez | **oito**, agrupados por cliente, cada um com capa |
> | Time | duas telas (Liderança · O Time) | **uma**, com o número de 140 |
>
> **Telas que nasceram aqui:** `O Que Fazemos` (a mandala) e as quatro capas de
> cliente (Magalu, Keeta, Bridgestone, Multiplan). A tela `Social First Agency`
> foi reescrita: ela e a antiga `Lente × Escopo` viraram uma só.
>
> **Aviso sobre o que vem abaixo.** O corpo deste documento é o do deck de
> origem e continua valendo para tudo que é design system — a métrica do
> lettering, a constante `--cap-k`, a calibração dos logotipos, o diagnóstico do
> `Range` no Safari. Mas ele cita telas, cases e numerações que **não existem
> mais nesta versão** (Grupo WE, Sicredi, Odontoprev, Golden Lake, Marcos Muniz).
> Leia essas passagens como histórico do sistema, não como mapa deste deck. O
> mapa deste deck é a tabela de atos mais abaixo, que está atualizada.

Apresentação de slides em HTML, 1920×1080 (16:9), **funciona offline**: basta abrir
`index.html` no navegador (Chrome ou Safari). Sem build, sem dependências.

---

## Navegação

| Ação | Como |
|---|---|
| Avançar | `→` · `↓` · `Enter` · clique nos 3/4 direitos da tela |
| Voltar | `←` · `↑` · `Backspace` · clique no primeiro 1/4 da tela |
| Primeiro / último | `Home` / `End` |
| Ir para um slide | digite o número (ex.: `1` `7` → slide 17) ou clique nos *dots* |
| Sumário dos capítulos | **barra de espaço** (ou `Esc`) — setas navegam, `Enter` confirma |
| Tela cheia | `F` ou o botão no canto inferior direito |
| Deep link | `index.html#slide-07` |
| Touch / trackpad | *swipe* horizontal |

A barra inferior (número, ato e *dots*) desaparece após 2,6 s sem uso e volta a
qualquer movimento — nunca invade a área de conteúdo do slide.

## Interações

- **Vídeos de case** — clique no box com o *play* para abrir o player. `F` dentro
  do player expande para tela cheia real; **`Esc` sai da tela cheia e volta ao
  slide com o vídeo minimizado** (fechar a tela cheia sempre fecha o player).
- **Imagens de case e fotos das sedes** — clique para ampliar.
- **Texto do case** — clique em **qualquer ponto** da coluna de texto (ou no
  botão `＋ Texto completo`) para abrir o texto integral.
- **Hover** — o box sob o cursor cresce e os irmãos recuam; a foto dentro do box
  responde ao cursor com paralaxe. Vale para os cases, os cartões do framework,
  as grades de logos, os cartões de pessoa e os números do rodapé dos cases.
  O hover só passa a valer **depois do primeiro movimento do mouse dentro do
  slide**: chegar numa tela com o cursor parado sobre uma caixa não destaca
  nada. O primeiro movimento destrava e já aplica o foco ao item sob o cursor.
- **Movimento contínuo** — nas caixas de mídia dos cases, nos cartões de pessoa
  e nas fotos das sedes, a imagem deriva devagar **dentro** do recorte. O
  recorte fica parado; só a imagem se move. O fundo fotográfico dos cases faz o
  mesmo, em deriva lateral de 30 s.
- `prefers-reduced-motion: reduce` desliga todas as animações (fica só um
  *crossfade* de 200 ms).

---

## Estrutura

```
index.html          30 <section class="slide"> (29 visíveis; 1 com data-oculto)
index_review.html   GERADO — o mesmo deck + camada de comentários + variantes
gerar-review.py     gera o index_review.html a partir do index.html
index_pdf.html      GERADO — o deck empilhado como páginas, para virar PDF
gerar-pdf.py        gera o index_pdf.html e o PDF (Chrome headless)
servidor.py         servidor local com Range, para conferir vídeo no Safari
variantes.html      fragmento com variantes para aprovação (opcional)
css/deck.css        design system + componentes + animações
css/review.css      camada de revisão (só o index_review carrega)
css/pdf.css         página de 1920×1080, quadro final parado (só o index_pdf)
js/deck.js          navegação, coreografia de entrada, roleta de texto, player
js/review.js        marcação de áreas/pontos, lista e relatório
assets/
  fonts/            Geist (300–700) + Special Gothic Condensed One
  logo/             WT.AG (SVG preto/branco, + Social First) e Grupo WE
  img/              fotos, logos de clientes/parceiros, framework, cases
    logos-cases/    logotipos dos clientes usados no topo de cada case
    time/           retratos da direção executiva e das lideranças
    sedes/          fotos das duas sedes
  video/            showreel + 2 videocases
```

Os arquivos `css` e `js` são chamados com `?v=NN` (hoje `?v=158`). **Ao editá-los,
incremente esse número** nas duas linhas do `index.html` para furar o cache do
navegador. Isso não é opcional: sem o incremento o navegador serve a versão
antiga e a alteração simplesmente não aparece.
Imagens não têm versão: ao substituir um arquivo de imagem, recarregue com
`Cmd+Shift+R`.

---

## Modo revisão (`index_review.html`)

Versão paralela do deck para colher comentários **em cima da tela**, no lugar de
descrever por escrito onde é cada coisa. O `index.html` de apresentação não sabe
que ela existe.

**Não edite o `index_review.html` à mão** — ele é gerado. Depois de mexer no
`index.html`, rode:

```
python3 gerar-review.py
```

O gerador injeta o `css/review.css`, o `js/review.js` e — se o arquivo existir —
as `<section>` do `variantes.html`, acrescentadas ao fim do palco. Assim as duas
versões nunca divergem de conteúdo.

### variantes.html

Fragmento (não é página) com propostas de layout para aprovar. Entram como slides
extras **só no arquivo de revisão**; o `index.html` de apresentação nunca recebe
variante nenhuma. Quando uma for escolhida, ela substitui o slide original e o
fragmento pode ser apagado — o gerador simplesmente para de injetar.

### Como usar

| Ação | Como |
|---|---|
| Ligar/desligar o modo | `R` ou o botão **Marcar** |
| Marcar uma **área** | arraste sobre o slide |
| Marcar um **ponto** | clique sem arrastar |
| Editar / apagar uma marcação | clique nela |
| Ver a lista de tudo | `L` ou o botão **Marcações** |
| Salvar o comentário | `⌘/Ctrl + Enter` ou o botão **Salvar** |
| Cancelar | `Esc` |
| Trocar de slide com o modo ligado | setas, *dots* ou o sumário |
| Ver/ocultar as resolvidas | `V` ou o botão **Ver N resolvidas** |

Com o modo ligado o clique deixa de avançar o slide (senão marcar viraria
navegação), e o clique também não abre mais os players e lightboxes dos cases.
Desligue o modo para voltar a apresentar normalmente.

### Resolvidas

Ao marcar uma marcação como resolvida (o `✓`), ela **sai da tela e da lista**: o
que fica à vista é só o que ainda falta. Ela continua gravada e continua saindo
no relatório — o que muda é apenas a visualização.

O botão **Ver N resolvidas** na barra (ou a tecla `V`) traz todas de volta; fica
verde enquanto estão à mostra, para não confundir com o laranja do "Marcar". O
botão só existe quando há pelo menos uma resolvida. A lista também mostra um
aviso clicável de quantas estão escondidas.

A preferência fica numa chave própria do `localStorage`
(`…:ver-resolvidas`), separada dos dados: é estado de interface, não conteúdo da
revisão.

### Onde os comentários ficam

No `localStorage` do navegador — ou seja, **na máquina de quem comentou**, e só
naquele navegador. Não sincroniza pelo Drive. Para me mandar:

- **Baixar relatório (.md)** — o arquivo legível, com as marcações agrupadas por
  slide. É esse que resolve.
- **Copiar texto** — mesma coisa, direto para a área de transferência.
- **Salvar .json / Importar .json** — backup e restauração das marcações.

O `.md` gerado embute o `.json` num bloco recolhido no final, então o próprio
relatório serve para reimportar.

### O que vai no relatório

Cada marcação registra o slide, o tipo, as coordenadas **no espaço do palco**
(1920×1080, origem no canto superior esquerdo) e **o que ela cerca**:

- em ponto, o elemento sob o cursor;
- em área, a lista dos elementos que a área cobre (só os que estão pelo menos
  metade dentro dela).

Isso vale mais que a coordenada nua: um comentário chega como "a área cobre
`span.ln → “SOCIAL”` · `span.ln → “FIRST”`" em vez de "algo em x 72 y 72".

Detalhe de implementação: metade do conteúdo do deck é invisível ao teste de
ponteiro (a `.escada` inteira tem `pointer-events:none`, e é justamente o
lettering grande que mais se quer comentar). Por isso, quando o
`elementFromPoint` não devolve nada citável, entra um **teste geométrico** que
procura a menor caixa que contém o ponto.

## Os 5 atos

| Ato | Slides | Conteúdo |
|---|---|---|
| Abertura | 01–02 | capa WT.AG e o wordmark em loop |
| WT.AG | 03–12 | Social First (lente × escopo), consumidor, marcas, metodologia, framework, persona, mandala, showreel, marcas parceiras |
| Nosso Time | 13–15 | divisor, a tela única do time (140 + direção + lideranças), escritórios |
| Cases | 16–28 | divisor, e quatro blocos de cliente, cada um aberto por uma capa sobre foto: Magalu (2), Keeta (3), Bridgestone (1), Multiplan (2 — BarraShoppingSul e Golden Lake) |
| Fecho | 29 | vamos construir juntos |


---

## Conferir no navegador (`servidor.py`)

```
python3 servidor.py            # http://localhost:8765
```

O deck roda direto do arquivo (`file://`) para apresentar. Para **conferir**,
suba o servidor: é o único jeito de o vídeo se comportar como no site.

Não use `python3 -m http.server`. Ele não responde `Range`: um pedido de
`bytes=0-2048` volta 200 com o arquivo inteiro em vez de 206 com o pedaço, e o
Safari se recusa a tocar vídeo servido assim — o player abre, fica preto e não
escreve nada no console. O Chrome tolera. Como metade da conferência deste deck
é no Safari, por causa do iPhone, o sintoma aparecia justo nos cases, que são
os slides com vídeo de 24 MB. O `servidor.py` responde 206, aceita seek e serve
cada pedido numa thread (o embutido é single-thread e engasga a página inteira
enquanto empurra um vídeo).

---

## Versão em PDF (`gerar-pdf.py`)

```
python3 gerar-pdf.py            # index_pdf.html + WT.AG_Credenciais_2026.pdf
python3 gerar-pdf.py --so-html  # só o HTML, para conferir no navegador
```

Os dois arquivos são **gerados** e estão no `.gitignore`: o que se versiona é o
gerador. Rode depois de mexer no `index.html`.

O que o gerador faz, e por quê:

- **Tira a capa WT.AG** (`SEM_CAPA`). Ela recebe quem abre o deck e não sabe
  como andar nele; num PDF, que se folheia, é uma página de rodeio antes do
  assunto. O documento abre na capa do Grupo WE. **No `index.html` a capa
  continua** — o gerador não toca no deck.
- **Tira os cases sem texto fechado** (lista `EXCLUIR` no alto do arquivo). Um
  case com `(a definir)` no contexto e `(nº)` nos números passa numa tela que
  alguém narra em três segundos; num PDF, lido sozinho, ele é uma página
  incompleta. Hoje ficam fora BarraShoppingSul, Golden Lake e Brasil Corre —
  **quando o texto chegar, é apagar o id da lista.**
- **Empilha os slides como páginas** de 1920×1080 (= 1440×810 pt), cada uma
  congelada no quadro final: entra `is-played` na marcação e os contadores já
  saem escritos no valor de chegada, porque não há JS no arquivo.
- **Troca vídeo por pôster + link.** O cartão inteiro vira uma âncora
  transparente; o Chrome converte `<a href>` em anotação de link no PDF. Os
  arquivos apontam para os masters em `_Assets/Videos-Alta` no Drive (mapa
  `DRIVE`, por ID); os três depoimentos do Sicredi vão para o YouTube, onde já
  são públicos. **A permissão dos arquivos no Drive é um ajuste à parte** — a
  API da integração não mexe nela.
- **Deixa uma passada só nas esteiras de repercussão.** Elas têm os logos
  duplicados no HTML porque a animação desliza -50% e o segundo conjunto cai
  sobre o primeiro, fechando o laço sem emenda. Paradas, a duplicata aparece e o
  último item fica cortado — cortado a faca, porque o `mask-image` que esmaece
  as pontas na tela não é aplicado pelo Chrome na impressão. A conferência é o
  próprio invariante: as duas metades têm de ser idênticas; se não forem, o
  gerador não mexe e avisa.
- **Reencoda as imagens grandes em JPEG.** Sem isso o arquivo sai com 50 MB: o
  Chrome não repassa o JPEG original quando existe um grupo de transparência em
  cima da foto — e cada case tem um, porque o box de números é
  `backdrop-filter`. Ele achata o visual num bitmap SEM PERDA de 6000×3375, 3,1×
  a página. Cinco cases assim eram 31 dos 50 MB. Reencodados a 3840 de lado
  (2× a página), o deck fecha em 13,5 MB.

Precisa de `pypdf` e `pillow` (`python3 -m pip install --user pypdf pillow`).
Sem eles o PDF sai igual, só pesado — o gerador avisa e segue.

---

## Design system aplicado (Brandbook 2026)

- **Cores** — laranja `#FF4900`, preto `#000`, creme `#F7F9EA` + sage claro/oliva,
  verde profundo e marrom. Nenhuma cor fora da paleta; branco puro só no negativo
  do logotipo. Texto sobre laranja sempre preto.
- **Degradê** — apenas `#FF4900 → #9C2D00 → #000`, sempre atrás da tipografia e em
  canto reto. Animado de forma orgânica no slide 09. As telas majoritariamente
  laranja (07, 10 e a chamada final) são **laranja chapado**: sem degradê, sem
  atmosfera, sem variação de tom. O slide 06 é **preto chapado**.
- **Tipografia** — Special Gothic Condensed One nos títulos de display; Geist
  (Medium é o peso padrão) no resto. Cada linha de escada é posicionada pelo
  **topo da maiúscula** (variáveis `--x` / `--cap` / `--fs`), então ajustar uma
  linha é mudar um número.
- **Traçado na Special Gothic** — toda aparição da Special Gothic leva **2 pt de
  contorno na mesma cor da letra** (`-webkit-text-stroke:2.67px currentColor`;
  2 pt × 1,333 px/pt da equivalência do brandbook). Como é `currentColor`, o
  efeito é engrossar o desenho de forma uniforme — e o contorno some junto com
  a letra quando o texto é silenciado durante a roleta. A propriedade é
  herdada, então as máscaras da roleta recebem o mesmo traçado sem regra extra.
- **Escada** — quebra por sentido, primeira linha ancorada, sobreposição entre
  linhas vizinhas, corpo ajustado por linha para igualar larguras.
- **Raio** — regra dos 24% (mín. 14 px, máx. 102 px). Canto reto no que compõe
  com a tipografia; arredondado no que organiza informação.
- **Marcações** — `CREDENCIAIS` / `2026` / logotipo a 72 px dos cantos.

### Transição de texto “roleta”

Referência: abertura do showreel e vídeo principal de wt.ag. Cada caractere ganha
uma máscara retangular e o glifo novo sobe dentro dela, com *stagger* entre as
posições.

Detalhe importante da implementação: **o texto final é escrito de verdade no
elemento desde o primeiro quadro** (com kerning e métricas corretas) e fica
invisível; as máscaras são uma camada sobreposta, posicionada caractere a
caractere com `Range`. Por isso o layout nunca muda e, quando a animação acaba,
nada se move — o glifo já estava no lugar. A máscara tem a altura de uma célula
inteira (o em-box, 1,3em) e folga lateral de 0,18em, então nenhuma parte da tinta
é cortada. A camada sai no `transitionend` da última máscara, sem sobra.

- **Slide 06** — roleta longa sobre **preto chapado**: as palavras depois de `WT.`
  giram entre AGENCY, SOCIAL, MEDIA, CREATIVE e INFLUENCER; da última, a tela
  passa direto para o logotipo oficial em vetor, que entra **quase em toda a
  tela** (1776 × 452,6 px, as margens de 72 px do grid) em três faixas
  (WT. / A / G). O logotipo **sai** com o mesmo movimento com que entrou e o
  ciclo reinicia em `WT.` → AGENCY (loop de ~7,5 s).
  A máscara da palavra que troca usa `aperta: 0.11`: a janela tem **altura de
  maiúscula + respiro** (0,91em) em vez do em-box inteiro (1,3em), então a troca
  sai mais direta sem cortar nenhum glifo. Isso só é seguro porque as palavras e
  os glifos intermediários são todos caixa-alta sem acento nem descendente.
- **Todo o resto** — versão sutil: o glifo entra uma única vez na máscara, em
  cascata, sem girar por caracteres aleatórios.

### Slide 06 · por que o logotipo virou três SVGs

Antes, as três faixas do logotipo eram recortes com `clip-path` de **uma única**
imagem. O corte caía dentro da tinta: a barra do `T` avança até x = 319,23 do
viewBox e o pé do `A` começa em x = 317,02 — as caixas dos grupos se sobrepõem.
Resultado: emenda visível por antialiasing e, durante o *stagger*, um pedaço de
glifo aparecendo antes da hora (o "vazamento" e os *glitches* nas laterais).

Agora cada faixa é um **SVG separado** (`wtag-branco-g1/g2/g3.svg`) com o
**mesmo viewBox do logotipo completo**, contendo só os seus glifos. As três se
sobrepõem em registro perfeito, a máscara é a própria caixa (`overflow:hidden`)
e **não existe nenhum corte vertical** — logo não há emenda nem glifo pela
metade. Para mexer no logotipo, edite os três arquivos mantendo o viewBox.

### Fundo e transição entre slides

O fundo de cor sólida vive numa camada própria (`#fundo`) **fora do palco 16:9**:
ela preenche toda a janela do navegador, então não existem barras de cor
divergente em telas fora de 16:9. Na troca de slide, um painel com a cor nova
**sobe de baixo para cima** e cobre o anterior, enquanto o conteúdo mantém a sua
coreografia. A cor vem de `data-fundo` no slide (ou do `data-tom`, como reserva).

### Interações de hover

- Cases, cartões do framework e grades de logos: o item sob o cursor cresce e os
  irmãos recuam; a foto dentro da caixa responde ao cursor com paralaxe.
- Números do rodapé dos cases: realce forte (1,38×), irmãos a 0,84× e o número
  em laranja.
- Entrada das caixas de mídia dos cases: crescimento de pílula → retângulo
  (referência `video_23.mp4`).
- Números do rodapé dos cases: o KPI sob o cursor cresce **por corpo de fonte**
  (56 → 76 px) e a caixa cresce por `flex-grow` (1 → 2,6), enquanto os irmãos
  recuam a 0,74. Como o layout se reorganiza de verdade, o número grande sempre
  tem largura própria e **nunca sobrepõe** o vizinho — foi por isso que o
  realce deixou de ser `transform:scale()`.
- Todas as transições de hover ficam entre 150 e 260 ms. Valores mais altos
  (eram 380–620 ms) davam sensação de atraso ao passar o mouse.

---

### Ato 5 · Estrutura (22–26)

Três telas novas vindas do Figma (`Direção Executiva`, `Lideranças`,
`Onde Ficamos`) mais um divisor construído no mesmo molde do divisor 16: o ato
anterior aparece apagado no alto com o seu intervalo de páginas (`CASES 17–21`)
e o novo ato entra grande com a roleta (`ESTRUTURA 23–25`).

Os cartões de pessoa (`.pes`) e as caixas de sede (`.sede`) seguem a gramática
das caixas de mídia dos cases: recorte arredondado parado, foto derivando dentro
dele, degradê de leitura no pé e legenda (cargo em laranja + nome). `--dv` e
`--dd` variam duração e fase por cartão para que a grade nunca pareça uma única
peça deslizando.

### Logotipo do cliente no topo do case

O nome escrito do cliente foi trocado pelo **logotipo**, acima do nome da
campanha. O tamanho não é arbitrário: cada logotipo é escalado para que a
**altura-de-x do seu letreiro** valha 20,2 px — a altura-de-x do degrau **H3**
da escala do brandbook (Geist Medium 38 px × 0,532). Assim os quatro logotipos
leem no mesmo degrau apesar de terem proporções muito diferentes (o lockup do
Influenciador Magalu é 6:1, o da Keeta é 1,88:1), e todos ficam subordinados à
chamada em Special Gothic 92 px. A base do logotipo fica em y = 200, o que
deixa 1X de respiro (regra 2.4) até o topo da maiúscula da campanha em y = 230.

As frações altura-de-x / altura-do-arquivo foram medidas nos próprios PNGs:
Influenciador Magalu 0,3512 · Keeta 0,5658 · Sicredi 0,4697 · Odontoprev 0,4259.
Para trocar um logotipo, meça a mesma fração e resolva `h = 20,2 / fração`.

### Como as coordenadas `--x` / `--cap` / `--fs` foram obtidas

Não foram estimadas a olho. Cada página do PDF original foi renderizada a
**384 dpi** (exatamente 2× o artboard de 1920 px) e medida com **isolamento por
cor**, separando a tinta da tipografia da fotografia. Sobre essa medição:

- o topo da maiúscula vem da métrica real das fontes (`capHeight` 710/1000 nas
  duas famílias, `typoAscender` 1005, `typoDescender` −295 → o offset analítico
  `--cap-k = 0,145` com `line-height:1`);
- o `--x` é corrigido pelo **left side bearing**: a medição no PDF é de tinta, e
  o `left` do CSS é a origem do glifo, então `--x = tintaEsquerda − LSB × fs`.

Onde o Figma e o PDF divergiam (slides 08/09/10/11/15), o Figma estava com os
`x` achatados pela importação do PPTX; os valores medidos coincidiram com o
Figma exatamente onde o Figma estava certo, o que validou o método.

Os tamanhos dos logotipos dos murais (slides 04 e 15) saem de **massa óptica**
`√(largura × altura)` constante, com compensação para marcas de traço denso — no
slide 04 a Keeta foi ajustada por altura-de-x contra os vizinhos da fileira
(Cinemark 26,5 · Haier 25,5 · Magalu 24 · BYD 23,5 → alvo 25).

## Assets: o que veio de onde

- **Fotos e artes dos slides 01–13** — extraídas do arquivo Figma (`download_assets`),
  em resolução original. As artes de fundo dos slides 02–05 foram **limpas**: todo
  texto/dado chapado na imagem foi removido, para que nada apareça antes da
  animação nem fique duplicado atrás dela.
- **Logos de clientes (slide 04)** — recortados do PDF em 2× nas coordenadas exatas
  do Figma.
- **Logos de parceiros (slide 15)** — recortados na *bounding box* da tinta e
  dimensionados por **massa óptica** (`√(largura×altura)` constante, com
  compensação para logos de traço fino), num grid de 3 × 5 alinhado.
- **Cases** — os que ainda não têm material próprio vêm de recortes em 2× das
  páginas 17–24 do PDF, com *heroes* 16:9 e fundos desfocados derivados deles.
- **Central do Corre e Dia das Mães** — material original de
  `_Assets/Cases/Fotos/`. `Imagem/Foto Principal.png` (1920 × 1080) virou o
  *hero* / pôster do player; `Foto 1–3.png` (960 × 1080, retrato) viraram os três
  recortes da pilha. **Atenção:** os recortes da pilha são paisagem (317 × 170) e
  as fotos são retrato, então o *thumbnail* é um corte com gravidade vertical de
  0,42 (um pouco acima do meio, onde ficam os rostos) — mas o clique abre a foto
  **inteira** (`…-full1/2/3.jpg`). `Foto 4.png` de cada case ficou sem slot: são
  três recortes na pilha.
- **Videocase da Odontoprev** — `Odontoprev-DiadasMaes_v2.mov` (57 MB, 46 s)
  transcodificado para MP4 H.264/AAC. O box deixou de ser *still* e virou player.
- **Fundos dos cases** — todos normalizados para a mesma luminância média (~62),
  porque o material novo chegava muito mais claro que o antigo (Odontoprev vinha
  a 148) e o texto perdia contraste de forma desigual entre as telas. O fundo do
  Central do Corre **não** usa o key visual da campanha: o key visual traz o nome
  “CENTRAL DO CORRE” em letras grandes e disputava o protagonismo com a chamada
  do slide (brandbook 5: um único protagonista por peça). Usa `Foto 3.png`, cena
  de rua, desfocada.
- **Logotipos de cliente dos cases** — de `_Assets/Logos_Clientes_WTAG/`,
  recortados na *bounding box* da tinta, em branco sobre o fundo escuro.
- **Retratos do time e fotos das sedes** — extraídos das três telas novas do
  Figma (`download_assets`). As fotos das sedes entram em preto e branco, como
  no Figma e como manda a direção fotográfica (5.6: informação em destaque →
  preto e branco).
- **Slide 02** — a arte achatada do PPTX tinha a foto só em x 0–809 e dois
  retalhos chapados (com texto por baixo) nos cantos esquerdos. O arquivo foi
  recortado em 810 × 1080 e os retalhos cobertos com a faixa vizinha espelhada.
  O mesmo tratamento foi aplicado aos cantos de `we-forro-luz.jpg` (03) e
  `we-lobby.jpg` (04).
- **Showreel** — `SHOWREEL_WTAG_16x9_V3.mov` transcodificado para MP4 H.264/AAC
  (o original tinha áudio LPCM, que o Chrome não decodifica).

## Para trocar conteúdo

- **Vídeo num case sem vídeo** — no `<div class="case__video case__video--still">`,
  troque `data-full` por `data-video="assets/video/arquivo.mp4"` e
  `data-poster="…"`, remova a classe `case__video--still` e adicione
  `<button class="play-btn" type="button"></button>`. O player passa a funcionar.
- **Imagem de case** — substitua o arquivo em `assets/img/cases/` mantendo o nome.
  A proporção dos três recortes é 317 × 170 (1,866) e do *hero* é 16:9.
- **Texto de case** — o `<p>` mostra a versão condensada (4 linhas) e o atributo
  `data-texto` guarda o texto integral que aparece em `＋ Texto completo`.

## Pontos em aberto

1. **Cases sem vídeo** — faltam só **Sicredi** e **Pulando o Bloco**. O arquivo
   `SCR-0012-25G_40HistoriasTrailer_Ajustes_1080p.mp4` apareceu em
   `_Assets/Cases/Videos/` com **0 bytes** (ainda sincronizando) e depois saiu da
   pasta — quando ele chegar de verdade, é só transcodificar e ligar como os
   outros. Magalu, Central do Corre e Odontoprev já têm player.
2. **Escada dos slides 10 e 15** — no PPTX original, “UNIR” e “NO MESMO” estão
   com a fonte esticada horizontalmente (artefato de *autofit*). Aqui foram
   reproduzidas sem distorção, como manda o brandbook; a posição e o passo da
   escada seguem o original.
3. **Telas *still*** — as três telas full-bleed de respiro entre os cases foram
   removidas: com o novo layout de case (foto de fundo full-bleed + player
   grande) elas ficaram redundantes.
4. **Vídeos das sedes (slide 25)** — o Figma indica dois arquivos
   (`Sede WT.AG SP _ FEV2025` 00:46 e `Sede WT.AG RS _ FEV2025` 00:35) que não
   estão na pasta. As duas caixas estão como foto com “Ampliar”. Para virar
   player: coloque os MP4 em `assets/video/`, troque `data-full` por
   `data-video="…"` + `data-poster="…"` no `.sede` e adicione
   `<button class="play-btn" type="button"></button>` dentro dele.
4. **KPIs de Odontoprev e Pulando o Bloco** — os cases não têm números de
   resultado nas fontes; o rodapé traz descritores (I.A, Stop motion, Push,
   Real time, TV) em vez de métricas inventadas.
