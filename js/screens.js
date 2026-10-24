'use strict';
// Telas fora do combate.

const SCREENS = {};

// o.arena: chão mais alto (lugares com balcão e combates), para o cenário não ficar escondido embaixo da interface.
function setScene(scene, song, amb, o) {
  SCENE.set(scene, o);
  if (song !== undefined) AUDIO.music(song);
  if (amb) AUDIO.ambience(amb);
}
const actScene = () => ACT_INFO[RUN.act].scene;
const actAmb = () => ACT_INFO[RUN.act].amb;
const ROMAN = ['', 'I', 'II', 'III', 'IV'];

// ---------- título ----------
SCREENS.title = function () {
  RUN = null;
  setScene('title', 'title', 'title');
  updateAtmosphere();
  const saved = hasSavedRun();
  const mem = memCount();
  UI.show('title', `<section class="screen title">
    <div class="logo"><h1>BRAM</h1><div class="sub">e as Cinzas de Vaelgrath</div></div>
    <nav class="menu">
      ${saved ? '<button data-act="continue">Continuar</button>' : ''}
      <button data-act="new">Nova jornada</button>
      <button data-act="tutorial">Como jogar</button>
      <button data-act="journal">Diário</button>
      <button data-act="options">Opções</button>
      <button data-act="credits">Créditos</button>
      ${SETTINGS.dev ? '<button data-act="dev">Desenvolvedor</button>' : ''}
    </nav>
    <div class="foot">${META.cycles ? `Ciclo ${META.cycles} · ` : ''}${mem ? `Memórias ${mem}/8 · ` : ''}${META.ascMax ? `Ciclo+ ${META.ascMax} liberado · ` : ''}v1.1</div>
  </section>`, {
    continue() { if (loadRun()) { UI.cut('▶ PLAY'); updateAtmosphere(); RUN.battle ? BATTLE.resume() : SCREENS.map(); } },
    new() {
      const go = () => {
        if (META.ascMax > 0) { chooseAscension(asc => asc === null ? SCREENS.title() : begin(asc)); return; }
        begin(0);
      };
      const begin = asc => {
        if (!META.tutorialSeen) {
          UI.modal(`<header><div><div class="kicker">Primeira vez no bosque?</div><h2>Ver como se joga?</h2></div></header>
            <p>O tutorial explica o Saco de Almas, a Fila, os combos, as Máscaras e as memórias. Leva uns três minutos.</p>
            <div class="row" style="justify-content:flex-end"><button class="btn small" data-m="skip">Pular</button><button class="btn primary" data-m="yes">Ver tutorial</button></div>`,
          { on: { yes: (el, close) => { close(); TUTORIAL.open(() => startJourney(asc)); }, skip: (el, close) => { close(); META.tutorialSeen = true; saveMeta(); startJourney(asc); } } });
        } else startJourney(asc);
      };
      if (saved) {
        UI.modal(`<header><h2>Começar de novo?</h2></header><p>A jornada salva será perdida. As memórias continuam com você.</p>
          <div class="row" style="justify-content:flex-end"><button class="btn small" data-m="close">Voltar</button><button class="btn primary" data-m="ok">Começar</button></div>`,
        { on: { close: (el, close) => close(), ok: (el, close) => { close(); clearRun(); go(); } } });
      } else go();
    },
    tutorial() { TUTORIAL.open(() => SCREENS.title()); },
    journal() { SCREENS.journal(); },
    options() { SCREENS.options(false); },
    credits() { SCREENS.credits(); },
    dev() { SCREENS.dev(); }
  });
};

function startJourney(asc = 0) {
  newRun({ asc });
  META.ascLast = asc; saveMeta();
  updateAtmosphere();
  SCREENS.intro();
}

// Ciclo+: escolher o nível antes de começar (só depois de terminar a história uma vez).
function chooseAscension(done) {
  let pick = Math.min(META.ascLast || 0, META.ascMax);
  const m = UI.modal('', { cls: 'asc-modal', onClose: () => done(null), on: {
    lvl: el => { pick = +el.dataset.n; draw(); },
    go: () => { m.el.remove(); done(pick); }
  } });
  const box = $('.modal', m.el);
  function draw() {
    box.innerHTML = `<header><div><div class="kicker">Você já terminou a história</div><h2>Ciclo+</h2></div></header>
      <p class="dim">Cada nível deixa o bosque mais cruel e soma com os anteriores. Vencer num nível libera o próximo.</p>
      <div class="asc-list">${[0, ...ASCENSION.map(a => a.n)].map(n => `<button class="asc-row ${n === pick ? 'on' : ''}" data-m="lvl" data-n="${n}" ${n > META.ascMax ? 'disabled' : ''}><b>${n ? 'Ciclo+' + n : 'Normal'}</b><span>${n ? esc(ASCENSION[n - 1].text) : 'O bosque como ele é.'}</span></button>`).join('')}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" data-m="go">Começar${pick ? ' no Ciclo+' + pick : ''}</button></div>`;
  }
  draw();
}

