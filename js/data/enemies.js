'use strict';
// Os Corrompidos: animais devorados pela Podridão. Os chefes refletem etapas do luto.
// Intenções:  dmg/hits (ataque) · armor (couraça) · heal · cleanse · apply {exposto, bolor, culpa, esquecimento}
//             offer (Fio Doce na mão) · sermon (acusação) · observe (não ataca) · breakMask

const ENEMIES = {
  // ----- Ato I: a Borda de Morrow -----
  rato: { name: 'Rato de Casca', art: 'rat', corrupt: true, size: .75, hp: 26, act: 1,
    lore: 'Pequeno, nervoso e cheio de farpas. Ainda guarda migalha pra alguém que não volta mais.',
    pattern: [{ dmg: 5, label: 'Mordida' }, { dmg: 4, label: 'Mordiscada' }, { dmg: 8, heavy: true, label: 'Investida de farpas' }] },
  vagalumes: { name: 'Vagalumes Apagados', art: 'swarm', corrupt: true, size: .75, hp: 24, act: 1,
    lore: 'Brilham, mas não iluminam nada. Por onde passam, as pessoas esquecem onde deixaram as coisas.',
    pattern: [{ dmg: 2, hits: 3, label: 'Picadas' }, { dmg: 2, apply: { esquecimento: 1 }, label: 'Luz que apaga' }] },
  raiz: { name: 'Raiz Rastejante', art: 'root', corrupt: true, size: .9, hp: 30, act: 1,
    lore: 'Se arrasta devagar, sempre pra longe da trilha. Quem pisa nela não sai mais do lugar.',
    pattern: [{ armor: 7, label: 'Enraizar' }, { dmg: 7, label: 'Chicote' }, { dmg: 4, apply: { bolor: 2 }, label: 'Esporos' }] },
  lebre: { name: 'Lebre Oca', art: 'hollowhare', corrupt: true, size: 1, hp: 28, act: 1,
    lore: 'Tem orelha comprida igual a sua. No lugar do peito, um buraco.',
    pattern: [{ dmg: 4, apply: { exposto: 1 }, label: 'Encara você' }, { dmg: 8, label: 'Coice' }] },
  javali: { name: 'O Javali Sem Nome', art: 'boarknight', battleArt: 'boarknight_full', bg: 'burnt', size: 1.3, hp: 52, act: 1, elite: true, grief: 'Raiva', fury: 1,
    lore: 'Era um cavaleiro da Ordem. A armadura grudou na carne de tanto que ele não tira. Grita com todo mundo porque não tem com quem gritar.',
    passive: 'Fúria cega: +1 de dano a cada rodada.',
    pattern: [{ dmg: 7, label: 'Arremetida' }, { dmg: 4, hits: 2, label: 'Presas' }, { dmg: 11, heavy: true, label: 'Esmagar' }] },
  cervo: { name: 'O Cervo de Musgo', art: 'deer', battleArt: 'deer_full', bg: 'clearing', size: 1.5, hp: 80, act: 1, boss: true, grief: 'Negação', stunResist: true,
    lore: 'Era o guarda da trilha. Faz a mesma ronda todo dia, há anos, e quando alguma coisa dá errado ele só repete que nada aconteceu.',
    passive: 'A Ronda: sempre a mesma sequência. A cada quatro rodadas, nega tudo e se cura.',
    pattern: [{ armor: 8, label: 'Ronda: inspeciona a trilha' }, { dmg: 9, label: 'Ronda: expulsa o intruso' }, { dmg: 4, hits: 3, label: 'Ronda: chifradas' }, { cleanse: true, heal: 8, label: 'Nada aconteceu.' }] },

  // ----- Ato II: as Ruínas da Ordem -----
  corvo: { name: 'Corvo Ralé', art: 'crow', corrupt: true, size: .85, hp: 34, act: 2,
    lore: 'Repete pedaço de sermão que não entende. Às vezes erra a palavra e fica com vergonha.',
    pattern: [{ dmg: 4, hits: 2, label: 'Bicadas' }, { dmg: 3, apply: { exposto: 1 }, label: 'Grasnado' }, { dmg: 10, label: 'Mergulho' }] },
  cao: { name: 'Cão do Selo', art: 'dog', corrupt: true, size: 1, hp: 40, act: 2,
    lore: 'Os Seladores treinavam cães pra farejar alma. Esse ainda fareja. E abana o rabo quando sente o cheiro da sua.',
    pattern: [{ dmg: 9, label: 'Bote' }, { armor: 6, dmg: 5, label: 'Rosnado' }] },
  mariposas: { name: 'Mariposas de Cera', art: 'moth', corrupt: true, size: .85, hp: 42, act: 2,
    lore: 'Ficam rodando vela que ninguém acende há anos.',
    pattern: [{ dmg: 3, hits: 4, label: 'Revoada' }, { dmg: 2, apply: { bolor: 3 }, label: 'Pó de cera' }] },
  coveira: { name: 'Toupeira Coveira', art: 'mole', corrupt: true, size: .95, hp: 32, act: 2,
    lore: 'Cava cova do tamanho exato de quem passa. Mede no olho.',
    pattern: [{ armor: 12, label: 'Cava' }, { dmg: 13, label: 'Pá de garras' }] },
  coletor: { name: 'O Coletor de Nomes', art: 'collector', bg: 'graveyard', size: 1.25, hp: 56, act: 2, elite: true,
    lore: 'Cada plaquinha na carapaça dele tem o nome de alguém que foi esquecido. Uma delas está em branco, esperando.',
    passive: 'Carapaça de nomes: começa cada combate com 6 de couraça.', startArmor: 6,
    pattern: [{ armor: 8, dmg: 4, label: 'Recolhe' }, { dmg: 6, hits: 2, label: 'Garras' }, { dmg: 13, heavy: true, label: 'Cobrança' }] },
  viuva: { name: 'A Viúva dos Sussurros', art: 'widow', bg: 'crypt', size: 1.45, hp: 100, act: 2, boss: true, grief: 'Barganha',
    lore: 'Uma aranha de bons modos e péssimas intenções. Oferece carta boa em troca de lembrança. Sempre parece um bom negócio.',
    passive: 'Barganha: oferece o Fio Doce. Não custa alma, mas cobra memória.',
    pattern: [{ dmg: 6, hits: 2, label: 'Abraço de seda' }, { offer: true, armor: 6, label: 'Uma troca doce' }, { dmg: 15, heavy: true, label: 'Ferrão' }, { armor: 10, apply: { esquecimento: 1 }, label: 'Sussurra seu nome errado' }] },
  pregador: { name: 'O Corvo Pregador', art: 'preacher', bg: 'chapelruin', size: 1.45, hp: 90, act: 2, boss: true, grief: 'Culpa',
    lore: 'Do alto da capela quebrada, prega contra Bram. Acusa ele de coisas que ele nem lembra. O pior é quando acerta.',
    passive: 'Sermão: aplica Culpa. Com Culpa, cada carta que você joga custa 1 de vida.',
    pattern: [{ sermon: true, apply: { culpa: 1 }, armor: 5, label: 'Sermão' }, { dmg: 10, label: 'Bico de ferro' }, { dmg: 5, hits: 3, label: 'Revoada de penas' }, { sermon: true, apply: { exposto: 1 }, dmg: 7, label: 'Acusação' }] },

  // ----- Ato III: o Charco das Mães -----
  sapo: { name: 'Sapo Inchado', art: 'toad', corrupt: true, size: 1.05, hp: 46, act: 3,
    lore: 'Engoliu tanta água parada que esqueceu como pula.',
    pattern: [{ dmg: 8, apply: { bolor: 2 }, label: 'Cuspe' }, { dmg: 13, label: 'Língua' }] },
  enguia: { name: 'Enguia Lamacenta', art: 'eel', corrupt: true, size: .95, hp: 40, act: 3,
    lore: 'Só aparece quando alguém fica olhando pra água tempo demais.',
    pattern: [{ dmg: 4, hits: 3, label: 'Choques' }, { armor: 8, apply: { exposto: 1 }, label: 'Afunda' }, { dmg: 14, label: 'Bote' }] },
  garca: { name: 'Garça Afogada', art: 'heron', corrupt: true, size: 1.2, hp: 50, act: 3,
    lore: 'Espera parada por um peixe que nunca vem. Não sabe mais fazer outra coisa.',
    pattern: [{ armor: 10, apply: { exposto: 1 }, label: 'Espreita' }, { dmg: 16, heavy: true, label: 'Bicada certeira' }] },
  raizafogada: { name: 'Raiz Afogada', art: 'root', corrupt: true, size: 1.05, hp: 48, act: 3,
    lore: 'Cresceu pra dentro da água e esqueceu o caminho de volta.',
    pattern: [{ armor: 12, label: 'Enraizar' }, { dmg: 10, apply: { bolor: 2 }, label: 'Esporos podres' }] },
  maelontra: { name: 'A Mãe Lontra do Pântano', art: 'ottermother', bg: 'pond', size: 1.5, hp: 100, act: 3, boss: true, grief: 'Perda', stunResist: true,
    lore: 'Era a curandeira do charco. Cuidava de todo filhote que aparecia. Canta uma música que você conhece de algum lugar, e isso trava as suas patas.',
    passive: 'Hesitação: nas duas primeiras rodadas o primeiro espaço da Fila fica travado (a menos que o Lampião esteja forte).',
    pattern: [{ heal: 6, armor: 8, label: 'Cuida das feridas' }, { dmg: 6, hits: 2, label: 'Afaga com garras' }, { dmg: 14, heavy: true, label: 'Abraço que afoga' }, { apply: { esquecimento: 1 }, dmg: 4, label: 'Canção de ninar' }] },

  // ----- Final: o Covil -----
  vaelgrath: { name: 'Vaelgrath, o Dragão das Cinzas', art: 'dragon', bg: 'lair', size: 1.8, hp: 80, act: 4, boss: true, final: true, stunResist: true, grief: 'O Selo',
    lore: 'Não é um vilão. É um guardião cansado, segurando a Podridão dentro do próprio corpo, preso por um selo feito de alma. De alguém.',
    phases: [
      { name: 'O Guardião', hp: 90, passive: 'Testa você com calma. Se você usar a Carta Apagada, ele apenas observa.',
        pattern: [{ observe: true, armor: 10, label: 'Observa você' }, { dmg: 11, label: 'Garra cansada' }, { dmg: 5, hits: 3, label: 'Sopro de cinzas' }] },
      { name: 'A Podridão', hp: 80, passive: 'A doença toma o controle. Suas máscaras se partem, uma por rodada.',
        pattern: [{ dmg: 11, breakMask: true, label: 'A Podridão ruge' }, { apply: { bolor: 2 }, dmg: 5, breakMask: true, label: 'Cinzas podres' }, { dmg: 4, hits: 3, breakMask: true, label: 'Tempestade de cinzas' }, { armor: 10, apply: { culpa: 1 }, breakMask: true, label: 'Esquecer é mais fácil' }] }
    ] }
};

