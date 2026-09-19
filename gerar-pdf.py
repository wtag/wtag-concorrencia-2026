#!/usr/bin/env python3
"""
Gera o deck em PDF a partir do index.html.

    python3 gerar-pdf.py            # index_pdf.html + o PDF
    python3 gerar-pdf.py --so-html  # só o index_pdf.html (para conferir no navegador)

Por que um gerador, como o gerar-review.py: o index.html é a única fonte de
verdade. Uma cópia mantida à mão divergiria na primeira rodada de ajustes, e o
PDF passaria a mostrar um deck velho.

O QUE ESTE ARQUIVO FAZ, e por quê

1. Tira os cases sem texto fechado (EXCLUIR). Um case com "(a definir)" no
   lugar do contexto e "(nº)" no lugar dos números funciona numa tela que a
   pessoa passa em três segundos com alguém narrando; num PDF, que se lê
   sozinho e sem pressa, ele vira uma página incompleta.

2. Empilha os slides como páginas. No deck existe um slide na tela por vez,
   dentro de um palco escalado; aqui cada section é uma página de 1920×1080 em
   fluxo normal (ver css/pdf.css).

3. Congela cada slide no quadro FINAL. O deck revela o conteúdo com
   .is-played e anima contadores e roletas por JS. Aqui não há JS: a classe
   entra na marcação e os contadores já saem escritos no valor final.

4. Troca vídeo por pôster + link. Um <video> não toca em papel. O que era
   clique-para-tocar vira uma âncora transparente do tamanho do cartão,
   apontando para o arquivo no Drive (ou para o YouTube, nos três depoimentos
   do Sicredi, que já são públicos lá). O Chrome transforma <a href> em
   anotação de link no PDF: é assim que os links do enunciado existem.

5. Reescreve a caixa da capa. No deck ela ensina a navegar com teclado e
   toque — instrução para um aparelho que o leitor do PDF não está usando.

O PDF sai pelo Chrome em modo headless: é o mesmo motor que renderiza o deck,
então o que sai no papel é o que a tela mostra. Qualquer outro caminho
(wkhtmltopdf, weasyprint) reimplementaria clip-path, backdrop-filter e
object-fit por conta própria — e o deck vive desses três.
"""

import datetime
import io
import os
import re
import shutil
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
ORIGEM = os.path.join(AQUI, 'index.html')
DESTINO = os.path.join(AQUI, 'index_pdf.html')
PDF = os.path.join(AQUI, 'WT.AG_Credenciais_2026.pdf')

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# Cases fora desta versão: os três últimos, ainda com texto e números por vir.
EXCLUIR = ('s-barrashoppingsul', 's-golden-lake', 's-keeta-brasil-corre')

# A capa WT.AG também fica fora. Ela existe no deck para receber quem abre a
# apresentação e não sabe como andar nela; num PDF, que se folheia, a tela de
# instruções é uma página de rodeio antes do assunto. O documento abre direto
# na capa do Grupo WE. (A caixa_da_capa() abaixo continua no arquivo: se a capa
# voltar para o PDF, ela volta reescrita para leitor de PDF, não para o deck.)
SEM_CAPA = True

DECK_ONLINE = 'https://wtag.github.io/wtag-credenciais-2026/'

