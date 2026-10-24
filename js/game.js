'use strict';
// Estado do jogo: configurações, progresso permanente (meta), a jornada atual (run) e o mapa.

const KEYS = { settings: 'bram.settings.v1', meta: 'bram.meta.v1', run: 'bram.run.v1' };

// ---------- configurações ----------
const SETTINGS = Object.assign({
  master: .8, music: .7, sfx: .8, amb: .6, vhs: .3, reducedMotion: false, fast: false, speed: 1, quality: 'auto', hints: true
}, store.get(KEYS.settings, {}));
// Versões antigas tinham o chiado VHS forte demais por padrão.
if (!SETTINGS.v2) { SETTINGS.vhs = Math.min(SETTINGS.vhs, .3); SETTINGS.v2 = true; store.set(KEYS.settings, SETTINGS); }
// O modo desenvolvedor só existe jogando no próprio computador (arquivo aberto direto ou servidor local), nunca no site publicado.
const DEV_ALLOWED = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
if (!DEV_ALLOWED) SETTINGS.dev = false;
// Velocidade das animações de combate (1×, 2×, 3×).
const combatSpeed = () => SETTINGS.speed || (SETTINGS.fast ? 2 : 1);
function saveSettings() { store.set(KEYS.settings, SETTINGS); applySettings(); }
function applySettings() {
  AUDIO.setVolumes({ master: SETTINGS.master, music: SETTINGS.music, sfx: SETTINGS.sfx, amb: SETTINGS.amb });
  VHS.setBase(SETTINGS.vhs);
  const low = SETTINGS.quality === 'baixa' || (SETTINGS.quality === 'auto' && ((navigator.hardwareConcurrency || 8) <= 4 || innerWidth < 500));
  QUALITY.fps = low ? 24 : 30; QUALITY.particles = low ? .5 : 1;
  document.body.classList.toggle('low', low);
  document.body.classList.toggle('reduced', !!SETTINGS.reducedMotion);
}

// ---------- progresso permanente: o que Bram lembra ----------
const META = Object.assign({
  cycles: 0, deaths: 0, wins: 0, memories: [], endings: [], bestiary: {}, knowledge: {},
  talk: {}, tutorialSeen: false, stats: { cards: 0, combos: 0, fights: 0 },
  seenCards: [], relicsSeen: [], ascMax: 0, ascLast: 0, filmSeen: false
}, store.get(KEYS.meta, {}));
// Coleção do Diário: toda carta que passou pelas patas de Bram fica registrada.
function seeCard(id) {
  if (!id || (RUN && RUN.dev) || META.seenCards.includes(id) || !CARDS[id] || CARDS[id].temp) return;
  META.seenCards.push(id); saveMeta();
}
function saveMeta() { store.set(KEYS.meta, META); }
// MEM_OVERRIDE: o modo desenvolvedor simula quantas memórias Bram tem, sem mexer no progresso.
let MEM_OVERRIDE = null;
const memCount = () => MEM_OVERRIDE ?? META.memories.length;
function seeEnemy(id, defeated) {
  if (RUN && RUN.dev) return;
  const b = META.bestiary[id] || (META.bestiary[id] = { seen: 0, defeated: 0 });
  if (defeated) b.defeated++; else b.seen++;
  saveMeta();
}

// ---------- a jornada ----------
let RUN = null;
const NODE_INFO = {
  combat:   { name: 'Corrompido',        icon: 'i_combat',   hint: 'Um combate.' },
  elite:    { name: 'Corrompido Forte',  icon: 'i_elite',    hint: 'Combate difícil. Recompensa: uma Máscara.' },
  boss:     { name: 'Guardião do Luto',  icon: 'i_boss',     hint: 'O chefe deste trecho do bosque.' },
  camp:     { name: 'Fogueira',          icon: 'i_camp',     hint: 'Descansar ou lembrar.' },
  ysolde:   { name: 'Madame Ysolde',     icon: 'i_ysolde',   hint: 'Mapas, cartas e máscaras.' },
  marga:    { name: 'Achados e Perdidos', icon: 'i_marga',   hint: 'Dona Marga vende relíquias.' },
  tobias:   { name: 'Forja do Tobias',   icon: 'i_tobias',   hint: 'Melhorar ou remover cartas.' },
  perpetua: { name: 'Capela',            icon: 'i_perpetua', hint: 'Rezar, purificar ou tirar uma máscara.' },
  event:    { name: 'Estranheza',        icon: 'i_event',    hint: 'Algo acontece no bosque.' },
  memory:   { name: 'Lembrança',         icon: 'i_memory',   hint: 'Algo que pertence a você.' }
};

