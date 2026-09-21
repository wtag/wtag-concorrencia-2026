# RETOMAR AQUI — deck de concorrência WT.AG 2026

> **Para quem chega agora (outra sessão, outra conta).** Este arquivo é o
> bastão. Leia-o inteiro antes de tocar em qualquer coisa: ele traz o estado
> real do projeto, as regras que não se quebram, as constantes que foram
> *medidas* e não escolhidas, e — o que mais economiza tempo — as armadilhas em
> que eu já caí, para você não cair de novo.
>
> Depois deste arquivo, leia o `LEIA-ME.md`, que é a documentação do design
> system herdada do deck de origem.

---

## 1 · Regra zero: o projeto original é intocável

Existem dois projetos:

| | Caminho | Uso |
|---|---|---|
| **ORIGINAL** | `~/Projetos/wtag-credenciais-2026` | Deck de credenciais institucional. **Somente leitura.** |
| **ESTE** | `~/Projetos/wtag-concorrencia-2026` | Deck de concorrência. É onde se trabalha. |

**Nenhum comando de escrita pode ter `wtag-credenciais-2026` no caminho de
destino.** Nem `Write`, nem `Edit`, nem `sed -i`, nem `mv`, nem `rm`, nem `git`,
nem redirecionamento de shell, nem os geradores `.py` (eles escrevem no
diretório onde rodam — confira o `pwd` antes). Ler o original é permitido e
encorajado.

Ao fim de cada bloco de trabalho, confirme:

```bash
cd ~/Projetos/wtag-credenciais-2026 && git status --porcelain
```

Só pode aparecer `?? "Claude outputs/"`, que é uma pasta que o app cria e que
nunca foi commitada. Qualquer outra linha significa que a regra foi violada.

---

## 2 · O que é este deck

Uma **credencial de concorrência**: apresentação de pitch para um anunciante
específico, apresentada **em inglês**. Difere do deck de credenciais em três
pontos:

1. **Sai a abertura institucional do grupo.** Há conflito de interesse com um
   concorrente do anunciante entre os clientes do grupo. Os detalhes estão no
   briefing (ver §9) — e **não podem entrar no repositório, que é público.**
2. **Recorte de portfólio:** só quatro clientes entram com case, cada um com
   capa própria.
3. **Idioma:** abre sempre em inglês; o português fica no toggle.

---

## 3 · Estado atual

**31 telas**, `?v=220`, dicionário com 449 entradas.

| # | Tela | # | Tela |
|---|---|---|---|
| 01 | Capa · WT.AG | 17 | Ferramentas |
| 02 | Abertura WT.AG | 18 | Divisor · Cultura e Cases |
| 03 | Social First Agency | 19 | Capa · Magalu |
| 04 | O Consumidor Mudou | 20 | Magalu · Craques Gigantes |
| 05 | As Marcas Precisam Ser | 21 | Magalu · Lojinha do Fiuk |
| 06 | Unir Criatividade, Dados e Influência | 22 | Capa · Keeta |
| 07 | Metodologia Social Branding | 23 | Keeta · Central do Corre |
| 08 | Framework em 8 Etapas | 24 | Keeta · Pulando o Bloco |
| 09 | Persona e Matriz de Canais | 25 | Keeta · Brasil Corre |
| 10 | O Que Fazemos (mandala) | 26 | Capa · Bridgestone |
| 11 | Showreel WT.AG | 27 | Bridgestone · Seu Pneu de Carro Novo |
| 12 | Marcas Parceiras | 28 | Capa · Multiplan |
| 13 | Divisor · Nosso Time | 29 | BarraShoppingSul · Now New Barra! |
| 14 | Nosso Time | 30 | Golden Lake · Lake Baikal |
| 15 | Nossos Escritórios | 31 | Vamos construir juntos |
| 16 | WT.INTELLIGENCE | | |

**Telas que nasceram aqui:** `O Que Fazemos` (mandala), `WT.INTELLIGENCE`,
`Ferramentas` e as quatro capas de cliente. A `Social First Agency` foi
reescrita duas vezes e voltou à composição original, com texto de apoio novo.

**Publicado em:** https://github.com/wtag/wtag-concorrencia-2026 (público) e
https://wtag.github.io/wtag-concorrencia-2026/

