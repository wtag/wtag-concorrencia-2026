#!/usr/bin/env python3
"""
Gera o index_review.html a partir do index.html.

Por que um gerador em vez de um arquivo mantido à mão: o index.html continua
sendo editado a cada rodada de ajustes. Se o review fosse uma cópia manual, as
duas versões iam divergir silenciosamente e a revisão passaria a ser feita em
cima de um deck velho. Assim existe uma única fonte de verdade.

Uso, dentro da pasta WT.AG_Credenciais_2026_HTML:

    python3 gerar-review.py                 # só os 26 slides do deck
    python3 gerar-review.py --variantes     # anexa também o variantes.html

Rode sempre depois de mexer no index.html.

Sobre as variantes: na revisão de 12/08 (marcação 21) foi decidido tirar todas
as variantes da review — a de layout do slide 11 foi escolhida e virou oficial,
e as demais já cumpriram o papel. O variantes.html fica no disco como registro
das opções apresentadas, mas só entra no review se pedido com --variantes.
"""

import io
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
ORIGEM = os.path.join(AQUI, 'index.html')
DESTINO = os.path.join(AQUI, 'index_review.html')
VARIANTES = os.path.join(AQUI, 'variantes.html')   # opcional

AVISO = """<!-- ============================================================================
     ARQUIVO GERADO — NÃO EDITE À MÃO
     Sai de: index.html  ·  via: python3 gerar-review.py
     Qualquer alteração aqui se perde na próxima geração. Edite o index.html
     e rode o gerador de novo.
     ========================================================================= -->
"""


def conferir_cases(html):
    """Compara os cases entre si e avisa se algum perdeu um bloco.

    Existe por causa de um erro real: uma edição por regex com padrão frouxo
    (`.*?</div>\\s*</div>`) engoliu o .case__stack inteiro do Sicredi junto com o
    bloco que eu queria trocar, apagando as três miniaturas de vídeo. A contagem
    de div passou incólume — a remoção foi balanceada —, então nada acusou. Os
    cases têm a mesma anatomia, e é isso que dá para conferir: se um tem
    3 miniaturas e outro tem 0, alguma coisa se perdeu no caminho.

    A pilha tem 3 cartões, MENOS no arranjo vertical (.case--vert), que é uma
    grade 2×2 e tem 4. Isso é parametrizado em vez de silenciado: a conferência
    só serve enquanto souber quantos esperar em cada arranjo.
    """
    cases = [b for b in re.findall(r'<section [^>]*class="slide case[^"]*".*?</section>',
                                   html, re.S) if 'data-oculto' not in b[:400]]
    if not cases:
        return
    linhas, alertas = [], []
    for b in cases:
        t = (re.search(r'data-titulo="([^"]*)"', b) or [0, '?'])[1]
        n_mini = len(re.findall(r'class="case__img[^"]*"', b))
        esperado = 4 if 'case--vert' in b[:400] else 3
        falta = [k for k in ('case__media', 'case__video', 'case__stack',
                             'case__col', 'case__kpis') if k not in b]
        linhas.append((t, n_mini, falta, 'case__rodape' in b))
        if falta:
            alertas.append('%s: sem %s' % (t, ', '.join(falta)))
        if n_mini != esperado:
            alertas.append('%s: %d miniatura(s), esperado %d'
                           % (t, n_mini, esperado))
    if alertas:
        print('\n  !! ESTRUTURA DOS CASES')
        for a in alertas:
            print('     %s' % a)
    else:
        print('  cases: %d, todos com mídia, vídeo, pilha completa, texto e '
              'números' % len(cases))
    sem_rodape = [t for t, _, _, r in linhas if not r]
    if sem_rodape:
        print('  sem barra de repercussão (esperado onde não houve): %s'
              % ', '.join(sem_rodape))


def conferir_contagem(html):
    """Confere se os números escritos à mão batem com os slides que existem.

    Existe porque já derivaram: o subtítulo do sumário dizia "26 telas" quando
    havia 25 visíveis — o número tinha sido escrito contando as <section>, e
    quando um slide ganhou data-oculto ninguém voltou para corrigir. Some a isso
    o "1…N" das instruções de navegação, que promete um atalho de teclado para
    cada tela. Os dois passam a ser conferidos contra a contagem real.
    """
    visiveis = len([t for t in re.findall(r'<section [^>]*class="slide[^>]*>', html)
                    if 'data-oculto' not in t])
    alertas = []
    m = re.search(r'atos, (\d+) telas', html)
    if m and int(m.group(1)) != visiveis:
        alertas.append('subtítulo do sumário diz %s telas, existem %d'
                       % (m.group(1), visiveis))
    m = re.search(r'<kbd>1</kbd>&#8230;<kbd>(\d+)</kbd>', html)
    if m and int(m.group(1)) != visiveis:
        alertas.append('instruções prometem atalho até %s, existem %d telas'
                       % (m.group(1), visiveis))
    if alertas:
        print('\n  !! CONTAGEM DE SLIDES')
        for a in alertas:
            print('     %s' % a)
    else:
        print('  contagem: %d telas visíveis, e é isso que os textos dizem' % visiveis)


