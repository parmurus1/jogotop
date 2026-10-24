'use strict';
// Cenários únicos: arenas dos chefes e dos Corrompidos fortes, a forja do Tobias e a barraca da Ysolde.
// SCENERY[nome] desenha a parte fixa uma vez; SCENERY_ANIM[nome] desenha o que se mexe a cada quadro.

const SCENERY = (() => {
  const px = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  function bricks(c, W, H, a, b) {
    for (let y = 0; y < H; y += 6) for (let x = (y / 6) % 2 ? -6 : 0; x < W; x += 12) { px(c, x, y, 11, 5, (x + y) % 3 ? a : b); }
  }
  function shaft(c, x, top, w, H, col) {
    for (let y = top; y < H; y++) { const k = (y - top) / (H - top); c.fillStyle = col.replace('A', (.12 * (1 - k)).toFixed(3)); c.fillRect(Math.round(x - w * (.5 + k)), y, Math.round(w * (1 + k * 2)), 1); }
  }
  return {
    // Clareira do Cervo de Musgo: árvores antigas com galhos em forma de chifre, musgo pendurado e cogumelos que brilham.
    clearing({ s, mc, nc, W, H, ground, R }) {
      shaft(s, W * .5, 0, 10, ground, 'rgba(190,240,200,A)');
      for (const side of [0, 1]) {
        const x0 = side ? W - 14 : 4;
        px(mc, x0, 0, 10, ground + 10, '#0a1510'); px(mc, x0 + (side ? 0 : 7), 0, 3, ground + 10, '#14261c');
        for (let k = 0; k < 5; k++) { const by = 10 + k * 14, dir = side ? -1 : 1; for (let j = 0; j < 18; j++) px(mc, x0 + 5 + dir * j, by - j * .5 + (j % 6 === 5 ? -3 : 0), 2, 2, '#0a1510'); }
        for (let k = 0; k < 9; k++) { const mx = x0 + (side ? -20 : 12) + R() * 18, len = 6 + R() * 18; px(mc, mx, 6 + R() * 30, 1, len, '#2a4a30'); }
      }
      for (let i = 0; i < W / 10; i++) { const x = R() * W, y = ground + 6 + R() * 8; px(nc, x, y, 2, 2, '#d8f0e0'); px(nc, x, y + 2, 1, 2, '#8aa890'); }
    },
    // Acampamento queimado do Javali Sem Nome.
    burnt({ s, mc, nc, W, H, ground, R }) {
      const glow = s.createLinearGradient(0, ground - 40, 0, ground); glow.addColorStop(0, 'rgba(255,90,30,0)'); glow.addColorStop(1, 'rgba(255,90,30,.35)');
      s.fillStyle = glow; s.fillRect(0, ground - 40, W, 40);
      for (let i = 0; i < 6; i++) {
        const x = R() * W, h = 8 + R() * 16;
        px(mc, x, ground - h, 3, h + 4, '#120604'); px(mc, x - 3, ground - h + 3, 3, 1, '#120604'); px(mc, x + 3, ground - h + 6, 4, 1, '#120604');
      }
      for (const cx of [W * .22, W * .76]) for (let k = 0; k < 14; k++) { const hw = Math.round(k * .9); px(mc, cx - hw, ground - 14 + k, hw * 2, 1, k % 4 ? '#1a0a06' : '#2a120a'); }
      for (let i = 0; i < W / 6; i++) px(nc, R() * W, ground + 8 + R() * 10, 1, 1, R() < .3 ? '#ff6a2a' : '#3a1a10');
    },
    // Cemitério do Coletor de Nomes.
    graveyard({ mc, nc, W, ground, R }) {
      for (let x = 0; x < W; x += 4) { px(mc, x, ground - 10, 1, 12, '#0c0e11'); px(mc, x, ground - 11, 1, 1, '#2a2e36'); }
      px(mc, 0, ground - 7, W, 1, '#0c0e11');
      for (let i = 0; i < 10; i++) {
        const x = 6 + R() * (W - 12), y = ground + 4 + R() * 10, cross = R() < .4;
        if (cross) { px(nc, x, y - 9, 2, 10, '#1a1c22'); px(nc, x - 2, y - 7, 6, 2, '#1a1c22'); }
        else { px(nc, x - 3, y - 7, 7, 8, '#1c1e24'); px(nc, x - 2, y - 8, 5, 1, '#1c1e24'); px(nc, x - 2, y - 6, 1, 1, '#2e323a'); }
      }
    },
    // Cripta da Viúva dos Sussurros: arcos de pedra e teias.
    crypt({ s, mc, nc, W, H, ground }) {
      bricks(s, W, ground, '#16121a', '#1a1620');
      for (let i = 0; i < 4; i++) {
        const cx = W * (.125 + i * .25), w = W * .09;
        for (let y = 0; y < ground; y++) { const k = y < w ? Math.sqrt(1 - Math.pow((w - y) / w, 2)) : 1; px(mc, cx - w * k, y + 8, 2, 1, '#0a080c'); px(mc, cx + w * k, y + 8, 2, 1, '#0a080c'); }
      }
      const web = (x0, y0, dx, dy) => { nc.strokeStyle = 'rgba(220,210,230,.35)'; nc.lineWidth = 1; for (let k = 0; k < 6; k++) { nc.beginPath(); nc.moveTo(x0, y0); nc.lineTo(x0 + dx * (30 - k * 3), y0 + dy * k * 6); nc.stroke(); } for (let r = 6; r < 30; r += 6) { nc.beginPath(); nc.arc(x0, y0, r, dx > 0 ? 0 : Math.PI / 2, dx > 0 ? Math.PI / 2 : Math.PI); nc.stroke(); } };
      web(0, 0, 1, 1); web(W, 0, -1, 1);
    },
    // Capela destruída do Corvo Pregador: vitral quebrado, vigas caídas, bancos.
    chapelruin({ s, mc, nc, W, H, ground, R }) {
      bricks(s, W, ground, '#1a1820', '#1e1c26');
      const cx = W / 2 | 0, top = 8, ww = Math.min(46, W * .3) | 0, wh = (ground * .55) | 0;
      const cols = ['#5a2a3a', '#2a3a5a', '#5a4a2a', '#2a4a3a', '#4a2a5a'];
      for (let y = 0; y < wh; y++) for (let x = -ww / 2; x < ww / 2; x++) {
        if (y < ww / 2 && Math.hypot(x, ww / 2 - y) > ww / 2) continue;
        const broken = x > ww * .05 && y < wh * .55 && x - y * .4 > -4;
        s.fillStyle = broken ? '#0c1220' : (x % 7 === 0 || y % 8 === 0) ? '#0a090c' : cols[((x / 7 | 0) + (y / 8 | 0) + 10) % cols.length];
        s.fillRect(cx + x, top + y, 1, 1);
      }
      s.fillStyle = '#d8dce4'; s.beginPath(); s.arc(cx + ww * .25, top + wh * .25, 4, 0, 7); s.fill();
      shaft(mc, cx + ww * .2, top + wh * .4, 6, ground + 10, 'rgba(200,210,240,A)');
      for (let k = 0; k < 40; k++) { px(mc, W * .15 + k, ground - 30 + k * .7, 3, 3, '#14110c'); px(mc, W * .85 - k, ground - 26 + k * .55, 3, 3, '#14110c'); }
      for (let r = 0; r < 3; r++) for (const side of [-1, 1]) px(nc, cx + side * (14 + r * 4) - (side < 0 ? 22 : 0), ground + 4 + r * 5, 22, 3, '#1a1008');
      for (let i = 0; i < 12; i++) px(nc, R() * W, ground + 8 + R() * 10, 2 + R() * 3, 2, '#2a2630');
    },
    // Lago da Mãe Lontra: lua refletida, salgueiros e vitórias-régias.
    pond({ mc, nc, W, H, ground, R }) {
      px(mc, 0, ground + 4, W, H, '#0c1c1c');
      for (const side of [0, 1]) for (let k = 0; k < 16; k++) { const x = side ? W - 2 - k * 2 : k * 2, len = 20 + R() * 40; for (let y = 0; y < len; y++) px(mc, x + Math.sin(y * .2) * 1, y, 1, 1, '#18301e'); }
      for (let i = 0; i < 9; i++) { const x = R() * W, y = ground + 10 + R() * (H - ground - 14); px(nc, x - 3, y, 7, 2, '#2a5a30'); px(nc, x - 2, y - 1, 5, 1, '#3a7a40'); if (R() < .3) px(nc, x, y - 2, 2, 2, '#f0e0f0'); }
    },
    // Bétulas: troncos brancos com marcas pretas e copas amarelas, folhas caindo.
    birch({ fc, mc, nc, W, ground, R }) {
      for (const [c, n, hMin, hMax, w, dark] of [[fc, W / 9, 40, 70, 2, '#8a8a84'], [mc, W / 16, 60, 110, 3, '#c8c8c0']]) {
        for (let i = 0; i < n; i++) {
          const x = R() * W, h = hMin + R() * (hMax - hMin), top = ground + (c === mc ? 4 : -2) - h;
          px(c, x, top, w, h, dark);
          for (let k = 0; k < h / 5; k++) px(c, x + (R() < .5 ? 0 : w - 1), top + R() * h, 1 + (R() * w | 0), 1, '#1a1a18');
          for (let k = 0; k < 14; k++) { const lx = x + (R() - .5) * 22, ly = top + R() * 18; px(c, lx, ly, 3, 2, c === mc ? (R() < .5 ? '#c88a2a' : '#a8641e') : '#6a5020'); }
        }
      }
      for (let i = 0; i < W / 4; i++) px(nc, R() * W, ground + 10 + R() * 20, 2, 1, R() < .5 ? '#7a4a14' : '#5a3410');
    },
    // Riacho atravessando a clareira, com pedras e uma pontezinha de tronco.
    brook({ mc, nc, W, H, ground, R }) {
      const y0 = ground + 14;
      for (let y = y0; y < y0 + 10; y++) { const off = Math.sin(y * .7) * 4; px(nc, 0, y, W, 1, y % 3 ? '#16303a' : '#1e3e48'); px(nc, off + W * .2, y, 6, 1, 'rgba(200,230,240,.15)'); }
      for (let i = 0; i < 12; i++) { const x = R() * W, y = y0 - 1 + R() * 11; px(nc, x, y, 4, 3, '#3a4446'); px(nc, x, y, 4, 1, '#5a6466'); }
      const bx = W * .62 | 0; px(nc, bx, y0 - 2, 26, 3, '#4a3020'); px(nc, bx, y0 - 2, 26, 1, '#6a4a30'); px(nc, bx + 2, y0 + 1, 2, 9, '#2a1a10'); px(nc, bx + 22, y0 + 1, 2, 9, '#2a1a10');
    },
    // Anel de cogumelos gigantes que brilham fraquinho.
    mushring({ mc, nc, W, ground, R }) {
      for (let i = 0; i < 7; i++) {
        const x = R() * W, h = 14 + R() * 30, cap = 8 + R() * 12, y = ground + 4;
        px(mc, x - 1, y - h, 3, h, '#c8b8a8');
        for (let k = 0; k < cap / 2; k++) { const hw = cap * Math.sqrt(1 - Math.pow(k / (cap / 2), 2)) | 0; px(mc, x - hw, y - h - k, hw * 2 + 1, 1, k < 2 ? '#5a2a6a' : '#7a3a8a'); }
        for (let k = 0; k < 4; k++) px(mc, x - cap * .6 + R() * cap * 1.2, y - h - R() * cap * .4, 1, 1, '#e8d0f8');
      }
      for (let i = 0; i < W / 8; i++) { const x = R() * W, y = ground + 10 + R() * 18; px(nc, x, y - 3, 1, 3, '#c8b8a8'); px(nc, x - 1, y - 4, 3, 1, '#8a4a9a'); }
    },
    // Arcos de um aqueduto da Ordem, quebrados.
    arches({ fc, mc, W, ground, R }) {
      const aw = 30, top = ground - 54;
      for (let x = -10, i = 0; x < W + 20; x += aw, i++) {
        if (i % 4 === 3) continue;
        const h = i % 3 === 1 ? 30 : 54;
        px(fc, x, ground - h, 6, h + 6, '#1d1a26');
        if (h === 54) for (let k = 0; k < aw - 6; k++) { const yy = top + 8 - Math.round(Math.sqrt(Math.max(0, 1 - Math.pow((k - (aw - 6) / 2) / ((aw - 6) / 2), 2))) * 8); px(fc, x + 6 + k, top, 1, yy - top + 2, '#1d1a26'); }
      }
      for (let i = 0; i < 9; i++) { const x = R() * W; px(mc, x, ground - 2, 5 + R() * 6, 4, '#131119'); }
    },
    // Mangue: raízes em arco saindo da água.
    mangrove({ mc, nc, W, H, ground, R }) {
      for (let i = 0; i < 6; i++) {
        const x = R() * W, h = 40 + R() * 40;
        px(mc, x, ground - h, 4, h - 10, '#0e1610');
        for (let k = -3; k <= 3; k++) { if (!k) continue; for (let j = 0; j < 14; j++) { const t = j / 13; px(mc, x + 2 + k * 5 * t, ground - 12 + Math.sin(t * Math.PI) * -8 + t * 14, 1, 2, '#0e1610'); } }
        for (let k = 0; k < 18; k++) px(mc, x - 12 + R() * 28, ground - h - R() * 10, 3, 2, '#1c3a22');
      }
      px(nc, 0, ground + 8, W, 8, 'rgba(40,70,60,.55)');
    },
    // Vila afundada: telhados e janelas saindo da água parada.
    sunken({ mc, nc, W, ground, R }) {
      for (let i = 0; i < 4; i++) {
        const x = W * (.1 + i * .24) + R() * 10, w = 22 + R() * 10, h = 12 + R() * 10;
        px(mc, x, ground - h, w, h + 8, '#141c1c');
        for (let k = 0; k < w / 2 + 2; k++) px(mc, x - 2 + k, ground - h - k * .6, w + 4 - k * 2, 1, '#0e1414');
        px(mc, x + w * .4, ground - h + 4, 5, 5, i === 1 ? '#c89a4a' : '#0a0e0e');
      }
      px(nc, 0, ground + 6, W, 10, 'rgba(50,80,80,.5)');
      for (let k = 0; k < 10; k++) px(nc, R() * W, ground + 8 + R() * 6, 6, 1, 'rgba(200,220,220,.15)');
    },
    // Toca da Dona Marga: terra, raízes no teto e prateleiras de coisas perdidas.
    burrow({ s, mc, nc, W, H, ground, R }) {
      for (let i = 0; i < W * H / 30; i++) px(s, R() * W, R() * H, 2, 1, R() < .5 ? '#1e1208' : '#2a1a0c');
      const glow = s.createRadialGradient(W / 2, ground * .6, 4, W / 2, ground * .6, W * .6); glow.addColorStop(0, 'rgba(255,190,110,.22)'); glow.addColorStop(1, 'rgba(0,0,0,.5)');
      s.fillStyle = glow; s.fillRect(0, 0, W, H);
      for (let i = 0; i < W / 6; i++) { const x = R() * W, len = 4 + R() * 22; for (let k = 0; k < len; k++) px(mc, x + Math.sin(k * .4 + i) * 1.5, k, 1, 1, '#3a2414'); }
      for (const side of [0, 1]) {
        const sx = side ? W * .64 : W * .06, sw = W * .3;
        for (let r = 0; r < 3; r++) {
          const yy = ground * (.3 + r * .22) | 0;
          px(mc, sx, yy, sw, 2, '#4a2e18');
          for (let k = 2; k < sw - 4; k += 5 + (R() * 4 | 0)) {
            const kind = R();
            if (kind < .3) { px(mc, sx + k, yy - 5, 4, 5, ['#5a7a8a', '#8a6a4a', '#7a4a5a'][R() * 3 | 0]); px(mc, sx + k + 1, yy - 6, 2, 1, '#c8b8a0'); }
            else if (kind < .55) { px(mc, sx + k, yy - 3, 4, 3, '#c8a050'); px(mc, sx + k + 1, yy - 4, 2, 1, '#e8c070'); }
            else if (kind < .8) { px(mc, sx + k, yy - 6, 3, 6, '#3a6a7a'); px(mc, sx + k + 1, yy - 8, 1, 2, '#2a1a10'); }
            else { px(mc, sx + k, yy - 4, 5, 4, '#a3333d'); px(mc, sx + k + 2, yy - 4, 1, 4, '#dba03c'); }
          }
        }
      }
      for (let y = ground + 8; y < H; y++) px(nc, 0, y, W, 1, y % 5 ? '#1a1008' : '#24160a');
    },
    // Forja do Tobias: tijolos, fogo da forja, bigorna e ferramentas.
    forge({ s, mc, nc, W, H, ground }) {
      bricks(s, W, H, '#2a120a', '#321610');
      const fx = W * .22 | 0;
      px(mc, fx - 18, ground - 30, 36, 30, '#1a0a06'); px(mc, fx - 22, ground - 34, 44, 5, '#120604'); px(mc, fx - 8, 0, 16, ground - 34, '#120604');
      px(mc, fx - 12, ground - 18, 24, 14, '#3a0e04');
      const ax = W * .66 | 0;
      px(nc, ax - 14, ground - 6, 28, 5, '#1c1c22'); px(nc, ax - 18, ground - 9, 8, 3, '#1c1c22'); px(nc, ax - 6, ground - 1, 12, 10, '#141418'); px(nc, ax - 10, ground + 8, 20, 3, '#141418');
      for (let k = 0; k < 4; k++) { const tx = W * .5 + k * 9; px(mc, tx, 20, 1, 10 + k * 2, '#121216'); px(mc, tx - 2, 30 + k * 2, 5, 4, '#1c1c22'); }
      px(mc, W * .5 - 4, 18, 44, 2, '#2a1810');
    },
    // Barraca da Ysolde: lona em gomos subindo para o mastro, um mapa grande pregado no fundo,
    // prateleiras com rolos de mapa e frascos, bandeirinhas e um tapete.
    tent({ s, mc, nc, W, H, ground, R }) {
      const cx = W / 2;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const ang = Math.atan2(x - cx, y + 30), seam = Math.abs(Math.sin(ang * 7)), k = y / H;
        const r = 92 + seam * 40 - (1 - k) * 40, g2 = 46 + seam * 18 - (1 - k) * 18, b = 30 + seam * 10;
        if ((x + y * 3) % 2 === 0 || seam > .2) { s.fillStyle = `rgb(${r | 0},${g2 | 0},${b | 0})`; s.fillRect(x, y, 1, 1); }
        else { s.fillStyle = `rgb(${r * .8 | 0},${g2 * .8 | 0},${b * .8 | 0})`; s.fillRect(x, y, 1, 1); }
      }
      const glow = s.createRadialGradient(cx, ground * .55, 4, cx, ground * .55, W * .6); glow.addColorStop(0, 'rgba(255,190,110,.2)'); glow.addColorStop(1, 'rgba(10,4,2,.55)');
      s.fillStyle = glow; s.fillRect(0, 0, W, H);
      // mastro
      px(mc, cx - 1, 0, 3, ground + 12, '#3a2414'); px(mc, cx, 0, 1, ground + 12, '#5a3a20');
      // mapa grande
      const mw = Math.min(56, W * .3) | 0, mh = mw * .62 | 0, mx = cx - mw - 8, my = ground * .22 | 0;
      px(mc, mx - 1, my - 1, mw + 2, mh + 2, '#3a2010'); px(mc, mx, my, mw, mh, '#d8bc8a'); px(mc, mx, my, mw, 1, '#f0d8a8');
      for (let k = 0; k < 7; k++) px(mc, mx + 4 + R() * (mw - 10), my + 4 + R() * (mh - 8), 4 + R() * 4, 1, '#8a5a3a');
      for (let k = 0; k < 4; k++) { const tx = mx + 6 + R() * (mw - 14), ty = my + 6 + R() * (mh - 12); px(mc, tx, ty, 3, 3, '#5a7a4a'); px(mc, tx + 1, ty - 2, 1, 2, '#5a7a4a'); }
      px(mc, mx + mw * .7, my + mh * .3, 3, 1, '#a3333d'); px(mc, mx + mw * .7 + 1, my + mh * .3 - 1, 1, 3, '#a3333d');
      px(mc, mx + 1, my + 1, 2, 2, '#c8a040'); px(mc, mx + mw - 3, my + 1, 2, 2, '#c8a040');
      // prateleira com rolos e frascos
      const sx = cx + 10, sy = ground * .5 | 0, sw = Math.min(60, W * .32) | 0;
      for (const yy of [sy, sy + 18]) {
        px(mc, sx, yy, sw, 2, '#3a2414');
        for (let k = 0; k < sw - 6; k += 6 + (R() * 4 | 0)) {
          if (R() < .55) { px(mc, sx + k, yy - 4, 5, 4, '#e0c898'); px(mc, sx + k, yy - 4, 1, 4, '#b89868'); px(mc, sx + k + 2, yy - 3, 1, 2, '#a3333d'); }
          else { const c = ['#4a7a8a', '#7a4a6a', '#6a8a4a'][R() * 3 | 0]; px(mc, sx + k + 1, yy - 6, 3, 6, c); px(mc, sx + k + 2, yy - 8, 1, 2, '#c8b8a0'); px(mc, sx + k + 1, yy - 5, 1, 2, 'rgba(255,255,255,.4)'); }
        }
      }
      // bandeirinhas
      const cols = ['#c8642a', '#dba03c', '#5a7a4a', '#a3333d', '#4a6a8a'];
      for (let x = 0; x < W; x += 7) { const y = 10 + Math.sin(x / W * Math.PI) * 10 | 0; px(mc, x, y, 7, 1, '#2a1a10'); px(mc, x + 1, y + 1, 4, 3, cols[(x / 7 | 0) % 5]); px(mc, x + 2, y + 4, 2, 1, cols[(x / 7 | 0) % 5]); }
      // tapete
      for (let y = ground + 6; y < H - 2; y++) { const k = (y - ground) / (H - ground), hw = W * (.25 + k * .2); px(nc, cx - hw, y, hw * 2, 1, (y % 4 < 2) ? '#5a1e1a' : '#6a2a20'); if (y % 6 === 0) px(nc, cx - hw, y, hw * 2, 1, '#a07a3a'); }
    }
  };
})();

