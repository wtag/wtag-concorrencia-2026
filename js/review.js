/* ============================================================================
   WT.AG · Credenciais 2026 — CAMADA DE REVISÃO
   Carregada só pelo index_review.html, depois do deck.js.

   O que faz: deixa marcar áreas (arrastando) ou pontos (clique) em cima de
   qualquer slide, escrever um comentário e exportar tudo num relatório.

   Como conversa com o deck sem quebrá-lo:
   · usa window.DECK.irPara / .atual, que o deck.js já expõe;
   · a capa de captura leva data-nonav, atributo que o próprio deck.js consulta
     antes de avançar de slide no clique — então marcar não vira navegação;
   · a capa fica acima do conteúdo do slide, então clique em vídeo de case,
     lightbox e "texto completo" também não disparam durante a revisão;
   · um listener de teclado em fase de CAPTURA para o evento antes de chegar ao
     deck.js, senão digitar "f" abriria tela cheia e espaço abriria o sumário.

   Coordenadas: sempre no espaço do palco (1920×1080), nunca em pixel de tela.
   Assim a marcação cai no mesmo lugar em qualquer tamanho de janela.
   ========================================================================= */
(function () {
  'use strict';

  var CHAVE   = 'wtag-credenciais-revisao-v1';
  var PALCO_L = 1920, PALCO_A = 1080;
  var MIN_AREA = 10;          // arraste menor que isso conta como ponto

  var viewport = document.getElementById('viewport');
  var stage    = document.getElementById('stage');
  var slides   = [].slice.call(document.querySelectorAll('.slide:not([data-oculto])'));

  if (!viewport || !stage || !window.DECK) {
    console.warn('[revisão] deck não encontrado — camada de revisão desligada.');
    return;
  }

  /* ----------------------------------------------------------------- estado */
  var dados   = carregar();
  var ligado  = false;
  var edicao  = null;     // { id } quando editando, { nova: {...} } quando criando
  var arraste = null;

  /* Resolvidas ficam escondidas por padrão — tanto o pino na tela quanto a linha
     na lista. Elas continuam gravadas e continuam saindo no relatório; o que muda
     é só a visualização, para a tela mostrar o que ainda falta.
     A preferência mora numa chave própria, separada dos dados: é estado de
     interface, não conteúdo da revisão. */
  var CHAVE_VER = CHAVE + ':ver-resolvidas';
  var verResolvidas = localStorage.getItem(CHAVE_VER) === '1';
  function definirVerResolvidas(v) {
    verResolvidas = !!v;
    try { localStorage.setItem(CHAVE_VER, verResolvidas ? '1' : '0'); } catch (e) {}
    render();
  }
  function resolvidas() {
    return dados.comentarios.filter(function (c) { return c.resolvido; });
  }
  function visiveis() {
    return verResolvidas ? dados.comentarios
                         : dados.comentarios.filter(function (c) { return !c.resolvido; });
  }

  /* ------------------------------------------------------------ persistência */
  function carregar() {
    try {
      var cru = localStorage.getItem(CHAVE);
      if (!cru) return { versao: 1, comentarios: [] };
      var o = JSON.parse(cru);
      if (!o || !Array.isArray(o.comentarios)) return { versao: 1, comentarios: [] };
      return o;
    } catch (e) {
      console.warn('[revisão] não consegui ler o armazenamento local:', e);
      return { versao: 1, comentarios: [] };
    }
  }
  function salvar() {
    dados.atualizado = new Date().toISOString();
    try {
      localStorage.setItem(CHAVE, JSON.stringify(dados));
    } catch (e) {
      toast('Não consegui salvar no navegador. Exporte o relatório para não perder nada.');
      console.warn('[revisão] falha ao salvar:', e);
    }
  }
  function proximoNumero() {
    return dados.comentarios.reduce(function (m, c) { return Math.max(m, c.n || 0); }, 0) + 1;
  }

  /* --------------------------------------------------------------- interface */
  var capa = el('div', { id: 'rv-capa', 'data-nonav': '' });
  var tracejado = el('div', { id: 'rv-tracejado' });
  tracejado.appendChild(el('span'));
  var pinos = el('div', { id: 'rv-pinos', 'data-nonav': '' });
  stage.appendChild(capa);
  stage.appendChild(tracejado);
  stage.appendChild(pinos);

  var selo = el('div', { id: 'rv-selo' });
  selo.textContent = 'Modo revisão';
  viewport.appendChild(selo);

  var bar = el('div', { id: 'rv-bar', 'data-nonav': '' });
  bar.innerHTML =
    '<button type="button" data-rv="modo" title="Ligar/desligar o modo revisão (R)">' +
      '<span>Marcar</span><kbd>R</kbd></button>' +
    '<div class="rv-sep"></div>' +
    '<button type="button" data-rv="lista" title="Ver todas as marcações (L)">' +
      '<span>Marcações</span><kbd>L</kbd></button>' +
    '<span class="rv-conta" data-rv="conta">0</span>' +
    '<button type="button" data-rv="resolvidas" hidden ' +
      'title="Mostrar/ocultar as marcações resolvidas (V)">' +
      '<span data-rv="resolvidas-txt">✓ 0</span><kbd>V</kbd></button>' +
    '<div class="rv-sep"></div>' +
    '<button type="button" data-rv="exportar" title="Baixar o relatório em Markdown">Exportar</button>';
  viewport.appendChild(bar);

  var painel = el('div', { id: 'rv-painel', 'data-nonav': '' });
  painel.innerHTML =
    '<div class="rv-cab">' +
      '<h2>Marcações</h2>' +
      '<p>Arraste sobre o slide para marcar uma área. Clique para marcar um ponto.</p>' +
      '<button class="rv-fechar" type="button" aria-label="Fechar">×</button>' +
    '</div>' +
    '<div id="rv-lista"></div>' +
    '<div class="rv-pe">' +
      '<button class="rv-forte" type="button" data-rv="exportar">Baixar relatório (.md)</button>' +
      '<button type="button" data-rv="copiar">Copiar texto</button>' +
      '<button type="button" data-rv="json">Salvar .json</button>' +
      '<button type="button" data-rv="importar">Importar .json</button>' +
      '<button class="rv-perigo" type="button" data-rv="limpar">Apagar tudo</button>' +
    '</div>';
  viewport.appendChild(painel);

  var lista = painel.querySelector('#rv-lista');

  var editor = el('div', { id: 'rv-editor', 'data-nonav': '' });
  editor.innerHTML =
    '<div class="rv-ed-cab"><span data-rv="ed-titulo">Nova marcação</span><b data-rv="ed-meta"></b></div>' +
    '<textarea placeholder="O que precisa mudar aqui?"></textarea>' +
    '<div class="rv-ed-pe">' +
      '<span class="rv-dica"><kbd>⌘/Ctrl</kbd>+<kbd>Enter</kbd> salva · <kbd>Esc</kbd> cancela</span>' +
      '<button type="button" data-rv="ed-resolver" title="Marcar como resolvida">✓</button>' +
      '<button class="rv-apagar" type="button" data-rv="ed-apagar" title="Apagar">Apagar</button>' +
      '<button class="rv-forte" type="button" data-rv="ed-salvar">Salvar</button>' +
    '</div>';
  viewport.appendChild(editor);
  var campo = editor.querySelector('textarea');

  var toastEl = el('div', { id: 'rv-toast' });
  viewport.appendChild(toastEl);

  var arqJson = el('input', { type: 'file', accept: '.json,application/json' });
  arqJson.style.display = 'none';
  viewport.appendChild(arqJson);

  function el(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  /* ------------------------------------------------------------------ escala
     O palco é escalado para caber na janela. As etiquetas das marcações vivem
     dentro do palco, então herdam essa escala — o que deixaria o texto minúsculo
     numa janela pequena. --rv-inv desfaz a escala só nas etiquetas. */
  function medirEscala() {
    var r = stage.getBoundingClientRect();
    var escala = r.width / PALCO_L || 1;
    pinos.style.setProperty('--rv-inv', (1 / escala).toFixed(4));
    return escala;
  }
  window.addEventListener('resize', medirEscala);
  medirEscala();

  /* Converte coordenada de tela para coordenada de palco (1920×1080). */
  function paraPalco(clientX, clientY) {
    var r = stage.getBoundingClientRect();
    return {
      x: clamp((clientX - r.left) / r.width * PALCO_L, 0, PALCO_L),
      y: clamp((clientY - r.top) / r.height * PALCO_A, 0, PALCO_A)
    };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* -------------------------------------------- o que a marcação está cercando
     Serve para o relatório dizer a que a marcação se refere, e não só "x 72 y 72".

     Para PONTO: o elemento sob o cursor.
     Para ÁREA: a lista do que a área cobre. É bem mais útil que o elemento do
     centro, porque o centro de uma área grande quase sempre cai em fundo vazio. */

  // elementos que valem ser citados; o resto é invólucro de layout
  var SEL_UTEIS = 'span.ln, img, video, p, h3, b, em, i, button, kbd,' +
    '.s15__logo, .pes, .sede, .fw-card, .case__kpi, .case__blk, .marca, .marca-logo,' +
    '.est__kicker, .est__intro, .rodape-rot, .cta__head, .cta__main, .cta__foot,' +
    '.we-num, .we-logo-cli, .s16__idx, .rl-caixa, [class*="__desc"], [class*="__apoio"],' +
    '[class*="__kicker"], [class*="__foto"], [class*="__titulo"], [class*="__leg"]';

  function rotular(n) {
    var desc = n.tagName.toLowerCase();
    var c = typeof n.className === 'string' ? n.className.trim().split(/\s+/).filter(Boolean) : [];
    if (c.length) desc += '.' + c.slice(0, 2).join('.');
    if (n.tagName === 'IMG' || n.tagName === 'VIDEO') {
      var src = (n.getAttribute('src') || n.dataset.video || n.dataset.full || '').split('/').pop();
      if (src) desc += ' → ' + src;
      return desc;
    }
    var t = (n.textContent || '').replace(/\s+/g, ' ').trim();
    if (t) desc += ' → “' + t.slice(0, 56) + (t.length > 56 ? '…' : '') + '”';
    return desc;
  }

  /* retângulo do elemento em coordenadas de palco */
  function caixaNoPalco(n) {
    var r = stage.getBoundingClientRect();
    var b = n.getBoundingClientRect();
    if (!b.width && !b.height) return null;
    return {
      x: (b.left - r.left) / r.width * PALCO_L,
      y: (b.top - r.top) / r.height * PALCO_A,
      w: b.width / r.width * PALCO_L,
      h: b.height / r.height * PALCO_A
    };
  }

  function descreverPonto(clientX, clientY) {
    var slide = slides[window.DECK.atual];
    if (!slide) return '';

    var pe = capa.style.pointerEvents;
    capa.style.pointerEvents = 'none';
    var alvo = document.elementFromPoint(clientX, clientY);
    capa.style.pointerEvents = pe;

    /* 1ª tentativa: quem está sob o cursor. Sobe procurando algo citável, mas
       nunca passa da <section> do slide — era aí que a primeira versão escapava
       e acabava rotulando <html>. */
    var n = alvo;
    while (n && n !== slide && n !== stage && n !== document.body) {
      if (n.matches && n.matches(SEL_UTEIS)) return rotular(n);
      n = n.parentElement;
    }

    /* 2ª tentativa, geométrica: boa parte do conteúdo do deck é invisível ao
       teste de ponteiro — a .escada inteira tem pointer-events:none, e é
       justamente o lettering grande que mais se quer comentar. Então procuro
       pela caixa que contém o ponto, pegando a MENOR (a mais específica). */
    var p = paraPalco(clientX, clientY);
    var melhor = null, menorArea = Infinity;
    [].forEach.call(slide.querySelectorAll(SEL_UTEIS), function (c) {
      var b = caixaNoPalco(c);
      if (!b) return;
      if (p.x < b.x || p.x > b.x + b.w || p.y < b.y || p.y > b.y + b.h) return;
      var area = b.w * b.h;
      if (area < menorArea) { menorArea = area; melhor = c; }
    });
    if (melhor) return rotular(melhor);

    return 'fundo do slide (nenhum elemento sob o ponto)';
  }

  function descreverArea(x, y, w, h) {
    var slide = slides[window.DECK.atual];
    if (!slide) return '';
    var achados = [], vistos = {};
    [].forEach.call(slide.querySelectorAll(SEL_UTEIS), function (n) {
      var b = caixaNoPalco(n);
      if (!b) return;
      // interseção real, não só encostar
      var ix = Math.min(x + w, b.x + b.w) - Math.max(x, b.x);
      var iy = Math.min(y + h, b.y + b.h) - Math.max(y, b.y);
      if (ix <= 2 || iy <= 2) return;
      // exige que metade do elemento esteja dentro, senão vizinhos entram na lista
      if ((ix * iy) < (b.w * b.h) * 0.5) return;
      var r = rotular(n);
      if (vistos[r]) return;
      vistos[r] = 1;
      achados.push(r);
    });
    if (!achados.length) return 'área sem elementos dentro (fundo do slide)';
    return achados.slice(0, 5).join(' · ') + (achados.length > 5 ? ' · +' + (achados.length - 5) : '');
  }

  /* ------------------------------------------------------- arraste de seleção */
  capa.addEventListener('mousedown', function (e) {
    if (!ligado || e.button !== 0) return;
    e.preventDefault();
    fecharEditor();
    var p = paraPalco(e.clientX, e.clientY);
    arraste = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, cx: e.clientX, cy: e.clientY };
    desenharTracejado();
  });

  window.addEventListener('mousemove', function (e) {
    if (!arraste) return;
    var p = paraPalco(e.clientX, e.clientY);
    arraste.x1 = p.x; arraste.y1 = p.y;
    desenharTracejado();
  });

  window.addEventListener('mouseup', function (e) {
    if (!arraste) return;
    var a = arraste; arraste = null;
    tracejado.classList.remove('is-on');

    /* O canto final sai do próprio mouseup, não do último mousemove: nem todo
       arraste entrega mousemove intermediário (arraste muito rápido, trackpad
       que agrupa eventos, automação), e nesses casos a área virava ponto. */
    var fim = paraPalco(e.clientX, e.clientY);
    a.x1 = fim.x; a.y1 = fim.y;
    a.cx = e.clientX; a.cy = e.clientY;

    var x = Math.min(a.x0, a.x1), y = Math.min(a.y0, a.y1);
    var w = Math.abs(a.x1 - a.x0), h = Math.abs(a.y1 - a.y0);
    var ponto = (w < MIN_AREA && h < MIN_AREA);

    abrirEditor({
      nova: {
        slide: window.DECK.atual,
        tipo: ponto ? 'ponto' : 'area',
        x: round(ponto ? a.x0 : x), y: round(ponto ? a.y0 : y),
        w: round(ponto ? 0 : w),   h: round(ponto ? 0 : h),
        alvo: ponto ? descreverPonto(a.cx, a.cy) : descreverArea(x, y, w, h)
      }
    }, e.clientX, e.clientY);
  });

  function desenharTracejado() {
    var a = arraste;
    var x = Math.min(a.x0, a.x1), y = Math.min(a.y0, a.y1);
    var w = Math.abs(a.x1 - a.x0), h = Math.abs(a.y1 - a.y0);
    tracejado.classList.add('is-on');
    tracejado.style.left = x + 'px';
    tracejado.style.top = y + 'px';
    tracejado.style.width = w + 'px';
    tracejado.style.height = h + 'px';
    tracejado.firstChild.textContent = Math.round(w) + ' × ' + Math.round(h);
  }
  function round(v) { return Math.round(v * 10) / 10; }

  /* ------------------------------------------------------------------ editor */
  function abrirEditor(alvo, clientX, clientY) {
    edicao = alvo;
    var c = alvo.id ? achar(alvo.id) : alvo.nova;
    if (!c) return;

    editor.querySelector('[data-rv="ed-titulo"]').textContent =
      alvo.id ? ('Marcação ' + c.n) : 'Nova marcação';
    editor.querySelector('[data-rv="ed-meta"]').textContent =
      'slide ' + (c.slide + 1) + ' · ' + (c.tipo === 'area'
        ? Math.round(c.w) + '×' + Math.round(c.h)
        : 'ponto');
    editor.querySelector('[data-rv="ed-apagar"]').style.display = alvo.id ? '' : 'none';
    editor.querySelector('[data-rv="ed-resolver"]').style.display = alvo.id ? '' : 'none';
    editor.querySelector('[data-rv="ed-resolver"]').classList.toggle('rv-forte', !!c.resolvido);
    campo.value = c.texto || '';

    editor.classList.add('is-on');
    posicionarEditor(clientX, clientY);
    campo.focus();
    campo.setSelectionRange(campo.value.length, campo.value.length);
  }

  function posicionarEditor(clientX, clientY) {
    var rv = viewport.getBoundingClientRect();
    var re = editor.getBoundingClientRect();
    var x = (clientX != null ? clientX : rv.left + rv.width / 2) - rv.left + 14;
    var y = (clientY != null ? clientY : rv.top + rv.height / 2) - rv.top + 14;
    // não deixa escapar da janela
    x = clamp(x, 12, Math.max(12, rv.width - re.width - 12));
    y = clamp(y, 12, Math.max(12, rv.height - re.height - 12));
    editor.style.left = x + 'px';
    editor.style.top = y + 'px';
  }

  function fecharEditor() {
    editor.classList.remove('is-on');
    edicao = null;
  }

  function salvarEditor() {
    if (!edicao) return;
    var texto = campo.value.trim();

    if (edicao.id) {
      var c = achar(edicao.id);
      if (!c) return fecharEditor();
      if (!texto) { apagar(edicao.id); return; }   // esvaziar o texto apaga
      c.texto = texto;
    } else {
      if (!texto) { fecharEditor(); return; }      // nada escrito: não cria
      var nova = edicao.nova;
      nova.id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      nova.n = proximoNumero();
      nova.texto = texto;
      nova.resolvido = false;
      nova.criado = new Date().toISOString();
      dados.comentarios.push(nova);
    }
    salvar();
    fecharEditor();
    render();
  }

  editor.addEventListener('click', function (e) {
    var b = e.target.closest('[data-rv]');
    if (!b) return;
    e.stopPropagation();
    var acao = b.getAttribute('data-rv');
    if (acao === 'ed-salvar') salvarEditor();
    else if (acao === 'ed-apagar' && edicao && edicao.id) apagar(edicao.id);
    else if (acao === 'ed-resolver' && edicao && edicao.id) {
      var c = achar(edicao.id);
      if (c) { c.resolvido = !c.resolvido; salvar(); b.classList.toggle('rv-forte', c.resolvido); render(); }
    }
  });

  function achar(id) {
    return dados.comentarios.filter(function (c) { return c.id === id; })[0];
  }
  function apagar(id) {
    dados.comentarios = dados.comentarios.filter(function (c) { return c.id !== id; });
    salvar(); fecharEditor(); render();
    toast('Marcação apagada.');
  }

  /* ---------------------------------------------------------------- desenho */
  function render() {
    // marcações do slide atual (resolvidas só entram se o filtro estiver ligado)
    pinos.innerHTML = '';
    var i = window.DECK.atual;
    visiveis().filter(function (c) { return c.slide === i; }).forEach(function (c) {
      var m = el('div', { 'data-id': c.id, 'data-nonav': '' });
      m.className = 'rv-marca rv-marca--' + c.tipo + (c.resolvido ? ' is-resolvida' : '');
      m.style.left = c.x + 'px';
      m.style.top = c.y + 'px';
      if (c.tipo === 'area') { m.style.width = c.w + 'px'; m.style.height = c.h + 'px'; }
      var n = el('div');
      n.className = 'rv-marca__n';
      n.innerHTML = '<strong>' + c.n + '</strong>' +
        (c.tipo === 'area' ? '<em>' + escapar(primeiraLinha(c.texto)) + '</em>' : '');
      m.appendChild(n);
      m.title = c.texto;
      m.addEventListener('mousedown', function (e) { e.stopPropagation(); });
      m.addEventListener('click', function (e) {
        e.stopPropagation();
        abrirEditor({ id: c.id }, e.clientX, e.clientY);
      });
      pinos.appendChild(m);
    });

    // contador da barra
    var pend = dados.comentarios.length - resolvidas().length;
    bar.querySelector('[data-rv="conta"]').textContent =
      dados.comentarios.length === 0 ? 'nenhuma'
        : (pend + ' aberta' + (pend === 1 ? '' : 's'));

    // botão das resolvidas: só existe quando há resolvida
    var nRes = resolvidas().length;
    var bRes = bar.querySelector('[data-rv="resolvidas"]');
    bRes.hidden = nRes === 0;
    bRes.classList.toggle('is-on', verResolvidas && nRes > 0);
    bar.querySelector('[data-rv="resolvidas-txt"]').textContent =
      (verResolvidas ? 'Ocultar ' : 'Ver ') + nRes + ' resolvida' + (nRes === 1 ? '' : 's');

    renderLista();
    medirEscala();
  }

  function renderLista() {
    lista.innerHTML = '';
    if (!dados.comentarios.length) {
      var v = el('div'); v.className = 'rv-vazio';
      v.textContent = 'Nenhuma marcação ainda. Ligue o modo revisão e arraste sobre o slide para marcar uma área.';
      lista.appendChild(v);
      return;
    }

    var itens = visiveis();
    var nRes = resolvidas().length;

    // aviso de quantas estão escondidas, clicável — o mesmo efeito do botão da barra
    if (nRes && !verResolvidas) {
      var av = el('button', { type: 'button', 'data-rv': 'resolvidas' });
      av.className = 'rv-oculto';
      av.textContent = nRes + ' resolvida' + (nRes === 1 ? '' : 's') + ' escondida' +
                       (nRes === 1 ? '' : 's') + ' — mostrar';
      lista.appendChild(av);
    }

    if (!itens.length) {
      var t = el('div'); t.className = 'rv-vazio';
      t.textContent = 'Tudo resolvido por aqui.';
      lista.appendChild(t);
      return;
    }

    // agrupa por slide, na ordem do deck
    var porSlide = {};
    itens.forEach(function (c) {
      (porSlide[c.slide] = porSlide[c.slide] || []).push(c);
    });
    Object.keys(porSlide).map(Number).sort(function (a, b) { return a - b; }).forEach(function (i) {
      var g = el('div'); g.className = 'rv-grupo';
      g.textContent = 'Slide ' + pad(i + 1) + ' — ' + tituloDe(i);
      lista.appendChild(g);

      porSlide[i].sort(function (a, b) { return a.n - b.n; }).forEach(function (c) {
        var it = el('div', { 'data-id': c.id });
        it.className = 'rv-item' + (c.resolvido ? ' is-resolvida' : '');
        it.innerHTML =
          '<div class="rv-item__n">' + c.n + '</div>' +
          '<div class="rv-item__c">' +
            '<div class="rv-item__t">' + escapar(c.texto) + '</div>' +
            '<div class="rv-item__m">' +
              '<span>' + (c.tipo === 'area' ? 'área ' + Math.round(c.w) + '×' + Math.round(c.h) : 'ponto') + '</span>' +
              (c.alvo ? '<span>' + escapar(c.alvo.slice(0, 54)) + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="rv-item__acoes">' +
            '<button type="button" data-rv="ok" title="Resolvida">✓</button>' +
            '<button type="button" data-rv="del" title="Apagar">×</button>' +
          '</div>';
        it.addEventListener('click', function (e) {
          var b = e.target.closest('[data-rv]');
          if (b) {
            e.stopPropagation();
            if (b.getAttribute('data-rv') === 'ok') { c.resolvido = !c.resolvido; salvar(); render(); }
            else apagar(c.id);
            return;
          }
          irEDestacar(c);
        });
        lista.appendChild(it);
      });
    });
  }

  function irEDestacar(c) {
    if (window.DECK.atual !== c.slide) window.DECK.irPara(c.slide);
    if (!ligado) alternarModo(true);
    setTimeout(function () {
      var m = pinos.querySelector('[data-id="' + c.id + '"]');
      if (m) { m.classList.add('is-foco'); setTimeout(function () { m.classList.remove('is-foco'); }, 3000); }
    }, 240);
  }

  function tituloDe(i) { return (slides[i] && slides[i].dataset.titulo) || '—'; }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function primeiraLinha(t) {
    var s = (t || '').split('\n')[0];
    return s.length > 44 ? s.slice(0, 44) + '…' : s;
  }
  function escapar(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* -------------------------------------------------------------- relatório */
  function montarMarkdown() {
    var agora = new Date();
    var pend = dados.comentarios.filter(function (c) { return !c.resolvido; }).length;
    var L = [];
    L.push('# Revisão — WT.AG Credenciais 2026');
    L.push('');
    L.push('Gerado em ' + agora.toLocaleString('pt-BR') + '  ');
    L.push(dados.comentarios.length + ' marcações · ' + pend + ' abertas · ' +
           (dados.comentarios.length - pend) + ' resolvidas');
    L.push('');
    L.push('Coordenadas no espaço do palco (1920×1080), origem no canto superior esquerdo.');
    L.push('');

    if (!dados.comentarios.length) {
      L.push('_Nenhuma marcação._');
    } else {
      var porSlide = {};
      dados.comentarios.forEach(function (c) { (porSlide[c.slide] = porSlide[c.slide] || []).push(c); });
      Object.keys(porSlide).map(Number).sort(function (a, b) { return a - b; }).forEach(function (i) {
        L.push('---');
        L.push('');
        L.push('## Slide ' + pad(i + 1) + ' — ' + tituloDe(i));
        L.push('');
        porSlide[i].sort(function (a, b) { return a.n - b.n; }).forEach(function (c) {
          var onde = c.tipo === 'area'
            ? 'área x ' + c.x + ' · y ' + c.y + ' · ' + Math.round(c.w) + '×' + Math.round(c.h)
            : 'ponto x ' + c.x + ' · y ' + c.y;
          L.push('### ' + c.n + '. ' + (c.resolvido ? '~~' : '') +
                 onde + (c.resolvido ? '~~ ✓ resolvida' : ''));
          L.push('');
          L.push(c.texto.split('\n').map(function (l) { return '> ' + l; }).join('\n'));
          L.push('');
          if (c.alvo) {
            L.push((c.tipo === 'area' ? 'A área cobre: ' : 'Elemento no ponto: ') + '`' + c.alvo + '`');
            L.push('');
          }
        });
      });
    }

    L.push('---');
    L.push('');
    L.push('<details><summary>Dados para reimportar no modo revisão</summary>');
    L.push('');
    L.push('```json');
    L.push(JSON.stringify(dados));
    L.push('```');
    L.push('');
    L.push('</details>');
    L.push('');
    return L.join('\n');
  }

  function baixar(nome, conteudo, tipo) {
    var b = new Blob([conteudo], { type: tipo + ';charset=utf-8' });
    var u = URL.createObjectURL(b);
    var a = document.createElement('a');
    a.href = u; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 1500);
  }
  function selo2() {
    var d = new Date(), p = function (n) { return n < 10 ? '0' + n : n; };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }

  function exportar() {
    if (!dados.comentarios.length) return toast('Nada para exportar ainda.');
    baixar('revisao-credenciais-' + selo2() + '.md', montarMarkdown(), 'text/markdown');
    toast('Relatório baixado. Me manda esse arquivo.');
  }
  function exportarJson() {
    if (!dados.comentarios.length) return toast('Nada para exportar ainda.');
    baixar('revisao-credenciais-' + selo2() + '.json', JSON.stringify(dados, null, 2), 'application/json');
    toast('Backup .json baixado.');
  }
  function copiar() {
    if (!dados.comentarios.length) return toast('Nada para copiar ainda.');
    var txt = montarMarkdown();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(
        function () { toast('Texto copiado. Cole na conversa.'); },
        function () { copiarNaMao(txt); }
      );
    } else copiarNaMao(txt);
  }
  function copiarNaMao(txt) {
    var t = document.createElement('textarea');
    t.value = txt;
    t.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(t); t.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    t.remove();
    toast(ok ? 'Texto copiado. Cole na conversa.' : 'Não consegui copiar — use "Baixar relatório".');
  }

  arqJson.addEventListener('change', function () {
    var f = arqJson.files && arqJson.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var o = JSON.parse(String(fr.result));
        if (!o || !Array.isArray(o.comentarios)) throw new Error('formato inesperado');
        dados = o; salvar(); render();
        toast(o.comentarios.length + ' marcações importadas.');
      } catch (e) {
        toast('Arquivo inválido — esperava o .json exportado aqui.');
      }
      arqJson.value = '';
    };
    fr.readAsText(f);
  });

  /* ----------------------------------------------------------------- ações */
  function alternarModo(forcar) {
    ligado = (forcar != null) ? !!forcar : !ligado;
    document.body.classList.toggle('rv-on', ligado);
    bar.querySelector('[data-rv="modo"]').classList.toggle('is-on', ligado);
    if (!ligado) { fecharEditor(); tracejado.classList.remove('is-on'); arraste = null; }
    else toast('Modo revisão ligado — arraste para marcar uma área, clique para um ponto. Setas mudam de slide.');
    render();
  }
  function alternarPainel(forcar) {
    var abrir = (forcar != null) ? !!forcar : !painel.classList.contains('is-on');
    painel.classList.toggle('is-on', abrir);
  }

  bar.addEventListener('click', function (e) {
    var b = e.target.closest('[data-rv]');
    if (!b) return;
    e.stopPropagation();
    var a = b.getAttribute('data-rv');
    if (a === 'modo') alternarModo();
    else if (a === 'lista') alternarPainel();
    else if (a === 'exportar') exportar();
    else if (a === 'resolvidas') definirVerResolvidas(!verResolvidas);
  });

  painel.addEventListener('click', function (e) {
    if (e.target.closest('.rv-fechar')) { e.stopPropagation(); alternarPainel(false); return; }
    // o aviso "N resolvidas escondidas" vive na lista, não no pé do painel
    var oc = e.target.closest('.rv-oculto');
    if (oc) { e.stopPropagation(); definirVerResolvidas(true); return; }
    var b = e.target.closest('.rv-pe [data-rv]');
    if (!b) { e.stopPropagation(); return; }   // clique dentro do painel nunca navega
    e.stopPropagation();
    var a = b.getAttribute('data-rv');
    if (a === 'exportar') exportar();
    else if (a === 'copiar') copiar();
    else if (a === 'json') exportarJson();
    else if (a === 'importar') arqJson.click();
    else if (a === 'limpar') {
      if (!dados.comentarios.length) return toast('Já está vazio.');
      if (window.confirm('Apagar todas as ' + dados.comentarios.length + ' marcações? Exporte antes se quiser guardar.')) {
        dados = { versao: 1, comentarios: [] }; salvar(); render();
        toast('Tudo apagado.');
      }
    }
  });

  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3600);
  }

  /* --------------------------------------------------------------- teclado
     Fase de captura: o deck.js escuta em bubbling, então parar aqui impede que
     ele interprete a digitação como atalho de navegação. */
  document.addEventListener('keydown', function (e) {
    var dentroDaUI = e.target.closest &&
      e.target.closest('#rv-editor, #rv-painel, #rv-bar');

    if (dentroDaUI) {
      e.stopPropagation();                     // deck.js não vê nada disso
      if (e.key === 'Escape') { fecharEditor(); alternarPainel(false); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); salvarEditor(); }
      return;
    }

    if (e.key === 'r' || e.key === 'R') { e.stopPropagation(); e.preventDefault(); alternarModo(); return; }
    if (e.key === 'l' || e.key === 'L') { e.stopPropagation(); e.preventDefault(); alternarPainel(); return; }
    if (e.key === 'v' || e.key === 'V') {
      e.stopPropagation(); e.preventDefault();
      if (resolvidas().length) definirVerResolvidas(!verResolvidas);
      else toast('Nenhuma marcação resolvida ainda.');
      return;
    }
    if (e.key === 'Escape' && (editor.classList.contains('is-on') || painel.classList.contains('is-on'))) {
      e.stopPropagation(); e.preventDefault();
      fecharEditor(); alternarPainel(false);
      return;
    }
  }, true);

  /* ------------------------------------------------- reagir à troca de slide
     O deck.js não emite evento de navegação, então observo a classe is-active.

     O filtro por slideVisivel é essencial: o deck mexe na classe dos slides
     várias vezes por transição (is-entering, is-active, is-leaving e a remoção
     de is-leaving 560ms depois). Reagir a todas fechava o editor sozinho quando
     a pessoa marcava uma área logo depois de trocar de slide. */
  var slideVisivel = window.DECK.atual;
  var mo = new MutationObserver(function () {
    var agora = window.DECK.atual;
    if (agora === slideVisivel) return;      // mexeu na classe, mas é o mesmo slide
    slideVisivel = agora;
    fecharEditor();
    render();
  });
  slides.forEach(function (s) {
    mo.observe(s, { attributes: true, attributeFilter: ['class'] });
  });

  /* ------------------------------------------------------------------ start */
  render();
  console.info('[revisão] pronto — ' + dados.comentarios.length +
               ' marcações. R liga o modo, L abre a lista.');
})();
