#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera o mobile.html a partir do index.html.

Por que um arquivo separado e não media query: o deck desktop é um palco fixo de
1920×1080 com tudo posicionado em coordenadas absolutas e escalado por transform.
Cada elemento carrega left/top ou --x/--cap inline. Não existe media query que
reflua isso — só sobrescrevendo centenas de estilos inline, o que seria frágil e
ainda arriscaria o desktop. Aqui o desktop não é tocado: este gerador só LÊ o
index.html.

E por que gerado e não escrito à mão: senão o conteúdo viveria em dois lugares e
divergiria em silêncio na primeira alteração. A fonte da verdade continua sendo o
index.html.

    python3 gerar-mobile.py

Rode sempre depois de mexer no conteúdo do index.html.
"""
import io, os, re, sys, json

AQUI = os.path.dirname(os.path.abspath(__file__))
ORIGEM = os.path.join(AQUI, 'index.html')
DESTINO = os.path.join(AQUI, 'mobile.html')


ENT = [('&nbsp;', ' '), ('&amp;', '&'), ('&quot;', '"'), ('&#39;', "'"),
       ('&lt;', '<'), ('&gt;', '>')]


def entidades(t):
    """Entidade HTML → caractere. Tem de vir ANTES do esc(), senão o esc()
    reescapa o & e o texto sai literal na tela."""
    for a, b in ENT:
        t = t.replace(a, b)
    return t


def limpo(t):
    t = re.sub(r'<br\s*/?>', ' · ', t or '')
    t = re.sub(r'<[^>]+>', '', t)
    return entidades(re.sub(r'\s+', ' ', t)).strip()


def linhas(t):
    """Quebra em linhas pelo <br>, preservando a intenção de quebra do original."""
    t = re.sub(r'<br\s*/?>', '\n', t or '')
    t = re.sub(r'<[^>]+>', '', t)
    return [entidades(re.sub(r'\s+', ' ', x)).strip() for x in t.split('\n') if x.strip()]


def um(rx, t, g=1, d=''):
    m = re.search(rx, t, re.S)
    return m.group(g) if m else d


def img_de(t):
    """Caminho da imagem, aceitando src ou data-lazy (montagem por janela)."""
    return um(r'(?:data-lazy|src)="((?!http|data:)[^"]+)"', t)


def extrair(html):
    secs = [m.group(0) for m in re.finditer(r'<section [^>]*class="slide.*?</section>', html, re.S)]
    fora = []
    for b in secs:
        if 'data-oculto' in b[:400]:
            continue
        lim = re.sub(r'<!--.*?-->', '', b, flags=re.S)
        d = {
            'titulo': um(r'data-titulo="([^"]*)"', b),
            'ato': um(r'data-ato="([^"]*)"', b),
            'tom': um(r'data-tom="([^"]*)"', b),
            'acento': um(r'--acento:(#\w+)', b),
            'id': um(r'<section id="([^"]+)"', b),
        }
        # lettering: as linhas grandes, com a tradução que o desktop já carrega
        d['chamada'] = [{'pt': limpo(m.group(2)), 'en': m.group(1) or ''}
                        for m in re.finditer(r'<span class="ln"(?:[^>]*?data-en-txt="([^"]*)")?[^>]*>([^<]*)</span>', lim)]
        d['kicker'] = limpo(um(r'class="[^"]*l-kicker[^"]*"[^>]*>(.*?)</div>', lim))
        # apoio: o parágrafo mais longo do slide
        apoios = [limpo(x) for x in re.findall(r'class="[^"]*l-apoio[^"]*"[^>]*>(.*?)</(?:div|p)>', lim, re.S)]
        apoios = [a for a in apoios if len(a) > 25]
        d['apoio'] = max(apoios, key=len) if apoios else ''

        # ── números do Grupo WE ──
        d['numeros'] = [{'v': limpo(m.group(1)), 'r': limpo(m.group(2))}
                        for m in re.finditer(r'class="[^"]*we-num__v[^"]*"[^>]*>(.*?)</\w+>\s*<\w+[^>]*class="[^"]*we-num__lb[^"]*"[^>]*>(.*?)</\w+>', lim, re.S)]

        # ── grades de logo ──
        d['logos'] = [{'src': img_de(m.group(0)), 'alt': um(r'alt="([^"]*)"', m.group(0)),
                       'ir': um(r'data-ir="([^"]*)"', m.group(0))}
                      for m in re.finditer(r'<div[^>]*class="[^"]*s15__logo[^"]*"[^>]*>\s*<img[^>]*>', lim)]

        # ── framework ──
        d['etapas'] = []
        for m in re.finditer(r'<div class="fw-card__win">(.*?)</div>\s*'
                             r'<div class="fw-card__body"><span class="fw-card__n">([^<]*)</span>'
                             r'<span class="fw-card__lb">(.*?)</span>', lim, re.S):
            d['etapas'].append({'n': limpo(m.group(2)), 'lb': linhas(m.group(3)),
                                'img': img_de(m.group(1))})

        # ── pessoas ──
        d['pessoas'] = [{'img': img_de(m.group(0)),
                         'cargo': limpo(um(r'<em>(.*?)</em>', m.group(0))),
                         'nome': limpo(um(r'<b>(.*?)</b>', m.group(0)))}
                        for m in re.finditer(r'<div[^>]*class="pes[^"]*".*?</span>\s*</div>', lim, re.S)]

        # ── sedes ──
        d['sedes'] = []
        for parte in lim.split('<div class="sede"')[1:]:
            d['sedes'].append({'thumb': img_de(parte), 'video': um(r'data-video="([^"]+)"', parte),
                               'estado': limpo(um(r'<em>(.*?)</em>', parte)),
                               'cidade': limpo(um(r'<b>(.*?)</b>', parte)),
                               'end': limpo(um(r'<i>(.*?)</i>', parte))})

        # ── case ──
        if 'class="slide case' in b:
            d['case'] = {
                'fundo': img_de(um(r'class="case__fundo"[^>]*>(.*?)</div>', lim)),
                'logo': img_de(um(r'case__marca--credito.*?(<img[^>]*>)', lim)),
                'logo_alt': um(r'case__marca--credito.*?<img[^>]*alt="([^"]*)"', lim),
                'apresenta': limpo(um(r'case__marca--credito.*?<em>(.*?)</em>', lim)),
                'selo': img_de(um(r'case__selo"[^>]*>(.*?)</div>', lim)),
                'selo_alt': um(r'case__selo.*?<img[^>]*alt="([^"]*)"', lim),
                'video': um(r'class="case__video"[^>]*\n?\s*data-video="([^"]+)"', lim) or um(r'data-video="([^"]+)"', lim),
                'poster': um(r'class="case__video"[^>]*\n?\s*data-video="[^"]+" data-poster="([^"]+)"', lim),
                'blocos': [{'t': limpo(m.group(1)), 'curto': limpo(m.group(3)), 'full': m.group(2)}
                           for m in re.finditer(r'<h3>(.*?)</h3>\s*<p\s+data-texto="([^"]*)">(.*?)</p>', lim, re.S)],
                'kpis': [], 'reperc': {'premios': [], 'veiculos': []}, 'minis': [],
            }
            for m in re.finditer(r'<div class="case__kpi"[^>]*>\s*<b([^>]*)>(.*?)</b><span>(.*?)</span>', lim, re.S):
                at, dentro = m.group(1), limpo(m.group(2))
                d['case']['kpis'].append({'v': um(r'data-count-to="([\d.]+)"', at) or dentro,
                                          'pre': um(r'data-count-pre="([^"]*)"', at),
                                          'pos': um(r'data-count-pos="([^"]*)"', at),
                                          'dec': um(r'data-count-dec="(\d+)"', at, d='0'),
                                          'sep': 'count-sep' in at,
                                          'anima': bool(um(r'data-count-to="([\d.]+)"', at)),
                                          'r': limpo(m.group(3))})
            for m in re.finditer(r'<div class="case__img[^"]*"[^>]*>.*?<div class="px">.*?</div>', lim, re.S):
                pai = m.group(0)
                d['case']['minis'].append({'img': img_de(pai),
                                           'video': um(r'data-video="([^"]+)"', pai),
                                           'yt': um(r'data-youtube="([^"]+)"', pai),
                                           'leg': um(r'data-legenda="([^"]*)"', pai)})
            fita = um(r'<div class="reperc__fita"[^>]*>(.*?)</div></div>', lim)
            meta = fita[:len(fita) // 2] if fita else ''
            for m in re.finditer(r'reperc__it--premio">\s*<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>\s*<em[^>]*>(.*?)</em>', meta, re.S):
                d['case']['reperc']['premios'].append({'src': m.group(1), 'alt': m.group(2), 'ganho': limpo(m.group(3))})
            for m in re.finditer(r'<a class="reperc__it" href="([^"]*)"[^>]*title="([^"]*)">(.*?)</a>', meta, re.S):
                d['case']['reperc']['veiculos'].append({'url': m.group(1), 'nome': m.group(2),
                                                        'src': img_de(m.group(3))})
            d['case']['vazio'] = 'reperc__vazio' in lim or not fita

        # ── showreel e encerramento ──
        d['showreel'] = um(r'class="s14__video"[^>]*src="([^"]+)"', lim) or um(r'showreel[^"]*\.mp4', lim)
        if 'cta__wrap' in lim:
            d['cta'] = {'head': [limpo(x) for x in re.findall(r'class="cta__head"[^>]*>(.*?)</div>', lim, re.S)],
                        'linhas': [limpo(x) for x in re.findall(r'<span>([^<]*)</span>', um(r'class="cta__main"[^>]*>(.*?)</div>', lim))],
                        'link': um(r'<a href="(https?://[^"]+)"', lim)}
            d['cta']['head'] = [limpo(x) for x in re.findall(r'<span>([^<]*)</span>', um(r'class="cta__head"[^>]*>(.*?)</div>', lim))]
        # ── divisor: a palavra grande vive num .rl-caixa, não num .ln ──
        if 'rl-caixa' in lim:
            d['divisor'] = limpo(um(r'class="[^"]*rl-caixa[^"]*"[^>]*>([^<]*)<', lim))

        # ── capa (slide 1) ──
        # A classe vem composta ("abs l-marcas we-capa__logo"), então o casamento
        # tem de ser por substring — exigir class="we-capa__logo" não achava nada,
        # e a capa saía com o nome interno do slide como título.
        d['capa'] = {
            'logo': um(r'class="[^"]*we-capa__logo[^"]*"[^>]*>\s*<img[^>]*src="([^"]+)"', lim),
            'card': limpo(um(r'class="[^"]*we-capa__card[^"]*"[^>]*>(.*?)</div>', lim)),
        } if 'we-capa__logo' in lim else None
        d['we_txt'] = linhas(um(r'class="[^"]*we-02__txt[^"]*"[^>]*>(.*?)</div>', lim))

        # ── números do Grupo (slide 3) ──
        # Cada número é um .bloco com um ou mais .we-num (o valor pode vir partido,
        # como "1,3" + "BI"), e o rótulo vem no .rot seguinte. O valor real está em
        # data-count-to; o texto no HTML é só o zero de partida da animação.
        d['numeros'] = []
        blocos_n = re.findall(r'<div class="bloco l-apoio"[^>]*>(.*?)</div>', lim, re.S)
        rotulos = [limpo(x) for x in re.findall(r'class="bloco l-apoio rot blk"[^>]*>(.*?)</div>', lim, re.S)]
        vals = []
        for bl in blocos_n:
            pedacos = []
            for m in re.finditer(r'<span class="we-num"([^>]*)>([^<]*)</span>', bl):
                alvo = um(r'data-count-to="([\d.,]+)"', m.group(1))
                dec = um(r'data-count-dec="(\d+)"', m.group(1), d='0')
                if alvo:
                    pedacos.append(alvo.replace('.', ',') if dec != '0' else alvo)
                else:
                    pedacos.append(limpo(m.group(2)))
            if pedacos:
                pre = '+' if '>+<' in bl or limpo(bl) == '+' else ''
                vals.append(' '.join(pedacos))
        for i, v in enumerate(vals):
            d['numeros'].append({'v': v, 'r': rotulos[i] if i < len(rotulos) else ''})
        d['nota'] = limpo(um(r'class="[^"]*we-nota[^"]*"[^>]*>(.*?)</div>', lim))

        # ── rótulos de rodapé (slide 7) e lista de atributos (slide 8) ──
        d['rodape'] = [limpo(x) for x in re.findall(r'class="rodape-rot"[^>]*>(.*?)</div>', lim, re.S)]
        d['lista'] = [limpo(x) for x in
                      re.findall(r'class="[^"]*s09__lista[^"]*".*?$', lim, re.S)[:1]]
        if 's09__lista' in lim:
            trecho = lim[lim.index('s09__lista'):]
            d['lista'] = [limpo(x) for x in re.findall(r'class="blk"[^>]*>([^<]+)<', trecho) if limpo(x)]
        else:
            d['lista'] = []

        # ── hub de soluções (slide 4) ──
        d['hub'] = [limpo(x) for x in
                    re.findall(r'class="[^"]*we-05__col_t[^"]*"[^>]*>([^<]+)<', lim) if limpo(x)]
        d['hub_art'] = img_de(um(r'class="[^"]*we-hub-art[^"]*"[^>]*>(.*?)</div>', lim))

        # ── abertura WT.AG (slide 5) ──
        if 's06__wt' in lim:
            d['wordmark'] = {'wt': limpo(um(r'class="s06__wt"[^>]*>([^<]*)<', lim)),
                             'desc': linhas(um(r'class="s06__desc"[^>]*>(.*?)</div>', lim)),
                             'logo': img_de(um(r'class="s06__logo"[^>]*>(.*?)</div>', lim))}

        # ── persona e matriz (slide 12) ──
        if re.search(r'class="[^"]*\b(?:p13|terr)\b', lim):
            d['persona'] = {
                'legenda': linhas(um(r'class="[^"]*legenda[^"]*"[^>]*>(.*?)</div>', lim)),
                'emojis': limpo(um(r'class="[^"]*emojis[^"]*"[^>]*>([^<]*)<', lim)),
                'pilulas': [linhas(x) for x in re.findall(r'class="[^"]*pilula[^"]*"[^>]*>(.*?)</div>', lim, re.S)],
                'terr': [limpo(x) for x in re.findall(r'class="[^"]*terr[^"]*"[^>]*>([^<]*)<', lim)],
                'cels': [linhas(x) for x in re.findall(r'class="[^"]*\bcel\b[^"]*"[^>]*>(.*?)</div>', lim, re.S)],
                'foto': img_de(um(r'class="[^"]*p13[^"]*"[^>]*>(.*?)</div>', lim)),
            }

        # ── showreel (slide 13) ──
        if 's14__video' in lim:
            d['showreel'] = {'src': um(r'class="s14__video"[^>]*src="([^"]+)"', lim),
                             'poster': um(r'class="s14__video"[^>]*poster="([^"]+)"', lim),
                             'legenda': limpo(um(r'class="s14__legenda"[^>]*>(.*?)</div>', lim))}
        else:
            d['showreel'] = None

        # imagem de fundo/destaque do slide, quando houver
        d['foto'] = img_de(um(r'class="[^"]*(?:s08__foto|s11__foto|we-foto|we-02__foto|l-visual)[^"]*"[^>]*>(.*?)</div>', lim))
        fora.append(d)
    return fora



# ════════════════════════════════════════════════════════════════════════════
# EMISSÃO
# ════════════════════════════════════════════════════════════════════════════
def esc(t):
    return (t or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def sec_abre(d, extra='', auto=False):
    """Abre a seção com o tom herdado do slide equivalente no desktop."""
    cls = ['sec']
    if d['tom'] == 'claro': cls.append('sec--claro')
    if d['tom'] == 'laranja': cls.append('sec--laranja')
    if auto: cls.append('sec--auto')
    est = ' style="--acento:%s"' % d['acento'] if d['acento'] else ''
    sid = ' id="m-%s"' % d['id'] if d['id'] else ''
    return '<section class="%s"%s%s data-titulo="%s"%s>' % (
        ' '.join(cls), sid, est, esc(d['titulo']), extra)


def bloco_foto(src):
    if not src: return ''
    return '<div class="sec__bg"><img data-lazy="%s" alt=""></div>' % src


# Palavras que o desktop parte em duas linhas de propósito, com recuo. Sem o
# recuo — que é o que o celular não tem — a quebra lê como erro de digitação.
COLAR = {('O CON', 'SUMIDOR'): 'O CONSUMIDOR', ('THE CON', 'SUMER'): 'THE CONSUMER'}


def juntar_partidas(ls):
    fora, i = [], 0
    while i < len(ls):
        if i + 1 < len(ls) and (ls[i], ls[i + 1]) in COLAR:
            fora.append(COLAR[(ls[i], ls[i + 1])]); i += 2
        else:
            fora.append(ls[i]); i += 1
    return fora


def chamada(d, cls='tit'):
    """As linhas grandes viram um só <h2> com <br>: no celular a quebra tem de
    seguir a largura da tela, não os --x calculados para 1920px."""
    if not d['chamada']: return ''
    pts = juntar_partidas([c['pt'] for c in d['chamada'] if c['pt']])
    ens = juntar_partidas([c['en'] or c['pt'] for c in d['chamada'] if c['pt']])
    if not pts: return ''
    en = ' '.join(ens) if len(' '.join(ens)) < 46 else '<br>'.join(ens)
    return '<h2 class="%s" data-en-txt="%s">%s</h2>' % (cls, esc(en), '<br>'.join(map(esc, pts)))


def emitir(dados):
    o = []
    for i, d in enumerate(dados, 1):
        t = d['titulo']
        c = d.get('case')

        # ── cases ──────────────────────────────────────────────────────────
        if c:
            o.append(sec_abre(d, ' data-case="1"', auto=True))
            o.append(bloco_foto(c['fundo']))
            if c['logo']:
                o.append('<div class="credito"><img data-lazy="%s" alt="%s"><em>%s</em></div>'
                         % (c['logo'], esc(c['logo_alt']), esc(c['apresenta'])))
            if c['selo']:
                o.append('<img class="selo" data-lazy="%s" alt="%s">' % (c['selo'], esc(c['selo_alt'])))
            if c['video']:
                o.append('<div class="media media--16x9" data-video="%s" data-legenda="%s">'
                         '<img data-lazy="%s" alt=""><button class="play" type="button" '
                         'aria-label="Assistir"></button></div>'
                         % (c['video'], esc(t), c['poster'] or ''))
            elif c['poster']:
                o.append('<div class="media media--16x9"><img data-lazy="%s" alt=""></div>' % c['poster'])
            if c['minis']:
                o.append('<div class="minis">')
                for m in c['minis']:
                    at = ''
                    if m['yt']: at = ' data-youtube="%s"' % m['yt']
                    elif m['video']: at = ' data-video="%s"' % m['video']
                    play = '<button class="play" type="button" aria-label="Assistir"></button>' if at else ''
                    o.append('<div class="mini"%s data-legenda="%s"><img data-lazy="%s" alt="">%s</div>'
                             % (at, esc(m['leg'] or ''), m['img'] or '', play))
                o.append('</div>')
            for b in c['blocos']:
                o.append('<div class="bloco"><h3>%s</h3><p class="txt">%s</p></div>'
                         % (esc(b['t']), esc(b['curto'])))
            o.append('<button class="mais" type="button" data-full="%s">＋ Texto completo</button>'
                     % esc(json.dumps([{'t': b['t'], 'x': limpo(b['full'])} for b in c['blocos']], ensure_ascii=False)))
            if c['kpis']:
                o.append('<div class="kpis">')
                for k in c['kpis']:
                    at = ''
                    if k['anima']:
                        at = ' data-count-to="%s" data-count-dec="%s"' % (k['v'], k['dec'])
                        if k['pre']: at += ' data-count-pre="%s"' % esc(k['pre'])
                        if k['pos']: at += ' data-count-pos="%s"' % esc(k['pos'])
                        if k['sep']: at += ' data-count-sep="1"'
                    o.append('<div class="kpi"><b%s>%s</b><span>%s</span></div>'
                             % (at, '0' if k['anima'] else esc(k['v']), esc(k['r'])))
                o.append('</div>')
            r = c['reperc']
            if c['vazio']:
                o.append('<div><div class="rot">Repercussão</div>'
                         '<p class="vazio">Esta campanha não recebeu prêmios nem publicações na imprensa.</p></div>')
            elif r['premios'] or r['veiculos']:
                o.append('<div><div class="rot">Repercussão</div><div class="reperc">')
                for pr in r['premios']:
                    o.append('<span class="premio"><img src="%s" alt="%s"><em>%s</em></span>'
                             % (pr['src'], esc(pr['alt']), esc(pr['ganho'])))
                for v in r['veiculos']:
                    o.append('<a class="veiculo" href="%s" target="_blank" rel="noopener" '
                             'title="%s"><img src="%s" alt="%s"></a>'
                             % (v['url'], esc(v['nome']), v['src'] or '', esc(v['nome'])))
                o.append('</div></div>')
            o.append('</section>')
            continue

        # ── divisor ────────────────────────────────────────────────────────
        if d.get('divisor'):
            o.append(sec_abre(d))
            o.append('<h2 class="tit tit--g">%s</h2>' % esc(d['divisor']))
            o.append('</section>')
            continue

        # ── encerramento ───────────────────────────────────────────────────
        if d.get('cta'):
            k = d['cta']
            o.append(sec_abre(d))
            if k['head']:
                o.append('<div class="kick">%s</div>' % esc(' '.join(k['head'])))
            o.append('<h2 class="tit">%s</h2>' % '<br>'.join(map(esc, k['linhas'])))
            if k['link']:
                o.append('<a class="rot" href="%s" target="_blank" rel="noopener">WWW.WT.AG</a>' % k['link'])
            o.append('</section>')
            continue

        # ── capa ───────────────────────────────────────────────────────────
        if d.get('capa'):
            o.append(sec_abre(d))
            o.append(bloco_foto(d['foto']))
            if d['capa']['logo']:
                o.append('<img style="width:min(62%%,300px);height:auto" '
                         'data-lazy="%s" alt="Grupo WE">' % d['capa']['logo'])
            if d['capa']['card']:
                o.append('<div class="rot">%s</div>' % esc(d['capa']['card']))
            o.append('</section>')
            continue

        # ── genérico: kicker, chamada, apoio, e o payload do slide ─────────
        auto = bool(d['etapas'] or d['pessoas'] or d['logos'] or d.get('persona'))
        o.append(sec_abre(d, auto=auto))
        o.append(bloco_foto(d['foto'] if not auto else ''))
        if d['kicker']: o.append('<div class="kick">%s</div>' % esc(d['kicker']))
        if d.get('wordmark'):
            w = d['wordmark']
            o.append('<h2 class="tit tit--g">WT.AG</h2>')
            if w['desc']: o.append('<p class="txt">%s</p>' % esc(' '.join(w['desc'])))
        elif d.get('we_txt'):
            o.append('<h2 class="tit">%s</h2>' % '<br>'.join(map(esc, d['we_txt'])))
        elif d['chamada']:
            o.append(chamada(d, 'tit tit--g' if len(d['chamada']) <= 2 else 'tit'))
        elif d.get('hub'):
            o.append('<h2 class="tit">%s</h2>' % '<br>'.join(map(esc, d['hub'])))
        else:
            o.append('<h2 class="tit tit--p">%s</h2>' % esc(t))
        # Com números na tela o apoio É o rótulo do primeiro deles, então
        # imprimir os dois mostrava a mesma frase duas vezes.
        if d['apoio'] and not d['numeros']:
            o.append('<p class="txt">%s</p>' % esc(d['apoio']))
        if d.get('nota'): o.append('<div class="rot">%s</div>' % esc(d['nota']))

        if d.get('rodape'):
            o.append('<div class="reperc">%s</div>'
                     % ''.join('<span class="veiculo" style="padding:8px 14px;font-size:11px;'
                               'letter-spacing:.1em;text-transform:uppercase">%s</span>' % esc(x)
                               for x in d['rodape'] if x))
        if d.get('lista'):
            o.append('<div class="reperc">%s</div>'
                     % ''.join('<span class="premio"><em style="max-width:none">%s</em></span>' % esc(x)
                               for x in d['lista'] if x))
        if d['numeros']:
            o.append('<div class="nums">')
            for nn in d['numeros']:
                o.append('<div><div class="num__v">%s</div><div class="num__r">%s</div></div>'
                         % (esc(nn['v']), esc(nn['r'])))
            o.append('</div>')
        if d.get('hub_art'):
            o.append('<div class="media"><img data-lazy="%s" alt=""></div>' % d['hub_art'])
        if d['etapas']:
            o.append('<div class="cards">')
            for e in d['etapas']:
                o.append('<div class="card"><div class="card__win"><img data-lazy="%s" alt=""></div>'
                         '<div class="card__body"><span class="card__n">%s</span>'
                         '<span class="card__lb">%s</span></div></div>'
                         % (e['img'] or '', esc(e['n']), '<br>'.join(map(esc, e['lb']))))
            o.append('</div>')
        if d.get('persona'):
            pp = d['persona']
            if pp['foto']:
                o.append('<div class="media"><img data-lazy="%s" alt=""></div>' % pp['foto'])
            if pp['legenda']:
                o.append('<p class="txt">%s</p>' % esc(' · '.join(pp['legenda'])))
            if pp['emojis']:
                o.append('<div class="txt" style="font-size:20px;line-height:1.5">%s</div>' % esc(pp['emojis']))
            if pp['terr']:
                o.append('<div><div class="rot">Territórios</div><div class="reperc">%s</div></div>'
                         % ''.join('<span class="veiculo" style="padding:7px 12px;font-size:11px">%s</span>' % esc(x)
                                   for x in pp['terr'] if x))
            if pp['cels']:
                o.append('<div class="cards">')
                for cel in pp['cels']:
                    if not cel: continue
                    o.append('<div class="card"><div class="card__body"><span class="card__lb">%s</span></div></div>'
                             % '<br>'.join(map(esc, cel)))
                o.append('</div>')
        if d.get('showreel'):
            sh = d['showreel']
            o.append('<div class="media media--16x9" data-video="%s" data-legenda="%s">'
                     '<img data-lazy="%s" alt=""><button class="play" type="button" '
                     'aria-label="Assistir"></button></div>'
                     % (sh['src'] or '', esc(sh['legenda'] or t), sh['poster'] or ''))
        if d['logos']:
            o.append('<div class="logos">')
            for lg in d['logos']:
                ir = ' data-ir="m-%s"' % lg['ir'] if lg['ir'] else ''
                cl = 'logo logo--case' if lg['ir'] else 'logo'
                o.append('<div class="%s"%s><img data-lazy="%s" alt="%s"></div>'
                         % (cl, ir, lg['src'] or '', esc(lg['alt'])))
            o.append('</div>')
        if d['pessoas']:
            o.append('<div class="gente">')
            for pe in d['pessoas']:
                oy = ' style="--oy:65%"' if 'marcos' in (pe['img'] or '') else ''
                o.append('<div class="pessoa"><img data-lazy="%s" alt="%s"%s>'
                         '<span class="pessoa__leg"><span class="pessoa__c">%s</span>'
                         '<span class="pessoa__n">%s</span></span></div>'
                         % (pe['img'] or '', esc(pe['nome']), oy, esc(pe['cargo']), esc(pe['nome'])))
            o.append('</div>')
        if d['sedes']:
            o.append('<div class="cards">')
            for sd in d['sedes']:
                o.append('<div class="card" style="flex-direction:column">'
                         '<div class="media media--16x9" data-video="%s" data-legenda="%s" '
                         'style="border-radius:0"><img data-lazy="%s" alt="">'
                         '<button class="play" type="button" aria-label="Assistir"></button></div>'
                         '<div class="card__body"><span class="pessoa__c">%s</span>'
                         '<span class="card__n" style="font-size:clamp(20px,5.6vw,28px)">%s</span>'
                         '<span class="card__lb">%s</span></div></div>'
                         % (sd['video'] or '', esc(sd['cidade']), sd['thumb'] or '',
                            esc(sd['estado']), esc(sd['cidade']), esc(sd['end'])))
            o.append('</div>')
        o.append('</section>')
    return '\n'.join(o)


CASCA = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>WT.AG — Credenciais 2026</title>
<meta name="description" content="Credenciais WT.AG 2026 — Social First Agency.">
<meta name="theme-color" content="#000000">
<link rel="stylesheet" href="css/mobile.css?v=%(v)s">
</head>
<body>
<!-- ══════════════════════════════════════════════════════════════════════════
     ARQUIVO GERADO — NÃO EDITE À MÃO
     Sai de: index.html · via: python3 gerar-mobile.py
     ══════════════════════════════════════════════════════════════════════ -->
<div id="barra"></div>
<div id="topo">
  <span class="marca">Credenciais</span>
  <button class="lg" type="button" aria-label="Switch to English">
    <span data-lg="pt" class="is-on">PT</span><i></i><span data-lg="en">EN</span></button>
</div>

%(secoes)s

<div id="painel"><button class="fechar" type="button">×</button><div class="cx"></div></div>
<div id="player"><button class="fechar" type="button">×</button></div>

<script src="js/i18n-dic.js?v=%(v)s"></script>
<script src="js/mobile.js?v=%(v)s"></script>
</body>
</html>
"""

