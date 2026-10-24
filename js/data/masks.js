'use strict';
// Máscaras: as personas que Bram criou para não ser ele mesmo.
// Dão poder, mas escondem informação e fazem o bosque apodrecer mais rápido.

const MASK_LIMIT = 4;
const MASK_ROT = 2; // Podridão extra por lugar visitado, para cada máscara usada

const MASKS = {
  sorriso:   { name: 'Máscara do Sorriso',  art: 'm_sorriso',   gift: 'Cartas Presa causam +2 de dano.', cost: 'Você não vê quanto dano o inimigo vai causar.', hides: 'intentNumbers' },
  ferro:     { name: 'Máscara de Ferro',    art: 'm_ferro',     gift: 'Cartas Casca dão +3 de Guarda.', cost: 'Você não vê a sua própria vida.', hides: 'ownHp' },
  semolhos:  { name: 'Máscara Sem Olhos',   art: 'm_semolhos',  gift: '+1 alma no Saco a cada rodada.', cost: 'O texto das cartas na sua mão se apaga.', hides: 'cardText' },
  cervo:     { name: 'Máscara do Cervo',    art: 'm_cervo',     gift: 'A primeira carta da Fila ativa duas vezes.', cost: 'Você não vê a vida do inimigo.', hides: 'enemyHp' },
  bufao:     { name: 'Máscara do Bufão',    art: 'm_bufao',     gift: 'Todo combo dá +2 a mais.', cost: 'O bosque apodrece em dobro enquanto ela estiver no rosto.', rot: 2 },
  cera:      { name: 'Máscara de Cera',     art: 'm_cera',      gift: 'Cura 5 ao vencer cada combate.', cost: '−6 de vida máxima enquanto usada.', maxHp: -6 },
  viuva:     { name: 'Máscara da Viúva',    art: 'm_viuva',     gift: 'Começa cada combate com +3 almas.', cost: 'Perde 3 de vida no início de cada combate.' },
  cinzam:    { name: 'Máscara de Cinza',    art: 'm_cinzam',    gift: 'Toda Brasa aplicada ganha +2.', cost: 'Cada carta Cinza jogada queima Bram em 1.' },
  esquecido: { name: 'Máscara do Esquecido', art: 'm_esquecido', gift: 'Começa cada rodada com Ímpeto 1.', cost: 'O mapa à frente fica sem nome.', hides: 'map' }
};

const hasMask = (masks, id) => !!masks && masks.includes(id);
const hides = (masks, what) => !!masks && masks.some(m => MASKS[m]?.hides === what);
