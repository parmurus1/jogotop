'use strict';
// Modo desenvolvedor (ligado nas Opções): ver todas as cenas, memórias, falas e lutas.
// Tudo aqui roda numa jornada de teste (RUN.dev), que nunca é salva e não conta ciclos, quedas ou finais.

const DEV = { god: true };

function devRun(act = 1) {
  if (!RUN || !RUN.dev) newRun({ dev: true });
  if (RUN.act !== act || !RUN.map) { RUN.act = act; RUN.map = generateMap(act); RUN.pos = null; }
  if (DEV.god) { RUN.maxHp = 999; RUN.hp = 999; }
  RUN.lascas = Math.max(RUN.lascas, 300);
  updateAtmosphere();
  return RUN;
}

SCREENS.dev = function (tab = 'cenas') {
  setScene('desk', 'title', 'title');
  const back = () => SCREENS.dev(tab);
  const tabs = { cenas: 'Cenas', memorias: 'Memórias', inimigos: 'Inimigos', falas: 'Falas', lugares: 'Lugares', ferramentas: 'Ferramentas' };
  const btn = (act, label, attrs = '') => `<button class="btn small" data-act="${act}" ${attrs}>${label}</button>`;
  const group = (title, inner) => `<div class="dev-group"><h3>${title}</h3><div class="row wrap">${inner}</div></div>`;
  let body = '';
  if (tab === 'cenas') {
    body = group('Abertura', btn('opening', 'A primeira noite (cena de abertura)') + INTRO.map((_, i) => btn('intro', `Volta ao bosque ${i + 1}`, `data-i="${i}"`)).join(''))
      + group('Passagem de ato', [2, 3, 4].map(a => btn('interlude', `Ato ${ROMAN[a]} · ${ACT_INFO[a].name}`, `data-a="${a}"`)).join(''))
      + group('Vaelgrath', btn('phase2', 'Fase 2: a Podridão') + [0, 4, 8].map(m => btn('seal', `O Selo com ${m} memórias`, `data-m="${m}"`)).join(''))
      + group('Finais', Object.entries(ENDINGS).map(([k, e]) => btn('ending', e.title, `data-k="${k}"`)).join(''))
      + group('Outras', btn('letter', 'A carta do Gaspar') + btn('death', 'Tela de queda') + btn('battletut', 'Tutorial do 1º combate') + btn('maptips', 'Dicas do mapa (pós-combate)') + btn('credits', 'Créditos'));
  } else if (tab === 'memorias') {
    body = `<div class="jgrid">${MEMORIES.map((m, i) => `<div class="jitem">${SPR.img(m.obj, 4)}<b>${i + 1}. ${esc(m.name)}</b><span class="dim">${META.memories.includes(m.id) ? 'recuperada' : 'não recuperada'}</span>
      ${btn('film', 'Ver fita', `data-id="${m.id}"`)}${btn('memfind', 'Achado + escolha', `data-id="${m.id}"`)}</div>`).join('')}</div>`;
  } else if (tab === 'inimigos') {
    body = `<div class="jgrid">${Object.entries(ENEMIES).map(([id, e]) => `<div class="jitem">${SPR.img(e.art, e.boss ? 2 : 4, { corrupt: !!e.corrupt })}<b>${esc(e.name)}</b>
      <span class="dim">Ato ${e.act}${e.boss ? ' · chefe' : e.elite ? ' · forte' : ''}${e.grief ? ' · ' + e.grief : ''}</span>
      ${btn('intro_e', 'Apresentação', `data-id="${id}"`)}${btn('fight', 'Lutar', `data-id="${id}"`)}</div>`).join('')}</div>`;
  } else if (tab === 'falas') {
    body = Object.entries(NPCS).filter(([, n]) => n.talk).map(([id, n]) => group(`${n.name}`,
      n.talk.map((variants, tier) => variants.map((_, v) => btn('talk', `Nível ${tier}${variants.length > 1 ? '.' + (v + 1) : ''}`, `data-id="${id}" data-t="${tier}" data-v="${v}"`)).join('')).join('')
      + Object.keys(n.carry).map(m => btn('carry', `Carregando: ${MEMORY_BY_ID[m].name}`, `data-id="${id}" data-m="${m}"`)).join(''))).join('')
      + group('Pip e Gaspar (no caminho)', Object.entries(TRAILS).filter(([, t]) => t.npc).map(([k, t]) => btn('trailtalk', `${NPCS[t.npc].name} · ato ${t.acts.join('/')}`, `data-k="${k}"`)).join(''))
      + `<p class="dim">Nível = quantas memórias Bram tem (0: nenhuma · 1: 1–2 · 2: 3–5 · 3: 6–7 · 4: todas). "Carregando" é a reação quando Bram traz aquele objeto.</p>`;
  } else if (tab === 'lugares') {
    body = group('Lugares (numa jornada de teste)', btn('place', 'Madame Ysolde', 'data-p="ysolde"') + btn('place', 'Tobias', 'data-p="tobias"') + btn('place', 'Irmã Perpétua', 'data-p="perpetua"') + btn('place', 'Dona Marga', 'data-p="marga"') + btn('place', 'Fogueira', 'data-p="camp"'))
      + group('No caminho (encontros entre lugares)', Object.entries(TRAILS).map(([k, t]) => btn('trail', t.title + (t.npc ? ` (ato ${t.acts[0]})` : ''), `data-k="${k}"`)).join(''))
      + group('Arenas de combate', Object.entries(ARENAS).flatMap(([a, list]) => list.map(ar => btn('arena', `${ar} (ato ${a})`, `data-a="${a}" data-ar="${ar}"`))).join(''))
      + group('Estranhezas', Object.entries(EVENTS).map(([k, e]) => btn('event', e.title, `data-k="${k}"`)).join(''))
      + group('Recompensas', btn('reward', 'Combate comum', 'data-t="combat" data-e="rato"') + btn('reward', 'Corrompido forte', 'data-t="elite" data-e="javali"') + btn('reward', 'Chefe', 'data-t="boss" data-e="cervo"'))
      + group('Mapa', [1, 2, 3, 4].map(a => btn('map', `Mapa do Ato ${ROMAN[a]}`, `data-a="${a}"`)).join(''));
  } else {
    const mem = memCount();
    body = group(`Simular memórias (agora: ${mem}${MEM_OVERRIDE != null ? ', simulado' : ''})`, [0, 1, 3, 4, 6, 8].map(n => btn('simmem', String(n), `data-n="${n}"`)).join('') + btn('simmem', 'Usar as reais', 'data-n="real"'))
      + group('Jornada de teste', btn('god', `Modo deus: ${DEV.god ? 'ligado' : 'desligado'}`) + btn('allcards', 'Todas as cartas no baralho') + btn('allmasks', 'Todas as máscaras') + btn('allrelics', 'Todas as relíquias') + btn('asc', `Ciclo+ ${RUN && RUN.dev ? RUN.asc || 0 : 0}`) + btn('light', 'Lampião 0–5', '') + btn('rot', 'Podridão +30%'))
      + group('Lampião', ['happy', 'worried', 'scared', 'sleep'].map(m => btn('lampy', m, `data-m="${m}"`)).join('') + btn('lampemote', 'Sinal "!"'))
      + group('Galerias', btn('cards', 'Todas as cartas') + btn('sprites', 'Todos os sprites'))
      + group('Progresso real (permanente)', btn('unlockall', 'Recuperar todas as memórias') + btn('forgetall', 'Esquecer todas as memórias') + btn('bestiary', 'Revelar todo o diário'))
      + `<p class="dim">As jornadas de teste não são salvas e não contam no progresso. Só os botões de "Progresso real" mudam o seu jogo de verdade.</p>`;
  }
  UI.show('dev', `<section class="screen place"><div class="panel place-card scroll" style="width:min(1000px,100%)">
    <header class="row" style="justify-content:space-between"><div><div class="kicker">Modo desenvolvedor</div><h2>Bastidores</h2></div><button class="btn small" data-act="exit">Voltar ao menu</button></header>
    <div class="tabs">${Object.entries(tabs).map(([k, v]) => `<button class="${k === tab ? 'on' : ''}" data-act="tab" data-k="${k}">${v}</button>`).join('')}</div>
    ${body}</div></section>`, {
    exit: () => { MEM_OVERRIDE = null; RUN = null; SCREENS.title(); },
    tab: el => SCREENS.dev(el.dataset.k),
    // cenas
    intro: el => { setScene('title', 'title', 'title'); cinematic(INTRO[+el.dataset.i], back); },
    interlude: el => { const a = +el.dataset.a; setScene(ACT_INFO[a].scene, a === 4 ? 'dragon' : 'forest', ACT_INFO[a].amb); cinematic([`Ato ${ROMAN[a]} · ${ACT_INFO[a].name}`, ...ACT_LINES[a]], back); },
    phase2: () => { setScene('lair', 'dragon', 'lair'); AUDIO.sfx('roar'); VHS.disturb(2.5, 1600); cinematic(PHASE_TWO_LINES, back); },
    seal: el => SCREENS.seal({ preview: true, mem: +el.dataset.m }),
    ending: el => SCREENS.ending(el.dataset.k, { preview: true }),
    death: () => { devRun(1); SCREENS.death({ preview: true }); },
    battletut: () => { devRun(1); RUN.pos = 'dev'; BATTLE.start({ id: 'dev', type: 'combat', enemy: 'rato' }, { tutorial: true }); },
    credits: () => SCREENS.credits(),
    opening: () => SCREENS.opening(back),
    letter: () => { devRun(4); letterScene(back); },
    maptips: () => { devRun(1); RUN.stats.fights = 1; META.knowledge.mapTut = false; SCREENS.map(); },
    // memórias
    film: el => SCREENS.memoryScene(el.dataset.id, { replay: true, after: back }),
    memfind: el => { devRun(MEMORY_BY_ID[el.dataset.id].act); RUN.pos = null; SCREENS.memoryFind({ memory: el.dataset.id }); },
    // inimigos
    intro_e: el => { const def = ENEMIES[el.dataset.id]; SCENE.set(def.final ? 'lair' : ACT_INFO[Math.min(3, def.act)].scene); AUDIO.music(def.boss ? (def.final ? 'dragon' : 'boss') : 'battle'); BATTLE.preview(el.dataset.id, back); },
    fight: el => {
      const id = el.dataset.id, def = ENEMIES[id];
      devRun(def.act);
      RUN.pos = 'dev';
      BATTLE.start({ id: 'dev', type: def.boss ? 'boss' : def.elite ? 'elite' : 'combat', enemy: id });
    },
    // falas
    talk: el => devTalk(el.dataset.id, NPCS[el.dataset.id].talk[+el.dataset.t][+el.dataset.v], back),
    carry: el => devTalk(el.dataset.id, NPCS[el.dataset.id].carry[el.dataset.m], back),
    trailtalk: el => { const t = TRAILS[el.dataset.k]; devRun(t.acts[0]); devTalk(t.npc, t.talk(), back); },
    // lugares
    place: el => { devRun(RUN && RUN.dev ? RUN.act : 2); SCREENS[el.dataset.p]({}); },
    event: el => { devRun(RUN && RUN.dev ? RUN.act : 1); SCREENS.event({ event: el.dataset.k }); },
    trail: el => { const t = TRAILS[el.dataset.k]; devRun(t.acts[0]); RUN.met = {}; SCREENS.map(); setTimeout(() => trailEvent(el.dataset.k).then(back), 400); },
    arena: el => { const a = +el.dataset.a; devRun(Math.min(3, a)); RUN.pos = 'dev'; BATTLE.start({ id: 'dev', type: 'combat', enemy: ENEMY_POOLS[Math.min(3, a)].normal[0] }, { arena: el.dataset.ar }); },
    reward: el => { devRun(1); RUN.pos = null; SCREENS.reward({ type: el.dataset.t, enemy: el.dataset.e, id: 'dev' }, null); },
    map: el => { devRun(+el.dataset.a); RUN.act = +el.dataset.a; RUN.map = generateMap(RUN.act); RUN.pos = null; SCREENS.map(); },
    // ferramentas
    simmem: el => { MEM_OVERRIDE = el.dataset.n === 'real' ? null : +el.dataset.n; AUDIO.setEcho(memCount()); back(); },
    god: () => { DEV.god = !DEV.god; if (RUN && RUN.dev) { RUN.maxHp = DEV.god ? 999 : BRAM_HP; RUN.hp = RUN.maxHp; } back(); },
    allcards: () => { devRun(RUN && RUN.dev ? RUN.act : 1); for (const id of REWARD_POOL) if (!RUN.deck.some(c => c.id === id)) addCard(id); toast(`O baralho de teste tem ${RUN.deck.length} cartas.`); },
    allmasks: () => { devRun(RUN && RUN.dev ? RUN.act : 1); RUN.masks = Object.keys(MASKS); toast('Todas as máscaras na jornada de teste (acima do limite normal).'); },
    allrelics: () => { devRun(RUN && RUN.dev ? RUN.act : 1); RUN.relics = Object.keys(RELICS); toast('Todas as relíquias na jornada de teste.'); },
    asc: () => { devRun(RUN && RUN.dev ? RUN.act : 1); RUN.asc = ((RUN.asc || 0) + 1) % (ASC_MAX + 1); back(); },
    lampy: el => LAMP.feel(el.dataset.m, 2500),
    lampemote: () => LAMP.react('found'),
    light: () => { devRun(RUN && RUN.dev ? RUN.act : 1); RUN.light = (RUN.light + 1) % 6; toast(`Lampião: ${RUN.light}/5`); },
    rot: () => { devRun(RUN && RUN.dev ? RUN.act : 1); RUN.rot = (RUN.rot + 30) % 120; updateAtmosphere(); toast(`Podridão: ${RUN.rot}%`); },
    cards: () => devGallery('Todas as cartas', Object.keys(CARDS).map(id => UI.card({ id, uid: 'g' + id }, { cls: 'mini', attrs: 'data-m="info"' })).join('')),
    sprites: () => devGallery('Todos os sprites', Object.keys(ART).map(k => `<div class="jitem" style="min-width:0">${SPR.img(k, SPR.size(k).w > 30 ? 2 : 3)}<span class="dim" style="font-size:14px">${k}</span></div>`).join('')),
    unlockall: el => devConfirm(el, () => { META.memories = MEMORIES.map(m => m.id); saveMeta(); toast('Todas as memórias recuperadas.'); back(); }),
    forgetall: el => devConfirm(el, () => { META.memories = []; saveMeta(); toast('Bram esqueceu tudo de novo.'); back(); }),
    bestiary: el => devConfirm(el, () => { for (const id of Object.keys(ENEMIES)) META.bestiary[id] = META.bestiary[id] || { seen: 1, defeated: 0 }; saveMeta(); toast('Diário revelado.'); })
  });
};

// Ações permanentes pedem um segundo clique.
function devConfirm(el, fn) {
  if (el.dataset.sure) { fn(); return; }
  el.dataset.sure = 1; el.textContent = 'Clique de novo para confirmar';
}

function devTalk(id, lines, back) {
  const npc = NPCS[id];
  setScene({ perpetua: 'chapel', ysolde: 'tent', tobias: 'forge', marga: 'burrow' }[id] || 'forest', id === 'perpetua' ? 'chapel' : 'village', 'forest', { arena: true });
  UI.show('devtalk', stage({ fig: npc.art, title: npc.name, kicker: npc.title }), {});
  UI.dialogue({ name: npc.name, portrait: npc.portrait, voice: id }, lines).then(back);
}

function devGallery(title, inner) {
  UI.modal(`<header><h2>${esc(title)}</h2><button class="btn small" data-m="close">Fechar</button></header><div class="body"><div class="deck-grid">${inner}</div></div>`,
    { on: { close: (el, close) => close(), info: el => { const r = el.getBoundingClientRect(); toast(UI.cardTip({ id: el.dataset.id }).replace(/<br>/g, ' · '), 4000); } } });
}
