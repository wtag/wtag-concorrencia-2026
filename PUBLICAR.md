# Como este deck está publicado

Repositório: **https://github.com/wtag/wtag-concorrencia-2026** (público)
No ar em: **https://wtag.github.io/wtag-concorrencia-2026/**

Este arquivo substituiu o passo a passo da primeira publicação — que era do deck
de credenciais e citava o repositório errado do começo ao fim. O que interessa
guardar é o estado atual e as armadilhas, não o roteiro de um mutirão que já
aconteceu.

---

## Atualizar o que está no ar

O Pages serve a raiz do branch `main`. Publicar é empurrar:

```bash
cd ~/Projetos/wtag-concorrencia-2026
git add -A
git commit -m "…"
git push
```

Em um ou dois minutos o site reflete o commit. O `.nojekyll` na raiz existe para
o GitHub servir o repositório como arquivos estáticos, sem passar pelo Jekyll —
sem ele, qualquer pasta começando com `_` sumiria.

A autenticação está no **GitHub Desktop**, não no chaveiro do git de linha de
comando. Se o `git push` no terminal pedir usuário e senha, é porque ele não
enxerga a credencial do Desktop: ou se empurra pelo app, ou se gera um Personal
Access Token com escopo `repo`.

## Duas coisas que NÃO podem entrar no repositório

Ele é público. Estas duas já entraram uma vez e tiveram de ser purgadas do
histórico com `git filter-branch` — o `.gitignore` agora barra as duas, e é
melhor não testar a sorte.

1. **`Claude outputs/`** — é onde o app deixa os arquivos que chegam anexados, e
   é onde vive o briefing da concorrência. Ele nomeia o concorrente do
   anunciante, o recorte de portfólio e as decisões em aberto.
2. **`WT.AG_*.pdf`** — 16 MB de binário que muda inteiro a cada geração. O padrão
   é curinga de propósito: quando o arquivo passou de `Credenciais` para
   `Concorrencia`, a linha antiga, com o nome fixo, deixou de casar em silêncio e
   o PDF entrou no histórico por quatro commits sem ninguém notar.

O mesmo vale para os masters em alta dos vídeos e para as fotos de origem das
capas (`assets/img/capascases/`): ficam no disco, não no git.

## Ligar o Pages de novo, se alguém desligar

**Settings → Pages** · Source `Deploy from a branch` · Branch `main` · pasta
`/ (root)` · Save.