# ---------------------------------------------------------------- os vídeos
# Os arquivos de alta já vivem no Drive, em _Assets/Videos-Alta — o deck usa
# cópias comprimidas, mas o link manda para o master, que é o que alguém quer
# ver em tela cheia. IDs colhidos pela integração do Drive.
#
# ATENÇÃO à permissão: estes arquivos estão compartilhados com o domínio wt.ag.
# Para o PDF sair da agência, a pasta precisa ir para "qualquer pessoa com o
# link · leitor" no Drive — a API de integração não muda esse ajuste.
DRIVE = {
    'assets/video/showreel-wtag.mp4':        '13BFRBAkxWK763XY_elaQRid8rRjUl0lG',
    'assets/video/case-magalu.mp4':          '1n_ADx4O-c8S-l3Kq0303apFROvZAsff5',
    'assets/video/case-central-do-corre.mp4': '17up2G6KZ-B1WyDEOKLHFF7aacSAJrmso',
    'assets/video/case-sicredi.mp4':         '1vMjDQDwM0dmJAGQLNKcTMnATFoWUVFkj',
    'assets/video/case-odontoprev.mp4':      '1h7UfIERRpU0filz6L-Uto68-zbo-acho',
    'assets/video/case-pulando-o-bloco.mp4': '1ERyWn-C2ZLsLaZ04Ds_XzDbk6W3X2iO7',
    'assets/video/sede-sao-paulo.mp4':       '1Opess1tmBxRQ1bTsxXiOoMlz7b9ST34J',
    'assets/video/sede-novo-hamburgo.mp4':   '1EWbC15x4IqwG-Id-CRfKjZyXy7GcgTTC',
}

MESES = ('janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
         'agosto', 'setembro', 'outubro', 'novembro', 'dezembro')

AVISO = """<!-- ============================================================================
     ARQUIVO GERADO — NÃO EDITE À MÃO
     Sai de: index.html  ·  via: python3 gerar-pdf.py
     Qualquer alteração aqui se perde na próxima geração. Edite o index.html
     e rode o gerador de novo.
     ========================================================================= -->
"""


def link_drive(fid):
    return 'https://drive.google.com/file/d/%s/view' % fid


# ------------------------------------------------------------------ contadores
def formatar(valor, dec, sep):
    """Mesma formatação do animarContagem() em pt-BR: milhar com ponto,
    decimal com vírgula, e milhar só para quem pediu data-count-sep."""
    s = ('%.*f' % (dec, valor)) if dec > 0 else str(int(round(valor)))
    if dec > 0:
        s = s.replace('.', ',')
    if sep:
        p = s.split(',')
        p[0] = re.sub(r'\B(?=(\d{3})+(?!\d))', '.', p[0])
        s = ','.join(p)
    return s


def fechar_contadores(bloco):
    """Escreve o valor final onde o deck escreveria com requestAnimationFrame.

    Casa QUALQUER tag, não só <b>: os quatro números do slide do Grupo WE são
    <span class="we-num">, e uma primeira versão que só olhava <b> deixou a
    página inteira em "+0,0 BI / +0 / 0 empresas / +0 clientes"."""
    def troca(m):
        abrir = m.group(1)
        at = dict(re.findall(r'data-count-(\w+)="([^"]*)"', abrir))
        alvo = at.get('to')
        if alvo is None:
            return m.group(0)
        try:
            v = float(alvo)
        except ValueError:
            return m.group(0)
        dec = int(at.get('dec', '0') or 0)
        texto = (at.get('pre', '') + formatar(v, dec, at.get('sep') == '1')
                 + at.get('pos', ''))
        return abrir + texto + '</%s>' % m.group(2)
    return re.sub(r'(<([a-z]+)\b[^>]*data-count-to="[^"]*"[^>]*>)([^<]*)</\2>', troca, bloco)


# --------------------------------------------------------------------- imagens
def montar_imagens(bloco):
    """data-lazy é o caminho que o deck.js atribui ao entrar no slide. Sem JS,
    o src tem de estar escrito. Fica com a versão de alta (data-lazy), não com
    a -m: aqui não há memória de celular para poupar, e o papel quer resolução."""
    def troca(m):
        tag, caminho = m.group(1), m.group(2)
        if re.search(r'\ssrc="', tag):
            return m.group(0)
        return '%ssrc="%s" data-lazy="%s"' % (tag, caminho, caminho)
    return re.sub(r'(<img\b(?:[^>]*?))data-lazy="([^"]+)"', troca, bloco)