---

## 4 · Como rodar

```bash
cd ~/Projetos/wtag-concorrencia-2026
python3 servidor.py 8766          # http://localhost:8766/index.html
```

**Use `servidor.py`, nunca `python3 -m http.server`.** O embutido não responde
`Range` e o Safari se recusa a tocar vídeo servido assim: o player abre, fica
preto e não escreve nada no console.

Geradores, sempre rodados de dentro desta pasta:

```bash
python3 gerar-review.py   # index_review.html — todas as telas empilhadas + auditoria
python3 gerar-mobile.py   # mobile.html
python3 gerar-pdf.py      # os dois PDFs; 'gerar-pdf.py pt' ou 'en' faz só um
```

O `gerar-review.py` é o mais útil: além de gerar, ele **audita** — conta telas,
confere se os textos dizem o número certo, valida as vírgulas do dicionário e
avisa se um case está incompleto. Rode-o depois de mexer no `index.html`.

### Cache busting — não é opcional

`css/deck.css`, `js/deck.js`, `js/i18n-dic.js` e `js/i18n.js` são chamados com
`?v=NN` **em quatro linhas do `index.html`**. Toda vez que editar um desses
arquivos, incremente o número nas quatro. Sem isso o navegador serve a versão
antiga e você vai depurar um bug que não existe.

```bash
sed -i '' 's/?v=220/?v=221/g' index.html
```

---

## 5 · O que não pode entrar no repositório

Ele é **público**. Estas já entraram uma vez e tiveram de ser purgadas do
histórico com `git filter-branch`:

- **`Claude outputs/`** — onde o app deixa os arquivos anexados, incluindo o
  briefing. Nomeia o concorrente do anunciante e o recorte de portfólio.
- **`WT.AG_*.pdf`** — 17 MB de binário que muda inteiro a cada geração. O padrão
  no `.gitignore` é curinga de propósito: quando o arquivo passou de
  `Credenciais` para `Concorrencia`, a linha antiga com o nome fixo deixou de
  casar **em silêncio** e o PDF entrou no histórico por quatro commits.
- **`assets/img/capascases/`** — fotos de origem das capas (29 MB). Mesma regra
  dos vídeos em alta: master não entra no repositório.

⚠ **A pasta `Claude outputs/` também está solta dentro do projeto ORIGINAL**,
que é público. Não rastreada, mas lá. Um `git add -A` distraído levaria o
briefing junto. Não é nosso para consertar — avise o Bernardo.

---

## 6 · Design system: o que foi medido, não escolhido

O `LEIA-ME.md` tem o sistema inteiro. O que importa saber de cor:

- Palco fixo **1920×1080**, margens de 72px, faixa útil de x=72 a x=1848.
- **Special Gothic Condensed One** no display, **Geist** no resto.
- Cor: laranja `#FF4900`, preto `#000`, creme `#F7F9EA`. **Nenhuma cor fora da
  paleta. Texto sobre laranja é sempre preto.**
- **`--cap-k = 0,145`**: o lettering é posicionado pelo topo da maiúscula, e a
  conversão para `top` é `calc(CAPpx - 0.145 * FSpx)`. A altura de maiúscula é
  `0,71 · fs` nas duas famílias.
- **Raio de canto:** 24% da menor dimensão, mínimo 14px, máximo 102px.
- **Hover entre 150 e 260 ms.** Valores maiores dão sensação de atraso — já foi
  corrigido uma vez, não regrida.

### Como medir lettering (faça isso, não estime)

Com o deck aberto no navegador, meça na métrica da fonte:

```js
await document.fonts.ready;
const c = document.createElement('canvas').getContext('2d');
c.font = '400 100px "Special Gothic Condensed One"';
const m = c.measureText('SUA FRASE');
// avanço por px de corpo:   m.width / 100
// tinta:  (m.actualBoundingBoxRight + m.actualBoundingBoxLeft) / 100
// bearing esquerdo:        -m.actualBoundingBoxLeft / 100
```

