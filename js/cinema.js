'use strict';
// Cenas de memória: filmagem caseira em 4:3, quente e um pouco desfocada.
// Cada memória é uma lista de planos; cada plano desenha a cena em função do tempo (p vai de 0 a 1).

const CINEMA = (() => {
  const W = 160, H = 120;
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const spr = (n, o = { warm: true }) => SPR.get(n, o);

  // ---------- pincéis ----------
  function sky(g, top, bottom) {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  function hills(g, y, col, seed, amp = 6) {
    g.fillStyle = col;
    for (let x = 0; x < W; x++) { const h = Math.sin(x * .05 + seed) * amp + Math.sin(x * .13 + seed * 2) * amp * .4; g.fillRect(x, Math.round(y + h), 1, H); }
  }
  function trees(g, y, col, seed, n = 9) {
    const R = makeRng(seed);
    for (let i = 0; i < n; i++) {
      const x = R.next() * W, h = 18 + R.next() * 22, w = h * .35;
      g.fillStyle = col;
      for (let k = 0; k < h; k++) { const hw = Math.round(w * k / h); g.fillRect(Math.round(x - hw), Math.round(y - h + k), hw * 2 + 1, 1); }
    }
  }
  function actor(g, name, x, y, o = {}) {
    const c = spr(name, o.opt || { warm: true });
    if (!c) return;
    g.save();
    g.globalAlpha = o.alpha ?? 1;
    const bob = o.bob ? Math.abs(Math.sin(o.bob * Math.PI)) * 2 : 0;
    const s = o.scale || 1;
    if (o.flip) { g.translate(Math.round(x), 0); g.scale(-1, 1); g.drawImage(c, Math.round(-c.width * s / 2), Math.round(y - c.height * s - bob), c.width * s, c.height * s); }
    else g.drawImage(c, Math.round(x - c.width * s / 2), Math.round(y - c.height * s - bob), c.width * s, c.height * s);
    g.restore();
  }
  const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  function rain(g, t, n = 70) {
    g.fillStyle = 'rgba(220,210,190,.35)';
    for (let i = 0; i < n; i++) { const x = (i * 37 + t * 40 * (1 + i % 3)) % W, y = (i * 53 + t * 260) % H; g.fillRect(x | 0, y | 0, 1, 3); }
  }
  function motes(g, t, col = 'rgba(255,230,180,.5)') {
    g.fillStyle = col;
    for (let i = 0; i < 18; i++) { const x = (i * 29 + Math.sin(t * 2 + i) * 6) % W, y = (i * 17 + t * 6) % H; g.fillRect(x | 0, y | 0, 1, 1); }
  }
  // Fita vermelha na orelha do Bram (ou num galho).
  function ribbon(g, x, y) { rect(g, x, y, 3, 1, '#c8323a'); rect(g, x + 1, y + 1, 1, 3, '#c8323a'); rect(g, x - 1, y + 1, 1, 2, '#a3333d'); }
  function cup(g, x, y, cracked, gold) {
    rect(g, x, y, 6, 5, '#e2c89a'); rect(g, x + 6, y + 1, 2, 2, '#e2c89a'); rect(g, x + 1, y + 5, 4, 1, '#b89a6a');
    if (cracked) { rect(g, x + 2, y, 1, 2, gold ? '#ffd23a' : '#5a3a1a'); rect(g, x + 3, y + 2, 1, 2, gold ? '#ffd23a' : '#5a3a1a'); }
  }
  function letter(g, x, y, open) { rect(g, x, y, 10, open ? 12 : 7, '#f0e4c8'); rect(g, x + 1, y + 2, 7, 1, '#8a7a6a'); if (open) { rect(g, x + 1, y + 5, 6, 1, '#8a7a6a'); rect(g, x + 1, y + 9, 3, 1, '#5a1a1a'); } else rect(g, x + 4, y + 3, 2, 2, '#a3333d'); }

  // ---------- abertura: a noite em que Bram sai de casa ----------
  function ashFall(g, t, n = 40) { g.fillStyle = 'rgba(200,200,210,.5)'; for (let i = 0; i < n; i++) { const x = (i * 37 + t * 6 + Math.sin(t + i) * 4) % W, y = (i * 23 + t * 9) % H; g.fillRect(x | 0, y | 0, 1, 1); } }
  function room(g) {
    rect(g, 0, 0, W, H, '#1c120c');
    for (let y = 0; y < 86; y += 6) rect(g, 0, y, W, 1, '#24180f');
    rect(g, 0, 86, W, 34, '#140c08'); for (let x = 0; x < W; x += 14) rect(g, x, 86, 1, 34, '#1c120c');
  }
  function warmGlow(g, x, y, r, a = .4) { const gl = g.createRadialGradient(x, y, 2, x, y, r); gl.addColorStop(0, `rgba(255,190,110,${a})`); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H); }
  function windowSill(g, x, y, t, mood) {
    rect(g, x, y, 26, 22, '#0c1424'); rect(g, x + 12, y, 2, 22, '#2a1a10'); rect(g, x, y + 10, 26, 2, '#2a1a10');
    for (let k = 0; k < 6; k++) rect(g, x + 2 + (k * 9 + t * 3) % 22, y + 2 + (k * 7 + t * 5) % 18, 1, 1, '#8a90a0');
    rect(g, x - 2, y + 22, 30, 3, '#3a2414');
    warmGlow(g, x + 13, y + 16, 34, .35 + Math.sin(t * 8) * .04);
    actor(g, mood ? 'lampy@' + mood : 'lampy', x + 13, y + 22, { opt: {} });
  }
  // Capa azul em trapézio, com dobras; "drag" faz a barra arrastar no chão para o lado.
  function cape(g, cx, top, bottom, w0, w1, drag) {
    for (let y = top; y <= bottom; y++) {
      const t = (y - top) / (bottom - top), w = lerp(w0, w1, t), x0 = cx - w / 2;
      rect(g, x0, y, w, 1, '#2a5a6a');
      for (let f = 1; f < 4; f++) rect(g, x0 + w * f / 4 + Math.sin(y * .3 + f) * .6, y, 1, 1, '#1f4a58');
      if (y === top) rect(g, x0, y, w, 1, '#3a7282');
    }
    if (drag) for (let k = 0; k < 10; k++) rect(g, cx + w1 / 2 - 2 + k, bottom - 1 + Math.floor(k / 4), 3, 1, '#2a5a6a');
  }
  function deck(g, x, y) { for (let k = 0; k < 4; k++) { rect(g, x + k, y - k, 10, 14, '#0e0c12'); rect(g, x + k + 1, y - k + 1, 8, 12, '#1c1828'); } rect(g, x + 5, y - 1, 4, 6, '#a07a3a'); rect(g, x + 6, y, 2, 4, '#1c1828'); }
  const OPENING = [
    { dur: 5200, draw(g, p, t) {
      const z = 1 + p * .12; g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2);
      sky(g, '#05070e', '#1a2236');
      for (let i = 0; i < 40; i++) rect(g, (i * 53) % W, (i * 29) % 60, 1, 1, i % 4 ? '#5a6478' : '#cfd6e6');
      hills(g, 70, '#0e1420', 2, 5);
      trees(g, 82, '#080c14', 9, 14);
      rect(g, 0, 92, W, 28, '#0a0e16');
      // a toca do salgueiro
      g.fillStyle = '#121a24'; g.beginPath(); g.ellipse(64, 96, 34, 22, 0, Math.PI, 0); g.fill();
      for (let k = 0; k < 16; k++) { const x = 40 + k * 3; for (let j = 0; j < 14 + (k % 3) * 4; j++) rect(g, x + Math.sin(j * .3 + t) * .6, 60 + j, 1, 1, '#1a2a22'); }
      rect(g, 56, 84, 12, 12, '#2a1a10'); rect(g, 58, 86, 8, 10, '#1a100a');
      const fl = .85 + Math.sin(t * 9) * .08;
      rect(g, 74, 80, 6, 6, `rgba(255,190,100,${fl})`); warmGlow(g, 77, 83, 18, .3 * fl);
      ashFall(g, t, 30);
      g.restore();
    } },
    { dur: 5600, cap: 'Bram não lembrava de quem era a outra xícara.', draw(g, p, t) {
      room(g); windowSill(g, 116, 34, t);
      actor(g, 'bram', 48, 86);
      rect(g, 22, 76, 84, 5, '#4a2e18'); rect(g, 26, 81, 3, 20, '#2a1a10'); rect(g, 98, 81, 3, 20, '#2a1a10');
      cup(g, 60, 71, true, true);
      cup(g, 84, 71, false); g.fillStyle = 'rgba(120,120,120,.5)'; g.fillRect(84, 71, 8, 6);
      for (let k = 0; k < 3; k++) rect(g, 62 + Math.sin(t * 2 + k) * 2, 66 - k * 3 - (t * 4 % 3), 1, 2, 'rgba(255,255,255,.3)');
    } },
    { dur: 5000, draw(g, p, t) {
      room(g); windowSill(g, 116, 34, t);
      // o gancho com a capa: no corpo dele, ela arrasta no chão de tão grande
      rect(g, 42, 20, 6, 2, '#5a3a20'); rect(g, 44, 22, 2, 3, '#5a3a20');
      const k = ease(seg(p, .3, .6)), bx = lerp(90, 52, ease(seg(p, 0, .3)));
      if (k < 1) { g.globalAlpha = 1 - k; cape(g, 45, 25, 66, 6, 20); g.globalAlpha = 1; }
      if (k > 0) { g.globalAlpha = k; cape(g, bx, 84, 104, 14, 34, true); g.globalAlpha = 1; }
      actor(g, 'bram', bx, 102);
    } },
    { dur: 5600, cap: 'Nem de quem era o baralho.', draw(g, p, t) {
      rect(g, 0, 0, W, H, '#1a100a'); warmGlow(g, 120, 30, 90, .25);
      rect(g, 10, 54, 140, 8, '#4a2e18'); rect(g, 14, 62, 132, 40, '#3a2414');
      const o = ease(seg(p, .1, .4)) * 22;
      rect(g, 34, 66 + o * .2, 92, 26, '#2a1a10'); rect(g, 36, 68 + o * .2, 88, 22, '#1a100a'); rect(g, 74, 76 + o * .2, 12, 3, '#a07a3a');
      if (p > .3) deck(g, 70, 76 + o * .2);
      if (p > .55) { const hk = ease(seg(p, .55, .85)); rect(g, lerp(150, 84, hk), 52, 22, 14, '#d8d0c4'); rect(g, lerp(150, 84, hk), 50, 4, 3, '#d8d0c4'); }
      actor(g, p > .6 ? 'lampy@happy' : 'lampy', 138, 30 + Math.sin(t * 2) * 1, { opt: {} });
      if (p > .6) warmGlow(g, 138, 24, 40, .3);
    } },
    { dur: 6000, cap: 'Mas o lampião acendia sozinho toda noite. E toda noite apontava pro bosque.', draw(g, p, t) {
      rect(g, 0, 0, W, H, '#140c08');
      const dw = ease(seg(p, 0, .4)) * 40;
      rect(g, 60, 20, 40, 80, '#0c1424'); rect(g, 60, 20, 40 - dw, 80, '#3a2414');
      for (let i = 0; i < 20; i++) { const x = 60 + (i * 7 + t * 20) % 40, y = 20 + (i * 13 + t * 30) % 80; if (x < 60 + 40 && x > 100 - dw) rect(g, x, y, 1, 1, '#aab0c0'); }
      if (p > .35) { actor(g, 'bram', 80, 104, { alpha: seg(p, .35, .5) }); actor(g, 'lampy@lookL', 92, 84, { opt: {}, alpha: seg(p, .35, .5) }); warmGlow(g, 92, 76, 24, .3); }
      rect(g, 0, 100, W, 20, '#0e0806');
    } },
    { dur: 7200, cap: 'Naquela noite, ele foi atrás.', draw(g, p, t) {
      sky(g, '#04060c', '#141c2c');
      for (let i = 0; i < 30; i++) rect(g, (i * 53) % W, (i * 29) % 50, 1, 1, '#5a6478');
      trees(g, 76, '#06080e', 3, 18); trees(g, 70, '#0a0e18', 11, 10);
      rect(g, 0, 78, W, 42, '#0a0e16');
      for (let x = 0; x < W; x++) { const y = 112 - x * .3 + Math.sin(x * .1) * 2; rect(g, x, y, 1, 2, '#141a26'); }
      g.fillStyle = '#121a24'; g.beginPath(); g.ellipse(146, 108, 20, 12, 0, Math.PI, 0); g.fill();
      const on = p < .7 ? 1 : 1 - seg(p, .7, .8);
      if (on > 0) { rect(g, 150, 100, 3, 3, `rgba(255,190,100,${on})`); }
      const bx = lerp(132, 18, ease(seg(p, .05, .95))), by = 110 - (132 - bx) * .3 * .5 - 2;
      warmGlow(g, bx + 4, by - 6, 16, .45 + Math.sin(t * 6) * .05);
      actor(g, 'bram', bx, by, { scale: .5, bob: p * 30, flip: true });
      ashFall(g, t, 24);
    } },
    { dur: 4200, draw(g, p, t) {
      rect(g, 0, 0, W, H, '#000');
      const a = seg(p, .1, .4) * (1 - seg(p, .85, 1));
      g.globalAlpha = a; g.fillStyle = '#f2e6d0'; g.textAlign = 'center';
      g.font = '28px "Jersey 10", monospace'; g.fillText('BRAM', W / 2, 58);
      g.globalAlpha = a * seg(p, .3, .5); g.font = '10px "Jersey 10", monospace'; g.fillStyle = '#c8a070'; g.fillText('e as Cinzas de Vaelgrath', W / 2, 72);
      g.globalAlpha = 1; g.textAlign = 'left';
    } }
  ];

  // ---------- as oito fitas ----------
  const FILMS = {
    abertura: OPENING,
    fita: [
      { dur: 4200, draw(g, p, t) {
        sky(g, '#f2c48a', '#c8844a'); hills(g, 78, '#9a6a3a', 1); trees(g, 86, '#7a5030', 3, 7); rect(g, 0, 92, W, 28, '#6a4a2a');
        actor(g, 'bram', 104, 102);
        actor(g, 'tamsinfull', lerp(10, 82, ease(seg(p, 0, .7))), 102, { bob: p * 12 });
      } },
      { dur: 4600, cap: '— Fica parado! Não, a outra orelha, Bram.', draw(g, p, t) {
        sky(g, '#f6cc94', '#d08c52'); rect(g, 0, 96, W, 24, '#6a4a2a'); motes(g, t);
        actor(g, 'bram', 92, 112, { scale: 2 });
        actor(g, 'tamsinfull', 64, 112 - Math.round(ease(seg(p, .1, .4)) * 6), { scale: 2, flip: true });
        if (p > .5) ribbon(g, 76, 54);
      } },
      { dur: 4200, cap: '— Ficou torto. Ficou lindo. Não tira.', draw(g, p, t) {
        sky(g, '#f0c08a', '#b87a44'); motes(g, t);
        actor(g, 'bram', 80, 140, { scale: 3 });
        ribbon(g, 61, 30);
      } }
    ],
    pegadas: [
      { dur: 6200, cap: '— Espera! Perna curta, lembra?', draw(g, p, t) {
        sky(g, '#b8a088', '#8a6a52'); trees(g, 80, '#6a5444', 7, 10); rect(g, 0, 84, W, 36, '#5a3e2a');
        const bx = lerp(-10, 120, p), tx = lerp(10, 140, p);
        for (let k = 0; k < 14; k++) { const fx = -10 + k * 10; if (fx < bx - 8) rect(g, fx, 96 + (k % 2) * 3, 3, 1, '#3a2614'); if (fx + 5 < tx - 8) rect(g, fx + 5, 104 + (k % 2) * 2, 2, 1, '#3a2614'); }
        actor(g, 'bram', bx, 100, { bob: p * 10 });
        actor(g, 'tamsinfull', tx, 108, { bob: p * 22, scale: .8 });
        rain(g, t);
      } },
      { dur: 5200, cap: '— Viu? Agora você anda no meu passo.', draw(g, p, t) {
        sky(g, '#c0a88e', '#8e6e56'); rect(g, 0, 84, W, 36, '#5a3e2a');
        actor(g, 'bram', 70, 100);
        actor(g, 'tamsinfull', lerp(20, 58, ease(seg(p, 0, .7))), 106, { bob: seg(p, 0, .7) * 10, scale: .8 });
        rain(g, t, 40);
      } }
    ],
    xicara: [
      { dur: 4400, draw(g, p, t) {
        rect(g, 0, 0, W, H, '#6a4a32'); rect(g, 44, 14, 72, 54, '#f0c890'); rect(g, 78, 14, 2, 54, '#6a4a32'); rect(g, 44, 40, 72, 2, '#6a4a32');
        rect(g, 30, 68, 100, 6, '#4a3020');
        cup(g, 60, 62, false);
        const f = seg(p, .45, .75), fy = 62 + ease(f) * 50;
        if (p < .8) cup(g, 92 + f * 6, fy, false); else { cup(g, 96, 112, true); rect(g, 104, 114, 3, 2, '#e2c89a'); }
        motes(g, t, 'rgba(255,240,200,.4)');
      } },
      { dur: 4800, cap: '— Não joga fora! Eu conserto. Olha... ficou chique.', draw(g, p, t) {
        rect(g, 0, 0, W, H, '#5a3a24'); rect(g, 0, 80, W, 40, '#3a2414');
        const glow = g.createRadialGradient(80, 60, 4, 80, 60, 80); glow.addColorStop(0, 'rgba(255,200,120,.4)'); glow.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
        actor(g, 'tamsinfull', 62, 96, { scale: 2, bob: Math.sin(t * 6) > .6 ? .5 : 0 });
        cup(g, 92, 74, true, p > .5);
        if (p > .5) { rect(g, 94, 72, 1, 1, '#fff6c0'); }
      } },
      { dur: 4000, cap: '— A rachada é sua. A bonita é minha.', draw(g, p, t) {
        rect(g, 0, 0, W, H, '#4a3828'); rect(g, 0, 86, W, 34, '#2e2014');
        actor(g, 'bram', 80, 120, { scale: 2 });
        g.save(); g.translate(98, 64); g.scale(2, 2); cup(g, 0, 0, true, true); g.restore();
        g.fillStyle = 'rgba(255,255,255,.25)'; for (let k = 0; k < 4; k++) g.fillRect(100 + k * 2 + Math.sin(t * 3 + k) * 2, 56 - k * 3, 1, 2);
      } }
    ],
    carta: [
      { dur: 4800, draw(g, p, t) {
        rect(g, 0, 0, W, H, '#2a1a10');
        const glow = g.createRadialGradient(60, 60, 4, 60, 60, 70); glow.addColorStop(0, 'rgba(255,190,110,.55)'); glow.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
        rect(g, 20, 84, 120, 6, '#5a3a22');
        actor(g, 'tamsinfull', 58, 84, { scale: 2 });
        letter(g, 70, 54 - Math.sin(t * 2) * 1, true);
      } },
      { dur: 4600, draw(g, p, t) {
        rect(g, 0, 0, W, H, '#24160c');
        const glow = g.createRadialGradient(80, 60, 4, 80, 60, 80); glow.addColorStop(0, 'rgba(255,190,110,.45)'); glow.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
        actor(g, 'tamsinfull', 56, 104, { scale: 2, flip: p > .35 });
        actor(g, 'bram', 112, 106, { scale: 2 });
        const k = ease(seg(p, .55, .95));
        letter(g, lerp(66, 108, k), lerp(70, 78, k), false);
      } },
      { dur: 4000, cap: 'Embaixo da ordem, na letra torta dela: "volto logo".', draw(g, p, t) {
        rect(g, 0, 0, W, H, '#1c120a');
        g.save(); g.translate(46, 22); g.scale(6, 6); letter(g, 0, 0, true); g.restore();
        g.fillStyle = '#5a1a1a'; g.fillRect(52, 78, Math.round(18 * ease(seg(p, .2, .7))), 4);
      } }
    ],
    mapa: [
      { dur: 5400, draw(g, p, t) {
        rect(g, 0, 0, W, H, '#3a2618'); rect(g, 22, 14, 116, 92, '#e8c890'); rect(g, 22, 14, 116, 1, '#b89a6a');
        for (let i = 0; i < 6; i++) rect(g, 30 + i * 18, 20 + (i % 3) * 22, 5, 5, '#9a7a52');
        trees(g, 60, '#a88a5a', 4, 6);
        g.fillStyle = '#5a3a1a'; g.fillRect(96, 30, 14, 10); g.fillRect(100, 26, 6, 4);
        const xk = seg(p, .25, .55);
        g.fillStyle = '#a3333d';
        for (let k = 0; k < 9 * xk; k++) { g.fillRect(98 + k, 30 + k, 2, 1); if (k < 9 * seg(p, .4, .55)) g.fillRect(106 - k, 30 + k, 2, 1); }
        // pata pequena (manchada de tinta) e pata grande
        const sx = lerp(70, 104, ease(seg(p, 0, .3))), sy = lerp(80, 36, ease(seg(p, 0, .3)));
        rect(g, sx, sy, 8, 7, '#8a5a3a'); rect(g, sx + 1, sy - 2, 2, 2, '#8a5a3a'); rect(g, sx + 5, sy - 2, 2, 2, '#8a5a3a'); rect(g, sx + 2, sy + 2, 2, 2, '#2a1a3a');
        const bk = ease(seg(p, .6, .8)), back = seg(p, .85, 1);
        const bx = lerp(150, 100 + back * 30, bk), by = lerp(110, 34 + back * 20, bk);
        rect(g, bx, by, 14, 12, '#d8d0c4'); rect(g, bx + 1, by - 3, 3, 3, '#d8d0c4'); rect(g, bx + 6, by - 3, 3, 3, '#d8d0c4'); rect(g, bx + 10, by - 2, 3, 3, '#d8d0c4');
      } },
      { dur: 3600, cap: '— Não apaga. Alguém tem que ir.', draw(g, p, t) {
        rect(g, 0, 0, W, H, '#e8c890');
        g.fillStyle = '#a3333d';
        for (let k = 0; k < 40; k++) { g.fillRect(60 + k, 40 + k, 3, 2); g.fillRect(100 - k, 40 + k, 3, 2); }
        rect(g, 20, 90, 24, 18, '#8a5a3a');
      } }
    ],
    anzol: [
      { dur: 5800, draw(g, p, t) {
        sky(g, '#f4b884', '#e09a6a'); rect(g, 0, 70, W, 26, '#7a9aa0');
        for (let i = 0; i < 20; i++) rect(g, (i * 23 + t * 8) % W, 74 + (i % 5) * 4, 4, 1, 'rgba(255,230,200,.6)');
        rect(g, 0, 92, W, 28, '#6a5030');
        actor(g, 'bram', 50, 104); actor(g, 'tamsinfull', 104, 106);
        g.strokeStyle = '#3a2a1a'; g.beginPath(); g.moveTo(58, 80); g.lineTo(70, 66); g.lineTo(76, 80); g.stroke();
        g.beginPath(); g.moveTo(98, 84); g.lineTo(90, 66); g.lineTo(84, 80); g.stroke();
        for (let k = 0; k < 3; k++) { const j = seg(p, .2 + k * .22, .32 + k * .22); if (j > 0 && j < 1) { const fx = 86 - k * 2, fy = 78 - Math.sin(j * Math.PI) * 14; rect(g, fx, fy, 5, 2, '#c8d8e0'); } }
      } },
      { dur: 4200, cap: '— Três pra você. Eu pesco pela diversão.', draw(g, p, t) {
        sky(g, '#f6c08c', '#e4a06e'); rect(g, 0, 92, W, 28, '#6a5030');
        actor(g, 'bram', 60, 104);
        actor(g, 'tamsinfull', lerp(120, 90, ease(seg(p, 0, .5))), 106, { bob: seg(p, 0, .5) * 8, flip: true });
        for (let k = 0; k < 3; k++) if (p > .5 + k * .1) rect(g, 66 + k * 6, 100, 5, 2, '#c8d8e0');
      } }
    ],
    capa: [
      { dur: 5200, draw(g, p, t) {
        rect(g, 0, 0, W, H, '#1a120a');
        const fl = 1 + Math.sin(t * 9) * .04;
        const glow = g.createRadialGradient(100, 54, 3, 100, 54, 70 * fl); glow.addColorStop(0, 'rgba(255,200,120,.6)'); glow.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
        actor(g, 'lampy@happy', 100, 62, { opt: {} });
        actor(g, 'tamsinfull', 64, 100, { scale: 2 });
        rect(g, 70, 76, 30, 16, '#3a7282'); rect(g, 70, 76, 30, 1, '#5a9aa8');
        const ny = Math.sin(t * 8) * 4; rect(g, 84, 70 + ny, 1, 6, '#f0f0f0');
      } },
      { dur: 4200, cap: '— Do tamanho exato de uma carta. Não pergunta por quê.', draw(g, p, t) {
        rect(g, 0, 0, W, H, '#2a6070'); rect(g, 30, 30, 100, 70, '#3a7282'); rect(g, 50, 46, 60, 40, '#6b3a1e');
        const k = ease(seg(p, .2, .7));
        rect(g, 62, lerp(4, 44, k), 36, 50, '#1a1410'); rect(g, 64, lerp(6, 46, k), 32, 46, '#2a221a');
        rect(g, 50, 46, 60, 3, '#4a2410');
      } },
      { dur: 4400, cap: '— Boa noite, orelhudo.', draw(g, p, t) {
        rect(g, 0, 0, W, H, '#14100c'); rect(g, 20, 70, 120, 40, '#4a3a2a'); rect(g, 20, 64, 120, 8, '#d8c8b0');
        rect(g, 30, 58, 20, 8, '#e8dcc8'); rect(g, 110, 58, 20, 8, '#e8dcc8');
        g.globalAlpha = 1 - seg(p, .5, 1) * .9; actor(g, 'tamsinfull', 40, 74, { scale: 1 }); g.globalAlpha = 1;
        actor(g, 'bram', 120, 74);
      } }
    ],
    selo: [
      { dur: 5200, cap: 'A Ordem cantava, e o selo não fechava.', draw(g, p, t) {
        rect(g, 0, 0, W, H, '#1a0a08'); hills(g, 30, '#2a120c', 5, 10); rect(g, 0, 96, W, 24, '#24100a');
        actor(g, 'dragon', 112, 96, { opt: { warm: true }, alpha: .9 });
        const pulse = .4 + Math.sin(t * 4) * .2; g.fillStyle = `rgba(120,200,90,${pulse})`; g.fillRect(104, 66, 16, 8);
        for (let k = 0; k < 4; k++) { const x = 14 + k * 12; rect(g, x, 76, 8, 20, '#2a1e1a'); rect(g, x + 2, 72, 4, 5, '#2a1e1a'); rect(g, x + 7, 66 - Math.sin(t * 3 + k) * 2, 1, 12, '#c8c8d0'); }
      } },
      { dur: 5400, draw(g, p, t) {
        rect(g, 0, 0, W, H, '#1a0a08'); rect(g, 0, 96, W, 24, '#24100a');
        actor(g, 'dragon', 116, 96, { alpha: .9 });
        for (let k = 0; k < 4; k++) rect(g, 6 + k * 10, 76, 8, 20, '#2a1e1a');
        actor(g, 'tamsinfull', lerp(40, 80, ease(seg(p, 0, .45))), 100, { bob: seg(p, 0, .45) * 8 });
        if (p > .6) actor(g, 'tamsinfull', 80, 100, { flip: true, alpha: seg(p, .6, .7) });
      } },
      { dur: 6200, cap: '— Deixa a luz acesa pra ele.', draw(g, p, t) {
        rect(g, 0, 0, W, H, '#140806'); rect(g, 0, 96, W, 24, '#200e08');
        actor(g, 'dragon', 116, 96, { alpha: .8 });
        actor(g, 'tamsinfull', 80, 100, { alpha: 1 - seg(p, .1, .55) });
        g.fillStyle = 'rgba(255,220,150,.9)';
        for (let k = 0; k < 24; k++) { const q = seg(p, .05 + k * .015, .4 + k * .015); if (q > 0 && q < 1) g.fillRect(lerp(80, 114, q) + Math.sin(k + q * 6) * 3, lerp(84, 66, q), 1, 1); }
        const s = seg(p, .55, 1);
        if (s > 0) actor(g, 'lampy', lerp(80, 30, ease(s)), lerp(80, 92, ease(s)) + Math.sin(t * 3) * 2, { opt: {} });
        if (s > .5) actor(g, 'bram', 22, 112, { alpha: seg(p, .75, 1) });
      } }
    ]
  };

  // Reproduz a fita dentro do elemento dado. Devolve { skip } e chama onEnd ao terminar.
  function play(id, host, onEnd) {
    const shots = FILMS[id] || [];
    const cold = id === 'abertura';
    host.innerHTML = `<div class="film ${cold ? 'now' : ''}"><canvas width="${W}" height="${H}"></canvas><div class="film-grain"></div><div class="film-cap"></div>${cold ? '' : '<div class="film-rec">● REC</div><div class="film-time"></div>'}</div>`;
    const cv = $('canvas', host), g = cv.getContext('2d'), cap = $('.film-cap', host), time = $('.film-time', host);
    g.imageSmoothingEnabled = false;
    let i = 0, t0 = performance.now(), start = t0, raf = 0, ended = false, lastCap = null;
    function frame(now) {
      if (ended) return;
      const shot = shots[i];
      if (!shot) { finish(); return; }
      const el = now - t0, p = Math.min(1, el / shot.dur);
      g.setTransform(1, 0, 0, 1, 0, 0);
      shot.draw(g, p, (now - start) / 1000);
      // gradação (quente nas fitas, fria na abertura), vinheta e um leve "salto" de fita
      g.fillStyle = cold ? 'rgba(70,110,200,.08)' : 'rgba(255,170,90,.12)'; g.fillRect(0, 0, W, H);
      const v = g.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, 100); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(30,10,0,.55)');
      g.fillStyle = v; g.fillRect(0, 0, W, H);
      if (Math.random() < .03) { const y = Math.random() * H | 0; g.drawImage(cv, 0, y, W, 3, 2, y, W, 3); }
      // fade entre planos
      const fade = Math.min(seg(el, 0, 400), 1 - seg(el, shot.dur - 400, shot.dur));
      g.fillStyle = `rgba(10,4,0,${1 - fade})`; g.fillRect(0, 0, W, H);
      if (shot.cap !== lastCap) { lastCap = shot.cap; cap.classList.remove('on'); if (shot.cap) setTimeout(() => { cap.textContent = shot.cap; cap.classList.add('on'); }, 500); else cap.textContent = ''; }
      const secs = Math.floor((now - start) / 1000);
      if (time) time.textContent = `0:${String(secs).padStart(2, '0')}`;
      if (p >= 1) { i++; t0 = now; }
      raf = requestAnimationFrame(frame);
    }
    function finish() { if (ended) return; ended = true; cancelAnimationFrame(raf); onEnd && onEnd(); }
    raf = requestAnimationFrame(frame);
    return { skip: () => { if (i < shots.length - 1) { i = shots.length - 1; t0 = performance.now() - shots[i].dur * .6; } else finish(); }, stop: () => { ended = true; cancelAnimationFrame(raf); } };
  }

  return { play, has: id => !!FILMS[id] };
})();
