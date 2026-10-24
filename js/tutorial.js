'use strict';
// Tutorial dentro do jogo: um holofote que ilumina cada parte da tela no primeiro combate e, depois, no mapa.

const TUTORIAL = (() => {
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

  return { combat, mapTips };
})();
