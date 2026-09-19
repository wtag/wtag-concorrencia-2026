# Como publicar isto no GitHub

Guia do zero. Não precisa saber git.

**Ponto de partida:** o projeto já está pronto e "commitado" em
`~/Projetos/wtag-credenciais-2026`. Falta só mandar para o GitHub e ligar a
publicação. São 163 MB, então o envio leva alguns minutos.

---

## Parte 1 — Ter uma conta no GitHub

Se você já tem, pule.

1. Abra <https://github.com/signup>
2. Preencha email, senha e nome de usuário.
   O nome de usuário vai aparecer no endereço final do site, então escolha algo
   apresentável — `wtag`, `bernardowtag`, e não `bernardo123xyz`.
3. Confirme o email que eles enviam.

Anote seu nome de usuário. Vou chamá-lo de **SEU-USUARIO** daqui pra frente.

---

## Parte 2 — Enviar o projeto

Escolha **um** dos dois caminhos. O A é mais fácil e não usa terminal.

### Caminho A — GitHub Desktop (recomendado)

1. Baixe em <https://desktop.github.com> e instale como qualquer app do Mac.
2. Abra o **GitHub Desktop**. Ele pede para entrar na conta — clique em
   **Sign in to GitHub.com**. Abre o navegador, você autoriza, e volta pro app.
   *Isso resolve a senha de uma vez. Não vai pedir de novo.*
3. No menu de cima: **File → Add Local Repository…**
4. Clique em **Choose…** e navegue até:
   `Macintosh HD → Users → locacao2 → Projetos → wtag-credenciais-2026`
   Selecione a pasta e confirme.
   *Ele deve reconhecer como repositório. Se disser que não é um repositório,
   você escolheu a pasta errada — tem que ser exatamente `wtag-credenciais-2026`.*
5. Vai aparecer um botão azul **Publish repository** no topo. Clique.
6. Na janela que abre:
   - **Name:** `wtag-credenciais-2026`
   - **Description:** Credenciais WT.AG 2026
   - **⚠️ DESMARQUE** a caixinha *Keep this code private*
     (o combinado é repositório público; se ficar marcada, o Pages não funciona
     no plano grátis)
   - Clique em **Publish repository**
7. Espere a barra de progresso terminar. São 163 MB — de 2 a 10 minutos,
   depende da sua internet. Não feche o app.

Pronto, o código está no GitHub. Vá para a **Parte 3**.

### Caminho B — Terminal

1. Abra <https://github.com/new>
2. Preencha:
   - **Repository name:** `wtag-credenciais-2026`
   - Marque **Public**
   - **NÃO** marque nada em *Initialize this repository with* (sem README, sem
     .gitignore, sem license). Se marcar, dá conflito no envio.
   - **Create repository**
3. Você vai precisar de um **token** — o GitHub não aceita mais a senha da conta
   pelo terminal:
   - Abra <https://github.com/settings/tokens>
   - **Generate new token → Generate new token (classic)**
   - **Note:** `mac do bernardo`
   - **Expiration:** 90 days (ou No expiration)
   - Marque a caixa **`repo`** (a primeira, que marca as de dentro junto)
   - **Generate token**
   - **Copie o token agora.** Some da tela e não volta.
4. No Terminal, cole estas duas linhas, trocando `SEU-USUARIO`:

```bash
cd ~/Projetos/wtag-credenciais-2026
git remote add origin https://github.com/SEU-USUARIO/wtag-credenciais-2026.git
git push -u origin main
```

5. Vai pedir:
   - **Username:** seu nome de usuário do GitHub
   - **Password:** **cole o token**, não a senha da conta.
     *Não aparece nada na tela enquanto você cola. É normal. Cole e dê Enter.*
6. Espere. São 163 MB.

---

## Parte 3 — Ligar a publicação (GitHub Pages)

1. Abra `https://github.com/SEU-USUARIO/wtag-credenciais-2026`
2. Clique em **Settings** (a engrenagem, na barra de cima do repositório —
   não confunda com as configurações da sua conta)
3. No menu da esquerda, clique em **Pages**
4. Em **Build and deployment**:
   - **Source:** `Deploy from a branch`
   - **Branch:** escolha `main` e, ao lado, a pasta `/ (root)`
   - **Save**
5. Espere de 1 a 3 minutos e recarregue a página. No topo vai aparecer uma
   faixa verde com o endereço:

   `https://SEU-USUARIO.github.io/wtag-credenciais-2026/`

6. Abra esse endereço. Deve carregar o deck.

*Se der 404 na primeira tentativa, espere mais 2 minutos e recarregue. A
primeira publicação é a mais lenta.*

---

## Parte 4 — Conferir se está tudo certo

No site publicado, teste estes cinco pontos:

1. **Passa os slides** com as setas do teclado
2. **Abre um videocase** — clique na imagem grande de um case. Deve tocar.
3. **Abre um dos três vídeos do Sicredi** (a linha de baixo daquele case).
   Esses vêm do YouTube.
4. **Passa o mouse num logo de cliente** no slide de marcas parceiras — deve
   desfocar o fundo e subir um card de prévia.
5. **Aperta `S`** — abre o sumário.

Se um vídeo não tocar, aguarde: na primeira vez o navegador está baixando o
arquivo.

---

## Depois: como atualizar o site

Toda alteração segue o mesmo ciclo.

**No GitHub Desktop:** ele mostra o que mudou. Escreva uma frase curta no campo
*Summary*, clique em **Commit to main** e depois em **Push origin**. O site
atualiza sozinho em 1 a 2 minutos.

**No terminal:**

```bash
cd ~/Projetos/wtag-credenciais-2026
git add -A
git commit -m "o que mudou"
git push
```

### A regra que mais dá dor de cabeça

Se você mexer em `css/deck.css` ou `js/deck.js`, **suba o número da versão** no
`index.html` antes de publicar. Sem isso o navegador serve a versão antiga do
cache e parece que a alteração não pegou.

```bash
cd ~/Projetos/wtag-credenciais-2026
sed -i '' 's/?v=108/?v=109/g' index.html
python3 gerar-review.py
```

---

## Duas coisas para não esquecer

**O deck existe em dois lugares agora.** A cópia de trabalho é
`~/Projetos/wtag-credenciais-2026`. A pasta `WT.AG_Credenciais_2026_HTML` no
Google Drive é a antiga. **Edite só a do Projetos.** Quando tiver confiança de
que o site está redondo, apague a do Drive — se editar as duas, elas divergem e
você não percebe.

O Drive continua guardando o que não vai para o GitHub: `_Assets` (inclusive os
vídeos em alta resolução), `_Conteudo`, `_ArquivosDeBase` e os documentos.

**O repositório é público.** Qualquer pessoa com o endereço vê o site e o
código: arte das campanhas, fotos do time, números. Foi a escolha combinada, mas
vale lembrar antes de divulgar o link.
