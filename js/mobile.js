/* ============================================================================
   WT.AG · Credenciais 2026 — MOBILE
   ============================================================================
   Deliberadamente pequeno. O desktop tem transição de slide, paralaxe, roleta de
   texto e foco por elemento; nada disso sobrevive bem no celular — custa bateria,
   briga com o gesto de rolar e não acrescenta leitura numa tela de 6". Aqui a
   rolagem nativa faz a navegação, e o JS só cuida do que ela não resolve:
   contagem de números, player, painel de texto e idioma.
   ========================================================================= */
(function () {
  'use strict';

  var secs = [].slice.call(document.querySelectorAll('.sec'));
  var barra = document.getElementById('barra');
  var painel = document.getElementById('painel');
  var player = document.getElementById('player');
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── imagens por proximidade ───────────────────────────────────────────────
     Mesmo motivo do desktop: 356 MB de bitmap decodificado derrubam a aba. Aqui
     o IntersectionObserver resolve melhor que a janela de índices, porque a
     rolagem é contínua e não discreta. rootMargin generoso para a imagem já
     estar pronta quando a seção entra. */
  var obsImg = new IntersectionObserver(function (ents) {
    ents.forEach(function (e) {
      if (!e.isIntersecting) return;
      [].forEach.call(e.target.querySelectorAll('img[data-lazy]'), function (img) {
        var a = img.getAttribute('data-lazy');
        if (a && img.getAttribute('src') !== a) img.setAttribute('src', a);
      });
      obsImg.unobserve(e.target);
    });
  }, { rootMargin: '150% 0px' });
  secs.forEach(function (s) { obsImg.observe(s); });

  /* ── contagem dos números ─────────────────────────────────────────────── */
  function fmt(v, dec, sep) {
    var en = document.documentElement.lang === 'en';
    var mil = en ? ',' : '.', dc = en ? '.' : ',';
    var s = dec > 0 ? v.toFixed(dec) : String(Math.round(v));
    if (dec > 0) s = s.replace('.', dc);
    if (sep) {
      var p = s.split(dc);
      p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, mil);
      s = p.join(dc);
    }
    return s;
  }
  function contar(el) {
    var alvo = parseFloat(el.dataset.countTo);
    if (isNaN(alvo)) return;
    var dec = parseInt(el.dataset.countDec || '0', 10);
    var sep = el.dataset.countSep === '1';
    var pre = el.dataset.countPre || '', pos = el.dataset.countPos || '';
    if (reduz.matches) { el.textContent = pre + fmt(alvo, dec, sep) + pos; return; }
    var t0 = null, dur = 1000;
    function passo(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      el.textContent = pre + fmt(alvo * e, dec, sep) + pos;
      if (k < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }
  var obsNum = new IntersectionObserver(function (ents) {
    ents.forEach(function (e) {
      if (!e.isIntersecting) return;
      contar(e.target); obsNum.unobserve(e.target);
    });
  }, { threshold: 0.6 });
  [].forEach.call(document.querySelectorAll('[data-count-to]'), function (n) { obsNum.observe(n); });

  /* ── barra de progresso ───────────────────────────────────────────────── */
  function progresso() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    barra.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', progresso, { passive: true });
  window.addEventListener('resize', progresso);
  progresso();

  /* ── player ───────────────────────────────────────────────────────────── */
  function abrirPlayer(html) {
    player.querySelectorAll('video,iframe').forEach(function (n) { n.remove(); });
    player.insertAdjacentHTML('beforeend', html);
    player.classList.add('on');
    document.body.style.overflow = 'hidden';
  }
  function fecharTudo() {
    player.classList.remove('on');
    painel.classList.remove('on');
    player.querySelectorAll('video,iframe').forEach(function (n) { n.remove(); });
    document.body.style.overflow = '';
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('.fechar')) { fecharTudo(); return; }

    var yt = e.target.closest('[data-youtube]');
    if (yt) {
      abrirPlayer('<iframe allow="autoplay; fullscreen" allowfullscreen src="' +
        'https://www.youtube-nocookie.com/embed/' + yt.dataset.youtube +
        '?autoplay=1&rel=0&modestbranding=1&playsinline=1"></iframe>');
      return;
    }
    var vd = e.target.closest('[data-video]');
    if (vd) {
      abrirPlayer('<video controls playsinline autoplay src="' + vd.dataset.video + '"></video>');
      return;
    }
    var mais = e.target.closest('.mais');
    if (mais) {
      var blocos = JSON.parse(mais.getAttribute('data-full'));
      var sec = mais.closest('.sec');
      var h = '<h2>' + (sec.dataset.titulo || '') + '</h2>';
      blocos.forEach(function (b) { h += '<h3>' + b.t + '</h3><p>' + b.x + '</p>'; });
      painel.querySelector('.cx').innerHTML = h;
      painel.classList.add('on');
      document.body.style.overflow = 'hidden';
      return;
    }
    /* logo de cliente que tem case: rola até a seção dele */
    var ir = e.target.closest('[data-ir]');
    if (ir) {
      var alvo = document.getElementById(ir.dataset.ir);
      if (alvo) alvo.scrollIntoView({ behavior: reduz.matches ? 'auto' : 'smooth' });
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharTudo(); });

  /* ── idioma ───────────────────────────────────────────────────────────────
     Reaproveita o dicionário do desktop sem uma linha nova de tradução: ele é
     indexado pelo texto em português, então funciona em qualquer DOM que tenha
     esse texto. O motor aqui é enxuto porque o mobile não tem lettering com
     geometria calculada — só texto e data-en-txt. */
  var D = window.DIC_EN || {};
  var idioma = 'pt';
  var btn = document.querySelector('.lg');

  function traduzir(para) {
    var els = document.querySelectorAll('body *');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
      if (para === 'en') {
        if (el.hasAttribute('data-en-txt')) {
          if (!el.hasAttribute('data-pt')) el.setAttribute('data-pt', el.innerHTML);
          el.innerHTML = el.getAttribute('data-en-txt');
          continue;
        }
        var ih = el.innerHTML.trim(), v = D[ih];
        if (v !== undefined && v !== ih) {
          if (!el.hasAttribute('data-pt')) el.setAttribute('data-pt', el.innerHTML);
          el.innerHTML = v;
        } else if (!el.children.length) {
          var t = el.textContent.trim(), w = D[t];
          if (w !== undefined && w !== t) {
            if (!el.hasAttribute('data-pt')) el.setAttribute('data-pt', el.innerHTML);
            el.innerHTML = w;
          }
        }
      } else if (el.hasAttribute('data-pt')) {
        el.innerHTML = el.getAttribute('data-pt');
      }
      ['data-titulo', 'data-legenda', 'title', 'alt'].forEach(function (a) {
        if (!el.hasAttribute(a)) return;
        var g = 'data-pt-' + a.replace('data-', '');
        if (para === 'en') {
          var tv = D[el.getAttribute(a)];
          if (tv !== undefined && tv !== el.getAttribute(a)) {
            if (!el.hasAttribute(g)) el.setAttribute(g, el.getAttribute(a));
            el.setAttribute(a, tv);
          }
        } else if (el.hasAttribute(g)) el.setAttribute(a, el.getAttribute(g));
      });
    }
    document.documentElement.lang = para === 'en' ? 'en' : 'pt-BR';
    idioma = para;
    try { localStorage.setItem('wtag-idioma', para); } catch (e) {}
    btn.querySelector('[data-lg="pt"]').classList.toggle('is-on', para === 'pt');
    btn.querySelector('[data-lg="en"]').classList.toggle('is-on', para === 'en');
    btn.setAttribute('aria-label', para === 'pt' ? 'Switch to English' : 'Mudar para português');
  }
  btn.addEventListener('click', function () { traduzir(idioma === 'pt' ? 'en' : 'pt'); });
  try { if (localStorage.getItem('wtag-idioma') === 'en') traduzir('en'); } catch (e) {}

  window.MOBILE = { traduzir: traduzir, secoes: secs.length };
})();
