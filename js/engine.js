'use strict';
// Motor de combate sem DOM. Recebe o estado da batalha e a Fila (cartas na ordem, da esquerda para a direita)
// e devolve a lista de eventos + o novo estado. A prévia e a animação usam exatamente esta mesma função.

const BAG_MAX = 6;          // capacidade do Saco de Almas
const SOULS_PER_ROUND = 3;  // almas que entram no Saco a cada rodada (o Rito da capela aumenta)
const HAND_SIZE = 6;        // a mão é completada até este tamanho a cada rodada
const SLOTS = 5;            // espaços da Fila
const BRAM_HP = 32;
// Ajuste global de dificuldade (calibrado com simulações de bots).
const ENEMY_HP_SCALE = 1.4, ENEMY_DMG_SCALE = 1.2;

const rotTier = rot => rot >= 90 ? 3 : rot >= 60 ? 2 : rot >= 30 ? 1 : 0;
const freshStatus = () => ({ marca: 0, fraqueza: 0, exposto: 0, brasa: 0, atordoado: 0 });
const clone = o => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

// asc: nível de Ciclo+ da jornada (ver ASCENSION em relics.js).
function makeEnemy(id, { rot = 0, phase = 0, scale = 1, asc = 0 } = {}) {
  const def = ENEMIES[id];
  const tier = rotTier(rot);
  const base = (def.phases ? def.phases[phase].hp : def.hp) * scale;
  const ascHp = (asc >= 1 ? 1.1 : 1) * (asc >= 6 && (def.boss || def.elite) ? 1.15 : 1);
  const hp = Math.round(base * ENEMY_HP_SCALE * (1 + tier * .15) * ascHp);
  return { id, hp, maxHp: hp, armor: def.startArmor || 0, st: freshStatus(), turn: 0, phase, fury: 0, dmgAdd: tier, ascAdd: asc >= 4 ? 1 : 0, intent: null };
}

function makeBattle({ enemyId, hp, maxHp, masks = [], relics = [], memories = 0, light = 2, rot = 0, scale = 1, phase = 0, perRound = SOULS_PER_ROUND, bagMax = BAG_MAX, asc = 0 }) {
  const B = {
    enemy: makeEnemy(enemyId, { rot, phase, scale, asc }),
    bram: { hp, maxHp, guard: 0, keepGuard: 0, thorns: 0, st: { exposto: 0, bolor: 0, culpa: 0, esquecimento: 0 } },
    souls: 0, bagMax, perRound, round: 0, masks: masks.slice(), relics: relics.slice(), memories, light, rot, asc,
    flags: {}, extraDraw: 0, rotGain: 0, lightLoss: 0, lockFirst: false
  };
  if (hasRelic(relics, 'chocalho')) B.enemy.st.fraqueza = 3;
  if (hasRelic(relics, 'apito')) B.enemy.st.marca = 1;
  return B;
}

function enemyPattern(E) { const def = ENEMIES[E.id]; return def.phases ? def.phases[E.phase].pattern : def.pattern; }

function computeIntent(B, offset = 0) {
  const E = B.enemy, def = ENEMIES[E.id], pat = enemyPattern(E);
  let it = { ...pat[(E.turn + offset) % pat.length] };
  if (def.final && E.phase === 0 && offset === 0 && B.flags.apagadaLast) it = { observe: true, armor: 6, label: 'Observa a carta apagada' };
  if (it.breakMask && !B.masks.length) delete it.breakMask;
  if (it.dmg) it.dmg = Math.round(it.dmg * ENEMY_DMG_SCALE) + E.dmgAdd + (E.ascAdd || 0) + E.fury + (def.fury ? def.fury * offset : 0);
  if (it.sermon) it.text = SERMONS[((E.turn + offset) >> 1) % SERMONS.length];
  it.kind = it.dmg ? ((it.heavy || it.dmg * (it.hits || 1) >= 12) ? 'heavy' : 'atk')
    : it.offer ? 'offer' : it.observe ? 'observe' : it.apply ? 'debuff' : (it.armor || it.heal) ? 'block' : 'buff';
  return it;
}

