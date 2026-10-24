'use strict';
// Lugares do mapa, montados como um palco: quem atende fica em pé no cenário e o que se oferece fica num balcão na frente.
// No balcão: passar o mouse faz o dono comentar o item e clicar compra. No toque, o primeiro toque mostra e o segundo compra.

// ---------- palco ----------
function figScale(name) { const s = SPR.size(name); return clamp(Math.floor(innerHeight * (innerWidth < 600 ? .2 : .3) / s.h), 3, 12); }
function stage(o) {
  return `<section class="screen stage ${o.cls || ''}">
    <div class="st-back">
      ${o.fig ? `<div class="st-fig ${o.figCls || ''}" id="stFig">${SPR.img(o.fig, o.figScale || figScale(o.fig), o.figOpt || {})}</div>` : ''}
      <div class="st-say ${o.fig ? '' : 'alone'}" id="stSay"></div>
    </div>
    <div class="st-counter">
      ${UI.lamp('on-counter')}
      <div class="st-plate">${o.kicker ? `<span class="kicker">${esc(o.kicker)}</span>` : ''}<h2>${esc(o.title)}</h2></div>
      <div class="st-wares" id="pbody">${o.body || ''}</div>
      ${matchMedia('(hover: none)').matches ? '<div class="st-hint">toque uma vez para ver, duas para escolher</div>' : ''}
    </div>
    ${UI.hud()}
  </section>`;
}
function refreshHud() { UI.refreshHud(); }
const pbody = html => { const el = $('#pbody'); if (el) el.innerHTML = html; refreshHud(); };
const leaveBtn = (label = 'Seguir pela trilha') => `<div class="st-leave-row"><button class="btn primary" data-act="leave">${label}</button></div>`;

// Balão de fala de quem está no palco (ou narração, sem ninguém).
let sayTimer = 0;
function stageSay(text, o = {}) {
  const el = $('#stSay'); if (!el) return;
  clearTimeout(sayTimer);
  const fig = $('#stFig');
  el.className = 'st-say show' + (o.narr || !fig ? ' narr' : '') + (fig ? '' : ' alone');
  el.textContent = '';
  const chars = [...text];
  let i = 0;
  if (!o.narr) fig?.classList.add('talking');
  (function tick() {
    if (!el.isConnected) return;
    if (i >= chars.length) { fig?.classList.remove('talking'); return; }
    el.textContent += chars[i];
    if (!o.narr && o.voice && /[a-zà-ú]/i.test(chars[i]) && i % 3 === 0) AUDIO.sfx('voice', { who: o.voice });
    i++;
    sayTimer = setTimeout(tick, SETTINGS.fast ? 6 : 16);
  })();
}

