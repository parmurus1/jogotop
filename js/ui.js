'use strict';
// Interface comum: troca de telas, HUD, cartas, diálogos, modais e dicas.

Object.assign(ART, {
  u_menu: { noShade: true, rows: `
........
.666666.
........
.666666.
........
.666666.
........
........` },
  u_deck: { rows: `
........
..5555..
.566665.
.567765.
.566665.
.566665.
..5555..
........` }
});

const UI = (() => {
  const root = document.getElementById('app');
  let actions = {};
  let current = '';

  // Cliques são delegados: qualquer elemento com data-act chama a ação registrada pela tela atual.
  root.addEventListener('click', e => {
    AUDIO.unlock();
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.act];
    if (!fn) return;
    if (!el.dataset.silent) AUDIO.sfx(el.dataset.act === 'back' || el.dataset.act === 'close' ? 'back' : 'click');
    fn(el, e);
  });
  root.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest('button:not(:disabled), .card, .node.avail');
    if (el && !el.contains(e.relatedTarget)) AUDIO.sfx('hover');
  });

  function show(name, html, acts = {}) {
    current = name;
    actions = acts;
    hideTip();
    root.innerHTML = html;
    return root.firstElementChild;
  }
  function addActions(acts) { Object.assign(actions, acts); }

  // Troca de tela com um "corte de fita".
  function cut(osd) {
    VHS.disturb(.9, 420);
    if (osd) VHS.osd(osd);
  }

  // ---------- pequenos componentes ----------
  const icon = (n, cls) => SPR.icon(n, cls);
  // HUD do mapa e dos lugares: vida, lascas, Podridão e máscaras, em pergaminho.
  function rotTip() {
    const t = rotTier(RUN.rot), T = ROT_TIERS[t];
    return `<b>Podridão do bosque · ${RUN.rot}% · ${T.name}</b>${T.fx}<br><span class='dim'>Sobe a cada lugar visitado (e mais rápido com Máscaras). Com 30%, 60% e 90% o bosque piora de estágio. Desce ao Lembrar na fogueira, ao Purificar na capela e ao encarar memórias.</span>`;
  }
  function hud(o = {}) {
    if (!RUN) return '';
    const hideHp = hides(RUN.masks, 'ownHp');
    const pct = hideHp ? 100 : RUN.hp / maxHpNow() * 100;
    const t = rotTier(RUN.rot);
    const masks = RUN.masks.map(m => `<span class="hmask" data-tip="<b>${esc(MASKS[m].name)}</b>${esc(MASKS[m].gift)}<br><span class='dim'>${esc(MASKS[m].cost)}</span>">${SPR.img(MASKS[m].art, 3)}</span>`).join('');
    const relics = (RUN.relics || []).map(r => `<span class="hrelic" data-relic="${r}" data-tip="<b>${esc(RELICS[r].name)}</b>${esc(RELICS[r].text)}">${SPR.img(RELICS[r].art, 3)}</span>`).join('');
    return `<div class="hud">
      <div class="hud-panel">
        <div class="hp-row" data-stat="hp" data-tip="<b>Vida</b>Se chegar a zero, Bram acorda de novo na borda do bosque.">${SPR.img('u_heart', 3)}<div class="hpbar"><i style="width:${pct}%"></i><span>${hideHp ? '??' : RUN.hp} / ${hideHp ? '??' : maxHpNow()}</span></div></div>
        <div class="hud-row">
          <span class="stat" data-stat="lascas" data-tip="<b>Lascas de luz</b>A moeda do bosque. Gaste com a Ysolde, o Tobias, a Dona Marga e na capela.">${SPR.img('u_lasca', 3)}<b>${RUN.lascas}</b></span>
          <span class="stat rot t${t}" data-stat="rot" data-tip="${esc(rotTip())}">${SPR.img('u_bolor', 3)}<span class="rotg"><span class="rotbar"><i style="width:${RUN.rot}%"></i><u style="left:30%"></u><u style="left:60%"></u><u style="left:90%"></u></span><small>Podridão · ${ROT_TIERS[t].name}</small></span></span>
        </div>
        ${masks ? `<div class="hud-row masks">${masks}</div>` : ''}
        ${relics ? `<div class="hud-row relics" data-stat="relics">${relics}</div>` : ''}
        ${RUN.asc ? `<div class="hud-asc" data-tip="<b>Ciclo+${RUN.asc}</b>${esc(ASCENSION.slice(0, RUN.asc).map(a => a.text).join(' '))}">Ciclo+${RUN.asc}</div>` : ''}
      </div>
      <div class="hud-right">
        ${o.noDeck ? '' : `<button class="btn icon" data-act="deck" data-tip="Baralho">${SPR.img('u_deck', 2)}</button>`}
        <button class="btn icon" data-act="pause" data-tip="Menu">${SPR.img('u_menu', 2)}</button>
      </div>
    </div>`;
  }
  function refreshHud() {
    const old = $('.hud'); if (old && RUN) old.outerHTML = hud();
    const l = $('.lamp:not(.mini)'); if (l && RUN) l.outerHTML = lamp(l.classList.contains('on-counter') ? 'on-counter' : '');
  }

  // Retorno visual e sonoro de cura, lascas, Podridão e Lampião.
  function center(el) { const r = el?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 }; }
  function coins(n, from, to) {
    const layer = document.getElementById('fxlayer');
    const count = Math.min(10, Math.max(3, Math.round(n / 5)));
    for (let k = 0; k < count; k++) {
      const c = document.createElement('img');
      c.className = 'coinfly'; c.src = SPR.url('u_lasca');
      layer.appendChild(c);
      const dx = (Math.random() - .5) * 60, delay = k * 55;
      c.animate([
        { transform: `translate(${from.x}px, ${from.y}px) scale(.6)`, opacity: 0 },
        { transform: `translate(${(from.x + to.x) / 2 + dx}px, ${Math.min(from.y, to.y) - 70 - Math.random() * 40}px) scale(1.4) rotate(180deg)`, opacity: 1, offset: .45 },
        { transform: `translate(${to.x}px, ${to.y}px) scale(.8) rotate(360deg)`, opacity: 1 }
      ], { duration: 620, delay, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' }).onfinish = () => { c.remove(); AUDIO.sfx('coin'); };
    }
  }
  function bump(el, cls) { if (!el) return; el.classList.remove('bump', cls); void el.offsetWidth; el.classList.add('bump', cls); setTimeout(() => el.classList.remove('bump', cls), 900); }
  function feedback(kind, n, ref) {
    requestAnimationFrame(() => {
      refreshHud();
      const hp = $('[data-stat=hp]'), money = $('[data-stat=lascas]'), rot = $('[data-stat=rot]'), lampEl = $('.lamp');
      if (kind === 'heal') {
        AUDIO.sfx('healBig');
        const p = center(hp); bump(hp, 'good');
        FX.float('+' + n + ' vida', p.x + 40, p.y, 'heal');
        FX.burst(p.x, p.y, { n: 24, colors: ['#a6e08a', '#e8ffd0', '#6fbf5a'], speed: 50, grav: -40, life: .9 });
      } else if (kind === 'coinIn') {
        const to = center(money), from = ref ? center(ref) : { x: innerWidth / 2, y: innerHeight / 2 };
        coins(n, from, to); bump(money, 'gold');
        FX.float('+' + n, to.x + 30, to.y, 'gold');
      } else if (kind === 'coinOut') {
        const from = center(money), to = ref ? center(ref) : { x: innerWidth / 2, y: innerHeight * .45 };
        AUDIO.sfx('spend'); coins(n, from, to); bump(money, 'spent');
        FX.float('−' + n, from.x + 30, from.y, 'small');
      } else if (kind === 'purify') {
        AUDIO.sfx('purify');
        const p = center(rot); bump(rot, 'good');
        FX.float('Podridão −' + n + '%', p.x + 30, p.y, 'heal');
        FX.burst(p.x, p.y, { n: 30, colors: ['#e8f0d0', '#b8e0a0', '#fff'], speed: 40, grav: -70, life: 1.1 });
      } else if (kind === 'lightUp') {
        AUDIO.sfx('lampUp');
        const p = center(lampEl); bump(lampEl, 'glow');
        FX.float('Lampião +' + n, p.x + 40, p.y - 20, 'gold');
        FX.burst(p.x, p.y, { n: 34, colors: ['#ffe08a', '#ffb45c', '#fff6d0'], speed: 70, grav: -20, life: 1 });
        VHS.clear(1500); LAMP.feel('happy', 2000); LAMP.hop();
      } else if (kind === 'relic') {
        AUDIO.sfx('relic');
        const to = center($(`.hrelic[data-relic="${n}"]`) || $('.hud-panel')), from = ref ? center(ref) : { x: innerWidth / 2, y: innerHeight / 2 };
        const img = document.createElement('img');
        img.className = 'relicfly'; img.src = SPR.url(RELICS[n].art);
        document.getElementById('fxlayer').appendChild(img);
        img.animate([
          { transform: `translate(${from.x}px, ${from.y}px) scale(5)`, opacity: 0 },
          { transform: `translate(${from.x}px, ${from.y - 60}px) scale(7)`, opacity: 1, offset: .35 },
          { transform: `translate(${to.x}px, ${to.y}px) scale(3)`, opacity: 1 }
        ], { duration: 1100, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).onfinish = () => { img.remove(); bump($(`.hrelic[data-relic="${n}"]`), 'glow'); };
        FX.float(RELICS[n].name, from.x, from.y - 40, 'gold');
        FX.burst(from.x, from.y, { n: 40, colors: ['#ffe08a', '#fff', '#c8b0ff'], speed: 90, grav: -20, life: 1 });
        LAMP.react('found');
      } else if (kind === 'lightDown') {
        AUDIO.sfx('lamp', { up: false });
        flickerLamp(); LAMP.feel('worried', 1800);
        const p = center(lampEl); FX.float('Lampião −' + n, p.x + 40, p.y - 20, 'small');
      }
    });
  }
  function lamp(cls = '') {
    if (!RUN) return '';
    const L = RUN.light;
    const effects = [L >= 3 ? 'Mostra também a próxima intenção do inimigo.' : 'Com 3 de luz, mostra também a próxima intenção do inimigo.', L >= 5 ? '+1 alma no início de cada combate.' : 'Com 5 de luz, +1 alma no início de cada combate.'];
    LAMP.setBase(L === 0 ? 'sleep' : 'idle');
    return `<div class="lamp ${cls}" style="--l:${L}" data-tip="<b>O Lampião · ${L}/5</b>Ele segue Bram e repara em tudo. Fica mais forte quando você encara uma lembrança e mais fraco quando você foge dela ou põe uma Máscara.<br><span class='dim'>${effects.join('<br>')}</span>">${LAMP.html(3)}<span class="lvl">${'●'.repeat(L)}${'○'.repeat(5 - L)}</span></div>`;
  }
  function flickerLamp() {
    const l = $('.lamp');
    if (!l) return;
    l.classList.remove('flicker'); void l.offsetWidth; l.classList.add('flicker');
  }

  // Nome e arte da carta apagada se revelam com as memórias.
  function apagadaName(mem) {
    if (mem <= 0) return 'A Carta Apagada';
    if (mem >= 8) return 'Tamsin';
    const k = Math.ceil(mem * 6 / 8);
    return 'Tamsin'.split('').map((ch, i) => i < k ? ch : '·').join('');
  }
  const eraseFor = mem => mem >= 8 ? 0 : clamp(.92 - mem * .1, .1, .92);

  // Carta em pergaminho com arte a tinta, sigilos no meio e números nos cantos.
  const ink = n => SPR.img(n, 1, {}, 'sg');
  function card(c, o = {}) {
    const d = CARDS[c.id], mem = memCount();
    const isA = c.id === 'apagada';
    const art = isA ? SPR.img('tamsin', 3, { ink: true, erase: eraseFor(mem) }) : SPR.img(d.art, 3, { ink: true });
    const name = isA ? apagadaName(mem) : d.name;
    const f = d.face(c.up, mem);
    const hide = o.hideText;
    const sig = hide ? '<span class="sgbox q">?</span>' : f.sig.map(([s, n]) => `<span class="sgbox">${ink('s_' + s)}${n !== undefined && n !== '' ? `<b>${n}</b>` : ''}</span>`).join('');
    const corner = (v, icon, cls) => v == null ? '<span></span>' : `<span class="${cls}">${ink(icon)}<b>${hide ? '?' : v}${f.hits && cls === 'c-atk' && !hide ? '<i>×' + f.hits + '</i>' : ''}</b></span>`;
    const cost = cardCost(c.id);
    const cls = ['card', 's-' + d.suit, c.up ? 'up' : '', d.rarity === 'maldita' ? 'maldita' : '', d.rarity === 'rara' ? 'rara' : '', o.cls || ''].join(' ');
    return `<div class="${cls}" data-uid="${c.uid ?? ''}" data-id="${c.id}" ${o.attrs || ''}>
      <div class="c-head"><span class="c-name">${esc(name)}</span></div>
      <span class="c-cost">${cost ? Array.from({ length: cost }, () => SPR.img('u_soul', 2)).join('') : '<em>0</em>'}</span>
      <div class="c-art">${art}</div>
      <div class="c-sig">${sig}</div>
      <div class="c-foot">${corner(f.atk, 's_atk', 'c-atk')}${corner(f.def, 's_def', 'c-def')}</div>
    </div>`;
  }
  function cardTip(c) {
    const d = CARDS[c.id], mem = memCount();
    const name = c.id === 'apagada' ? apagadaName(mem) : d.name;
    const suit = SUITS[d.suit];
    const cost = cardCost(c.id);
    return `<b>${esc(name)}${c.up ? '+' : ''}</b><span style="color:${suit.color}">${suit.name}</span> · ${cost ? cost + (cost > 1 ? ' almas' : ' alma') : 'grátis'}<br>${esc(d.text(c.up, mem))}${d.suit === 'memoria' ? '<br><span class="dim">Memória conta como o naipe da carta anterior.</span>' : ''}`;
  }

  // ---------- dicas (mouse: passar por cima · toque: segurar) ----------
  let tipEl = null, holdTimer = 0;
  function showTip(html, x, y) {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'node-tip panel'; document.body.appendChild(tipEl); }
    tipEl.innerHTML = html;
    tipEl.style.display = 'block';
    const r = tipEl.getBoundingClientRect();
    tipEl.style.left = clamp(x + 14, 6, innerWidth - r.width - 6) + 'px';
    tipEl.style.top = clamp(y - r.height - 14, 6, innerHeight - r.height - 6) + 'px';
  }
  function hideTip() { if (tipEl) tipEl.style.display = 'none'; clearTimeout(holdTimer); }
  const tipFor = el => {
    if (el.dataset.tip) return el.dataset.tip;
    if (!el.classList.contains('card') || !el.dataset.id || el.closest('.card.big')) return null;
    if (el.closest('.battle') && RUN && hides(RUN.masks, 'cardText')) return `<b>${esc(CARDS[el.dataset.id].name)}</b><span class="dim">A Máscara Sem Olhos apagou o texto.</span>`;
    return cardTip({ id: el.dataset.id, up: el.classList.contains('up') });
  };
  root.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest('[data-tip], .card[data-id]');
    const html = el && tipFor(el);
    if (html && !document.querySelector('.card.ghost')) showTip(html, e.clientX, e.clientY); else hideTip();
  });
  root.addEventListener('pointerleave', hideTip);
  root.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    const el = e.target.closest('[data-tip], .card[data-id]');
    const html = el && tipFor(el);
    if (!html) return;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => showTip(html, e.clientX, e.clientY), 420);
  });
  addEventListener('pointerup', () => { clearTimeout(holdTimer); setTimeout(hideTip, 1600); });
  addEventListener('scroll', hideTip, true);

  // ---------- modal ----------
  function modal(html, o = {}) {
    const ov = h(`<div class="overlay"><section class="panel modal ${o.cls || ''}" role="dialog" aria-modal="true">${html}</section></div>`);
    root.appendChild(ov);
    const close = () => { ov.remove(); AUDIO.muffle(false); o.onClose && o.onClose(); };
    ov.addEventListener('click', e => {
      if (e.target === ov && !o.locked) { AUDIO.sfx('back'); close(); return; }
      const el = e.target.closest('[data-m]');
      if (el && o.on && o.on[el.dataset.m] && !el.disabled) { AUDIO.sfx(el.dataset.m === 'close' ? 'back' : 'click'); o.on[el.dataset.m](el, close); }
    });
    if (o.muffle) AUDIO.muffle(true);
    return { el: ov, close };
  }

  function deckModal(title = 'Seu baralho', pick = null) {
    const order = Object.keys(SUITS);
    const sorted = RUN.deck.slice().sort((a, b) => order.indexOf(CARDS[a.id].suit) - order.indexOf(CARDS[b.id].suit) || a.id.localeCompare(b.id));
    return new Promise(resolve => {
      const counts = Object.entries(SUITS).map(([k, s]) => { const n = RUN.deck.filter(c => CARDS[c.id].suit === k).length; return n ? `<span class="chip">${SPR.icon(s.icon)} ${n}</span>` : ''; }).join('');
      const m = modal(`<header><div><div class="kicker">${RUN.deck.length} almas seladas · passe o mouse ou toque numa carta</div><h2>${esc(title)}</h2></div><button class="btn small" data-m="close">Fechar</button></header>
        <div class="row wrap">${counts}</div>
        <div class="body"><div class="deck-grid">${sorted.map(c => card(c, { cls: 'mini', attrs: pick ? `data-m="pick" data-pick="${c.uid}"` : 'data-m="info"' })).join('')}</div></div>`,
      { cls: '', muffle: true, onClose: () => resolve(null), on: {
        close: (el, close) => close(),
        info: el => { const r = el.getBoundingClientRect(); showTip(cardTip({ id: el.dataset.id, up: el.classList.contains('up') }), r.right - 10, r.top + 20); },
        pick: (el, close) => { const uid = +el.dataset.pick; resolve(uid); m.close(); }
      } });
      if (pick) $$('.card', m.el).forEach(c => { if (!pick(+c.dataset.uid)) c.style.opacity = .3; });
    });
  }

  // Escolhe uma carta do baralho (melhorar, remover...). filtro opcional.
  function pickCard(title, filter = () => true) {
    return new Promise(resolve => {
      const list = RUN.deck.filter(c => filter(c));
      if (!list.length) { toast('Nenhuma carta serve para isso.'); resolve(null); return; }
      const m = modal(`<header><div><div class="kicker">Escolha uma carta</div><h2>${esc(title)}</h2></div><button class="btn small" data-m="close">Cancelar</button></header>
        <div class="body"><div class="deck-grid">${list.map(c => `<div class="offer" data-m="pick" data-uid="${c.uid}" style="cursor:pointer">${card(c, { cls: 'mini' })}<div class="desc">${esc(CARDS[c.id].text(c.up, memCount()))}</div></div>`).join('')}</div></div>`,
      { muffle: true, onClose: () => resolve(null), on: {
        close: (el, close) => close(),
        pick: el => { const uid = +el.dataset.uid; m.el.remove(); AUDIO.muffle(false); resolve(uid); }
      } });
    });
  }

  // ---------- diálogo ----------
  // speaker: { name, portrait, voice }. Linhas: "*narração" (sem voz) · "~mentira" (letras tremem, o Lampião pisca).
  function dialogue(speaker, lines) {
    return new Promise(resolve => {
      const pic = speaker.portrait || speaker.art;
      const box = h(`<div class="dialog" role="dialog">
        <div class="portrait ${speaker.portrait ? 'bust' : ''}">${pic ? `<img class="px" id="dlgPic" src="${SPR.url(pic)}" alt="">` : ''}</div>
        <div class="dlg-main"><div class="who">${esc(speaker.name || '')}</div><div class="line"></div></div><div class="more">▼</div></div>`);
      const catcher = h('<div class="dlg-catch"></div>');
      root.appendChild(catcher);
      root.appendChild(box);
      const lineEl = $('.line', box), picEl = $('#dlgPic', box);
      const talkUrl = speaker.portrait && ART[speaker.portrait]?.talk ? SPR.url(speaker.portrait + '@talk') : null;
      const restUrl = pic ? SPR.url(pic) : null;
      let i = -1, timer = 0, spans = [], shown = 0, done = true, mouth = false;
      const setMouth = open => { if (picEl && talkUrl) { picEl.src = open ? talkUrl : restUrl; } mouth = open; };
      function next() {
        i++;
        if (i >= lines.length) { box.classList.add('out'); catcher.remove(); setTimeout(() => { box.remove(); resolve(); }, 160); return; }
        let t = lines[i];
        const narr = t.startsWith('*'), lie = t.startsWith('~');
        t = t.replace(/^[*~]/, '');
        lineEl.className = 'line' + (narr ? ' narr' : '') + (lie ? ' lie' : '');
        box.classList.toggle('speaking', !narr);
        if (lie) { flickerLamp(); AUDIO.sfx('lamp', { up: false }); VHS.disturb(.5, 500); LAMP.react('lie'); }
        lineEl.innerHTML = [...t].map((ch, k) => `<span style="--k:${k}">${ch === ' ' ? ' ' : esc(ch)}</span>`).join('');
        spans = [...lineEl.children]; shown = 0; done = false;
        typeNext(narr);
      }
      function typeNext(narr) {
        clearTimeout(timer);
        if (shown >= spans.length) { done = true; setMouth(false); return; }
        const ch = spans[shown].textContent;
        spans[shown].classList.add('on');
        shown++;
        if (!narr && /[a-zà-úA-ZÀ-Ú0-9]/.test(ch)) { if (shown % 2) AUDIO.sfx('voice', { who: speaker.voice }); setMouth(!mouth); }
        let d = SETTINGS.fast ? 12 : 32;
        if (/[.!?…]/.test(ch)) d = SETTINGS.fast ? 120 : 320; else if (/[,;:—]/.test(ch)) d = SETTINGS.fast ? 60 : 150;
        if (narr) d *= .7;
        timer = setTimeout(() => typeNext(narr), d);
      }
      const advance = () => {
        AUDIO.unlock();
        if (!done) { clearTimeout(timer); spans.forEach(s => s.classList.add('on')); shown = spans.length; done = true; setMouth(false); return; }
        AUDIO.sfx('page');
        next();
      };
      box.addEventListener('click', advance);
      catcher.addEventListener('click', advance);
      next();
    });
  }

  // ---------- menu de pausa ----------
  function pauseMenu(extra = {}) {
    modal(`<header><div><div class="kicker">${RUN ? `Ciclo ${META.cycles} · ${ACT_INFO[RUN.act].name}` : ''}</div><h2>Pausa</h2></div></header>
      <div class="menu" style="min-width:0">
        <button data-m="close">Continuar</button>
        ${RUN ? '<button data-m="deck">Ver baralho</button>' : ''}
        <button data-m="guide">Guia de combos</button>
        <button data-m="opts">Opções</button>
        ${SETTINGS.dev ? '<button data-m="dev">Desenvolvedor</button>' : ''}
        <button data-m="quit">Salvar e voltar ao menu</button>
      </div>`, { cls: 'compact', muffle: true, on: {
      close: (el, close) => close(),
      deck: (el, close) => { close(); deckModal(); },
      guide: (el, close) => { close(); comboGuide(); },
      opts: (el, close) => { close(); SCREENS.options(true); },
      dev: (el, close) => { close(); if (extra.beforeQuit) extra.beforeQuit(); saveRun(); SCREENS.dev(); },
      quit: (el, close) => { close(); if (extra.beforeQuit) extra.beforeQuit(); saveRun(); SCREENS.title(); }
    } });
  }

  function comboGuide() {
    const suits = Object.entries(SUITS).map(([k, s]) => `<div>${SPR.icon(s.icon)} <b style="color:${s.color}">${s.name}</b> · ${s.role}</div>`).join('');
    const combos = Object.values(COMBOS).map(c => `<div><b>${c.name}</b> — ${esc(c.desc)}</div>`).join('');
    const sts = Object.values(STATUS_INFO).map(s => `<div>${SPR.icon(s.icon)} <b>${s.name}</b> — ${esc(s.desc)}</div>`).join('');
    modal(`<header><div><div class="kicker">A Fila ativa da esquerda para a direita</div><h2>Guia de combos</h2></div><button class="btn small" data-m="close">Fechar</button></header>
      <div class="body combo-list"><h3>Naipes</h3>${suits}<p class="dim">A Roda: Sombra → Presa → Cinza → Casca → Sombra.</p><h3>Combos</h3>${combos}<h3>Estados</h3>${sts}</div>`,
    { muffle: true, on: { close: (el, close) => close() } });
  }

  return { show, showTip, addActions, cut, hud, lamp, refreshHud, feedback, flickerLamp, card, cardTip, modal, deckModal, pickCard, dialogue, pauseMenu, comboGuide, apagadaName, eraseFor, hideTip, get current() { return current; }, root };
})();