// ---------- introdução de cada ciclo ----------
SCREENS.intro = function () {
  if (!META.filmSeen) { SCREENS.opening(() => { META.filmSeen = true; saveMeta(); UI.cut(`▶ PLAY  ATO ${ROMAN[RUN.act]}`); SCREENS.map(); }); return; }
  setScene('title', 'title', 'title');
  const idx = (META.cycles - 2 + INTRO.length * 10) % INTRO.length;
  const lines = INTRO[idx].slice();
  if (memCount() >= 4) lines.push('O lampião brilha um pouco mais forte do que da última vez.');
  cinematic(lines, () => { UI.cut(`▶ PLAY  ATO ${ROMAN[RUN.act]}`); SCREENS.map(); });
};

// Cena de abertura (primeira jornada; também no modo desenvolvedor).
SCREENS.opening = function (done) {
  setScene('void', 'sad', 'silent');
  UI.show('opening', `<section class="screen opening">
    <div class="film-host wide" id="film"></div>
    <button class="btn small skip" data-act="skip">Pular ▸▸</button>
  </section>`, { skip: () => film.skip() });
  const film = CINEMA.play('abertura', $('#film'), () => { film.stop(); done(); });
};

// Sequência de frases centralizadas, tocar para avançar.
function cinematic(lines, done, o = {}) {
  let i = 0, timer = 0;
  UI.show('cine', `<section class="screen ending" data-act="next" data-silent="1" style="cursor:pointer">
    <div class="line ${o.cls || ''}" id="cl"></div>
    <div class="dim" style="position:absolute;bottom:calc(20px + var(--safe-b));font-size:16px">toque para continuar</div>
  </section>`, { next: () => step() });
  const el = $('#cl');
  function step() {
    clearTimeout(timer);
    if (i >= lines.length) { done(); return; }
    const t = lines[i++];
    el.style.opacity = 0;
    setTimeout(() => {
      el.textContent = t.replace(/^\*/, '');
      el.classList.toggle('voice', t === TAMSIN_LINE);
      el.style.transition = 'opacity .8s'; el.style.opacity = 1;
      AUDIO.sfx('page');
    }, 220);
    timer = setTimeout(step, 2600 + t.length * 45);
  }
  step();
}

// ---------- mapa: um diorama de papel sobre a mesa, diferente em cada ato ----------
const BOARD = {
  1: { deco: 'pines', paper: '#d6a35e', light: '#f0c88a', ink: '#2a160a', lit: '#f6d9a2', shade: '#9a6230', edge: '#4a2a10' },
  2: { deco: 'ruins', paper: '#b4a8ae', light: '#dcd2d6', ink: '#1e1620', lit: '#ece4e8', shade: '#7a6c78', edge: '#3a2e3a' },
  3: { deco: 'swamp', paper: '#bcc296', light: '#dee2b8', ink: '#1a2010', lit: '#c8e09a', shade: '#5a7a3a', edge: '#2a3a1a' },
  4: { deco: 'lair',  paper: '#a86450', light: '#d0907a', ink: '#1a0806', lit: '#c88070', shade: '#4a2018', edge: '#1a0806' }
};

