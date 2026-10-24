'use strict';
// Naipes, combos e cartas. Cada carta é uma alma selada; jogar uma carta custa almas do Saco (1, ou 2 nas mais fortes).
//
// face(u, mem) descreve a carta para a interface: { atk, hits, def, sig: [[sigilo, número?], ...] }
//   atk/def aparecem nos cantos de baixo; os sigilos são os símbolos no meio (ver SIGILS).
// Dentro de play(c):
//   c.n(x)           número principal já com bônus de combo (e dobrado no Selo Pleno)
//   c.up             carta melhorada pelo Tobias
//   c.hit(n, {times, pierce})  c.block(n)  c.heal(n)
//   c.apply('marca'|'fraqueza'|'exposto'|'brasa'|'atordoado', n)   efeito no inimigo
//   c.self('exposto', n)  c.impeto(n)  c.soul(n)  c.draw(n)  c.keepGuard()  c.thorns(n)
//   c.twice()  c.echo()  c.ember()  c.stripArmor(n)  c.consume(k)  c.has(k)  c.stacks(k)
//   c.boostNext(n)  c.statusCount()  c.suits (naipes de toda a Fila)
//   c.prev c.next c.pos c.count c.first c.last c.bram c.memories

const SUITS = {
  presa:   { name: 'Presa',   color: '#c8434a', icon: 'u_atk',     role: 'ataque' },
  casca:   { name: 'Casca',   color: '#4fa3a8', icon: 'u_guard',   role: 'defesa' },
  sombra:  { name: 'Sombra',  color: '#8f74c8', icon: 'u_marca',   role: 'enfraquecer' },
  cinza:   { name: 'Cinza',   color: '#e0763a', icon: 'u_brasa',   role: 'queimar' },
  memoria: { name: 'Memória', color: '#e3bd5a', icon: 'i_memory',  role: 'curinga' }
};
// A Roda: cada naipe alimenta o seguinte.
const CYCLE = ['sombra', 'presa', 'cinza', 'casca'];

// color e icon são usados na animação de cada combo.
const COMBOS = {
  eco:         { name: 'Eco',           tier: 1, color: '#e8e0c8', span: 2, fx: '+2', desc: 'Duas cartas seguidas do mesmo naipe: a segunda ganha +2.' },
  ressonancia: { name: 'Ressonância',   tier: 2, color: '#ffe08a', span: 3, fx: '+4', desc: 'Três do mesmo naipe em sequência: a terceira ganha +4 e um efeito do naipe (Presa: Expõe · Casca: +1 alma · Sombra: Fraqueza 3 · Cinza: Brasa 3).' },
  cerco:       { name: 'Cerco',         tier: 1, color: '#b89cff', span: 2, fx: '+2 · atravessa', desc: 'Sombra → Presa: o golpe atravessa a couraça e ganha +2.' },
  fagulha:     { name: 'Fagulha',       tier: 1, color: '#ff9a4a', span: 2, fx: 'Brasa +2', desc: 'Presa → Cinza: aplica Brasa 2 extra.' },
  tempera:     { name: 'Têmpera',       tier: 1, color: '#8fe0e0', span: 2, fx: 'Guarda +3', desc: 'Cinza → Casca: +3 de Guarda.' },
  emboscada:   { name: 'Emboscada',     tier: 1, color: '#9ad0b0', span: 2, fx: 'Fraqueza +2', desc: 'Casca → Sombra: aplica Fraqueza 2 extra.' },
  roda:        { name: 'Roda Completa', tier: 3, color: '#ffd23a', span: 4, fx: '+1 alma · 6 dano', desc: 'Quatro cartas seguindo a Roda (Sombra → Presa → Cinza → Casca, começando em qualquer ponto): +1 alma e 6 de dano que ignora couraça.' },
  selo:        { name: 'Selo Pleno',    tier: 3, color: '#7ad8ff', span: 5, fx: '×2', desc: 'Preencher os cinco espaços da Fila: o número principal da quinta carta é dobrado.' }
};
const PAIR_COMBO = { sombra: 'cerco', presa: 'fagulha', cinza: 'tempera', casca: 'emboscada' };

