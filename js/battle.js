'use strict';
// Tela de combate. Monte a Fila (até 5 cartas; cada uma custa almas do Saco), veja a prévia e sele.
// A resolução vem do motor (engine.js); aqui só animamos os eventos que ele devolve.
// Efeito de carta = números brancos saindo da própria carta. Combo = cartas ligadas por uma corrente colorida + faixa com o nome.

const BATTLE = (() => {
  let node = null, B = null, drawPile = [], discard = [], hand = [], fila = [], busy = false, swapped = false, tempSeq = 0;
  let fresh = new Set();

  // Velocidade: botão 1×/2×/3× e, durante a rodada, tocar na tela acelera ainda mais.
  let rush = false;
  const T = ms => reduced() ? Math.min(ms, 90) : ms / combatSpeed() / (rush ? 3 : 1);
  const wait = ms => sleep(T(ms));
  const byUid = uid => hand.find(c => c.uid == uid) || fila.find(c => c && c.uid == uid);
  const spent = () => fila.reduce((s, c) => s + (c ? cardCost(c.id) : 0), 0);
  const free = () => B.souls - spent();
  const filaCards = () => fila.filter(Boolean);

  function shuffle(a) { return runRng().shuffle(a); }

  // ---------- início ----------
  let tutorialNow = false;
  function start(n, o = {}) {
    node = n;
    tutorialNow = !!o.tutorial || (!META.knowledge.battleTut && !(RUN && RUN.dev));
    const def = ENEMIES[n.enemy];
    B = makeBattle({ enemyId: n.enemy, hp: RUN.hp, maxHp: maxHpNow(), masks: RUN.masks, relics: RUN.relics || [], asc: RUN.asc || 0, memories: memCount(), light: RUN.light, rot: RUN.rot,
      perRound: SOULS_PER_ROUND + (RUN.soulRite || 0), bagMax: BAG_MAX + (RUN.bagBonus || 0), scale: n.type === 'elite' && def.boss ? .72 : 1 });
    if (hasMask(RUN.masks, 'viuva')) B.bram.hp = Math.max(1, B.bram.hp - 3);
    drawPile = shuffle(RUN.deck.map(c => ({ ...c })));
    discard = []; hand = []; fila = Array(SLOTS).fill(null);
    seeEnemy(n.enemy, false);
    hurtSaid = false;
    RUN.arena = def.bg || o.arena || arenaFor(n);
    music();
    if (def.boss || n.type === 'elite') bossIntro(def, () => newRound());
    else { VHS.osd('▶ ' + def.name.toUpperCase()); newRound(); }
  }
  function music() {
    const def = ENEMIES[B.enemy.id];
    SCENE.set(def.bg || RUN.arena || arenaFor(node), { arena: true });
    AUDIO.music(def.final ? 'dragon' : (def.boss || node.type === 'elite') ? 'boss' : ['battle', 'battle', 'battle2', 'battle3'][Math.min(3, RUN.act)]);
    AUDIO.ambience('battle');
    updateAtmosphere();
  }
  // Cada luta comum acontece num canto diferente do bosque (sorteado pelo lugar do mapa, para não mudar ao recarregar).
  function arenaFor(n) {
    const list = ARENAS[Math.min(4, RUN.act)] || ['forest'];
    let h = 0; for (const ch of String(n.id || '') + RUN.seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return list[h % list.length];
  }
  function resume() {
    const s = RUN.battle;
    node = s.node; B = s.B; drawPile = s.draw; discard = s.discard; hand = s.hand; fila = Array(SLOTS).fill(null);
    music();
    render();
  }
  function snapshot() { RUN.hp = B.bram.hp; RUN.battle = { node, B, draw: drawPile, discard, hand }; saveRun(); }

  function bossIntro(def, go) {
    const kicker = def.final ? 'O Dragão das Cinzas' : def.boss ? `Guardião do Luto · ${def.grief}` : def.grief ? `Corrompido · ${def.grief}` : 'Corrompido forte';
    UI.show('battle-intro', `<section class="screen ending intro" data-act="go" data-silent="1" style="cursor:pointer;gap:14px">
      <div class="kicker">${esc(kicker)}</div>
      <div class="intro-art">${SPR.img(def.battleArt || def.art, def.boss ? (innerWidth < 600 ? 4 : 6) : 7, { corrupt: !!def.corrupt })}</div>
      <h2 class="intro-name">${esc(def.name)}</h2>
      <p class="narr" style="max-width:620px;font-size:22px">${esc(def.lore)}</p>
      ${def.passive || def.phases ? `<p class="dim" style="max-width:620px">${esc(def.passive || def.phases[0].passive)}</p>` : ''}
      <button class="btn primary">Enfrentar</button>
    </section>`, { go });
    AUDIO.sfx(def.final ? 'roar' : 'enemyWind');
    VHS.disturb(1.4, 900);
  }

  // ---------- rodadas ----------
  function drawCards(n) {
    for (let k = 0; k < n; k++) {
      if (!drawPile.length) { drawPile = shuffle(discard); discard = []; }
      if (!drawPile.length) break;
      const c = drawPile.pop(); hand.push(c); fresh.add(c.uid);
    }
  }
  function newRound() {
    const gain = beginRound(B);
    const n = Math.max(0, HAND_SIZE - hand.length) + B.extraDraw;
    B.extraDraw = 0;
    drawCards(n);
    if (B.offer) { B.offer = false; const c = { uid: 'f' + (++tempSeq), id: 'fiodoce', up: false }; hand.push(c); fresh.add(c.uid); }
    fila = Array(SLOTS).fill(null);
    swapped = false;
    busy = false;
    // A música fica mais intensa conforme Bram perde vida.
    AUDIO.setIntensity(1 - B.bram.hp / B.bram.maxHp);
    LAMP.setBase(B.bram.hp / B.bram.maxHp < .3 ? 'worried' : RUN.light === 0 ? 'sleep' : 'idle');
    snapshot();
    render();
    if (gain > 0 && B.round > 1) { AUDIO.sfx('soul', { n: 0 }); renderBag(gain); }
    banner(`Rodada ${B.round}`, `+${gain} almas`, '#9fe8f0', true);
    const talk = ENEMY_TALK[B.enemy.id];
    if (talk && B.round === 1) setTimeout(() => say(rng.pick(B.enemy.phase ? talk.phase2 || talk.start : talk.start), 2600), 900);
    if (tutorialNow && B.round === 1) { tutorialNow = false; setTimeout(() => TUTORIAL.combat(), 700); return; }
    hints();
  }
  function hints() {
    if (B.round === 1) hintOnce('fila', 'Toque numa carta para colocá-la na Fila. Cada carta gasta almas do Saco (as gotas azuis no canto da carta).');
    else if (B.round === 2) hintOnce('save', `Almas que você não gasta ficam no Saco para a próxima rodada (até ${B.bagMax}). Guarde para montar combos maiores.`);
    else if (B.round === 3) hintOnce('order', 'A ordem importa: a Fila ativa da esquerda para a direita. Arraste as cartas para trocá-las de lugar.');
  }

  // ---------- desenho ----------
  const isSmall = () => innerWidth < 760 || innerHeight < 620;
  // Tamanho na tela: cada inimigo tem um porte (size); chefes ocupam bem mais espaço.
  function enemyScale() {
    const def = ENEMIES[B.enemy.id], sz = SPR.size(def.battleArt || def.art), k = def.size || 1;
    const maxH = innerHeight * (isSmall() ? .17 : .22) * k, maxW = innerWidth * (isSmall() ? .46 : .34);
    return clamp(Math.round(Math.min(maxH / sz.h, maxW / sz.w)), 2, 12);
  }
  function bramScale() { const sz = SPR.size('bram'); return clamp(Math.floor(innerHeight * (isSmall() ? .13 : .19) / sz.h), 2, 5); }

  const INTENT_ICON = it => ({ atk: 'u_atk', heavy: 'u_atk', block: 'u_armor', offer: 'u_offer', observe: 'u_observe', buff: 'u_buff',
    debuff: it.apply && it.apply.bolor ? 'u_bolor' : it.apply && it.apply.culpa ? 'u_culpa' : it.apply && it.apply.exposto ? 'u_exposto' : 'u_esquecimento' })[it.kind];
  function intentHTML(it, next = false) {
    if (!it) return '';
    const hideN = hides(B.masks, 'intentNumbers');
    let num = '';
    if (it.dmg) num = hideN ? '?' : it.dmg + (it.hits > 1 ? '×' + it.hits : '');
    else if (it.armor) num = hideN ? '?' : it.armor;
    const extras = [];
    if (it.dmg && it.armor) extras.push(`${SPR.icon('u_armor')}${hideN ? '?' : it.armor}`);
    if (it.dmg && it.apply) for (const k of Object.keys(it.apply)) extras.push(SPR.icon(STATUS_INFO[k].icon));
    if (it.heal) extras.push(`${SPR.icon('u_heal')}${it.heal}`);
    if (it.breakMask) extras.push(SPR.icon('m_semolhos'));
    return `<div class="intent k-${it.kind} ${next ? 'next' : ''}" data-tip="${esc(intentTip(it, hideN))}">${next ? '<span class="nx">depois</span>' : ''}${SPR.img(INTENT_ICON(it), 2)}${num !== '' ? `<span class="num">${num}</span>` : ''}${extras.join(' ')}${next ? '' : `<span class="lbl">${esc(it.label)}</span>`}</div>`;
  }
  function intentTip(it, hideN) {
    const p = [];
    if (it.dmg) p.push(hideN ? 'Vai atacar. (A Máscara do Sorriso esconde quanto.)' : `Vai atacar: ${it.dmg} de dano${it.hits > 1 ? `, ${it.hits} vezes` : ''}. Sua Guarda absorve; Fraqueza reduz.`);
    if (it.armor) p.push(`Ganha ${hideN ? '?' : it.armor} de couraça.`);
    if (it.heal) p.push(`Recupera ${it.heal} de vida.`);
    if (it.cleanse) p.push('Remove todos os próprios efeitos.');
    if (it.apply) for (const [k, v] of Object.entries(it.apply)) p.push(`Aplica ${STATUS_INFO[k].name}${k === 'exposto' ? '' : ' ' + v} em Bram.`);
    if (it.offer) p.push('Oferece o Fio Doce: uma carta grátis e forte que cobra memória.');
    if (it.observe) p.push('Não ataca. Apenas observa.');
    if (it.breakMask) p.push('Uma de suas Máscaras vai se partir.');
    if (it.sermon) p.push('Um sermão que pesa.');
    return `<b>${esc(it.label)}</b>${p.join('<br>')}`;
  }
  function statusChips(st, extra = {}) {
    const all = { ...st, ...extra };
    return Object.entries(all).filter(([, v]) => v > 0).map(([k, v]) => {
      const info = STATUS_INFO[k]; if (!info) return '';
      return `<span class="st" data-k="${k}" data-tip="<b>${info.name}</b>${esc(info.desc)}">${SPR.icon(info.icon)}${['marca', 'exposto', 'atordoado'].includes(k) ? '' : v}</span>`;
    }).join('');
  }
  function enemyBars(v) {
    const hideHp = hides(B.masks, 'enemyHp');
    const pct = hideHp ? 100 : v.ehp / v.emax * 100;
    return `<div class="bar" id="ebar" data-tip="<b>Vida do inimigo</b>${hideHp ? 'A Máscara do Cervo esconde.' : `${v.ehp}/${v.emax}`}"><i class="ghost" style="width:${pct}%"></i><i style="width:${pct}%"></i><span>${hideHp ? '???' : `${v.ehp}/${v.emax}`}</span></div>
      ${v.earmor > 0 ? `<span class="badge armor" data-tip="${esc('<b>Couraça</b>' + STATUS_INFO.couraca.desc)}">${SPR.img('u_armor', 2)}<b>${v.earmor}</b></span>` : ''}`;
  }
  function bramBars(v) {
    const hideHp = hides(B.masks, 'ownHp');
    const pct = hideHp ? 100 : v.bhp / v.bmax * 100;
    return `<div class="bar me" id="bbar"><i class="ghost" style="width:${pct}%"></i><i style="width:${pct}%"></i><span>${hideHp ? '??' : `${v.bhp}/${v.bmax}`}</span></div>
      ${v.bguard > 0 ? `<span class="badge guard" data-tip="${esc('<b>Guarda</b>' + STATUS_INFO.guarda.desc)}">${SPR.img('u_guard', 2)}<b>${v.bguard}</b></span>` : ''}`;
  }
  const viewOf = () => ({ ehp: B.enemy.hp, emax: B.enemy.maxHp, earmor: B.enemy.armor, est: B.enemy.st, bhp: B.bram.hp, bmax: B.bram.maxHp, bguard: B.bram.guard, bst: B.bram.st, souls: B.souls, impeto: 0 });

  function render() {
    const def = ENEMIES[B.enemy.id];
    const v = viewOf();
    const phaseName = def.phases ? def.phases[B.enemy.phase].name : def.grief || '';
    UI.show('battle', `<section class="screen battle">
      <div class="b-bar">
        <span class="tab">${esc(ACT_INFO[RUN.act].name)} · <b id="roundNo">Rodada ${B.round}</b></span>
        <div class="row" style="gap:8px">
          <button class="btn small speed" data-act="speed" data-tip="<b>Velocidade das animações</b>Durante a rodada, toque em qualquer lugar para acelerar ainda mais.">${combatSpeed()}×</button>
          <button class="btn icon" data-act="guide" data-tip="Guia de combos e estados">${SPR.img('u_unknown', 2)}</button>
          <button class="btn icon" data-act="pause" data-tip="Menu">${SPR.img('u_menu', 2)}</button>
        </div></div>
      <div class="b-stage">
        <div class="fighter me">
          <div class="sts" id="bsts">${statusChips(v.bst)}</div>
          <div class="sprite" id="bspr">${SPR.img('bram', bramScale())}<div class="lamp mini" style="--l:${RUN.light}">${LAMP.html(2)}</div></div>
          <div class="plate"><div class="pname">Bram</div><div class="pbars" id="bbars">${bramBars(v)}</div></div>
        </div>
        <div class="fighter enemy">
          <div class="intents" id="intents"></div>
          <div class="sprite" id="espr">${SPR.img(def.battleArt || def.art, enemyScale(), { corrupt: !!def.corrupt })}<div class="bubble" id="ebubble"></div></div>
          <div class="plate"><div class="pname">${esc(def.name)}${phaseName ? `<small>${esc(phaseName)}</small>` : ''}</div><div class="pbars" id="ebars">${enemyBars(v)}</div>${B.enemy.dmgAdd ? `<span class="rotbadge" data-tip="<b>Fortalecido pela Podridão</b>${esc(ROT_TIERS[B.enemy.dmgAdd].fx)}">${SPR.icon('u_bolor')} Podridão +${B.enemy.dmgAdd}</span>` : ''}</div>
          <div class="sts" id="ests">${statusChips(v.est)}</div>
        </div>
      </div>
      <div class="b-mid">
        <div class="preview" id="preview"></div>
        <div class="fila-wrap">
          <div class="jar" id="bag"></div>
          <div class="fila-box">
            <svg class="chains" id="chains"></svg>
            <div class="fila" id="fila"></div>
            <div class="seal-ring" id="sealRing"></div>
            ${runeCircle()}
            <div class="tally" id="tally"></div>
          </div>
          <div class="actions">
            <button class="btn primary seal-btn" data-act="seal" id="sealBtn">Selar</button>
            <button class="btn small" data-act="swap" id="swapBtn" data-tip="<b>Trocar a mão</b>Gaste 1 alma para descartar a mão e comprar cartas novas. Uma vez por rodada.">Trocar mão</button>
          </div>
        </div>
      </div>
      <div class="b-low">
        <button class="pile" data-act="piles" id="drawPile" data-tip="<b>Pilha de compra</b>Toque para ver as pilhas.">${SPR.img('u_pile', 3)}<b>${drawPile.length}</b></button>
        <div class="b-hand" id="hand"></div>
        <button class="pile" data-act="piles" id="discPile" data-tip="<b>Descarte</b>Volta a ser embaralhado quando a compra acaba.">${SPR.img('u_pile', 3, {}, 'disc')}<b>${discard.length}</b></button>
      </div>
      <div class="cbanner" id="cbanner"></div>
    </section>`, {
      seal: () => seal(),
      speed: el => { SETTINGS.speed = combatSpeed() % 3 + 1; saveSettings(); el.textContent = SETTINGS.speed + '×'; },
      swap: () => swapHand(),
      guide: () => UI.comboGuide(),
      piles: () => pilesModal(),
      pause: () => UI.pauseMenu({ beforeQuit: () => { returnFila(); snapshot(); } })
    });
    renderIntents();
    renderAll();
    bindDrag();
  }
  function renderIntents() {
    const el = $('#intents'); if (!el) return;
    let html = intentHTML(B.enemy.intent);
    if ((RUN.light >= 3 || hasRelic(RUN.relics, 'lupa')) && B.enemy.hp > 0) html += intentHTML(computeIntent(B, 1), true);
    el.innerHTML = html;
  }
  function renderAll() { renderFila(); renderHand(); renderBag(); renderPreview(); renderPiles(); }
  function renderPiles() {
    const d = $('#drawPile b'), x = $('#discPile b');
    if (d) d.textContent = drawPile.length;
    if (x) x.textContent = discard.length;
  }

  // O Saco de Almas: um pote com as almas dentro.
  function renderBag(anim, view) {
    const el = $('#bag'); if (!el) return;
    const souls = view ? view.souls : B.souls;
    const f = view ? souls : free();
    let dots = '';
    for (let k = 0; k < B.bagMax; k++) {
      const cls = k < f ? (anim && k >= f - anim ? 'gain' : '') : k < souls ? 'spend' : 'empty';
      dots += `<img class="px ${cls}" src="${SPR.url(k < souls ? 'u_soul' : 'u_soulempty')}" alt="">`;
    }
    el.innerHTML = `<div class="jar-body" data-tip="<b>Saco de Almas</b>${f} livre(s) de ${souls}. Cada carta gasta as almas indicadas nela. A cada rodada entram ${B.perRound || SOULS_PER_ROUND}${hasMask(B.masks, 'semolhos') ? '+1' : ''}. As que sobram ficam guardadas (máximo ${B.bagMax}).">
      <div class="jar-num">${f}</div><div class="souls">${dots}</div></div><div class="lbl">+${(B.perRound || SOULS_PER_ROUND) + (hasMask(B.masks, 'semolhos') ? 1 : 0)}/rodada</div>`;
  }

  // Combos previstos: correntes coloridas ligando as cartas envolvidas.
  function combosOf(ev) {
    const out = [];
    for (const e of ev) if (e.t === 'combo') { const c = COMBOS[e.id]; out.push({ id: e.id, from: e.id === 'selo' ? 0 : Math.max(0, e.i - c.span + 1), to: e.i }); }
    return out;
  }
  function drawChains(list, hot = null) {
    const svg = $('#chains'), box = $('.fila-box'); if (!svg || !box) return;
    const br = box.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${br.width} ${br.height}`);
    const center = i => { const r = $(`.slot[data-slot="${i}"]`)?.getBoundingClientRect(); return r ? { x: r.left - br.left + r.width / 2, y: r.top - br.top } : null; };
    let html = '';
    const lanes = {};
    list.forEach((c, n) => {
      const a = center(c.from), b = center(c.to); if (!a || !b) return;
      const key = c.from + '-' + c.to, lane = (lanes[key] = (lanes[key] || 0) + 1) - 1;
      const lift = 14 + lane * 12 + (c.to - c.from) * 4;
      const col = COMBOS[c.id].color, isHot = hot && hot.id === c.id && hot.to === c.to;
      const mx = (a.x + b.x) / 2, y = a.y - 2;
      html += `<path d="M${a.x} ${y} Q ${mx} ${y - lift * 2} ${b.x} ${y}" class="chain ${isHot ? 'hot' : ''}" style="--cc:${col}"/>`;
      html += `<text x="${mx}" y="${y - lift - 4}" class="chain-lbl ${isHot ? 'hot' : ''}" style="--cc:${col}">${COMBOS[c.id].name}</text>`;
    });
    svg.innerHTML = html;
  }

  function renderFila() {
    const el = $('#fila'); if (!el) return;
    el.innerHTML = fila.map((c, i) => {
      const locked = i === 0 && B.lockFirst;
      return `${i ? '<span class="arrow">›</span>' : ''}<div class="slot ${locked ? 'locked' : ''} ${c ? 'full' : ''}" data-slot="${i}">${c ? UI.card(c, { hideText: hides(B.masks, 'cardText') }) : locked ? '<div class="lock">Bram hesita</div>' : `<span class="paw">${SPR.img('paw', 3)}</span>`}</div>`;
    }).join('');
  }
  function renderHand() {
    const el = $('#hand'); if (!el) return;
    const hideT = hides(B.masks, 'cardText');
    const f = free();
    el.innerHTML = hand.map((c, k) => UI.card(c, { hideText: hideT, cls: (fresh.has(c.uid) ? 'new ' : '') + (cardCost(c.id) > f ? 'unaffordable' : ''), attrs: `style="--d:${k * 60}ms"` })).join('');
    fresh.clear();
    // Mãos grandes em telas estreitas: as cartas se sobrepõem para caber.
    const cards = el.children, n = cards.length;
    if (n > 1) {
      const w = cards[0].offsetWidth + 8, room = el.clientWidth - 8;
      const over = Math.max(0, Math.ceil((n * w - room) / (n - 1)));
      for (let k = 1; k < n; k++) cards[k].style.marginLeft = over ? `${-over}px` : '';
    }
    const sb = $('#sealBtn'); if (sb) { sb.textContent = filaCards().length ? 'Selar' : 'Passar'; sb.disabled = busy; sb.classList.toggle('ready', filaCards().length > 0); }
    const sw = $('#swapBtn'); if (sw) sw.disabled = busy || swapped || free() < swapCost() || !hand.length;
  }
  function renderPreview() {
    const el = $('#preview'); if (!el) return;
    const cards = filaCards();
    if (!cards.length) {
      el.innerHTML = `<span class="dim">${B.lockFirst ? 'Bram hesita diante dela. O primeiro espaço está travado.' : free() ? 'Monte a Fila. Ela ativa da esquerda para a direita.' : 'Sem almas livres. Passe a vez para o Saco encher.'}</span>`;
      drawChains([]);
      return;
    }
    const Bp = clone(B); Bp.souls = free();
    const res = resolveRound(Bp, cards);
    drawChains(combosOf(res.ev));
    const dealt = B.enemy.hp - res.B.enemy.hp;
    const taken = B.bram.hp - res.B.bram.hp;
    const hideE = hides(B.masks, 'enemyHp'), hideI = hides(B.masks, 'intentNumbers'), hideMe = hides(B.masks, 'ownHp');
    const guard = res.ev.filter(e => e.t === 'guard').reduce((s, e) => s + e.amount, 0);
    const parts = [`${SPR.icon('s_atk', '', {})} <b>${hideE ? '?' : Math.max(0, dealt)}</b>`];
    if (guard) parts.push(`${SPR.icon('u_guard')} <b>${guard}</b>`);
    if (!res.enemyDead) parts.push(`você recebe <b class="${taken > 0 ? 'bad' : 'good'}">${hideI || hideMe ? '?' : Math.max(0, taken)}</b>`);
    if (res.enemyDead) parts.push('<span class="good">derruba o inimigo</span>');
    else if (res.bramDead && !hideI && !hideMe) parts.push('<span class="bad">Bram cai!</span>');
    el.innerHTML = parts.join('<i class="sep">·</i>');
  }


  // ---------- montar a Fila ----------
  function place(uid, slot = null) {
    if (busy) return;
    const c = hand.find(x => x.uid == uid);
    if (!c) return;
    const cost = cardCost(c.id);
    if (slot === null) slot = fila.findIndex((x, i) => !x && !(i === 0 && B.lockFirst));
    if (slot < 0) { toast('A Fila está cheia.'); AUDIO.sfx('nosoul'); return; }
    if (slot === 0 && B.lockFirst) { AUDIO.sfx('nosoul'); toast('Bram hesita. Ele não consegue começar por aí.'); return; }
    const occupant = fila[slot];
    const net = cost - (occupant ? cardCost(occupant.id) : 0);
    if (net > free()) { AUDIO.sfx('nosoul'); flashBag(); toast(cost > 1 ? `Essa carta precisa de ${cost} almas.` : 'Sem almas suficientes no Saco.'); return; }
    const from = $(`#hand .card[data-uid="${c.uid}"]`)?.getBoundingClientRect();
    hand = hand.filter(x => x !== c);
    if (occupant) hand.push(occupant);
    fila[slot] = c;
    AUDIO.sfx('place', { suit: CARDS[c.id].suit });
    if (cost) AUDIO.sfx('soul', { n: spent() });
    renderAll();
    flyIn(slot, from);
    if (filaCards().length === 2) hintOnce('combo', 'Quando as cartas formam um combo, uma corrente colorida liga as duas. Abra o Guia (?) para ver todos os combos.');
  }
  // A carta voa da mão até o espaço da Fila.
  function flyIn(slot, from) {
    const el = $(`.slot[data-slot="${slot}"] .card`); if (!el || !from || reduced()) return;
    const to = el.getBoundingClientRect();
    el.animate([{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) rotate(6deg)` }, { transform: 'translate(0,0) rotate(0)' }], { duration: 220, easing: 'cubic-bezier(.2,1.2,.4,1)' });
  }
  function unplace(slot) {
    if (busy) return;
    const c = fila[slot]; if (!c) return;
    fila[slot] = null; hand.push(c); fresh.add(c.uid);
    AUDIO.sfx('unplace');
    renderAll();
  }
  function moveSlot(from, to) {
    if (from === to || (to === 0 && B.lockFirst)) return;
    [fila[from], fila[to]] = [fila[to], fila[from]];
    AUDIO.sfx('place', { suit: CARDS[fila[to].id].suit });
    renderAll();
  }
  function returnFila() { for (let i = 0; i < SLOTS; i++) if (fila[i]) { hand.push(fila[i]); fila[i] = null; } }
  function flashBag() { const b = $('#bag'); if (b) b.animate([{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], { duration: 220 }); }

  const swapCost = () => hasRelic(RUN.relics, 'colher') ? 0 : 1;
  function swapHand() {
    if (busy || swapped || free() < swapCost()) return;
    swapped = true;
    B.souls -= swapCost();
    discard.push(...hand.filter(c => !CARDS[c.id].temp));
    const n = hand.length; hand = [];
    drawCards(n);
    AUDIO.sfx('page');
    renderAll();
  }

  // Arrastar: da mão para a Fila, entre espaços, ou de volta para a mão. Toque simples coloca/retira.
  function bindDrag() {
    const root = $('.battle');
    let st = null;
    root.addEventListener('pointerdown', e => {
      if (busy || e.button > 0) return;
      const cardEl = e.target.closest('.card');
      if (!cardEl || !cardEl.dataset.uid) return;
      const slotEl = cardEl.closest('.slot');
      st = { uid: cardEl.dataset.uid, from: slotEl ? +slotEl.dataset.slot : 'hand', x: e.clientX, y: e.clientY, el: cardEl, ghost: null, id: e.pointerId };
    });
    root.addEventListener('pointermove', e => {
      if (!st || e.pointerId !== st.id) return;
      if (!st.ghost && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 9) {
        UI.hideTip();
        st.ghost = st.el.cloneNode(true); st.ghost.classList.add('ghost'); st.ghost.classList.remove('new');
        const r = st.el.getBoundingClientRect();
        st.ghost.style.width = r.width + 'px'; st.ghost.style.height = r.height + 'px'; st.ghost.style.marginLeft = '0';
        st.ox = e.clientX - r.left; st.oy = e.clientY - r.top;
        document.body.appendChild(st.ghost);
        st.el.classList.add('lift');
        AUDIO.sfx('pick');
      }
      if (st.ghost) {
        st.ghost.style.left = e.clientX - st.ox + 'px'; st.ghost.style.top = e.clientY - st.oy + 'px';
        $$('.slot.over').forEach(s => s.classList.remove('over'));
        const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('.slot');
        if (over) over.classList.add('over');
      }
    });
    const end = e => {
      if (!st || e.pointerId !== st.id) return;
      const s = st; st = null;
      $$('.slot.over').forEach(x => x.classList.remove('over'));
      if (!s.ghost) { // toque simples
        if (e.type === 'pointercancel') return;
        if (s.from === 'hand') place(s.uid); else unplace(s.from);
        return;
      }
      s.ghost.remove(); s.el.classList.remove('lift');
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('.slot');
      if (over) {
        const to = +over.dataset.slot;
        if (s.from === 'hand') place(s.uid, to); else moveSlot(s.from, to);
      } else if (s.from !== 'hand') unplace(s.from);
      else renderAll();
    };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
  }

  addEventListener('keydown', e => {
    if (UI.current !== 'battle' || busy || document.querySelector('.overlay')) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seal(); }
    else if (e.key === 'Backspace') { const i = fila.map(Boolean).lastIndexOf(true); if (i >= 0) unplace(i); }
    else if (/^[1-9]$/.test(e.key)) { const c = hand[+e.key - 1]; if (c) place(c.uid); }
  });

  function pilesModal() {
    const list = (arr, t) => `<h3>${t} (${arr.length})</h3><div class="deck-grid">${arr.map(c => UI.card(c, { cls: 'mini' })).join('') || '<span class="dim">vazia</span>'}</div>`;
    UI.modal(`<header><h2>Pilhas</h2><button class="btn small" data-m="close">Fechar</button></header>
      <div class="body">${list(drawPile.slice().sort((a, b) => a.id.localeCompare(b.id)), 'Para comprar')}${list(discard, 'Descarte')}</div>`,
    { muffle: true, on: { close: (el, close) => close() } });
  }

  // ---------- faixas e placar ----------
  function banner(title, sub, color, quiet = false) {
    const el = $('#cbanner'); if (!el || reduced() && quiet) return;
    el.innerHTML = `<div class="cb-title">${esc(title)}</div>${sub ? `<div class="cb-sub">${esc(sub)}</div>` : ''}`;
    el.style.setProperty('--cc', color);
    el.classList.remove('show', 'quiet'); void el.offsetWidth;
    el.classList.add('show'); if (quiet) el.classList.add('quiet');
  }
  let tally = { dmg: 0, guard: 0 };
  function bumpTally(kind, n) {
    tally[kind] += n;
    const el = $('#tally'); if (!el) return;
    el.innerHTML = `<span class="t-dmg">${SPR.icon('s_atk')} ${tally.dmg}</span>${tally.guard ? `<span class="t-grd">${SPR.icon('u_guard')} ${tally.guard}</span>` : ''}`;
    el.classList.add('on');
    const s = $(kind === 'dmg' ? '#tally .t-dmg' : '#tally .t-grd');
    if (s) s.animate([{ transform: 'scale(1.6)', color: '#fff' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,1.5,.5,1)' });
  }

  // ---------- selar: o "PAM" ----------
  async function sealFx(n) {
    const ring = $('#sealRing'), box = $('.fila-box'), runes = $('#runes');
    if (!n) return;
    // 1. As almas saem do pote e entram em cada carta, uma por uma.
    const jar = at('#bag');
    runes.classList.remove('go'); void runes.getBoundingClientRect(); runes.classList.add('go');
    AUDIO.sfx('sealRise');
    const full = $$('.slot.full');
    for (let k = 0; k < full.length; k++) {
      const c = at(`.slot[data-slot="${full[k].dataset.slot}"]`);
      FX.stream(jar.x, jar.y, c.x, c.y, '#9fe8f0', 16);
      full[k].classList.add('ensouled');
      AUDIO.sfx('soulNote', { k });
      await wait(140);
    }
    await wait(180);
    // 2. O círculo se fecha: PAM.
    AUDIO.sfx('sealPam');
    box.classList.add('sealing');
    ring.classList.remove('go'); void ring.offsetWidth; ring.classList.add('go');
    $$('.slot.full .card').forEach((c, k) => c.animate([
      { transform: 'translateY(-26px) scale(1.12)', filter: 'brightness(1.4)' },
      { transform: 'translateY(4px) scale(.96)', offset: .6 },
      { transform: 'translateY(0) scale(1)' }], { duration: 300, delay: k * 45, easing: 'cubic-bezier(.5,0,.5,1)' }));
    await wait(300);
    FX.flash('#7ad8ff', .32); FX.shake(1.3);
    const r = box.getBoundingClientRect();
    FX.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 70, colors: ['#9fe8f0', '#ffffff', '#5ab8e8', '#c8b0ff'], speed: 140, grav: -10, life: .9 });
    FX.shockwave(r.left + r.width / 2, r.top + r.height / 2, '#9fe8f0');
    await wait(320);
    $$('.slot.ensouled').forEach(s => s.classList.remove('ensouled'));
  }

  async function seal() {
    if (busy) return;
    busy = true;
    UI.hideTip();
    const cards = filaCards();
    const cost = spent();
    B.souls -= cost;
    if (!cards.length) AUDIO.sfx('back');
    renderHand();
    $('#preview').innerHTML = '';
    const res = resolveRound(B, cards);
    META.stats.cards += cards.length;
    tally = { dmg: 0, guard: 0 };
    rush = false;
    const hurry = () => { rush = true; };
    $('.battle')?.addEventListener('pointerdown', hurry);
    await sealFx(cards.length);
    await animate(res.ev);
    $('.fila-box')?.classList.remove('sealing');
    $('.battle')?.removeEventListener('pointerdown', hurry);
    rush = false;
    // Aplica o resultado.
    B = res.B;
    const playedUids = new Set(res.played.map(c => c.uid));
    await sweepToDiscard();
    for (const c of cards) {
      if (CARDS[c.id].temp) continue;
      if (B.emberSpent && c.uid === B.emberSpent) { removeCard(c.uid); continue; }
      if (playedUids.has(c.uid)) discard.push(c); else hand.push(c);
    }
    if (B.emberSpent) { B.emberSpent = null; toast('A Última Brasa se apagou para sempre.'); }
    fila = Array(SLOTS).fill(null);
    RUN.hp = B.bram.hp;
    if (B.rotGain) { changeRot(B.rotGain); B.rotGain = 0; }
    if (B.lightLoss) { changeLight(-B.lightLoss); B.lightLoss = 0; }
    if (B.broken && B.broken.length) { for (const m of B.broken) dropMask(m); B.broken = []; }
    const combos = res.ev.filter(e => e.t === 'combo').length;
    META.stats.combos += combos; RUN.stats.combos += combos;
    saveMeta();
    if (res.enemyDead) return enemyDown();
    if (res.bramDead) return lose();
    await wait(120);
    newRound();
  }
  // As cartas usadas voam para o descarte.
  async function sweepToDiscard() {
    const target = $('#discPile')?.getBoundingClientRect();
    const els = $$('.slot.full .card');
    if (!target || !els.length || reduced()) return;
    els.forEach((el, k) => {
      const r = el.getBoundingClientRect();
      el.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${target.left - r.left}px, ${target.top - r.top}px) rotate(${20 + k * 6}deg) scale(.4)`, opacity: .2 }],
        { duration: 380, delay: k * 50, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
    });
    AUDIO.sfx('pick');
    await wait(380 + els.length * 50);
  }

  function at(sel) { const r = $(sel)?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, r } : { x: innerWidth / 2, y: innerHeight / 2 }; }
  function sprAnim(sel, cls) { const el = $(sel); if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function applyView(v) {
    const eb = $('#ebars'); if (eb) eb.innerHTML = enemyBars(v);
    const bb = $('#bbars'); if (bb) bb.innerHTML = bramBars(v);
    const es = $('#ests'); if (es) es.innerHTML = statusChips(v.est);
    const bs = $('#bsts'); if (bs) bs.innerHTML = statusChips(v.bst, { impeto: v.impeto });
  }
  const SUIT_FX = { presa: ['#ff8a7a', '#c8434a', '#fff'], casca: ['#9ad8e0', '#4fa3a8'], sombra: ['#c8b0ff', '#8f74c8'], cinza: ['#ffb45c', '#ff6a2a', '#ffe08a'], memoria: ['#ffe08a', '#e3bd5a', '#fff'] };

  // Combo: as cartas envolvidas brilham juntas, a corrente acende e a faixa mostra o nome.
  async function comboFx(e, streak, list) {
    const c = COMBOS[e.id];
    const from = e.id === 'selo' ? 0 : Math.max(0, e.i - c.span + 1);
    const slots = []; for (let k = from; k <= e.i; k++) slots.push($(`.slot[data-slot="${k}"]`));
    drawChains(list, { id: e.id, to: e.i });
    slots.forEach(s => { if (!s) return; s.style.setProperty('--cc', c.color); s.classList.remove('cflash'); void s.offsetWidth; s.classList.add('cflash'); });
    AUDIO.sfx('combo', { tier: c.tier, streak });
    LAMP.react(c.tier >= 2 || streak >= 2 ? 'bigCombo' : 'combo');
    AUDIO.sfx('chain');
    banner(c.name, c.fx, c.color);
    const a = at(`.slot[data-slot="${from}"]`), b = at(`.slot[data-slot="${e.i}"]`);
    FX.stream(a.x, a.y, b.x, b.y, c.color, 14);
    if (c.tier >= 2) FX.shake(c.tier === 3 ? 1.4 : .7);
    if (c.tier >= 3) { FX.flash(c.color, .22); FX.burst(b.x, b.y, { n: 36, colors: [c.color, '#fff'], speed: 90 }); }
    await wait(c.tier >= 3 ? 700 : 520);
  }

  async function animate(ev) {
    let curSuit = 'presa', streak = 0;
    const slotEl = i => $(`.slot[data-slot="${i}"]`);
    let lastI = -1;
    const shownCombos = [];
    drawChains([]);
    const cardAt = i => at(`.slot[data-slot="${i}"]`);
    for (const e of ev) {
      const E = at('#espr'), P = at('#bspr');
      switch (e.t) {
        case 'card': {
          if (lastI >= 0) slotEl(lastI)?.classList.replace('active', 'spent');
          lastI = e.i; curSuit = e.suit;
          slotEl(e.i)?.classList.add('active');
          AUDIO.sfx('card', { suit: e.suit });
          await wait(260); break;
        }
        case 'combo': {
          streak++;
          shownCombos.push({ id: e.id, from: e.id === 'selo' ? 0 : Math.max(0, e.i - COMBOS[e.id].span + 1), to: e.i });
          await comboFx(e, streak, shownCombos);
          break;
        }
        case 'hit': {
          const s = cardAt(e.i);
          if (e.i !== undefined) { FX.stream(s.x, s.y, E.x, E.y, (SUIT_FX[curSuit] || SUIT_FX.presa)[0], 8); await wait(110); }
          applyView(e.v);
          sprAnim('#espr', 'hit');
          const big = e.amount + e.absorbed >= 10;
          FX.float(e.amount > 0 ? '-' + e.amount : 'bloqueado', E.x + (Math.random() - .5) * 40, E.y - 20, big ? 'big' : 'dmg');
          if (e.absorbed) FX.float(`couraça −${e.absorbed}`, E.x + 40, E.y + 10, 'small');
          if (e.parts && e.parts.length) FX.float(e.parts.map(p => `${p[0]} +${p[1]}`).join(' · '), E.x, E.y + 30, 'small');
          FX.burst(E.x, E.y, { n: big ? 26 : 14, colors: SUIT_FX[curSuit] || SUIT_FX.presa, speed: big ? 80 : 55 });
          AUDIO.sfx(e.pierce ? 'pierce' : 'hit', { amount: e.amount });
          bumpTally('dmg', e.amount);
          if (big) { FX.shake(1.2); VHS.disturb(.6, 300); }
          if (!hurtSaid && !e.kill && e.v.ehp / e.v.emax < .4 && ENEMY_TALK[B.enemy.id]) { hurtSaid = true; say(rng.pick(ENEMY_TALK[B.enemy.id].hurt), 1800); }
          await wait(e.kill ? 500 : 240); break;
        }
        case 'guard': { applyView(e.v); const s = e.i !== undefined ? cardAt(e.i) : P; FX.float('+' + e.amount, s.x, s.y - 40, 'guard'); FX.stream(s.x, s.y, P.x, P.y, '#9ad8e0', 8); AUDIO.sfx('block'); bumpTally('guard', e.amount); await wait(200); break; }
        case 'heal': applyView(e.v); FX.float('+' + e.amount, P.x, P.y - 30, 'heal'); AUDIO.sfx('heal'); await wait(220); break;
        case 'status': applyView(e.v); FX.float(STATUS_INFO[e.key].name + (['marca', 'exposto', 'atordoado'].includes(e.key) ? '' : ' ' + e.amount), E.x, E.y - 60, 'small'); AUDIO.sfx('status', { key: e.key }); popChip('#ests', e.key); await wait(200); break;
        case 'bstatus': applyView(e.v); FX.float(STATUS_INFO[e.key].name, P.x, P.y - 50, 'small'); AUDIO.sfx('status', { key: e.key }); popChip('#bsts', e.key); await wait(e.from ? 280 : 180); break;
        case 'impeto': applyView(e.v); FX.float('Ímpeto +' + e.amount, P.x, P.y - 50, 'small'); AUDIO.sfx('status', { key: 'impeto' }); await wait(160); break;
        case 'soul': {
          const bag = at('#bag'), s = cardAt(e.i);
          FX.stream(s.x, s.y, bag.x, bag.y);
          FX.float('+' + e.amount + ' alma', bag.x, bag.y - 24, 'guard');
          AUDIO.sfx('soul', { n: 3 });
          renderBag(e.amount, e.v);
          await wait(240); break;
        }
        case 'draw': FX.float('+1 carta na próxima', P.x, P.y - 60, 'small'); await wait(120); break;
        case 'note': FX.float(e.text, cardAt(e.i ?? 0).x, cardAt(e.i ?? 0).y - 70, 'small'); await wait(240); break;
        case 'echo': FX.float('Repete ' + CARDS[e.of].name, cardAt(e.i).x, cardAt(e.i).y - 60, 'combo'); AUDIO.sfx('card', { suit: curSuit }); await wait(240); break;
        case 'repeat': FX.float('De novo!', cardAt(e.i).x, cardAt(e.i).y - 60, 'combo'); AUDIO.sfx('card', { suit: curSuit }); await wait(240); break;
        case 'strip': applyView(e.v); FX.float(`arrancou ${e.amount} de couraça`, E.x, E.y - 40, 'small'); AUDIO.sfx('crack'); await wait(220); break;
        case 'consume': applyView(e.v); await wait(80); break;
        case 'resist': applyView(e.v); FX.float('Resiste! Fraqueza 3', E.x, E.y - 60, 'small'); AUDIO.sfx('armor'); await wait(260); break;
        case 'cleanse': applyView(e.v); FX.float('limpo', P.x, P.y - 50, 'heal'); await wait(200); break;
        case 'forget': applyView(e.v); VHS.disturb(2, 1200); AUDIO.sfx('glitch'); FX.float('você esquece um pouco', P.x, P.y - 70, 'small'); UI.flickerLamp(); await wait(500); break;
        case 'self': applyView(e.v); FX.float('-' + e.amount, P.x, P.y - 20, 'hurt'); sprAnim('#bspr', 'hit'); AUDIO.sfx('hurt'); FX.flash('#700', .15); await wait(260); break;
        case 'ember': applyView(e.v); FX.flash('#ff8a3a', .4); FX.float('A brasa te segura!', P.x, P.y - 60, 'big'); FX.burst(P.x, P.y, { n: 40, colors: SUIT_FX.cinza, speed: 90 }); AUDIO.sfx('burn'); await wait(700); break;
        case 'burn': applyView(e.v); if (lastI >= 0) slotEl(lastI)?.classList.replace('active', 'spent'); sprAnim('#espr', 'hit'); FX.float('-' + e.amount, E.x, E.y - 20, 'big'); FX.burst(E.x, E.y + 20, { n: 22, colors: SUIT_FX.cinza, speed: 40, grav: -40 }); AUDIO.sfx('burn'); bumpTally('dmg', e.amount); await wait(e.kill ? 600 : 380); break;
        case 'enemyTurn': {
          if (lastI >= 0) slotEl(lastI)?.classList.replace('active', 'spent');
          lastI = -1;
          drawChains([]);
          $('#tally')?.classList.add('fade');
          const it = $('#intents .intent:not(.next)');
          if (it) it.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25) rotate(-3deg)' }, { transform: 'scale(1)' }], { duration: 380 });
          say(e.label, 1100, true);
          await wait(420); break;
        }
        case 'stunned': FX.float('Atordoado!', E.x, E.y - 60, 'big'); AUDIO.sfx('status', { key: 'atordoado' }); await wait(500); break;
        case 'ecleanse': applyView(e.v); FX.float('Nada aconteceu.', E.x, E.y - 60, 'small'); AUDIO.sfx('glitch'); VHS.disturb(1, 600); await wait(500); break;
        case 'eheal': applyView(e.v); FX.float('+' + e.amount, E.x, E.y - 40, 'heal'); AUDIO.sfx('heal'); await wait(300); break;
        case 'earmor': applyView(e.v); FX.float('+' + e.amount + ' couraça', E.x, E.y - 40, 'guard'); AUDIO.sfx('armor'); await wait(300); break;
        case 'ehit': {
          sprAnim('#espr', 'lunge'); AUDIO.sfx('enemyWind');
          await wait(170);
          applyView(e.v);
          if (e.amount > 0) {
            sprAnim('#bspr', 'hit'); AUDIO.sfx('hurt'); FX.flash('#a00', e.heavy ? .3 : .18); FX.shake(e.heavy ? 1.6 : .9); LAMP.react('hurt');
            FX.float('-' + e.amount, P.x, P.y - 20, 'hurt');
            FX.burst(P.x, P.y, { n: 16, colors: ['#ff6a6a', '#fff'], speed: 60 });
            if (e.heavy) VHS.disturb(1, 500);
          } else { AUDIO.sfx('block'); FX.float('bloqueado', P.x, P.y - 20, 'guard'); }
          if (e.absorbed && e.amount > 0) FX.float(`guarda −${e.absorbed}`, P.x + 50, P.y - 40, 'small');
          if (e.cut) FX.float(`fraqueza −${e.cut}`, P.x + 50, P.y, 'small');
          if (e.scarf) FX.float(`cachecol −${e.scarf}`, P.x - 50, P.y - 10, 'small');
          await wait(330); break;
        }
        case 'thorns': applyView(e.v); FX.float('espinhos -' + e.amount, E.x, E.y - 30, 'dmg'); AUDIO.sfx('pierce'); await wait(220); break;
        case 'sermon': {
          say('“' + e.text + '”', 2600);
          AUDIO.sfx('sermon'); VHS.disturb(.8, 800);
          await wait(2400);
          break;
        }
        case 'offer': say('Uma troca doce, coelhinho. Só um fio de lembrança.', 2200); AUDIO.sfx('status', { key: 'marca' }); await wait(900); break;
        case 'observe': say('...', 1600); AUDIO.sfx('lamp'); await wait(700); break;
        case 'maskBreak': applyView(e.v); FX.flash('#fff', .35); FX.shake(1.4); AUDIO.sfx('crack'); FX.float(MASKS[e.id].name + ' se parte', P.x, P.y - 80, 'big'); VHS.disturb(1.6, 800); await wait(700); break;
        case 'fury': FX.float('Fúria +' + e.amount, E.x, E.y - 70, 'small'); await wait(160); break;
        case 'end': applyView(e.v); await wait(160); break;
      }
    }
    $('#tally')?.classList.remove('on', 'fade');
  }
  // Balão de fala em cima do inimigo: as letras aparecem com a voz do bicho, e ele se mexe enquanto fala.
  let sayT = 0, typeT = 0, hurtSaid = false;
  function say(text, ms = 1800, quiet = false) {
    const b = $('#ebubble'), spr = $('#espr'); if (!b) return;
    const voice = ENEMY_TALK[B.enemy.id]?.voice;
    b.textContent = ''; b.classList.toggle('quiet', quiet);
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    spr?.classList.add('talking');
    clearTimeout(sayT); clearTimeout(typeT);
    const chars = [...text]; let i = 0;
    (function type() {
      if (!b.isConnected) return;
      if (i >= chars.length) { spr?.classList.remove('talking'); sayT = setTimeout(() => b.classList.remove('show'), T(ms)); return; }
      b.textContent += chars[i];
      if (voice && !quiet && /[a-zà-ú]/i.test(chars[i]) && i % 2 === 0) AUDIO.sfx('voice', { who: voice });
      i++;
      typeT = setTimeout(type, T(quiet ? 14 : 34));
    })();
  }
  // Círculo de runas do selo: glifos gerados à mão, girando em sentidos opostos.
  function runeCircle() {
    const R = makeRng(7), glyph = (cx, cy) => { let d = ''; for (let k = 0; k < 3; k++) { const a = R.int(4), b = R.int(4); d += `M${cx + (a % 2) * 6 - 3} ${cy + (a >> 1) * 8 - 4} L${cx + (b % 2) * 6 - 3} ${cy + (b >> 1) * 8 - 4} `; } return d; };
    let outer = '', inner = '';
    for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; outer += glyph(100 + Math.cos(a) * 88, 100 + Math.sin(a) * 88); }
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; inner += glyph(100 + Math.cos(a) * 62, 100 + Math.sin(a) * 62); }
    return `<svg class="runes" id="runes" viewBox="0 0 200 200" preserveAspectRatio="none"><g class="r1"><circle cx="100" cy="100" r="96"/><circle cx="100" cy="100" r="80"/><path d="${outer}"/></g><g class="r2"><circle cx="100" cy="100" r="70"/><circle cx="100" cy="100" r="54"/><path d="${inner}"/><path d="M100 46 L147 127 L53 127 Z M100 154 L53 73 L147 73 Z"/></g></svg>`;
  }
  function popChip(sel, key) { const el = $(`${sel} .st[data-k="${key}"]`); if (el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } }

  // ---------- fim do combate ----------
  async function enemyDown() {
    const def = ENEMIES[B.enemy.id];
    const E = at('#espr');
    const last = def.final && B.enemy.phase === 1 ? 'Obrigado, coelho. Agora eu consigo dormir.' : ENEMY_TALK[B.enemy.id]?.die;
    if (last) { say(last, 2200); await sleep(Math.min(3400, 900 + last.length * 45)); }
    LAMP.react('win');
    sprAnim('#espr', 'dying');
    AUDIO.sfx('death');
    FX.burst(E.x, E.y, { n: 60, colors: ['#5a5650', '#8a857c', '#2a2826', '#c8c0b0'], speed: 50, grav: -30, life: 1.4 });
    await wait(1100);
    if (def.final && B.enemy.phase === 0) return phaseTwo();
    if (def.final) {
      seeEnemy(B.enemy.id, true);
      RUN.battle = null; saveRun();
      for (const m of RUN.masks.slice()) dropMask(m);
      return SCREENS.seal();
    }
    seeEnemy(B.enemy.id, true);
    META.stats.fights++; RUN.stats.fights++; saveMeta();
    RUN.hp = B.bram.hp;
    RUN.battle = null;
    returnFila();
    saveRun();
    SCREENS.reward(node, B);
  }
  function phaseTwo() {
    AUDIO.sfx('roar');
    VHS.disturb(2.5, 1600);
    const heal = 6 + RUN.light * 2;
    cinematicLines([...PHASE_TWO_LINES, `O Lampião se aproxima e aquece suas patas. (+${heal} de vida)`], () => {
      B.enemy = makeEnemy('vaelgrath', { phase: 1, rot: RUN.rot, asc: RUN.asc || 0 });
      B.bram.hp = Math.min(B.bram.maxHp, B.bram.hp + heal);
      B.bram.guard = 0; B.bram.st = { exposto: 0, bolor: 0, culpa: 0, esquecimento: 0 };
      B.round = 0;
      returnFila();
      SCENE.setRot(Math.max(.6, RUN.rot / 100));
      AUDIO.setIntensity(1);
      newRound();
    });
  }
  function cinematicLines(lines, done) {
    let i = 0;
    UI.show('cine', `<section class="screen ending" data-act="n" data-silent="1" style="cursor:pointer"><div class="line" id="cl"></div></section>`, { n: () => step() });
    let t = 0;
    function step() { clearTimeout(t); if (i >= lines.length) return done(); $('#cl').textContent = lines[i++]; AUDIO.sfx('page'); t = setTimeout(step, 2600); }
    step();
  }
  async function lose() {
    sprAnim('#bspr', 'dying');
    AUDIO.sfx('death');
    VHS.disturb(3, 2000);
    AUDIO.music(null);
    await wait(1600);
    SCREENS.death();
  }

  function relayout() { if (UI.current === 'battle' && !busy && !document.querySelector('.overlay')) render(); }

  // Modo desenvolvedor: só a apresentação do inimigo.
  function preview(enemyId, back) { bossIntro(ENEMIES[enemyId], back); }

  return { start, resume, relayout, preview };
})();