// o.cine: só para a cena de troca de ato (sem cliques) · o.arrive: o tabuleiro novo cai na mesa.
SCREENS.map = function (o = {}) {
  const act = RUN.act, map = RUN.map, B = BOARD[act];
  setScene('desk', act === 4 ? 'dragon' : 'forest', actAmb());
  updateAtmosphere();
  const small = innerWidth < 600;
  const boardW = Math.min(act === 2 ? 680 : act === 3 ? 560 : 620, innerWidth - (small ? 16 : 60));
  const rowH = clamp(Math.floor((innerHeight - (small ? 170 : 210)) / (map.rows + .4)), 52, 96);
  const pad = Math.round(rowH * .75);
  const H = (map.rows - 1) * rowH + pad * 2;
  const avail = new Set(o.cine ? [] : reachable().map(n => n.id));
  const knowMem = META.knowledge.ysoldeMap || RUN.revealed;
  const yOf = n => H - pad - n.row * rowH;
  const stampOpt = { ink: true, inkColor: B.ink };
  const nodes = map.nodes.map(n => {
    const vis = nodeVisible(n);
    const sees = n.type === 'memory' && avail.has(n.id);
    let type = n.type;
    if (type === 'memory' && !knowMem) type = 'event';
    const info = NODE_INFO[type];
    const cls = ['node', sees ? 'lamp-sees' : '', n.type === 'boss' ? 'boss' : '', n.done ? 'done' : '', avail.has(n.id) ? 'avail' : '', RUN.pos === n.id ? 'here' : '', vis ? '' : 'fog', type === 'memory' ? 'memory' : ''].join(' ');
    const tip = vis ? `<b>${info.name}</b>${info.hint}${n.enemy && n.type !== 'combat' ? `<br><span class="dim">${esc(ENEMIES[n.enemy].name)}</span>` : ''}${sees ? '<br><span class="gold">O Lampião não tira o olho daqui.</span>' : ''}` : '<b>???</b>O bosque ainda não mostrou o que tem aqui.';
    return `<button class="${cls}" style="left:${n.x * 100}%;top:${yOf(n)}px" data-act="node" data-id="${n.id}" data-tip="${esc(tip)}" ${avail.has(n.id) ? '' : 'tabindex="-1"'}>${SPR.img(vis ? info.icon : 'u_unknown', n.type === 'boss' ? 4 : 3, stampOpt)}</button>`;
  }).join('');
  const cur = RUN.pos ? nodeById(RUN.pos) : null;
  const tokX = cur ? cur.x * 100 : 50, tokY = cur ? yOf(cur) - 6 : H - pad * .2;
  UI.show(o.cine ? 'mapcine' : 'map', `<section class="screen map">
    <div class="act-banner" id="actBanner">Você chegou... <b>${esc(ACT_INFO[act].name)}</b></div>
    <div class="board-wrap"><div class="board act${act} ${o.arrive ? 'arrive' : ''}" style="width:${boardW}px;height:${H}px;--paper:${B.paper};--light:${B.light};--ink:${B.ink}">
      <canvas id="paths"></canvas>
      ${nodes}
      <div class="bram-token ${o.arrive ? 'drop' : ''}" style="left:${tokX}%;top:${tokY}px">${SPR.img('pin_bram', 3)}</div>
    </div></div>
    ${o.cine ? '' : UI.hud() + UI.lamp()}
  </section>`, o.cine ? {} : {
    async node(el) {
      const n = nodeById(el.dataset.id);
      if (!avail.has(n.id)) { AUDIO.sfx('nosoul'); LAMP.feel('worried', 700); return; }
      const tok = $('.bram-token');
      tok.classList.add('hop');
      tok.style.left = n.x * 100 + '%'; tok.style.top = yOf(n) - 6 + 'px';
      AUDIO.sfx('step'); setTimeout(() => AUDIO.sfx('step'), 200); setTimeout(() => AUDIO.sfx('step'), 400);
      el.classList.add('stamp');
      $$('.node.avail').forEach(b => b.disabled = true);
      await sleep(reduced() ? 80 : 700);
      // Às vezes alguma coisa acontece no meio do caminho.
      const trail = n.type !== 'boss' && n.row > 0 && !RUN.dev ? pickTrail() : null;
      if (trail) await trailEvent(trail);
      enterNode(n);
    },
    deck() { UI.deckModal(); },
    pause() { UI.pauseMenu(); }
  });
  drawBoard(boardW, H, yOf, avail, B);
  if (o.cine) return;
  if (o.arrive) setTimeout(() => AUDIO.sfx('thud'), 420);
  if (!RUN.pos) { const ab = $('#actBanner'); ab.classList.add('show'); }
  // O bosque piorou de estágio: avisa com clareza o que mudou.
  if (RUN.rotWarn) {
    const t = RUN.rotWarn; RUN.rotWarn = 0; saveRun();
    setTimeout(() => {
      AUDIO.sfx('rotUp'); VHS.disturb(1.4, 900); FX.flash('#4a5a20', .25);
      UI.modal(`<header><div><div class="kicker">A Podridão avançou</div><h2>O bosque está ${ROT_TIERS[t].name.toLowerCase()}</h2></div></header>
        <div class="rot-explain">${SPR.img('u_bolor', 6)}<div><p><b>${ROT_TIERS[t].fx}</b></p>
        <p class="dim">A Podridão sobe um pouco a cada lugar visitado, e mais rápido para cada Máscara no rosto. Para fazê-la recuar: <b>Lembrar</b> na fogueira, <b>Purificar</b> na capela ou <b>encarar</b> uma memória.</p></div></div>
        <div class="row" style="justify-content:flex-end"><button class="btn primary" data-m="close">Entendi</button></div>`, { on: { close: (el, close) => close() } });
    }, 700);
  }
  // O Lampião reage aos lugares e aponta lembranças por perto.
  const board = $('.board');
  board.addEventListener('pointerover', e => {
    const b = e.target.closest('.node'); if (!b || b.contains(e.relatedTarget)) return;
    const n = nodeById(b.dataset.id);
    if (n.type === 'boss' || n.type === 'elite') LAMP.feel('scared', 900); else if (b.classList.contains('lamp-sees')) LAMP.feel('happy', 900);
  });
  const memNode = [...avail].map(nodeById).find(n => n.type === 'memory');
  if (memNode) setTimeout(() => {
    const a = $('.lamp')?.getBoundingClientRect(), b = $(`.node[data-id="${memNode.id}"]`)?.getBoundingClientRect();
    if (!a || !b) return;
    LAMP.react('found');
    FX.stream(a.left + a.width / 2, a.top + a.height / 2, b.left + b.width / 2, b.top + b.height / 2, '#ffe08a', 26);
  }, 1100);
  // Depois da primeira luta: explica a Podridão e o Lampião no próprio mapa.
  if (!META.knowledge.mapTut && RUN.stats.fights >= 1 && !RUN.rotWarn) setTimeout(() => TUTORIAL.mapTips(), 900);
  else hintOnce('map', 'Escolha um caminho tocando num lugar que pulsa. Passe o dedo ou o mouse em cima de um ícone para ver o que é.');
};