# ---------------------------------------------------------------------- vídeos
def ligar_videos(bloco, faltando):
    """Insere a âncora transparente logo depois da tag de abertura de quem tem
    data-video ou data-youtube. Depois da tag, e não no fim do elemento, porque
    achar o </div> certo por regex é como se perde um .case__stack inteiro —
    já aconteceu neste projeto. A âncora é position:absolute;inset:0, então a
    ordem entre os irmãos não muda nada."""
    def por_arquivo(m):
        tag, caminho = m.group(1), m.group(2)
        fid = DRIVE.get(caminho)
        if not fid:
            faltando.append(caminho)
            return tag
        return tag + ancora(link_drive(fid))

    def por_youtube(m):
        tag, vid = m.group(1), m.group(2)
        return tag + ancora('https://www.youtube.com/watch?v=' + vid)

    bloco = re.sub(r'(<\w+\b[^>]*data-video="([^"]+)"[^>]*>)', por_arquivo, bloco)
    bloco = re.sub(r'(<\w+\b[^>]*data-youtube="([^"]+)"[^>]*>)', por_youtube, bloco)
    return bloco


def ancora(href):
    return ('<a class="pdf-lk" href="%s" target="_blank" rel="noopener" '
            'aria-label="Assistir ao vídeo"></a>' % href)


def showreel(bloco):
    """O slide 14 é um <video> de tela cheia com pôster. Vídeo não imprime:
    entra o pôster como imagem, com a mesma classe (a regra de CSS é inset:0 +
    object-fit:cover, que serve igual para img), e a página toda vira link."""
    m = re.search(r'<video class="s14__video"[^>]*poster="([^"]+)"[^>]*>\s*</video>', bloco)
    if not m:
        m = re.search(r'<video class="s14__video"[\s\S]*?</video>', bloco)
        if m:
            print('  ! s14: <video> encontrado sem poster= — pôster não trocado')
        return bloco
    fid = DRIVE.get('assets/video/showreel-wtag.mp4')
    novo = '<img class="s14__video" src="%s" alt="Showreel WT.AG">' % m.group(1)
    if fid:
        novo += ancora(link_drive(fid))
    bloco = bloco[:m.start()] + novo + bloco[m.end():]
    return bloco.replace(
        'clique para reproduzir &nbsp;·&nbsp; F para tela cheia',
        'clique para assistir &#8599;')


# ----------------------------------------------------------------------- capa
def caixa_da_capa(bloco):
    hoje = datetime.date.today()
    novo = """<div class="capa__nav" data-enter="up" data-delay="620">
    <h2 class="nav__t">Sobre este documento</h2>
    <div class="nav__bloco">
      <div class="nav__lab">Os vídeos</div>
      <div class="nav__linha"><span class="nav__k"><kbd>&#8599;</kbd></span><span class="nav__d">Onde aparece a seta, o vídeo abre no navegador</span></div>
      <div class="nav__linha"><span class="nav__k"><kbd>clique</kbd></span><span class="nav__d">Na imagem do vídeo, em qualquer página de case</span></div>
      <div class="nav__linha"><span class="nav__k"><kbd>logos</kbd></span><span class="nav__d">Na faixa de repercussão, abrem as matérias</span></div>
    </div>
    <div class="nav__bloco">
      <div class="nav__lab">Versão navegável</div>
      <div class="nav__linha"><span class="nav__k"><kbd>online</kbd></span><span class="nav__d"><a href="%s" target="_blank" rel="noopener">wtag.github.io/wtag-credenciais-2026</a></span></div>
      <div class="nav__linha nav__linha--nota"><span class="nav__k"></span><span class="nav__d">A mesma apresentação, com os vídeos tocando na própria tela</span></div>
    </div>
    <p class="nav__pe">Versão em PDF &#183; %s de %d</p>
  </div>""" % (DECK_ONLINE, MESES[hoje.month - 1], hoje.year)
    ini = bloco.find('<div class="capa__nav"')
    if ini < 0:
        print('  ! capa: .capa__nav não encontrada — caixa mantida como está')
        return bloco
    fim = bloco.find('</section>', ini)
    return bloco[:ini] + novo + '\n' + bloco[fim:]