if __name__ == '__main__':
    html = io.open(ORIGEM, encoding='utf-8').read()
    dados = extrair(html)
    v = um(r'deck\.css\?v=(\d+)', html) or '1'
    io.open(DESTINO, 'w', encoding='utf-8').write(
        CASCA % {'v': v, 'secoes': emitir(dados)})
    print('mobile.html gerado · %d seções · assets em v=%s' % (len(dados), v))
    print('%d slides extraídos' % len(dados))
    for i, d in enumerate(dados, 1):
        bits = []
        if d['chamada']: bits.append('%d linhas' % len(d['chamada']))
        if d['numeros']: bits.append('%d números' % len(d['numeros']))
        if d['logos']: bits.append('%d logos' % len(d['logos']))
        if d['etapas']: bits.append('%d etapas' % len(d['etapas']))
        if d['pessoas']: bits.append('%d pessoas' % len(d['pessoas']))
        if d['sedes']: bits.append('%d sedes' % len(d['sedes']))
        if d.get('case'):
            c = d['case']
            bits.append('case: %d blocos, %d kpis, %d minis, %d prêmios, %d veículos'
                        % (len(c['blocos']), len(c['kpis']), len(c['minis']),
                           len(c['reperc']['premios']), len(c['reperc']['veiculos'])))
        if d.get('cta'): bits.append('cta %d linhas' % len(d['cta']['linhas']))
        if d.get('divisor'): bits.append('divisor "%s"' % d['divisor'])
        if d.get('numeros'): pass
        if d.get('hub'): bits.append('hub %d linhas' % len(d['hub']))
        if d.get('wordmark'): bits.append('wordmark')
        if d.get('persona'): bits.append('persona: %d pílulas, %d territórios, %d células'
            % (len(d['persona']['pilulas']), len(d['persona']['terr']), len(d['persona']['cels'])))
        if d.get('showreel'): bits.append('showreel')
        if d.get('we_txt'): bits.append('%d linhas WE' % len(d['we_txt']))
        print('  %2d %-30s %s' % (i, d['titulo'][:30], ' · '.join(bits)))