// Desenha trilhas, chão e decoração do ato. Árvores e juncos balançam quando o mouse passa por eles.
function drawBoard(W0, H0, yOf, avail, B) {
  const cv = $('#paths');
  const S = 3, W = Math.ceil(W0 / S), H = Math.ceil(H0 / S);
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const R = makeRng(RUN.seed + RUN.act * 101);
  const pts = RUN.map.nodes.map(n => [n.x * W, yOf(n) / S]);
  const segs = [];
  for (const n of RUN.map.nodes) for (const id of n.next) { const m = nodeById(id); segs.push([n.x * W, yOf(n) / S, m.x * W, yOf(m) / S, n, m]); }
  const distSeg = (px, py, [x0, y0, x1, y1]) => { const dx = x1 - x0, dy = y1 - y0, t = clamp(((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy || 1), 0, 1); return Math.hypot(px - x0 - t * dx, py - y0 - t * dy); };
  const free = (x, y, r1, r2) => !pts.some(([px, py]) => Math.hypot(px - x, py - y) < r1) && !segs.some(sg => distSeg(x, y, sg) < r2);

  // camada fixa: chão do ato e trilhas
  const base = document.createElement('canvas'); base.width = W; base.height = H;
  const b = base.getContext('2d');
  if (B.deco === 'swamp') {
    for (let i = 0; i < 9; i++) {
      const x = R.next() * W, y = R.next() * H, rx = 10 + R.next() * 18, ry = rx * .45;
      if (!free(x, y, 18, 10)) continue;
      b.fillStyle = 'rgba(70,100,96,.45)'; b.beginPath(); b.ellipse(x, y, rx, ry, 0, 0, 7); b.fill();
      b.fillStyle = 'rgba(220,240,230,.5)'; b.fillRect(Math.round(x - rx * .4), Math.round(y - ry * .3), Math.round(rx * .5), 1);
    }
  }
  if (B.deco === 'lair') {
    b.strokeStyle = 'rgba(255,120,40,.7)'; b.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      let x = R.next() * W, y = R.next() * H; b.beginPath(); b.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (R.next() - .5) * 14; y += R.next() * 8; b.lineTo(x, y); }
      b.stroke();
    }
  }
  if (B.deco === 'ruins') {
    b.fillStyle = 'rgba(60,50,60,.18)';
    for (const [x0, y0, x1, y1] of segs) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4); for (let k = 1; k < n; k++) { const t = k / n; b.fillRect(Math.round(lerp(x0, x1, t)) - 2, Math.round(lerp(y0, y1, t)) - 1, 4, 3); } }
  }
  for (const [x0, y0, x1, y1, n, m] of segs) {
    const isAvail = RUN.pos === n.id && avail.has(m.id);
    const walked = n.done && m.done;
    b.fillStyle = isAvail ? '#9a1a0a' : walked ? B.ink : B.ink + 'cc';
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2.2);
    for (let k = 3; k < steps - 2; k++) {
      if (k % 3 === 2) continue;
      const t = k / steps;
      b.fillRect(Math.round(lerp(x0, x1, t)), Math.round(lerp(y0, y1, t)), 2, isAvail ? 2 : 1);
    }
  }

  // decoração do ato
  const kinds = { pines: [['pine', 1]], ruins: [['column', .35], ['grave', .35], ['dead', .3]], swamp: [['reed', .55], ['dead', .3], ['pine', .15]], lair: [['rock', .6], ['spike', .25], ['bone', .15]] }[B.deco];
  const density = B.deco === 'pines' ? 55 : B.deco === 'swamp' ? 95 : B.deco === 'ruins' ? 130 : 85;
  const items = [];
  for (let i = 0; i < W * H / density; i++) {
    const x = R.next() * W, y = 4 + R.next() * (H + 4);
    const edge = Math.min(x, W - x) < W * .14;
    let r = R.next(), kind = kinds[0][0];
    for (const [k, w] of kinds) { if ((r -= w) <= 0) { kind = k; break; } }
    const h = (kind === 'grave' || kind === 'bone' ? 5 : kind === 'reed' ? 9 : 8) + R.next() * 7 + (edge && kind !== 'bone' ? 4 + R.next() * 4 : 0);
    if (!free(x, y - h * .4, 15, 7)) continue;
    if (items.some(t => Math.hypot(t.x - x, t.y - y) < 5)) continue;
    items.push({ kind, x, y, h, s: 0, v: 0, sway: ['pine', 'reed', 'dead'].includes(kind) });
  }
  items.sort((a, b) => a.y - b.y);

  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  function shadow(x, y, w, h) { g.fillStyle = 'rgba(40,20,0,.25)'; g.beginPath(); g.moveTo(x - w, y); g.lineTo(x + w * 2.4, y - h * .25); g.lineTo(x + w, y + 1); g.fill(); }
  const DRAW = {
    pine(t) {
      const { x, y, h, s } = t, w = h * .42; shadow(x, y, w, h);
      for (let k = 0; k < h; k++) {
        const half = Math.max(1, Math.round(w * (k + 1) / h)), yy = y - h + k, xx = x + s * (1 - k / h) * 4;
        px(xx - half - 1, yy, half * 2 + 2, 1, B.edge); px(xx - half, yy, half, 1, B.lit); px(xx, yy, half, 1, B.shade);
      }
      px(x - w - 1, y, Math.round(w * 2) + 2, 1, B.edge);
    },
    reed(t) {
      const { x, y, h, s } = t;
      for (let i = 0; i < 4; i++) {
        const x0 = x + (i - 1.5) * 1.7, len = h * (.7 + (i % 2) * .3), lean = (i - 1.5) * .25 + s * 1.5;
        for (let k = 0; k < len; k++) px(x0 + lean * k / len * 4, y - k, 1, 1, k > len - 3 ? '#6b4a30' : i % 2 ? B.shade : B.edge);
      }
    },
    dead(t) {
      const { x, y, h, s } = t; shadow(x, y, 2, h);
      for (let k = 0; k < h; k++) px(x + s * (k / h) * 3, y - k, 2, 1, B.edge);
      for (const [f, d, l] of [[.5, -1, 4], [.65, 1, 5], [.8, -1, 3]]) { const bx = x + s * f * 3, by = y - h * f; for (let k = 0; k < l; k++) px(bx + d * k + (d > 0 ? 2 : 0), by - k * .7, 1, 1, B.edge); }
    },
    column(t) {
      const { x, y, h } = t; shadow(x, y, 3, h);
      px(x - 3, y - h, 3, h, B.lit); px(x, y - h, 3, h, B.shade); px(x - 4, y - h - 1, 8, 1, B.edge); px(x - 4, y - 1, 8, 2, B.edge);
      px(x - 3, y - h - 3, 2, 2, B.lit); px(x + 1, y - h - 2, 1, 1, B.shade);
    },
    grave(t) {
      const { x, y, h } = t; shadow(x, y, 3, h);
      px(x - 3, y - h + 1, 6, h - 1, B.lit); px(x - 2, y - h, 4, 1, B.lit); px(x, y - h + 1, 3, h - 1, B.shade);
      px(x - 1, y - h + 2, 1, 3, B.edge); px(x - 2, y - h + 3, 3, 1, B.edge);
    },
    rock(t) {
      const { x, y, h } = t, w = h * .6; shadow(x, y, w * .7, h * .6);
      for (let k = 0; k < h * .7; k++) { const half = Math.round(w * Math.min(1, (k + 2) / (h * .5))); px(x - half, y - h * .7 + k, half, 1, B.lit); px(x, y - h * .7 + k, half, 1, B.shade); }
      px(x - w, y, w * 2, 1, B.edge);
    },
    spike(t) { const { x, y, h } = t; for (let k = 0; k < h; k++) { const hw = Math.round(2 * k / h); px(x - hw, y - h + k, hw + 1, 1, B.edge); px(x + 1, y - h + k, hw, 1, B.shade); } },
    bone(t) { const { x, y } = t; px(x - 3, y, 7, 1, '#e8dcc4'); px(x - 4, y - 1, 2, 1, '#e8dcc4'); px(x + 3, y - 1, 2, 1, '#e8dcc4'); px(x - 4, y + 1, 2, 1, '#e8dcc4'); px(x + 3, y + 1, 2, 1, '#e8dcc4'); }
  };
  function render() {
    g.clearRect(0, 0, W, H);
    g.drawImage(base, 0, 0);
    for (const t of items) DRAW[t.kind](t);
  }
  render();

  // balanço: mola simples, só enquanto alguma árvore estiver mexendo
  let anim = 0, lastRustle = 0;
  function step() {
    let moving = false;
    for (const t of items) if (t.sway && (t.s || t.v)) {
      t.v += -t.s * .18; t.v *= .86; t.s += t.v;
      if (Math.abs(t.s) < .01 && Math.abs(t.v) < .01) { t.s = 0; t.v = 0; } else moving = true;
    }
    render();
    anim = moving ? requestAnimationFrame(step) : 0;
  }
  cv.addEventListener('pointermove', e => {
    const x = e.offsetX * W / cv.clientWidth, y = e.offsetY * H / cv.clientHeight;
    let hit = false;
    for (const t of items) {
      if (!t.sway || Math.abs(t.v) > .3) continue;
      const d = Math.hypot(t.x - x, t.y - t.h * .5 - y);
      if (d < 6 + t.h * .45) { t.v += (x < t.x ? 1 : -1) * .5; hit = true; }
    }
    if (hit) {
      const now = performance.now();
      if (now - lastRustle > 140) { AUDIO.sfx('rustle'); lastRustle = now; }
      if (!anim) anim = requestAnimationFrame(step);
    }
  });
}