const ENEMY_POOLS = {
  1: { normal: ['rato', 'vagalumes', 'raiz', 'lebre'], elite: ['javali'], boss: ['cervo'] },
  2: { normal: ['corvo', 'cao', 'mariposas', 'coveira'], elite: ['coletor'], boss: ['viuva', 'pregador'] },
  3: { normal: ['sapo', 'enguia', 'garca', 'raizafogada'], elite: ['javali'], boss: ['maelontra'] }
};

const SERMONS = [
  'Você estava lá. Você viu. E ficou parado.',
  'De quem é esse baralho, coelho? Não é seu.',
  'Você parou de falar porque é mais fácil do que dizer o nome dela.',
  'Ela olhou pra trás. Você olhou pro chão.',
  'Esquecer não é inocente. É covarde.',
  'Até essa luzinha aí do seu lado tem vergonha de você.'
];

// Voz e falas de cada Corrompido: ao começar a luta, quando apanha feio e quando cai.
// Ao cair, quase todos dizem uma última coisa lúcida, como se acordassem.
const ENEMY_TALK = {
  rato:        { voice: 'chitter', start: ['Migalha... minha!', 'Sai. Sai daqui!'], hurt: ['Tava guardando...'], die: 'Era pra ela... as migalhas eram pra ela.' },
  vagalumes:   { voice: 'buzz', start: ['Apaga... apaga...', 'Esquece... esquece...'], hurt: ['Mais escuro. Mais.'], die: 'A gente só queria iluminar alguém.' },
  raiz:        { voice: 'creak', start: ['Fica. Fica pra sempre.'], hurt: ['Não solta. Não solta.'], die: 'Eu só queria segurar alguma coisa.' },
  lebre:       { voice: 'hare', start: ['Orelha comprida... igual a sua.'], hurt: ['Pode bater. Não tem nada aqui dentro.'], die: 'Obrigada... tava tão frio.' },
  javali:      { voice: 'growl', start: ['QUEM FOI? QUEM DEIXOU ISSO ACONTECER?', 'Eu vou quebrar tudo até alguém me responder!'], hurt: ['NÃO DÓI! NADA DÓI MAIS!'], die: 'Eu não protegi ninguém. Eu só gritei.' },
  cervo:       { voice: 'deep', start: ['Trilha limpa. Trilha limpa. Nada aconteceu.', 'Circulando. Não tem nada pra ver aqui.'], hurt: ['Isso não aconteceu.', 'Nada aconteceu. Nada.'], die: 'Aconteceu... não foi? Aconteceu mesmo.' },
  corvo:       { voice: 'caw', start: ['Pecador! Pecador! ...o que é pecador?'], hurt: ['Cróóó!'], die: 'Desculpa. Eu nem sei o que eu tava falando.' },
  cao:         { voice: 'growl', start: ['Cheiro de alma... cheiro dela.'], hurt: ['Grrr...'], die: 'Bom menino... eu era um bom menino.' },
  mariposas:   { voice: 'buzz', start: ['A vela, a vela, cadê a vela?'], hurt: ['Escuro!'], die: 'Tava tão escuro sem ela.' },
  coveira:     { voice: 'creak', start: ['Tem uma cova do seu tamanho. Eu medi.'], hurt: ['Cava mais fundo...'], die: 'Ninguém nunca vem visitar.' },
  coletor:     { voice: 'clack', start: ['Nome. Me dá seu nome.', 'Tenho uma plaquinha em branco. Serve em você.'], hurt: ['Mais um nome... só mais um.'], die: 'Eu nem lembro o meu.' },
  viuva:       { voice: 'whisper', start: ['Coelhinho. Vamos fazer um negocinho?', 'Tudo tem preço, querido. Até lembrar.'], hurt: ['Que grosseiro. Ela gostava disso em você?'], die: 'Eu só queria que alguém ficasse...' },
  pregador:    { voice: 'caw', start: ['Ajoelha, coelho. Hoje é dia de confissão.'], hurt: ['A verdade dói, não dói?'], die: 'Não era culpa sua. Nunca foi. Eu só precisava que fosse de alguém.' },
  sapo:        { voice: 'croak', start: ['Glub. Água parada. Ninguém mexe.'], hurt: ['Glub!'], die: 'Ah... dá pra respirar.' },
  enguia:      { voice: 'bubble', start: ['Olha pra água. Olha mais.'], hurt: ['Afunda comigo.'], die: 'Era muito fundo...' },
  garca:       { voice: 'caw', start: ['...'], hurt: ['O peixe não vem. O peixe nunca vem.'], die: 'Ela também esperava. No mesmo lugar.' },
  raizafogada: { voice: 'creak', start: ['Puxa pra baixo. Puxa.'], hurt: ['Mais fundo...'], die: 'Esqueci como era o sol.' },
  maelontra:   { voice: 'sing', start: ['Shhh. Dorme, filhote. A mamãe tá aqui.', 'Eu conheço essa música. Você conhece?'], hurt: ['Por que você não deixa eu cuidar de você?'], die: 'Ela cantava isso pra você. Não era minha... era sua.' },
  vaelgrath:   { voice: 'dragon', start: ['Você voltou. Ela disse que você ia voltar.', 'Tão pequeno. Ela também era pequena.'], hurt: ['Eu tô cansado, coelho. Muito cansado.'], die: 'Agora... não sou mais eu.',
    phase2: ['ESQUECE. ESQUECER É MAIS FÁCIL.', 'TIRA ESSA LUZ DAQUI.'] }
};