// Começo de rodada: almas entram no Saco e o inimigo anuncia a intenção.
function beginRound(B) {
  B.round++;
  const P = B.bram;
  let gain = B.round === 1
    ? 3 + (hasMask(B.masks, 'viuva') ? 3 : 0) + (B.light >= 5 ? 1 : 0) + (hasRelic(B.relics, 'sino') ? 1 : 0)
    : (B.perRound || SOULS_PER_ROUND) + (hasMask(B.masks, 'semolhos') ? 1 : 0);
  if (B.round === 1) {
    if (hasRelic(B.relics, 'seixo')) P.guard += 6;
    if (hasRelic(B.relics, 'pena')) B.extraDraw += 1;
  }
  gain -= P.st.esquecimento;
  P.st.esquecimento = 0;
  B.souls = clamp(B.souls + gain, 0, B.bagMax);
  B.enemy.intent = computeIntent(B);
  B.lockFirst = B.enemy.id === 'maelontra' && B.round <= 2 && B.light < 4;
  return gain;
}

function detectCombos(eff, i, n) {
  const out = [], s = eff[i];
  if (i >= 1 && s === eff[i - 1]) out.push(i >= 2 && eff[i - 2] === s ? 'ressonancia' : 'eco');
  const follows = (a, b) => { const k = CYCLE.indexOf(a); return k >= 0 && CYCLE[(k + 1) % 4] === b; };
  if (i >= 1 && follows(eff[i - 1], s)) out.push(PAIR_COMBO[eff[i - 1]]);
  if (i >= 3 && follows(eff[i - 3], eff[i - 2]) && follows(eff[i - 2], eff[i - 1]) && follows(eff[i - 1], s)) out.push('roda');
  if (i === SLOTS - 1 && n === SLOTS) out.push('selo');
  return out;
}

// Naipe efetivo de cada carta (Memória copia o naipe da carta anterior).
function effectiveSuits(ids) {
  const eff = [];
  ids.forEach((id, i) => { const s = CARDS[id].suit; eff.push(s === 'memoria' && i > 0 ? eff[i - 1] : s); });
  return eff;
}

