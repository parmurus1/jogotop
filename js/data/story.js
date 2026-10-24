'use strict';
// Texto do jogo. Convenções nas falas:
//   "*texto"  narração (o que se vê, sem voz)
//   "~texto"  mentira: o Lampião pisca e treme enquanto ela é dita
// Bram não fala. Quem fala com ele são os outros (e o Lampião, do jeito dele).

// As cenas animadas de cada memória ficam em cinema.js.
const MEMORIES = [
  { id: 'fita', name: 'A Fita Vermelha', obj: 'o_fita', act: 1,
    find: 'Tem uma fita vermelha amarrada num galho baixo, desbotada de sol. O laço é malfeito, frouxo de um lado. Suas patas desfazem o nó antes de você pensar nisso.' },
  { id: 'pegadas', name: 'Duas Pegadas', obj: 'o_pegadas', act: 1,
    find: 'Na lama seca, duas trilhas de pegadas lado a lado. Umas grandes, retinhas. Outras pequenas, que vão pra lá e pra cá, como quem nunca aprendeu a andar em linha reta.' },
  { id: 'xicara', name: 'A Xícara Rachada', obj: 'o_xicara', act: 1,
    find: 'Uma xícara de barro caída entre as raízes. Alguém colou a rachadura com resina dourada. Colou mal: a resina escorreu pelo lado e secou ali mesmo.' },
  { id: 'carta', name: 'A Ordem de Caça', obj: 'o_carta', act: 2,
    find: 'Um papel dobrado em quatro, com o selo da Ordem dos Seladores. É uma ordem de caça. Embaixo das instruções, alguém escreveu alguma coisa à mão, com pressa.' },
  { id: 'mapa', name: 'O Mapa de Duas Patas', obj: 'o_mapa', act: 2, gift: 'ysolde',
    find: 'Um mapa velho, dobrado tantas vezes que as dobras viraram estrada. Tem duas marcas de pata nele: uma grande e uma pequena, manchada de tinta.' },
  { id: 'anzol', name: 'O Anzol de Osso', obj: 'o_anzol', act: 2,
    find: 'Um anzol pequeno, de osso, preso numa linha que já apodreceu. O nó é estranho. Errado, até. Mas não solta de jeito nenhum.' },
  { id: 'capa', name: 'O Bolso Costurado', obj: 'o_capa', act: 3,
    find: 'Você enfia a pata na capa sem pensar e acha um bolso do lado esquerdo. Costurado torto, com linha de outra cor. Você nunca tinha reparado nele.' },
  { id: 'selo', name: 'O Selo', obj: 'o_selo', act: 3, boss: 'maelontra',
    find: 'Quando a Mãe Lontra para de cantar, uma escama de cinza, ainda morna, escorrega das patas dela e cai perto das suas.' }
];
const MEMORY_BY_ID = Object.fromEntries(MEMORIES.map(m => [m.id, m]));

const PHASE_TWO_LINES = ['Vaelgrath cai de joelhos... e levanta.', 'Não é mais ele. Uma coisa verde escorre dos olhos do dragão.', 'As máscaras no seu rosto começam a rachar.'];

const TAMSIN_LINE = 'Eu deixei a luz acesa pra você, Bram.';

// tier: 0 (nenhuma memória) · 1 (1–2) · 2 (3–5) · 3 (6–7) · 4 (todas)
const memTier = n => n >= 8 ? 4 : n >= 6 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0;