# ------------------------------------------------------------------- a página
def cor_de(atributos):
    CORES = {'escuro': '#000000', 'claro': '#F7F9EA', 'laranja': '#FF4900'}
    m = re.search(r'data-fundo="([^"]+)"', atributos)
    if m:
        return m.group(1)
    t = re.search(r'data-tom="([^"]+)"', atributos)
    return CORES.get(t.group(1) if t else 'escuro', '#000000')


def virar_pagina(bloco):
    """A section do deck vira página: ganha as classes de estado (o quadro
    final), a cor de fundo que no deck vem da camada #fundo, e perde nada."""
    abrir = re.match(r'<section\b[^>]*>', bloco).group(0)
    novo = abrir

    classes = 'pdf-pg is-active is-played'
    if 'data-wordmark-uma-vez' in abrir or 'data-wordmark-loop' in abrir:
        # a roleta assenta no logotipo oficial; é esse o quadro final
        classes += ' mostra-logo'
    novo = re.sub(r'class="([^"]*)"', lambda m: 'class="%s %s"' % (m.group(1), classes),
                  novo, count=1)

    cor = 'background:%s' % cor_de(abrir)
    if re.search(r'\sstyle="', novo):
        novo = re.sub(r'style="([^"]*)"', lambda m: 'style="%s;%s"' % (m.group(1), cor),
                      novo, count=1)
    else:
        novo = novo[:-1] + ' style="%s">' % cor

    return novo + bloco[len(abrir):]


def main():
    so_html = '--so-html' in sys.argv
    html = io_ler(ORIGEM)

    versao = (re.search(r'deck\.css\?v=(\d+)', html) or [0, '1'])[1]
    secoes = re.findall(r'<section\b[^>]*>[\s\S]*?</section>', html)

    paginas, fora, faltando, avisos = [], [], [], []
    for s in secoes:
        abrir = re.match(r'<section\b[^>]*>', s).group(0)
        if 'data-oculto' in abrir:
            continue
        if SEM_CAPA and 'slide capa' in abrir:
            fora.append(('Capa · WT.AG', 'abertura: só faz sentido no deck'))
            continue
        sid = (re.search(r'id="([^"]+)"', abrir) or [0, ''])[1]
        titulo = (re.search(r'data-titulo="([^"]*)"', abrir) or [0, '?'])[1]
        if sid in EXCLUIR:
            fora.append((titulo, 'sem texto fechado'))
            continue
        b = virar_pagina(s)
        b = montar_imagens(b)
        b = fechar_contadores(b)
        b = ligar_videos(b, faltando)
        if 'reperc__fita' in b:
            b = deduplicar_fitas(b, avisos)
        if 's14__video' in b:
            b = showreel(b)
        if 'capa__nav' in b:
            b = caixa_da_capa(b)
        b = b.replace('Clique para abrir o vídeo', 'Abrir o vídeo')
        paginas.append(b)

    doc = ['<!DOCTYPE html>', '<html lang="pt-BR">', '<head>',
           '<meta charset="utf-8">',
           '<title>WT.AG &#183; Credenciais 2026</title>',
           '<meta name="description" content="Credenciais WT.AG 2026 — Social First Agency.">',
           '<link rel="stylesheet" href="css/deck.css?v=%s">' % versao,
           '<link rel="stylesheet" href="css/pdf.css?v=%s">' % versao,
           '</head>', '<body>', AVISO]
    doc += paginas
    doc += ['</body>', '</html>', '']
    io_escrever(DESTINO, '\n'.join(doc))

    print('index_pdf.html: %d páginas' % len(paginas))
    for t, motivo in fora:
        print('  fora · %s — %s' % (t, motivo))
    links = sum(p.count('class="pdf-lk"') for p in paginas)
    print('  links de vídeo: %d' % links)
    for c in sorted(set(faltando)):
        print('  ! sem link no Drive: %s' % c)
    for a in sorted(set(avisos)):
        print('  ! %s' % a)
    fitas = sum(p.count('class="reperc__fita"') for p in paginas)
    print('  esteiras de repercussão: %d' % fitas)

    if so_html:
        return
    if not os.path.exists(CHROME):
        print('! Chrome não encontrado em %s — só o HTML foi gerado' % CHROME)
        return
    imprimir()


