/* ============================================================================
   WT.AG — CREDENCIAIS 2026 · motor do deck
   Navegação slide a slide + coreografia de entrada declarativa (data-enter).
   Vanilla JS, sem dependências, roda em file://
   ========================================================================= */
(function () {
  'use strict';

  var W = 1920, H = 1080;
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)');

  var stage    = document.getElementById('stage');
  var viewport = document.getElementById('viewport');
  var ui       = document.getElementById('ui');
  var sumario  = document.getElementById('sumario');
  var lb       = document.getElementById('lb');
  var txtpanel = document.getElementById('txtpanel');
  var loader   = document.getElementById('loader');
  /* `:not([data-oculto])` é o que tira um slide da apresentação sem apagá-lo.
     O slide dos clientes do Grupo WE saiu por decisão de conteúdo — quem abre a
     apresentação são as marcas parceiras da WT.AG, no slide próprio. O markup
     fica no HTML, então voltar é remover um atributo. */
  var slides   = [].slice.call(document.querySelectorAll('.slide:not([data-oculto])'));

  /* Nomes dos atos. Vivem aqui e não no DOM, então o i18n não os alcança
     percorrendo elementos — a tradução é consultada na hora de escrever. */
  var ATOS = {
    abertura:  'Abertura',
    we:        'Grupo WE',
    trans:     'Transição',
    wtag:      'WT.AG',
    cases:     'Cases',
    estrutura: 'Estrutura'
  };
  function nomeAto(k) {
    var pt = ATOS[k] || k;
    if (document.documentElement.lang !== 'en') return pt;
    return (window.DIC_EN && window.DIC_EN[pt]) || pt;
  }

  var atual = 0, animando = false, filaNav = null, idleTimer = null;

  /* ------------------------------------------------------------ escala 16:9 */
  function escalar() {
    var s = Math.min(window.innerWidth / W, window.innerHeight / H);
    stage.style.setProperty('--escala', s);
  }
  window.addEventListener('resize', escalar);
  /* No celular o `resize` não é suficiente. Girar o aparelho dispara
     orientationchange e o innerHeight só estabiliza alguns frames depois, então
     medir na hora dá a escala da orientação ANTIGA. E no iOS a barra de endereço
     que recolhe muda a altura sem disparar resize — quem acusa isso é o
     visualViewport. Sem estes dois, girar o aparelho deixava o palco com a
     escala errada até tocar na tela. */
  window.addEventListener('orientationchange', function () {
    escalar();
    setTimeout(escalar, 120);
    setTimeout(escalar, 400);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', escalar);
  }
  escalar();

  /* --------------------------------------------- preparação da coreografia */
  /* Lê data-delay / data-stagger e grava --d em cada elemento animado.
     A animação em si é 100% CSS: basta a classe .is-played no slide.        */
  function prepararSlide(slide) {
    if (slide.dataset.pronto) return;

    // grupos com stagger: distribui o atraso entre os filhos diretos animáveis
    [].forEach.call(slide.querySelectorAll('[data-stagger]'), function (grupo) {
      var passo  = parseFloat(grupo.dataset.stagger) || 60;
      var inicio = parseFloat(grupo.dataset.delay) || 0;
      var ordem  = grupo.dataset.order || 'seq';
      var filhos = [].filter.call(grupo.children, function (el) {
        return el.hasAttribute('data-enter') || el.classList.contains('ln') ||
               el.classList.contains('we-logo-cli') || el.classList.contains('s15__logo') ||
               el.tagName === 'SPAN' || el.tagName === 'DIV';
      });
      var idx = filhos.map(function (_, i) { return i; });
      if (ordem === 'random') {
        // mural orgânico: atrasos embaralhados de forma determinística
        idx = idx.map(function (i) { return { i: i, k: (Math.sin(i * 12.9898) * 43758.5453) % 1 }; })
                 .sort(function (a, b) { return a.k - b.k; })
                 .map(function (o) { return o.i; });
      }
      filhos.forEach(function (el, i) {
        var pos = idx.indexOf(i);
        el.style.setProperty('--d', (inicio + pos * passo) + 'ms');
      });
    });

    // atrasos individuais
    [].forEach.call(slide.querySelectorAll('[data-delay]'), function (el) {
      if (el.hasAttribute('data-stagger')) return;
      el.style.setProperty('--d', parseFloat(el.dataset.delay) + 'ms');
    });

    // registra o texto original de cada alvo da roleta e o esconde até a entrada
    [].forEach.call(slide.querySelectorAll(ALVOS_RL), function (el) {
      if (el.dataset.rlTexto == null) el.dataset.rlTexto = el.textContent.trim();
      el.style.visibility = 'hidden';
    });

    slide.dataset.pronto = '1';
  }

  /* ------------------------------------------------------------- contadores */
  function animarContagem(el) {
    var alvo = parseFloat(el.dataset.countTo);
    var dur  = parseFloat(el.dataset.countDur) || 1100;
    var dec  = parseInt(el.dataset.countDec || '0', 10);
    var pre  = el.dataset.countPre || '';
    var pos  = el.dataset.countPos || '';
    var sep  = el.dataset.countSep === '1';
    if (isNaN(alvo)) return;

    if (reduz.matches) { el.textContent = pre + fmt(alvo) + pos; return; }

    var t0 = null;
    function fmt(v) {
      /* O separador acompanha o idioma: em português 50.143 e 4,7; em inglês
         50,143 e 4.7. Estava fixo em pt-BR, o que ficaria errado com o deck em
         inglês — e "50.143" lido por um estrangeiro é cinquenta, não cinquenta
         mil. Os milhares só aparecem em quem pede data-count-sep. */
      var en = document.documentElement.lang === 'en';
      var milhar = en ? ',' : '.';
      var decimal = en ? '.' : ',';
      var s = dec > 0 ? v.toFixed(dec) : String(Math.round(v));
      if (dec > 0) s = s.replace('.', decimal);
      if (sep) {
        var p = s.split(decimal);
        p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, milhar);
        s = p.join(decimal);
      }
      return s;
    }
    function passo(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + fmt(alvo * e) + pos;
      if (p < 1) requestAnimationFrame(passo);
    }
    el.textContent = pre + fmt(0) + pos;
    requestAnimationFrame(passo);
  }

  /* ------------------------------------------------- transição de texto "roleta"
     Referência: abertura do showreel WT.AG e vídeo principal de wt.ag.
     Cada caractere ganha uma máscara retangular da altura exata da maiúscula e
     da largura exata do próprio glifo; o caractere novo entra girando de baixo
     para cima dentro dessa máscara, com stagger entre as posições.            */
  var ALVOS_RL = '.escada .ln, .cta__main > span, .rl-alvo';
  var GLIFOS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function sorteia() { return GLIFOS.charAt(Math.floor(Math.random() * GLIFOS.length)); }

  /* O texto final é escrito de verdade no elemento (métricas e kerning
     corretos) e fica invisível; as máscaras são sobrepostas em posição
     ABSOLUTA, medidas caractere a caractere com Range. Assim o layout nunca
     muda e, ao fim da animação, nada se move: o glifo já está no lugar. */
  function roleta(el, novo, opts) {
    opts = opts || {};
    // atenção: 0 é valor válido para "voltas" (entrada sutil, sem giro) —
    // por isso o teste é contra null/undefined, não com ||
    var dur     = opts.dur     == null ? 560 : opts.dur;
    var stagger = opts.stagger == null ? 52  : opts.stagger;
    var voltas  = opts.voltas  == null ? 4   : opts.voltas;   // glifos intermediários
    var antigo   = el.dataset.rlAtual || '';
    el.dataset.rlAtual = novo;

    if (reduz.matches) { el.textContent = novo; opts.aoFim && opts.aoFim(); return function () {}; }

    // 1) escreve o texto DEFINITIVO: é ele que define o layout do começo ao fim
    limparRoleta(el);
    var cor = getComputedStyle(el).color;        // cor real, antes de silenciar
    el.textContent = novo;
    el.classList.add('rl-mudo');                 // texto invisível, mas ocupa o espaço

    /* A máscara tem exatamente a altura de UMA célula (o em-box do glifo:
       asc 1,005 + desc 0,295 = 1,3em). Assim, em repouso, a célula visível
       coincide com a máscara e NENHUMA parte do glifo é cortada — nada de
       "borda cortada" sobrando no fim da animação. Durante o giro, vê-se um
       pedaço da célula seguinte entrando, que é justamente o efeito de roleta.

       opts.aperta (em fração do corpo) troca essa máscara "de em-box inteiro"
       por uma máscara de ALTURA DE MAIÚSCULA + respiro. Serve só para texto
       garantidamente em caixa-alta e sem acento nem descendente — é o caso do
       wordmark do slide 06 (AGENCY / SOCIAL / MEDIA / CREATIVE / INFLUENCER e
       os glifos intermediários, todos A–Z0–9). A janela fica bem menor e a
       troca de palavra sai mais direta, sem cortar tinta.
       CAP = 0,710em nas duas famílias (Geist e Special Gothic, OS/2). */
    var fs    = parseFloat(getComputedStyle(el).fontSize);
    var cell  = fs * 1.3;
    var ASC   = 1.005 * fs;                      // linha-base dentro da célula
    var CAP   = 0.710 * fs;
    var maskH, base;                             // base = topo da máscara → linha-base
    if (opts.aperta) {
      var respiro = opts.aperta * fs;
      maskH = CAP + 2 * respiro;
      base  = respiro + CAP;
    } else {
      maskH = cell;
      base  = ASC;
    }

    // 2) mede caractere a caractere o texto real e sobrepõe uma máscara em cada
    var no = el.firstChild;
    var rEl = el.getBoundingClientRect();
    var escala = el.offsetWidth ? rEl.width / el.offsetWidth : 1;      // palco escalado
    if (!escala) escala = 1;

    var ov = document.createElement('span');
    ov.className = 'rl-ov';
    ov.style.color = cor;
    var reels = [];

    for (var i = 0; i < novo.length; i++) {
      var ch = novo.charAt(i);
      if (ch === ' ') continue;

      var rg = document.createRange();
      rg.setStart(no, i); rg.setEnd(no, i + 1);
      var rc = rg.getBoundingClientRect();
      if (!rc.width) continue;

      var folga = 0.18 * fs;                      // respiro lateral: nada de tinta cortada
      var x  = (rc.left - rEl.left) / escala - folga;
      var w  = rc.width / escala + folga * 2;
      var bl = (rc.top - rEl.top) / escala + ASC;                     // linha-base local
      var topoMask = bl - base;                                       // topo da janela

      var celulas = [antigo.charAt(i) || ' '];
      for (var v = 0; v < voltas; v++) celulas.push(sorteia());
      celulas.push(ch);

      var wrap = document.createElement('span');
      wrap.className = 'rl';
      wrap.style.left   = x + 'px';
      wrap.style.top    = topoMask + 'px';
      wrap.style.width  = w + 'px';
      wrap.style.height = maskH + 'px';

      var reel = document.createElement('span');
      reel.className = 'rl__reel';
      celulas.forEach(function (c) {
        var it = document.createElement('i');
        it.textContent = c;
        reel.appendChild(it);
      });

      // Desloca o carretel para que a linha-base da célula k caia na linha-base
      // real. Dentro do carretel, a linha-base da célula k está a k·cell + ASC
      // do topo; a linha-base tem de cair a `base` do topo da máscara.
      var yPara = function (k) { return base - ASC - k * cell; };
      wrap.style.setProperty('--rl-cell', cell + 'px');
      wrap.style.setProperty('--rl-pad', folga + 'px');
      wrap.style.setProperty('--rl-y0', yPara(0) + 'px');
      wrap.style.setProperty('--rl-y1', yPara(celulas.length - 1) + 'px');
      wrap.style.setProperty('--rl-dur', dur + 'ms');
      wrap.style.setProperty('--rl-delay', Math.round(i * stagger + (i % 3) * 14) + 'ms');

      wrap.appendChild(reel);
      ov.appendChild(wrap);
      reels.push(wrap);
    }
    el.appendChild(ov);

    var raf = requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        reels.forEach(function (r) { r.classList.add('is-girando'); });
      });
    });

    /* 3) A camada sai no instante EXATO em que a última transição termina
          (transitionend), com um fallback curto por segurança. Assim não sobra
          máscara nenhuma depois do glifo já estar no lugar. */
    var ultimo = reels[reels.length - 1];
    var fim = false;
    function encerrar() {
      if (fim) return; fim = true;
      clearTimeout(t);
      if (ultimo) ultimo.removeEventListener('transitionend', encerrar);
      limparRoleta(el);
      opts.aoFim && opts.aoFim();
    }
    if (ultimo) ultimo.addEventListener('transitionend', encerrar);
    var atrasoUltimo = (reels.length - 1) * stagger + ((reels.length - 1) % 3) * 14;
    var t = setTimeout(encerrar, dur + atrasoUltimo + 40);

    return function cancelar() { cancelAnimationFrame(raf); clearTimeout(t); limparRoleta(el); };
  }

  function limparRoleta(el) {
    for (var i = el.children.length - 1; i >= 0; i--) {
      if (el.children[i].className === 'rl-ov') el.removeChild(el.children[i]);
    }
    el.classList.remove('rl-mudo');
  }

  /* --------------------------------------- slide 06 · loop do wordmark WT.AG
     Palavras depois do "WT." trocam com a roleta; ao fim entra o logotipo
     oficial (SVG) grande na tela; sai o logotipo e o ciclo reinicia.        */
  var VARIANTES = ['AGENCY', 'SOCIAL', 'MEDIA', 'CREATIVE', 'INFLUENCER'];

  function iniciarLoopWordmark(slide) {
    pararLoopWordmark(slide);
    var vario = slide.querySelector('.s06__var, .capa__var');
    if (!vario) return;
    /* Na capa a sequência roda UMA vez e para no logotipo. É a mesma roleta —
       mesmas palavras, mesmo giro, mesma cascata das três faixas do vetor — só
       não reinicia: a capa é tela de leitura, e um loop ao lado do texto de
       instruções briga com ele pela atenção. */
    var umaVez = !!slide.dataset.wordmarkUmaVez;
    var vivo = { ok: true, timers: [] };
    slide._wordmark = vivo;

    function espera(ms, fn) {
      if (!vivo.ok) return;
      vivo.timers.push(setTimeout(function () { if (vivo.ok) fn(); }, ms));
    }
    function ciclo() {
      if (!vivo.ok) return;
      slide.classList.remove('mostra-logo', 'saindo');
      vario.dataset.rlAtual = '';
      vario.textContent = '';
      var i = 0;
      function proxima() {
        if (!vivo.ok) return;
        if (i >= VARIANTES.length) {
          // da última variante vai DIRETO para o logotipo grande — o wordmark
          // pequeno "WT.AG" nunca aparece aqui.
          espera(300, function () {
            slide.classList.add('mostra-logo');
            if (umaVez) return;                        // assenta e fica
            espera(2500, function () {
              // limpa a palavra ENQUANTO ainda está escondida: sem isso o
              // "WT.INFLUENCER" pisca de volta na saída do logotipo
              vario.textContent = '';
              vario.dataset.rlAtual = '';
              slide.classList.add('saindo');            // logotipo e degradê saem
              espera(660, function () {
                slide.classList.remove('mostra-logo');  // volta ao estado inicial
                slide.classList.remove('saindo');
                espera(260, ciclo);                     // loop
              });
            });
          });
          return;
        }
        var v = VARIANTES[i++];
        // aperta: máscara de altura-de-maiúscula + respiro (não de em-box
        // inteiro) — a troca fica mais direta, sem cortar a palavra
        roleta(vario, v, { dur: 380, stagger: 30, voltas: 3, aperta: 0.11 });
        espera(380 + v.length * 30 + 150, proxima);
      }
      // o ciclo reabre em "WT." sozinho e a primeira palavra a entrar é AGENCY
      espera(reduz.matches ? 120 : 300, proxima);
    }
    ciclo();
  }
  function pararLoopWordmark(slide) {
    var v = slide._wordmark;
    if (!v) return;
    v.ok = false;
    v.timers.forEach(clearTimeout);
    slide._wordmark = null;
  }

  /* ------------------------------------------------------- ciclo de vida do slide */
  function tocarEntrada(slide) {
    prepararSlide(slide);
    ativarInteracoes(slide);
    // força reflow para reiniciar as transições CSS
    void slide.offsetWidth;
    slide.classList.add('is-played');

    [].forEach.call(slide.querySelectorAll('[data-count-to]'), function (el) {
      var atraso = parseFloat(el.dataset.delay) || 0;
      setTimeout(function () { animarContagem(el); }, atraso);
    });

    /* Vídeo com data-src só ganha o src ao entrar no slide. O showreel aponta
       para um arquivo de 70,6 MB e tinha src fixo no HTML: mesmo com
       preload="metadata" isso é um elemento de mídia vivo desde a carga, em
       toda sessão, mesmo para quem nunca chega no slide 14. As sedes já faziam
       assim; agora vale para qualquer vídeo do deck. */
    [].forEach.call(slide.querySelectorAll('video[data-src]:not(.sede__vid)'), function (v) {
      if (!v.getAttribute('src')) v.setAttribute('src', v.dataset.src);
    });

    // slide 06 — loop do wordmark (roleta nas palavras + entrada do logotipo)
    if (slide.dataset.wordmarkLoop || slide.dataset.wordmarkUmaVez) iniciarLoopWordmark(slide);

    // TODOS os textos principais entram com a roleta do showreel
    [].forEach.call(slide.querySelectorAll(ALVOS_RL), function (el) {
      var alvo = el.dataset.rlTexto;
      if (alvo == null) return;
      el.dataset.rlAtual = '';
      el.textContent = '';
      var atraso = parseFloat(el.style.getPropertyValue('--d')) ||
                   parseFloat(el.dataset.delay) || 0;
      // Entrada padrão: cascata sutil — o glifo sobe UMA vez dentro da máscara,
      // sem girar por caracteres aleatórios. A roleta longa é exclusiva da capa
      // WT.AG (slide 06).
      el._timerRoleta = setTimeout(function () {
        el.style.visibility = 'visible';
        el._cancelaRoleta = roleta(el, alvo, {
          dur: parseFloat(el.dataset.rlDur) || 460,
          stagger: parseFloat(el.dataset.rlStagger) || 26,
          voltas: el.dataset.rlVoltas != null ? parseFloat(el.dataset.rlVoltas) : 0
        });
      }, atraso);
    });
    // vídeos com autoplay em loop (mudo)
    [].forEach.call(slide.querySelectorAll('video[data-autoloop]'), function (v) {
      v.currentTime = 0; v.muted = true; var p = v.play(); if (p && p.catch) p.catch(function(){});
    });
  }

  function limparSaida(slide) {
    slide.classList.remove('is-played', 'mostra-logo', 'saindo');
    [].forEach.call(slide.querySelectorAll('.tem-foco'), function (g) { g.classList.remove('tem-foco'); });
    [].forEach.call(slide.querySelectorAll('.is-foco'),  function (o) { o.classList.remove('is-foco'); });
    [].forEach.call(slide.querySelectorAll('[data-count-to]'), function (el) {
      el.textContent = (el.dataset.countPre || '') + '0' + (el.dataset.countPos || '');
    });
    pararLoopWordmark(slide);
    /* solta o src dos vídeos do slide: pausar não devolve o buffer */
    [].forEach.call(slide.querySelectorAll('video[data-src]:not(.sede__vid)'), function (v) {
      if (v.getAttribute('src')) { v.pause(); v.removeAttribute('src'); v.load(); }
      var pb = v.parentNode && v.parentNode.querySelector('.play-btn');
      if (pb) pb.classList.remove('is-hidden');
    });
    [].forEach.call(slide.querySelectorAll(ALVOS_RL), function (el) {
      clearTimeout(el._timerRoleta);
      if (el._cancelaRoleta) el._cancelaRoleta();
      el.textContent = '';
      el.dataset.rlAtual = '';
      el.style.visibility = 'hidden';
    });
    [].forEach.call(slide.querySelectorAll('video'), function (v) {
      try { v.pause(); v.currentTime = 0; } catch (e) {}
      v.classList.remove('is-tocando');
      var b = v.parentNode.querySelector('.play-btn');
      if (b) b.classList.remove('is-hidden');
    });
  }

  /* ------------------------------------------- fundo chapado que sobe na troca
     Um painel com a cor do slide novo entra por baixo e sobe cobrindo o
     anterior. Só o fundo se move; o conteúdo mantém a coreografia própria. */
  var CORES = { escuro: '#000000', claro: '#F7F9EA', laranja: '#FF4900' };
  var fundoEl = document.getElementById('fundo');
  var painelAtual = null;

  function corDoSlide(s) {
    return s.dataset.fundo || CORES[s.dataset.tom || 'escuro'] || '#000000';
  }
  function trocarFundo(slide, animar) {
    if (!fundoEl) return;
    var cor = corDoSlide(slide);
    if (painelAtual && painelAtual.dataset.cor === cor) return;   // mesma cor: nada a fazer

    var novo = document.createElement('div');
    novo.className = 'painel entrando';
    novo.dataset.cor = cor;
    novo.style.background = cor;
    fundoEl.appendChild(novo);

    var anterior = painelAtual;
    painelAtual = novo;

    if (!animar || reduz.matches) {
      novo.classList.remove('entrando');
      if (anterior) fundoEl.removeChild(anterior);
      return;
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        novo.classList.remove('entrando');
        novo.classList.add('subindo');
        if (anterior) anterior.classList.add('saindo');
      });
    });
    setTimeout(function () {
      if (anterior && anterior.parentNode) fundoEl.removeChild(anterior);
    }, 780);
  }

  /* ------------------------------------------------ foco por hover + paralaxe */
  /* O hover só passa a valer DEPOIS que o usuário mexe o mouse dentro do slide.
     Sem isso, chegar num slide com o cursor parado sobre uma caixa já entrava
     com um item destacado e os irmãos recuados, como se o mouse estivesse sendo
     usado — era o caso do slide 12. A cada troca de slide o hover volta a ficar
     travado; o primeiro movimento real destrava e, nesse mesmo instante,
     reavalia o que está sob o cursor (o mouseenter dessa entrada já passou, por
     isso a reavaliação explícita). */
  var hoverLiberado = false;
  function aplicarFoco(it) {
    var grupo = it && it.closest('[data-foco]');
    if (!grupo) return;
    var itens = [].slice.call(grupo.querySelectorAll('[data-foco-item]'));
    grupo.classList.add('tem-foco');
    itens.forEach(function (o) { o.classList.toggle('is-foco', o === it); });
  }
  function reavaliarFoco(x, y) {
    if (reduz.matches) return;
    var el = document.elementFromPoint(x, y);
    var it = el && el.closest && el.closest('[data-foco-item]');
    if (it) aplicarFoco(it);
  }
  document.addEventListener('mousemove', function (e) {
    if (hoverLiberado) return;
    hoverLiberado = true;
    reavaliarFoco(e.clientX, e.clientY);
  });

  function ativarInteracoes(raiz) {
    if (raiz.dataset.interativo) return;
    raiz.dataset.interativo = '1';

    // grupos com foco: o item sob o cursor cresce, os irmãos recuam
    [].forEach.call(raiz.querySelectorAll('[data-foco]'), function (grupo) {
      var itens = [].slice.call(grupo.querySelectorAll('[data-foco-item]'));
      itens.forEach(function (it) {
        it.addEventListener('mouseenter', function () {
          if (reduz.matches || !hoverLiberado) return;
          aplicarFoco(it);
        });
      });
      grupo.addEventListener('mouseleave', function () {
        grupo.classList.remove('tem-foco');
        itens.forEach(function (o) { o.classList.remove('is-foco'); });
      });
    });

    // paralaxe da imagem dentro da caixa
    [].forEach.call(raiz.querySelectorAll('[data-paralaxe]'), function (cx) {
      var forca = parseFloat(cx.dataset.paralaxe) || 16;
      var raf = null, alvoX = 0, alvoY = 0;
      function aplica() {
        raf = null;
        cx.style.setProperty('--px-x', alvoX.toFixed(1) + 'px');
        cx.style.setProperty('--px-y', alvoY.toFixed(1) + 'px');
      }
      cx.addEventListener('pointermove', function (e) {
        if (reduz.matches) return;
        var r = cx.getBoundingClientRect();
        if (!r.width || !r.height) return;
        alvoX = -(((e.clientX - r.left) / r.width) - 0.5) * 2 * forca;
        alvoY = -(((e.clientY - r.top) / r.height) - 0.5) * 2 * forca;
        cx.classList.add('is-movendo');
        if (!raf) raf = requestAnimationFrame(aplica);
      });
      cx.addEventListener('pointerleave', function () {
        cx.classList.remove('is-movendo');
        alvoX = alvoY = 0;
        if (!raf) raf = requestAnimationFrame(aplica);
      });
    });
  }

  /* ------------------------------------------------------------- navegação */
  function irPara(i, dir) {
    montarImagens(i);
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === atual && slides[atual].classList.contains('is-active')) return;
    if (animando) { filaNav = { i: i, dir: dir }; return; }

    var anterior = slides[atual];
    var proximo  = slides[i];
    var avancar  = dir !== undefined ? dir > 0 : i > atual;

    animando = true;
    stage.classList.toggle('deck-fwd', avancar);
    stage.classList.toggle('deck-back', !avancar);

    if (anterior && anterior !== proximo) {
      anterior.classList.add('is-leaving');
      anterior.classList.remove('is-active');
    }

    proximo.classList.add('is-entering');
    void proximo.offsetWidth;
    proximo.classList.add('is-active');
    proximo.classList.remove('is-entering');

    atual = i;
    hoverLiberado = false;          // trava o hover até o próximo movimento real
    trocarFundo(proximo, true);
    atualizarUI();
    tocarEntrada(proximo);

    var dur = reduz.matches ? 200 : 560;
    setTimeout(function () {
      if (anterior && anterior !== proximo) {
        anterior.classList.remove('is-leaving');
        limparSaida(anterior);
      }
      soltarImagens(atual);        // só agora, com a transição encerrada
      animando = false;
      if (filaNav) { var f = filaNav; filaNav = null; irPara(f.i, f.dir); }
    }, dur);

    var hash = '#slide-' + pad(i + 1);
    if (location.hash !== hash) {
      try { history.replaceState(null, '', hash); } catch (e) { location.hash = hash; }
    }
  }
  function proximo() { if (atual < slides.length - 1) irPara(atual + 1, 1); }
  function anterior() { if (atual > 0) irPara(atual - 1, -1); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------------------------------------------------------------- UI */
  var hudN   = document.querySelector('.hud__n');
  var hudAto = document.querySelector('.hud__ato');
  var dots   = [];

  function montarUI() {
    var cont = document.querySelector('.hud__dots');
    var grupoAtual = null, atoAnterior = null;
    slides.forEach(function (s, i) {
      var ato = s.dataset.ato;
      if (ato !== atoAnterior) {
        grupoAtual = document.createElement('div');
        grupoAtual.className = 'hud__grp';
        grupoAtual.title = nomeAto(ato);
        cont.appendChild(grupoAtual);
        atoAnterior = ato;
      }
      var d = document.createElement('button');
      d.className = 'dot';
      d.type = 'button';
      d.setAttribute('aria-label', 'Ir para o slide ' + (i + 1) + ' — ' + (s.dataset.titulo || ''));
      d.addEventListener('click', function (e) { e.stopPropagation(); irPara(i); });
      grupoAtual.appendChild(d);
      dots.push(d);
    });
  }

  function atualizarUI() {
    var s = slides[atual];
    hudN.textContent = pad(atual + 1) + ' / ' + pad(slides.length);
    hudAto.textContent = nomeAto(s.dataset.ato) || '';
    dots.forEach(function (d, i) {
      d.classList.toggle('is-on', i === atual);
      d.classList.toggle('is-past', i < atual);
    });
    var tom = s.dataset.tom || 'escuro';
    ui.className = 'ui--' + tom + (ui.classList.contains('is-idle') ? ' is-idle' : '');
    // cor da sobra (letterbox) = cor dominante do slide
    document.documentElement.style.setProperty('--letterbox', corDoSlide(s));
    // marca o item corrente no sumário
    [].forEach.call(sumario.querySelectorAll('li'), function (li, i) {
      li.classList.toggle('is-current', i === atual);
    });
  }

  /* ------------------------------------------------------- ocultar UI ociosa */
  function acordarUI() {
    ui.classList.remove('is-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (!sumario.classList.contains('is-open') && !lb.classList.contains('is-open')) {
        ui.classList.add('is-idle');
      }
    }, 2600);
  }
  ['mousemove', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) {
    window.addEventListener(ev, acordarUI, { passive: true });
  });

  /* ----------------------------------------------------------- tela cheia */
  function alternarTelaCheia() {
    var el = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    }
  }

  /* -------------------------------------------------------------- sumário */
  var sumCursor = 0;
  function montarSumario() {
    var cols = sumario.querySelector('.sum__cols');
    var porAto = [];
    slides.forEach(function (s, i) {
      var ato = s.dataset.ato;
      var g = porAto[porAto.length - 1];
      if (!g || g.ato !== ato) { g = { ato: ato, itens: [] }; porAto.push(g); }
      g.itens.push({ i: i, titulo: s.dataset.titulo || ('Slide ' + (i + 1)) });
    });
    var n = 0;
    porAto.forEach(function (g) {
      var div = document.createElement('div');
      div.className = 'sum__ato';
      var h = document.createElement('h4');
      h.textContent = nomeAto(g.ato);
      div.appendChild(h);
      var ol = document.createElement('ol');
      g.itens.forEach(function (it) {
        var li = document.createElement('li');
        li.style.setProperty('--d', (n * 28) + 'ms'); n++;
        var b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = '<span class="sum__n">' + pad(it.i + 1) + '</span><span class="sum__lb"></span>';
        b.querySelector('.sum__lb').textContent = it.titulo;
        b.addEventListener('click', function (e) { e.stopPropagation(); fecharSumario(); irPara(it.i); });
        li.appendChild(b);
        ol.appendChild(li);
      });
      div.appendChild(ol);
      cols.appendChild(div);
    });
  }
  function abrirSumario() {
    sumCursor = atual;
    sumario.classList.add('is-open');
    marcarCursor();
    acordarUI();
  }
  function fecharSumario() { sumario.classList.remove('is-open'); }
  function marcarCursor() {
    [].forEach.call(sumario.querySelectorAll('li'), function (li, i) {
      li.classList.toggle('is-cursor', i === sumCursor);
    });
  }

  /* ------------------------------------------------------- espia do case (15) */
  /* Hover num logo que tem case: desfoca o slide e sobe o card de prévia. Feito
     em JS e não em :has() porque o :has() resolveria o desfoque dos irmãos mas
     não a escolha de QUAL card mostrar sem uma regra por cliente. */
  document.querySelectorAll('.s15__logo--case').forEach(function (logo) {
    var slide = logo.closest('.slide');
    var img = logo.querySelector('img');
    if (!slide || !img) return;
    /* data-lazy antes de src: com a montagem por janela o caminho do arquivo
       vive em data-lazy, e o src só existe enquanto o slide está montado. Ler só
       o src dava null.split() no arranque e derrubava o deck inteiro. */
    var caminho = img.getAttribute('data-lazy') || img.getAttribute('src') || '';
    var chave = caminho.split('/').pop().replace(/\.\w+$/, '');
    var card = slide.querySelector('.espia[data-espia="' + chave + '"]');
    if (!card) return;

    function montarEspia() {
      [].forEach.call(card.querySelectorAll('img[data-lazy]'), function (img) {
        var alvo = img.getAttribute('data-lazy');
        if (img.getAttribute('src') !== alvo) img.setAttribute('src', alvo);
      });
    }

    function abrir() {
      montarEspia();
      slide.classList.add('is-espiando');
      logo.classList.add('is-alvo');
      slide.querySelectorAll('.espia.is-vendo').forEach(function (o) {
        if (o !== card) o.classList.remove('is-vendo');
      });
      card.classList.add('is-vendo');
    }
    function fechar() {
      slide.classList.remove('is-espiando');
      logo.classList.remove('is-alvo');
      card.classList.remove('is-vendo');
      /* Solta as imagens do card ao sair. Passar por todos os quatro logos
         deixava os quatro montados: 158 MB, contra 67 do slide sem hover. O
         arquivo fica no cache do navegador, então voltar ao mesmo logo é
         instantâneo — o que se libera é o bitmap decodificado, que é o recurso
         escasso no iPhone. */
      [].forEach.call(card.querySelectorAll('img[data-lazy]'), function (img) {
        img.removeAttribute('src');
      });
    }
    logo.addEventListener('mouseenter', abrir);
    logo.addEventListener('mouseleave', fechar);
    logo.addEventListener('focus', abrir);
    logo.addEventListener('blur', fechar);
  });

  /* ------------------------------------------------- esteira de repercussão */
  /* Velocidade constante em px do palco por segundo, em vez de tempo de ciclo
     fixo. A esteira anda -50% da própria largura, então o tempo tem de sair da
     largura medida: com --dur na mão, um rodapé com 7 logos passava mais rápido
     que um com 3. Mede depois das imagens carregarem, senão a largura sai errada
     (SVG sem intrínseco resolvido ainda mede 0). */
  var VEL_FITA = 24;

  function ajustarFitas() {
    document.querySelectorAll('.reperc__fita').forEach(function (fita) {
      var metade = fita.scrollWidth / 2;
      if (!metade) return;
      fita.style.setProperty('--dur', (metade / VEL_FITA).toFixed(1) + 's');
    });
  }

  function quandoCarregarem(raiz, cb) {
    var imgs = [].slice.call(raiz.querySelectorAll('.reperc__fita img'));
    var faltam = imgs.filter(function (i) { return !i.complete; });
    if (!faltam.length) { cb(); return; }
    var n = faltam.length;
    faltam.forEach(function (i) {
      var pronto = function () { if (--n === 0) cb(); };
      i.addEventListener('load', pronto, { once: true });
      i.addEventListener('error', pronto, { once: true });
    });
  }

  quandoCarregarem(document, ajustarFitas);
  window.addEventListener('load', ajustarFitas);

  /* ---------------------------------------------------------- lightbox/player */
  var lbVideo = lb.querySelector('video');
  var lbImg   = lb.querySelector('img');
  var lbCap   = lb.querySelector('.lb__cap');
  var lbProg  = lb.querySelector('.lb__prog');
  var lbBarra = lbProg.querySelector('i');
  var lbTempo = lb.querySelector('.lb__tempo');
  var lbYt    = lb.querySelector('.lb__yt');
  var lbOrigem = null;

  /* Barra de progresso própria (marcação 25 da revisão): os controles nativos
     só aparecem no hover e ficam discretos sobre imagem clara, então navegar
     pelos vídeos era difícil. Esta fica sempre visível e aceita clique e
     arraste. A classe is-video no #lb é o que a liga — no modo imagem ela e o
     contador somem. */
  function mmss(t) {
    if (!isFinite(t)) return '0:00';
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function pintarProgresso() {
    var d = lbVideo.duration;
    var f = (isFinite(d) && d > 0) ? lbVideo.currentTime / d : 0;
    lbBarra.style.width = (f * 100).toFixed(3) + '%';
    lbTempo.textContent = mmss(lbVideo.currentTime) + ' / ' + mmss(d);
  }
  ['timeupdate', 'loadedmetadata', 'durationchange', 'seeked'].forEach(function (ev) {
    lbVideo.addEventListener(ev, pintarProgresso);
  });

  function buscarPor(clientX) {
    var r = lbProg.getBoundingClientRect();
    var d = lbVideo.duration;
    if (!isFinite(d) || d <= 0 || !r.width) return;
    var f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    lbVideo.currentTime = f * d;
    pintarProgresso();
  }
  var arrastando = false;
  lbProg.addEventListener('pointerdown', function (e) {
    e.stopPropagation(); arrastando = true;
    if (lbProg.setPointerCapture) { try { lbProg.setPointerCapture(e.pointerId); } catch (x) {} }
    buscarPor(e.clientX);
  });
  lbProg.addEventListener('pointermove', function (e) { if (arrastando) buscarPor(e.clientX); });
  ['pointerup', 'pointercancel'].forEach(function (ev) {
    lbProg.addEventListener(ev, function () { arrastando = false; });
  });
  lbProg.addEventListener('click', function (e) { e.stopPropagation(); });
  lbProg.addEventListener('keydown', function (e) {
    var d = lbVideo.duration; if (!isFinite(d)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); lbVideo.currentTime = Math.min(d, lbVideo.currentTime + 5); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); lbVideo.currentTime = Math.max(0, lbVideo.currentTime - 5); }
  });

  function abrirVideo(src, poster, legenda, origem) {
    lbImg.style.display = 'none';
    lbVideo.style.display = 'block';
    if (lbVideo.getAttribute('src') !== src) lbVideo.setAttribute('src', src);
    if (poster) lbVideo.setAttribute('poster', poster);
    lbVideo.muted = false;
    lbVideo.currentTime = 0;
    lbCap.textContent = legenda || '';
    lbOrigem = origem || null;
    lb.classList.add('is-open', 'is-video');
    lbBarra.style.width = '0%';
    lbTempo.textContent = '0:00 / 0:00';
    var p = lbVideo.play(); if (p && p.catch) p.catch(function(){});
  }
  /* Os três depoimentos do Sicredi vêm do YouTube: 22 min de vídeo que não
     cabiam no repositório. O src só é escrito na hora de abrir e é limpo ao
     fechar — se ficasse no HTML, o navegador carregaria os três players do
     YouTube junto com o slide, e o áudio poderia continuar tocando depois de
     fechar o lightbox. */
  function abrirYoutube(id, legenda, origem) {
    lbVideo.pause();
    lbVideo.style.display = 'none';
    lbImg.style.display = 'none';
    lbYt.setAttribute('src',
      'https://www.youtube-nocookie.com/embed/' + id +
      '?autoplay=1&rel=0&modestbranding=1&playsinline=1');
    lbCap.textContent = legenda || '';
    lbOrigem = origem || null;
    lb.classList.remove('is-video');
    lb.classList.add('is-open', 'is-yt');
  }
  function abrirImagem(src, legenda) {
    lbVideo.pause();
    lbVideo.style.display = 'none';
    lbImg.style.display = 'block';
    lbImg.setAttribute('src', src);
    lbCap.textContent = legenda || '';
    lb.classList.remove('is-video', 'is-yt');
    lb.classList.add('is-open');
  }
  function fecharLightbox() {
    lb.classList.remove('is-open', 'is-yt');
    try { lbVideo.pause(); } catch (e) {}
    // descarregar o iframe é o que de fato para o vídeo do YouTube
    if (lbYt.getAttribute('src')) lbYt.removeAttribute('src');
    if (document.fullscreenElement === lbVideo) document.exitFullscreen();
  }
  lb.querySelector('.lb__close').addEventListener('click', function (e) { e.stopPropagation(); fecharLightbox(); });
  lb.querySelector('.lb__fs').addEventListener('click', function (e) {
    e.stopPropagation();
    var el = lb.classList.contains('is-yt') ? lbYt
           : (lbVideo.style.display === 'none' ? lbImg : lbVideo);
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  });
  lb.addEventListener('click', function (e) { if (e.target === lb) fecharLightbox(); });

  /* Sair da tela cheia com o vídeo aberto volta direto para o slide, com o
     vídeo minimizado. O Esc do navegador é consumido pela própria API de
     fullscreen (o keydown pode nem chegar até aqui), então o gatilho confiável é
     o fullscreenchange: fim da tela cheia + lightbox aberto = fecha o lightbox. */
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
    document.addEventListener(ev, function () {
      var cheio = document.fullscreenElement || document.webkitFullscreenElement;
      if (!cheio && lb.classList.contains('is-open')) fecharLightbox();
    });
  });

  /* ------------------------------------------------- painel de texto do case */
  function abrirTexto(slide) {
    var tp = txtpanel.querySelector('.tp');
    tp.querySelector('h2').textContent = slide.dataset.titulo || '';
    var grid = tp.querySelector('.tp__grid');
    grid.innerHTML = '';
    [].forEach.call(slide.querySelectorAll('.case__blk'), function (blk) {
      var d = document.createElement('div');
      var h = document.createElement('h3');
      h.textContent = blk.querySelector('h3').textContent;
      var p = document.createElement('p');
      p.textContent = blk.querySelector('p').dataset.texto || blk.querySelector('p').textContent;
      d.appendChild(h); d.appendChild(p); grid.appendChild(d);
    });
    txtpanel.classList.add('is-open');
  }
  function fecharTexto() { txtpanel.classList.remove('is-open'); }
  txtpanel.querySelector('.tp__close').addEventListener('click', function (e) { e.stopPropagation(); fecharTexto(); });
  txtpanel.addEventListener('click', function (e) { if (e.target === txtpanel) fecharTexto(); });

  /* -------------------------------------------------------------- interações */
  document.addEventListener('click', function (e) {
    // vídeo dentro de card de case → abre player
    // YouTube primeiro: os slots do Sicredi trazem data-youtube em vez de
    // data-video, e o resto do fluxo (clique, Esc, tela cheia) é o mesmo
    var cy = e.target.closest('[data-youtube]');
    if (cy) {
      e.stopPropagation();
      abrirYoutube(cy.dataset.youtube, cy.dataset.legenda, cy);
      return;
    }
    // aceita qualquer caixa com data-video: os cases e agora também as sedes
    var cv = e.target.closest('[data-video]');
    if (cv) {
      e.stopPropagation();
      abrirVideo(cv.dataset.video, cv.dataset.poster, cv.dataset.legenda, cv);
      return;
    }
    // imagem de case (ou foto de sede) → lightbox
    var ci = e.target.closest('.case__img[data-full], .sede[data-full]');
    if (ci) { e.stopPropagation(); abrirImagem(ci.dataset.full, ci.dataset.legenda); return; }
    // "texto completo" do case: o botão OU qualquer ponto da coluna de texto
    var tm = e.target.closest('.case__mais, .case__col');
    if (tm) { e.stopPropagation(); abrirTexto(tm.closest('.slide')); return; }
    // showreel: play in-place
    var pb = e.target.closest('.s14 .play-btn');
    if (pb) {
      e.stopPropagation();
      var v = pb.parentNode.querySelector('video');
      pb.classList.add('is-hidden');
      v.muted = false; var pr = v.play(); if (pr && pr.catch) pr.catch(function(){});
      return;
    }
    var sv = e.target.closest('.s14__video');
    if (sv) {
      e.stopPropagation();
      if (sv.paused) { sv.play(); } else { sv.pause(); sv.parentNode.querySelector('.play-btn').classList.remove('is-hidden'); }
      return;
    }
    /* Atalho interno. Era data-ir-slide="N", com N sendo a posição na lista — e
       isso quebrou no instante em que um slide saiu da apresentação: todos os
       índices seguintes deslocaram e os cinco links passaram a cair um slide
       antes, sem erro nenhum. Agora aponta para o id da seção, que não se move.
       Referenciar pelo data-titulo não serviria: os títulos são traduzidos.
       O ramo numérico fica como rede, para markup antigo. */
    var atalho = e.target.closest('[data-ir],[data-ir-slide]');
    if (atalho) {
      e.stopPropagation();
      var sid = atalho.dataset.ir;
      if (sid) {
        var alvoEl = document.getElementById(sid);
        var i = alvoEl ? slides.indexOf(alvoEl) : -1;
        if (i >= 0) irPara(i);
        return;
      }
      var n = parseInt(atalho.dataset.irSlide, 10);
      if (n >= 1 && n <= slides.length) irPara(n - 1);
      return;
    }

    // qualquer overlay/UI aberto não navega
    if (e.target.closest('#ui, #sumario, #lb, #txtpanel, #ajuda, a, [data-nonav]')) return;

    /* Toque/clique em área livre navega. Duas diferenças no aparelho de toque:

       1. A referência é a JANELA, não o palco. Em paisagem o palco é letterbox
          (693 de 740, por exemplo) e as barras negras das laterais engoliam o
          toque sem fazer nada — parecia que tocar não funcionava.
       2. A divisão é 40/60 em vez de 26/74. No mouse o alvo é preciso e faz
          sentido privilegiar o avanço; no dedo, "lado esquerdo volta, lado
          direito avança" precisa de metades reconhecíveis. Mantive 60 para o
          avanço porque é a ação usada 24 vezes contra poucas de volta. */
    var toque = window.matchMedia('(pointer:coarse)').matches;
    if (toque) {
      ((e.clientX / window.innerWidth) < 0.40) ? anterior() : proximo();
      return;
    }
    var r = stage.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right) return;
    ((e.clientX - r.left) / r.width < 0.26) ? anterior() : proximo();
  });

  /* cursor indicando o sentido da navegação */
  viewport.addEventListener('mousemove', function (e) {
    var r = stage.getBoundingClientRect();
    var voltar = (e.clientX - r.left) / r.width < 0.26;
    viewport.style.cursor = voltar ? 'w-resize' : 'e-resize';
  });
  ['.case__video', '.case__img', '.case__mais', '.case__col', '.sede', '.play-btn', '.s14__video',
   '#ui', '#sumario', '#lb', '#txtpanel']
    .forEach(function (sel) {
      document.addEventListener('mouseover', function (e) {
        if (e.target.closest(sel)) viewport.style.cursor = 'pointer';
      });
    });

  document.addEventListener('keydown', function (e) {
    var k = e.key;

    if (lb.classList.contains('is-open')) {
      // Esc: sai da tela cheia (se estiver) E volta ao slide, com o vídeo
      // minimizado. Quando o próprio navegador consome o Esc para sair da tela
      // cheia, o listener de fullscreenchange abaixo faz o resto.
      if (k === 'Escape') { e.preventDefault(); fecharLightbox(); }
      if (k === 'f' || k === 'F') { e.preventDefault(); lb.querySelector('.lb__fs').click(); }
      if (k === ' ') { e.preventDefault(); lbVideo.paused ? lbVideo.play() : lbVideo.pause(); }
      return;
    }
    if (ajuda && ajuda.classList.contains('is-abre')) {
      if (k === 'Escape' || k === '?') { e.preventDefault(); fecharAjuda(); }
      return;
    }
    if (txtpanel.classList.contains('is-open')) {
      if (k === 'Escape') { e.preventDefault(); fecharTexto(); }
      return;
    }
    if (sumario.classList.contains('is-open')) {
      if (k === 'Escape') { e.preventDefault(); fecharSumario(); return; }
      if (k === 'Enter')  { e.preventDefault(); fecharSumario(); irPara(sumCursor); return; }
      if (k === 'ArrowDown' || k === 'ArrowRight') { e.preventDefault(); sumCursor = Math.min(slides.length - 1, sumCursor + 1); marcarCursor(); return; }
      if (k === 'ArrowUp'   || k === 'ArrowLeft')  { e.preventDefault(); sumCursor = Math.max(0, sumCursor - 1); marcarCursor(); return; }
      return;
    }

    switch (k) {
      case 'ArrowRight': case 'PageDown': case 'Enter':
        e.preventDefault(); proximo(); break;
      case 'ArrowLeft': case 'PageUp': case 'Backspace':
        e.preventDefault(); anterior(); break;
      case 'ArrowDown': e.preventDefault(); proximo(); break;
      case 'ArrowUp':   e.preventDefault(); anterior(); break;
      case 'Home': e.preventDefault(); irPara(0, -1); break;
      case 'End':  e.preventDefault(); irPara(slides.length - 1, 1); break;
      // a barra de espaço abre o sumário (deixou de avançar o slide)
      case ' ': e.preventDefault(); abrirSumario(); break;
      case 'Escape': e.preventDefault(); abrirSumario(); break;
      case 'f': case 'F': e.preventDefault(); alternarTelaCheia(); break;
      default:
        if (/^[0-9]$/.test(k)) {
          e.preventDefault();
          teclaNum(k);
        }
    }
  });

  // digitação de número de slide (ex.: "1","7" → 17) com janela de 700ms
  var bufNum = '', bufTimer = null;
  function teclaNum(k) {
    bufNum += k;
    clearTimeout(bufTimer);
    bufTimer = setTimeout(function () {
      var n = parseInt(bufNum, 10);
      bufNum = '';
      if (n >= 1 && n <= slides.length) irPara(n - 1);
    }, 620);
  }

  /* ------------------------------------------- A22/D13 · vídeo das sedes
     O vídeo roda sempre, em preto e branco (o CSS cuida da cor). Aqui só se
     controla QUANDO ele roda: toca quando o slide entra, pausa quando sai —
     vídeo rodando fora da tela é CPU jogada fora.

     data-t diz em que segundo começar: o início dos dois arquivos é plano de
     fachada, sem ninguém, e o pedido é priorizar gente trabalhando. O seek
     precisa de dados NAQUELE ponto, não só dos metadados, então é tentado em
     vários eventos até acertar. */
  document.querySelectorAll('.sede').forEach(function (sede) {
    var v = sede.querySelector('.sede__vid');
    if (!v || !v.dataset.src) return;

    var tInicio = parseFloat(v.dataset.t) || 0;
    var slide   = sede.closest('.slide');
    var pronto  = false;

    /* O seek só é dado por resolvido quando o currentTime REALMENTE chegou lá.
       Antes, quem marcava `pronto` era o primeiro dos três eventos a disparar,
       e se aquele seek não pegasse — é comum no loadedmetadata, que tem os
       metadados mas não os dados do segundo 47,5 — não havia segunda tentativa
       e o vídeo abria no plano de fachada vazio, que é exatamente o que o data-t
       existe para evitar. Agora os eventos tentam até acertar. */
    function irAoInicio() {
      if (Math.abs(v.currentTime - tInicio) < 0.6) { pronto = true; return; }
      try { v.currentTime = tInicio; } catch (e) {}
    }

    /* Os listeners são anexados UMA vez, aqui, e não dentro do tocar(). Ficavam
       lá dentro porque o src só era atribuído na primeira entrada e o ramo
       rodava uma vez só; quando o parar() passou a soltar o src para devolver
       memória, o ramo voltou a rodar em toda entrada e os listeners passaram a
       acumular — três por visita, para sempre. */
    ['loadedmetadata', 'loadeddata', 'canplay', 'seeked'].forEach(function (ev) {
      v.addEventListener(ev, function () { if (!pronto) irAoInicio(); });
    });

    /* No aparelho de toque estes dois vídeos NÃO tocam. Três razões que se
       somam: (a) o efeito desenhado é rodar em preto e branco e colorir no
       hover, e hover não existe no toque, então o vídeo rodando não entrega
       nada ali; (b) são dois decodificadores 720×1280 simultâneos, o pico mais
       caro de todo o deck num iPhone; (c) o toque no cartão já abre o vídeo no
       player, que é o gesto que a pessoa espera. Fica o pôster, que é um quadro
       tirado do próprio vídeo. */
    function semAutoplay() { return window.matchMedia('(pointer:coarse)').matches; }

    function tocar() {
      if (semAutoplay()) return;
      if (!v.getAttribute('src')) v.setAttribute('src', v.dataset.src);
      var pr = v.play();
      if (pr && pr.catch) pr.catch(function () {});   // autoplay barrado: fica no quadro
    }

    /* Pausar não devolve memória: o buffer decodificado continua alocado, e
       depois de passar pelas sedes uma vez os dois ficavam ocupando espaço pelo
       resto da sessão. Soltar o src é o que libera. O pronto volta a false para
       o seek do data-t ser reaplicado na próxima entrada. */
    function parar() {
      v.pause();
      if (v.getAttribute('src')) { v.removeAttribute('src'); v.load(); pronto = false; }
    }

    // segue a entrada e a saída do slide pela classe is-active
    new MutationObserver(function () {
      slide.classList.contains('is-active') ? tocar() : parar();
    }).observe(slide, { attributes: true, attributeFilter: ['class'] });

    if (slide.classList.contains('is-active')) tocar();
  });

  /* ---------------------------------------------------------------- swipe */
  var tx = 0, ty = 0, tt = 0;
  viewport.addEventListener('touchstart', function (e) {
    tx = e.touches[0].clientX; ty = e.touches[0].clientY; tt = Date.now();
  }, { passive: true });
  viewport.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - tx;
    var dy = e.changedTouches[0].clientY - ty;
    if (Date.now() - tt > 700) return;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? proximo() : anterior(); }
  }, { passive: true });

  // trackpad horizontal
  var wheelLock = false;
  viewport.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaX) < 28 || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
    if (wheelLock) return;
    wheelLock = true;
    setTimeout(function () { wheelLock = false; }, 620);
    e.deltaX > 0 ? proximo() : anterior();
  }, { passive: true });

  /* ------------------------------------------------------------- botões UI */
  document.querySelector('.btn-fs').addEventListener('click', function (e) { e.stopPropagation(); alternarTelaCheia(); });
  document.querySelector('.btn-sum').addEventListener('click', function (e) { e.stopPropagation(); abrirSumario(); });
  sumario.querySelector('.sum__fechar').addEventListener('click', function (e) { e.stopPropagation(); fecharSumario(); });

  /* ------------------------------------------------- como navegar (painel "?")
     As instruções moram na capa. Este painel CLONA a .capa__nav a cada abertura
     em vez de guardar uma cópia: guardada, ela congelaria no idioma da primeira
     consulta e passaria a mostrar português com o deck em inglês — o mesmo erro
     que o sumário já cometeu uma vez por causa de um clone antigo. */
  var ajuda = document.getElementById('ajuda');
  function abrirAjuda() {
    if (!ajuda) return;
    var fonte = document.querySelector('.capa__nav');
    var corpo = ajuda.querySelector('.ajuda__corpo');
    if (fonte && corpo) corpo.innerHTML = fonte.innerHTML;
    ajuda.classList.add('is-abre');
  }
  function fecharAjuda() { if (ajuda) ajuda.classList.remove('is-abre'); }

  var btnAjuda = document.querySelector('.btn-ajuda');
  if (btnAjuda) btnAjuda.addEventListener('click', function (e) {
    e.stopPropagation(); ajuda && ajuda.classList.contains('is-abre') ? fecharAjuda() : abrirAjuda();
  });
  if (ajuda) {
    ajuda.querySelector('.ajuda__fechar').addEventListener('click', function (e) {
      e.stopPropagation(); fecharAjuda();
    });
    // clique no fundo fecha; dentro da caixa, não
    ajuda.addEventListener('click', function (e) {
      if (e.target === ajuda) { e.stopPropagation(); fecharAjuda(); }
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     MONTAGEM DE IMAGEM POR JANELA
     As 26 seções coexistem no DOM, e com todas as imagens carregadas o Safari no
     iPhone morria com "um problema ocorreu repetidamente": são 356 MB de memória
     DECODIFICADA (largura × altura × 4 bytes), contra ~13 MB em disco — JPEG
     comprime bem e decodifica para RGBA cru. O limite por aba no iPhone fica
     entre 200 e 300 MB.

     Aqui só o slide atual e os vizinhos imediatos têm src. Quem sai da janela
     perde o src e o navegador libera o bitmap. A capa nunca é desmontada, para
     a volta ao início não piscar.

     Janela de ±1 e não ±2 de propósito: o slide de case é o mais pesado (fundo
     de 14 MB decodificados + hero de 8,5 + miniaturas), e três deles montados
     já somam perto de 80 MB. Com ±2 daria o dobro. */
  /* Quantos slides vizinhos ficam montados além do atual.

     No computador vale 1: o vizinho já decodificado faz a próxima tela entrar
     sem piscar, e 80 MB de bitmap não incomodam ninguém ali.

     No celular vale ZERO. O pico medido com janela 1 é 82,7 MB de bitmap
     decodificado (janela {1,18,19,20}, três cases seguidos), e é isso que
     derruba o processo do Safari no iPhone — a mensagem "um problema ocorreu
     repetidamente" é o WebKit sendo morto por memória, não um erro de página.
     Com janela zero o pico cai para o slide mais pesado sozinho, 29,9 MB. O
     preço é a foto entrar um instante depois no primeiro acesso a cada tela;
     na segunda vez ela já vem do cache do navegador. Cair de pé com um quadro
     de atraso é melhor que recarregar. */
  function janelaAtual() {
    return window.matchMedia('(pointer:coarse)').matches ? 0 : 1;
  }

  /* :not(.espia img) — os cards de prévia só aparecem no hover de um logo, mas
     cada um traz fundo de campanha, selo e imagem principal: os quatro somavam
     ~79 MB decodificados no slide de marcas parceiras, mais que o resto do
     deck junto. Eles são montados no próprio hover, em montarEspia(). */
  var LAZY = 'img[data-lazy]:not(.espia img)';

  /* Qual arquivo montar. No celular, quando existe uma variante -m, é ela que
     entra: 60% da largura, o que dá 36% da memória decodificada. As 31 imagens
     mais pesadas do deck somam 187,8 MB em tamanho cheio e 67,6 MB reduzidas.

     A variante é declarada por atributo, não deduzida por convenção de nome. Se
     fosse deduzida, um arquivo sem variante viraria um 404 silencioso e o slide
     apareceria vazio no celular — e só no celular, o lugar mais difícil de
     perceber. Sem data-lazy-m, monta o arquivo cheio.

     Isso deixa a foto mais mole numa tela grande de celular. É uma troca
     assumida: a alternativa é a aba recarregando. */
  function arquivoDe(img) {
    if (window.matchMedia('(pointer:coarse)').matches) {
      var m = img.getAttribute('data-lazy-m');
      if (m) return m;
    }
    return img.getAttribute('data-lazy');
  }

  function naJanela(i) {
    var J = janelaAtual();
    var de = Math.max(0, i - J), ate = Math.min(slides.length - 1, i + J);
    return function (k) { return (k >= de && k <= ate) || k === 0; };
  }

  /* Montar e soltar são DUAS operações, não uma.

     Eram uma só, e com janela 1 isso funcionava por acidente: o slide que estava
     saindo continuava dentro da janela do destino, então nunca era desmontado
     durante a transição. Com janela 0 no celular o acidente acaba — o slide que
     sai fica 560ms visível no cross-fade e teria perdido o src no primeiro
     frame, aparecendo vazio. Agora montar acontece na hora e soltar acontece
     depois que a transição termina. */
  function montarImagens(i) {
    var dentro = naJanela(i);
    slides.forEach(function (s, k) {
      if (!dentro(k)) return;
      [].forEach.call(s.querySelectorAll(LAZY), function (img) {
        var alvo = arquivoDe(img);
        if (img.getAttribute('src') !== alvo) img.setAttribute('src', alvo);
      });
    });
  }

  function soltarImagens(i) {
    var dentro = naJanela(i);
    slides.forEach(function (s, k) {
      if (dentro(k)) return;
      [].forEach.call(s.querySelectorAll(LAZY), function (img) {
        if (img.hasAttribute('src')) img.removeAttribute('src');
      });
    });
  }

  /* Tela cheia: o iOS Safari só aceita requestFullscreen em <video>, não em
     elemento qualquer. Deixar o botão à vista ali é oferecer uma ação que não
     acontece — pior que não ter botão. Onde a API não existe, ele sai de cena;
     no Android Chrome, que suporta, continua. */
  (function () {
    var temFS = !!(document.documentElement.requestFullscreen ||
                   document.documentElement.webkitRequestFullscreen);
    if (temFS) return;
    [].forEach.call(document.querySelectorAll('.btn-fs, #lb .lb__fs'), function (b) {
      b.style.display = 'none';
    });
  })();

  /* -------------------------------------------------------------- arranque */
  /* O sumário é gerado a partir dos data-titulo, e o i18n troca esses títulos.
     Sem remontar, o sumário fica em português com o deck em inglês. Os nomes dos
     atos vêm do objeto ATOS, que também é traduzido pelo dicionário quando o
     título passa pelo elemento — por isso a remontagem lê tudo de novo do DOM. */
  montarUI();
  montarSumario();

  var inicial = 0;
  var m = /#slide-(\d+)/.exec(location.hash);
  if (m) inicial = Math.max(0, Math.min(slides.length - 1, parseInt(m[1], 10) - 1));

  window.addEventListener('hashchange', function () {
    var mm = /#slide-(\d+)/.exec(location.hash);
    if (!mm) return;
    var i = parseInt(mm[1], 10) - 1;
    if (i !== atual) irPara(i);
  });

  function arrancar() {
    loader.classList.add('is-done');
    atual = inicial;
    /* Link profundo (#slide-N) não passa por irPara, que é quem monta as imagens
       da janela — então abrir um link direto para um slide deixava as imagens
       DELE sem src, e o alt aparecia no lugar da foto. Só apareceu quando fui
       renderizar os slides um a um em headless. */
    montarImagens(inicial);
    slides[inicial].classList.add('is-active');
    trocarFundo(slides[inicial], false);
    atualizarUI();
    prepararSlide(slides[inicial]);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { tocarEntrada(slides[inicial]); });
    });
    acordarUI();
  }

  if (document.fonts && document.fonts.ready) {
    var t = setTimeout(arrancar, 2200);
    document.fonts.ready.then(function () { clearTimeout(t); arrancar(); });
  } else {
    arrancar();
  }

  // expõe para depuração
  /* Um único window.DECK. Havia dois: o segundo sobrescrevia o primeiro e
     levava embora o remontarSumario, então o sumário ficava em português com o
     deck em inglês — sem erro nenhum, porque a chamada do i18n é opcional. */
  window.DECK = {
    irPara: irPara, proximo: proximo, anterior: anterior,
    total: slides.length,
    get atual() { return atual; },
    remontarSumario: function () {
      var cols = sumario.querySelector('.sum__cols');
      if (cols) cols.innerHTML = '';
      montarSumario();
      atualizarUI();
    }
  };
})();