**Avanço ou tinta?** Depende do que se quer alinhar. Se a linha é **centrada**,
o que precisa ficar simétrico é a **tinta** — foi o que resolveu a tela 3. Se é
**alinhada à esquerda**, o `--x` sai de `alvo − bearing · fs`, porque o `left`
do CSS é a origem do glifo e o que se vê é a tinta. É por isso que duas linhas
com o mesmo corpo e a mesma margem têm `--x` diferentes.

### Acentos mandam na entrelinha

O til e o acento agudo sobem **0,217 · fs** acima da altura de maiúscula (0,927
contra 0,710 medidos na fonte). Numa escada, o passo entre maiúsculas precisa
ser maior que `altura_de_maiúscula + 0,217 · fs` menos a folga desejada, senão o
acento da linha de baixo entra na linha de cima. Isso já quebrou duas telas.

---

## 7 · Armadilhas que já custaram tempo

Leia esta seção duas vezes. Cada item aqui é uma hora que você não vai perder.

1. **A classe `.display` sozinha NÃO troca a fonte.** Só `.escada.display .ln`
   faz isso. Um bloco com `class="display"` sai em Geist, silenciosamente. Se
   quiser display fora de uma escada, declare `font-family:var(--font-display)`
   na mão — ou, melhor, use uma escada de verdade: ela traz junto o traçado e a
   roleta.

2. **O traçado de 2,67px é para display GRANDE.** Em 423px ele é 0,6% do corpo;
   em 40px vira 6,7% e fecha o miolo das letras. Em corpo pequeno use
   proporcional (`0.03em`).

3. **O `[data-foco]` escreve `transform` nos itens.** Se a posição do elemento
   depender de `transform`, o hover o arranca do lugar. Saídas: centrar por
   `margin-left` negativo, ou pôr o transform **inline** (inline vence folha de
   estilo), ou animar `font-size` como fazem os KPIs de rodapé de case.

4. **O i18n casa a chave pelo `innerHTML`, caractere a caractere.** Inclui
   `&nbsp;`, `&amp;` e acentuação. Um `&` escrito puro no HTML volta como
   `&amp;` no `innerHTML` — a chave do dicionário precisa ter `&amp;`.

5. **Lettering traduzido precisa de `data-en-x`, `data-en-fs` e `data-en-cap`.**
   A palavra em inglês tem outra largura; o mesmo `--x` deixa de alinhar e o
   mesmo `--fs` deixa de encostar na margem. O `aplicarVars()` do `i18n.js`
   aplica esses três em **qualquer** elemento, não só em `.ln`.

6. **Texto com roleta precisa entrar em `data-rl-texto`.** A roleta cacheia o
   texto na primeira preparação do slide e reescreve o elemento a partir do
   cache. O `i18n.js` já trata isso via a lista `ATTRS` — mas se você trocar
   texto na mão, lembre.

7. **Regex com `[^>]*>` quebra em atributos que contêm `>`.** Um `data-en-txt`
   com `<br>` dentro tem `>` no meio do valor, e a regex fecha a tag no lugar
   errado. Há um helper `interior(html, classe)` no `gerar-mobile.py` que varre
   respeitando aspas — use-o.

8. **O painel do navegador do app mostra frames velhos.** Várias vezes a tela
   apareceu preta ou sem conteúdo enquanto o DOM estava correto. **Confie na
   medição, não no screenshot.** Para forçar repaint: redimensione o viewport
   (1280→1440) ou passe o mouse. E as animações rodam devagar quando o painel
   está oculto, porque o `requestAnimationFrame` é estrangulado — espere mais.

9. **Equalize logotipos por ÁREA DE TINTA**, não por altura, largura ou "massa
   óptica". A conta é `fração_de_tinta × largura × altura`, igualada num alvo.
   Massa óptica erra feio em proporções extremas — foi ela que deixou o
   logotipo da Bridgestone desproporcional, e a área de tinta é que resolveu.

10. **Rótulos em volta de um círculo não cabem num anel só.** Conte antes: o
    perímetro em `2πr` contra a soma das larguras. Se não couber, use faixas
    radiais **bem separadas**, e lembre que com um número ímpar de itens a
    alternância entre duas faixas não fecha o ciclo — precisa de uma terceira
    só para a emenda.