# ------------------------------------------------------- fitas de repercussão
def _filhos(dentro):
    """Itens de nível 1 da esteira, por contagem de profundidade em vez de
    regex frouxa: um item é <span> ou <a> e leva <img>/<em> dentro."""
    itens, pos = [], 0
    padrao = re.compile(r'<(/?)(span|a)\b[^>]*>')
    while True:
        m = padrao.search(dentro, pos)
        if not m:
            return itens
        ini, d, i = m.start(), 1, m.end()
        while d and i < len(dentro):
            n = padrao.search(dentro, i)
            if not n:
                return itens
            i = n.end()
            d += -1 if n.group(1) else 1
        itens.append(dentro[ini:i])
        pos = i


def deduplicar_fitas(bloco, avisos):
    """Deixa UMA passada de logos em cada esteira de repercussão.

    A esteira anda em loop e por isso tem os itens duplicados no HTML: a
    animação desliza -50% e o segundo conjunto cai exatamente sobre o primeiro,
    sem emenda. Parada no quadro final, essa duplicata aparece — o mesmo prêmio
    duas vezes na faixa — e o último item fica GUILHOTINADO na borda direita da
    pista.

    O corte tem culpado próprio: a .reperc__pista esmaece as duas pontas com
    mask-image, e o Chrome não aplica máscara na impressão. O que na tela é um
    item dissolvendo na borda, no papel é um logo cortado a faca.

    Com uma passada só, nada transborda e a máscara deixa de ser necessária (o
    pdf.css a desliga). A conferência é o próprio invariante da esteira: as
    duas metades têm de ser idênticas. Se não forem, o gerador não mexe e
    avisa — é sinal de que a marcação mudou de forma."""
    saida, pos = [], 0
    abre = re.compile(r'<div class="reperc__fita"[^>]*>')
    fecha = re.compile(r'<(/?)div\b')
    while True:
        m = abre.search(bloco, pos)
        if not m:
            saida.append(bloco[pos:])
            return ''.join(saida)
        d, i, ultimo = 1, m.end(), None
        while d and i < len(bloco):
            n = fecha.search(bloco, i)
            if not n:
                break
            i, ultimo = n.end(), n
            d += -1 if n.group(1) else 1
        if d or ultimo is None:
            avisos.append('esteira sem </div> de fecho — deixada como está')
            saida.append(bloco[pos:m.end()])
            pos = m.end()
            continue
        fim_dentro = ultimo.start()           # onde começa o "</div>" do fecho
        dentro = bloco[m.end():fim_dentro]
        itens = _filhos(dentro)
        meio = len(itens) // 2
        if len(itens) >= 2 and not len(itens) % 2 and itens[:meio] == itens[meio:]:
            novo = ''.join(itens[:meio])
        else:
            avisos.append('esteira com %d itens que não se dividem em duas '
                          'metades iguais — deixada como está' % len(itens))
            novo = dentro
        saida.append(bloco[pos:m.end()])
        saida.append(novo)
        pos = fim_dentro


def percorrer_imagens(recurso, vistos):
    """Desce por /XObject de página e de Form, que é onde o Chrome esconde
    metade das imagens. A varredura de primeiro nível encontrava 36 dos 49 MB:
    o resto estava dentro de grupos de transparência (os boxes de vidro dos
    cases criam um), que são Form XObjects com recursos próprios."""
    xo = (recurso or {}).get('/XObject')
    if xo is None:
        return
    for _, ref in xo.get_object().items():
        o = ref.get_object()
        if id(o) in vistos:
            continue
        vistos.add(id(o))
        sub = o.get('/Subtype')
        if sub == '/Image':
            yield o
        elif sub == '/Form':
            for x in percorrer_imagens(o.get('/Resources'), vistos):
                yield x


