/* Impacto Bike · um arquivo só, sem dependência. Nada aqui manda dado para fora do site. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ZAP = '5537998421369';
  var brl = function (v) { return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var norm = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var BASE = document.documentElement.getAttribute('data-raiz') || '/';

  /* ---------- armazenamento (pode falhar em aba anônima: o site segue funcionando) ---------- */
  var mem = {};
  function ler(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return mem[k] || d; } }
  function gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } }

  /* ---------- sacola ---------- */
  function sacola() { var s = ler('ib-sacola', []); return Array.isArray(s) ? s.filter(function (i) { return i && /^\d{1,6}$/.test(i.sku) && i.q > 0 && i.q < 100; }) : []; }
  function salvaSacola(s) { gravar('ib-sacola', s); contador(); }
  function contador() {
    var n = sacola().reduce(function (a, i) { return a + i.q; }, 0);
    $$('[data-contador]').forEach(function (el) { el.textContent = n; el.hidden = n === 0; });
  }
  function addSacola(sku, q) {
    var s = sacola(), it = s.filter(function (i) { return i.sku === sku; })[0];
    if (it) it.q = Math.min(99, it.q + q); else s.push({ sku: sku, q: q });
    salvaSacola(s);
  }
  contador();

  /* ---------- gavetas ---------- */
  var fundo = $('.gaveta-fundo'), ultimoFoco = null;
  function abre(id) {
    var g = document.getElementById(id); if (!g) return;
    ultimoFoco = document.activeElement;
    g.classList.add('aberta'); g.removeAttribute('inert'); fundo.classList.add('aberta');
    document.body.style.overflow = 'hidden';
    var f = $('button, a, input', g); if (f) f.focus();
  }
  function fecha() {
    $$('.gaveta.aberta').forEach(function (g) { g.classList.remove('aberta'); g.setAttribute('inert', ''); });
    fundo.classList.remove('aberta'); document.body.style.overflow = '';
    if (ultimoFoco) ultimoFoco.focus();
  }
  $$('[data-abre]').forEach(function (b) { b.addEventListener('click', function () { abre(b.getAttribute('data-abre')); }); });
  $$('[data-fecha]').forEach(function (b) { b.addEventListener('click', fecha); });
  if (fundo) fundo.addEventListener('click', fecha);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecha(); });
  $$('.abre').forEach(function (b) {
    b.addEventListener('click', function () {
      var li = b.closest('li'); var a = li.classList.toggle('aberto'); b.setAttribute('aria-expanded', a);
    });
  });

  /* ---------- aviso "adicionado" ---------- */
  var avisoT;
  function aviso(txt) {
    var a = $('.aviso-add'); if (!a) return;
    $('span', a).textContent = txt; a.classList.add('mostra');
    clearTimeout(avisoT); avisoT = setTimeout(function () { a.classList.remove('mostra'); }, 3500);
  }

  /* ---------- página de produto ---------- */
  var dadosProd = $('#dados-produto');
  if (dadosProd) (function () {
    var P = JSON.parse(dadosProd.textContent), escolha = {}, atual = P.vars[0];
    var nomes = Object.keys(P.vars[0].attrs || {});
    nomes.forEach(function (n) { escolha[n] = P.vars[0].attrs[n]; });
    var principal = $('.galeria-principal img');
    function trocaFoto(src) { if (src && principal) { principal.src = src; } }
    $$('.miniaturas button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.miniaturas button').forEach(function (x) { x.setAttribute('aria-current', 'false'); });
        b.setAttribute('aria-current', 'true'); trocaFoto(b.getAttribute('data-foto'));
      });
    });
    function acha() {
      return P.vars.filter(function (v) { return nomes.every(function (n) { return v.attrs[n] === escolha[n]; }); })[0];
    }
    function atualiza() {
      var v = acha();
      $$('.variacao-ops button').forEach(function (b) {
        b.setAttribute('aria-pressed', escolha[b.getAttribute('data-nome')] === b.getAttribute('data-valor'));
      });
      var btn = $('#btn-add');
      if (!v) { btn.disabled = true; btn.textContent = 'Combinação indisponível'; return; }
      atual = v; btn.disabled = false; btn.textContent = 'Adicionar à sacola';
      $('#preco').textContent = brl(v.preco);
      $('#sku').textContent = v.sku;
      if (v.img) trocaFoto(v.img);
      var z = $('#btn-zap');
      if (z) z.href = 'https://wa.me/' + ZAP + '?text=' + encodeURIComponent('Olá! Vi no site e quero saber sobre: ' + P.nome + (nomes.length ? ' (' + nomes.map(function (n) { return escolha[n]; }).join(', ') + ')' : '') + ' · cód. ' + v.sku);
    }
    $$('.variacao-ops button').forEach(function (b) {
      b.addEventListener('click', function () { escolha[b.getAttribute('data-nome')] = b.getAttribute('data-valor'); atualiza(); });
    });
    var qi = $('#qtd');
    $$('[data-qtd]').forEach(function (b) {
      b.addEventListener('click', function () { qi.value = Math.max(1, Math.min(99, (+qi.value || 1) + (+b.getAttribute('data-qtd')))); });
    });
    $('#btn-add').addEventListener('click', function () {
      if (!atual) return;
      addSacola(atual.sku, Math.max(1, Math.min(99, +qi.value || 1)));
      aviso('Adicionado à sacola');
    });
    atualiza();
  })();

  /* ---------- lista com filtros ---------- */
  var grade = $('#grade[data-lista]');
  if (grade) (function () {
    var cards = $$('.card', grade), POR_PAG = 48, mostrar = POR_PAG;
    var form = $('#form-filtros'), sel = $('#ordem'), btnMais = $('#mais');
    var params = new URLSearchParams(location.search);
    // estado inicial vindo do endereço (link compartilhável)
    if (form) $$('input', form).forEach(function (i) { var v = params.getAll(i.name); if (v.indexOf(i.value) >= 0) i.checked = true; });
    if (params.get('ordem') && sel) sel.value = params.get('ordem');
    $$('.ver-mais-op').forEach(function (b) {
      b.addEventListener('click', function () { $$('[data-extra]', b.parentNode).forEach(function (x) { x.hidden = false; }); b.remove(); });
    });
    function filtros() {
      var f = {}; if (!form) return f;
      $$('input:checked', form).forEach(function (i) { (f[i.name] = f[i.name] || []).push(i.value); });
      return f;
    }
    function passa(c, f) {
      if (f.marca && f.marca.indexOf(c.dataset.marca) < 0) return false;
      if (f.aro && f.aro.indexOf(c.dataset.aro) < 0) return false;
      if (f.vel && f.vel.indexOf(c.dataset.vel) < 0) return false;
      if (f.preco) {
        var p = +c.dataset.preco, ok = f.preco.some(function (r) { var a = r.split('-'); return p >= +a[0] && (a[1] === '' || p < +a[1]); });
        if (!ok) return false;
      }
      return true;
    }
    function ordena() {
      var o = sel ? sel.value : 'destaque';
      var arr = cards.slice().sort(function (a, b) {
        if (o === 'menor') return a.dataset.preco - b.dataset.preco;
        if (o === 'maior') return b.dataset.preco - a.dataset.preco;
        if (o === 'az') return a.dataset.nome.localeCompare(b.dataset.nome, 'pt');
        return a.dataset.ordem - b.dataset.ordem;
      });
      arr.forEach(function (c) { grade.appendChild(c); });
      cards = arr;
    }
    function aplica(guarda) {
      var f = filtros(), n = 0, vis = 0;
      cards.forEach(function (c) {
        var ok = passa(c, f); if (ok) n++;
        c.hidden = !(ok && vis < mostrar); if (ok && vis < mostrar) vis++;
      });
      $$('[data-total]').forEach(function (el) { el.textContent = n + (n === 1 ? ' produto' : ' produtos'); });
      var nf = Object.keys(f).reduce(function (a, k) { return a + f[k].length; }, 0);
      var badge = $('#n-filtros'); if (badge) { badge.textContent = nf; badge.hidden = !nf; }
      if (btnMais) btnMais.hidden = n <= mostrar;
      $('#vazio').hidden = n > 0;
      // chips dos filtros ativos
      var chips = $('#chips'); chips.innerHTML = '';
      if (form) $$('input:checked', form).forEach(function (i) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'chip';
        b.innerHTML = esc(i.getAttribute('data-rotulo')) + '<svg class="ico" aria-hidden="true"><use href="#i-x"/></svg>';
        b.setAttribute('aria-label', 'Remover filtro ' + i.getAttribute('data-rotulo'));
        b.addEventListener('click', function () { i.checked = false; mostrar = POR_PAG; aplica(true); });
        chips.appendChild(b);
      });
      if (nf) {
        var l = document.createElement('button'); l.type = 'button'; l.className = 'chip chip-limpar'; l.textContent = 'Limpar tudo';
        l.addEventListener('click', limpa); chips.appendChild(l);
      }
      var ver = $('#ver-n'); if (ver) ver.textContent = 'Ver ' + n + (n === 1 ? ' produto' : ' produtos');
      if (guarda) {
        var q = new URLSearchParams();
        Object.keys(f).forEach(function (k) { f[k].forEach(function (v) { q.append(k, v); }); });
        if (sel && sel.value !== 'destaque') q.set('ordem', sel.value);
        var s = q.toString(); history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
      }
    }
    function limpa() { if (form) $$('input', form).forEach(function (i) { i.checked = false; }); mostrar = POR_PAG; aplica(true); }
    if (form) form.addEventListener('change', function () { mostrar = POR_PAG; aplica(true); });
    var lb = $('#limpar-filtros'); if (lb) lb.addEventListener('click', limpa);
    if (sel) sel.addEventListener('change', function () { ordena(); aplica(true); });
    if (btnMais) btnMais.addEventListener('click', function () { mostrar += POR_PAG; aplica(false); });
    ordena(); aplica(false);
  })();

  /* ---------- índice (busca e sacola) ---------- */
  var indice = null;
  function carregaIndice(cb) {
    if (indice) return cb(indice);
    fetch(BASE + 'dados/indice.json', { credentials: 'same-origin' }).then(function (r) { return r.json(); })
      .then(function (d) { indice = d; cb(d); }).catch(function () { cb(null); });
  }
  function cardHTML(p) {
    return '<a class="card" href="' + BASE + 'p/' + esc(p.i) + '/"><div class="card-foto"><img src="' + BASE + esc(p.f) + '" alt="" loading="lazy" width="420" height="420"></div>' +
      '<div class="card-info"><span class="card-marca">' + esc(p.m || '') + '</span><span class="card-nome">' + esc(p.n) + '</span>' +
      '<span class="card-preco">' + (p.q ? '<small>a partir de</small>' : '') + brl(p.p) + '</span></div></a>';
  }

  /* ---------- busca ---------- */
  var resBusca = $('#resultado-busca');
  if (resBusca) (function () {
    var q = (new URLSearchParams(location.search).get('q') || '').trim().slice(0, 80);
    $$('input[name=q]').forEach(function (i) { i.value = q; });
    $('#busca-termo').textContent = q ? '“' + q + '”' : '';
    if (!q) { resBusca.innerHTML = ''; $('#busca-total').textContent = 'Digite o que procura no campo de busca.'; return; }
    carregaIndice(function (d) {
      if (!d) { $('#busca-total').textContent = 'Não deu para carregar a busca. Tente de novo.'; return; }
      var termos = norm(q).split(/\s+/).filter(Boolean);
      var achados = d.p.map(function (p) {
        var alvo = norm(p.n + ' ' + (p.m || '') + ' ' + p.c + ' ' + p.v.map(function (v) { return v[0]; }).join(' '));
        if (!termos.every(function (t) { return alvo.indexOf(t) >= 0; })) return null;
        var pts = termos.reduce(function (a, t) { return a + (norm(p.n).indexOf(t) === 0 ? 3 : 0) + (norm(p.n).indexOf(t) >= 0 ? 2 : 0); }, 0);
        return { p: p, pts: pts };
      }).filter(Boolean).sort(function (a, b) { return b.pts - a.pts; });
      $('#busca-total').textContent = achados.length ? achados.length + (achados.length === 1 ? ' produto encontrado' : ' produtos encontrados') : '';
      $('#vazio').hidden = achados.length > 0;
      resBusca.innerHTML = achados.slice(0, 120).map(function (a) { return cardHTML(a.p); }).join('');
    });
  })();

  /* ---------- sacola (página) ---------- */
  var listaSacola = $('#itens-sacola');
  function itensDetalhados(d) {
    var porSku = {};
    d.p.forEach(function (p) { p.v.forEach(function (v) { porSku[v[0]] = { p: p, rot: v[1], preco: v[2], foto: v[3] || p.f }; }); });
    return sacola().map(function (i) { var x = porSku[i.sku]; return x ? { sku: i.sku, q: i.q, x: x } : null; }).filter(Boolean);
  }
  function rendeSacola() {
    carregaIndice(function (d) {
      if (!d) return;
      var itens = itensDetalhados(d), sub = 0;
      $('#sacola-vazia').hidden = itens.length > 0;
      $('#sacola-cheia').hidden = itens.length === 0;
      listaSacola.innerHTML = itens.map(function (i) {
        sub += i.q * i.x.preco;
        return '<div class="item"><img src="' + BASE + esc(i.x.foto) + '" alt="" width="84" height="84" loading="lazy">' +
          '<div><a class="item-nome" href="' + BASE + 'p/' + esc(i.x.p.i) + '/">' + esc(i.x.p.n) + '</a>' +
          '<div class="item-var">' + (i.x.rot ? esc(i.x.rot) + ' · ' : '') + 'cód. ' + esc(i.sku) + '</div>' +
          '<div class="qtd-box"><button type="button" data-sku="' + esc(i.sku) + '" data-d="-1" aria-label="Diminuir">−</button><span class="oculto">Quantidade</span><input value="' + i.q + '" readonly aria-label="Quantidade"><button type="button" data-sku="' + esc(i.sku) + '" data-d="1" aria-label="Aumentar">+</button></div>' +
          '<button type="button" class="remover" data-tira="' + esc(i.sku) + '">Remover</button></div>' +
          '<div class="item-preco">' + brl(i.q * i.x.preco) + '</div></div>';
      }).join('');
      $$('[data-subtotal]').forEach(function (el) { el.textContent = brl(sub); });
      $$('[data-d]', listaSacola).forEach(function (b) {
        b.addEventListener('click', function () {
          var s = sacola(); s.forEach(function (i) { if (i.sku === b.dataset.sku) i.q = Math.max(1, Math.min(99, i.q + (+b.dataset.d))); });
          salvaSacola(s); rendeSacola();
        });
      });
      $$('[data-tira]', listaSacola).forEach(function (b) {
        b.addEventListener('click', function () { salvaSacola(sacola().filter(function (i) { return i.sku !== b.dataset.tira; })); rendeSacola(); });
      });
    });
  }
  if (listaSacola) rendeSacola();

  /* ---------- finalizar (prévia: nada é enviado) ---------- */
  var formFim = $('#form-finalizar');
  if (formFim) (function () {
    carregaIndice(function (d) {
      if (!d) return;
      var itens = itensDetalhados(d), sub = 0;
      $('#resumo-itens').innerHTML = itens.map(function (i) {
        sub += i.q * i.x.preco;
        return '<div class="linha-resumo"><span>' + i.q + '× ' + esc(i.x.p.n) + '</span><span>' + brl(i.q * i.x.preco) + '</span></div>';
      }).join('') || '<p>Sua sacola está vazia.</p>';
      $$('[data-subtotal]').forEach(function (el) { el.textContent = brl(sub); });
    });
    var cep = $('#cep');
    cep.addEventListener('input', function () {
      var v = cep.value.replace(/\D/g, '').slice(0, 8); cep.value = v.length > 5 ? v.slice(0, 5) + '-' + v.slice(5) : v;
      var arcos = /^35588/.test(v);  /* Arcos/MG: 35588-000 (Google da loja). Conferir com a loja */
      $('#op-retirada').hidden = !(v.length === 8);
      $('#frete-msg').textContent = v.length === 8 ? (arcos ? 'Você está em Arcos: dá para retirar na loja sem custo.' : 'Frete calculado pela transportadora na versão final.') : '';
    });
    var cpf = $('#cpf');
    cpf.addEventListener('input', function () {
      var v = cpf.value.replace(/\D/g, '').slice(0, 11);
      cpf.value = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    });
    formFim.addEventListener('submit', function (e) {
      e.preventDefault();
      if ($('#site-url').value) return;            /* robô preencheu o campo-armadilha */
      $('#msg-final').hidden = false; $('#msg-final').focus();
    });
  })();
})();
