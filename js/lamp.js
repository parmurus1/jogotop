'use strict';
// O Lampião: a luz que segue Bram. Ele não fala. Reage com a cara, com um "piu" e com sinais em cima da cabeça.
// Qualquer elemento .lampy na tela mostra o mesmo humor: no mapa, nos lugares e ao lado de Bram no combate.
// Humores: idle, blink, happy, worried, scared, sleep, lookL, lookR (ver ART.lampy em sprites.js).

const LAMP = (() => {
  let base = 'idle', mood = null, moodUntil = 0, look = '', blinkUntil = 0, last = '';
  const now = () => performance.now();
  const src = m => SPR.url(m === 'idle' ? 'lampy' : 'lampy@' + m);

  function current() {
    let m = mood && now() < moodUntil ? mood : base;
    if (m === 'idle') { if (now() < blinkUntil) m = 'blink'; else if (look) m = look; }
    return m;
  }
  function paint(force) {
    const m = current();
    if (m === last && !force) return;
    last = m;
    const u = src(m);
    for (const el of document.querySelectorAll('.lampy')) { el.dataset.mood = m; const i = el.firstElementChild; if (i) i.src = u; }
  }
  setInterval(paint, 120);
  // Pisca de vez em quando.
  (function blink() { blinkUntil = now() + 140; setTimeout(blink, 2400 + Math.random() * 3800); })();
  // Olha para onde o mouse está.
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const el = document.querySelector('.lampy'); if (!el) return;
    const r = el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2);
    look = dx < -90 ? 'lookL' : dx > 90 ? 'lookR' : '';
  });
  // Tocar no Lampião: ele dá um pulinho e responde.
  addEventListener('click', e => {
    const el = e.target.closest('.lampy'); if (!el) return;
    hop(); feel('happy', 1200); emote(['♥', '!', '♪', '♥'][Math.random() * 4 | 0]);
  });

  function html(scale = 3, cls = '') {
    const s = SPR.size('lampy');
    return `<span class="lampy ${cls}" data-mood="${current()}"><img class="px" alt="" draggable="false" src="${src(current())}" width="${s.w * scale}" height="${s.h * scale}"></span>`;
  }
  function feel(m, ms = 1500) { mood = m; moodUntil = now() + ms; paint(true); }
  function setBase(m) { base = m || 'idle'; paint(true); }
  function hop() {
    for (const el of document.querySelectorAll('.lampy')) { el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); }
  }
  // Sinal em cima da cabeça: "!" (achou algo), "?" (desconfia), "♥" (gostou), "♪", "…".
  function emote(ch, o = {}) {
    for (const el of document.querySelectorAll('.lampy')) {
      const b = document.createElement('span');
      b.className = 'emote'; b.textContent = ch;
      el.appendChild(b);
      setTimeout(() => b.remove(), o.ms || 1300);
    }
    if (!o.silent) AUDIO.sfx('lampy', { mood: ch === '?' ? 'worried' : ch === '!' && o.scared ? 'scared' : 'happy' });
  }
  // Atalhos para as reações mais comuns.
  const REACT = {
    lie: () => { feel('worried', 2200); emote('?'); },
    combo: () => { feel('happy', 900); },
    bigCombo: () => { feel('happy', 1400); emote('!', { silent: true }); hop(); },
    hurt: () => feel('scared', 900),
    win: () => { feel('happy', 2400); emote('♥'); hop(); },
    found: () => { feel('happy', 1800); emote('!'); hop(); },
    danger: () => feel('scared', 900),
    sad: () => feel('sleep', 2400)
  };
  function react(kind) { REACT[kind] && REACT[kind](); }

  return { html, feel, setBase, emote, hop, react, get mood() { return current(); } };
})();
