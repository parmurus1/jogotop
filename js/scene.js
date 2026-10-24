'use strict';
// Cenários desenhados em um canvas de baixa resolução (cada "pixel" do jogo vira 2–6 pixels da tela).
// Isso mantém o visual pixelado e o custo de desenho baixo em celulares.

const QUALITY = { fps: 30, particles: 1 };

const SCENE = (() => {
  const cv = document.getElementById('bg');
  const g = cv.getContext('2d', { alpha: false });
  let W = 320, H = 180, PX = 4;
  let name = 'title', opt = {}, rot = 0, layers = null, t0 = performance.now(), last = 0, running = true;
  const parts = [];

  const THEMES = {
    title:  { sky: ['#05060a', '#0e1420', '#283242'], far: '#161f2a', mid: '#0d131a', near: '#06080b', fog: 'rgba(120,140,160,.05)', moon: true, stars: true, fire: true, bram: true },
    forest: { sky: ['#05070a', '#0f1620', '#26303a'], far: '#18212a', mid: '#0e151b', near: '#07090c', fog: 'rgba(140,150,160,.06)', moon: true, stars: true, ash: true, fireflies: true },
    ruins:  { sky: ['#08070c', '#17151f', '#2e2a3a'], far: '#1d1a26', mid: '#131119', near: '#0b0a10', fog: 'rgba(160,150,170,.06)', moon: true, stars: false, ruins: true, ash: true },
    swamp:  { sky: ['#050806', '#121a12', '#28361f'], far: '#19231b', mid: '#101710', near: '#090d09', fog: 'rgba(130,160,110,.08)', moon: true, stars: true, dead: true, water: true, fireflies: true },
    lair:   { sky: ['#0a0505', '#1c0b08', '#2e130c'], far: '#1e0d0a', mid: '#140807', near: '#0a0404', fog: 'rgba(200,90,50,.05)', moon: false, rocks: true, embers: true },
    camp:   { sky: ['#05060a', '#0e1420', '#283242'], far: '#161f2a', mid: '#0d131a', near: '#06080b', fog: 'rgba(120,140,160,.04)', moon: true, stars: true, fire: true, bram: true, center: true },
    chapel: { sky: ['#0a090c', '#14121a', '#1c1922'], far: '#1a1720', mid: '#121017', near: '#0a090d', fog: 'rgba(200,180,140,.03)', window: true, candles: true },
    memory: { sky: ['#2a1508', '#5a3418', '#a2683a'], far: '#4a2a14', mid: '#3a200f', near: '#26150a', fog: 'rgba(255,200,140,.08)', bokeh: true, warm: true },
    bloom:  { sky: ['#1a2238', '#5a5a78', '#e0a27a'], far: '#2a3a34', mid: '#1e2c26', near: '#142019', fog: 'rgba(255,230,200,.06)', flowers: true, sun: true },
    clearing:   { sky: ['#06100c', '#0e2018', '#1c3426'], far: '#14261c', mid: '#0e1a14', near: '#070d0a', fog: 'rgba(160,220,170,.07)', moon: true, stars: true, fireflies: true, feature: 'clearing' },
    burnt:      { sky: ['#120604', '#2a0e08', '#4a1a0c'], far: '#1a0a06', mid: '#120604', near: '#080302', fog: 'rgba(90,60,50,.08)', embers: true, ash: true, dead: true, feature: 'burnt' },
    graveyard:  { sky: ['#08090c', '#14161c', '#262a32'], far: '#14161a', mid: '#0e1013', near: '#07080a', fog: 'rgba(170,180,190,.1)', moon: true, stars: true, dead: true, feature: 'graveyard' },
    crypt:      { sky: ['#07060a', '#110e16', '#1a1520'], far: '#120f16', mid: '#0c0a10', near: '#060508', fog: 'rgba(160,150,170,.05)', noTrees: true, feature: 'crypt' },
    chapelruin: { sky: ['#0a0a0e', '#16151c', '#24222c'], far: '#16141a', mid: '#100e14', near: '#08070a', fog: 'rgba(200,200,220,.05)', noTrees: true, feature: 'chapelruin' },
    pond:       { sky: ['#050a0c', '#0c1a1c', '#16302c'], far: '#122220', mid: '#0c1614', near: '#070c0b', fog: 'rgba(150,190,170,.08)', moon: true, stars: true, fireflies: true, dead: true, feature: 'pond' },
    forge:      { sky: ['#140804', '#2a1208', '#3a1a0c'], far: '#1a0a06', mid: '#120604', near: '#0a0403', fog: 'rgba(255,140,60,.03)', noTrees: true, feature: 'forge' },
    tent:       { sky: ['#1a120a', '#2a1e12', '#3a2a18'], far: '#1a1008', mid: '#140c06', near: '#0c0804', fog: 'rgba(255,200,140,.03)', noTrees: true, feature: 'tent' },
    birch:      { sky: ['#0a0c10', '#1a1e26', '#3a3a3a'], far: '#1c2026', mid: '#12161a', near: '#080a0c', fog: 'rgba(220,200,160,.06)', moon: true, stars: true, noTrees: true, leaves: true, feature: 'birch', tuft: '#3a3020' },
    brook:      { sky: ['#05080c', '#0e1822', '#22323e'], far: '#16222a', mid: '#0e161c', near: '#070b0e', fog: 'rgba(150,180,200,.07)', moon: true, stars: true, fireflies: true, feature: 'brook', tuft: '#1c2c22' },
    mushring:   { sky: ['#07050c', '#140e1e', '#241a30'], far: '#1a1424', mid: '#110d18', near: '#08060c', fog: 'rgba(190,150,230,.07)', stars: true, fireflies: true, feature: 'mushring', tuft: '#241a30' },
    arches:     { sky: ['#08070c', '#17151f', '#2e2a3a'], far: '#1d1a26', mid: '#131119', near: '#0b0a10', fog: 'rgba(160,150,170,.06)', moon: true, noTrees: true, ash: true, feature: 'arches', tuft: '#24202c' },
    mangrove:   { sky: ['#040806', '#0e1a12', '#22301c'], far: '#16221a', mid: '#0e1610', near: '#070c08', fog: 'rgba(130,170,110,.09)', moon: true, stars: true, fireflies: true, noTrees: true, water: true, feature: 'mangrove', tuft: '#1a2a16' },
    sunken:     { sky: ['#050808', '#101a1a', '#223030'], far: '#162222', mid: '#0e1616', near: '#070b0b', fog: 'rgba(150,180,170,.1)', moon: true, dead: true, water: true, feature: 'sunken', tuft: '#1a2622' },
    burrow:     { sky: ['#140c06', '#22160c', '#2e1e10'], far: '#1a1008', mid: '#120a06', near: '#0a0604', fog: 'rgba(255,200,140,.03)', noTrees: true, feature: 'burrow' },
    desk:   { sky: ['#0b0704', '#140c07', '#1c1209'], far: '#000', mid: '#000', near: '#000', fog: 'rgba(0,0,0,0)', flat: true },
    void:   { sky: ['#030304', '#060608', '#0a0a0c'], far: '#08080a', mid: '#060607', near: '#040405', fog: 'rgba(80,80,90,.03)' }
  };

  function resize() {
    const dpr = 1;
    PX = clamp(Math.round(Math.max(innerWidth, innerHeight) / 320), 2, 6);
    W = Math.max(1, Math.ceil(innerWidth / PX * dpr)); H = Math.max(1, Math.ceil(innerHeight / PX * dpr));
    cv.width = W; cv.height = H;
    layers = null;
    FX.resize(W, H, PX);
  }

  // Semente fixa por cena: as árvores não "pulam" entre telas.
  function rnd(seed) { const r = makeRng(seed); return () => r.next(); }

  function pine(c, x, base, h, col, edge) {
    const w = Math.max(3, h * .42);
    for (let y = 0; y < h; y++) {
      const k = y / h, tier = (y % Math.max(4, h / 5 | 0)) / Math.max(4, h / 5 | 0);
      const half = Math.max(1, Math.round(w * (.15 + k * .85) * (.55 + tier * .45) / 2));
      c.fillStyle = col; c.fillRect(Math.round(x - half), base - h + y, half * 2, 1);
      if (edge && y % 3 === 0) { c.fillStyle = edge; c.fillRect(Math.round(x - half), base - h + y, 1, 1); }
    }
    c.fillStyle = col; c.fillRect(Math.round(x) - 1, base - 2, 2, 3);
  }
  function deadTree(c, x, base, h, col, R) {
    c.fillStyle = col;
    c.fillRect(x, base - h, 2, h);
    for (let i = 0; i < 4; i++) {
      const by = base - h + 4 + R() * h * .6, dir = R() < .5 ? -1 : 1, len = 4 + R() * 10;
      for (let k = 0; k < len; k++) c.fillRect(x + dir * k, Math.round(by - k * .6), 1, 1);
    }
  }

  function buildLayers() {
    const T = THEMES[name] || THEMES.forest;
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const sky = mk(), far = mk(), mid = mk(), near = mk();
    const s = sky.getContext('2d');
    const grad = s.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, T.sky[0]); grad.addColorStop(.6, T.sky[1]); grad.addColorStop(1, T.sky[2]);
    s.fillStyle = grad; s.fillRect(0, 0, W, H);
    // Faixas de cor (posterização) para combinar com o pixel art.
    s.globalAlpha = .05;
    for (let y = 0; y < H; y += 4) { s.fillStyle = '#000'; s.fillRect(0, y, W, 1); }
    s.globalAlpha = 1;
    const R = rnd(name.length * 977 + W);
    if (T.stars) for (let i = 0; i < W * H / 260; i++) { s.fillStyle = R() < .2 ? '#cfd6e6' : '#6a7280'; s.fillRect(R() * W | 0, R() * H * .55 | 0, 1, 1); }
    if (T.window) { // vitral da capela
      const cx = W / 2 | 0, top = H * .14 | 0, ww = Math.min(40, W * .22) | 0, wh = H * .42 | 0;
      const cols = ['#5a2a3a', '#2a3a5a', '#5a4a2a', '#2a4a3a', '#4a2a5a'];
      for (let y = 0; y < wh; y++) for (let x = -ww / 2; x < ww / 2; x++) {
        const arch = y < ww / 2 ? Math.hypot(x, ww / 2 - y) < ww / 2 : true;
        if (!arch) continue;
        s.fillStyle = (x % 6 === 0 || y % 7 === 0) ? '#0a090c' : cols[((x / 6 | 0) + (y / 7 | 0) + 10) % cols.length];
        s.fillRect(cx + x, top + y, 1, 1);
      }
    }
    if (T.sun) { const sx = W * .5, sy = H * .62; for (let r = 30; r > 0; r -= 3) { s.fillStyle = `rgba(255,${180 + r},${120 + r * 2},${.05 + (30 - r) * .006})`; s.beginPath(); s.arc(sx, sy, r, 0, 7); s.fill(); } }
    // Mesa de madeira vista de cima, iluminada por uma vela (fundo do mapa).
    if (T.flat) {
      for (let y = 0; y < H; y++) { s.fillStyle = `rgba(${y % 9 === 0 ? '0,0,0,.25' : '90,60,30,' + (.01 + R() * .03)})`; s.fillRect(0, y, W, 1); }
      for (let i = 0; i < W * H / 40; i++) { s.fillStyle = 'rgba(0,0,0,.15)'; s.fillRect(R() * W | 0, R() * H | 0, 2 + R() * 6 | 0, 1); }
      const glow = s.createRadialGradient(W * .5, H * .55, 4, W * .5, H * .55, Math.max(W, H) * .7);
      glow.addColorStop(0, 'rgba(255,160,80,.16)'); glow.addColorStop(1, 'rgba(0,0,0,.7)');
      s.fillStyle = glow; s.fillRect(0, 0, W, H);
      layers = { sky, far, mid, near, ground: H + 40 };
      return;
    }
    const fc = far.getContext('2d'), mc = mid.getContext('2d'), nc = near.getContext('2d');
    // No combate (arena) o chão sobe para os lutadores pisarem nele, e embaixo fica o terreno onde vão as cartas.
    const ground = (opt.arena ? (H > W ? .4 : .45) : T.bram && H > W * 1.1 ? .58 : .78) * H | 0;
    if (T.ruins) {
      for (let x = -10; x < W + 20; x += 26 + (R() * 18 | 0)) {
        const h = 30 + R() * 50 | 0; fc.fillStyle = T.far; fc.fillRect(x, ground - h, 7, h + 30);
        if (R() < .5) { fc.fillRect(x, ground - h, 22, 4); for (let k = 0; k < 11; k++) fc.fillRect(x + 7 + k, ground - h + 4 + Math.round(Math.sqrt(k) * 2), 1, 1); }
      }
    }
    if (T.rocks) {
      for (let x = 0; x < W; x++) {
        const h1 = 40 + Math.sin(x * .05) * 14 + Math.sin(x * .13) * 6; fc.fillStyle = T.far; fc.fillRect(x, 0, 1, h1 * .5);
        fc.fillRect(x, ground - h1, 1, h1 + 40);
        const h2 = 18 + Math.sin(x * .09 + 2) * 8; mc.fillStyle = T.mid; mc.fillRect(x, ground - h2 + 10, 1, h2 + 30);
      }
    } else if (!T.window && !T.noTrees) {
      for (let x = -6; x < W + 6; x += 5 + (R() * 7 | 0)) {
        if (T.dead && R() < .5) deadTree(fc, x, ground - 6, 24 + R() * 30 | 0, T.far, R);
        else if (!T.ruins || R() < .4) pine(fc, x, ground - 4, 26 + R() * 34 | 0, T.far, 'rgba(160,180,210,.08)');
      }
      for (let x = -8; x < W + 8; x += 9 + (R() * 12 | 0)) {
        if (T.dead && R() < .6) deadTree(mc, x, ground + 2, 30 + R() * 34 | 0, T.mid, R);
        else pine(mc, x, ground + 3, 36 + R() * 40 | 0, T.mid, 'rgba(255,255,255,.03)');
      }
    }
    fc.fillStyle = T.far; fc.fillRect(0, ground - 4, W, H);
    mc.fillStyle = T.mid; mc.fillRect(0, ground + 2, W, H);
    // primeiro plano: chão e algumas árvores grandes nas bordas
    nc.fillStyle = T.near; nc.fillRect(0, ground + 10, W, H);
    for (let x = 0; x < W; x++) if (R() < .25) nc.fillRect(x, ground + 8 + (R() * 3 | 0), 1, 3);
    if (!T.window && !T.rocks && !T.center && !T.noTrees) {
      const big = Math.min(H * .9, W * 1.1) | 0;
      pine(nc, -4 + R() * 10, H + 6, big, T.near);
      pine(nc, W + 2 - R() * 10, H + 6, big * .94 | 0, T.near);
    }
    if (T.water) { mc.fillStyle = 'rgba(70,100,80,.35)'; mc.fillRect(0, ground + 6, W, 5); }
    if (T.flowers) for (let i = 0; i < W / 3; i++) { nc.fillStyle = ['#e0a0b0', '#f0d080', '#c0e0f0', '#f4f0e8'][i % 4]; nc.fillRect(R() * W | 0, ground + 11 + (R() * (H - ground - 12) | 0), 1, 1); }
    if (opt.arena) groundDetail(nc, T, ground, R);
    if (T.feature && SCENERY[T.feature]) SCENERY[T.feature]({ s, fc, mc, nc, W, H, ground, R, T, arena: !!opt.arena });
    layers = { sky, far, mid, near, ground };
    if (opt.table) layers.table = buildTable(T);
    if (opt.arena) layers.shade = buildShade(ground);
  }

  // Chão da arena: tufos, pedrinhas e uma trilha, mais densos perto da câmera.
  function groundDetail(c, T, ground, R) {
    const tuft = T.tuft || T.mid;
    c.fillStyle = 'rgba(255,255,255,.025)';
    for (let y = ground + 12; y < H; y += 3) { const w = (y - ground) * 1.6; c.fillRect(Math.round(W / 2 - w / 2 + Math.sin(y * .2) * 3), y, Math.round(w), 1); }
    for (let i = 0; i < W * (H - ground) / 22; i++) {
      const y = ground + 10 + Math.pow(R(), .7) * (H - ground - 10), x = R() * W, k = (y - ground) / (H - ground);
      c.fillStyle = R() < .5 ? tuft : 'rgba(0,0,0,.35)';
      if (R() < .7) { c.fillRect(x | 0, y | 0, 1, 1 + (k * 3 | 0)); c.fillRect((x + 1) | 0, (y + 1) | 0, 1, 1 + (k * 2 | 0)); }
      else c.fillRect(x | 0, y | 0, 1 + (k * 4 | 0), 1 + (k * 2 | 0));
    }
  }
  // Sombra por cima do chão para as cartas ficarem legíveis, e uma vinheta.
  function buildShade(ground) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, ground, 0, H);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.3, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,.72)');
    x.fillStyle = gr; x.fillRect(0, ground, W, H - ground);
    const v = x.createRadialGradient(W / 2, H * .45, H * .2, W / 2, H * .45, Math.max(W, H) * .75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
    x.fillStyle = v; x.fillRect(0, 0, W, H);
    return c;
  }

  // Mesa de combate em perspectiva (como um tabuleiro sobre a mesa), com velas nos cantos.
  function buildTable(T) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const top = Math.round(H * (H > W ? .5 : .56)), vx = W / 2, vy = top - H * .9;
    // escurece o fundo atrás da mesa, com névoa esverdeada
    const fog = x.createLinearGradient(0, 0, 0, top);
    fog.addColorStop(0, 'rgba(0,0,0,.45)'); fog.addColorStop(1, T.warm ? 'rgba(60,30,10,.2)' : 'rgba(20,60,45,.28)');
    x.fillStyle = fog; x.fillRect(0, 0, W, top);
    const backL = W * .1, backR = W * .9;
    const wood = T.rocks ? ['#2a120c', '#1c0b07'] : ['#2a1c12', '#1a110a'];
    for (let y = top; y < H; y++) {
      const k = (y - top) / (H - top);
      const l = lerp(backL, -W * .35, k), r = lerp(backR, W * 1.35, k);
      x.fillStyle = y === top ? '#4a3220' : wood[(y >> 1) % 2 ? 0 : 1];
      x.fillRect(Math.round(l), y, Math.round(r - l), 1);
    }
    // tábuas convergindo para o fundo
    x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 1;
    for (let i = -6; i <= 6; i++) {
      const bx = vx + i * (backR - backL) / 9;
      const fx = vx + (bx - vx) * ((H - vy) / (top - vy));
      x.beginPath(); x.moveTo(bx, top); x.lineTo(fx, H); x.stroke();
    }
    x.fillStyle = 'rgba(255,220,160,.06)';
    for (let y = top + 3; y < H; y += 5 + ((y - top) / 6 | 0)) x.fillRect(0, y, W, 1);
    // borda da mesa
    x.fillStyle = '#5a3c24'; x.fillRect(Math.round(backL), top, Math.round(backR - backL), 1);
    // vinheta nas pontas
    const vig = x.createRadialGradient(vx, H * .9, H * .1, vx, H * .9, W * .8);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.6)');
    x.fillStyle = vig; x.fillRect(0, top, W, H - top);
    return { c, top, candles: [[W * .12, top + 2], [W * .88, top + 2]] };
  }
  function drawTable(t) {
    const tb = layers.table;
    g.drawImage(tb.c, 0, 0);
    for (const [cx, cy] of tb.candles) {
      const fl = .85 + Math.sin(t * 13 + cx) * .08 + Math.random() * .07;
      const rg = g.createRadialGradient(cx, cy - 8, 1, cx, cy - 8, 46 * fl);
      rg.addColorStop(0, 'rgba(255,190,110,.28)'); rg.addColorStop(1, 'rgba(255,170,90,0)');
      g.fillStyle = rg; g.fillRect(cx - 50, cy - 58, 100, 100);
      g.fillStyle = '#e8dcc0'; g.fillRect(Math.round(cx) - 1, cy - 7, 3, 7);
      g.fillStyle = '#b8a888'; g.fillRect(Math.round(cx) + 1, cy - 7, 1, 7);
      g.fillStyle = Math.random() < .5 ? '#ffd27a' : '#ffb45c'; g.fillRect(Math.round(cx) - 1, cy - 10, 2, 3);
      g.fillStyle = '#fff6d0'; g.fillRect(Math.round(cx), cy - 9, 1, 1);
    }
  }

  function set(n, o = {}) {
    if (n !== name || !!o.table !== !!opt.table || !!o.arena !== !!opt.arena) { name = n; layers = null; parts.length = 0; }
    opt = o;
  }
  function setRot(x) { rot = clamp(x, 0, 1); }

  function spawn(p) { if (parts.length < 160 * QUALITY.particles) parts.push(p); }

  function drawFire(x, y, s, t) {
    for (let i = 0; i < 3; i++) if (Math.random() < .7) spawn({ x: x + (Math.random() - .5) * 6 * s, y, vx: (Math.random() - .5) * 4, vy: -12 - Math.random() * 14, life: .5 + Math.random() * .5, max: 1, kind: 'flame', s });
    g.fillStyle = '#2a1408'; g.fillRect(x - 6 * s, y, 12 * s, 2); g.fillStyle = '#1a0c06'; g.fillRect(x - 5 * s, y + 1, 10 * s, 2);
    // brilho no chão
    const glow = .14 + Math.sin(t * 9) * .02 + Math.random() * .02;
    const rg = g.createRadialGradient(x, y, 2, x, y, 60 * s);
    rg.addColorStop(0, `rgba(255,140,60,${glow})`); rg.addColorStop(1, 'rgba(255,140,60,0)');
    g.fillStyle = rg; g.fillRect(x - 60 * s, y - 60 * s, 120 * s, 120 * s);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!running || document.hidden) return;
    if (now - last < 1000 / QUALITY.fps - 2) return;
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    const t = (now - t0) / 1000;
    if (!layers) buildLayers();
    const T = THEMES[name] || THEMES.forest;
    g.drawImage(layers.sky, 0, 0);
    if (T.moon) {
      const mx = W * .78 | 0, my = H * .16 | 0;
      g.fillStyle = 'rgba(220,225,235,.07)'; g.beginPath(); g.arc(mx, my, 13, 0, 7); g.fill();
      g.fillStyle = '#d8dce4'; g.beginPath(); g.arc(mx, my, 6, 0, 7); g.fill();
      g.fillStyle = '#b4b8c4'; g.fillRect(mx - 2, my - 1, 2, 2); g.fillRect(mx + 2, my + 2, 1, 1);
    }
    const sway = Math.sin(t * .2) * 1.5;
    g.drawImage(layers.far, sway * .3 | 0, 0);
    // névoa em faixas
    g.fillStyle = T.fog;
    for (let i = 0; i < 4; i++) { const y = layers.ground - 18 + i * 7, off = (t * (3 + i * 2) + i * 50) % (W + 80) - 80; g.fillRect(off, y, 80 + i * 20, 3); g.fillRect(off - W * .6, y + 2, 60, 2); }
    g.drawImage(layers.mid, sway * .6 | 0, 0);
    if (T.fire) {
      const fx = T.center ? W * .5 : W > H * .9 ? W * .84 : W * .5 + Math.min(40, W * .18), fy = layers.ground + 12;
      drawFire(fx, fy, 1, t);
      if (T.bram) {
        const b = SPR.get('bram'), bx = Math.round(fx - (T.center ? 30 : 34)), by = Math.round(fy - b.height + 2);
        g.globalAlpha = .9; g.drawImage(b, bx, by); g.globalAlpha = 1;
      }
    }
    if (T.candles) {
      for (const cx of [.2, .3, .7, .8]) { const x = W * cx | 0, y = layers.ground + 6; g.fillStyle = '#d8ccb0'; g.fillRect(x, y - 6, 2, 6); g.fillStyle = Math.random() < .5 ? '#ffd27a' : '#ffb45c'; g.fillRect(x, y - 8, 2, 2); g.fillStyle = 'rgba(255,200,120,.06)'; g.beginPath(); g.arc(x + 1, y - 7, 10, 0, 7); g.fill(); }
    }
    g.drawImage(layers.near, 0, 0);
    if (T.feature && SCENERY_ANIM[T.feature]) SCENERY_ANIM[T.feature](g, t, W, H, layers.ground);
    if (layers.table) drawTable(t);
    if (layers.shade) g.drawImage(layers.shade, 0, 0);
    // partículas de ambiente
    const r = QUALITY.particles;
    if (T.ash && Math.random() < .5 * r) spawn({ x: Math.random() * W, y: -2, vx: 2 + Math.random() * 3, vy: 5 + Math.random() * 6, life: 8, max: 8, kind: 'ash' });
    if (T.embers && Math.random() < .8 * r) spawn({ x: Math.random() * W, y: H + 2, vx: (Math.random() - .5) * 6, vy: -8 - Math.random() * 12, life: 6, max: 6, kind: 'ember' });
    if (T.leaves && Math.random() < .12 * r) spawn({ x: Math.random() * W, y: -2, vx: 3 + Math.random() * 4, vy: 6 + Math.random() * 5, life: 10, max: 10, kind: 'leaf' });
    if (T.fireflies && Math.random() < .04 * r) spawn({ x: Math.random() * W, y: layers.ground - Math.random() * 40, vx: (Math.random() - .5) * 3, vy: (Math.random() - .5) * 2, life: 5, max: 5, kind: 'fly' });
    if (T.bokeh && Math.random() < .12 * r) spawn({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * 2, vy: -1 - Math.random(), life: 5, max: 5, kind: 'bokeh', s: 2 + Math.random() * 5 | 0 });
    if (T.flowers && Math.random() < .2 * r) spawn({ x: Math.random() * W, y: -2, vx: 4 + Math.random() * 4, vy: 4 + Math.random() * 3, life: 9, max: 9, kind: 'petal' });
    if (rot > .2 && Math.random() < rot * .5 * r) spawn({ x: Math.random() * W, y: -2, vx: (Math.random() - .5) * 2, vy: 4 + Math.random() * 4, life: 9, max: 9, kind: 'spore' });
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt; if (p.life <= 0 || p.y > H + 4 || p.x < -10 || p.x > W + 10) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const a = Math.min(1, p.life / p.max * 2);
      switch (p.kind) {
        case 'ash': g.fillStyle = `rgba(170,170,175,${.5 * a})`; g.fillRect(p.x | 0, p.y | 0, 1, 1); p.vx += Math.sin(t + p.y * .1) * .2; break;
        case 'ember': g.fillStyle = Math.random() < .5 ? `rgba(255,120,50,${a})` : `rgba(255,200,90,${a})`; g.fillRect(p.x | 0, p.y | 0, 1, 1); break;
        case 'flame': { const k = p.life / p.max; g.fillStyle = k > .7 ? '#ffe08a' : k > .4 ? '#ffb45c' : k > .2 ? '#ff6a2a' : 'rgba(90,40,30,.6)'; const sz = k > .5 ? 2 : 1; g.fillRect(p.x | 0, p.y | 0, sz, sz); break; }
        case 'fly': { const on = Math.sin(t * 3 + p.x) > 0; if (on) { g.fillStyle = `rgba(200,230,120,${a})`; g.fillRect(p.x | 0, p.y | 0, 1, 1); g.fillStyle = `rgba(200,230,120,${.15 * a})`; g.fillRect((p.x | 0) - 1, (p.y | 0) - 1, 3, 3); } p.vx += (Math.random() - .5) * .8; p.vy += (Math.random() - .5) * .8; break; }
        case 'bokeh': g.fillStyle = `rgba(255,210,150,${.12 * a})`; g.beginPath(); g.arc(p.x, p.y, p.s, 0, 7); g.fill(); break;
        case 'petal': g.fillStyle = `rgba(240,170,190,${a})`; g.fillRect(p.x | 0, p.y | 0, 1, 1); p.vx += Math.sin(t * 2 + p.y) * .3; break;
        case 'leaf': g.fillStyle = `rgba(${200 + (p.x * 7 % 55) | 0},${120 + (p.y * 3 % 60) | 0},40,${a})`; g.fillRect(p.x | 0, p.y | 0, 2, 1); p.vx += Math.sin(t * 3 + p.y * .2) * .4; break;
        case 'spore': g.fillStyle = `rgba(110,130,60,${.7 * a})`; g.fillRect(p.x | 0, p.y | 0, 1, 1); break;
      }
    }
    // Podridão: dessatura e escurece a cena.
    if (rot > .02) {
      g.globalCompositeOperation = 'saturation'; g.fillStyle = `rgba(128,128,128,${rot * .7})`; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(150,170,120,${rot * .5})`; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
    }
    if (T.warm) { g.fillStyle = 'rgba(255,170,90,.06)'; g.fillRect(0, 0, W, H); }
    FX.draw(dt);
    VHS.tick(now);
  }

  addEventListener('resize', () => { clearTimeout(resize._t); resize._t = setTimeout(resize, 120); });
  return { set, setRot, resize, start() { resize(); requestAnimationFrame(frame); }, pause(v) { running = !v; }, get name() { return name; }, get px() { return PX; } };
})();

// ---------- camada VHS ----------
const VHS = (() => {
  const root = document.getElementById('vhs');
  const nc = document.getElementById('noise');
  const ng = nc.getContext('2d');
  nc.width = 128; nc.height = 72;
  const img = ng.createImageData(128, 72);
  let base = .5, extra = 0, extraUntil = 0, lastNoise = 0, clarity = 0, decay = 0;
  let osdTimer = 0;
  function tick(now) {
    if (now - lastNoise < 80) return;
    lastNoise = now;
    const boost = now < extraUntil ? extra : 0;
    const k = clamp(base * (.22 + decay * .7 + boost) - clarity, 0, 1);
    root.style.setProperty('--noise', (k * .13).toFixed(3));
    if (k <= .01) return;
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    ng.putImageData(img, 0, 0);
  }
  return {
    tick,
    setBase(x) { base = x; root.style.setProperty('--vhs', x.toFixed(2)); },
    // Quanto mais o bosque apodrece (e mais Bram foge das lembranças), mais gasta fica a fita.
    setDecay(x) { decay = clamp(x, 0, 1); },
    // Distúrbio curto (fugir de uma memória, golpe forte, troca de cena).
    disturb(amount = 1, ms = 600) {
      extra = Math.max(extra * (performance.now() < extraUntil ? 1 : 0), amount); extraUntil = performance.now() + ms;
      if (base <= 0) return;
      root.classList.remove('tracking'); void root.offsetWidth; root.classList.add('tracking');
    },
    // Imagem nítida por alguns segundos (aceitar uma memória).
    clear(ms = 4000) {
      clarity = 1; root.classList.add('clear'); document.body.classList.add('vivid');
      setTimeout(() => { clarity = 0; root.classList.remove('clear'); document.body.classList.remove('vivid'); }, ms);
    },
    osd(text, ms = 2200) {
      const el = document.getElementById('osd');
      el.textContent = text; el.classList.add('show');
      clearTimeout(osdTimer); osdTimer = setTimeout(() => el.classList.remove('show'), ms);
    }
  };
})();

// ---------- efeitos sobre a interface (partículas, números, tremor) ----------
const FX = (() => {
  const layer = document.getElementById('fxlayer');
  const cv = document.createElement('canvas'); cv.id = 'fx'; layer.appendChild(cv);
  const g = cv.getContext('2d');
  let W = 320, H = 180, PX = 4, dirty = false;
  const ps = [];
  function resize(w, h, px) { W = w; H = h; PX = px; cv.width = w; cv.height = h; }
  const toLocal = (x, y) => [x / PX, y / PX];
  function burst(x, y, o = {}) {
    if (reduced()) return;
    const [lx, ly] = toLocal(x, y), n = Math.round((o.n || 14) * QUALITY.particles);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (o.speed || 40) * (.4 + Math.random());
      ps.push({ x: lx, y: ly, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0), g: o.grav ?? 60, life: o.life || .6, max: o.life || .6, c: o.colors ? o.colors[i % o.colors.length] : '#fff', s: o.size || 1 });
    }
    dirty = true;
  }
  // Fio de alma: partículas viajando de um ponto a outro (saco de almas → carta).
  function stream(x0, y0, x1, y1, color = '#9fe8f0', n = 10) {
    if (reduced()) return;
    const [a, b] = toLocal(x0, y0), [c, d] = toLocal(x1, y1);
    for (let i = 0; i < n; i++) ps.push({ x: a, y: b, tx: c, ty: d, delay: i * .025, life: .5, max: .5, c: color, s: 1, seek: true, wob: Math.random() * 6 });
    dirty = true;
  }
  function draw(dt) {
    if (!ps.length) { if (dirty) { g.clearRect(0, 0, W, H); dirty = false; } return; }
    g.clearRect(0, 0, W, H);
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.life -= dt; if (p.life <= 0) { ps.splice(i, 1); continue; }
      if (p.seek) { const k = 1 - p.life / p.max; p.x = lerp(p.x, p.tx, k * .35) + Math.sin(k * 9 + p.wob) * .4; p.y = lerp(p.y, p.ty, k * .35); }
      else { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .97; }
      g.globalAlpha = Math.min(1, p.life / p.max * 1.6);
      g.fillStyle = p.c; g.fillRect(p.x | 0, p.y | 0, p.s, p.s);
    }
    g.globalAlpha = 1;
  }
  // Anel que se expande a partir de um ponto (o "PAM" do selo).
  function shockwave(x, y, color = '#9fe8f0') {
    if (reduced()) return;
    const el = document.createElement('div');
    el.className = 'shock'; el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.setProperty('--c', color);
    layer.appendChild(el);
    el.animate([{ transform: 'translate(-50%,-50%) scale(.1)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => el.remove();
  }
  function float(text, x, y, cls = '') {
    const el = document.createElement('div');
    el.className = 'float ' + cls; el.textContent = text;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }
  function shake(power = 1) {
    if (reduced()) return;
    const app = document.getElementById('app');
    const p = 3 * power;
    app.animate([
      { transform: 'translate(0,0)' }, { transform: `translate(${-p}px,${p * .6}px)` }, { transform: `translate(${p}px,${-p * .5}px)` },
      { transform: `translate(${-p * .5}px,${-p * .4}px)` }, { transform: 'translate(0,0)' }
    ], { duration: 260, easing: 'steps(5)' });
  }
  function flash(color = '#fff', op = .25) {
    const el = document.createElement('div'); el.className = 'flash'; el.style.background = color;
    layer.appendChild(el);
    el.animate([{ opacity: op }, { opacity: 0 }], { duration: 260, easing: 'ease-out' }).onfinish = () => el.remove();
  }
  return { resize, burst, stream, draw, float, shake, flash, shockwave };
})();

function reduced() { return !!(window.SETTINGS && SETTINGS.reducedMotion) || matchMedia('(prefers-reduced-motion: reduce)').matches; }