// Troca de ato: o pino sai pelo topo, o mapa antigo se dobra, frases no escuro e o mapa novo cai na mesa.
function actInterlude() {
  const boss = RUN.map.nodes.find(n => n.type === 'boss');
  if (boss) RUN.pos = boss.id;
  SCREENS.map({ cine: true });
  const tok = $('.bram-token'), board = $('.board');
  setTimeout(() => { tok?.classList.add('leave'); AUDIO.sfx('step'); setTimeout(() => AUDIO.sfx('step'), 180); }, 500);
  setTimeout(() => { board?.classList.add('fold'); AUDIO.sfx('whoosh'); }, 1300);
  setTimeout(() => {
    advanceAct();
    const lines = ACT_LINES[RUN.act] || [];
    setScene('desk', RUN.act === 4 ? 'dragon' : 'forest', ACT_INFO[RUN.act].amb);
    updateAtmosphere();
    cinematic([`Ato ${ROMAN[RUN.act]} · ${ACT_INFO[RUN.act].name}`, ...lines], () => { UI.cut(`▶ PLAY  ATO ${ROMAN[RUN.act]}`); SCREENS.map({ arrive: true }); });
  }, 2300);
}

// Dicas de primeira vez (podem ser desligadas nas opções).
function hintOnce(key, text) {
  if (!SETTINGS.hints) return;
  META.knowledge.hints = META.knowledge.hints || {};
  if (META.knowledge.hints[key]) return;
  META.knowledge.hints[key] = true; saveMeta();
  setTimeout(() => toast(text, 5200), 700);
}