// o.dev: jornada de teste do modo desenvolvedor (não conta ciclo e nunca é salva).
// o.asc: nível de Ciclo+ (0 = normal).
function newRun(o = {}) {
  if (!o.dev) { META.cycles++; saveMeta(); }
  const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
  const asc = o.asc || 0, hp = BRAM_HP - (asc >= 2 ? 4 : 0);
  RUN = {
    seed, rngState: seed, act: 1, hp, maxHp: hp, lascas: 25, masks: [], relics: [], light: 2, rot: asc >= 3 ? 15 : 0,
    deck: [], uid: 0, carried: [], pos: null, map: null, battle: null, stats: { fights: 0, combos: 0 },
    act2Boss: null, revealed: false, freeUpgradeUsed: {}, dev: !!o.dev, asc, trails: 0, met: {}
  };
  for (const id of STARTER_DECK) addCard(id);
  const R = runRng();
  RUN.act2Boss = R.pick(ENEMY_POOLS[2].boss);
  RUN.map = generateMap(1);
  saveRun();
}

// Gerador da jornada: guarda o estado para que recompensas não mudem ao recarregar.
function runRng() {
  const R = makeRng(RUN.rngState);
  return new Proxy(R, { get(t, k) { const v = t[k]; return typeof v === 'function' ? (...a) => { const out = v.apply(t, a); RUN.rngState = t.state; return out; } : v; } });
}

function addCard(id, up = false) { const c = { uid: ++RUN.uid, id, up }; RUN.deck.push(c); seeCard(id); return c; }
function removeCard(uid) { RUN.deck = RUN.deck.filter(c => c.uid !== uid); }

function maxHpNow() { return RUN.maxHp + RUN.masks.reduce((s, m) => s + (MASKS[m].maxHp || 0), 0) + (hasRelic(RUN.relics, 'botao') ? 5 : 0); }
// Preço final de qualquer compra (Ferradura barateia, Ciclo+ 5 encarece).
function price(n) { return Math.round(n * (hasRelic(RUN.relics, 'ferradura') ? .8 : 1) * ((RUN.asc || 0) >= 5 ? 1.25 : 1)); }
function gainRelic(id, from) {
  if (!RELICS[id] || RUN.relics.includes(id)) return false;
  RUN.relics.push(id);
  if (!RUN.dev && !META.relicsSeen.includes(id)) { META.relicsSeen.push(id); saveMeta(); }
  if (id === 'botao') RUN.hp += 5;
  UI.feedback('relic', id, from);
  saveRun();
  return true;
}
// Relíquias que Bram ainda não tem, sorteadas pela jornada.
function relicChoices(n) { const R = runRng(); return R.shuffle(Object.keys(RELICS).filter(id => !RUN.relics.includes(id))).slice(0, n); }
function healRun(n) {
  const before = RUN.hp; RUN.hp = clamp(RUN.hp + n, 0, maxHpNow());
  const got = RUN.hp - before;
  if (got > 0) UI.feedback('heal', got);
  return got;
}
function changeLight(d) {
  const before = RUN.light; RUN.light = clamp(RUN.light + d, 0, 5);
  const got = RUN.light - before;
  if (got) UI.feedback(got > 0 ? 'lightUp' : 'lightDown', Math.abs(got));
  return got;
}
// Lascas: toda moeda que entra ou sai passa por aqui (som e moedinhas voando).
function gainLascas(n, from) { RUN.lascas += n; UI.feedback('coinIn', n, from); }
function spendLascas(n, to) { if (RUN.lascas < n) return false; RUN.lascas -= n; UI.feedback('coinOut', n, to); return true; }