// Cantos do bosque para as lutas comuns de cada ato (chefes e fortes têm arena própria em enemies.js).
const ARENAS = {
  1: ['forest', 'birch', 'brook', 'mushring'],
  2: ['ruins', 'graveyard', 'arches'],
  3: ['swamp', 'mangrove', 'sunken'],
  4: ['lair']
};

const SCENERY_ANIM = {
  brook(g, t, W, H, ground) {
    for (let k = 0; k < 14; k++) { const x = (k * 41 + t * 18) % (W + 20) - 10, y = ground + 15 + (k % 5) * 2; g.fillStyle = 'rgba(210,235,245,.22)'; g.fillRect(x | 0, y, 4, 1); }
  },
  mushring(g, t, W, H, ground) {
    for (let i = 0; i < 12; i++) { const a = .25 + Math.sin(t * 1.5 + i) * .2; g.fillStyle = `rgba(220,180,255,${a})`; g.fillRect((i * 53 + Math.sin(t * .3 + i) * 8) % W, ground - 10 - ((t * 4 + i * 13) % 50), 1, 1); }
  },
  sunken(g, t, W, H, ground) {
    const x = W * .34 + 10, fl = .8 + Math.sin(t * 7) * .1; const rg = g.createRadialGradient(x, ground - 10, 1, x, ground - 10, 20 * fl); rg.addColorStop(0, 'rgba(255,200,110,.25)'); rg.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = rg; g.fillRect(x - 20, ground - 30, 40, 40);
  },
  burrow(g, t, W, H, ground) {
    for (const cx of [.5]) { const x = W * cx, y = 10, f = .9 + Math.sin(t * 6) * .08; const rg = g.createRadialGradient(x, y + 6, 1, x, y + 6, 50 * f); rg.addColorStop(0, 'rgba(255,200,120,.25)'); rg.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = rg; g.fillRect(x - 50, y - 44, 100, 100); g.fillStyle = '#3a2a1a'; g.fillRect(x, 0, 1, y); g.fillStyle = '#ffd27a'; g.fillRect(x - 1, y, 3, 4); }
  },
  clearing(g, t, W, H, ground) {
    for (let i = 0; i < 10; i++) { const a = .2 + Math.sin(t * 2 + i * 1.7) * .15; g.fillStyle = `rgba(150,240,200,${a})`; g.fillRect((i * 37 + Math.sin(t * .4 + i) * 6) % W, ground - 20 + Math.sin(t * .7 + i) * 10, 1, 1); }
  },
  burnt(g, t, W, H, ground) {
    for (let i = 0; i < 3; i++) { const x = W * (.2 + i * .3); for (let k = 0; k < 8; k++) { const y = ground - 10 - ((t * 12 + k * 9) % 70); g.fillStyle = `rgba(60,50,48,${.25 * (1 - (ground - y) / 80)})`; g.fillRect(x + Math.sin(t + k) * 4, y, 4, 3); } }
  },
  crypt(g, t, W, H, ground) {
    for (const cx of [.15, .85]) { const x = W * cx | 0, y = ground; g.fillStyle = 'rgba(255,190,110,.08)'; g.beginPath(); g.arc(x, y - 8, 14 + Math.sin(t * 9) * 1.5, 0, 7); g.fill(); g.fillStyle = '#d8ccb0'; g.fillRect(x, y - 6, 2, 6); g.fillStyle = '#ffd27a'; g.fillRect(x, y - 8, 2, 2); }
  },
  chapelruin(g, t, W, H, ground) {
    for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(230,230,250,.4)'; g.fillRect(W * .52 + Math.sin(t * .3 + i) * 10 + i * 1.5, (i * 13 + t * 4) % ground, 1, 1); }
  },
  pond(g, t, W, H, ground) {
    for (let k = 0; k < 8; k++) { const y = ground + 8 + k * 3, w = 14 - k + Math.sin(t * 2 + k) * 3; g.fillStyle = `rgba(220,225,235,${.35 - k * .035})`; g.fillRect(W * .78 - w / 2 + Math.sin(t * 1.5 + k) * 2, y, w, 1); }
  },
  forge(g, t, W, H, ground) {
    const fx = W * .22, fl = .8 + Math.sin(t * 11) * .1 + Math.random() * .1;
    const rg = g.createRadialGradient(fx, ground - 10, 2, fx, ground - 10, 70 * fl); rg.addColorStop(0, 'rgba(255,150,60,.45)'); rg.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 6; k++) { g.fillStyle = Math.random() < .5 ? '#ffd27a' : '#ff6a2a'; g.fillRect(fx - 10 + Math.random() * 20, ground - 8 - Math.random() * 10, 2, 2); }
  },
  tent(g, t, W, H, ground) {
    for (const cx of [.2, .8]) { const x = W * cx, y = 14, f = .9 + Math.sin(t * 7 + cx * 9) * .08; const rg = g.createRadialGradient(x, y, 1, x, y, 40 * f); rg.addColorStop(0, 'rgba(255,200,120,.3)'); rg.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = rg; g.fillRect(x - 40, y - 40, 80, 80); g.fillStyle = '#ffd27a'; g.fillRect(x - 1, y - 2, 3, 4); g.fillStyle = '#3a2a1a'; g.fillRect(x, 0, 1, y - 2); }
  }
};