function enterNode(n) {
  RUN.pos = n.id;
  saveRun();
  switch (n.type) {
    case 'combat': case 'elite': case 'boss': BATTLE.start(n); break;
    case 'camp': SCREENS.camp(n); break;
    case 'ysolde': SCREENS.ysolde(n); break;
    case 'marga': SCREENS.marga(n); break;
    case 'tobias': SCREENS.tobias(n); break;
    case 'perpetua': SCREENS.perpetua(n); break;
    case 'event': SCREENS.event(n); break;
    case 'memory': SCREENS.memoryFind(n); break;
  }
}

function leaveNode() { completeNode(); UI.cut(); SCREENS.map(); }

// ---------- morte ----------
// o.preview (ou jornada de teste): mostra a tela sem contar a queda nem apagar o jogo salvo.
SCREENS.death = function (o = {}) {
  const preview = o.preview || (RUN && RUN.dev);
  if (!preview) { META.deaths++; saveMeta(); }
  const act = RUN ? RUN.act : 1, carried = RUN ? RUN.carried.length : 0;
  if (!preview) clearRun(); else if (RUN && RUN.dev) RUN = null;
  setScene('void', 'sad', 'silent');
  SCENE.setRot(.6);
  const line = DEATH_LINES[(Math.max(1, META.deaths) - 1 + (o.line || 0)) % DEATH_LINES.length];
  UI.show('death', `<section class="screen ending">
    <div class="panel place-card" style="text-align:center;align-items:center">
      <div class="kicker">Ciclo ${META.cycles} encerrado</div>
      <h2>O ciclo recomeça</h2>
      <p class="narr" style="font-size:24px">${esc(line)}</p>
      <p>Chegou até o Ato ${ROMAN[act]} · Memórias: ${memCount()}/8${carried ? ` · ${carried} recuperada(s) nesta jornada` : ''}</p>
      <p class="dim">As memórias e o que você aprendeu ficam. As cartas, as lascas e as máscaras voltam para o bosque.</p>
      <button class="btn primary" data-act="wake">Acordar</button>
    </div></section>`, {
    wake() { AUDIO.sfx('glitch'); VHS.disturb(2, 900); preview ? SCREENS.dev('cenas') : SCREENS.title(); }
  });
};

// ---------- o Selo (terceira fase do dragão) e os finais ----------
// o.mem: quantas memórias simular (modo desenvolvedor).
SCREENS.seal = function (o = {}) {
  const preview = o.preview || (RUN && RUN.dev);
  if (o.mem !== undefined) MEM_OVERRIDE = o.mem;
  setScene('lair', 'memory', 'lair');
  SCENE.setRot(.2);
  const mem = memCount();
  const lines = ['Vaelgrath desmorona sobre as patas dianteiras.', 'Ele não ataca mais. Só respira, devagar, como o poço.', 'Você tira do bolso esquerdo da capa a carta apagada.',
    mem >= 8 ? 'O rosto na carta está completo. Uma lontra, sorrindo torto.' : mem >= 4 ? 'O rosto na carta está quase inteiro. Faltam pedaços.' : 'A carta continua quase toda em branco.',
    TAMSIN_LINE];
  cinematic(lines, choose);
  function choose() {
    AUDIO.music('memory');
    const card = UI.card({ id: 'apagada', uid: 'seal' }, { cls: 'big', full: true });
    UI.show('seal', `<section class="screen ending" style="gap:18px">
      <div class="kicker">O Selo</div>
      ${card}
      <div class="choices" style="width:min(520px,100%)">
        <button class="choice" data-act="end" data-k="esquecer"><div>Desviar o olhar<small>Esquecer de vez.</small></div></button>
        <button class="choice" data-act="end" data-k="carregar" ${mem >= 4 ? '' : 'disabled'}><div>Segurar a carta<small>${mem >= 4 ? 'Lembrar e carregar a dor.' : 'Você não lembra o suficiente. (4 memórias)'}</small></div></button>
        ${mem >= 8 ? '<button class="choice" data-act="end" data-k="nome" style="box-shadow:0 0 0 2px #e3bd5a,0 0 0 4px #000"><div>Dizer o nome dela</div></button>' : '<button class="choice" disabled><div>…<small>Algo falta. (todas as memórias)</small></div></button>'}
      </div></section>`, { end: el => SCREENS.ending(el.dataset.k, { preview }) });
  }
};