// Podridão do bosque: quatro estágios. Cada estágio deixa os Corrompidos mais fortes.
const ROT_TIERS = [
  { name: 'Calmo',    fx: 'Os Corrompidos estão no normal.' },
  { name: 'Inquieto', fx: 'Corrompidos com +15% de vida e +1 de dano.' },
  { name: 'Doente',   fx: 'Corrompidos com +30% de vida e +2 de dano.' },
  { name: 'Podre',    fx: 'Corrompidos com +45% de vida e +3 de dano.' }
];
function changeRot(d) {
  const before = rotTier(RUN.rot);
  RUN.rot = clamp(RUN.rot + d, 0, 100);
  const after = rotTier(RUN.rot);
  if (d < 0 && RUN.rot >= 0) UI.feedback('purify', -d);
  if (after > before) RUN.rotWarn = after;
  updateAtmosphere();
}
function addMask(id) {
  if (RUN.masks.includes(id) || RUN.masks.length >= MASK_LIMIT) return false;
  RUN.masks.push(id); changeLight(-1); AUDIO.sfx('mask'); VHS.disturb(1.2, 900);
  RUN.hp = Math.min(RUN.hp, maxHpNow());
  return true;
}
function dropMask(id) { RUN.masks = RUN.masks.filter(m => m !== id); RUN.hp = Math.min(RUN.hp, maxHpNow()); }

// Atmosfera: a Podridão deixa a imagem e a fita mais gastas.
function updateAtmosphere() {
  const r = RUN ? RUN.rot / 100 : 0;
  SCENE.setRot(r * .85);
  VHS.setDecay(r * .8 + (RUN ? (RUN.fled || 0) * .12 : 0));
  AUDIO.setWarp(r);
  AUDIO.setHiss(SETTINGS.vhs * (.12 + r * .5));
  AUDIO.setEcho(memCount());
}