// talk[tier] é uma lista de conversas; cada visita usa a próxima. carry: reação a um objeto que Bram carrega.
const NPCS = {
  ysolde: { name: 'Madame Ysolde', title: 'a Raposa Cartógrafa', art: 'ysolde', portrait: 'p_ysolde', place: 'Barraca de Mapas',
    talk: [
      [['Ah! Cliente! Entra, entra, não repara a bagunça.', 'Mapa, carta, máscara, vela... vela não, vela acabou.', '~Primeira vez por aqui, né? Nunca vi essa cara na vida.', '*Ela pisca rápido demais.', 'Enfim! Olha à vontade. Só não encosta nos mapas da parede, que a tinta tá fresca.'],
       ['Você tem cara de quem se perde fácil. Sem ofensa! Eu vendo mapa, eu reparo nessas coisas.', '*Os olhos dela param no baralho preso no seu cinto.', '...Bonito, esse baralho. Achou onde?', '*Você não responde. Ela muda de assunto na hora.', 'Ó, chegou carta nova. Quer dizer, velha. Mas nova pra você.'],
       ['Pro norte fica a montanha de cinza. Eu não iria.', 'E não é conselho de vendedora, não, que eu ganho mais se você for. É conselho mesmo.']],
      [['Voltou! Eu sabia. Quer dizer, todo mundo volta. O bosque é pequeno.', '~Trilha até o lago? Não tem trilha até o lago. Nunca teve.', '*O lampião treme. Ela finge que não viu.'],
       ['*Num canto de um mapa tem uma mancha de tinta: uma patinha pequena, carimbada sem querer.', 'Ah, isso. Mapa velho. Alguém meteu a pata na tinta fresca e saiu carimbando tudo.', 'Eu fiquei uma fera. Depois deixei.']],
      [['Sabe, eu fazia mapa pra duas pessoas. Uma delas segurava de cabeça pra baixo e jurava que tava certo.', 'E o pior é que chegava. Sempre chegava.', '*Ela ri, e a risada acaba antes da hora.'],
       ['Você tá comendo direito? Desculpa. Não é da minha conta.', '*Ela dobra e desdobra o mesmo mapa.', 'É que me pediram pra ficar de olho em você. Faz tempo já.']],
      [['Você tá diferente. Mais... você.', '*Ela começa a falar alguma coisa três vezes. Desiste nas três.', 'Leva um mapa. Por conta da casa. Não discute comigo.']],
      [['Bram.', '*É a primeira vez que ela fala seu nome sem medo.', 'Ela ia odiar te ver com essa capa imunda. Vai lá. Eu fico esperando aqui. Eu sempre espero.']]
    ],
    carry: {
      fita: ['*Ysolde vê a fita vermelha e perde a cor.', '~Fita comum. Vende em qualquer feira.', '*Ela não consegue parar de olhar pra fita.'],
      pegadas: ['Ela andava na frente. Sempre na frente, toda torta, e você atrás arrumando o caminho.', '*Ysolde tapa a boca.', '~Ninguém. Falei por falar.'],
      carta: ['*Ela reconhece o selo da Ordem e vira a cara.', 'Guarda isso. No bolso de dentro, do lado esquerdo.', 'Não pergunta como eu sei qual bolso.'],
      capa: ['Essa capa sempre ficou grande em você. Ela dizia que você ainda ia crescer.', '*Ysolde engole o resto da frase.']
    } },
  tobias: { name: 'Tobias', title: 'o Texugo Ferreiro', art: 'tobias', portrait: 'p_tobias', place: 'Forja do Tobias',
    talk: [
      [['Hm.', '*Ele pega seu baralho sem pedir licença e olha carta por carta.', 'Tá mal cuidado.', '*Quando devolve, as bordas estão mais retas.'],
       ['Martelo ou lixa?', '*Você não responde.', 'Lixa, então.']],
      [['...', '~Não conheço essa carta.', '*Mas o polegar dele passa devagar pela carta apagada, como se soubesse cada risco dela.'],
       ['Tá dormindo?', '*Ele não espera resposta.', 'Dorme. Bicho que não dorme vira Corrompido.']],
      [['Você segura o martelo errado. Sempre segurou.', '*Ele percebe o que falou e bate na bigorna com mais força do que precisava.']],
      [['Essa camada de verniz é pra não molhar no rio.', '*Você não tinha perguntado nada.', 'Ela vivia derrubando o baralho no rio.']],
      [['...', '*Tobias devolve o baralho e, pela primeira vez, olha nos seus olhos.', 'Ficou do jeito que ela gostava.']]
    ],
    carry: {
      xicara: ['*Ele pega a xícara rachada sem pedir.', '*Quando devolve, a rachadura tem um fio de metal dourado por dentro.', 'Ela odiava coisa quebrada indo pro lixo.'],
      anzol: ['Esse nó fui eu que ensinei.', 'Ela aprendeu errado.', '*Ele quase sorri.', 'Ficou melhor que o meu.']
    } },
  perpetua: { name: 'Irmã Perpétua', title: 'a Coruja Eremita', art: 'perpetua', portrait: 'p_perpetua', place: 'Capela em Ruínas',
    talk: [
      [['Hein? Fala mais alto, menino.', '*Você não fala nada.', 'Ah. É você. Senta aí. Não, aí não, aí tem goteira.'],
       ['Os Seladores rezavam aqui antes de cada caçada. Em dupla. Sempre em dupla.', 'Você tem cara de quem já rezou em dupla.']],
      [['Você ainda pesca?', '*Ela ri da própria pergunta. Depois para de rir.', 'Esquece. Velha fala muita besteira.'],
       ['Você ainda dorme do lado direito da cama?', '*Ela não espera resposta. Já sabe.']],
      [['O selo é feito de alma, sabia? Uma alma inteira. Dada de vontade própria, senão não segura.', '~De quem é o selo do dragão? Ninguém sabe, menino. Ninguém sabe.']],
      [['Uma vez me pediram pra não deixar você sozinho.', '*Ela olha pro lampião, não pra você.', 'E eu deixei. Vinte anos rezando, e fui fazer justo isso.']],
      [['Vai, menino.', '*Ela aperta sua pata com a garra velha.', 'E come alguma coisa antes de subir aquela montanha.']]
    ],
    carry: {
      anzol: ['Ela nunca pegou um peixe pra ela. Nenhum. Dava tudo pra você.', '*Perpétua cobre o bico com a asa. Ela disse "ela".'],
      capa: ['Esse bolso fui eu que ensinei a costurar. Ela costurava torto.', 'Mas segura bem, não segura?'],
      selo: ['*Ela vê a escama de cinza e se ajoelha, devagar. Os joelhos estalam.', 'Ai. Dá aqui, menino. Deixa eu segurar um pouquinho.']
    } },
  marga: { name: 'Dona Marga', title: 'a Jabuti do Achados e Perdidos', art: 'marga', portrait: 'p_marga', place: 'Achados e Perdidos',
    talk: [
      [['Bem-vindo ao Achados e Perdidos. Tudo que o bosque perde vem parar aqui. Uma hora ou outra.', 'Eu também vim parar aqui. Faz cento e doze anos.', '*Ela ri tão devagar que você não sabe se é riso.'],
       ['O preço tá na etiqueta. Fui eu que escrevi, então pode chorar.', '*Você não chora. Os preços continuam iguais.']],
      [['Coelho branco, capa azul... você não era o que vinha aqui comprar anzol?', '*Ela coça a cabeça com a pata da frente.', 'Não, era a outra. Ou era você. Na minha idade todo mundo vira uma pessoa só.']],
      [['Sabe o que mais chega aqui? Coisa de quem foi embora sem avisar.', 'Chave, chapéu, carta. As pessoas deixam tudo pra trás, menos o que pesa.', '*Ela olha pro baralho no seu cinto.']],
      [['Tem uma coisa sua aqui faz anos. Eu não vendo.', '*Ela não diz o que é. Não mostra.', 'Quando você lembrar, você pede.']],
      [['Achei que nunca mais ia te ver passar dessa porta.', 'Leva o que quiser. Fiado. Eu sei que você paga.', '*Ela dá uma piscadinha bem lenta, de jabuti.']]
    ],
    carry: {
      fita: ['Fita vermelha! Essa eu vendi. Pra uma lontra que não sabia dar laço.'],
      xicara: ['Xícara colada com ouro. Coisa de quem não sabe largar nada. Gosto de gente assim.'],
      mapa: ['Esse mapa já passou por aqui. Duas vezes. As duas vezes alguém voltou correndo pra buscar.']
    } },
  pip: { name: 'Pip', title: 'a Esquilinha', art: 'pip', portrait: 'p_pip' },
  gaspar: { name: 'Gaspar', title: 'o Pombo Carteiro', art: 'gaspar', portrait: 'p_gaspar' }
};

