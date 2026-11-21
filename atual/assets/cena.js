/* Impacto Bike · abertura da página inicial (veio do primeiro protótipo, agora em azul Shimano).
   A Caloi em camadas entra rodando, desmonta peça por peça na rolagem (cada peça aponta pra categoria da loja),
   remonta e sai acelerando; a cortina azul abre a loja. Fundo: traços de luz, horizonte, coroa e a palavra IMPACTO.
   Referências 21dev: Scroll Morph Hero, Animated Shader Hero, Horizon Hero, Liquid Metal Hero, Text Rotate, Canvas.
   Sem estilo inline: posições ficam no CSS; aqui só transform/opacity via GSAP (CSSOM, permitido pela CSP). */
(function () {
  'use strict';
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var cena = $('#inicio'); if (!cena) return;
  var html = document.documentElement;
  var parado = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ab = $('#abertura');
  // A cena roda mesmo com "reduzir movimento" (Windows com animações desligadas manda isso): ela é conduzida pela
  // rolagem da própria pessoa. Nesse caso só o rastro do mouse fica de fora. Sem GSAP: bike montada, parada.
  if (!gsap || !ST) {
    html.classList.add('sem-movimento');
    if (ab) ab.remove();
    var dz = transmissao(); if (dz) dz(0, true);
    return;
  }
  gsap.registerPlugin(ST);
  html.classList.add('cena-carregando');     // trava a rolagem só enquanto o carregador está na tela
  var movel = function () { return innerWidth < 760; };
  var estado = { giro: 0, entrada: 0, luz: 1, vel: 0 };
  var palco = $('#palco');

  /* rolagem macia (Lenis) só aqui, num relógio só com o GSAP */
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', function (e) { estado.rolVel = e.velocity || 0; ST.update(); });
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* traços de luz (Animated Shader Hero) */
  function luz() {
    var cv = $('#luz'), x = cv.getContext('2d'), W, H, T = [], d;
    function ajusta() {
      d = Math.min(devicePixelRatio || 1, 1.5);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; x.setTransform(d, 0, 0, d, 0, 0);
      var chao = H * (movel() ? 0.68 : 0.79), n = movel() ? 26 : 54;
      T = [];
      for (var i = 0; i < n; i++) {
        var baixo = Math.random() < 0.72, f = Math.random(), s = Math.random();
        T.push({ x: Math.random() * W, y: baixo ? chao + 4 + f * f * (H - chao) : chao - 6 - Math.random() * chao * 0.5,
          c: 50 + Math.random() * 240, v: 1 + Math.random() * 2.6, a: 0.07 + Math.random() * 0.28,
          cor: s < 0.66 ? '0,153,220' : (s < 0.9 ? '255,255,255' : '200,56,63') });
      }
    }
    ajusta(); addEventListener('resize', ajusta);
    var fixa = $('.cena-fixa'), vivo = true;
    new IntersectionObserver(function (e) { vivo = e[0].isIntersecting; }).observe(fixa);
    gsap.ticker.add(function () {
      if (!vivo) return;
      x.clearRect(0, 0, W, H);
      x.globalCompositeOperation = 'lighter';
      var v = estado.luz + Math.min(40, estado.vel || 0) * 0.9;
      for (var i = 0; i < T.length; i++) {
        var t = T[i];
        t.x -= t.v * v;
        if (t.x + t.c * (1 + v * 0.1) < 0) t.x = W + Math.random() * 200;
        var L = t.c * (1 + v * 0.1), g = x.createLinearGradient(t.x, 0, t.x + L, 0);
        g.addColorStop(0, 'rgba(' + t.cor + ',0)'); g.addColorStop(0.7, 'rgba(' + t.cor + ',' + t.a + ')'); g.addColorStop(1, 'rgba(' + t.cor + ',0)');
        x.fillStyle = g; x.fillRect(t.x, t.y, L, 1.4);
      }
      x.globalCompositeOperation = 'source-over';
    });
  }

  /* rodas: o giro segue a distância percorrida; a versão borrada entra com a velocidade */
  function rodas() {
    var rg = $$('.parte.roda .g'), giros = $$('.parte.roda .giro'), coroa = $('.coroa-fundo');
    var ult = 0, suave = 0, tr = transmissao();
    var setR = rg.map(function (el) { return gsap.quickSetter(el, 'rotation', 'deg'); });
    var setC = gsap.quickSetter(coroa, 'rotation', 'deg');
    var setO = giros.map(function (el) { return gsap.quickSetter(el, 'opacity'); });
    var nitidas = document.querySelectorAll('.parte.roda .g:not(.giro)'), setN = [].map.call(nitidas, function (el) { return gsap.quickSetter(el, 'opacity'); });
    gsap.ticker.add(function () {
      var a = estado.giro + estado.entrada, dv = Math.abs(a - ult); ult = a;
      suave += (dv - suave) * 0.22;
      estado.vel = suave;
      setR.forEach(function (s) { s(a); });
      if (tr) tr(a);
      setC(-a * 0.16);
      var o = Math.max(0, Math.min(1, (suave - 2.4) / 9));
      setO.forEach(function (s) { s(o); }); setN.forEach(function (s) { s(1 - o * 0.92); });
    });
  }

  /* transmissão: coroa, pedivela, pedais e corrente andando junto com a roda de trás.
     Coordenadas da camada do quadro (1054x870, canvas com 960 de altura para o pedal não cortar). */
  function transmissao() {
    var fr = $('.tr-frente'), at = $('.tr-atras'); if (!fr || !at) return null;
    var cf = fr.getContext('2d'), ca = at.getContext('2d'), W = fr.width, H = fr.height;
    var C = [552.1, 681.2], RC = 66.5, RCOG = 78.5, PASSO = 13.125, ALT = 16;
    var BR = 194.0, A0 = -1.83 * Math.PI / 180;               // pedivela: centro até o olho do pedal
    var P0 = [150, 554.8], P3 = [160, 855.0];                 // pontas da corrente que anda (cassete e roldana)
    function tang(P, cima) {
      var dx = P[0] - C[0], dy = P[1] - C[1], d = Math.hypot(dx, dy), b = Math.atan2(dy, dx), g = Math.acos(RC / d);
      var t1 = b + g, t2 = b - g, y1 = C[1] + RC * Math.sin(t1), y2 = C[1] + RC * Math.sin(t2);
      return (cima ? y1 < y2 : y1 > y2) ? t1 : t2;
    }
    var th1 = tang(P0, true), th2 = tang(P3, false);
    var T1 = [C[0] + RC * Math.cos(th1), C[1] + RC * Math.sin(th1)], T2 = [C[0] + RC * Math.cos(th2), C[1] + RC * Math.sin(th2)];
    var L1 = Math.hypot(T1[0] - P0[0], T1[1] - P0[1]), d1 = [(T1[0] - P0[0]) / L1, (T1[1] - P0[1]) / L1];
    var arco = th2 - th1; while (arco < 0) arco += Math.PI * 2;
    var LA = arco * RC, L2 = Math.hypot(P3[0] - T2[0], P3[1] - T2[1]), d2 = [(P3[0] - T2[0]) / L2, (P3[1] - T2[1]) / L2];
    var LT = L1 + LA + L2;
    function ponto(u) {
      if (u < L1) return [P0[0] + d1[0] * u, P0[1] + d1[1] * u];
      if (u < L1 + LA) { var t = th1 + (u - L1) / RC; return [C[0] + RC * Math.cos(t), C[1] + RC * Math.sin(t)]; }
      u -= L1 + LA; return [T2[0] + d2[0] * u, T2[1] + d2[1] * u];
    }
    var nomes = ['coroa', 'coroa-giro', 'pedivela', 'corrente', 'corrente-giro', 'cassete', 'cassete-giro', 'disco-tras'], im = {}, faltam = nomes.length, ok = false;
    nomes.forEach(function (n) {
      var i = new Image(); i.decoding = 'async';
      i.onload = function () { if (--faltam === 0) { ok = true; desenha(ultA, true); } };
      i.src = 'assets/cena/' + n + '.webp?v=3'; im[n] = i;
    });
    function pedal(c, x, y, fundo) {
      c.save(); c.translate(x, y);
      var g = c.createLinearGradient(0, -8, 0, 8);
      if (fundo) { g.addColorStop(0, '#15171a'); g.addColorStop(1, '#0b0c0e'); }
      else { g.addColorStop(0, '#34383f'); g.addColorStop(0.45, '#16181c'); g.addColorStop(1, '#262a30'); }
      c.fillStyle = fundo ? '#0d0e10' : '#2b2f35';
      for (var k = -3; k <= 3; k++) { if (!k) continue; var px = k * 12.5 - 1.2; c.fillRect(px, -10.5, 2.4, 3); c.fillRect(px, 7.5, 2.4, 3); }
      c.beginPath(); c.moveTo(-44, -5); c.quadraticCurveTo(-44, -8, -40, -8); c.lineTo(40, -8); c.quadraticCurveTo(44, -8, 44, -5);
      c.lineTo(44, 5); c.quadraticCurveTo(44, 8, 40, 8); c.lineTo(-40, 8); c.quadraticCurveTo(-44, 8, -44, 5); c.closePath();
      c.fillStyle = g; c.fill();
      if (!fundo) { c.strokeStyle = 'rgba(255,255,255,.10)'; c.lineWidth = 1; c.stroke(); }
      c.beginPath(); c.arc(0, 0, 5.5, 0, Math.PI * 2); c.fillStyle = fundo ? '#1c1e21' : '#8d939b'; c.fill();
      c.beginPath(); c.arc(0, 0, 2.2, 0, Math.PI * 2); c.fillStyle = fundo ? '#0b0c0e' : '#3a3e44'; c.fill();
      c.restore();
    }
    function sprite(c, img, cx, cy, ang, ox, oy) {
      c.save(); c.translate(cx, cy); c.rotate(ang); c.drawImage(img, -ox, -oy); c.restore();
    }
    function corrente(c, s, tile, alfa) {
      var n0 = Math.floor(s / PASSO), fr0 = s - n0 * PASSO, hw = tile.width / 2;
      c.save(); c.globalAlpha = alfa;
      c.beginPath(); c.rect(147, 0, W, 745); c.rect(157, 745, W, H - 745); c.clip();
      for (var k = -1; k * PASSO < LT + PASSO; k++) {
        var u = k * PASSO + fr0, a = ponto(u), b = ponto(u + PASSO);
        var g = k - n0, par = ((g % 2) + 2) % 2;
        c.save(); c.translate(a[0], a[1]); c.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]));
        c.drawImage(tile, par * hw, 0, hw, tile.height, 0, -ALT / 2, Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.6, ALT);
        c.restore();
      }
      c.restore();
    }
    var ultA = 0, ultD = null, suave = 0;
    function desenha(a, forca) {
      if (!ok) { ultA = a; return; }
      var dv = Math.abs(a - ultA); ultA = a; suave += (dv - suave) * 0.22;
      if (!forca && a === ultD && suave < 0.01) return;
      ultD = a;
      var o = Math.max(0, Math.min(1, (suave - 2.4) / 9));
      var s = a * Math.PI / 180 * RCOG, fi = s / RC;            // fi: ângulo da coroa (rad)
      var dfi = suave * Math.PI / 180 * RCOG / RC;
      cf.clearRect(0, 0, W, H); ca.clearRect(0, 0, W, H);
      // cassete (atrás do quadro e do câmbio): a foto parada; com velocidade, o borrão de giro
      ca.globalAlpha = 1; ca.drawImage(im['disco-tras'], -313, 192);   // disco de trás fica no quadro (igual ao da frente, no garfo)
      ca.globalAlpha = 1 - o; ca.drawImage(im.cassete, 0, 488);
      if (o > 0) { ca.globalAlpha = o; ca.drawImage(im['cassete-giro'], 0, 488); }
      ca.globalAlpha = 1;
      // pedivela e pedal ficam parados, como na foto; só a coroa e a corrente andam
      cf.globalAlpha = 1 - o * 0.85; sprite(cf, im.coroa, C[0], C[1], fi, 80, 80);
      if (o > 0) { cf.globalAlpha = o; sprite(cf, im['coroa-giro'], C[0], C[1], fi, 80, 80); }
      cf.globalAlpha = 1;
      if (o < 1) corrente(cf, s, im.corrente, 1);
      if (o > 0) corrente(cf, 0, im['corrente-giro'], o);
      sprite(cf, im.pedivela, C[0], C[1], 0, 230.1, 230.2);
      pedal(cf, C[0] + BR * Math.cos(A0), C[1] + BR * Math.sin(A0), false);
    }
    return desenha;
  }

  /* palavra que gira no título (Text Rotate) */
  function palavraGira() {
    var el = $('[data-roda]'); if (!el) return;
    var pal = el.getAttribute('data-roda').split('|'), i = 0;
    function monta(p) {
      var s = document.createElement('span'); s.className = 'pal';
      p.split('').forEach(function (c) { var l = document.createElement('span'); l.className = 'l'; l.textContent = c === ' ' ? ' ' : c; s.appendChild(l); });
      return s;
    }
    var atual = monta(pal[0]); el.appendChild(atual);
    setInterval(function () {
      if (document.hidden) return;
      i = (i + 1) % pal.length;
      var nova = monta(pal[i]); el.appendChild(nova);
      gsap.fromTo($$('.l', nova), { yPercent: 110 }, { yPercent: 0, duration: 0.55, stagger: 0.02 });
      var velha = atual; atual = nova;
      gsap.to($$('.l', velha), { yPercent: -110, duration: 0.45, stagger: 0.015, ease: 'power2.in', onComplete: function () { velha.remove(); } });
    }, 2300);
  }

  /* abertura: some o carregador, a bike entra rodando e para */
  function entrada() {
    var dx = movel() ? 0 : innerWidth * 0.17;
    gsap.set(palco, { x: dx });
    var tl = gsap.timeline();
    tl.to(ab, { yPercent: -100, duration: 0.75, ease: 'power3.inOut' })
      .add(function () { if (ab) ab.remove(); })
      .fromTo(palco, { x: -innerWidth }, { x: dx, duration: 2.1, ease: 'power3.out' }, 0.15)
      .fromTo(estado, { entrada: -1500 }, { entrada: 0, duration: 2.1, ease: 'power3.out' }, 0.15)
      .fromTo('.b0 h1', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, 0.55)
      .fromTo('.b0b > *', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.1, ease: 'power3.out' }, 0.95)
      .fromTo('.palavra', { opacity: 0 }, { opacity: 0.3, duration: 1.2 }, 0.5);
  }

  /* rolagem: centraliza, desmonta (Scroll Morph Hero), remonta e sai acelerando */
  function rolagem() {
    var w = function () { return palco.offsetWidth; };
    var m = movel(), k = m ? 0.62 : 1;
    var rt = '#p-rt', rf = '#p-rf', fr = '#p-fr', se = '#p-se';
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: cena, start: 'top top', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true,
        onUpdate: function (s) { html.style.setProperty('--metal', (s.progress * 220).toFixed(1) + '%'); } }
    });
    tl.to(['#b0', '#b0b'], { y: -46, autoAlpha: 0, duration: 7 }, 0)
      .to(palco, { x: 0, scale: m ? 1 : 1.08, duration: 18, ease: 'power1.inOut' }, 2)
      .to('.palavra', { scale: 1.2, opacity: 0.16, duration: 26 }, 0)
      .fromTo('#b1', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 5 }, 10)
      .to('#b1', { y: -30, opacity: 0, duration: 4 }, 25)
      .to(estado, { giro: '+=720', duration: 28 }, 0);
    tl.to(palco, { scale: m ? 0.76 : 0.8, y: m ? -40 : 0, duration: 15, ease: 'power2.inOut' }, 29)
      .to(rt, { x: function () { return -w() * 0.2 * k; }, y: function () { return w() * 0.02 * k; }, duration: 15, ease: 'power2.inOut' }, 29)
      .to(rf, { x: function () { return w() * 0.24 * k; }, y: function () { return w() * 0.03 * k; }, duration: 15, ease: 'power2.inOut' }, 29)
      .to(fr, { x: function () { return w() * 0.13 * k; }, y: function () { return -w() * 0.06 * k; }, duration: 15, ease: 'power2.inOut' }, 31)
      .to(se, { y: function () { return -w() * 0.1 * k; }, x: function () { return -w() * 0.02; }, duration: 13, ease: 'power2.inOut' }, 31)
      .to(estado, { giro: '+=300', luz: 0.25, duration: 15 }, 29)
      .fromTo('#b2', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 5 }, 37);
    $$('.rot').forEach(function (r, i) {
      tl.fromTo(r, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 2.4 }, 40 + i * 1.5);
    });
    tl.to(estado, { giro: '+=120', duration: 18 }, 44)
      .to('.rot', { autoAlpha: 0, duration: 2 }, 61)
      .to('#b2', { y: -30, opacity: 0, duration: 4 }, 61)
      .to([rt, rf, fr, se], { x: 0, y: 0, duration: 11, ease: 'power3.inOut' }, 63)
      .to(palco, { scale: m ? 0.84 : 0.85, y: function () { return palco.offsetHeight * (m ? 0.06 : 0.055); }, duration: 11, ease: 'power2.inOut' }, 63)
      .to(estado, { giro: '+=260', luz: 1, duration: 11 }, 63)
      .fromTo('#b3', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 4 }, 74)
      .to('#b3', { opacity: 0, duration: 3 }, 83);
    tl.to(estado, { giro: '+=4600', luz: 9, duration: 17, ease: 'power2.in' }, 83)
      .to(palco, { x: function () { return innerWidth * 1.15; }, duration: 12, ease: 'power3.in' }, 85)
      .to('#cortina', { clipPath: 'circle(150% at 50% 72%)', duration: 8, ease: 'power2.in' }, 92)
      .fromTo('.cortina-txt', { xPercent: 14 }, { xPercent: 0, duration: 8 }, 92);
    tl.to({}, { duration: 0.01 }, 100);
  }

  /* rastro de molas no mouse (Canvas), só em cima da cena */
  function rastro() {
    if (parado || !matchMedia('(pointer:fine)').matches) return;
    var cv = document.createElement('canvas'); cv.id = 'rastro'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv);
    var x = cv.getContext('2d'), d;
    var aj = function () { d = Math.min(devicePixelRatio || 1, 1.5); cv.width = innerWidth * d; cv.height = innerHeight * d; x.setTransform(d, 0, 0, d, 0, 0); };
    aj(); addEventListener('resize', aj);
    var m = { x: -99, y: -99 }, N = 22, pts = [];
    for (var i = 0; i < N; i++) pts.push({ x: 0, y: 0, vx: 0, vy: 0 });
    addEventListener('pointermove', function (e) { m.x = e.clientX; m.y = e.clientY; }, { passive: true });
    gsap.ticker.add(function () {
      x.clearRect(0, 0, innerWidth, innerHeight);
      if (cena.getBoundingClientRect().bottom < innerHeight * 0.2 || m.x < 0) return;
      var a = m.x, b = m.y;
      pts.forEach(function (p, k) { var f = 0.42 - k / N * 0.3; p.vx += (a - p.x) * f; p.vy += (b - p.y) * f; p.vx *= 0.52; p.vy *= 0.52; p.x += p.vx; p.y += p.vy; a = p.x; b = p.y; });
      x.lineCap = 'round'; x.globalCompositeOperation = 'lighter';
      for (var k = 1; k < N; k++) {
        x.strokeStyle = 'rgba(0,153,220,' + (0.55 * (1 - k / N)).toFixed(3) + ')'; x.lineWidth = 5 * (1 - k / N) + 0.5;
        x.beginPath(); x.moveTo(pts[k - 1].x, pts[k - 1].y); x.lineTo(pts[k].x, pts[k].y); x.stroke();
      }
      x.globalCompositeOperation = 'source-over';
    });
  }

  /* carregador: coroa girando e porcentagem até as camadas da bike decodificarem */
  var coroaAb = $('.ab-coroa');
  if (coroaAb) gsap.to(coroaAb, { rotation: 360, duration: 1.6, ease: 'none', repeat: -1 });
  gsap.set(['.b0 h1', '.b0b > *'], { opacity: 0 });
  gsap.set('.rot', { autoAlpha: 0 });
  var imgs = $$('.parte img'), n = 0, pct = $('#ab-pct');
  var pronta = Promise.all(imgs.map(function (i) {
    var p = i.decode ? i.decode().catch(function () {}) : Promise.resolve();
    return p.then(function () { n++; if (pct) pct.textContent = Math.round(n / imgs.length * 100); });
  }));
  Promise.race([pronta, new Promise(function (r) { setTimeout(r, 3500); })]).then(function () {
    html.classList.remove('cena-carregando'); html.classList.add('cena-pronta');
    if (lenis) lenis.resize();
    luz(); rodas(); palavraGira(); entrada(); rolagem(); rastro();
    ST.refresh();
  });
})();