// Sigilos: os símbolos impressos nas cartas, para lembrar o efeito sem ler.
const SIGILS = {
  marca: 'Marca o inimigo', fraqueza: 'Fraqueza', exposto: 'Expõe', brasa: 'Brasa', atordoa: 'Atordoa', impeto: 'Ímpeto',
  alma: 'Devolve almas', compra: 'Compra cartas', dobro: 'Ativa duas vezes / dobra', ultimo: 'Mais forte no fim da Fila',
  primeiro: 'Mais forte abrindo a Fila', cadeia: 'Depende da carta anterior', espinhos: 'Espinhos', quebra: 'Quebra couraça',
  cura: 'Cura', limpa: 'Limpa efeitos ruins', repete: 'Repete a anterior', dura: 'A Guarda dura mais', perfura: 'Atravessa couraça',
  vidabaixa: 'Mais forte com pouca vida', maldito: 'Cobra memória', rouba: 'Rouba couraça', salva: 'Impede a morte', cresce: 'Cresce com as memórias',
  autoexp: 'Você fica Exposto', conta: 'Conta cartas ou efeitos', proxima: 'Fortalece a próxima carta'
};

// Orçamento de poder (para manter o equilíbrio):
//   1 alma ≈ 6 pontos · 1 dano = 1 · 1 Guarda = 1 · Marca ≈ 3 · Fraqueza n ≈ n · Brasa n ≈ n·(n+1)/2 ao longo das rodadas
//   base ≈ 5 · comum ≈ 6–7 (até 10 com a condição certa) · rara ≈ 8 (até 14 com a condição) · 2 almas ≈ 14 · melhorar ≈ +35%
const upv = (u, a, b) => u ? b : a; // valor normal ou melhorado
const CARDS = {
  // ---------- PRESA: dano direto ----------
  rato: { name: 'Rato de Casca', suit: 'presa', art: 'rat', rarity: 'base',
    text: u => `${upv(u, 3, 4)} de dano. Se abrir a Fila: Ímpeto ${upv(u, 1, 2)} (cada golpe seguinte causa +${upv(u, 1, 2)}).`,
    face: u => ({ atk: upv(u, 3, 4), sig: [['primeiro'], ['impeto', upv(u, 1, 2)]] }),
    play(c) { c.hit(upv(c.up, 3, 4)); if (c.first) c.impeto(upv(c.up, 1, 2)); } },
  lobo: { name: 'Lobo Cinzento', suit: 'presa', art: 'wolf', rarity: 'base',
    text: u => `${upv(u, 5, 7)} de dano.`,
    face: u => ({ atk: upv(u, 5, 7), sig: [] }),
    play(c) { c.hit(upv(c.up, 5, 7)); } },
  javali: { name: 'Javali de Presas', suit: 'presa', art: 'boar', rarity: 'comum',
    text: u => `${upv(u, 6, 8)} de dano. Se for a última carta da Fila: +${upv(u, 4, 5)}.`,
    face: u => ({ atk: upv(u, 6, 8), sig: [['ultimo', '+' + upv(u, 4, 5)]] }),
    play(c) { c.hit(upv(c.up, 6, 8) + (c.last && c.count > 1 ? upv(c.up, 4, 5) : 0)); } },
  doninha: { name: 'Doninha Ligeira', suit: 'presa', art: 'weasel', rarity: 'comum',
    text: u => `${upv(u, 3, 4)} de dano duas vezes. (Ímpeto, Exposto e combos valem para cada golpe.)`,
    face: u => ({ atk: upv(u, 3, 4), hits: 2, sig: [] }),
    play(c) { c.hit(upv(c.up, 3, 4), { times: 2 }); } },
  falcao: { name: 'Falcão Mergulhador', suit: 'presa', art: 'hawk', rarity: 'comum',
    text: u => `${upv(u, 5, 7)} de dano. Contra inimigo com Fraqueza: +${upv(u, 4, 5)}.`,
    face: u => ({ atk: upv(u, 5, 7), sig: [['fraqueza', '+' + upv(u, 4, 5)]] }),
    play(c) { c.hit(upv(c.up, 5, 7) + (c.has('fraqueza') ? upv(c.up, 4, 5) : 0)); } },
  esquilo: { name: 'Esquilo Ansioso', suit: 'presa', art: 'squirrel', rarity: 'comum',
    text: u => `${upv(u, 3, 4)} de dano para cada carta Presa na Fila (contando ela).`,
    face: u => ({ atk: `${upv(u, 3, 4)}×P`, sig: [['conta']] }),
    play(c) { c.hit(upv(c.up, 3, 4) * c.suits.filter(s => s === 'presa').length); } },
  cao: { name: 'Cão de Três Sombras', suit: 'presa', art: 'dog', rarity: 'rara',
    text: u => `${upv(u, 3, 4)} de dano. Se a carta anterior for Presa, morde três vezes.`,
    face: u => ({ atk: upv(u, 3, 4), sig: [['cadeia'], ['dobro', '×3']] }),
    play(c) { c.hit(upv(c.up, 3, 4), { times: c.prevSuit === 'presa' ? 3 : 1 }); } },
  cobra: { name: "Cobra-d'Água", suit: 'presa', art: 'snake', rarity: 'rara',
    text: u => `${upv(u, 7, 10)} de dano que atravessa couraça.`,
    face: u => ({ atk: upv(u, 7, 10), sig: [['perfura']] }),
    play(c) { c.hit(upv(c.up, 7, 10), { pierce: true }); } },
  dente: { name: 'Dente do Gigante', suit: 'presa', art: 'tooth', rarity: 'rara',
    text: u => `${upv(u, 12, 16)} de dano. Bram fica Exposto (o próximo golpe que ele receber causa +2).`,
    face: u => ({ atk: upv(u, 12, 16), sig: [['autoexp']] }),
    play(c) { c.hit(upv(c.up, 12, 16)); c.self('exposto', 1); } },
  matilha: { name: 'A Matilha', suit: 'presa', art: 'pack', rarity: 'comum', cost: 2,
    text: u => `${upv(u, 3, 4)} de dano três vezes.`,
    face: u => ({ atk: upv(u, 3, 4), hits: 3, sig: [] }),
    play(c) { c.hit(upv(c.up, 3, 4), { times: 3 }); } },
  urso: { name: 'Urso Cavernoso', suit: 'presa', art: 'bear', rarity: 'rara', cost: 2,
    text: u => `Destrói toda a couraça do inimigo e causa ${upv(u, 14, 18)} de dano.`,
    face: u => ({ atk: upv(u, 14, 18), sig: [['quebra']] }),
    play(c) { c.stripArmor(999); c.hit(upv(c.up, 14, 18)); } },

  // ---------- CASCA: Guarda e resistência ----------
  casco: { name: 'Casco de Musgo', suit: 'casca', art: 'turtle', rarity: 'base',
    text: u => `${upv(u, 5, 7)} de Guarda.`,
    face: u => ({ def: upv(u, 5, 7), sig: [] }),
    play(c) { c.block(upv(c.up, 5, 7)); } },
  texugo: { name: 'Texugo Teimoso', suit: 'casca', art: 'badger', rarity: 'comum',
    text: u => `${upv(u, 4, 5)} de Guarda. Se abrir a Fila: +${upv(u, 4, 5)} de Guarda.`,
    face: u => ({ def: upv(u, 4, 5), sig: [['primeiro', '+' + upv(u, 4, 5)]] }),
    play(c) { c.block(upv(c.up, 4, 5) + (c.first ? upv(c.up, 4, 5) : 0)); } },
  ourico: { name: 'Ouriço', suit: 'casca', art: 'hedgehog', rarity: 'comum',
    text: u => `${upv(u, 4, 5)} de Guarda. Espinhos ${upv(u, 2, 3)}: cada golpe que você receber nesta rodada fere o inimigo.`,
    face: u => ({ def: upv(u, 4, 5), sig: [['espinhos', upv(u, 2, 3)]] }),
    play(c) { c.block(upv(c.up, 4, 5)); c.thorns(upv(c.up, 2, 3)); } },
  cascaviva: { name: 'Casca Viva', suit: 'casca', art: 'bark', rarity: 'comum',
    text: u => `${upv(u, 2, 3)} de Guarda, +2 para cada carta antes dela na Fila.`,
    face: u => ({ def: upv(u, 2, 3), sig: [['ultimo', '+2']] }),
    play(c) { c.block(upv(c.up, 2, 3) + c.pos * 2); } },
  toupeira: { name: 'Toupeira', suit: 'casca', art: 'mole', rarity: 'comum',
    text: u => `${upv(u, 5, 7)} de Guarda. Compre 1 carta a mais na próxima rodada.`,
    face: u => ({ def: upv(u, 5, 7), sig: [['compra', 1]] }),
    play(c) { c.block(upv(c.up, 5, 7)); c.draw(1); } },
  castor: { name: 'Castor Construtor', suit: 'casca', art: 'beaver', rarity: 'rara',
    text: u => `${upv(u, 3, 4)} de Guarda para cada carta na Fila.`,
    face: u => ({ def: `${upv(u, 3, 4)}×F`, sig: [['conta']] }),
    play(c) { c.block(upv(c.up, 3, 4) * c.count); } },
  tatu: { name: 'Tatu-Bola', suit: 'casca', art: 'armadillo', rarity: 'rara',
    text: u => `${upv(u, 8, 11)} de Guarda. A Guarda não some no fim desta rodada.`,
    face: u => ({ def: upv(u, 8, 11), sig: [['dura']] }),
    play(c) { c.block(upv(c.up, 8, 11)); c.keepGuard(); } },
  mariposa: { name: 'Mariposa do Último Suspiro', suit: 'casca', art: 'moth', rarity: 'rara',
    text: u => `${upv(u, 4, 5)} de Guarda. Se você tiver 1/3 da vida ou menos: cura ${upv(u, 7, 9)}.`,
    face: u => ({ def: upv(u, 4, 5), sig: [['vidabaixa'], ['cura', upv(u, 7, 9)]] }),
    play(c) { c.block(upv(c.up, 4, 5)); if (c.bram.hp <= c.bram.maxHp / 3) c.heal(upv(c.up, 7, 9)); } },
  alce: { name: 'Alce Ancião', suit: 'casca', art: 'elk', rarity: 'rara', cost: 2,
    text: u => `${upv(u, 13, 17)} de Guarda e Espinhos ${upv(u, 3, 4)}.`,
    face: u => ({ def: upv(u, 13, 17), sig: [['espinhos', upv(u, 3, 4)]] }),
    play(c) { c.block(upv(c.up, 13, 17)); c.thorns(upv(c.up, 3, 4)); } },

  // ---------- SOMBRA: enfraquecer e preparar ----------
  coruja: { name: 'Coruja Vigia', suit: 'sombra', art: 'owl', rarity: 'base',
    text: u => `${upv(u, 1, 3)} de dano e Marca o inimigo (a próxima Presa causa +3).`,
    face: u => ({ atk: upv(u, 1, 3), sig: [['marca']] }),
    play(c) { c.hit(upv(c.up, 1, 3)); c.apply('marca', 1); } },
  morcego: { name: 'Morcego Cego', suit: 'sombra', art: 'bat', rarity: 'base',
    text: u => `Fraqueza ${upv(u, 3, 5)}: o próximo ataque do inimigo causa esse tanto a menos.`,
    face: u => ({ sig: [['fraqueza', upv(u, 3, 5)]] }),
    play(c) { c.apply('fraqueza', c.n(upv(c.up, 3, 5))); } },
  aranha: { name: 'Aranha de Seda', suit: 'sombra', art: 'spider', rarity: 'comum',
    text: u => `${upv(u, 2, 4)} de dano e deixa o inimigo Exposto: todo golpe nesta rodada causa +2.`,
    face: u => ({ atk: upv(u, 2, 4), sig: [['exposto']] }),
    play(c) { c.apply('exposto', 1); c.hit(upv(c.up, 2, 4)); } },
  cogumelo: { name: 'Cogumelo de Vozes', suit: 'sombra', art: 'mushroom', rarity: 'comum',
    text: u => `Marca o inimigo. Ímpeto ${upv(u, 3, 4)}: cada golpe seguinte nesta rodada causa +${upv(u, 3, 4)}.`,
    face: u => ({ sig: [['marca'], ['impeto', upv(u, 3, 4)]] }),
    play(c) { c.apply('marca', 1); c.impeto(upv(c.up, 3, 4)); } },
  gato: { name: 'Gato do Cemitério', suit: 'sombra', art: 'cat', rarity: 'comum',
    text: u => `${upv(u, 2, 3)} de dano. Arranca até ${upv(u, 6, 9)} de couraça do inimigo e transforma em Guarda para você.`,
    face: u => ({ atk: upv(u, 2, 3), sig: [['rouba', upv(u, 6, 9)]] }),
    play(c) { const got = c.stripArmor(c.n(upv(c.up, 6, 9))); if (got > 0) c.block(got, { raw: true }); c.hit(upv(c.up, 2, 3)); } },
  pega: { name: 'Pega Ladra', suit: 'sombra', art: 'magpie', rarity: 'comum',
    text: u => `${upv(u, 4, 6)} de dano. Se o inimigo estiver Marcado, devolve 1 alma ao Saco.`,
    face: u => ({ atk: upv(u, 4, 6), sig: [['marca'], ['alma', 1]] }),
    play(c) { const m = c.has('marca'); c.hit(upv(c.up, 4, 6)); if (m) c.soul(1); } },
  sino: { name: 'Sino do Afogado', suit: 'sombra', art: 'bell', rarity: 'rara',
    text: u => `Se o inimigo estiver Marcado (consome) ou Exposto: Atordoa, cancelando a ação dele. Senão: Fraqueza ${upv(u, 3, 4)}.`,
    face: u => ({ sig: [['marca'], ['atordoa'], ['fraqueza', upv(u, 3, 4)]] }),
    play(c) { if (c.consume('marca') || c.has('exposto')) { c.apply('atordoado', 1); if (c.up) c.apply('fraqueza', 2); } else c.apply('fraqueza', c.n(upv(c.up, 3, 4))); } },
  lince: { name: 'Lince Silencioso', suit: 'sombra', art: 'lynx', rarity: 'rara',
    text: u => `${upv(u, 3, 5)} de dano, +${upv(u, 3, 4)} para cada efeito no inimigo (Marca, Fraqueza, Exposto, Brasa).`,
    face: u => ({ atk: upv(u, 3, 5), sig: [['conta', '+' + upv(u, 3, 4)]] }),
    play(c) { c.hit(upv(c.up, 3, 5) + c.statusCount() * upv(c.up, 3, 4)); } },
  poco: { name: 'Homem do Poço', suit: 'sombra', art: 'wellman', rarity: 'rara',
    text: u => `Fraqueza ${upv(u, 5, 7)} no inimigo e ${upv(u, 4, 5)} de Guarda.`,
    face: u => ({ def: upv(u, 4, 5), sig: [['fraqueza', upv(u, 5, 7)]] }),
    play(c) { c.apply('fraqueza', c.n(upv(c.up, 5, 7))); c.block(upv(c.up, 4, 5)); } },
  corujao: { name: 'Coruja-das-Torres', suit: 'sombra', art: 'barnowl', rarity: 'rara', cost: 2,
    text: u => `Marca, Fraqueza ${upv(u, 4, 6)} e Atordoa o inimigo (chefes resistem e recebem Fraqueza 3).`,
    face: u => ({ sig: [['marca'], ['fraqueza', upv(u, 4, 6)], ['atordoa']] }),
    play(c) { c.apply('marca', 1); c.apply('fraqueza', c.n(upv(c.up, 4, 6))); c.apply('atordoado', 1); } },

  // ---------- CINZA: queimar ao longo das rodadas ----------
  salamandra: { name: 'Salamandra de Cinzas', suit: 'cinza', art: 'salamander', rarity: 'base',
    text: u => `Brasa ${upv(u, 3, 4)}: no fim da sua vez o inimigo queima esse tanto (ignora couraça) e a Brasa diminui 1.`,
    face: u => ({ sig: [['brasa', upv(u, 3, 4)]] }),
    play(c) { c.apply('brasa', c.n(upv(c.up, 3, 4))); } },
  vagalume: { name: 'Vagalume', suit: 'cinza', art: 'firefly', rarity: 'comum',
    text: u => `Brasa ${upv(u, 1, 2)} e devolve 1 alma ao Saco.`,
    face: u => ({ sig: [['brasa', upv(u, 1, 2)], ['alma', 1]] }),
    play(c) { c.apply('brasa', c.n(upv(c.up, 1, 2))); c.soul(1); } },
  pardal: { name: 'Pardal em Chamas', suit: 'cinza', art: 'sparrow', rarity: 'comum',
    text: u => `${upv(u, 3, 4)} de dano e Brasa ${upv(u, 2, 3)}.`,
    face: u => ({ atk: upv(u, 3, 4), sig: [['brasa', upv(u, 2, 3)]] }),
    play(c) { c.hit(upv(c.up, 3, 4)); c.apply('brasa', upv(c.up, 2, 3)); } },
  fatuo: { name: 'Fogo-Fátuo', suit: 'cinza', art: 'wisp', rarity: 'comum',
    text: u => `Brasa ${upv(u, 2, 3)}. A próxima carta da Fila ganha +${upv(u, 2, 3)}.`,
    face: u => ({ sig: [['brasa', upv(u, 2, 3)], ['proxima', '+' + upv(u, 2, 3)]] }),
    play(c) { c.apply('brasa', c.n(upv(c.up, 2, 3))); c.boostNext(upv(c.up, 2, 3)); } },
  lagarta: { name: 'Lagarta de Carvão', suit: 'cinza', art: 'caterpillar', rarity: 'comum',
    text: u => `Dano igual à Brasa do inimigo +${upv(u, 3, 5)}, atravessando couraça. Não consome a Brasa.`,
    face: u => ({ atk: `B+${upv(u, 3, 5)}`, sig: [['perfura']] }),
    play(c) { c.hit(c.stacks('brasa') + upv(c.up, 3, 5), { pierce: true }); } },
  raposa: { name: 'Raposa de Brasa', suit: 'cinza', art: 'emberfox', rarity: 'rara',
    text: u => `${u ? 'Brasa 2 e depois d' : 'D'}obra a Brasa do inimigo.`,
    face: u => ({ sig: u ? [['brasa', 2], ['dobro', '×2']] : [['dobro', '×2']] }),
    play(c) { if (c.up) c.apply('brasa', 2); const s = c.stacks('brasa'); if (s > 0) c.apply('brasa', s); } },
  brasa: { name: 'A Última Brasa', suit: 'cinza', art: 'ember', rarity: 'rara',
    text: u => `${upv(u, 5, 7)} de dano. Se Bram fosse cair nesta rodada, sobrevive com 1 de vida e esta carta se apaga para sempre.`,
    face: u => ({ atk: upv(u, 5, 7), sig: [['salva']] }),
    play(c) { c.hit(upv(c.up, 5, 7)); c.ember(); } },
  grandsal: { name: 'Grande Salamandra', suit: 'cinza', art: 'bigsalamander', rarity: 'comum', cost: 2,
    text: u => `Brasa ${upv(u, 6, 8)}.`,
    face: u => ({ sig: [['brasa', upv(u, 6, 8)]] }),
    play(c) { c.apply('brasa', c.n(upv(c.up, 6, 8))); } },

  // ---------- MEMÓRIA (curinga: conta como o naipe da carta anterior) ----------
  apagada: { name: 'A Carta Apagada', suit: 'memoria', art: 'tamsin', rarity: 'especial', unique: true, keep: true,
    text: (u, mem = 0) => `${2 + mem + (u ? 2 : 0)} de dano e ${2 + mem + (u ? 2 : 0)} de Guarda. Cresce com cada memória recuperada.`,
    face: (u, mem = 0) => ({ atk: 2 + mem + (u ? 2 : 0), def: 2 + mem + (u ? 2 : 0), sig: [['cresce']] }),
    play(c) { const n = 2 + c.memories + (c.up ? 2 : 0); c.hit(n); c.block(n); c.flag('apagada'); } },
  lontra: { name: 'Lontra Brincalhona', suit: 'memoria', art: 'otterpup', rarity: 'rara',
    text: u => `Repete o efeito da carta anterior${u ? ' com +2' : ''}.`,
    face: u => ({ sig: [['repete', u ? '+2' : '']] }),
    play(c) { c.echo(c.up ? 2 : 0); } },
  lampejo: { name: 'Lampejo', suit: 'memoria', art: 'lantern', rarity: 'comum',
    text: u => `Devolve ${upv(u, 2, 3)} almas ao Saco e você compra 1 carta a mais na próxima rodada.`,
    face: u => ({ sig: [['alma', upv(u, 2, 3)], ['compra', 1]] }),
    play(c) { c.soul(upv(c.up, 2, 3)); c.draw(1); } },
  quente: { name: 'Lembrança Quente', suit: 'memoria', art: 'o_xicara', rarity: 'comum',
    text: u => `${upv(u, 3, 4)} de Guarda. A próxima carta da Fila ganha +${upv(u, 3, 4)}.`,
    face: u => ({ def: upv(u, 3, 4), sig: [['proxima', '+' + upv(u, 3, 4)]] }),
    play(c) { c.block(upv(c.up, 3, 4)); c.boostNext(upv(c.up, 3, 4)); } },
  pegadas: { name: 'Pegadas na Lama', suit: 'memoria', art: 'tracks', rarity: 'rara',
    text: u => `A próxima carta da Fila ativa duas vezes.${u ? ' Devolve 1 alma.' : ''}`,
    face: u => ({ sig: u ? [['dobro', '→'], ['alma', 1]] : [['dobro', '→']] }),
    play(c) { c.twice(); if (c.up) c.soul(1); } },
  ninar: { name: 'Canção de Ninar', suit: 'memoria', art: 'lullaby', rarity: 'comum',
    text: u => `${upv(u, 3, 4)} de Guarda, cura ${upv(u, 3, 5)} e limpa Exposto, Bolor e Culpa de Bram.`,
    face: u => ({ def: upv(u, 3, 4), sig: [['cura', upv(u, 3, 5)], ['limpa']] }),
    play(c) { c.block(upv(c.up, 3, 4)); c.heal(c.n(upv(c.up, 3, 5))); c.cleanse(); } },
  cervobranco: { name: 'Cervo Branco', suit: 'memoria', art: 'stag', rarity: 'rara', cost: 2,
    text: u => `${upv(u, 8, 11)} de Guarda, cura ${upv(u, 7, 10)} e limpa os efeitos ruins de Bram.`,
    face: u => ({ def: upv(u, 8, 11), sig: [['cura', upv(u, 7, 10)], ['limpa']] }),
    play(c) { c.block(upv(c.up, 8, 11)); c.heal(c.n(upv(c.up, 7, 10))); c.cleanse(); } },

  // ---------- especial (criada pela Viúva dos Sussurros) ----------
  fiodoce: { name: 'Fio Doce', suit: 'sombra', art: 'sweet', rarity: 'maldita', cost: 0, temp: true,
    text: () => 'Não custa alma. 14 de dano. Em troca, você esquece um pouco: Podridão +6 e o Lampião enfraquece.',
    face: () => ({ atk: 14, sig: [['maldito']] }),
    play(c) { c.hit(14); c.forget(); } }
};

const STARTER_DECK = ['rato', 'rato', 'lobo', 'lobo', 'casco', 'casco', 'coruja', 'morcego', 'salamandra', 'apagada'];
const REWARD_POOL = Object.keys(CARDS).filter(id => ['comum', 'rara'].includes(CARDS[id].rarity));

function cardCost(id) { return CARDS[id]?.cost ?? 1; }
// Texto curto (usado na prévia de uma linha).
function cardShort(id, up, mem) {
  const f = CARDS[id].face(up, mem);
  const p = [];
  if (f.atk != null) p.push(`${f.atk}${f.hits ? '×' + f.hits : ''} dano`);
  if (f.def != null) p.push(`${f.def} guarda`);
  for (const [s, n] of f.sig) p.push(`${SIGILS[s]}${n !== undefined && n !== '' ? ' ' + n : ''}`);
  return p.join(' · ');
}
