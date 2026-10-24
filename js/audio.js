'use strict';
// Áudio 100% procedural (Web Audio). Música em sequenciador com "lookahead",
// ambiente em camadas e efeitos sonoros sintetizados. A fita (wow/flutter) aumenta com a Podridão.

const AUDIO = (() => {
  let ctx = null, master, musicBus, sfxBus, ambBus, comp, verb, verbIn, wow, wowDepth, musicTone;
  let noiseBuf = null;
  const vol = { master: .8, music: .7, sfx: .8, amb: .6 };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  // ---------- inicialização ----------
  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC({ latencyHint: 'playback' });
    master = ctx.createGain();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = .01; comp.release.value = .25;
    master.connect(comp); comp.connect(ctx.destination);
    musicTone = ctx.createBiquadFilter(); musicTone.type = 'lowpass'; musicTone.frequency.value = 5200; musicTone.Q.value = .3;
    musicBus = ctx.createGain(); musicBus.connect(musicTone); musicTone.connect(master);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    ambBus = ctx.createGain(); ambBus.connect(master);
    // Reverb com resposta ao impulso gerada (cauda de ~2,8 s).
    verb = ctx.createConvolver(); verb.buffer = impulse(2.8, 2.6);
    verbIn = ctx.createGain(); verbIn.gain.value = .9;
    const verbOut = ctx.createGain(); verbOut.gain.value = .55;
    verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(master);
    // Wow da fita: LFO lento modulando a afinação de tudo que é musical.
    wow = ctx.createOscillator(); wow.frequency.value = .55;
    const flutter = ctx.createOscillator(); flutter.frequency.value = 6.3;
    wowDepth = ctx.createGain(); wowDepth.gain.value = 6;
    const flDepth = ctx.createGain(); flDepth.gain.value = 1.4;
    wow.connect(wowDepth); flutter.connect(flDepth); flDepth.connect(wowDepth);
    wow.start(); flutter.start();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    applyVolumes();
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {});
    });
    startAmbience();
    if (pendingSong) { const p = pendingSong; pendingSong = null; music(p); }
    if (pendingAmb) { ambience(pendingAmb); }
    timer = setInterval(schedule, 40);
  }

  function impulse(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  function applyVolumes() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(vol.master, t, .05);
    musicBus.gain.setTargetAtTime(vol.music * .55, t, .05);
    sfxBus.gain.setTargetAtTime(vol.sfx * .8, t, .05);
    ambBus.gain.setTargetAtTime(vol.amb * .7, t, .05);
  }
  function setVolumes(v) { Object.assign(vol, v); applyVolumes(); }

  // 0 = fita limpa, 1 = fita gasta (mais wow, mais abafado).
  function setWarp(x) {
    if (!ctx) return;
    const t = ctx.currentTime;
    wowDepth.gain.setTargetAtTime(5 + x * 26, t, .8);
    musicTone.frequency.setTargetAtTime(5200 - x * 3400, t, .8);
  }
  // Abafa a música (menus por cima do jogo, memórias distantes).
  function muffle(on) {
    if (!ctx) return;
    musicTone.frequency.setTargetAtTime(on ? 900 : 5200, ctx.currentTime, .25);
  }

  // ---------- instrumentos ----------
  function env(g, t, a, peak, dec, sus = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sus, .0001), t + a + dec);
  }
  // Liga a afinação ao wow da fita e solta a ligação quando o som termina (evita vazamento de nós).
  function tape(src) { wowDepth.connect(src.detune); src.onended = () => { try { wowDepth.disconnect(src.detune); } catch { /* já desligado */ } }; }
  function osc(type, freq, t, dur, dest, peak = .2, a = .005, opts = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(opts.slide, t + dur);
    if (opts.tape !== false) tape(o);
    if (opts.detune) o.detune.value = opts.detune;
    env(g, t, a, peak, dur);
    o.connect(g); g.connect(dest);
    if (opts.verb) { const s = ctx.createGain(); s.gain.value = opts.verb; g.connect(s); s.connect(verbIn); }
    o.start(t); o.stop(t + a + dur + .05);
    return g;
  }
  function noise(t, dur, dest, peak, filterType, freq, q = 1, a = .002, opts = {}) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + dur);
    const g = ctx.createGain(); env(g, t, a, peak, dur);
    s.connect(f); f.connect(g); g.connect(dest);
    if (opts.verb) { const v = ctx.createGain(); v.gain.value = opts.verb; g.connect(v); v.connect(verbIn); }
    s.start(t, Math.random() * 1.5); s.stop(t + a + dur + .05);
  }

  // Caixinha de música: fundamental + oitava + parcial levemente inarmônica.
  function musicBox(m, t, v = .12, dest = musicBus, rev = .5) {
    const f = mtof(m);
    osc('sine', f, t, 1.8, dest, v, .003, { verb: rev });
    osc('sine', f * 2, t, .9, dest, v * .35, .002, { verb: rev });
    osc('triangle', f * 3.01, t, .25, dest, v * .12, .002);
  }
  // Corda dedilhada (Karplus-Strong), com buffers em cache por nota.
  const ksCache = new Map();
  function ksBuffer(m, bright) {
    const key = m + (bright ? 'b' : '');
    if (ksCache.has(key)) return ksCache.get(key);
    const sr = ctx.sampleRate, f = mtof(m), N = Math.max(2, Math.round(sr / f));
    const len = Math.floor(sr * 1.6), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    const ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    const damp = bright ? .996 : .992;
    let idx = 0, prev = 0;
    for (let i = 0; i < len; i++) {
      const cur = ring[idx];
      const nxt = (cur + ring[(idx + 1) % N]) * .5 * damp;
      ring[idx] = bright ? nxt : (nxt + prev) * .5 + nxt * .0;
      prev = nxt;
      d[i] = cur;
      idx = (idx + 1) % N;
    }
    ksCache.set(key, b);
    return b;
  }
  function pluck(m, t, v = .2, dest = musicBus, opts = {}) {
    const s = ctx.createBufferSource(); s.buffer = ksBuffer(m, opts.bright);
    tape(s);
    const g = ctx.createGain(); g.gain.value = v;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.tone || 3200;
    s.connect(f); f.connect(g); g.connect(dest);
    if (opts.verb !== 0) { const r = ctx.createGain(); r.gain.value = opts.verb ?? .35; g.connect(r); r.connect(verbIn); }
    s.start(t); s.stop(t + 1.6);
  }
  // Pad: serras desafinadas atrás de um passa-baixa, ataque lento.
  function pad(ms, t, dur, v = .05, dest = musicBus, cutoff = 900) {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = .5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(v, t + Math.min(1.6, dur * .4));
    g.gain.setValueAtTime(v, t + dur * .7);
    g.gain.linearRampToValueAtTime(.0001, t + dur + .8);
    f.connect(g); g.connect(dest);
    const r = ctx.createGain(); r.gain.value = .6; g.connect(r); r.connect(verbIn);
    for (const m of ms) for (const dt of [-7, 6]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = dt;
      tape(o);
      o.connect(f); o.start(t); o.stop(t + dur + 1);
    }
  }
  // Coral: senoides com vibrato, para o dragão e a capela.
  function choir(ms, t, dur, v = .04, dest = musicBus) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * .35); g.gain.linearRampToValueAtTime(.0001, t + dur + .5);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = .7;
    g.connect(f); f.connect(dest);
    const r = ctx.createGain(); r.gain.value = 1; f.connect(r); r.connect(verbIn);
    const vib = ctx.createOscillator(); vib.frequency.value = 5; const vd = ctx.createGain(); vd.gain.value = 9; vib.connect(vd); vib.start(t); vib.stop(t + dur + 1);
    for (const m of ms) for (const ty of ['triangle', 'sawtooth']) {
      const o = ctx.createOscillator(); o.type = ty; o.frequency.value = mtof(m);
      vd.connect(o.detune); tape(o);
      const og = ctx.createGain(); og.gain.value = ty === 'sawtooth' ? .25 : 1;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 1);
    }
  }
  function bass(m, t, dur, v = .2, dest = musicBus) {
    osc('triangle', mtof(m), t, dur, dest, v, .01);
    osc('sine', mtof(m) / 2, t, dur, dest, v * .6, .01);
  }
  function bell(m, t, v = .1, dest = musicBus) {
    const f = mtof(m);
    [[1, 1, 3], [2.76, .5, 1.8], [5.4, .25, .9], [8.9, .12, .5]].forEach(([r, a, d]) => osc('sine', f * r, t, d, dest, v * a, .002, { verb: .9 }));
  }
  function kick(t, v = .5, dest = musicBus) { osc('sine', 120, t, .32, dest, v, .002, { slide: 38, tape: false }); noise(t, .02, dest, v * .2, 'highpass', 2000); }
  function hat(t, v = .05, dest = musicBus) { noise(t, .04, dest, v, 'highpass', 7000); }
  function snare(t, v = .14, dest = musicBus) { noise(t, .16, dest, v, 'bandpass', 1900, .8, .002, { verb: .3 }); osc('triangle', 190, t, .08, dest, v * .6, .002, { tape: false }); }
  function sawBass(m, t, dur, v = .08, cutoff = 1600, dest = musicBus) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = mtof(m); tape(o);
    f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(cutoff, t); f.frequency.exponentialRampToValueAtTime(180, t + dur);
    env(g, t, .004, v, dur);
    o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .05);
  }
  function stab(ms, t, v = .03, dest = musicBus) { for (const m of ms) osc('square', mtof(m), t, .12, dest, v, .003, { verb: .3 }); }
  function tom(t, f, v = .2, dest = musicBus) { osc('sine', f, t, .22, dest, v, .002, { slide: f * .5, tape: false }); }
  function crash(t, v = .1, dest = musicBus) { noise(t, 1.4, dest, v, 'highpass', 5000, .5, .002, { verb: .4 }); }
  // Bateria comum aos combates; o nível de intensidade enche os pratos e o bumbo.
  function drums(i, t, b, lv) {
    const s = b / 4;
    for (let k = 0; k < 4; k++) kick(t + k * b, k % 2 ? .3 : .42);
    if (i % 2 || lv >= 1) kick(t + b * 3.5, .22);
    if (lv >= 2) { kick(t + b * 1.5, .25); kick(t + b * 2.75, .2); }
    snare(t + b, .13); snare(t + b * 3, .14);
    if (lv >= 1) { snare(t + b * 1.75, .04); snare(t + b * 3.75, .05); }
    for (let k = 0; k < 16; k++) hat(t + k * s, k % 4 === 2 ? .05 : k % 2 ? .018 : .03);
    if (i % 8 === 7) for (let k = 0; k < 4; k++) tom(t + b * 3 + k * s, 160 - k * 25, .22);
    if (i % 8 === 0 || (lv >= 2 && i % 4 === 0)) crash(t, .1);
  }
  let leadCurve = null;
  const level = () => intensity >= .62 ? 2 : intensity >= .3 ? 1 : 0;
  // Solo distorcido (só no nível mais tenso).
  function lead(ms, t, step, dest = musicBus) {
    ms.forEach((m, k) => {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), ws = ctx.createWaveShaper();
      o.type = 'square'; o.frequency.value = mtof(m); tape(o);
      ws.curve = leadCurve || (leadCurve = Float32Array.from({ length: 256 }, (_, j) => Math.tanh((j / 128 - 1) * 3)));
      f.type = 'lowpass'; f.frequency.value = 2400; env(g, t + k * step, .01, .035, step * .9);
      o.connect(ws); ws.connect(f); f.connect(g); g.connect(dest);
      const r = ctx.createGain(); r.gain.value = .3; g.connect(r); r.connect(verbIn);
      o.start(t + k * step); o.stop(t + k * step + step + .05);
    });
  }
  function clank(t, v = .1, dest = musicBus) { [[1, 1, .5], [2.4, .6, .3], [3.9, .4, .2], [6.1, .2, .12]].forEach(([r, a, d]) => osc('square', 520 * r, t, d, dest, v * a, .001, { tape: false, verb: .4 })); noise(t, .05, dest, v, 'highpass', 4000); }
  function taiko(t, v = .5, dest = musicBus) { osc('sine', 90, t, .6, dest, v, .003, { slide: 45, tape: false, verb: .5 }); noise(t, .08, dest, v * .25, 'lowpass', 600); }

  // ---------- músicas ----------
  // Tema de ninar da Tamsin (Lá menor, 3/4). Usado no título, nas memórias e no final.
  const LULLABY = [
    [69, 72, 76], [74, 72, 71], [72, 69, 64], [69, null, null], [65, 69, 72], [71, 69, 67], [69, 71, 72], [76, null, null],
    [76, 77, 76], [74, 72, 74], [72, 71, 69], [71, null, null], [72, 74, 76], [77, 76, 74], [72, 71, 68], [69, null, null]
  ];
  const LULL_ROOT = [45, 43, 45, 40, 41, 43, 45, 40, 48, 43, 45, 40, 41, 38, 40, 45];
  const chordOf = r => { const minor = [45, 38, 40].includes(r) && r !== 40; return [r + 12, r + 12 + (minor ? 3 : 4), r + 19]; };

  const SONGS = {
    title: { bpm: 64, beats: 3, bar(i, t, b) {
      const n = i % 16, mel = LULLABY[n], root = LULL_ROOT[n];
      mel.forEach((m, k) => { if (m) musicBox(m + 12, t + k * b, .07, musicBus, .7); });
      if (n % 4 === 0) pad(chordOf(root).map(x => x + 12), t, b * 12, .022, musicBus, 700);
      bass(root, t, b * 2.6, .07);
    } },
    memory: { bpm: 58, beats: 3, bar(i, t, b) {
      const n = i % 16, mel = LULLABY[n], root = LULL_ROOT[n], ch = chordOf(root);
      mel.forEach((m, k) => { if (m) musicBox(m, t + k * b, .09, musicBus, .8); });
      pluck(root + 12, t, .14, musicBus, { tone: 1800 });
      pluck(ch[1], t + b, .08, musicBus, { tone: 2000 }); pluck(ch[2], t + b * 2, .08, musicBus, { tone: 2000 });
      if (n % 4 === 0) pad(ch.map(x => x + 12), t, b * 12, .03, musicBus, 1100);
    } },
    forest: { bpm: 54, beats: 4, bar(i, t, b) {
      const prog = [[50, 53, 57, 64], [46, 50, 53, 57], [41, 48, 53, 57], [48, 52, 55, 62]];
      const ch = prog[i % 4];
      pad(ch.map(x => x + 12), t, b * 4, .028, musicBus, 650);
      bass(ch[0] - 12, t, b * 3.5, .06);
      const scale = [62, 64, 65, 69, 72, 74, 76];
      for (let k = 0; k < 8; k++) if (Math.random() < .2) pluck(scale[(Math.random() * scale.length) | 0], t + k * b / 2, .07, musicBus, { tone: 2400, verb: .6 });
      // O motivo da Tamsin vaza para o bosque quanto mais Bram lembra.
      if (i % 8 === 7 && Math.random() < .25 + echoLevel * .09) [69, 72, 76].forEach((m, k) => musicBox(m + 12, t + k * b * .75, .035, musicBus, .9));
    } },
    // Combates: um tema por ato. A intensidade (vida perdida) acrescenta camadas:
    // nível 0 = base · nível 1 = riff e caixa mais cheia · nível 2 = solo distorcido, coro e bumbo dobrado.
    battle: { bpm: 128, beats: 4, bar(i, t, b) {
      const lv = level(), prog = [38, 34, 36, 33], r = prog[i % 4], third = r === 38 ? 3 : 4, s = b / 4;
      drums(i, t, b, lv);
      const bl = [0, 0, 12, 0, 7, 0, 12, 10, 0, 0, 12, 0, 7, 12, 10, 7];
      for (let k = 0; k < 16; k++) sawBass(r + bl[k], t + k * s, s * .9, k % 4 === 0 ? .1 : .065);
      const arp = [r + 24, r + 24 + third, r + 31, r + 36, r + 31, r + 24 + third];
      for (let k = 0; k < 16; k++) if (lv > 0 || k % 2 === 0) pluck(arp[k % 6], t + k * s, .045, musicBus, { tone: 3000, bright: true, verb: .2 });
      if (lv >= 1 || (i >> 3) % 2) {
        for (const [o, m] of [[0, 62], [1.5, 65], [2, 64], [2.5, 62], [3, 60], [3.5, 57]]) pluck(m + (r - 38), t + o * b, .09, musicBus, { bright: true, tone: 4200, verb: .3 });
        for (const o of [.5, 1.5, 2.5, 3.5]) stab([r + 24, r + 24 + third, r + 31], t + o * b, .03);
      }
      if (lv >= 2) { lead([74, 77, 76, 74, 72, 69, 72, 74].map(m => m + (r - 38)), t, b / 2); if (i % 2 === 0) choir([r + 24, r + 24 + third, r + 31], t, b * 8, .03); }
      if (i % 4 === 0) pad([r + 24, r + 24 + third, r + 31], t, b * 16, .016, musicBus, 1200);
    } },
    // Ato II: modo frígio, órgão em acordes e sino.
    battle2: { bpm: 120, beats: 4, bar(i, t, b) {
      const lv = level(), prog = [40, 41, 40, 38], r = prog[i % 4], s = b / 4;
      drums(i, t, b, lv);
      const bl = [0, 0, 0, 1, 0, 0, 7, 0, 0, 0, 0, 1, 0, 12, 10, 8];
      for (let k = 0; k < 16; k++) sawBass(r + bl[k], t + k * s, s * .85, k % 4 === 0 ? .1 : .06, 1200);
      for (const o of [0, 1.5, 2.5]) stab([r + 24, r + 25, r + 31], t + o * b, .028);
      if (i % 4 === 3) bell(r + 36, t + b * 2, .06);
      if (lv >= 1) for (let k = 0; k < 8; k++) pluck([r + 36, r + 37, r + 40, r + 43][k % 4], t + k * b / 2, .07, musicBus, { bright: true, tone: 3800, verb: .3 });
      if (lv >= 2) { lead([76, 77, 79, 77, 76, 73, 72, 73].map(m => m + (r - 40)), t, b / 2); choir([r + 24, r + 25, r + 31], t, b * 4, .03); }
      if (i % 4 === 0) choir([r + 12, r + 19], t, b * 16, .02);
    } },
    // Ato III: pântano, meio-tempo arrastado, baixo que desliza e marimba.
    battle3: { bpm: 112, beats: 4, bar(i, t, b) {
      const lv = level(), prog = [33, 36, 31, 33], r = prog[i % 4], s = b / 4;
      kick(t, .45); kick(t + b * 1.75, .3); kick(t + b * 2.5, .38); snare(t + b * 2, .13);
      if (lv >= 1) { snare(t + b * 3.5, .07); kick(t + b * 3, .3); }
      for (let k = 0; k < 8; k++) hat(t + k * b / 2, k % 2 ? .02 : .04);
      if (lv >= 2) for (let k = 0; k < 16; k++) hat(t + k * s, .02);
      sawBass(r, t, b * 1.4, .12, 900); sawBass(r + 3, t + b * 1.5, b * .5, .08, 900); sawBass(r + 7, t + b * 2.5, b * 1.4, .1, 900);
      const mar = [r + 24, r + 27, r + 31, r + 34, r + 31, r + 27];
      for (let k = 0; k < 6; k++) osc('sine', mtof(mar[k] + 12), t + k * b * .66, .3, musicBus, .05, .002, { verb: .4 });
      if (lv >= 1) pad([r + 24, r + 27, r + 31], t, b * 4, .02, musicBus, 800);
      if (lv >= 2) lead([69, 72, 70, 69, 67, 64, 67, 69].map(m => m + (r - 33)), t, b / 2);
    } },
    // Chefes: 140 BPM, tambores pesados, baixo distorcido e coro. Também cresce com a vida perdida.
    boss: { bpm: 140, beats: 4, bar(i, t, b) {
      const lv = level(), prog = [38, 39, 38, 36], r = prog[i % 4], s = b / 4;
      taiko(t, .6); taiko(t + b * 1.5, .35); taiko(t + b * 2, .55); taiko(t + b * 3, .3); if (i % 2 || lv >= 1) { taiko(t + b * 3.5, .4); taiko(t + b * 3.75, .35); }
      for (let k = 0; k < 4; k++) kick(t + k * b, .35);
      if (lv >= 2) for (let k = 0; k < 4; k++) kick(t + k * b + b / 2, .25);
      snare(t + b, .12); snare(t + b * 3, .14);
      for (let k = 0; k < 16; k++) hat(t + k * s, k % 2 ? .02 : .035);
      const bl = [0, 0, 0, 1, 0, 0, 12, 0, 0, 0, 0, 1, 0, 7, 6, 0];
      for (let k = 0; k < 16; k++) sawBass(r + bl[k], t + k * s, s * .85, .1, 900);
      if (i % 2 === 0) choir([r + 24, r + 27, r + 31], t, b * 8, .03);
      if (i % 4 === 3) { bell(r + 36, t + b * 2, .07); crash(t, .08); }
      const riff = [0, 3, 1, 0, 6, 3, 1, 0];
      for (let k = 0; k < 8; k++) if (i % 2 || k < 4 || lv >= 1) pluck(r + 36 + riff[k], t + k * b / 2, .07, musicBus, { bright: true, tone: 3800, verb: .25 });
      if (lv >= 2) lead([74, 75, 74, 72, 70, 72, 74, 79].map(m => m + (r - 38)), t, b / 2);
    } },
    // Forja do Tobias: martelo na bigorna marcando o tempo.
    forge: { bpm: 84, beats: 4, bar(i, t, b) {
      const prog = [45, 41, 43, 40], r = prog[i % 4];
      clank(t, .12); clank(t + b * 1.5, .07); clank(t + b * 2, .1); if (i % 2) clank(t + b * 3.5, .06);
      bass(r - 12, t, b * 1.8, .08); bass(r - 5, t + b * 2, b * 1.8, .06);
      for (let k = 0; k < 4; k++) pluck([r + 12, r + 15, r + 19, r + 24][(k + i) % 4], t + k * b, .08, musicBus, { tone: 2200, verb: .3 });
      if (i % 4 === 0) pad([r + 12, r + 16, r + 19], t, b * 16, .015, musicBus, 700);
    } },
    dragon: { bpm: 60, beats: 4, bar(i, t, b) {
      const r = [33, 34, 33, 31][i % 4];
      choir([r + 24, r + 28, r + 31], t, b * 4, .035);
      bass(r, t, b * 3.6, .12);
      taiko(t, .4); if (i % 2) taiko(t + b * 2.5, .25);
      if (intensity > .5) { for (let k = 0; k < 8; k++) noise(t + k * b / 2, .05, musicBus, .03, 'bandpass', 300 + Math.random() * 400); }
      if (i % 4 === 2) [69, 72, 76].forEach((m, k) => musicBox(m + (Math.random() < .3 ? 1 : 0), t + k * b, .04, musicBus, 1));
    } },
    camp: { bpm: 72, beats: 3, bar(i, t, b) {
      const prog = [[45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [36, 43, 48, 52, 55], [43, 50, 55, 59, 62]];
      const ch = prog[(i >> 1) % 4];
      const pat = [0, 2, 3, 4, 3, 2];
      for (let k = 0; k < 6; k++) pluck(ch[pat[k]], t + k * b / 2, k === 0 ? .2 : .11, musicBus, { tone: 2200, verb: .3 });
      if (i % 8 === 6 && Math.random() < .5) [69, 72, 76].forEach((m, k) => musicBox(m + 12, t + k * b, .03, musicBus, .8));
    } },
    chapel: { bpm: 50, beats: 4, bar(i, t, b) {
      const prog = [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 56]];
      const ch = prog[i % 4];
      choir(ch.slice(1).map(x => x + 12), t, b * 4, .028);
      bass(ch[0] - 12, t, b * 3.8, .06);
      if (i % 2 === 0) bell(ch[2] + 24, t, .05);
    } },
    village: { bpm: 80, beats: 4, bar(i, t, b) {
      const prog = [[40, 52, 55, 59], [41, 53, 57, 60], [40, 52, 55, 59], [38, 50, 53, 57]];
      const ch = prog[i % 4];
      for (let k = 0; k < 8; k++) pluck(ch[1 + (k * 2 + (i % 2)) % 3] + 12, t + k * b / 2, .07, musicBus, { bright: true, tone: 3600, verb: .3 });
      bass(ch[0], t, b * 1.8, .08); bass(ch[0] + 7, t + b * 2, b * 1.8, .06);
      if (i % 4 === 3) pad(ch.slice(1), t, b * 4, .02, musicBus, 900);
    } },
    sad: { bpm: 48, beats: 3, bar(i, t, b) {
      const n = i % 16, mel = LULLABY[n];
      mel.forEach((m, k) => { if (m && Math.random() > .15) musicBox(m - 12 + (Math.random() < .2 ? -1 : 0), t + k * b * (1 + i * .01), .06, musicBus, 1); });
    } },
    bloom: { bpm: 66, beats: 3, bar(i, t, b) {
      const n = i % 16, mel = LULLABY[n], root = LULL_ROOT[n], ch = chordOf(root);
      mel.forEach((m, k) => { if (m) { musicBox(m + 12, t + k * b, .08); pluck(m, t + k * b, .07, musicBus, { tone: 2600 }); } });
      bass(root, t, b * 2.6, .08);
      if (n % 2 === 0) pad(ch.map(x => x + 12), t, b * 6, .035, musicBus, 1500);
      if (n % 4 === 0) choir(ch.map(x => x + 24), t, b * 12, .016);
    } }
  };

  let current = null, pendingSong = null, timer = 0, nextBar = 0, barIdx = 0, songGain = null;
  let intensity = 0, echoLevel = 0;
  function music(name) {
    if (!ctx) { pendingSong = name; return; }
    if (current === name) return;
    const t = ctx.currentTime;
    if (songGain) { const old = songGain; old.gain.setTargetAtTime(.0001, t, .6); setTimeout(() => old.disconnect(), 3000); }
    current = name;
    if (!name || !SONGS[name]) { songGain = null; return; }
    songGain = ctx.createGain(); songGain.gain.value = .0001; songGain.gain.setTargetAtTime(1, t + .3, .5);
    songGain.connect(musicBus);
    nextBar = t + .35; barIdx = 0;
  }
  function schedule() {
    if (!ctx || !current || !songGain || ctx.state !== 'running') return;
    const s = SONGS[current], b = 60 / s.bpm;
    while (nextBar < ctx.currentTime + .4) {
      const prevBus = musicBus;
      // As funções das músicas escrevem em "musicBus"; redirecionamos para o ganho da música atual.
      musicBus = songGain;
      try { s.bar(barIdx, nextBar, b); } catch (e) { console.warn(e); }
      musicBus = prevBus;
      nextBar += b * s.beats; barIdx++;
    }
  }
  function setIntensity(x) { intensity = x; }
  function setEcho(x) { echoLevel = x; }

  // ---------- ambiente ----------
  const amb = {};
  let pendingAmb = null, ambTimer = 0;
  const AMB_SCENES = {
    title: { wind: .25, night: .5, fire: .8, rain: 0 },
    forest: { wind: .7, night: .35, fire: 0, rain: 0 },
    battle: { wind: .4, night: 0, fire: 0, rain: 0 },
    chapel: { wind: .5, night: .1, fire: .15, rain: 0 },
    swamp: { wind: .35, night: .7, fire: 0, rain: .2 },
    lair: { wind: .6, night: 0, fire: .5, rain: 0 },
    camp: { wind: .25, night: .4, fire: 1, rain: 0 },
    memory: { wind: 0, night: .25, fire: 0, rain: .55 },
    silent: { wind: .1, night: 0, fire: 0, rain: 0 }
  };
  function loopNoise(filterType, freq, q) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(ambBus); s.start();
    return { g, f };
  }
  function startAmbience() {
    amb.wind = loopNoise('bandpass', 380, .6);
    const lfo = ctx.createOscillator(); lfo.frequency.value = .07; const ld = ctx.createGain(); ld.gain.value = 220;
    lfo.connect(ld); ld.connect(amb.wind.f.frequency); lfo.start();
    amb.rain = loopNoise('highpass', 2500, .3);
    amb.hiss = loopNoise('highpass', 6000, .2);
    amb.hiss.g.gain.value = .012;
    amb.levels = { wind: 0, night: 0, fire: 0, rain: 0 };
    ambTimer = setInterval(ambTick, 120);
  }
  function ambience(scene) {
    pendingAmb = scene;
    if (!ctx || !amb.wind) return;
    const L = AMB_SCENES[scene] || AMB_SCENES.forest, t = ctx.currentTime;
    amb.levels = { ...L };
    amb.wind.g.gain.setTargetAtTime(L.wind * .35, t, 1.2);
    amb.rain.g.gain.setTargetAtTime(L.rain * .12, t, 1.2);
  }
  function ambTick() {
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime, L = amb.levels;
    if (L.night && Math.random() < .12 * L.night) { // grilos e pássaros noturnos
      const f = 4200 + Math.random() * 600, n = 2 + (Math.random() * 3 | 0);
      for (let k = 0; k < n; k++) osc('sine', f, t + k * .06, .03, ambBus, .012 * L.night, .004, { tape: false });
    }
    if (L.night && Math.random() < .008 * L.night) { const f = 520 + Math.random() * 200; osc('sine', f, t, .35, ambBus, .02, .05, { slide: f * .82, verb: .8, tape: false }); osc('sine', f * .8, t + .45, .5, ambBus, .016, .05, { slide: f * .7, verb: .8, tape: false }); }
    if (L.fire && Math.random() < .55 * L.fire) noise(t + Math.random() * .1, .02 + Math.random() * .04, ambBus, .05 * L.fire, 'bandpass', 900 + Math.random() * 2400, 1.2);
    if (L.fire && Math.random() < .08 * L.fire) noise(t, .6, ambBus, .02 * L.fire, 'lowpass', 300, .5, .2);
    if (L.rain && Math.random() < .5 * L.rain) noise(t + Math.random() * .1, .015, ambBus, .03 * L.rain, 'bandpass', 2000 + Math.random() * 3000, 3);
  }
  function setHiss(x) { if (amb.hiss) amb.hiss.g.gain.setTargetAtTime(.004 + x * .03, ctx.currentTime, .5); }

  // ---------- efeitos sonoros ----------
  const SUIT_NOTE = { presa: 62, casca: 57, sombra: 63, cinza: 65, memoria: 69 };
  const FX = {
    hover() { osc('square', 1800, now(), .015, sfxBus, .012, .001, { tape: false }); },
    click() { osc('square', 900, now(), .03, sfxBus, .04, .001, { tape: false }); osc('sine', 1400, now() + .02, .04, sfxBus, .03, .001, { tape: false }); },
    back() { osc('square', 700, now(), .03, sfxBus, .035, .001, { tape: false, slide: 400 }); },
    pick() { noise(now(), .07, sfxBus, .08, 'bandpass', 3200, 1.4, .004, { sweep: 1600 }); },
    place(o = {}) { const t = now(); noise(t, .05, sfxBus, .1, 'lowpass', 900); osc('sine', mtof(SUIT_NOTE[o.suit] || 60) * 2, t, .25, sfxBus, .05, .002, { verb: .3 }); },
    soul(o = {}) { const t = now(), m = 81 + (o.n || 0) * 2; osc('sine', mtof(m), t, .5, sfxBus, .05, .002, { verb: .6 }); osc('sine', mtof(m + 7), t + .03, .4, sfxBus, .03, .002, { verb: .6 }); },
    nosoul() { const t = now(); osc('square', 140, t, .12, sfxBus, .05, .002, { tape: false }); osc('square', 120, t + .1, .15, sfxBus, .05, .002, { tape: false }); },
    unplace() { noise(now(), .06, sfxBus, .06, 'bandpass', 1500, 1, .003, { sweep: 3000 }); },
    seal() { const t = now(); [57, 64, 69].forEach((m, k) => osc('triangle', mtof(m), t + k * .05, .5, sfxBus, .06, .004, { verb: .5 })); noise(t, .4, sfxBus, .05, 'bandpass', 600, .7, .05, { sweep: 2400 }); },
    card(o = {}) { const t = now(); noise(t, .08, sfxBus, .09, 'bandpass', 2400, 1.2, .003, { sweep: 900 }); osc('triangle', mtof(SUIT_NOTE[o.suit] || 60) * 2, t, .3, sfxBus, .06, .003, { verb: .4 }); },
    hit(o = {}) { const t = now(), big = (o.amount || 0) >= 8; noise(t, big ? .22 : .12, sfxBus, big ? .32 : .22, 'lowpass', big ? 1400 : 2400); osc('sine', big ? 110 : 160, t, big ? .3 : .16, sfxBus, big ? .45 : .3, .002, { slide: 40, tape: false }); },
    pierce() { const t = now(); noise(t, .15, sfxBus, .14, 'highpass', 3000, 1, .002, { sweep: 9000 }); },
    block() { const t = now(); osc('triangle', 520, t, .25, sfxBus, .1, .002, { verb: .3, tape: false }); noise(t, .06, sfxBus, .1, 'bandpass', 4000, 3); },
    armor() { const t = now(); osc('square', 220, t, .12, sfxBus, .06, .002, { tape: false }); osc('triangle', 660, t + .02, .3, sfxBus, .05, .002, { verb: .3, tape: false }); },
    hurt() { const t = now(); osc('sawtooth', 110, t, .3, sfxBus, .2, .003, { slide: 55, tape: false }); noise(t, .2, sfxBus, .25, 'lowpass', 700); },
    heal() { const t = now(); [72, 76, 79, 84].forEach((m, k) => osc('sine', mtof(m), t + k * .06, .4, sfxBus, .05, .005, { verb: .6 })); },
    status(o = {}) {
      const t = now();
      const k = o.key;
      if (k === 'brasa') { noise(t, .35, sfxBus, .12, 'bandpass', 1200, .8, .02, { sweep: 300 }); }
      else if (k === 'fraqueza') { osc('triangle', 440, t, .35, sfxBus, .07, .003, { slide: 220 }); }
      else if (k === 'marca') { osc('sine', 1320, t, .3, sfxBus, .06, .002, { verb: .4 }); osc('sine', 1760, t + .05, .25, sfxBus, .04, .002); }
      else if (k === 'exposto') { noise(t, .12, sfxBus, .12, 'highpass', 2500); osc('square', 330, t, .1, sfxBus, .05, .002); }
      else if (k === 'atordoado') { [88, 91, 95].forEach((m, i) => osc('sine', mtof(m), t + i * .05, .2, sfxBus, .04, .002)); }
      else { osc('triangle', 500, t, .2, sfxBus, .05, .003, { slide: 300 }); }
    },
    combo(o = {}) {
      // Cada combo da mesma rodada soa um pouco mais agudo (como uma escada).
      const t = now(), tier = o.tier || 1, up = Math.min(12, ((o.streak || 1) - 1) * 2);
      const base = [69, 72, 76, 81, 84, 88];
      for (let k = 0; k < 2 + tier; k++) osc('triangle', mtof(base[k % 6] + up), t + k * .05, .4, sfxBus, .07, .003, { verb: .6 });
      osc('square', mtof(57 + up), t, .12, sfxBus, .04, .002, { tape: false });
    },
    // Vozes no estilo dos RPGs antigos: cada personagem tem um timbre.
    voice(o = {}) {
      const t = now(), w = o.who;
      if (w === 'tobias') { osc('square', 105 + Math.random() * 25, t, .05, sfxBus, .035, .002, { tape: false }); noise(t, .04, sfxBus, .02, 'lowpass', 500); }
      else if (w === 'perpetua') { osc('sine', 520 + Math.random() * 60, t, .07, sfxBus, .05, .006, { slide: 480, tape: false }); }
      else if (w === 'ysolde') { osc('triangle', 640 + Math.random() * 140, t, .045, sfxBus, .045, .002, { tape: false }); }
      else if (w === 'tamsin') { musicBox(76 + [0, 3, 7][Math.random() * 3 | 0], t, .04, sfxBus, .6); }
      else if (w === 'pip') { osc('square', 900 + Math.random() * 260, t, .035, sfxBus, .03, .001, { slide: 1100, tape: false }); }
      else if (w === 'gaspar') { osc('triangle', 380 + Math.random() * 90, t, .05, sfxBus, .05, .002, { slide: 300, tape: false }); osc('sine', 760, t + .02, .03, sfxBus, .015, .001, { tape: false }); }
      else if (w === 'marga') { osc('triangle', 170 + Math.random() * 30, t, .09, sfxBus, .05, .01, { slide: 150, tape: false }); }
      // Corrompidos: cada bicho com um timbre que combina com ele.
      else if (w === 'chitter') { osc('square', 1100 + Math.random() * 400, t, .025, sfxBus, .025, .001, { tape: false }); }
      else if (w === 'buzz') { osc('sawtooth', 210 + Math.random() * 40, t, .06, sfxBus, .025, .004, { slide: 190 }); }
      else if (w === 'creak') { osc('sawtooth', 70 + Math.random() * 25, t, .08, sfxBus, .04, .01, { slide: 55 }); noise(t, .06, sfxBus, .03, 'bandpass', 600, 2); }
      else if (w === 'hare') { osc('sine', 560 + Math.random() * 140, t, .05, sfxBus, .04, .002, { slide: 420, verb: .5 }); }
      else if (w === 'growl') { osc('sawtooth', 75 + Math.random() * 20, t, .09, sfxBus, .06, .005, { slide: 60 }); noise(t, .08, sfxBus, .05, 'lowpass', 400); }
      else if (w === 'deep') { osc('triangle', 110 + Math.random() * 20, t, .12, sfxBus, .07, .01, { verb: .7 }); }
      else if (w === 'caw') { osc('square', 820 + Math.random() * 120, t, .06, sfxBus, .03, .002, { slide: 560, tape: false }); }
      else if (w === 'clack') { osc('square', 300 + Math.random() * 60, t, .03, sfxBus, .03, .001, { tape: false }); noise(t, .03, sfxBus, .05, 'highpass', 4000); }
      else if (w === 'whisper') { noise(t, .06, sfxBus, .05, 'bandpass', 2600 + Math.random() * 1500, 4, .01); }
      else if (w === 'croak') { osc('square', 120 + Math.random() * 20, t, .07, sfxBus, .04, .003, { slide: 85, tape: false }); }
      else if (w === 'bubble') { osc('sine', 380 + Math.random() * 100, t, .05, sfxBus, .05, .002, { slide: 900 }); }
      else if (w === 'sing') { osc('sine', mtof(64 + [0, 2, 4, 7][Math.random() * 4 | 0]), t, .14, sfxBus, .04, .02, { verb: .8 }); }
      else if (w === 'dragon') { osc('sawtooth', 48 + Math.random() * 10, t, .16, sfxBus, .08, .02, { slide: 40, verb: .6 }); noise(t, .14, sfxBus, .06, 'lowpass', 300); }
      else { osc('square', 300 + Math.random() * 60, t, .03, sfxBus, .025, .002, { tape: false }); }
    },
    // O Lampião não fala: ele faz "piu" e brilha.
    lampy(o = {}) {
      const t = now(), m = o.mood || 'happy';
      if (m === 'scared') { [88, 84].forEach((n, k) => osc('square', mtof(n), t + k * .05, .05, sfxBus, .02, .001, { tape: false })); }
      else if (m === 'worried') { osc('sine', 700, t, .18, sfxBus, .03, .01, { slide: 500 }); }
      else { [84, 88, 91].forEach((n, k) => musicBox(n, t + k * .05, .035, sfxBus, .6)); }
    },
    relic() { const t = now(); [72, 76, 79, 83, 88].forEach((m, k) => musicBox(m, t + k * .07, .06, sfxBus, .9)); osc('triangle', mtof(60), t, .8, sfxBus, .05, .01, { verb: .8 }); noise(t, .5, sfxBus, .03, 'highpass', 5000, .5, .1); },
    letter() { const t = now(); noise(t, .3, sfxBus, .08, 'bandpass', 2200, .6, .02, { sweep: 900 }); noise(t + .25, .2, sfxBus, .06, 'bandpass', 3000, .6, .02, { sweep: 1400 }); },
    coin() { const t = now(), f = 2400 + Math.random() * 500; osc('square', f, t, .05, sfxBus, .03, .001, { tape: false }); osc('sine', f * 1.5, t + .04, .18, sfxBus, .04, .001, { tape: false, verb: .3 }); },
    spend() { const t = now(); noise(t, .12, sfxBus, .08, 'bandpass', 3000, 2); for (let k = 0; k < 3; k++) osc('triangle', 1800 - k * 300, t + k * .05, .08, sfxBus, .04, .001, { tape: false }); },
    healBig() { const t = now(); [64, 67, 71, 76, 79].forEach((m, k) => { osc('sine', mtof(m), t + k * .07, .6, sfxBus, .05, .01, { verb: .8 }); musicBox(m + 12, t + k * .07, .025, sfxBus, .8); }); noise(t, .6, sfxBus, .03, 'highpass', 6000, .5, .2); },
    purify() { const t = now(); noise(t, .9, sfxBus, .08, 'bandpass', 1200, .7, .3, { sweep: 6000 }); [72, 79, 84].forEach((m, k) => osc('sine', mtof(m), t + .2 + k * .12, .9, sfxBus, .04, .05, { verb: 1 })); },
    lampUp() { const t = now(); [69, 76, 81, 88].forEach((m, k) => musicBox(m, t + k * .09, .06, sfxBus, .9)); osc('sine', 440, t, 1.2, sfxBus, .04, .3, { slide: 880, verb: 1 }); },
    rotUp() { const t = now(); osc('sawtooth', 70, t, 1.4, sfxBus, .09, .3, { slide: 52, verb: .8 }); noise(t, 1.2, sfxBus, .08, 'lowpass', 500, 1, .3, { sweep: 150 }); },
    door() { const t = now(); osc('sawtooth', 180, t, .6, sfxBus, .03, .05, { slide: 120, tape: false }); osc('sawtooth', 240, t + .15, .5, sfxBus, .025, .05, { slide: 300, tape: false }); noise(t + .55, .2, sfxBus, .25, 'lowpass', 300); osc('sine', 70, t + .55, .3, sfxBus, .3, .002, { slide: 40, tape: false }); },
    bellDoor() { const t = now(); this.door(); bell(76, t + .7, .08, sfxBus); },
    tent() { const t = now(); noise(t, .35, sfxBus, .12, 'bandpass', 800, .6, .03, { sweep: 2400 }); noise(t + .2, .25, sfxBus, .08, 'bandpass', 1400, .6, .03, { sweep: 600 }); for (let k = 0; k < 3; k++) osc('sine', mtof(84 + k * 3), t + .3 + k * .08, .4, sfxBus, .02, .002, { verb: .6 }); },
    rustle() { const t = now(); noise(t, .25, sfxBus, .05, 'bandpass', 2600 + Math.random() * 1500, .8, .03); },
    whoosh() { noise(now(), .5, sfxBus, .12, 'bandpass', 400, .6, .1, { sweep: 2600 }); },
    thud() { const t = now(); osc('sine', 110, t, .35, sfxBus, .35, .002, { slide: 45, tape: false }); noise(t, .15, sfxBus, .2, 'lowpass', 600); },
    sealRise() { const t = now(); noise(t, 1.1, sfxBus, .07, 'bandpass', 300, .8, .5, { sweep: 2600 }); choir([57, 64, 69], t, 1.1, .05, sfxBus); osc('sine', 220, t, 1.1, sfxBus, .04, .4, { slide: 440, verb: 1 }); },
    soulNote(o = {}) { const m = [81, 84, 88, 91, 93][(o.k || 0) % 5]; musicBox(m, now(), .06, sfxBus, .8); osc('sine', mtof(m) * 2, now(), .3, sfxBus, .02, .002, { verb: .8 }); },
    chain() { const t = now(); for (let k = 0; k < 3; k++) { noise(t + k * .04, .03, sfxBus, .06, 'bandpass', 5200 + k * 600, 6); osc('square', 2600 + k * 300, t + k * .04, .03, sfxBus, .02, .001, { tape: false }); } },
    sealPam() {
      const t = now();
      noise(t, .28, sfxBus, .1, 'bandpass', 400, .8, .2, { sweep: 3200 });
      osc('sine', 300, t, .28, sfxBus, .05, .2, { slide: 900, tape: false });
      const h = t + .3;
      osc('sine', 90, h, .5, sfxBus, .55, .002, { slide: 34, tape: false });
      noise(h, .2, sfxBus, .3, 'lowpass', 1200);
      bell(76, h, .09, sfxBus); bell(83, h + .02, .06, sfxBus);
      osc('triangle', mtof(57), h, 1.2, sfxBus, .06, .002, { verb: .9 });
    },
    burn() { noise(now(), .4, sfxBus, .12, 'bandpass', 700, .6, .03, { sweep: 2400 }); },
    enemyWind() { noise(now(), .25, sfxBus, .1, 'bandpass', 500, .7, .08, { sweep: 1600 }); },
    death() { const t = now(); osc('sawtooth', 220, t, 1.2, sfxBus, .12, .01, { slide: 40 }); noise(t, 1, sfxBus, .1, 'lowpass', 900, .5, .05, { sweep: 120 }); },
    victory() { const t = now(); [69, 72, 76, 81].forEach((m, k) => musicBox(m, t + k * .12, .08, sfxBus)); },
    lasca() { const t = now(); osc('sine', 1568, t, .12, sfxBus, .05, .002); osc('sine', 2093, t + .07, .2, sfxBus, .05, .002, { verb: .4 }); },
    step() { noise(now(), .06, sfxBus, .08, 'lowpass', 500 + Math.random() * 300); },
    page() { noise(now(), .18, sfxBus, .06, 'bandpass', 2800, .6, .02, { sweep: 1200 }); },
    lamp(o = {}) { const t = now(), up = o.up !== false; osc('sine', up ? 660 : 880, t, .6, sfxBus, .05, .02, { slide: up ? 990 : 440, verb: .9 }); },
    glitch() { const t = now(); noise(t, .12, sfxBus, .1, 'bandpass', 1200, .3); osc('square', 60, t, .1, sfxBus, .04, .001, { tape: false }); },
    memory() { const t = now(); [69, 76, 81, 84, 88].forEach((m, k) => musicBox(m, t + k * .16, .06, sfxBus)); },
    mask() { const t = now(); osc('sawtooth', 98, t, .7, sfxBus, .06, .05, { verb: .5 }); osc('sawtooth', 104, t, .7, sfxBus, .06, .05, { verb: .5 }); },
    crack() { const t = now(); noise(t, .3, sfxBus, .25, 'highpass', 1800, .5); osc('square', 80, t, .15, sfxBus, .08, .001, { tape: false }); },
    sermon() { const t = now(); osc('sawtooth', 130, t, .5, sfxBus, .05, .03, { slide: 120, verb: .7 }); },
    roar() { const t = now(); noise(t, 1.4, sfxBus, .25, 'lowpass', 400, 1, .2, { sweep: 120 }); osc('sawtooth', 70, t, 1.3, sfxBus, .1, .2, { slide: 45 }); }
  };
  const now = () => ctx.currentTime + .005;
  let lastHover = 0;
  function sfx(name, o) {
    if (!ctx || ctx.state !== 'running' || !FX[name]) return;
    if (name === 'hover') { const n = performance.now(); if (n - lastHover < 60) return; lastHover = n; }
    try { FX[name](o); } catch (e) { console.warn(e); }
  }

  return { unlock, music, ambience, sfx, setVolumes, setWarp, setHiss, muffle, setIntensity, setEcho, get ready() { return !!ctx; } };
})();