SCREENS.ending = function (kind, o = {}) {
  const E = ENDINGS[kind];
  const preview = o.preview || (RUN && RUN.dev);
  MEM_OVERRIDE = null;
  if (!preview) {
    if (!META.endings.includes(kind)) META.endings.push(kind);
    META.wins++;
    const asc = RUN ? RUN.asc || 0 : 0;
    META.ascMax = Math.max(META.ascMax || 0, Math.min(ASC_MAX, asc + 1));
    saveMeta();
    clearRun();
  } else if (RUN && RUN.dev) RUN = null;
  setScene(E.scene, E.song, kind === 'esquecer' ? 'silent' : 'forest');
  SCENE.setRot(kind === 'esquecer' ? 1 : kind === 'carregar' ? .3 : 0);
  AUDIO.setWarp(kind === 'esquecer' ? 1 : 0);
  if (kind === 'nome') VHS.clear(60000);
  cinematic(E.lines, () => {
    UI.show('end', `<section class="screen ending"><div class="panel place-card" style="text-align:center;align-items:center">
      <div class="kicker">Final ${META.endings.length}/3 descoberto</div><h2>${esc(E.title)}</h2>
      <p class="dim">${kind === 'nome' ? 'Obrigado por lembrar com ele.' : kind === 'carregar' ? 'Tem um final em que Bram fala. Pra isso, ele precisa lembrar de tudo.' : 'Tem outros finais. Eles pedem que você lembre.'}</p>
      ${preview ? '' : `<p class="gold">Ciclo+ ${META.ascMax} liberado: um bosque mais cruel, pra quem quiser.</p>`}
      <div class="row center"><button class="btn" data-act="credits">Créditos</button><button class="btn primary" data-act="menu">Menu</button></div>
    </div></section>`, { menu: () => preview ? SCREENS.dev('cenas') : SCREENS.title(), credits: () => SCREENS.credits() });
  }, { cls: kind === 'nome' ? '' : '' });
};

// ---------- diário ----------
SCREENS.journal = function (tab = 'mem') {
  setScene('title', 'title', 'title');
  const tabs = { mem: 'Memórias', cards: 'Cartas', relics: 'Relíquias', best: 'Corrompidos', end: 'Finais', reg: 'Registro' };
  let body = '';
  if (tab === 'mem') {
    body = `<div class="jgrid">${MEMORIES.map((m, i) => {
      const got = META.memories.includes(m.id);
      return `<div class="jitem ${got ? '' : 'locked'}">${SPR.img(got ? m.obj : 'u_unknown', got ? 5 : 6)}<b>${got ? esc(m.name) : `Fita ${i + 1}`}</b>${got ? `<button class="btn small" data-act="replay" data-id="${m.id}">Rever</button>` : '<span class="dim">Ainda esquecida</span>'}</div>`;
    }).join('')}</div>
    <div style="margin-top:16px;display:flex;gap:18px;align-items:center;justify-content:center;flex-wrap:wrap">${UI.card({ id: 'apagada', uid: 'j' }, { cls: 'big', full: true })}<p class="narr" style="max-width:320px">A carta mais antiga do baralho. O rosto volta conforme você lembra.</p></div>`;
  } else if (tab === 'cards') {
    const all = Object.keys(CARDS).filter(id => !CARDS[id].temp);
    const got = all.filter(id => META.seenCards.includes(id) || id === 'apagada' || STARTER_DECK.includes(id));
    body = `<p class="dim" style="text-align:center">${got.length} de ${all.length} cartas encontradas · passe o mouse ou toque para ler</p>
      <div class="deck-grid coll">${all.map(id => got.includes(id) ? UI.card({ id, uid: 'c' + id }, { cls: 'mini', attrs: 'data-act="cinfo"' }) : `<div class="card mini back" data-tip="<b>???</b>Ainda não encontrada."><span>?</span></div>`).join('')}</div>`;
  } else if (tab === 'relics') {
    const all = Object.keys(RELICS), got = all.filter(id => META.relicsSeen.includes(id));
    body = `<p class="dim" style="text-align:center">${got.length} de ${all.length} relíquias encontradas</p>
      <div class="jgrid">${all.map(id => got.includes(id) ? `<div class="jitem">${SPR.img(RELICS[id].art, 5)}<b>${esc(RELICS[id].name)}</b><span class="dim" style="font-size:17px">${esc(RELICS[id].text)}</span></div>` : `<div class="jitem locked">${SPR.img('u_unknown', 5)}<b>???</b></div>`).join('')}</div>`;
  } else if (tab === 'best') {
    body = `<div class="jgrid">${Object.entries(ENEMIES).map(([id, e]) => {
      const b = META.bestiary[id];
      return `<div class="jitem ${b ? '' : 'locked'}">${b ? SPR.img(e.art, e.boss ? 2 : 4, { corrupt: !!e.corrupt }) : SPR.img('u_unknown', 6)}<b>${b ? esc(e.name) : '???'}</b>${b && e.grief ? `<span class="gold">${e.grief}</span>` : ''}${b ? `<span class="dim" style="font-size:17px">${esc(e.lore)}</span><span class="dim">Vencido ${b.defeated}×</span>` : ''}</div>`;
    }).join('')}</div>`;
  } else if (tab === 'end') {
    body = `<div class="jgrid">${Object.entries(ENDINGS).map(([k, e]) => `<div class="jitem ${META.endings.includes(k) ? '' : 'locked'}"><b>${META.endings.includes(k) ? esc(e.title) : '???'}</b><span class="dim">${META.endings.includes(k) ? 'Descoberto' : 'Ainda não'}</span></div>`).join('')}</div>`;
  } else {
    body = `<div class="opt"><label>Ciclos</label><span>${META.cycles}</span><label>Quedas</label><span>${META.deaths}</span><label>Jornadas completas</label><span>${META.wins}</span>
      <label>Combates vencidos</label><span>${META.stats.fights}</span><label>Cartas jogadas</label><span>${META.stats.cards}</span><label>Combos</label><span>${META.stats.combos}</span>
      <label>Memórias</label><span>${memCount()}/8</span><label>Ciclo+ liberado</label><span>${META.ascMax || 0}</span></div>`;
  }
  UI.show('journal', `<section class="screen place"><div class="panel place-card scroll" style="width:min(900px,100%)">
    <header class="row" style="justify-content:space-between"><h2>Diário</h2><button class="btn small" data-act="back">Voltar</button></header>
    <div class="tabs">${Object.entries(tabs).map(([k, v]) => `<button class="${k === tab ? 'on' : ''}" data-act="tab" data-k="${k}">${v}</button>`).join('')}</div>
    ${body}</div></section>`, {
    back: () => SCREENS.title(),
    tab: el => SCREENS.journal(el.dataset.k),
    cinfo: el => { const r = el.getBoundingClientRect(); UI.showTip?.(UI.cardTip({ id: el.dataset.id }), r.right - 10, r.top + 20); },
    replay: el => SCREENS.memoryScene(el.dataset.id, { replay: true, after: () => SCREENS.journal('mem') })
  });
};