// A carta que o Gaspar carrega há anos. Só chega quando Bram está pronto para ler.
const GASPAR_LETTER = [
  'Bram,',
  'Se o Gaspar te entregou isso, é porque você abriu a porta. Já é alguma coisa.',
  'Eu não vou voltar da montanha. Desculpa não ter falado na sua cara. Eu ia chorar, você ia fazer aquela cara, e eu ia desistir. E alguém precisa segurar o dragão.',
  'Deixei o baralho na gaveta. Usa. Você sempre jogou melhor que eu, só não gostava de ganhar de mim.',
  'Deixei a luz acesa também. Ela sabe o caminho. Eu sempre errava o norte, lembra? Pois é. Agora não erro mais.',
  'Não precisa ficar triste pra sempre. Só um pouco. Depois lava a minha xícara e usa ela, que é a mais bonita.',
  'T.',
  'P.S.: o bolso da capa, do lado esquerdo. Costurei torto, mas segura.'
];

const REFLECTIONS = [
  ['O fogo estala e você quase escuta um nome. Quase.', 'Você não lembra de ter andado tanto. As patas lembram. Elas doem.', 'Você esquenta as patas e, sem querer, deixa espaço do lado pra mais alguém sentar.'],
  ['Você abre o baralho perto do fogo. No verso de uma carta, alguém desenhou uma lontrinha de caneta. Mal desenhada.', 'O lampião chega perto do fogo como se também sentisse frio.'],
  ['Você lembra de uma risada. Alta, meio roncada. O rosto ainda não.', 'Tem uma música presa na sua cabeça. Você não sabe a letra, só o "lá-rá-rá".'],
  ['Você abre a boca pra dizer alguma coisa pro fogo. Não sai nada. Mas, pela primeira vez, quase sai.'],
  ['O fogo tá baixo. Você põe mais um galho. E mais um. Ela gostava de fogueira alta.']
];