11. **Verifique colisão por medição, não por olho.** Vale a pena escrever o laço:

    ```js
    const r = e => e.getBoundingClientRect();
    const bate = (a,b) => { const A=r(a), B=r(b);
      return A.left<B.right && B.left<A.right && A.top<B.bottom && B.top<A.bottom; };
    ```

    Rode **nos dois idiomas** — o inglês tem outra largura e outra quebra.
    Cuidado com contêineres de tela inteira: eles "colidem" com tudo e geram
    falso positivo.

12. **zsh:** `$var:algo` dispara modificador de expansão. Use `${var}`.

---

## 8 · Idioma

O deck **abre sempre em inglês**, toda vez, ignorando o que estiver gravado no
`localStorage`. Isso é deliberado: lembrar a última escolha é armadilha num
pitch — basta alguém clicar em PT numa conferência para a máquina passar a
abrir em português para sempre, sem aviso. O toggle continua valendo durante a
sessão; ele só não sobrevive ao recarregamento. Mesma regra no `mobile.js`.

O HTML continua escrito em **português**, e o `data-pt` guarda o original na
primeira troca. Voltar ao português relê dali, e não reconstrói do dicionário
no sentido inverso — é isso que impede uma tradução ambígua de corromper o
texto original.

**Todo texto novo precisa do par completo:** a string em português no
`index.html` **e** a entrada em `js/i18n-dic.js`.

Não se traduz: nome de pessoa, nome de marca, nome de produto (TGI, SemRush,
WDI Consulting, Adhoc), cargo que já está em inglês, métrica em inglês.

---

## 9 · Onde está o briefing

`Claude outputs/PROMPT-wtag-concorrencia-2026.md`, **no disco, fora do git**.
Ele traz os cinco direcionais do Lucas, o conflito de interesse com nome e
sobrenome, e a lista de pontos que ficaram em aberto. Leia-o — mas não o
commite, e não repita o conteúdo sensível em arquivo versionado.

---

## 10 · Pendências

### Decisões do Bernardo

- **Links de vídeo no PDF.** São 22 vídeos; só 5 têm arquivo no Drive. Os
  outros 17 apontam hoje para a **tela do deck publicado**
  (`wtag.github.io/...#slide-NN`), onde o vídeo toca dentro do case. As
  alternativas são subir os 17 ao Drive (publica os arquivos fora do controle
  dele — **não faça sem OK explícito**) ou mandar todos para o deck, deixando o
  comportamento uniforme.
- **`WDI` na tela 16** ainda quer dizer "We Data Intelligence". Ficou assim
  porque o pedido foi manter o resto do conteúdo, mas é o primeiro candidato a
  virar `WTI`.
- **Vetores de Magalu, Keeta e Multiplan.** Bridgestone e Firestone já vieram
  em SVG. Os outros três seguem em PNG pequeno; com o vetor, dobrar a escala
  das capas é mudar uma constante (`T`, a área de tinta alvo).
- **A frase de apoio da mandala** e as descrições dos serviços foram escritas
  por mim a partir das fontes. Não têm número inventado, mas merecem revisão.

### Trabalho técnico

- **1 commit à frente do remoto** (em `12c6107`; origin em `a97e560`). O push é
  feito pelo **GitHub Desktop** — o git de linha de comando não tem credencial
  no chaveiro desta máquina.
- **Não invente dado.** Se não há KPI fechado, o rodapé do case traz descritores
  (I.A, Stop motion, Push, Real time, TV), como já acontece. Número inventado em
  concorrência é risco jurídico.

---

## 11 · Como trabalhar aqui

1. `pwd` antes de cada bloco de edição. Confirme que está em
   `wtag-concorrencia-2026`.
2. Edite o `index.html` / `css/deck.css` / `js/*`.
3. Incremente o `?v=NN` nas quatro linhas.
4. `python3 gerar-review.py` e leia os avisos.
5. Abra no navegador e **olhe** a tela, em PT e em EN. Erro de lettering não
   aparece no código, aparece na tela.
6. Para telas com geometria, escreva o laço de colisão e rode nos dois idiomas.
7. `python3 gerar-mobile.py` e `python3 gerar-pdf.py`.
8. Commit pequeno, mensagem em português, descrevendo o **efeito** e não o
   arquivo — e explicando *por quê*, principalmente quando o número veio de
   medição.
9. Confira que o original continua intocado.