// Um item no balcão. Sem o atributo disabled, para que ainda dê para ouvir a descrição.
function ware(o) {
  const can = !o.sold && !o.off && (o.price == null || RUN.lascas >= o.price);
  return `<button class="ware ${o.cls || ''} ${o.sold ? 'sold' : ''} ${can ? '' : 'off'}" data-act="ware" data-k="${o.k}" data-desc="${esc(o.desc || '')}">
    <div class="w-item">${o.item}</div>
    ${o.name ? `<div class="w-name">${esc(o.name)}</div>` : ''}
    ${o.sub ? `<div class="w-sub">${o.sub}</div>` : ''}
    ${o.sold ? `<div class="tag sold">${o.soldLabel || 'Vendido'}</div>` : o.price != null ? `<div class="tag ${RUN.lascas >= o.price ? '' : 'cant'}">${SPR.icon('u_lasca')} ${o.price}</div>` : o.tag ? `<div class="tag free">${o.tag}</div>` : ''}
  </button>`;
}
// Liga o balcão: descrição ao passar o mouse e compra no clique (ou no segundo toque).
function wareActs(o) {
  let pointer = 'mouse', sel = null;
  // Chamado antes de a tela existir (dentro de UI.show): liga os eventos logo depois.
  queueMicrotask(() => {
    const st = $('.stage'); if (!st) return;
    st.addEventListener('pointerdown', e => { pointer = e.pointerType; }, true);
    st.addEventListener('pointerover', e => {
      if (e.pointerType !== 'mouse') return;
      const w = e.target.closest('.ware'); if (!w || w.contains(e.relatedTarget) || !w.dataset.desc) return;
      stageSay(w.dataset.desc, { voice: o.voice, narr: !o.voice });
    });
  });
  return el => {
    const k = el.dataset.k;
    if (pointer !== 'mouse' && sel !== k && el.dataset.desc) {
      sel = k; $$('.ware.sel').forEach(x => x.classList.remove('sel')); el.classList.add('sel');
      stageSay(el.dataset.desc, { voice: o.voice, narr: !o.voice });
      return;
    }
    sel = null;
    if (el.classList.contains('off')) {
      AUDIO.sfx('nosoul');
      el.animate([{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], { duration: 200 });
      if (o.poor && !el.classList.contains('sold')) stageSay(o.poor, { voice: o.voice });
      return;
    }
    o.buy(k, el);
  };
}
const baseActs = extra => Object.assign({ leave: leaveNode, deck() { UI.deckModal(); }, pause() { UI.pauseMenu(); } }, extra);

// ---------- conversa ----------
// Fala do NPC conforme o quanto Bram lembra, mais as reações aos objetos que ele carrega.
function npcLines(id) {
  const npc = NPCS[id], tier = memTier(memCount());
  const pool = npc.talk[tier];
  const key = id + tier;
  const k = (META.talk[key] || 0) % pool.length;
  META.talk[key] = k + 1; saveMeta();
  let lines = pool[k].slice();
  RUN.shownCarry = RUN.shownCarry || [];
  for (const m of RUN.carried) {
    const tag = id + ':' + m;
    if (npc.carry && npc.carry[m] && !RUN.shownCarry.includes(tag)) { lines = lines.concat(npc.carry[m]); RUN.shownCarry.push(tag); RUN.lastCarry = m; break; }
  }
  return lines;
}
const speaker = id => ({ name: NPCS[id].name, portrait: NPCS[id].portrait, voice: id });
async function npcTalk(id) {
  RUN.lastCarry = null;
  await UI.dialogue(speaker(id), npcLines(id));
}
const HELLO = {
  ysolde: 'Olha à vontade, meu bem. Passa a pata em cima que eu te conto tudo.',
  tobias: 'Hm. Escolhe.',
  perpetua: 'Uma coisa só por visita, menino. A capela é pobre.',
  marga: 'Tudo achado. Nada roubado. Quase nada.'
};
const POOR = {
  ysolde: 'Ai, querido. Lasca não dá em árvore. Quer dizer, às vezes dá, mas não nessa.',
  tobias: 'Não dá.',
  perpetua: 'Não tem como, menino.',
  marga: 'Fiado só pra quem eu conheço há mais de cem anos.'
};

// ---------- fogueira ----------
SCREENS.camp = function () {
  AUDIO.sfx('whoosh');
  setScene('camp', 'camp', 'camp', { arena: true });
  const heal = Math.ceil(maxHpNow() * .35) + (hasRelic(RUN.relics, 'vela') ? 10 : 0);
  UI.show('camp', stage({ title: 'Fogueira', kicker: 'Um fogo pequeno' }), baseActs({
    ware: wareActs({ buy }),
    letter: () => letterScene(() => SCREENS.camp())
  }));
  function buy(k) {
    if (k === 'rest') {
      const got = healRun(heal);
      stageSay(`Você dorme sem sonhar. Ou quase. (+${got} de vida)`, { narr: true });
    } else {
      changeLight(1); changeRot(-6);
      const pool = REFLECTIONS[memTier(memCount())] || REFLECTIONS[0];
      VHS.clear(2500);
      stageSay(rng.pick(pool), { narr: true });
    }
    pbody(leaveBtn());
  }
  function render() {
    pbody(ware({ k: 'rest', cls: 'svc', item: SPR.img('u_heart', 6), name: 'Descansar', sub: `Recupera ${heal} de vida`, desc: 'Dormir um pouco perto do fogo.' })
      + ware({ k: 'recall', cls: 'svc', item: LAMP.html(4), name: 'Lembrar', sub: 'Lampião +1 · Podridão −6%', desc: 'Ficar olhando o fogo e deixar as lembranças virem.' }));
  }
  // No último trecho, se Bram lembra o bastante, o Gaspar finalmente aparece com a carta.
  if (RUN.act === 4 && memTier(memCount()) >= 3 && !RUN.letterRead) {
    pbody('');
    setTimeout(async () => {
      AUDIO.sfx('whoosh');
      await UI.dialogue(speaker('gaspar'), ['*Um bater de asas cansado. Gaspar pousa do outro lado da fogueira, sujo de cinza até o quepe.', 'Desculpa a demora. Três anos, quatro meses e onze dias.', '*Ele tira da bolsa um envelope amarelado e segura com as duas asas.', 'Agora você lê. Eu sei que lê.']);
      pbody(`<div class="st-leave-row center"><button class="btn primary" data-act="letter">Abrir a carta</button></div>`);
    }, 500);
    return;
  }
  render();
  stageSay('O fogo estala baixinho. Por um momento, o bosque parece esperar por você.', { narr: true });
};

// A carta da Tamsin, entregue pelo Gaspar.
function letterScene(done) {
  RUN.letterRead = true; saveRun();
  AUDIO.music('memory'); AUDIO.sfx('letter');
  let i = 0, finished = false;
  UI.show('letter', `<section class="screen letter-screen" data-act="next" data-silent="1">
    <div class="letter-paper"><div class="letter-lines" id="ll"></div></div>
    <div class="dim letter-hint">toque para continuar</div></section>`, { next: step });
  function step() {
    if (finished) return;
    if (i >= GASPAR_LETTER.length) {
      finished = true;
      changeLight(2); LAMP.react('win'); VHS.clear(4000);
      setTimeout(done, 1200);
      return;
    }
    const p = document.createElement('p');
    p.textContent = GASPAR_LETTER[i++];
    if (i === GASPAR_LETTER.length - 1) p.className = 'sign';
    $('#ll').appendChild(p);
    AUDIO.sfx('page');
  }
  step();
}

// ---------- Ysolde ----------
SCREENS.ysolde = async function () {
  AUDIO.sfx('tent');
  setScene('tent', 'village', 'camp', { arena: true });
  const npc = NPCS.ysolde, R = runRng();
  const stock = [];
  for (let k = 0; k < 3; k++) {
    const id = R.pick(REWARD_POOL.filter(x => !stock.some(s => s.id === x)));
    stock.push({ id, price: price(CARDS[id].rarity === 'rara' ? 72 : 44), sold: false }); seeCard(id);
  }
  const maskOptions = Object.keys(MASKS).filter(m => !RUN.masks.includes(m));
  const mask = maskOptions.length ? { id: R.pick(maskOptions), price: price(55), sold: false } : null;
  const mapItem = { price: price(30), sold: RUN.revealed };
  UI.show('ysolde', stage({ fig: npc.art, title: npc.name, kicker: npc.title }), baseActs({ ware: wareActs({ voice: 'ysolde', buy, poor: POOR.ysolde }) }));
  function buy(k, el) {
    const item = k === 'mask' ? mask : k === 'map' ? mapItem : stock[+k];
    if (!item || item.sold) return;
    if (k === 'mask' && RUN.masks.length >= MASK_LIMIT) { stageSay('Mais uma máscara nessa cara? Não cabe, querido.', { voice: 'ysolde' }); return; }
    spendLascas(item.price, el); item.sold = true;
    if (k === 'mask') { addMask(item.id); stageSay('Combina com você. Infelizmente.', { voice: 'ysolde' }); }
    else if (k === 'map') { RUN.revealed = true; META.knowledge.ysoldeMap = true; saveMeta(); stageSay('Pronto, agora você vê o trecho inteiro. Até as lembranças. E vai lembrar disso das próximas vezes.', { voice: 'ysolde' }); }
    else { addCard(item.id); stageSay(['Ótima escolha!', 'Essa é das boas.', 'Cuida bem dela.'][+k % 3], { voice: 'ysolde' }); }
    saveRun(); render();
  }
  function render() {
    pbody(stock.map((s, i) => ware({ k: i, item: UI.card({ id: s.id, uid: 'y' + i }), desc: `${CARDS[s.id].name}. ${CARDS[s.id].text(false, memCount())}`, price: s.price, sold: s.sold })).join('')
      + (mask ? ware({ k: 'mask', cls: 'obj', item: SPR.img(MASKS[mask.id].art, 5), name: MASKS[mask.id].name, sub: `<span class="good">${esc(MASKS[mask.id].gift)}</span>`,
        desc: `${MASKS[mask.id].name}. ${MASKS[mask.id].gift} Mas tem um preço: ${MASKS[mask.id].cost.toLowerCase()}`, price: mask.price, sold: mask.sold }) : '')
      + ware({ k: 'map', cls: 'obj', item: SPR.img('o_mapa', 5), name: 'Mapa do trecho', sub: 'Mostra tudo, até as lembranças',
        desc: 'Mapa do trecho inteiro, com as lembranças marcadas. E você vai lembrar dele nas próximas vezes.', price: mapItem.price, sold: mapItem.sold, soldLabel: 'Comprado' })
      + leaveBtn('Despedir-se'));
  }
  pbody('');
  await npcTalk('ysolde');
  // Com memórias suficientes, ela finalmente entrega o mapa antigo.
  if (memTier(memCount()) >= 2 && !META.memories.includes('mapa')) {
    await UI.dialogue(speaker('ysolde'), ['Espera. Tem uma coisa aqui que é sua.', '*Ela tira do fundo da barraca um mapa dobrado mil vezes.']);
    SCREENS.memoryScene('mapa', { after: () => { SCREENS.ysolde.back(); } });
    return;
  }
  render();
  stageSay(HELLO.ysolde, { voice: 'ysolde' });
};
SCREENS.ysolde.back = function () {
  setScene('tent', 'village', 'camp', { arena: true });
  UI.show('ysolde', stage({ fig: 'ysolde', title: NPCS.ysolde.name, kicker: NPCS.ysolde.title }), baseActs());
  pbody(leaveBtn('Despedir-se'));
  stageSay('Esse era seu. Sempre foi.', { voice: 'ysolde' });
};

// ---------- Tobias ----------
SCREENS.tobias = async function () {
  AUDIO.sfx('door');
  setScene('forge', 'forge', 'camp', { arena: true });
  const npc = NPCS.tobias;
  const upPrice = price(30), rmPrice = price(40);
  let removed = false;
  UI.show('tobias', stage({ fig: npc.art, title: npc.name, kicker: npc.title }), baseActs({ ware: wareActs({ voice: 'tobias', buy, poor: POOR.tobias }) }));
  async function buy(k) {
    if (k === 'up') {
      const uid = await UI.pickCard('Melhorar qual carta?', c => !c.up && !CARDS[c.id].temp);
      if (!uid) return;
      const c = RUN.deck.find(x => x.uid === uid);
      if (!(await upgradePreview(c, upPrice))) return;
      spendLascas(upPrice, $('#stFig')); c.up = true;
      forgeFx(); saveRun(); render();
      stageSay(['Pronto.', 'Melhor.', 'Hm. Ficou boa.'][Math.random() * 3 | 0], { voice: 'tobias' });
    } else if (k === 'rm') {
      const uid = await UI.pickCard('Desfazer qual carta?', c => !CARDS[c.id].keep);
      if (!uid) return;
      spendLascas(rmPrice, $('#stFig')); removeCard(uid); removed = true;
      AUDIO.sfx('crack'); FX.shake(.6); saveRun(); render();
      stageSay('Foi pro fogo.', { voice: 'tobias' });
    }
  }
  function render(extra) {
    pbody(ware({ k: 'up', cls: 'svc', item: SPR.img('i_tobias', 6), name: 'Melhorar carta', sub: 'A carta fica mais forte (+)', desc: 'Martelo, lixa e verniz. A carta sai melhor do que entrou.', price: upPrice })
      + ware({ k: 'rm', cls: 'svc', item: SPR.img('u_espinhos', 6), name: 'Desfazer carta', sub: 'Tira do baralho pra sempre', desc: 'Baralho menor é baralho mais previsível. Uma por visita.', price: rmPrice, sold: removed, soldLabel: 'Feito' })
      + leaveBtn('Ir embora'));
    if (extra) stageSay(extra, { narr: true });
  }
  pbody('');
  await npcTalk('tobias');
  let gift = '';
  // Depois das primeiras lembranças, ele começa a deixar o baralho um pouco melhor, sem pedir nada.
  if (memTier(memCount()) >= 1) {
    const cands = RUN.deck.filter(c => !c.up && !CARDS[c.id].temp);
    if (cands.length) { const c = rng.pick(cands); c.up = true; gift = `Quando ele devolve o baralho, ${CARDS[c.id].name} está melhor do que antes. Ele não comenta.`; }
  }
  if (RUN.lastCarry === 'xicara') {
    const cands = RUN.deck.filter(c => !c.up && !CARDS[c.id].temp);
    if (cands.length) { const c = rng.pick(cands); c.up = true; gift += ` ${CARDS[c.id].name} também volta com um fio dourado nas bordas.`; }
  }
  saveRun();
  render(gift.trim());
  if (!gift) stageSay(HELLO.tobias, { voice: 'tobias' });
};

// ---------- Perpétua ----------
SCREENS.perpetua = async function () {
  AUDIO.sfx('bellDoor');
  setScene('chapel', 'chapel', 'chapel', { arena: true });
  const npc = NPCS.perpetua;
  const heal = Math.ceil(maxHpNow() * .4), purPrice = price(20), ritePrice = price(50);
  UI.show('perpetua', stage({ fig: npc.art, title: npc.name, kicker: npc.title }), baseActs({ ware: wareActs({ voice: 'perpetua', buy, poor: POOR.perpetua }) }));
  async function buy(k, el) {
    if (k === 'pray') { const got = healRun(heal); done(`Ela reza baixinho, em dupla com alguém que não está ali. (+${got} de vida)`); }
    else if (k === 'purify') { spendLascas(purPrice, el); changeRot(-20); done('Incenso e cinza. Por um tempo, o bosque respira melhor. (Podridão −20%)'); }
    else if (k === 'unmask') {
      const id = await chooseMask('Qual máscara tirar?', RUN.masks);
      if (!id) return;
      dropMask(id); changeLight(1);
      done(`Ela segura a ${MASKS[id].name.toLowerCase()} com cuidado, como se fosse um rosto de verdade. (Lampião +1)`);
    } else if (k === 'rite') {
      if ((RUN.soulRite || 0) >= 2) return;
      spendLascas(ritePrice, el); RUN.soulRite = (RUN.soulRite || 0) + 1;
      AUDIO.sfx('seal'); VHS.clear(2000); FX.flash('#7ad8ff', .3);
      done(`Ela desenha um círculo de cinza em volta do seu Saco e fala uns nomes antigos. O Saco fica mais pesado. (Agora entram ${SOULS_PER_ROUND + RUN.soulRite} almas por rodada)`);
    }
  }
  function done(text) { saveRun(); pbody(leaveBtn()); stageSay(text, { narr: true }); }
  pbody('');
  await npcTalk('perpetua');
  const rite = RUN.soulRite || 0;
  pbody(ware({ k: 'pray', cls: 'svc', item: SPR.img('u_heal', 6), name: 'Rezar', sub: `Recupera ${heal} de vida`, desc: 'Ela reza por você. De graça. Reza não se cobra.' })
    + ware({ k: 'purify', cls: 'svc', item: SPR.img('i_perpetua', 5), name: 'Purificar', sub: 'Podridão −20%', desc: 'Incenso e cinza para o bosque respirar melhor.', price: purPrice })
    + (RUN.act >= 2 ? ware({ k: 'rite', cls: 'svc', item: SPR.img('u_soul', 6), name: 'Rito do Saco', sub: rite >= 2 ? 'O Saco não aceita mais' : `+1 alma por rodada (${rite}/2)`, desc: 'Um rito antigo dos Seladores. Daqui pra frente, mais uma alma entra no Saco a cada rodada.', price: ritePrice, sold: rite >= 2, soldLabel: 'Completo' }) : '')
    + ware({ k: 'unmask', cls: 'svc', item: SPR.img('m_semolhos', 5), name: 'Tirar máscara', sub: 'A máscara vai embora · Lampião +1', desc: 'Ela tira uma máscara do seu rosto. Dói um pouco.', off: !RUN.masks.length })
    + leaveBtn('Sair sem nada'));
  stageSay(HELLO.perpetua, { voice: 'perpetua' });
};

// ---------- Dona Marga: relíquias ----------
SCREENS.marga = async function () {
  AUDIO.sfx('bellDoor');
  setScene('burrow', 'village', 'camp', { arena: true });
  const npc = NPCS.marga, R = runRng();
  const stock = relicChoices(3).map(id => ({ id, price: price(48 + R.int(4) * 8), sold: false }));
  const tea = { price: price(15), sold: false };
  UI.show('marga', stage({ fig: npc.art, title: npc.name, kicker: npc.title }), baseActs({ ware: wareActs({ voice: 'marga', buy, poor: POOR.marga }) }));
  function buy(k, el) {
    if (k === 'tea') { if (tea.sold) return; spendLascas(tea.price, el); tea.sold = true; healRun(10); stageSay('Chá de casca. Você nem gosta. Toma assim mesmo.', { voice: 'marga' }); saveRun(); render(); return; }
    const s = stock[+k]; if (!s || s.sold) return;
    spendLascas(s.price, el); s.sold = true; gainRelic(s.id, el);
    stageSay(['Isso já foi de alguém muito querido. Agora é seu.', 'Bom olho. Essa eu quase não vendia.', 'Leva, leva. Já tava pegando poeira.'][+k % 3], { voice: 'marga' });
    render();
  }
  function render() {
    pbody(stock.map((s, i) => ware({ k: i, cls: 'obj relic', item: SPR.img(RELICS[s.id].art, 6), name: RELICS[s.id].name, sub: esc(RELICS[s.id].text), desc: `${RELICS[s.id].name}. ${RELICS[s.id].text}`, price: s.price, sold: s.sold })).join('')
      + ware({ k: 'tea', cls: 'obj', item: SPR.img('o_xicara', 5), name: 'Chá de casca', sub: 'Cura 10', desc: 'Uma xícara de chá de casca de árvore. Quente e amargo.', price: tea.price, sold: tea.sold, soldLabel: 'Tomado' })
      + leaveBtn('Despedir-se'));
  }
  pbody('');
  await npcTalk('marga');
  render();
  stageSay(HELLO.marga, { voice: 'marga' });
};

// ---------- máscaras, cartas e relíquias para escolher ----------
function chooseMask(title, ids, o = {}) {
  return new Promise(resolve => {
    if (!ids.length) { resolve(null); return; }
    const m = UI.modal(`<header><div><div class="kicker">${o.kicker || 'Máscaras'}</div><h2>${esc(title)}</h2></div>${o.noCancel ? '' : '<button class="btn small" data-m="close">Recusar</button>'}</header>
      ${o.text ? `<p class="narr">${o.text}</p>` : ''}
      <div class="offers">${ids.map(id => `<div class="mask-card" data-m="pick" data-id="${id}" style="cursor:pointer">${SPR.img(MASKS[id].art, 5)}<b>${esc(MASKS[id].name)}</b><div class="gift">${esc(MASKS[id].gift)}</div><div class="cost">${esc(MASKS[id].cost)}</div></div>`).join('')}</div>
      ${o.offer ? `<p class="dim" style="text-align:center">Toda máscara deixa o Lampião mais fraco e faz o bosque apodrecer mais rápido. Cabem até ${MASK_LIMIT}.</p>` : ''}`,
    { locked: !!o.noCancel, onClose: () => resolve(null), on: {
      close: (el, close) => close(),
      pick: el => { const id = el.dataset.id; m.el.remove(); resolve(id); }
    } });
  });
}
async function offerMask(n = 2, text) {
  if (RUN.masks.length >= MASK_LIMIT) { toast('Não cabe mais nenhuma máscara no seu rosto.'); return null; }
  const R = runRng();
  const opts = R.shuffle(Object.keys(MASKS).filter(m => !RUN.masks.includes(m))).slice(0, n);
  const id = await chooseMask('Um rosto que não dói', opts, { offer: true, text });
  if (id) addMask(id);
  saveRun();
  return id;
}
// Tela cheia, sem dúvida do que fazer: ESCOLHA UMA CARTA. Pular rende algumas lascas.
function chooseCard(ids, title = 'Escolha uma carta', o = {}) {
  ids.forEach(seeCard);
  return new Promise(resolve => {
    const skipGold = o.skipGold ?? 8;
    const ov = h(`<div class="choose-screen">
      <div class="choose-head"><div class="kicker">${esc(o.kicker || 'Recompensa')}</div><h1>${esc(title.toUpperCase())}</h1><p class="dim">Toque numa carta para levar. Ela entra no seu baralho.</p></div>
      <div class="choose-cards">${ids.map((id, k) => `<button class="choose-one" data-id="${id}" style="--d:${k * 140}ms">
        ${UI.card({ id, uid: 'r' + k }, { cls: 'big' })}
        <div class="choose-desc"><b>${esc(CARDS[id].name)}</b><span class="r-${CARDS[id].rarity}">${CARDS[id].rarity === 'rara' ? 'Rara' : 'Comum'}${cardCost(id) > 1 ? ' · 2 almas' : ''}</span>${esc(CARDS[id].text(false, memCount()))}</div>
      </button>`).join('')}</div>
      <button class="btn choose-skip">Pular${skipGold ? ` (+${skipGold} lascas)` : ''}</button>
    </div>`);
    UI.root.appendChild(ov);
    AUDIO.sfx('page'); setTimeout(() => AUDIO.sfx('seal'), 200);
    ov.addEventListener('click', e => {
      const one = e.target.closest('.choose-one');
      if (one) {
        AUDIO.sfx('place', { suit: CARDS[one.dataset.id].suit }); AUDIO.sfx('memory');
        one.classList.add('taken'); $$('.choose-one', ov).forEach(x => { if (x !== one) x.classList.add('gone'); });
        setTimeout(() => { ov.remove(); resolve(one.dataset.id); }, 650);
        return;
      }
      if (e.target.closest('.choose-skip')) { AUDIO.sfx('back'); ov.remove(); if (skipGold) gainLascas(skipGold); resolve(null); }
    });
  });
}
// Mesma ideia para relíquias.
function chooseRelic(ids, title = 'Escolha uma relíquia', o = {}) {
  return new Promise(resolve => {
    if (!ids.length) { resolve(null); return; }
    const ov = h(`<div class="choose-screen">
      <div class="choose-head"><div class="kicker">${esc(o.kicker || 'Relíquia')}</div><h1>${esc(title.toUpperCase())}</h1><p class="dim">Relíquias não custam nada. Ficam com você até o fim da jornada.</p></div>
      <div class="choose-cards">${ids.map((id, k) => `<button class="choose-one relic-one" data-id="${id}" style="--d:${k * 140}ms">
        <div class="relic-big">${SPR.img(RELICS[id].art, 9)}</div>
        <div class="choose-desc"><b>${esc(RELICS[id].name)}</b>${esc(RELICS[id].text)}</div>
      </button>`).join('')}</div>
      ${o.noSkip ? '' : '<button class="btn choose-skip">Deixar pra lá</button>'}
    </div>`);
    UI.root.appendChild(ov);
    AUDIO.sfx('page');
    ov.addEventListener('click', e => {
      const one = e.target.closest('.choose-one');
      if (one) {
        one.classList.add('taken'); $$('.choose-one', ov).forEach(x => { if (x !== one) x.classList.add('gone'); });
        const r = one.getBoundingClientRect();
        setTimeout(() => { ov.remove(); gainRelic(one.dataset.id, { getBoundingClientRect: () => r }); resolve(one.dataset.id); }, 550);
        return;
      }
      if (e.target.closest('.choose-skip')) { AUDIO.sfx('back'); ov.remove(); resolve(null); }
    });
  });
}
function randomCards(n, rareChance) {
  const R = runRng(), out = [];
  while (out.length < n) {
    const rare = R.next() < rareChance;
    const pool = REWARD_POOL.filter(id => (CARDS[id].rarity === 'rara') === rare && !out.includes(id));
    out.push(R.pick(pool));
  }
  return out;
}

// Mostra a carta antes e depois da melhoria, com o que muda em destaque.
function upgradeDiff(id) {
  const mem = memCount(), a = CARDS[id].face(false, mem), b = CARDS[id].face(true, mem), out = [];
  if (a.atk !== b.atk) out.push(`Dano ${a.atk ?? 0} → <b>${b.atk}</b>`);
  if (a.def !== b.def) out.push(`Guarda ${a.def ?? 0} → <b>${b.def}</b>`);
  b.sig.forEach(([s, n]) => { const old = a.sig.find(x => x[0] === s); if (!old) out.push(`Novo: <b>${SIGILS[s]}${n !== undefined && n !== '' ? ' ' + n : ''}</b>`); else if (old[1] !== n) out.push(`${SIGILS[s]} ${old[1] ?? ''} → <b>${n}</b>`); });
  return out;
}
function upgradePreview(c, cost) {
  return new Promise(resolve => {
    const diff = upgradeDiff(c.id);
    UI.modal(`<header><div><div class="kicker">Forja do Tobias</div><h2>Melhorar esta carta?</h2></div></header>
      <div class="upg"><div class="upg-side">${UI.card({ ...c, up: false }, { cls: 'big' })}<span class="dim">Agora</span></div>
        <div class="upg-arrow">→</div>
        <div class="upg-side">${UI.card({ ...c, up: true }, { cls: 'big glowup' })}<span class="gold">Melhorada</span></div></div>
      <div class="upg-diff">${diff.length ? diff.map(d => `<div>${d}</div>`).join('') : '<div>Fica mais forte.</div>'}</div>
      <p class="dim" style="text-align:center">${esc(CARDS[c.id].text(true, memCount()))}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-m="no">Cancelar</button><button class="btn primary" data-m="yes">Melhorar${cost ? ` · ${cost} lascas` : ''}</button></div>`,
    { onClose: () => resolve(false), on: { no: (el, close) => close(), yes: (el, close) => { resolve(true); close(); } } });
  });
}
// Martelo na bigorna: faíscas, tremor e som de metal.
function forgeFx() {
  AUDIO.sfx('armor'); setTimeout(() => AUDIO.sfx('armor'), 160); setTimeout(() => AUDIO.sfx('block'), 320);
  FX.shake(.8); FX.flash('#ffb45c', .2);
  const f = $('#stFig')?.getBoundingClientRect();
  FX.burst(f ? f.left + f.width / 2 : innerWidth / 2, f ? f.top + f.height * .6 : innerHeight / 2, { n: 50, colors: ['#ffe08a', '#ffb45c', '#ff6a2a', '#fff'], speed: 120, grav: 120, life: .8 });
}

// ---------- estranhezas ----------
SCREENS.event = function (node) {
  setScene(actScene(), 'forest', actAmb(), { arena: true });
  const ev = EVENTS[node.event];
  UI.show('event', stage({ fig: ev.art, figCls: 'ev', figScale: clamp(Math.floor(innerHeight * .24 / SPR.size(ev.art).h), 3, 9), title: ev.title, kicker: 'Estranheza' }), baseActs({ ware: wareActs({ buy: pick }) }));
  pbody(choiceWares(ev));
  stageSay(ev.text, { narr: true });
  async function pick(k) {
    const c = ev.choices[+k];
    const out = await applyEventFx(c.fx, node);
    if (out === 'battle') return;
    stageSay(out || c.out, { narr: true });
    pbody(leaveBtn());
    saveRun();
  }
};
function choiceWares(ev) {
  return ev.choices.map((c, i) => {
    const ok = !c.need || c.need(RUN);
    return c.hide && !ok ? '' : ware({ k: i, cls: 'opt', item: `<span>${esc(c.label)}</span>`, off: !ok });
  }).join('');
}

async function applyEventFx(fx) {
  let out = '';
  if (fx.lascas > 0) gainLascas(fx.lascas); else if (fx.lascas < 0) spendLascas(-fx.lascas);
  if (fx.heal) healRun(fx.heal);
  if (fx.hp) { RUN.hp = Math.max(1, RUN.hp + fx.hp); AUDIO.sfx('hurt'); FX.flash('#a00', .2); FX.shake(.6); LAMP.react('hurt'); }
  if (fx.rot) changeRot(fx.rot);
  if (fx.light) changeLight(fx.light);
  if (fx.rareCard) { const id = randomCards(1, 1)[0]; addCard(id); out = `${CARDS[id].name} entrou no seu baralho. ${out}`; }
  if (fx.maskChoice) { const id = await offerMask(2); if (!id) out = 'Você pula pra fora do círculo no último segundo.'; }
  if (fx.dropMask) { const id = await chooseMask('Qual máscara tirar?', RUN.masks); if (id) dropMask(id); else { changeLight(-1); out = 'Você não consegue.'; } }
  if (fx.cardChoice) { const id = await chooseCard(randomCards(fx.cardChoice, .35), 'Escolha uma carta', { kicker: 'Cartas na lama', skipGold: 0 }); if (id) { addCard(id); out = `${CARDS[id].name} entrou no seu baralho.`; } else out = 'Você deixa as cartas na lama.'; }
  if (fx.removeCard) { const uid = await UI.pickCard('Enterrar qual carta?', c => !CARDS[c.id].keep); if (uid) { const c = RUN.deck.find(x => x.uid === uid); removeCard(uid); out = `Você enterra ${CARDS[c.id].name}. A terra fecha sem fazer barulho.`; } else out = 'Você desiste de enterrar qualquer coisa.'; }
  if (fx.giveCard) { const uid = await UI.pickCard('Dar qual carta pra Pip?', c => !CARDS[c.id].keep); if (uid) { const c = RUN.deck.find(x => x.uid === uid); removeCard(uid); out = `Pip segura ${CARDS[c.id].name} com as duas patas, como se fosse ouro. "Vou guardar pra sempre. Ou até amanhã."`; } else out = 'Você não acha nenhuma boa o bastante. Pip entende.'; }
  if (fx.upgrade) { const uid = await UI.pickCard('Melhorar qual carta?', c => !c.up); if (uid) { const c = RUN.deck.find(x => x.uid === uid); if (await upgradePreview(c, 0)) { c.up = true; forgeFx(); } } }
  if (fx.swapRare) {
    const cands = RUN.deck.filter(c => !CARDS[c.id].keep);
    if (cands.length) { const R = runRng(), c = R.pick(cands), id = randomCards(1, 1)[0]; removeCard(c.uid); addCard(id); out = `O corvo leva ${CARDS[c.id].name} e deixa ${CARDS[id].name}. "Negócio fechado!"`; }
  }
  if (fx.reveal) RUN.revealed = true;
  if (fx.gift) gainRelic(fx.gift);
  if (fx.relic) { const id = relicChoices(1)[0]; if (id) { gainRelic(id); out = `Era ${RELICS[id].name.toLowerCase()}. ${RELICS[id].text}`; } else out = 'Era só um caco de vidro.'; }
  if (fx.relicChoice) { const id = await chooseRelic(relicChoices(fx.relicChoice)); out = id ? `${RELICS[id].name} vai com você.` : 'Você enterra a caixinha de novo, com cuidado.'; }
  if (fx.bet) {
    spendLascas(fx.bet);
    if (runRng().chance(.5)) { setTimeout(() => gainLascas(45), 500); out = 'Você ganha! Os corvos acusam você de roubar. Você não roubou. Quase certeza.'; }
    else out = 'Você perde. O corvo que rouba ganha. Claro.';
  }
  if (fx.burrow) {
    if (runRng().chance(.6)) { const id = relicChoices(1)[0]; if (id) { gainRelic(id); out = `Lá dentro tinha ${RELICS[id].name.toLowerCase()}. E um ratinho muito ofendido.`; } }
    else { RUN.hp = Math.max(1, RUN.hp - 6); AUDIO.sfx('hurt'); FX.flash('#a00', .2); LAMP.react('hurt'); out = 'Tinha olhos. E dentes. (−6 de vida)'; }
  }
  if (fx.gamble) {
    if (runRng().chance(.55)) { gainLascas(35); out = 'Embaixo das tábuas, um saquinho com 35 lascas e um bilhete: "pra quem vier depois. não gasta tudo em vela."'; }
    else {
      await UI.dialogue({ name: '', art: 'i_combat' }, ['*Alguma coisa se mexe embaixo da carga.']);
      BATTLE.start({ type: 'combat', enemy: runRng().pick(ENEMY_POOLS[Math.min(3, RUN.act)].normal), id: RUN.pos });
      return 'battle';
    }
  }
  if (fx.altar) {
    if (memCount() >= 4) { changeLight(2); VHS.clear(3000); out = 'Debaixo do musgo, seis letras: T, A, M, S, I, N. Você passa o dedo devagar em cada uma. O lampião brilha como nunca.'; }
    else { changeLight(1); out = 'As letras estão lá, mas ainda não dizem nada pra você. O lampião se debruça em cima delas, curioso.'; }
  }
  refreshHud();
  return out;
}

// ---------- encontros na trilha (aparecem no mapa, entre um lugar e outro) ----------
function pickTrail() {
  if (RUN.act > 3 || (RUN.trails || 0) >= 2) return null;
  RUN.met = RUN.met || {};
  const fits = ([id, t]) => t.acts.includes(RUN.act) && !(t.once && RUN.met[id]);
  const npcs = Object.entries(TRAILS).filter(([id, t]) => t.npc && fits([id, t]));
  const R = runRng();
  if (npcs.length && R.chance(.55)) return npcs[0][0];
  if (!R.chance(.28)) return null;
  const pool = Object.entries(TRAILS).filter(([id, t]) => !t.npc && fits([id, t]));
  return pool.length ? R.pick(pool)[0] : null;
}
function trailEvent(id) {
  const t = TRAILS[id];
  RUN.trails = (RUN.trails || 0) + 1; RUN.met[id] = true; saveRun();
  return new Promise(async resolve => {
    AUDIO.sfx('rustle'); VHS.disturb(.6, 400);
    if (t.npc) {
      if (t.npc === 'pip') AUDIO.sfx('rustle');
      await UI.dialogue(speaker(t.npc), t.talk());
    }
    const art = t.npc ? NPCS[t.npc].art : t.art;
    const m = UI.modal(`<div class="trail">
        <div class="trail-art">${SPR.img(art, clamp(Math.floor(150 / SPR.size(art).h), 3, 8))}</div>
        <div class="trail-body"><div class="kicker">No caminho</div><h2>${esc(t.title)}</h2><p class="narr" id="trailText">${esc(t.text)}</p>
        <div class="trail-opts" id="trailOpts">${t.choices.map((c, i) => { const ok = !c.need || c.need(RUN); return `<button class="choice" data-m="pick" data-i="${i}" ${ok ? '' : 'disabled'}>${esc(c.label)}</button>`; }).join('')}</div></div>
      </div>`, { cls: 'trail-modal', locked: true, on: {
      pick: async el => {
        const c = t.choices[+el.dataset.i];
        $('#trailOpts').innerHTML = '';
        const out = await applyEventFx(c.fx);
        $('#trailText').textContent = out || c.out;
        $('#trailOpts').innerHTML = '<button class="btn primary" data-m="go">Seguir</button>';
        saveRun();
      },
      go: (el, close) => { close(); resolve(); }
    } });
    m.el.querySelector('.trail-art').animate([{ transform: 'translateY(30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 400, easing: 'cubic-bezier(.2,1.3,.4,1)' });
  });
}

// ---------- lembranças ----------
SCREENS.memoryFind = function (node) {
  const mem = MEMORY_BY_ID[node.memory];
  setScene(actScene(), 'forest', actAmb(), { arena: true });
  AUDIO.sfx('memory');
  UI.show('memfind', stage({ fig: mem.obj, figScale: clamp(Math.floor(innerHeight * .2 / 12), 4, 10), figCls: 'glow', title: mem.name, kicker: 'Uma lembrança' }), baseActs({
    ware: () => SCREENS.memoryScene(mem.id, { after: leaveNode })
  }));
  pbody(ware({ k: 'hold', cls: 'opt', item: '<span>Segurar</span>' }));
  stageSay(mem.find, { narr: true });
  setTimeout(() => LAMP.react('found'), 600);
};

// Cena de memória: filmagem caseira (ver cinema.js). Depois, encarar ou fugir.
SCREENS.memoryScene = function (id, o = {}) {
  const mem = MEMORY_BY_ID[id];
  setScene('memory', 'memory', 'memory');
  const idx = MEMORIES.indexOf(mem) + 1;
  UI.show('memory', `<section class="screen memory">
    <div class="tape-label">FITA ${idx} · ${esc(mem.name.toUpperCase())}</div>
    <div class="film-host" id="film"></div>
    <div class="frame" id="mf"></div>
    <div id="mchoice" class="row center" style="min-height:52px"><button class="btn small skip" data-act="skip">Pular ▸▸</button></div>
  </section>`, { skip: () => film.skip(), face, away, done: () => o.after && o.after() });
  const el = $('#mf');
  AUDIO.sfx('glitch');
  const film = CINEMA.play(id, $('#film'), choice);
  function choice() {
    if (o.replay) { $('#mchoice').innerHTML = '<button class="btn" data-act="done">Voltar</button>'; return; }
    el.textContent = '';
    $('#mchoice').innerHTML = `<button class="btn primary" data-act="face">Encarar</button><button class="btn" data-act="away">Desviar o olhar</button>`;
  }
  function face() {
    unlockMemory(id);
    changeLight(1); changeRot(-8); healRun(8);
    VHS.clear(4500); AUDIO.sfx('memory');
    $('.film')?.classList.add('vivid');
    $('#mchoice').innerHTML = '';
    el.textContent = 'A imagem fica nítida. É sua.';
    toast(`Memória recuperada · ${memCount()}/8`);
    saveRun();
    setTimeout(() => o.after && o.after(), 2600);
  }
  async function away() {
    changeLight(-1); LAMP.react('sad');
    RUN.fled = (RUN.fled || 0) + 1; updateAtmosphere();
    VHS.disturb(2.4, 1600); AUDIO.sfx('glitch');
    $('.film')?.classList.add('lost');
    $('#mchoice').innerHTML = '';
    el.textContent = 'A fita chia. O objeto vira cinza nas suas patas.';
    saveRun();
    setTimeout(async () => {
      if (RUN.masks.length < MASK_LIMIT) await offerMask(2, 'No lugar da lembrança, o bosque oferece um rosto novo.');
      o.after && o.after();
    }, 1800);
  }
};

// ---------- recompensas ----------
SCREENS.reward = async function (node) {
  const elite = node.type === 'elite', boss = node.type === 'boss';
  const def = ENEMIES[node.enemy];
  setScene(def.bg || RUN.arena || actScene(), null, actAmb(), { arena: true });
  AUDIO.music(null);
  AUDIO.sfx('victory');
  const lascas = (boss ? 60 : elite ? 32 : 12 + runRng().int(8)) + (hasRelic(RUN.relics, 'bolota') ? 8 : 0);
  let healed = 0;
  if (hasMask(RUN.masks, 'cera')) healed += 5;
  if (hasRelic(RUN.relics, 'linha')) healed += 3;
  if (boss) { healed += Math.ceil(maxHpNow() * .3); RUN.bagBonus = (RUN.bagBonus || 0) + 1; }
  saveRun();
  UI.show('reward', stage({ fig: def.art, figScale: clamp(Math.floor(innerHeight * .2 / SPR.size(def.art).h), 2, 8), figOpt: { corrupt: !!def.corrupt }, figCls: 'asleep',
    title: boss ? 'Guardião vencido' : elite ? 'Corrompido forte vencido' : 'Vitória', kicker: def.name }), baseActs({ leave: after }));
  stageSay(`${def.name} vira cinza fria. Uma alma pequena fica pra trás, esperando.`, { narr: true });
  setTimeout(() => gainLascas(lascas, $('#stFig')), 500);
  if (healed) setTimeout(() => healRun(healed), 900);
  LAMP.react('win');
  await sleep(1000);
  const id = await chooseCard(randomCards(3, boss ? 1 : elite ? .5 : .22), boss ? 'Escolha uma carta rara' : 'Escolha uma carta');
  if (id) { addCard(id); AUDIO.sfx('place', { suit: CARDS[id].suit }); }
  if (elite || boss) await chooseRelic(relicChoices(boss ? 3 : 2), boss ? 'Escolha uma relíquia' : 'Uma relíquia', { kicker: boss ? 'O Guardião deixou pra trás' : 'O Corrompido deixou pra trás' });
  if (elite) await offerMask(2, 'O Corrompido deixa pra trás o rosto que usava.');
  saveRun();
  pbody(`<div class="st-result">${SPR.icon('u_lasca')} +${lascas} lascas${healed ? ` · ${SPR.icon('u_heart')} +${healed} de vida` : ''}${id ? ` · ${esc(CARDS[id].name)} no baralho` : ''}${boss ? ` · ${SPR.icon('u_soul')} cabem ${BAG_MAX + RUN.bagBonus} almas no Saco` : ''}</div>${leaveBtn()}`);

  function after() {
    if (!boss) { leaveNode(); return; }
    completeNode();
    if (node.enemy === 'maelontra' && !META.memories.includes('selo')) {
      SCREENS.memoryScene('selo', { after: () => actInterlude() });
      return;
    }
    actInterlude();
  }
};