// Começo de cada ciclo depois do primeiro (o primeiro tem a cena de abertura).
const INTRO = [
  ['Bram acorda na borda do bosque, com folha seca grudada na capa.', 'O lampião está do lado dele, aceso. Parece aliviado.'],
  ['De novo a borda do bosque. De novo o frio no nariz.', 'Mas dessa vez sobrou alguma coisa: um gosto de chá de casca de árvore, que ele nem gosta.'],
  ['Bram acorda e, antes de abrir os olhos, já sabe onde está.', 'O lampião espera. Ele sempre espera.']
];

const DEATH_LINES = [
  'O bosque fecha os olhos de Bram com cuidado, igual alguém cobrindo quem dormiu no sofá.',
  'A Podridão sobe pela capa. O lampião não apaga. Ele nunca apaga.',
  'Bram cai. Ia ser tão mais fácil esquecer.',
  'O frio chega primeiro nas orelhas. Alguém, um dia, esquentava essas orelhas com as patas.'
];

// Lugares de "Estranheza" no mapa.
const EVENTS = {
  poco: { title: 'O Poço que Respira', art: 'wellman',
    text: 'Não tem corda nem balde. Mesmo assim, a água sobe e desce devagar, igual barriga de quem dorme.',
    choices: [
      { label: 'Jogar 15 lascas lá dentro (cura 10)', need: r => r.lascas >= 15, fx: { lascas: -15, heal: 10 }, out: 'A água sobe até a borda e devolve um calorzinho que você nem sabia que tinha perdido.' },
      { label: 'Olhar lá dentro (uma carta rara, Podridão +8)', fx: { rareCard: true, rot: 8 }, out: 'Lá no fundo, um coelho igualzinho a você te olha de volta. Ele te entrega uma carta e afunda sem fazer barulho.' },
      { label: 'Seguir em frente', fx: {}, out: 'Você deixa o poço respirando sozinho.' }
    ] },
  cogumelos: { title: 'O Círculo de Cogumelos', art: 'mushroom',
    text: 'No meio do círculo, uma voz com o seu jeito de falar (você nem lembrava que tinha um jeito) diz: "Tá cansado, né? Põe um rosto que não doa."',
    choices: [
      { label: 'Aceitar um rosto (escolher uma Máscara)', fx: { maskChoice: true }, out: 'O rosto encaixa perfeito. É isso que dá medo.' },
      { label: 'Recusar (Lampião +1)', fx: { light: 1 }, out: 'Você sai do círculo. O lampião chega mais perto, todo contente.' }
    ] },
  carrinho: { title: 'O Carrinho Virado', art: 'i_event',
    text: 'Um carrinho de mão tombado no meio da trilha. Não tem pegada nenhuma em volta. Só arranhão de garra no fundo.',
    choices: [
      { label: 'Revirar a carga', fx: { gamble: true }, out: '' },
      { label: 'Seguir em frente', fx: {}, out: 'Tem coisa que é melhor deixar virada.' }
    ] },
  espelho: { title: 'O Espelho d\'Água', art: 'otterpup',
    text: 'Uma poça tão parada que parece vidro. Reflete a lua. E reflete você.',
    choices: [
      { label: 'Tirar uma máscara diante do reflexo (Lampião +1)', hide: true, need: r => r.masks.length > 0, fx: { dropMask: true, light: 1 }, out: 'Por baixo, o rosto ainda é seu. Mais cansado, mas seu.' },
      { label: 'Encarar o próprio rosto (cura 6, Lampião +1)', hide: true, need: r => r.masks.length === 0, fx: { heal: 6, light: 1 }, out: 'Um coelho branco de olheira funda. Por um segundo, quase dá pra reconhecer.' },
      { label: 'Não olhar', fx: {}, out: 'Você atravessa a poça sem olhar pra baixo. A lua se desmancha em ondinhas.' }
    ] },
  lama: { title: 'Cartas na Lama', art: 'tracks',
    text: 'Cartas espalhadas na lama, como se alguém tivesse saído correndo. Algumas ainda brilham fraquinho.',
    choices: [
      { label: 'Recolher uma (escolher entre duas)', fx: { cardChoice: 2 }, out: '' },
      { label: 'Enterrar uma carta sua (remover)', fx: { removeCard: true }, out: '' }
    ] },
  seladora: { title: 'O Eco de uma Seladora', art: 'i_elite',
    text: 'Entre as árvores, a sombra de uma Seladora treina golpes no ar. Ela segura as cartas do mesmo jeito que você.',
    choices: [
      { label: 'Treinar com ela (−6 de vida, melhora uma carta)', need: r => r.hp > 6, fx: { hp: -6, upgrade: true }, out: 'Ela corrige sua postura sem encostar em você. Depois vira cinza.' },
      { label: 'Só olhar (Lampião +1)', fx: { light: 1 }, out: 'No fim, ela faz uma reverência pra alguém do seu lado. Não tem ninguém do seu lado.' }
    ] },
  altar: { title: 'O Altar de Nomes', art: 'i_perpetua',
    text: 'Uma pedra coberta de musgo, cheia de nomes entalhados. Um deles foi raspado de propósito, com força.',
    choices: [
      { label: 'Raspar o musgo do nome apagado', fx: { altar: true }, out: '' },
      { label: 'Deixar 10 lascas de oferenda (cura 6)', need: r => r.lascas >= 10, fx: { lascas: -10, heal: 6 }, out: 'As lascas brilham um instante em cima da pedra.' }
    ] },
  jogatina: { title: 'A Jogatina dos Corvos', art: 'crow',
    text: 'Três corvos jogam carta em cima de um toco. Um deles rouba na cara dura. Eles abrem espaço pra você sentar.',
    choices: [
      { label: 'Apostar 20 lascas (metade das vezes, volta 45)', need: r => r.lascas >= 20, fx: { bet: 20 }, out: '' },
      { label: 'Mostrar um truque com o baralho (Lampião +1)', fx: { light: 1 }, out: 'Você embaralha sem pensar, com um movimento que as suas patas lembram melhor que você. Os corvos ficam quietos. O lampião pula de alegria.' },
      { label: 'Seguir', fx: {}, out: 'Um dos corvos grita "medroso!" quando você vira as costas.' }
    ] },
  ninho: { title: 'O Ninho Caído', art: 'sparrow',
    text: 'Um ninho caído no chão, com um ovo inteirinho dentro. Do lado do ovo, uma coisinha brilhando que algum passarinho guardou.',
    choices: [
      { label: 'Devolver o ninho pro galho (Lampião +1)', fx: { light: 1 }, out: 'Você sobe, devolve o ninho e desce sujo de musgo. Lá em cima, alguém pia baixinho.' },
      { label: 'Pegar o que brilha (uma relíquia, Podridão +6)', fx: { relic: true, rot: 6 }, out: '' }
    ] },
  caixinha: { title: 'A Caixinha de Música', art: 'bell',
    text: 'Meio enterrada na terra, uma caixinha de música ainda toca. Ela trava sempre na mesma nota.',
    choices: [
      { label: 'Desenterrar (−7 de vida, escolhe entre 2 relíquias)', need: r => r.hp > 7, fx: { hp: -7, relicChoice: 2 }, out: '' },
      { label: 'Deixar tocar (cura 8)', fx: { heal: 8 }, out: 'Você senta e escuta até a corda acabar. A nota que trava é sempre a mesma. Você sabe qual vem depois.' }
    ] }
};

