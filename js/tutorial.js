'use strict';
// Tutorial do menu inicial: páginas ilustradas com peças reais do jogo.

const TUTORIAL = (() => {
  const c = (id, up) => UI.card({ id, uid: 't' + id, up });
  const slot = (inner, label = '') => `<div class="slot" style="position:relative">${label ? `<span class="link" style="left:-4px">${label}</span>` : ''}${inner}</div>`;
  const souls = (lit, total = 6) => `<div class="bag" style="min-width:0"><div class="souls">${Array.from({ length: total }, (_, k) => `<img class="px" src="${SPR.url(k < lit ? 'u_soul' : 'u_soulempty')}" style="width:22px;height:22px">`).join('')}</div><div class="lbl">Saco de Almas</div></div>`;

  const PAGES = [
    { title: 'O ciclo', demo: () => `${SPR.img('bram', 5)}<div style="display:flex;flex-direction:column;align-items:center;gap:6px">${LAMP.html(5)}<span class="dim">o Lampião</span></div>`,
      text: `<p>Bram acorda na borda do bosque de Morrow sem saber quem é. Cada jornada atravessa três trechos do bosque até o covil de <b class="gold">Vaelgrath</b>.</p>
        <p>Se Bram cair, ele acorda de novo na borda. <b>Cartas, lascas e máscaras se perdem.</b> As <b class="gold">memórias</b>, o que os amigos sabem e os segredos do mapa ficam.</p>` },
    { title: 'O Saco de Almas', demo: () => `${souls(3)}<div class="dim" style="width:100%;text-align:center">3 almas para gastar</div>${c('lobo')}${c('casco')}`,
      text: `<p>Cada carta é uma alma selada, e <b>jogar uma carta custa 1 alma</b> do Saco.</p>
        <p>Você começa o combate com <b>3 almas</b> e ganha <b>+${SOULS_PER_ROUND} a cada rodada</b>. As que sobram ficam guardadas, até <b>${BAG_MAX}</b>.</p>
        <p>Gastar tudo agora ou guardar para uma Fila maior na próxima rodada? Essa é a decisão central do combate.</p>
        <p class="dim">Mais adiante, o Rito da capela aumenta as almas por rodada, e cada chefe vencido faz o Saco crescer.</p>` },
    { title: 'Lendo uma carta', demo: () => `${UI.card({ id: 'urso', uid: 'tu' }, { cls: 'big' })}<div class="tut-legend"><div>${SPR.img('u_soul', 3)} gotas azuis: quantas almas ela custa</div><div>${SPR.img('s_atk', 3, { ink: true })} canto esquerdo: dano</div><div>${SPR.img('s_def', 3, { ink: true })} canto direito: Guarda</div><div>${SPR.img('s_quebra', 3, { ink: true })} no meio: os sigilos (efeitos)</div></div>`,
      text: `<p>Cada carta mostra o essencial sem precisar ler: <b>quanto custa</b> (gotas no canto), <b>quanto bate</b> e <b>quanto protege</b> (cantos de baixo) e seus <b>sigilos</b>, os símbolos do meio.</p>
        <p>As cartas mais fortes custam <b>2 almas</b>. Passe o mouse ou segure o dedo numa carta para ler o texto completo.</p>
        <p class="dim">Os sigilos se repetem entre cartas: o alvo é Marca, a chama é Brasa, a seta para baixo é Fraqueza...</p>` },
    { title: 'A Fila', demo: () => `<div class="fila tut-fila">${slot(c('coruja'))}<span class="arrow">›</span>${slot(c('lobo'), 'Cerco')}<span class="arrow">›</span>${slot(c('rato'), 'Eco')}</div>`,
      text: `<p>Você coloca cartas na <b>Fila</b>, que tem até <b>5 espaços</b>. Quando aperta <b>Selar</b>, elas ativam <b>da esquerda para a direita</b>.</p>
        <p>A ordem muda tudo: a Coruja Marca o inimigo e o Lobo, logo depois, aproveita a Marca para causar +3.</p>
        <p>Antes de selar, a <b>prévia</b> mostra exatamente o dano, a guarda e os combos da rodada. Ao <b>Selar</b>, as almas são fechadas nas cartas e a Fila dispara.</p>` },
    { title: 'Naipes', demo: () => ['rato', 'casco', 'morcego', 'salamandra', 'lampejo'].map(id => c(id)).join(''),
      text: `<p><b style="color:${SUITS.presa.color}">Presa</b> ataca. <b style="color:${SUITS.casca.color}">Casca</b> dá Guarda, que absorve o golpe do inimigo nesta rodada.</p>
        <p><b style="color:${SUITS.sombra.color}">Sombra</b> enfraquece (Marca, Fraqueza, Exposto, Atordoar). <b style="color:${SUITS.cinza.color}">Cinza</b> queima com Brasa, que fere no fim da sua vez.</p>
        <p><b style="color:${SUITS.memoria.color}">Memória</b> é curinga: conta como o naipe da carta anterior.</p>` },
    { title: 'Combos', demo: () => `<div class="fila">${slot(c('rato'))}${slot(c('lobo'), 'Eco')}${slot(c('doninha'), 'Ressonância')}</div><div class="dim" style="width:100%;text-align:center;font-size:18px">A Roda: Sombra → Presa → Cinza → Casca → Sombra</div>`,
      text: `<p>Quando duas ou mais cartas formam um combo, uma <b>corrente colorida</b> liga as cartas antes mesmo de você selar. Na hora, elas brilham juntas e o nome do combo aparece.</p><div class="combo-list">
        <div><b>Eco</b>: duas do mesmo naipe seguidas, a segunda ganha +2. <b>Ressonância</b>: três seguidas, +4 e um bônus do naipe.</div>
        <div><b>A Roda</b>: cada naipe alimenta o próximo. Sombra→Presa é <b>Cerco</b> (atravessa couraça), Presa→Cinza é <b>Fagulha</b>, Cinza→Casca é <b>Têmpera</b>, Casca→Sombra é <b>Emboscada</b>.</div>
        <div><b>Roda Completa</b>: quatro seguindo a Roda devolvem 1 alma e causam 6 de dano. <b>Selo Pleno</b>: encher os 5 espaços dobra a quinta carta.</div></div>` },
    { title: 'Intenções e estados', demo: () => `<div class="intent k-atk">${SPR.img('u_atk', 2)}<span class="num">7</span><span class="lbl">Mordida</span></div><div class="intent k-block">${SPR.img('u_armor', 2)}<span class="num">8</span><span class="lbl">Enraizar</span></div>
        <div class="sts" style="width:100%">${['marca', 'fraqueza', 'exposto', 'brasa', 'atordoado', 'bolor', 'culpa'].map(k => `<span class="st">${SPR.icon(STATUS_INFO[k].icon)} ${STATUS_INFO[k].name}</span>`).join('')}</div>`,
      text: `<p>O inimigo sempre <b>anuncia</b> o que vai fazer. Use isso para decidir entre atacar e se proteger.</p>
        <p>A <b>Guarda</b> some no fim da rodada. A <b>couraça</b> do inimigo dura até ele agir de novo. <b>Fraqueza</b> reduz o próximo ataque. <b>Brasa</b> queima e diminui 1 por rodada.</p>
        <p>Passe o mouse ou segure o dedo em qualquer ícone para ver o que ele faz.</p>` },
    { title: 'Máscaras e Podridão', demo: () => Object.values(MASKS).slice(0, 6).map(m => SPR.img(m.art, 4)).join(''),
      text: `<p>As <b>Máscaras</b> são os rostos que Bram inventou para não ser ele mesmo. Cada uma dá um poder, mas <b>esconde algo</b>: a vida do inimigo, o texto das cartas, o próprio mapa...</p>
        <p>A <b>Podridão</b> do bosque sobe a cada passo, e muito mais rápido com máscaras. Com 30%, 60% e 90% os Corrompidos ficam mais fortes e a imagem fica mais gasta.</p>
        <p>Forte e fechado, ou fraco e aberto. A escolha é sua.</p>` },
    { title: 'Memórias e o Lampião', demo: () => `${MEMORIES.slice(0, 4).map(m => SPR.img(m.obj, 4)).join('')}${UI.card({ id: 'apagada', uid: 'tA' })}${LAMP.html(4)}`,
      text: `<p>Pelo bosque há <b class="gold">objetos de memória</b>. Ao encontrar um, você pode <b>Encarar</b> a lembrança (o Lampião cresce, a Podridão recua) ou <b>Desviar o olhar</b> (o bosque oferece uma Máscara no lugar).</p>
        <p>A <b>Carta Apagada</b> ganha força e um rosto a cada memória. E os amigos de Bram passam a falar diferente com ele...</p>
        <p>O Lampião pisca quando alguém mente pra você, e solta um "!" quando tem uma lembrança por perto.</p>` },
    { title: 'O mapa', demo: () => ['i_combat', 'i_elite', 'i_camp', 'i_ysolde', 'i_tobias', 'i_perpetua', 'i_marga', 'i_event', 'i_boss'].map(i => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:84px">${SPR.img(i, 4)}<span style="font-size:16px">${NODE_INFO[i.slice(2) === 'combat' ? 'combat' : i.slice(2)].name}</span></div>`).join(''),
      text: `<p>Escolha o caminho de baixo para cima. <b>Fogueiras</b> curam ou fortalecem o Lampião. <b>Ysolde</b> vende cartas, máscaras e mapas. <b>Tobias</b> melhora e remove cartas. A <b>capela</b> da Irmã Perpétua cura, purifica e tira máscaras. A <b>Dona Marga</b> vende <b>relíquias</b>: objetos perdidos que ajudam até o fim da jornada.</p>
        <p>Às vezes alguma coisa acontece <b>no caminho</b> entre um lugar e outro. Corrompidos fortes deixam Máscaras e relíquias. Cada trecho termina num <b>Guardião do Luto</b>.</p>` },
    { title: 'Controles', demo: () => `${c('coruja')}<div style="font-size:30px">→</div>${slot('<span class="num">1</span>')}`,
      text: `<p><b>Toque/clique</b> numa carta para colocá-la na Fila. <b>Toque</b> numa carta da Fila para devolvê-la. <b>Arraste</b> para trocar a ordem.</p>
        <p><b>Segure o dedo</b> ou passe o mouse sobre qualquer coisa para ver detalhes.</p>
        <p>No teclado: <b>1–6</b> colocam cartas, <b>Enter</b> sela, <b>Backspace</b> devolve a última.</p>
        <p class="narr">Boa jornada. Lembre-se do que puder.</p>` }
  ];

  function open(done) {
    let i = 0, anim = 0;
    const m = UI.modal('', { cls: 'tut', locked: true, onClose: () => { clearInterval(anim); META.tutorialSeen = true; saveMeta(); done && done(); }, on: {
      prev: () => { if (i > 0) { i--; draw(); } },
      next: (el, close) => { if (i < PAGES.length - 1) { i++; draw(); } else close(); },
      close: (el, close) => close()
    } });
    const box = $('.modal', m.el);
    function draw() {
      clearInterval(anim);
      const p = PAGES[i];
      AUDIO.sfx('page');
      box.innerHTML = `<header><div><div class="kicker">Como jogar · ${i + 1}/${PAGES.length}</div><h2>${p.title}</h2></div><button class="btn small" data-m="close">Fechar</button></header>
        <div class="body"><div class="page"><div class="demo">${p.demo()}</div><div>${p.text}</div></div></div>
        <div class="row" style="justify-content:space-between"><button class="btn small" data-m="prev" ${i ? '' : 'disabled'}>Anterior</button>
          <div class="dots">${PAGES.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
          <button class="btn ${i === PAGES.length - 1 ? 'primary' : ''}" data-m="next">${i === PAGES.length - 1 ? 'Começar' : 'Próxima'}</button></div>`;
      // Demonstração: a Fila acende da esquerda para a direita.
      const slots = $$('.tut-fila .slot', box);
      if (slots.length) {
        let k = 0;
        anim = setInterval(() => { slots.forEach((s, j) => s.classList.toggle('active', j === k % slots.length)); k++; }, 700);
      }
    }
    draw();
  }
  // Primeiro combate: escurece a tela e ilumina cada parte, uma de cada vez.
  function combat(done) {
    const steps = [
      ['#espr', 'Este é um <b>Corrompido</b>: um animal tomado pela Podridão. Vença-o zerando a vida dele.'],
      ['#intents', 'A plaquinha pendurada é a <b>intenção</b>: o que ele vai fazer na vez dele. O número é o dano do próximo ataque.'],
      ['.fighter.enemy .plate', 'A <b>vida do inimigo</b>. Se ele ganhar couraça, ela aparece aqui num escudo e absorve seus golpes.'],
      ['.fighter.me .plate', 'A <b>sua vida</b>. A Guarda que você fizer aparece ao lado, num escudo azul, e absorve o ataque desta rodada.'],
      ['#bag', 'O <b>Saco de Almas</b>. Cada carta custa almas. Entram 3 por rodada, e as que você não gasta ficam guardadas para a próxima.'],
      ['#hand .card', 'Uma <b>carta</b>. Gotas azuis no canto de cima: quanto custa. Canto de baixo à esquerda: dano. À direita: Guarda. No meio: os símbolos dos efeitos. Segure o dedo ou passe o mouse para ler tudo.'],
      ['#fila', 'A <b>Fila</b>. Toque numa carta da mão para colocá-la aqui (ou arraste). Ao selar, as cartas ativam <b>da esquerda para a direita</b>, então a ordem importa.'],
      ['.fila-box', 'Quando duas cartas combinam, uma <b>corrente colorida</b> liga as duas: é um <b>combo</b>. Mesmo naipe seguido faz Eco (+2), por exemplo.'],
      ['#preview', 'A <b>prévia</b> mostra exatamente o dano que você vai causar e quanto vai receber.'],
      ['#sealBtn', 'Quando estiver pronto, <b>Selar</b>. Sem cartas na Fila o botão vira <b>Passar</b> e as almas ficam guardadas.'],
      ['.b-bar .row', 'Aqui você acelera as animações (1×, 2×, 3×) e abre o guia com todos os combos e efeitos. Durante a rodada, tocar na tela também acelera.'],
      ['#hand', 'Sua vez! Coloque cartas na Fila e sele.']
    ];
    coach(steps, () => { META.knowledge.battleTut = true; META.knowledge.hints = Object.assign(META.knowledge.hints || {}, { fila: true, save: true, order: true, combo: true }); saveMeta(); done && done(); }, 'Pular tutorial', 'Começar');
  }

  // De volta ao mapa depois da primeira luta: o que mudou e por quê.
  function mapTips(done) {
    const rot = RUN.rot, step = rotPerNode();
    const steps = [
      ['[data-stat=rot]', `Esta é a <b>Podridão</b> do bosque. Ela acabou de subir: cada lugar que você visita faz ela subir <b>${step}%</b> (e mais rápido com Máscaras no rosto).<br><br>Quando passa de <b>30%</b>, <b>60%</b> e <b>90%</b>, os Corrompidos ficam mais fortes. Agora ela está em ${rot}%.`],
      ['[data-stat=rot]', 'Para a Podridão <b>baixar</b>: <b>Lembrar</b> na fogueira, <b>Purificar</b> na capela da Irmã Perpétua ou <b>encarar</b> uma memória quando achar uma.'],
      ['.lamp', 'Este é o <b>Lampião</b>. Ele vai com você e repara em tudo. Pode tocar nele.<br><br>Ele <b>cresce</b> quando você encara uma lembrança e <b>enfraquece</b> quando você foge dela ou põe uma Máscara.'],
      ['.lamp', 'Com <b>3 de luz</b>, ele mostra o golpe seguinte do inimigo. Com <b>5</b>, dá uma alma a mais no começo de cada luta.<br><br>E ele <b>pisca</b> quando alguém mente pra você. Fique de olho.'],
      ['[data-stat=hp]', 'Sua <b>vida</b> não volta sozinha entre as lutas. Fogueira e capela curam.'],
      ['[data-stat=lascas]', '<b>Lascas</b> são o dinheiro do bosque. Gaste com a Ysolde, o Tobias, a Dona Marga e na capela.'],
      ['.board', 'Agora escolha o próximo caminho.']
    ];
    coach(steps, () => { META.knowledge.mapTut = true; saveMeta(); done && done(); }, 'Pular', 'Entendi');
  }

  // Holofote: escurece a tela e ilumina um elemento por vez, com uma caixa de texto ao lado.
  function coach(steps, done, skipLabel, lastLabel) {
    let i = 0;
    const ov = h(`<div class="coach-ov"><div class="coach-dim"></div><div class="coach-hole"></div><div class="coach-box panel"><div class="coach-text"></div><div class="row" style="justify-content:space-between;margin-top:10px"><button class="btn small" data-c="skip">${skipLabel}</button><button class="btn primary small" data-c="next">Próximo</button></div></div></div>`);
    document.getElementById('app').appendChild(ov);
    const hole = $('.coach-hole', ov), box = $('.coach-box', ov), text = $('.coach-text', ov);
    function show() {
      if (i >= steps.length) return finish();
      const [sel, msg] = steps[i];
      const el = $(sel);
      if (!el) { i++; return show(); }
      const r = el.getBoundingClientRect(), pad = 8;
      Object.assign(hole.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      // escurece tudo menos o buraco iluminado
      const x = r.left - pad, y = r.top - pad, w = r.width + pad * 2, hh = r.height + pad * 2;
      $('.coach-dim', ov).style.clipPath = `path(evenodd, 'M0 0 H${innerWidth} V${innerHeight} H0 Z M${x} ${y} h${w} v${hh} h${-w} Z')`;
      text.innerHTML = msg;
      $('[data-c=next]', ov).textContent = i === steps.length - 1 ? lastLabel : 'Próximo';
      const below = r.bottom + 200 < innerHeight;
      box.style.top = (below ? r.bottom + 18 : Math.max(10, r.top - 18 - box.offsetHeight)) + 'px';
      box.style.left = clamp(r.left + r.width / 2 - box.offsetWidth / 2, 10, innerWidth - box.offsetWidth - 10) + 'px';
      AUDIO.sfx('page');
      if (sel === '.lamp') { LAMP.hop(); LAMP.feel('happy', 1500); }
    }
    function finish() { ov.remove(); done && done(); }
    ov.addEventListener('click', e => { if (e.target.closest('[data-c=skip]')) return finish(); i++; show(); });
    requestAnimationFrame(show);
  }

  return { open, combat, mapTips };
})();
