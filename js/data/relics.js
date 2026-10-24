'use strict';
// Relíquias: coisas pequenas que o bosque perdeu. Não têm custo nenhum, só ajudam.
// Os efeitos de combate ficam no motor (engine.js); os de fora do combate, em game.js e screens.js.

const RELICS = {
  seixo:     { name: 'Seixo do Rio',        art: 'r_seixo',     text: 'Começa cada combate com 6 de Guarda.' },
  dente:     { name: 'Dente de Leite',      art: 'r_dente',     text: 'A primeira carta da Fila ganha +2.' },
  pena:      { name: 'Pena de Corvo',       art: 'r_pena',      text: 'Na primeira rodada de cada combate, compra 1 carta a mais.' },
  sino:      { name: 'Sininho de Porta',    art: 'r_sino',      text: '+1 alma no começo de cada combate.' },
  bolota:    { name: 'Bolota Dourada',      art: 'r_bolota',    text: '+8 lascas depois de cada combate.' },
  botao:     { name: 'Botão de Osso',       art: 'r_botao',     text: '+5 de vida máxima.' },
  linha:     { name: 'Carretel de Linha',   art: 'r_linha',     text: 'Cura 3 depois de cada combate.' },
  musgo:     { name: 'Musgo no Bolso',      art: 'r_musgo',     text: 'A Podridão sobe 1 a menos a cada lugar visitado.' },
  vela:      { name: 'Toco de Vela',        art: 'r_vela',      text: 'Descansar na fogueira cura 10 a mais.' },
  agulha:    { name: 'Agulha de Costura',   art: 'r_agulha',    text: 'Com a Fila cheia, a quinta carta ganha +4.' },
  piao:      { name: 'Pião de Madeira',     art: 'r_piao',      text: 'A Roda Completa causa 6 de dano a mais.' },
  lupa:      { name: 'Lupa Rachada',        art: 'r_lupa',      text: 'Você sempre vê a ação seguinte do inimigo.' },
  ferradura: { name: 'Ferradura Torta',     art: 'r_ferradura', text: 'Tudo o que se compra custa 20% menos.' },
  cachecol:  { name: 'Cachecol Remendado',  art: 'r_cachecol',  text: 'O primeiro golpe que Bram leva em cada combate perde 5 de dano.' },
  chocalho:  { name: 'Chocalho de Semente', art: 'r_chocalho',  text: 'Os inimigos começam cada combate com Fraqueza 3.' },
  concha:    { name: 'Concha do Lago',      art: 'r_concha',    text: 'Eco e Ressonância dão +1 a mais.' },
  fosforo:   { name: 'Caixa de Fósforos',   art: 'r_fosforo',   text: 'Toda Brasa aplicada ganha +1.' },
  apito:     { name: 'Apito de Osso',       art: 'r_apito',     text: 'O inimigo começa cada combate com Marca.' },
  bussola:   { name: 'Bússola Sem Agulha',  art: 'r_bussola',   text: 'Em cada trecho novo do bosque, o mapa inteiro aparece.' },
  dedal:     { name: 'Dedal de Prata',      art: 'r_dedal',     text: 'Cartas Casca dão +1 de Guarda.' },
  colher:    { name: 'Colher Torta',        art: 'r_colher',    text: 'Trocar a mão não custa alma.' },
  espelho:   { name: 'Caco de Espelho',     art: 'r_espelho',   text: 'Na primeira rodada, a primeira carta da Fila ativa duas vezes.' }
};

const hasRelic = (list, id) => !!list && list.includes(id);

// Ciclo+: depois de terminar a história uma vez, cada nível deixa o bosque mais cruel (e soma com os anteriores).
const ASCENSION = [
  { n: 1, text: 'Corrompidos com 10% a mais de vida.' },
  { n: 2, text: 'Bram começa com 4 de vida máxima a menos.' },
  { n: 3, text: 'A Podridão já começa em 15%.' },
  { n: 4, text: 'Corrompidos causam +1 de dano em todo ataque.' },
  { n: 5, text: 'Tudo o que se compra custa 25% a mais.' },
  { n: 6, text: 'Chefes e Corrompidos fortes com mais 15% de vida.' }
];
const ASC_MAX = ASCENSION.length;