// Encontros no caminho entre um lugar e outro. "npc" toca uma conversa antes das escolhas.
// act: em quais atos pode aparecer · once: só uma vez por jornada.
const TRAILS = {
  ponte: { title: 'A Ponte Podre', art: 'root', acts: [1, 2, 3],
    text: 'A ponte sobre o riacho está mole de podre. Duas tábuas já caíram. A outra margem fica logo ali.',
    choices: [
      { label: 'Atravessar correndo (−5 de vida)', need: r => r.hp > 5, fx: { hp: -5 }, out: 'Uma tábua quebra bem quando você pisa. Você chega do outro lado com a perna arranhada e o coração na boca.' },
      { label: 'Dar a volta pela margem (Podridão +5)', fx: { rot: 5 }, out: 'A volta é comprida e cheira a lodo. Mas você chega seco.' }
    ] },
  arvore: { title: 'Árvore Atravessada', art: 'bark', acts: [1, 2, 3],
    text: 'Um tronco enorme caiu atravessado na trilha. No alto dele tem um ninho abandonado, e alguma coisa brilha lá dentro.',
    choices: [
      { label: 'Escalar por cima (−3 de vida, 12 lascas)', need: r => r.hp > 3, fx: { hp: -3, lascas: 12 }, out: 'Lá em cima, 12 lascas guardadas por algum passarinho muito econômico.' },
      { label: 'Contornar pelo mato (Podridão +2)', fx: { rot: 2 }, out: 'O mato é fechado e cheio de espinho. Mas ninguém se machuca.' }
    ] },
  vagalumes: { title: 'Vagalumes Acesos', art: 'firefly', acts: [1, 3],
    text: 'Vagalumes de verdade, acesos, vivos. Eles fazem uma fila no ar, saindo da trilha, como se quisessem mostrar alguma coisa.',
    choices: [
      { label: 'Seguir os vagalumes (Lampião +1, Podridão +4)', fx: { light: 1, rot: 4 }, out: 'Eles te levam até uma clareira pequena, giram em volta do lampião e vão embora. O lampião fica todo cheio de si.' },
      { label: 'Ficar na trilha', fx: {}, out: 'Os vagalumes esperam um pouco. Depois apagam, um por um.' }
    ] },
  chuva: { title: 'Chuva de Cinza', art: 'ember', acts: [2, 3],
    text: 'Começa a cair cinza do céu, fina, igual neve suja. Tem uma pedra grande que dá abrigo, e um caixote caído mais à frente.',
    choices: [
      { label: 'Esperar debaixo da pedra (cura 5)', fx: { heal: 5 }, out: 'Você espera a chuva passar abraçado no lampião. Até cochila um pouco.' },
      { label: 'Ir até o caixote na chuva (+14 lascas, Podridão +3)', fx: { lascas: 14, rot: 3 }, out: 'Dentro do caixote, um punhado de lascas e uma meia de lã sem par.' }
    ] },
  fogueira: { title: 'A Fogueira de Alguém', art: 'i_camp', acts: [1, 2, 3],
    text: 'Uma fogueira ainda morna, sem ninguém em volta. Tem uma panela com sopa pela metade em cima das brasas.',
    choices: [
      { label: 'Tomar a sopa (cura 8, Podridão +3)', fx: { heal: 8, rot: 3 }, out: 'Tem gosto de musgo e de pimenta demais. Você toma tudo.' },
      { label: 'Reacender o fogo pra quem voltar (Lampião +1)', fx: { light: 1 }, out: 'Você sopra as brasas até o fogo pegar de novo. Quem voltar vai achar quentinho.' }
    ] },
  trocador: { title: 'O Corvo Trocador', art: 'crow', acts: [2, 3],
    text: 'Um corvo de colete pula na sua frente. "Troca? Troca? Uma sua, aleatória, por uma das minhas. Das boas!"',
    choices: [
      { label: 'Trocar (uma carta aleatória sua por uma rara)', fx: { swapRare: true }, out: '' },
      { label: 'Recusar', fx: {}, out: '"Pão-duro!", ele grita, e sai pulando.' }
    ] },
  toca: { title: 'A Toca Funda', art: 'mole', acts: [1, 2, 3],
    text: 'Uma toca funda no barranco. Lá dentro, alguma coisa brilha. Ou alguma coisa tem olhos.',
    choices: [
      { label: 'Enfiar a pata (pode ser uma relíquia, pode ser uma mordida)', fx: { burrow: true }, out: '' },
      { label: 'Deixar quieto', fx: {}, out: 'De dentro da toca, alguém resmunga "obrigado".' }
    ] },
  placa: { title: 'A Placa Virada', art: 'tracks', acts: [1, 2, 3],
    text: 'Uma placa de madeira caída de cara no chão, com setas pintadas. Alguém virou de propósito.',
    choices: [
      { label: 'Desvirar a placa (o mapa deste trecho aparece inteiro)', fx: { reveal: true }, out: 'As setas apontam pra todos os lugares deste trecho do bosque. Agora você sabe o que vem pela frente.' },
      { label: 'Deixar como está', fx: {}, out: 'Se alguém virou, deve ter tido motivo.' }
    ] },

  // ----- Pip, a esquilinha: uma vez por ato -----
  pip1: { npc: 'pip', once: true, acts: [1], title: 'Pip', art: 'pip',
    talk: () => ['Tio Bram! Tio Bram! Joga comigo? Só uma!', '*Uma esquilinha pula do galho bem na sua frente. Ela já está embaralhando. Muito mal.', 'Você sempre deixava eu ganhar. Hoje não precisa, eu treinei.', 'Cadê a tia? Ela prometeu me ensinar o truque da carta que some.', '*Você não sabe de que tia ela está falando. O lampião sabe: ele chega mais perto dela.'],
    text: 'Pip espera, com as cartas na mão e o rabo balançando.',
    choices: [
      { label: 'Jogar uma partida (você perde, ela te dá um pião)', fx: { gift: 'piao', light: 1 }, out: '"GANHEI!" Pip pula tanto que derruba metade do baralho. De prêmio, ela te dá o pião dela. "É de consolação, tio."' },
      { label: 'Fazer um carinho na cabeça dela e seguir (cura 4)', fx: { heal: 4 }, out: '"Tá bom, mas na volta você joga." Ela sobe correndo no galho e fica te olhando até você sumir.' }
    ] },
  pip2: { npc: 'pip', once: true, acts: [2], title: 'Pip', art: 'pip',
    talk: () => ['Tio! Você tá muito longe de casa.', 'Minha mãe falou que não é pra eu vir até as ruínas. Eu vim mesmo assim.', 'Ela também falou que a tia não volta mais.', 'Mas ela falou que dragão não existe, e olha lá a montanha soltando fumaça.', '*Pip aponta pro norte com a cara mais séria do mundo.'],
    text: 'Pip balança os pés sentada numa pedra.',
    choices: [
      { label: 'Dar uma carta sua de presente (remove uma carta, Lampião +1)', fx: { giveCard: true, light: 1 }, out: '' },
      { label: 'Apontar o caminho de casa (cura 4)', fx: { heal: 4 }, out: 'Ela mostra a língua, mas vai. Antes de sumir, grita: "Volta, viu?"' }
    ] },
  pip3: { npc: 'pip', once: true, acts: [3], title: 'Pip', art: 'pip',
    talk: () => memTier(memCount()) >= 4
      ? ['Tio Bram...', '*Pip está sentada na lama, abraçada nos joelhos.', 'Você lembra o nome dela? Eu esqueci.', 'Eu tenho medo de esquecer a tia de vez.', '*Você abre a boca. Ainda não sai nada. Mas você segura a patinha dela, e ela entende.']
      : ['Tio Bram... eu me perdi.', '*Os olhos dela estão vermelhos de chorar, mas ela jura que é poeira.', 'A tia sempre achava o caminho. Mesmo com o mapa de cabeça pra baixo.', 'Você me leva até a trilha? Só até a trilha.'],
    text: 'Pip estende a pata pra você.',
    choices: [
      { label: 'Levar Pip até a trilha (−6 de vida no caminho, Lampião +2)', need: r => r.hp > 6, fx: { hp: -6, light: 2 }, out: 'O caminho até a trilha é longo e cheio de bicho. Pip não solta sua pata nenhuma vez. Na trilha, ela te abraça e sai correndo pra casa.' },
      { label: 'Mostrar a direção e seguir (Podridão +5)', fx: { rot: 5 }, out: 'Ela vai. Olha pra trás três vezes. Você fica com aquilo na cabeça.' }
    ] },

  // ----- Gaspar, o pombo carteiro -----
  gaspar1: { npc: 'gaspar', once: true, acts: [2], title: 'Gaspar', art: 'gaspar',
    talk: () => ['Correspondência! Correspondência pra...', '*Um pombo de quepe azul confere um envelope amarelado. Confere você. Confere o envelope de novo.', 'Bram. Toca do Salgueiro, número dois. É você, né?', '*Você faz que sim com a cabeça.', 'Certo. Certo, certo. Então... não. Ainda não.', 'Regulamento dos Correios do Bosque, artigo nove: carta só se entrega pra quem vai ler.', 'E você não ia ler. Você nunca abriu a porta. Eu bati onze vezes.'],
    text: 'Gaspar aperta a bolsa contra o peito.',
    choices: [
      { label: 'Estender a pata pro envelope', fx: { lascas: 15 }, out: '"Não, não, não. Ainda não." Ele te dá 15 lascas, sem graça. "Multa por entrega atrasada. Regulamento."' },
      { label: 'Deixar ele ir', fx: {}, out: '"Eu volto", ele diz. "Eu sempre volto. É o trabalho."' }
    ] },
  gaspar2: { npc: 'gaspar', once: true, acts: [3], title: 'Gaspar', art: 'gaspar',
    talk: () => ['Sou eu de novo. Gaspar. Dos Correios.', '*Ele está ofegante e sujo de lama até o quepe.', 'Faz três anos que eu carrego essa carta. Pesa mais que a bolsa inteira.',
      memTier(memCount()) >= 3 ? 'Mas você tá quase lá. Eu sinto pela bolsa: ela tá mais leve.' : 'Ainda não dá. Desculpa. Você ainda não ia ler.'],
    text: 'O charco é fundo, e a bolsa dele é pesada.',
    choices: [
      { label: 'Carregar a bolsa um pedaço (−4 de vida, Lampião +1)', need: r => r.hp > 4, fx: { hp: -4, light: 1 }, out: '"Regulamento proíbe, mas o regulamento não conhece esse charco." Vocês atravessam juntos.' },
      { label: 'Seguir', fx: {}, out: '"Até a montanha, então", ele diz, e sai voando baixo.' }
    ] }
};