def comprimir(caminho, limite=120_000, qualidade=86, lado_max=3840):
    """Reescreve as imagens grandes como JPEG.

    Por que é preciso: o Chrome NÃO passa adiante o JPEG original quando a
    página tem um grupo de transparência em cima da foto — e cada case tem um
    (o box de números é backdrop-filter). Ele achata o visual inteiro num
    bitmap SEM PERDA de 6000×3375, que é 3,1× a página. Cinco cases assim são
    31 dos 50 MB do arquivo. Reencodar em JPEG a 3840 de lado devolve 2× a
    resolução da página — mais do que qualquer tela ou impressora usa — por
    1/20 do peso.

    Fica de fora quem já é JPEG (/DCTDecode) e quem não é RGB de 8 bits
    (máscaras de alfa em tons de cinza, sobretudo: JPEG em máscara devolve
    halo na borda)."""
    try:
        import pypdf
        from PIL import Image
    except ImportError as e:
        print('  · sem %s: o PDF fica sem a compressão de imagem' % e.name)
        return
    from pypdf.generic import NameObject, NumberObject

    escritor = pypdf.PdfWriter(clone_from=caminho)
    vistos, trocadas, antes, depois = set(), 0, 0, 0
    for pagina in escritor.pages:
        for o in percorrer_imagens(pagina.get('/Resources'), vistos):
            bruto = getattr(o, '_data', b'') or b''
            if len(bruto) < limite:
                continue
            if '/DCTDecode' in str(o.get('/Filter')):
                continue
            if o.get('/BitsPerComponent') != 8:
                continue
            larg, alt = int(o.get('/Width', 0)), int(o.get('/Height', 0))
            cs = o.get('/ColorSpace')
            canais = 3 if (cs == '/DeviceRGB' or
                           (isinstance(cs, list) and str(cs[0]) == '/ICCBased')) else 0
            if not canais or not larg or not alt:
                continue
            try:
                cru = o.get_data()
            except Exception:
                continue
            if len(cru) != larg * alt * canais:
                continue                      # não é RGB cru: deixa como está
            im = Image.frombytes('RGB', (larg, alt), cru)
            if max(im.size) > lado_max:
                k = lado_max / max(im.size)
                im = im.resize((round(im.size[0] * k), round(im.size[1] * k)),
                               Image.LANCZOS)
            buf = io.BytesIO()
            im.save(buf, 'JPEG', quality=qualidade, optimize=True, progressive=True)
            jpg = buf.getvalue()
            if len(jpg) >= len(bruto):
                continue                      # já estava menor: não piora
            o._data = jpg
            o[NameObject('/Filter')] = NameObject('/DCTDecode')
            o[NameObject('/Width')] = NumberObject(im.width)
            o[NameObject('/Height')] = NumberObject(im.height)
            o[NameObject('/ColorSpace')] = NameObject('/DeviceRGB')
            if '/DecodeParms' in o:
                del o[NameObject('/DecodeParms')]
            trocadas += 1
            antes += len(bruto)
            depois += len(jpg)

    if not trocadas:
        return
    escritor.write(caminho)
    print('  imagens reencodadas: %d  ·  %.1f MB -> %.1f MB' %
          (trocadas, antes / 1e6, depois / 1e6))


def imprimir():
    """--run-all-compositor-stages-before-draw e o orçamento de tempo virtual
    existem porque são 26 páginas de imagem: sem eles o Chrome imprime antes de
    tudo decodificar e saem retângulos vazios."""
    cmd = [CHROME, '--headless', '--disable-gpu',
           '--run-all-compositor-stages-before-draw',
           '--virtual-time-budget=60000',
           '--no-pdf-header-footer',
           '--print-to-pdf=' + PDF, DESTINO]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if not os.path.exists(PDF):
        print('! o Chrome não gerou o PDF')
        print(r.stderr[-2000:])
        return
    print('%s: %.1f MB' % (os.path.basename(PDF), os.path.getsize(PDF) / 1e6))
    comprimir(PDF)
    print('%s: %.1f MB (final)' % (os.path.basename(PDF), os.path.getsize(PDF) / 1e6))


def io_ler(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def io_escrever(p, s):
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)


if __name__ == '__main__':
    main()