// ---------- mapa ----------
function generateMap(act) {
  const R = runRng();
  const rows = [];
  if (act === 4) {
    rows.push([{ type: 'camp' }]);
    rows.push([{ type: 'boss', enemy: 'vaelgrath' }]);
  } else {
    const pool = ENEMY_POOLS[act];
    for (let r = 0; r < 6; r++) {
      const n = r === 0 ? 3 : 2 + R.int(3);
      const row = [];
      for (let k = 0; k < n; k++) {
        let type;
        if (r === 0) type = 'combat';
        else if (r === 5) type = 'camp';
        else type = R.weighted([['combat', 40], ['event', 15], ['elite', r >= 2 ? 11 : 0], ['camp', r >= 2 ? 7 : 0], ['ysolde', 8], ['tobias', 8], ['perpetua', 7], ['marga', act > 1 ? 6 : 3]]);
        row.push({ type });
      }
      rows.push(row);
    }
    rows.push([{ type: 'boss' }]);
    // Garante um de cada serviço por ato.
    for (const svc of act > 1 ? ['ysolde', 'tobias', 'perpetua', 'marga'] : ['ysolde', 'tobias', 'perpetua']) {
      if (!rows.flat().some(n => n.type === svc)) {
        const r = 1 + R.int(4), cand = rows[r].filter(x => x.type === 'combat');
        R.pick(cand.length ? cand : rows[r]).type = svc;
      }
    }
    // Lembrança: um objeto do ato que Bram ainda não recuperou.
    const missing = MEMORIES.filter(m => m.act === act && !m.gift && !m.boss && !META.memories.includes(m.id) && !RUN.carried.includes(m.id));
    if (missing.length) {
      const r = 1 + R.int(4), cand = rows[r].filter(n => n.type !== 'elite');
      const n = R.pick(cand.length ? cand : rows[r]);
      n.type = 'memory'; n.memory = R.pick(missing).id;
    }
    // Inimigos sorteados para cada combate.
    for (const row of rows) for (const n of row) {
      if (n.type === 'combat') n.enemy = R.pick(pool.normal);
      if (n.type === 'elite') n.enemy = act === 3 ? (RUN.act2Boss === 'viuva' ? 'pregador' : 'viuva') : R.pick(pool.elite);
      if (n.type === 'boss') n.enemy = act === 2 ? RUN.act2Boss : R.pick(pool.boss);
      if (n.type === 'event') n.event = R.pick(Object.keys(EVENTS));
    }
  }
  // Posições e conexões.
  const nodes = [];
  rows.forEach((row, r) => {
    const n = row.length;
    row.forEach((node, k) => {
      node.id = `${act}-${r}-${k}`; node.row = r; node.act = act; node.next = []; node.done = false;
      const jitter = n > 1 ? (R.next() - .5) * .08 : 0;
      node.x = n === 1 ? .5 : .14 + (.72 * k) / (n - 1) + jitter;
      node.y = r;
      nodes.push(node);
    });
  });
  for (let r = 0; r < rows.length - 1; r++) {
    const a = rows[r], b = rows[r + 1];
    for (const n of a) {
      const sorted = b.slice().sort((p, q) => Math.abs(p.x - n.x) - Math.abs(q.x - n.x));
      n.next.push(sorted[0].id);
      if (sorted[1] && Math.abs(sorted[1].x - n.x) < .3 && R.chance(.45)) n.next.push(sorted[1].id);
    }
    for (const m of b) if (!a.some(n => n.next.includes(m.id))) {
      const closest = a.slice().sort((p, q) => Math.abs(p.x - m.x) - Math.abs(q.x - m.x))[0];
      closest.next.push(m.id);
    }
  }
  return { act, rows: rows.length, nodes };
}
function nodeById(id) { return RUN.map.nodes.find(n => n.id === id); }
function reachable() {
  if (!RUN.pos) return RUN.map.nodes.filter(n => n.row === 0);
  const cur = nodeById(RUN.pos);
  return cur && cur.done ? cur.next.map(nodeById) : [];
}

// O quanto do mapa Bram consegue ver (Máscara do Esquecido esconde; o mapa da Ysolde revela).
function nodeVisible(n) {
  const curRow = RUN.pos ? nodeById(RUN.pos).row : -1;
  if (hides(RUN.masks, 'map')) return n.row <= curRow + 1 || n.type === 'boss';
  if (RUN.revealed) return true;
  return n.row <= curRow + 3 || n.type === 'boss';
}

function rotPerNode() { return Math.max(1, 2 + RUN.masks.length * MASK_ROT + (hasMask(RUN.masks, 'bufao') ? MASK_ROT : 0) - (hasRelic(RUN.relics, 'musgo') ? 1 : 0)); }

function completeNode() {
  const n = nodeById(RUN.pos);
  if (n) n.done = true;
  changeRot(rotPerNode());
  saveRun();
}

function advanceAct() {
  RUN.act++;
  RUN.pos = null;
  RUN.revealed = hasRelic(RUN.relics, 'bussola');
  RUN.trails = 0;
  RUN.map = generateMap(RUN.act);
  healRun(Math.ceil((maxHpNow() - RUN.hp) * .5));
  saveRun();
}

// ---------- salvar ----------
function saveRun() { if (RUN && !RUN.dev) store.set(KEYS.run, RUN); }
function loadRun() { const r = store.get(KEYS.run, null); if (r && r.map && r.deck) { RUN = Object.assign({ relics: [], asc: 0, trails: 0, met: {} }, r); return true; } return false; }
function clearRun() { if (!(RUN && RUN.dev)) store.del(KEYS.run); RUN = null; }
const hasSavedRun = () => !!store.get(KEYS.run, null);

// Desbloqueia uma memória para sempre.
function unlockMemory(id) {
  if (!META.memories.includes(id) && !(RUN && RUN.dev)) { META.memories.push(id); saveMeta(); }
  if (RUN && !RUN.carried.includes(id)) RUN.carried.push(id);
  AUDIO.setEcho(memCount());
}