const ENDINGS = {
  esquecer: { title: 'Esquecer', scene: 'void', song: 'sad',
    lines: ['Bram desvia o olhar.', 'O selo trinca igual gelo fino.', 'A Podridão sobe pelas raízes, pelos troncos, pela alça do lampião.', 'No bosque de Morrow tem mais um Corrompido sem nome.', 'Ele faz a mesma ronda toda noite e nem repara que o mundo acabou.'] },
  carregar: { title: 'Lembrar e Carregar', scene: 'forest', song: 'memory',
    lines: ['Bram segura a carta.', 'Dói igual ao primeiro dia.', 'Mas o selo bebe dessa dor e fica firme.', 'Vaelgrath fecha os olhos e dorme. Fazia anos que ele não dormia.', 'O bosque não floresce. Mas para de morrer.', 'Bram volta pra casa carregando um baralho que não é dele. Agora ele sabe de quem é.'] },
  nome: { title: 'Dizer o Nome Dela', scene: 'bloom', song: 'bloom',
    lines: ['Bram abre a boca.', 'Faz anos que ele não fala. A voz sai rachada, igual xícara colada.', '"Tamsin."', 'O lampião explode em luz.', 'O selo não quebra. Ele se completa.', 'A Podridão recua, raiz por raiz.', 'Na primavera seguinte, o bosque de Morrow floresce de um jeito meio exagerado. Ela ia achar graça.', 'Às vezes a Pip aparece pra jogar carta. Bram deixa ela ganhar. Quase sempre.', 'Na janela da toca tem duas xícaras. Uma fica vazia. Ele já consegue olhar pra ela.'] }
};

const ACT_INFO = {
  1: { name: 'A Borda de Morrow', scene: 'forest', amb: 'forest' },
  2: { name: 'As Ruínas da Ordem', scene: 'ruins', amb: 'chapel' },
  3: { name: 'O Charco das Mães', scene: 'swamp', amb: 'swamp' },
  4: { name: 'O Covil de Vaelgrath', scene: 'lair', amb: 'lair' }
};

// Frases da troca de ato.
const ACT_LINES = {
  2: ['O Cervo de Musgo deita entre as raízes e, pela primeira vez, para de fazer a ronda.', 'Mais pra frente, as ruínas de uma capela da Ordem dos Seladores.', 'Você conhece o caminho. Só não sabe de onde.'],
  3: ['As ruínas ficam pra trás, quietas.', 'O chão vira lama. O ar cheira a rio parado.', 'Em algum lugar do charco, alguém canta uma música que você conhece.'],
  4: ['A Mãe Lontra dorme cantando.', 'A trilha sobe pra montanha de cinza.', 'Lá em cima, uma coisa enorme respira devagar, igual o poço.']
};