const STATUS_INFO = {
  marca:        { name: 'Marca',        icon: 'u_marca',        desc: 'A próxima carta Presa causa +3 de dano e consome a Marca.' },
  fraqueza:     { name: 'Fraqueza',     icon: 'u_fraqueza',     desc: 'Reduz o dano dos próximos ataques desse lado em igual valor, até se esgotar.' },
  exposto:      { name: 'Exposto',      icon: 'u_exposto',      desc: 'No inimigo: todo golpe nesta rodada causa +2. Em Bram: o próximo golpe recebido causa +2.' },
  brasa:        { name: 'Brasa',        icon: 'u_brasa',        desc: 'No fim da sua vez, causa esse dano (ignora couraça) e diminui 1.' },
  atordoado:    { name: 'Atordoado',    icon: 'u_atordoado',    desc: 'Perde a próxima ação. Chefes resistem e recebem Fraqueza 3.' },
  impeto:       { name: 'Ímpeto',       icon: 'u_impeto',       desc: 'Cada golpe seguinte nesta rodada causa esse tanto a mais.' },
  bolor:        { name: 'Bolor',        icon: 'u_bolor',        desc: 'No fim da rodada, Bram perde esse tanto de vida e o Bolor diminui 1.' },
  culpa:        { name: 'Culpa',        icon: 'u_culpa',        desc: 'Cada carta jogada custa 1 de vida por ponto de Culpa. Diminui 1 por rodada.' },
  esquecimento: { name: 'Esquecimento', icon: 'u_esquecimento', desc: 'Na próxima rodada, o Saco recebe menos almas.' },
  espinhos:     { name: 'Espinhos',     icon: 'u_espinhos',     desc: 'Cada golpe recebido nesta rodada fere o inimigo.' },
  couraca:      { name: 'Couraça',      icon: 'u_armor',        desc: 'Absorve dano. Some quando o inimigo age de novo.' },
  guarda:       { name: 'Guarda',       icon: 'u_guard',        desc: 'Absorve o dano recebido nesta rodada.' }
};