// ---------- opções ----------
SCREENS.options = function (inGame) {
  const sliders = [['master', 'Volume geral'], ['music', 'Música'], ['sfx', 'Efeitos'], ['amb', 'Ambiente'], ['vhs', 'Efeito de fita VHS', 'Chiado, linhas e ruído.']];
  const toggles = [['reducedMotion', 'Reduzir movimento', 'Menos tremor e partículas.'], ['fast', 'Textos rápidos', 'Diálogos e falas aparecem mais depressa.'], ['hints', 'Dicas de primeira vez', '']];
  if (DEV_ALLOWED) toggles.push(['dev', 'Modo desenvolvedor', 'Só aparece jogando no seu computador. Libera um menu para ver todas as cenas, lutas e falas.']);
  const html = `<header class="row" style="justify-content:space-between"><h2>Opções</h2><button class="btn small" data-m="close">Fechar</button></header>
    <div class="body"><div class="opt">
      ${sliders.map(([k, l, s]) => `<label>${l}${s ? `<small>${s}</small>` : ''}</label><input type="range" min="0" max="100" value="${Math.round(SETTINGS[k] * 100)}" data-k="${k}">`).join('')}
      ${toggles.map(([k, l, s]) => `<label>${l}${s ? `<small>${s}</small>` : ''}</label><button class="toggle ${SETTINGS[k] ? 'on' : ''}" data-m="tog" data-k="${k}">${SETTINGS[k] ? 'Sim' : 'Não'}</button>`).join('')}
      <label>Velocidade do combate<small>Também dá para trocar durante a luta.</small></label><button class="toggle" data-m="speed">${combatSpeed()}×</button>
      <label>Qualidade<small>"Auto" economiza em aparelhos mais simples.</small></label><button class="toggle" data-m="quality">${SETTINGS.quality}</button>
      <label>Tela cheia</label><button class="toggle" data-m="full">Alternar</button>
      ${inGame ? '' : '<label>Apagar todo o progresso<small>Memórias, finais e diário.</small></label><button class="toggle" data-m="reset">Apagar</button>'}
    </div></div>`;
  const m = UI.modal(html, { muffle: inGame, on: {
    close: (el, close) => close(),
    tog: el => {
      const k = el.dataset.k; SETTINGS[k] = !SETTINGS[k]; el.classList.toggle('on', SETTINGS[k]); el.textContent = SETTINGS[k] ? 'Sim' : 'Não'; saveSettings();
      if (k === 'dev' && UI.current === 'title') { m.close(); SCREENS.title(); if (SETTINGS.dev) toast('Modo desenvolvedor ligado: veja o item Desenvolvedor no menu.'); }
    },
    speed: el => { SETTINGS.speed = combatSpeed() % 3 + 1; saveSettings(); el.textContent = SETTINGS.speed + '×'; },
    quality: el => { const o = ['auto', 'alta', 'baixa']; SETTINGS.quality = o[(o.indexOf(SETTINGS.quality) + 1) % 3]; el.textContent = SETTINGS.quality; saveSettings(); SCENE.resize(); },
    full: () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); },
    reset: (el, close) => {
      if (el.dataset.sure) { store.del(KEYS.meta); store.del(KEYS.run); location.reload(); return; }
      el.dataset.sure = 1; el.textContent = 'Certeza?';
    }
  } });
  $$('input[type=range]', m.el).forEach(inp => inp.addEventListener('input', () => { SETTINGS[inp.dataset.k] = inp.value / 100; saveSettings(); if (inp.dataset.k === 'sfx') AUDIO.sfx('click'); }));
};

SCREENS.credits = function () {
  setScene('title', 'title', 'title');
  UI.show('credits', `<section class="screen place"><div class="panel place-card scroll" style="text-align:center;align-items:center">
    <div class="kicker">Créditos</div><h2>Bram e as Cinzas de Vaelgrath</h2>
    <p>Um roguelite de cartas sobre luto, memória e um coelho que não fala.</p>
    <p class="dim">História e direção: Murilo<br>Programação, pixel art, música e sons gerados em código, sem arquivos externos.</p>
    <p class="dim">Fontes: Jersey 10, Press Start 2P e VT323 (Google Fonts).</p>
    <p class="narr">Para quem ainda deixa a luz acesa.</p>
    <button class="btn primary" data-act="back">Voltar</button></div></section>`, { back: () => SCREENS.title() });
};