def conferir_dicionario():
    """Confere a sintaxe do i18n-dic.js sem interpretador de JS.

    Existe por um erro que eu cometi e que não deu nenhum sinal: ao inserir um
    bloco de entradas eu tirei a vírgula da última linha, e havia entrada depois
    dela. O arquivo virou SyntaxError, `window.DIC_EN` ficou undefined e o deck
    parou de traduzir POR COMPLETO — sem erro na tela, só tudo em português com
    o botão marcando EN.

    A conferência agrupa por ENTRADA, não por linha: uma entrada começa numa
    linha que abre com aspa simples e vai até a próxima que abre igual. Assim
    valor na linha de baixo e vírgula sozinha numa linha passam, que é JS
    válido — a primeira versão desta função reprovava os dois.
    """
    caminho = os.path.join(AQUI, 'js', 'i18n-dic.js')
    if not os.path.exists(caminho):
        return
    txt = io.open(caminho, encoding='utf-8').read()
    corpo = txt[txt.index('{') + 1: txt.rindex('}')]
    corpo = re.sub(r'/\*.*?\*/', '', corpo, flags=re.S)      # comentários de bloco
    corpo = re.sub(r'^\s*//[^\n]*$', '', corpo, flags=re.M)   # comentários de linha

    entradas, atual = [], None
    for li in corpo.split('\n'):
        # coluna 0 é o que separa CHAVE de valor de continuação: as chaves ficam
        # rentes à margem e os valores quebrados vêm indentados
        if li.startswith("'") and (atual is None or atual.strip()):
            if atual is not None:
                entradas.append(atual)
            atual = li
        elif atual is not None:
            atual += '\n' + li
    if atual is not None:
        entradas.append(atual)

    alertas = []
    for k, e in enumerate(entradas):
        t = e.strip()
        if not t:
            continue
        ultima = (k == len(entradas) - 1)
        if not ultima and not t.endswith(','):
            alertas.append('entrada sem vírgula antes da próxima: %s' % t[:60])
    if alertas:
        print('\n  !! SINTAXE DO DICIONÁRIO')
        for a in alertas:
            print('     %s' % a)
    else:
        print('  dicionário: %d entradas, vírgulas conferidas' % len(entradas))


def main():
    if not os.path.exists(ORIGEM):
        sys.exit('não achei o index.html em %s' % AQUI)

    html = io.open(ORIGEM, encoding='utf-8').read()

    # a versão dos assets acompanha a do deck, senão o navegador serve cache velho
    m = re.search(r'deck\.css\?v=(\d+)', html)
    versao = m.group(1) if m else '1'

    # 1 · título, para não confundir as duas abas abertas lado a lado
    html = html.replace(
        '<title>WT.AG — Credenciais 2026</title>',
        '<title>WT.AG — Credenciais 2026 · REVISÃO</title>', 1)

    # 2 · CSS da camada de revisão, depois do deck.css
    alvo_css = '<link rel="stylesheet" href="css/deck.css?v=%s">' % versao
    if alvo_css not in html:
        sys.exit('não achei a tag do deck.css no index.html — o gerador precisa de ajuste')
    html = html.replace(
        alvo_css,
        alvo_css + '\n<link rel="stylesheet" href="css/review.css?v=%s">' % versao, 1)

    # 3 · JS da camada de revisão, DEPOIS do deck.js (ele depende de window.DECK)
    alvo_js = '<script src="js/deck.js?v=%s"></script>' % versao
    if alvo_js not in html:
        sys.exit('não achei a tag do deck.js no index.html — o gerador precisa de ajuste')
    html = html.replace(
        alvo_js,
        alvo_js + '\n<script src="js/review.js?v=%s"></script>' % versao, 1)

    # 4 · variantes para aprovação — só com --variantes.
    #     Entram no fim do palco, depois do último slide. Ficam só aqui: o
    #     index.html de apresentação nunca recebe variante nenhuma.
    n_var = 0
    if '--variantes' in sys.argv and os.path.exists(VARIANTES):
        frag = io.open(VARIANTES, encoding='utf-8').read()
        n_var = len(re.findall(r'<section [^>]*class="slide', frag))
        if n_var:
            marca = '</div><!-- /#stage -->'
            if marca not in html:
                sys.exit('não achei o fecho do #stage no index.html')
            html = html.replace(marca, frag.rstrip() + '\n\n' + marca, 1)

    # 5 · aviso de arquivo gerado
    html = html.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n' + AVISO, 1)

    conferir_cases(html)
    conferir_contagem(html)
    conferir_dicionario()

    io.open(DESTINO, 'w', encoding='utf-8').write(html)

    n = len(re.findall(r'<section [^>]*class="slide', html))
    extra = ' (%d do deck + %d variantes)' % (n - n_var, n_var) if n_var else ''
    print('index_review.html gerado · %d slides%s · assets em v=%s' % (n, extra, versao))


if __name__ == '__main__':
    main()