function resolveRound(B0, fila) {
  const B = clone(B0), E = B.enemy, P = B.bram, ev = [];
  const masks = B.masks;
  let impeto = hasMask(masks, 'esquecido') ? 1 : 0, twice = false, ember = null, played = 0, nextBonus = 0;
  const suits = fila.map(f => CARDS[f.id].suit);
  B.flags.apagada = false;
  const eff = [];
  const snap = () => ({ ehp: E.hp, emax: E.maxHp, earmor: E.armor, est: { ...E.st }, bhp: P.hp, bmax: P.maxHp, bguard: P.guard, bst: { ...P.st }, souls: B.souls, impeto });
  const push = e => { e.v = snap(); ev.push(e); return e; };

  function emberCheck() {
    if (P.hp <= 0 && ember && !B.flags.emberUsed) { P.hp = 1; B.flags.emberUsed = true; B.emberSpent = ember; push({ t: 'ember' }); }
  }
  function hurtSelf(n, src) { if (n <= 0 || P.hp <= 0) return; P.hp = Math.max(0, P.hp - n); push({ t: 'self', amount: n, src }); emberCheck(); }
  function dealToEnemy(amount, o, i) {
    if (E.hp <= 0 || amount <= 0) return 0;
    const ab = o.pierce ? 0 : Math.min(E.armor, amount);
    E.armor -= ab;
    const loss = Math.min(E.hp, amount - ab);
    E.hp -= loss;
    push({ t: 'hit', i, amount: loss, absorbed: ab, raw: amount, parts: o.parts || [], pierce: !!o.pierce, kill: E.hp <= 0 });
    return loss;
  }
  function applyEnemy(k, x, i) {
    if (E.hp <= 0) return;
    if (k === 'atordoado' && ENEMIES[E.id].stunResist) { E.st.fraqueza += 3; push({ t: 'resist', i }); return; }
    if (k === 'brasa' && hasMask(masks, 'cinzam')) x += 2;
    if (k === 'brasa' && hasRelic(B.relics, 'fosforo')) x += 1;
    if (k === 'marca' || k === 'exposto' || k === 'atordoado') E.st[k] = 1; else E.st[k] += x;
    push({ t: 'status', i, key: k, amount: x });
  }

  function mkCtx(card, def, i, bonus, mult, pierce) {
    const c = {
      up: !!card.up, pos: i, count: fila.length, first: i === 0, last: i === fila.length - 1,
      prev: i > 0 ? CARDS[fila[i - 1].id] : null, next: i < fila.length - 1 ? CARDS[fila[i + 1].id] : null,
      prevSuit: i > 0 ? eff[i - 1] : null, suits,
      bram: { hp: P.hp, maxHp: P.maxHp }, memories: B.memories,
      n: x => (x + bonus) * mult,
      hit(x, o = {}) {
        for (let k = 0; k < (o.times || 1); k++) {
          if (E.hp <= 0) break;
          let dmg = o.raw ? x : c.n(x);
          const parts = [];
          if (impeto) { dmg += impeto; parts.push(['Ímpeto', impeto]); }
          if (E.st.exposto) { dmg += 2; parts.push(['Exposto', 2]); }
          if (def.suit === 'presa' && E.st.marca) { E.st.marca = 0; dmg += 3; parts.push(['Marca', 3]); }
          if (def.suit === 'presa' && hasMask(masks, 'sorriso')) { dmg += 2; parts.push(['Sorriso', 2]); }
          dealToEnemy(dmg, { pierce: pierce || o.pierce, parts }, i);
        }
      },
      block(x, o = {}) {
        let g = o.raw ? x : c.n(x);
        if (def.suit === 'casca' && hasMask(masks, 'ferro')) g += 3;
        if (def.suit === 'casca' && hasRelic(B.relics, 'dedal') && !o.raw) g += 1;
        P.guard += g; push({ t: 'guard', i, amount: g });
      },
      heal(x) { const h = Math.min(P.maxHp - P.hp, x); if (h > 0) { P.hp += h; push({ t: 'heal', i, amount: h }); } },
      apply(k, x = 1) { applyEnemy(k, x, i); },
      self(k, x = 1) { P.st[k] = k === 'exposto' ? 1 : P.st[k] + x; push({ t: 'bstatus', i, key: k, amount: x }); },
      impeto(x) { impeto += x; push({ t: 'impeto', i, amount: x }); },
      soul(x) { const before = B.souls; B.souls = Math.min(B.bagMax, B.souls + x); push({ t: 'soul', i, amount: B.souls - before }); },
      draw(x) { B.extraDraw += x; push({ t: 'draw', i, amount: x }); },
      keepGuard() { P.keepGuard = 1; push({ t: 'note', i, text: 'A Guarda vai durar mais uma rodada.' }); },
      thorns(x) { P.thorns += x; push({ t: 'bstatus', i, key: 'espinhos', amount: x }); },
      twice() { twice = true; push({ t: 'note', i, text: 'A próxima carta vai ativar duas vezes.' }); },
      echo(extra) {
        if (i === 0) { push({ t: 'note', i, text: 'Não há nada antes para repetir.' }); return; }
        const pc = fila[i - 1], pdef = CARDS[pc.id];
        if (pc.id === 'lontra') { push({ t: 'note', i, text: 'Uma lontra não imita outra.' }); return; }
        push({ t: 'echo', i, of: pc.id });
        pdef.play(mkCtx(pc, pdef, i, extra, 1, false));
      },
      ember() { ember = card.uid; push({ t: 'note', i, text: 'A brasa fica acesa: Bram não cai nesta rodada.' }); },
      stripArmor(x) { const a = Math.min(E.armor, x); E.armor -= a; if (a) push({ t: 'strip', i, amount: a }); return a; },
      consume(k) { if (E.st[k] > 0) { E.st[k] = 0; push({ t: 'consume', i, key: k }); return true; } return false; },
      has: k => E.st[k] > 0,
      stacks: k => E.st[k],
      flag(f) { B.flags[f] = true; },
      boostNext(x) { nextBonus += x; push({ t: 'note', i, text: `A próxima carta ganha +${x}.` }); },
      statusCount: () => ['marca', 'fraqueza', 'exposto', 'brasa'].filter(k => E.st[k] > 0).length,
      cleanse() { P.st.exposto = 0; P.st.bolor = 0; P.st.culpa = 0; push({ t: 'cleanse', i }); },
      forget() { B.rotGain += 6; B.lightLoss += 1; push({ t: 'forget', i }); }
    };
    return c;
  }

  // ----- a Fila, da esquerda para a direita -----
  let unplayed = [];
  for (let i = 0; i < fila.length; i++) {
    if (E.hp <= 0 || P.hp <= 0) { unplayed = fila.slice(i); break; }
    const card = fila[i], def = CARDS[card.id];
    const suit = def.suit === 'memoria' && i > 0 ? eff[i - 1] : def.suit;
    eff.push(suit);
    const combos = detectCombos(eff, i, fila.length);
    let bonus = 0, mult = 1, pierce = false;
    for (const cb of combos) {
      if (cb === 'eco') bonus += 2 + (hasRelic(B.relics, 'concha') ? 1 : 0);
      if (cb === 'ressonancia') bonus += 4 + (hasRelic(B.relics, 'concha') ? 1 : 0);
      if (cb === 'cerco') { bonus += 2; pierce = true; }
      if (cb === 'selo') mult = 2;
    }
    if (combos.length && hasMask(masks, 'bufao')) bonus += 2;
    bonus += nextBonus; nextBonus = 0;
    if (i === 0 && hasRelic(B.relics, 'dente')) bonus += 2;
    if (i === SLOTS - 1 && fila.length === SLOTS && hasRelic(B.relics, 'agulha')) bonus += 4;
    push({ t: 'card', i, uid: card.uid, id: card.id, suit, combos });
    for (const cb of combos) push({ t: 'combo', i, id: cb });
    if (P.st.culpa > 0) hurtSelf(P.st.culpa, 'culpa');
    if (def.suit === 'cinza' && hasMask(masks, 'cinzam')) hurtSelf(1, 'cinzam');
    let times = 1;
    if (twice) { times++; twice = false; }
    if (i === 0 && hasMask(masks, 'cervo')) times++;
    if (i === 0 && B.round === 1 && hasRelic(B.relics, 'espelho')) times++;
    for (let k = 0; k < times; k++) {
      if (E.hp <= 0) break;
      if (k > 0) push({ t: 'repeat', i });
      def.play(mkCtx(card, def, i, bonus, mult, pierce));
    }
    const ctx = mkCtx(card, def, i, 0, 1, false);
    for (const cb of combos) {
      if (cb === 'fagulha') applyEnemy('brasa', 2, i);
      if (cb === 'tempera') ctx.block(3, { raw: true });
      if (cb === 'emboscada') applyEnemy('fraqueza', 2, i);
      if (cb === 'roda') { const d = hasRelic(B.relics, 'piao') ? 12 : 6; ctx.soul(1); dealToEnemy(d, { pierce: true, parts: [['Roda', d]] }, i); }
      if (cb === 'ressonancia') {
        if (suit === 'presa') applyEnemy('exposto', 1, i);
        else if (suit === 'casca') ctx.soul(1);
        else if (suit === 'sombra') applyEnemy('fraqueza', 3, i);
        else if (suit === 'cinza') applyEnemy('brasa', 3, i);
        else ctx.heal(3);
      }
    }
    played++;
  }

  // A Culpa pesa durante a sua vez e alivia um pouco depois dela.
  if (P.st.culpa > 0) P.st.culpa--;

  // ----- fim da sua vez: a Brasa queima -----
  if (E.hp > 0 && E.st.brasa > 0) {
    const d = Math.min(E.hp, E.st.brasa);
    E.hp -= d; E.st.brasa--;
    push({ t: 'burn', amount: d, kill: E.hp <= 0 });
  }

  // ----- vez do inimigo -----
  if (E.hp > 0 && P.hp > 0) {
    const it = E.intent || computeIntent(B);
    const def = ENEMIES[E.id];
    push({ t: 'enemyTurn', label: it.label });
    if (E.st.atordoado > 0) {
      E.st.atordoado = 0;
      push({ t: 'stunned' });
    } else {
      E.armor = 0;
      if (it.cleanse) { E.st = freshStatus(); push({ t: 'ecleanse' }); }
      if (it.heal) { const hh = Math.min(E.maxHp - E.hp, it.heal); E.hp += hh; push({ t: 'eheal', amount: hh }); }
      if (it.armor) { E.armor += it.armor; push({ t: 'earmor', amount: it.armor }); }
      if (it.dmg) {
        for (let h = 0; h < (it.hits || 1); h++) {
          if (P.hp <= 0) break;
          let raw = it.dmg;
          const cut = Math.min(E.st.fraqueza, raw); E.st.fraqueza -= cut; raw -= cut;
          let bonus = 0;
          if (P.st.exposto && raw > 0) { bonus = 2; P.st.exposto = 0; raw += 2; }
          let scarf = 0;
          if (raw > 0 && hasRelic(B.relics, 'cachecol') && !B.flags.scarf) { B.flags.scarf = true; scarf = Math.min(5, raw); raw -= scarf; }
          const ab = Math.min(P.guard, raw); P.guard -= ab;
          const taken = raw - ab; P.hp = Math.max(0, P.hp - taken);
          push({ t: 'ehit', amount: taken, absorbed: ab, cut, bonus, scarf, heavy: !!it.heavy, h });
          emberCheck();
          if (P.thorns > 0 && E.hp > 0) { const d = Math.min(E.hp, P.thorns); E.hp -= d; push({ t: 'thorns', amount: d, kill: E.hp <= 0 }); }
        }
      }
      if (it.apply) for (const [k, v] of Object.entries(it.apply)) {
        P.st[k] = k === 'exposto' ? 1 : P.st[k] + v;
        push({ t: 'bstatus', key: k, amount: v, from: 'enemy' });
      }
      if (it.sermon) push({ t: 'sermon', text: it.text });
      if (it.offer) { B.offer = true; push({ t: 'offer' }); }
      if (it.observe) push({ t: 'observe' });
      if (it.breakMask && B.masks.length) { const m = B.masks.pop(); B.broken = (B.broken || []).concat(m); push({ t: 'maskBreak', id: m }); }
    }
    if (def.fury) { E.fury += def.fury; push({ t: 'fury', amount: def.fury }); }
  }

  // ----- fim da rodada -----
  if (P.hp > 0 && P.st.bolor > 0) { hurtSelf(P.st.bolor, 'bolor'); P.st.bolor--; }
  if (P.keepGuard > 0) P.keepGuard--; else P.guard = 0;
  P.thorns = 0;
  E.st.exposto = 0;
  E.turn++;
  B.flags.apagadaLast = B.flags.apagada;
  push({ t: 'end' });
  return { B, ev, played: fila.slice(0, played), unplayed, enemyDead: E.hp <= 0, bramDead: P.hp <= 0 };
}
