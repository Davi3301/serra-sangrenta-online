'use strict';
const $ = id => document.getElementById(id);
const UI = { tab: null, dialog: null, dq: [], pause: false, sel: -1, chest: null, cat: 'Tudo', lastHot: '', over: null };
const paused = () => !!(UI.tab || UI.dialog || UI.pause || UI.over);

/* ===================== AJUSTES (zoom e volumes, guardados no navegador) ===================== */
const SET = Object.assign({ zoom: 1, sfx: .8, mus: .7 }, (() => { try { return JSON.parse(localStorage.getItem('serra_cfg')) || {}; } catch (e) { return {}; } })());
function saveSet() { try { localStorage.setItem('serra_cfg', JSON.stringify(SET)); } catch (e) { } }
function setZoom(z, quiet) { SET.zoom = clamp(Math.round(z * 20) / 20, .6, 2); saveSet(); resize(); cam.x = P.x - VW / 2; cam.y = P.y - VH / 2; if (!quiet) toast('Zoom ' + Math.round(SET.zoom * 100) + '%', 'u_eye'); }
let gS = null, gM = null;
function OUT(k) { if (!gS) { gS = AC.createGain(); gM = AC.createGain(); const cmp = AC.createDynamicsCompressor(), lim = AC.createDynamicsCompressor(); cmp.threshold.value = -14; cmp.ratio.value = 6; cmp.attack.value = .003; cmp.release.value = .2; lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .12; const out = AC.createGain(); out.gain.value = .9; const shelf = AC.createBiquadFilter(), soft = AC.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 3000; shelf.gain.value = -8; soft.type = 'lowpass'; soft.frequency.value = 7000; soft.Q.value = .5; gS.connect(shelf); shelf.connect(soft); soft.connect(cmp); cmp.connect(lim); gM.connect(lim); lim.connect(out); out.connect(AC.destination); } gS.gain.value = SET.sfx; gM.gain.value = SET.mus; return k === 'm' ? gM : gS; }

/* ===================== SOM =====================
   Tudo é sintetizado em tempo real. Sons com posição (x, y) saem do lado certo,
   abafam com a distância e ganham mais eco quanto mais longe estão. */
let AC = null, muted = false; const sfxLast = {}; let FXREV = null, NZB = null, liveVoices = [];
function irBuf(sec, decay) { const n = AC.sampleRate * sec, b = AC.createBuffer(2, n, AC.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); } return b; }
function rev() { if (!FXREV) { FXREV = AC.createConvolver(); FXREV.buffer = irBuf(2.8, 2.4); const w = AC.createGain(); w.gain.value = .55; FXREV.connect(w).connect(OUT('s')); } return FXREV; }
// saída posicionada: volume pela distância, panorama pelo lado, eco pela distância
function spot(x, y, wet, range) {
  let vol = 1, pan = 0; wet = wet || 0;
  if (x !== undefined && P && P.x !== undefined) { const d = dist(x, y, P.x, P.y), R = range || 760; vol = clamp(1.12 - d / R, 0, 1); vol *= vol; pan = clamp((x - P.x) / 520, -.85, .85); wet += clamp(d / R, 0, 1) * .45; }
  if (vol < .015) return null;
  const g = AC.createGain(); g.gain.value = vol; const p = AC.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(OUT('s'));
  if (wet > 0) { const s = AC.createGain(); s.gain.value = wet; p.connect(s); s.connect(rev()); }
  return g;
}
const aEnv = (t, a, peak, d) => { const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(Math.max(.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); return g; };
const aOsc = (type, f, t, d, fEnd) => { const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (fEnd) o.frequency.exponentialRampToValueAtTime(fEnd, t + d); o.start(t); o.stop(t + d + .15); return o; };
const aNoise = (t, d) => { if (!NZB) { NZB = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); const c = NZB.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; } const s = AC.createBufferSource(); s.buffer = NZB; s.loop = true; s.start(t, Math.random() * 1.5); s.stop(t + d + .15); return s; };
const aFilt = (type, f, q, t, fEnd, d) => { const b = AC.createBiquadFilter(); b.type = type; b.frequency.setValueAtTime(f, t); if (q) b.Q.value = q; if (fEnd) b.frequency.exponentialRampToValueAtTime(fEnd, t + d); return b; };
const CURVES = {}; const aShape = k => { if (!CURVES[k]) { const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } CURVES[k] = c; } const w = AC.createWaveShaper(); w.curve = CURVES[k]; return w; };
const aLFO = (t, d, rate, depth, param) => { const l = aOsc('sine', rate, t, d), g = AC.createGain(); g.gain.value = depth; l.connect(g).connect(param); };
// blocos de construção
function nb(o, t, d, v, type, f, fEnd, q, a) { const n = aNoise(t, d), fl = aFilt(type, f, q, t, fEnd, d), e = aEnv(t, a || .003, v, d); n.connect(fl).connect(e).connect(o); }
function bl(o, t, type, f, fEnd, d, v, a) { const s = aOsc(type, f, t, d, fEnd), e = aEnv(t, a || .004, v, d); s.connect(e).connect(o); }
function growl(o, t, d, v, f0, f1, trem, cut) {
  const sh = aShape(5), lp = aFilt('lowpass', cut || 700, 1.2, t), tr = AC.createGain(); tr.gain.value = .55; aLFO(t, d, trem || 16, .45, tr.gain);
  for (const m of [1, 1.013, .5]) aOsc(m === .5 ? 'square' : 'sawtooth', f0 * m, t, d, f1 * m).connect(sh);
  const e = aEnv(t, .08, v, d); sh.connect(lp).connect(tr).connect(e).connect(o);
  const br = aNoise(t, d), bp = aFilt('bandpass', 380, 1.5, t), be = aEnv(t, .1, v * .5, d); br.connect(bp).connect(be).connect(o);
}
function moan(o, t, d, v, f0, f1, vow) {
  const src = aOsc('sawtooth', f0, t, d, f1); aLFO(t, d, 5.2, f0 * .03, src.frequency);
  const F = vow === 'a' ? [760, 1180] : vow === 'e' ? [520, 1750] : [430, 820], e = aEnv(t, d * .25, v, d * .75);
  for (const [f, q] of [[F[0], 6], [F[1], 9]]) { const b = aFilt('bandpass', f, q, t); src.connect(b); b.connect(e); }
  e.connect(o); nb(o, t, d, v * .25, 'bandpass', 1500, 1100, 2, d * .3);
}
function shriek(o, t, d, v, f0, f1) {
  const sh = aShape(3.5), hp = aFilt('highpass', 300, 0, t), bp = aFilt('lowpass', 2400, .7, t);
  for (const k of [1, 1.021, .987, 1.5]) aOsc('sawtooth', f0 * k, t, d, f1 * k).connect(sh);
  const e = aEnv(t, .04, v * .4, d); sh.connect(hp).connect(bp).connect(e).connect(o); nb(o, t, d * .8, v * .18, 'bandpass', 1400, 1900, 1, .03);
}
function clicks(o, t, n, gap, v, f) { for (let i = 0; i < n; i++) { const tt = t + i * gap * rand(.6, 1.4); nb(o, tt, .03, v * rand(.5, .8), 'bandpass', f * .6 * rand(.85, 1.15), null, 4); } }
function squelch(o, t, v) { nb(o, t, .32, v, 'lowpass', 1100, 160, 2); bl(o, t, 'sine', 320, 70, .22, v * .6); nb(o, t + .05, .18, v * .5, 'bandpass', 700, 300, 4); }
function gurgle(o, t, d, v) { const n = aNoise(t, d), lp = aFilt('lowpass', 520, 6, t); aLFO(t, d, 13, 260, lp.frequency); const e = aEnv(t, .05, v, d); n.connect(lp).connect(e).connect(o); for (let i = 0; i < 6; i++) bl(o, t + Math.random() * d, 'sine', rand(180, 520), rand(90, 200), .07, v * .5); }
function rumble(o, t, d, v) { nb(o, t, d, v, 'lowpass', 140, 70, 1, d * .2); bl(o, t, 'sine', 44, 34, d, v * .7, d * .2); }
function breath(o, t, v, f) { nb(o, t, .7, v, 'bandpass', f || 1100, (f || 1100) * 1.3, 3, .35); nb(o, t + .85, .9, v * .8, 'bandpass', (f || 1100) * 1.2, (f || 1100) * .8, 3, .1); }
function heart(o, t, v) { bl(o, t, 'sine', 62, 38, .2, v); bl(o, t + .23, 'sine', 55, 34, .25, v * .7); }
function clank(o, t, v) { for (const [f, d] of [[392, .6], [880, .4], [1250, .25]]) bl(o, t, 'triangle', f, f * .98, d, v * .3, .004); nb(o, t, .08, v * .2, 'bandpass', 1600, null, 2); }
function creak(o, t, d, v) { const s = aOsc('sawtooth', 85, t, d, 140), bp = aFilt('bandpass', 720, 7, t), am = AC.createGain(); am.gain.value = .5; aLFO(t, d, 23, .5, am.gain); const e = aEnv(t, .1, v, d); s.connect(bp).connect(am).connect(e).connect(o); }
function knocks(o, t, v) { for (let i = 0; i < 3; i++) { const tt = t + i * .34; bl(o, tt, 'sine', 170, 85, .14, v); nb(o, tt, .06, v * .5, 'bandpass', 900, null, 3); } }
function whisp(o, t, d, v) { for (const f of [1500, 2200, 1050]) { const n = aNoise(t, d), bp = aFilt('bandpass', f, 7, t), am = AC.createGain(); am.gain.value = .5; aLFO(t, d, rand(7, 13), .5, am.gain); bp.frequency.setValueAtTime(f, t); bp.frequency.linearRampToValueAtTime(f * rand(1.1, 1.35), t + d * .4); bp.frequency.linearRampToValueAtTime(f * .85, t + d); const e = AC.createGain(); e.gain.setValueAtTime(.0001, t); e.gain.linearRampToValueAtTime(v, t + d * .3); e.gain.linearRampToValueAtTime(.0001, t + d); n.connect(bp).connect(am).connect(e).connect(o); } }
const BIG = { bruto: 1, alfa: 1, aglomerado: 1, colhedor: 1, mae: 1, costurado: 1, urso: 1, cervo_oco: 1 }, HUMAN = { hospedeiro: 1, imitador: 1, costurado: 1 };
const SFX = {
  // jogador, armas e mundo
  swing: (o, t) => { nb(o, t, .15, 1.2, 'bandpass', 1500, 450, .8); },
  hit: (o, t) => { squelch(o, t, .55); bl(o, t, 'sine', 120, 45, .2, .6); nb(o, t, .05, .14, 'bandpass', 1700, null, 1.5); },
  die: (o, t, type) => { squelch(o, t, .8); nb(o, t + .12, .5, .45, 'lowpass', 600, 120, 2); if (BIG[type]) growl(o, t, 1.4, .7, 85, 38, 11, 600); else if (HUMAN[type]) moan(o, t, 1.1, .6, 190, 95, 'a'); else shriek(o, t, .45, .7, 620, 220); },
  chop: (o, t) => { nb(o, t, .1, .7, 'lowpass', 900, 300); bl(o, t, 'sine', 150, 60, .1, .4); },
  fall: (o, t) => { creak(o, t, .5, .25); nb(o, t + .45, .9, .55, 'lowpass', 500, 90, 1, .02); },
  clink: (o, t) => { bl(o, t, 'triangle', 800, 560, .1, .12, .004); nb(o, t, .04, .08, 'bandpass', 2000, null, 2); },
  pick: (o, t) => { bl(o, t, 'triangle', 520, 760, .07, .14); nb(o, t, .05, .12, 'bandpass', 2000, null, 2); }, equip: (o, t) => { bl(o, t, 'triangle', 240, 330, .06, .09); nb(o, t, .05, .06, 'bandpass', 1800, null, 2); },
  place: (o, t) => { nb(o, t, .12, .3, 'lowpass', 500); bl(o, t, 'sine', 140, 60, .12, .2); }, craft: (o, t) => { bl(o, t, 'triangle', 420, 420, .08, .09); bl(o, t + .08, 'triangle', 630, 630, .12, .09); },
  eat: (o, t) => { for (let i = 0; i < 3; i++) nb(o, t + i * .11, .06, .14, 'bandpass', 1500, null, 2); }, drink: (o, t) => { bl(o, t, 'sine', 300, 520, .1, .09); bl(o, t + .13, 'sine', 330, 560, .1, .09); },
  heal: (o, t) => bl(o, t, 'sine', 440, 640, .2, .09), splash: (o, t) => nb(o, t, .3, .18, 'bandpass', 1800, 600, 1),
  bow: (o, t) => { bl(o, t, 'triangle', 240, 100, .16, .25); nb(o, t, .06, .1, 'bandpass', 1800, null, 2); },
  shot: (o, t) => { nb(o, t, .04, .3, 'bandpass', 1700, null, 1.2); nb(o, t, .35, .9, 'lowpass', 2400, 260); bl(o, t, 'sine', 130, 34, .25, .7); },
  shotgun: (o, t) => { nb(o, t, .05, .35, 'bandpass', 1400, null, 1.2); nb(o, t, .6, 1.1, 'lowpass', 1500, 180); bl(o, t, 'sine', 100, 30, .4, .95); },
  click: (o, t) => bl(o, t, 'triangle', 900, 650, .04, .05, .003), reload: (o, t) => { clank(o, t, .25); bl(o, t + .1, 'square', 700, 500, .05, .06, .001); },
  roll: (o, t) => { nb(o, t, .25, .8, 'lowpass', 900, 250); bl(o, t + .18, 'sine', 90, 45, .12, .3); }, door: (o, t) => { creak(o, t, .35, .2); nb(o, t + .3, .12, .3, 'lowpass', 400); },
  break: (o, t) => { nb(o, t, .28, .8, 'bandpass', 1300, 700, 1); bl(o, t, 'triangle', 900, 500, .1, .12); nb(o, t, .12, .5, 'lowpass', 600); }, fire: (o, t) => nb(o, t, 1, .5, 'lowpass', 300, 2200, 0, .4),
  boom: (o, t) => { nb(o, t, 1.6, 1, 'lowpass', 800, 90, 1); bl(o, t, 'sine', 70, 24, 1.3, 1); nb(o, t + .2, 1.6, .15, 'bandpass', 1200, 400, .8, .3); },
  hurt: (o, t) => { nb(o, t, .12, .5, 'lowpass', 900); bl(o, t, 'sine', 110, 50, .2, .5); moan(o, t + .02, .32, .35, 210, 150, 'a'); },
  death: (o, t) => { moan(o, t, 1.6, .55, 170, 70, 'a'); bl(o, t, 'sine', 80, 30, 2, .6, .1); nb(o, t, 2.2, .2, 'lowpass', 400, 80, 0, .3); },
  sleep: (o, t) => bl(o, t, 'sine', 260, 120, .6, .07), static: (o, t) => nb(o, t, .7, .3, 'bandpass', 1800, null, .7),
  level: (o, t) => [392, 466, 587].forEach((f, i) => bl(o, t + i * .11, 'triangle', f, f, .22, .09)), quest: (o, t) => { bl(o, t, 'triangle', 294, 294, .16, .08); bl(o, t + .13, 'triangle', 440, 440, .24, .08); },
  talk: (o, t) => bl(o, t, 'triangle', rand(170, 240), null, .05, .03, .004), ui: (o, t) => bl(o, t, 'triangle', 500, 500, .03, .05, .001),
  whisper: (o, t) => whisp(o, t, rand(1, 1.6), .5),
  heart: (o, t, k) => heart(o, t, .35 + .45 * (k || .5)),
  // criaturas: ações
  emerge: (o, t) => { rumble(o, t, .9, .5); nb(o, t + .1, .6, .35, 'bandpass', 220, 1300, 2); squelch(o, t + .4, .4); },
  roar: (o, t, type) => type === 'mae' ? (growl(o, t, 2.2, 1, 46, 30, 9, 500), moan(o, t, 2, .5, 90, 70, 'o')) : growl(o, t, 1.4, .85, 95, 55, 15, 800),
  spit: (o, t) => { gurgle(o, t, .35, .45); nb(o, t + .25, .18, .45, 'bandpass', 900, 300, 2); bl(o, t + .25, 'sine', 420, 90, .2, .3); },
  step: (o, t) => { rumble(o, t, .5, .8); bl(o, t, 'sine', 55, 26, .6, .9); },
  thud: (o, t) => { bl(o, t, 'sine', 80, 28, .5, .9); nb(o, t, .25, .5, 'lowpass', 300); },
  leap: (o, t, type) => { if (type === 'cao') { growl(o, t, .3, .8, 230, 140, 30, 1100); nb(o, t, .25, .3, 'lowpass', 700); return; } shriek(o, t, .4, .95, 480, 1000); nb(o, t, .35, .45, 'bandpass', 500, 1500, 1); },
  scream: (o, t) => { shriek(o, t, 1.5, 1.3, 360, 1050); moan(o, t, 1.3, .9, 260, 360, 'a'); shriek(o, t + .2, 1.1, .65, 520, 1300); },
  // criaturas: vozes que repetem enquanto estão por perto
  v_larva: (o, t) => { clicks(o, t, 6, .05, .2, 2600); squelch(o, t + .2, .15); },
  v_rastejante: (o, t, st) => { clicks(o, t, 9, .045, .45, 1800); nb(o, t + .3, .5, .18, 'bandpass', 1400, null, 1, .15); if (st === 'chase') shriek(o, t + .5, .3, .5, 760, 420); },
  v_cuspidor: (o, t) => gurgle(o, t, 1, .4),
  v_escavador: (o, t, st) => st === 'burrow' ? rumble(o, t, 1.6, .7) : (clicks(o, t, 6, .07, .2, 900), growl(o, t + .3, .6, .3, 120, 90, 20, 900)),
  v_verme: (o, t) => { nb(o, t, .7, 1, 'bandpass', 1300, 380, 1.5); squelch(o, t + .3, .2); clicks(o, t + .4, 4, .06, .18, 2200); },
  v_hospedeiro: (o, t, st) => st === 'chase' ? moan(o, t, 1.1, .55, 260, 340, 'a') : moan(o, t, 1.8, .4, 140, 105, 'o'),
  v_rasteira: (o, t) => { gurgle(o, t, 1.2, .3); squelch(o, t + .6, .25); },
  v_imitador: (o, t) => breath(o, t, .3, 950),
  v_bruto: (o, t) => growl(o, t, 1.2, .6, 72, 56, 13, 650),
  v_colhedor: (o, t) => { growl(o, t, 2.2, .55, 46, 38, 7, 400); moan(o, t + .3, 1.8, .25, 80, 65, 'o'); creak(o, t + 1.2, .8, .12); },
  v_alfa: (o, t) => growl(o, t, 1.6, .8, 62, 45, 11, 600),
  v_mae: (o, t) => { growl(o, t, 2.6, .9, 40, 31, 8, 450); for (const f of [110, 147, 196]) moan(o, t + Math.random() * .6, 2, .22, f, f * .8, 'o'); gurgle(o, t + 1, 1.2, .3); },
  v_saltador: (o, t) => { clicks(o, t, 14, .028, .6, 2100); nb(o, t + .45, .4, .2, 'bandpass', 1400, null, 1); },
  v_aglomerado: (o, t) => { for (const [f, vw] of [[120, 'o'], [170, 'a'], [230, 'e']]) moan(o, t + Math.random() * .5, rand(1.2, 1.8), .26, f, f * rand(.75, 1.2), vw); squelch(o, t + .8, .3); },
  v_gritador: (o, t) => { breath(o, t, .3, 700); gurgle(o, t + .2, .8, .2); },
  v_costurado: (o, t, st) => { breath(o, t, .35, 800); moan(o, t + .2, 1.2, .3, st === 'chase' ? 150 : 95, st === 'chase' ? 180 : 80, 'o'); clank(o, t + .9, .2); },
  cough: (o, t) => { for (let i = 0; i < 3; i++) { const tt = t + i * .24 + Math.random() * .05; nb(o, tt, .16, .55, 'bandpass', 650, 380, 1.4, .01); bl(o, tt, 'sawtooth', 150, 105, .13, .1, .006); } },
  // fauna sadia
  a_cachorro: (o, t) => { const n = randi(1, 3); for (let i = 0; i < n; i++) { const tt = t + i * .3, f = rand(300, 360); bl(o, tt, 'sawtooth', f, f * .7, .12, .1, .006); nb(o, tt, .1, .16, 'bandpass', 900, 600, 2); } },
  a_corvo: (o, t) => { const n = randi(2, 3); for (let i = 0; i < n; i++) { const tt = t + i * .28, f = rand(560, 640); moan(o, tt, .18, .3, f, f * .82, 'a'); } },
  a_urso: (o, t, st) => st === 'angry' ? growl(o, t, 1, .7, 100, 70, 14, 700) : (growl(o, t, 1.4, .35, 70, 58, 8, 450), breath(o, t + .4, .12, 500)),
  // fauna infectada
  v_lebre: (o, t) => { for (let i = 0; i < 2; i++) { bl(o, t + i * .16, 'triangle', rand(480, 560), 300, .12, .16); nb(o, t + i * .16, .1, .36, 'bandpass', 1100, 700, 3); } squelch(o, t + .3, .14); },
  v_cao: (o, t, st) => { if (st === 'idle') { moan(o, t, 2, .4, 300, 205, 'o'); moan(o, t + .15, 1.8, .18, 452, 300, 'o'); growl(o, t + .4, 1.2, .2, 70, 55, 9, 400); } else { growl(o, t, .6, .55, 150, 110, 26, 900); growl(o, t + .65, .16, .6, 240, 150, 30, 1100); } },
  v_corvo: (o, t, st) => { const n = st === 'dive' ? 1 : randi(2, 3); for (let i = 0; i < n; i++) { const tt = t + i * .26, f = rand(380, 440) * (st === 'dive' ? 1.15 : 1); moan(o, tt, st === 'dive' ? .45 : .22, .45, f, f * .78, 'a'); nb(o, tt, .14, .16, 'bandpass', 1300, 900, 2); } },
  v_cervo_oco: (o, t) => { creak(o, t, .9, .22); moan(o, t + .3, 1.7, .5, 118, 78, 'o'); clicks(o, t + 1.2, 5, .08, .2, 1100); },
  v_urso: (o, t, st) => { growl(o, t, st === 'chase' ? 1.2 : 1.8, .9, st === 'chase' ? 75 : 58, 44, 9, 520); gurgle(o, t + .5, 1, .3); moan(o, t + .2, 1.4, .22, 95, 70, 'o'); },
  // ruídos distantes da noite
  amb: (o, t) => { const k = randi(0, 5); if (k === 0) knocks(o, t, .7); else if (k === 1) creak(o, t, 1.4, .3); else if (k === 2) clank(o, t, .6); else if (k === 3) moan(o, t, 2.2, .5, 320, 210, 'a'); else if (k === 4) growl(o, t, 1.8, .6, 70, 48, 10, 500); else whisp(o, t, 1.6, .5); },
};
const SFXOPT = { amb: { range: 1500, wet: .5 }, whisper: { wet: .45 }, scream: { range: 1200, wet: .3 }, roar: { range: 1100, wet: .3 }, step: { range: 1000 }, boom: { range: 1400, wet: .35 }, v_mae: { range: 1200 }, v_colhedor: { range: 1000 }, v_urso: { range: 1100 }, v_cao: { range: 1100, wet: .3 }, shot: { wet: .25 }, shotgun: { wet: .3 }, heart: {} };
function sfx(n, x, y, extra) {
  if (muted || !AC || AC.state !== 'running' || SET.sfx <= 0) return; const f = SFX[n]; if (!f) return;
  const now = performance.now(), key = x === undefined ? n : n + Math.round(x / 160) + ',' + Math.round(y / 160); if (now - (sfxLast[key] || 0) < (n[0] === 'v' && n[1] === '_' ? 400 : 45)) return; sfxLast[key] = now;
  if (n[0] === 'v' && n[1] === '_') { liveVoices = liveVoices.filter(e => e > now); if (liveVoices.length >= 7) return; liveVoices.push(now + 1800); }
  const op = SFXOPT[n] || {}, o = spot(x, y, op.wet === undefined ? .15 : op.wet, op.range); if (!o) return;
  try { f(o, AC.currentTime + .005, extra); } catch (e) { }
}
function audioInit() { if (AC) { if (AC.state === 'suspended') AC.resume(); return; } try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
// batimento cardíaco quando o perigo chega perto; ruídos ao longe durante a noite
let hbT = 0, ambT = 25;
function horrorTick(dt) {
  if (G.state !== 'play' || paused() || !AC || AC.state !== 'running' || muted || P.sleeping) return;
  let near = 1e9; for (const e of G.enemies) if (!e.dead && !e.def.patch && e.state !== 'idle' && e.state !== 'burrow') near = Math.min(near, dist(e.x, e.y, P.x, P.y));
  const fear = Math.max(P.hp < maxHp() * .3 ? .8 : 0, near < 320 ? 1 - near / 320 : 0, P.sanity < 30 ? (30 - P.sanity) / 30 : 0);
  hbT -= dt; if (fear > .12 && hbT <= 0) { hbT = 1.15 - fear * .6; sfx('heart', undefined, undefined, fear); }
  ambT -= dt; if (ambT <= 0) { ambT = rand(16, 40) * (darkness() > .6 ? 1 : 2.5); if (darkness() > .6 || Math.random() < .3) { const a = Math.random() * 6.28, r = rand(420, 820); sfx('amb', P.x + Math.cos(a) * r, P.y + Math.sin(a) * r); } }
}
// zumbido grave contínuo à noite e com sanidade baixa
let drone = null;
function droneTick() { if (!AC || AC.state !== 'running') return; if (!drone) { const o = AC.createOscillator(), o2 = AC.createOscillator(), v = AC.createGain(); o.type = 'sawtooth'; o.frequency.value = 43; o2.type = 'sine'; o2.frequency.value = 64.5; const f = AC.createBiquadFilter(); f.frequency.value = 180; v.gain.value = 0; o.connect(f); o2.connect(f); f.connect(v).connect(OUT('m')); o.start(); o2.start(); drone = v; } const want = muted || G.state !== 'play' || paused() ? 0 : Math.min(.07, darkness() * .028 + (100 - P.sanity) * .0005 + (G.boss ? .02 : 0)); drone.gain.setTargetAtTime(want, AC.currentTime, .6); }


/* ===================== TRILHA SONORA (gerada em tempo real) ===================== */
let musT = 0, musBar = 0, musOn = true;
function mpad(f, t0, d, vol, cut) { const o = AC.createOscillator(), o2 = AC.createOscillator(), v = AC.createGain(), fl = AC.createBiquadFilter(); o.type = o2.type = 'sawtooth'; o.frequency.value = f; o2.frequency.value = f * 1.006; fl.type = 'lowpass'; fl.frequency.value = cut; v.gain.setValueAtTime(0.0001, t0); v.gain.linearRampToValueAtTime(vol, t0 + d * .35); v.gain.linearRampToValueAtTime(0.0001, t0 + d); o.connect(fl); o2.connect(fl); fl.connect(v).connect(OUT('m')); o.start(t0); o2.start(t0); o.stop(t0 + d + .05); o2.stop(t0 + d + .05); }
function mpluck(f, t0, vol, d, type) { const o = AC.createOscillator(), v = AC.createGain(), fl = AC.createBiquadFilter(); o.type = type || 'triangle'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = 1800; v.gain.setValueAtTime(vol, t0); v.gain.exponentialRampToValueAtTime(.0004, t0 + (d || 2.6)); o.connect(fl).connect(v).connect(OUT('m')); o.start(t0); o.stop(t0 + (d || 2.6) + .05); }
const MUS = {
  day: [[110, 130.8, 164.8], [130.8, 164.8, 196], [87.3, 130.8, 174.6], [82.4, 123.5, 164.8]],
  night: [[110, 130.8, 155.6], [103.8, 130.8, 155.6], [98, 116.5, 146.8], [92.5, 110, 138.6]],
  scale: [220, 261.6, 293.7, 329.6, 392, 440, 523.3],
};
function musicTick() {
  if (!AC || AC.state !== 'running' || muted || !musOn || SET.mus <= 0) return; const now = AC.currentTime; if (now < musT - .25) return;
  const BAR = 3.4, t0 = Math.max(now + .05, musT); musT = t0 + BAR;
  const play = G.state === 'play', night = !play || darkness() > .5, low = play && P.sanity < 40;
  const danger = play && !paused() && (!!G.boss || G.enemies.some(e => !e.def.patch && e.state !== 'idle' && e.state !== 'leave' && dist(e.x, e.y, P.x, P.y) < 460));
  const ch = (night ? MUS.night : MUS.day)[musBar++ % 4];
  for (const f of ch) mpad(f, t0, BAR * 1.2, night ? .02 : .016, night ? 420 : 760);
  mpad(ch[0] / 2, t0, BAR * 1.2, .03, 200);
  const n = night ? (Math.random() < .55 ? 1 : 0) : 1 + (Math.random() < .5 ? 1 : 0) + (Math.random() < .25 ? 1 : 0);
  for (let i = 0; i < n; i++) { const f = MUS.scale[Math.floor(Math.random() * MUS.scale.length)] * (night ? .5 : 1); mpluck(f, t0 + Math.floor(Math.random() * 8) * BAR / 8, night ? .05 : .04); }
  if ((night && Math.random() < .3) || low) mpluck(MUS.scale[musBar % 7] * 2 * 1.059, t0 + BAR * .5, .014, 3.2, 'sine');
  if (danger) for (let i = 0; i < 16; i++) { mpluck(i % 4 ? 55 : 51.9, t0 + i * BAR / 16, i % 4 ? .07 : .12, .16, 'square'); if (i % 4 === 2) mpluck(ch[0] * 4 * (G.boss ? 1.059 : 1), t0 + i * BAR / 16, .02, .3, 'sawtooth'); }
}

/* ===================== AVISOS E DIÁLOGOS ===================== */
const toastsLive = [];
function toast(msg, ic, big) {
  const m = /^\+(\d+) (.+)$/.exec(msg);
  if (m) { const ex = toastsLive.find(t => t.key === m[2] && t.life > .4); if (ex) { ex.n += +m[1]; ex.life = 2.6; ex.el.lastChild.textContent = `+${ex.n} ${m[2]}`; return; } }
  const el = document.createElement('div'); el.className = 'toast' + (big ? ' big' : ''); if (ic) { const a = document.createElement('img'); a.src = iconURL(ic); a.alt = ''; el.append(a); } const b = document.createElement('span'); b.textContent = msg; el.append(b);
  $('toasts').appendChild(el); toastsLive.push({ el, life: big ? 4 : 2.6, key: m ? m[2] : null, n: m ? +m[1] : 0 });
  while (toastsLive.length > 7) toastsLive.shift().el.remove();
}
function showDialog(lines, cb) {
  if (!lines || !lines.length) { cb && cb(); return; }
  lines = lines.map(l => [l[0], String(l[1]).replace(/\{nome\}/g, P.name || 'Você')]);
  if (UI.dialog) { UI.dq.push([lines, cb]); return; }
  UI.dialog = { lines, i: 0, cb, ch: 0 }; $('dialog').hidden = false; dialogLine();
}
function dialogLine() { const d = UI.dialog, l = d.lines[d.i], w = WHO[l[0]]; d.ch = 0; $('dg-p').src = l[0] === 'eu' ? playerPortrait() : iconURL(w[0]); $('dg-n').textContent = l[0] === 'eu' ? (P.name || 'Você') : w[1]; $('dg-n').hidden = !w[1]; $('dg-t').textContent = ''; $('dialog').classList.toggle('crt', l[0] === 'tv' || l[0] === 'radio'); }
function dialogNext() {
  const d = UI.dialog; if (!d) return; const txt = d.lines[d.i][1];
  if (d.ch < txt.length) { d.ch = txt.length; $('dg-t').textContent = txt; return; }
  d.i++; if (d.i < d.lines.length) { dialogLine(); return; }
  UI.dialog = null; $('dialog').hidden = true; d.cb && d.cb();
  if (!UI.dialog && UI.dq.length) { const n = UI.dq.shift(); showDialog(n[0], n[1]); }
}

/* ===================== HUD ===================== */
const BARS = [['hp', 'u_heart', '--hp', 'Vida'], ['stam', 'u_bolt', '--st', 'Estamina'], ['hunger', 'carne_assada', '--hunger', 'Fome'], ['thirst', 'u_drop', '--thirst', 'Sede'], ['sleep', 'u_moon', '--sleep', 'Sono'], ['sanity', 'u_eye', '--sanity', 'Sanidade'], ['inf', 'tecido_vivo', '--inf', 'Infecção']];
const KEYS_FOOT = '<span><b>Tab</b> Mochila</span><span><b>C</b> Criar</span><span><b>K</b> Habilidades</span><span><b>J</b> Diário</span><span><b>M</b> Mapa</span><span><b>V</b> Construir</span><span><b>Q</b> Curar</span><span><b>Esc</b> ou <b>P</b> Pausa</span>';
const KEYS_CAR = '<span><b>W S</b> Acelerar e frear</span><span><b>A D</b> Virar</span><span><b>Espaço</b> Freio de mão</span><span><b>R</b> Abastecer</span><span><b>X</b> Consertar</span><span><b>Tab</b> Porta-malas</span><span><b>E</b> Sair</span>';
function buildHUD() {
  $('bars').innerHTML = BARS.map(b => `<div class="bar" id="b-${b[0]}" style="--c:var(${b[2]})" title="${b[3]}">${ih(b[1])}<div class="t"><div class="f"></div></div><span class="v"></span></div>`).join('') + `<div id="xprow"><span class="lvl" id="lvl"></span><div class="xpbar" id="xpbar"><i></i></div><span id="sp"></span></div>`;
  $('carhud').innerHTML = `<div class="m">${ih('gasolina')} Gasolina<div class="t"><div class="f" id="car-f" style="background:var(--hunger)"></div></div></div><div class="m">${ih('kit_reparo')} Lataria<div class="t"><div class="f" id="car-h" style="background:var(--st)"></div></div></div><b id="car-s"></b>`;
}
// o HUD só mexe na página quando o valor muda (cada mudança faz o navegador recalcular a tela)
function setS(el, prop, v) { const k = '_s' + prop; if (!GFX.lite || el[k] !== v) { el[k] = v; el.style[prop] = v; } }
function setT(el, v) { v = String(v); if (!GFX.lite || el._t !== v) { el._t = v; el.textContent = v; } }
function setH(el, v) { if (!GFX.lite || el._h !== v) { el._h = v; el.hidden = v; } }
function setBar(id, v, max) { const el = $('b-' + id), f = clamp(v / max, 0, 1); el._f ||= el.querySelector('.f'); el._v ||= el.querySelector('.v'); setS(el._f, 'width', (f * 100).toFixed(1) + '%'); setT(el._v, Math.ceil(v)); const lo = f < .22; if (el._lo !== lo) { el._lo = lo; el.classList.toggle('low', lo); } }
function buildBarHTML() {
  return BUILDS.map((p, i) => `<div class="bs ${i === BUILD.sel ? 'on' : ''}" title="${p.d}"><k>${i + 1}</k>${ih(p.ic)}<span><b>${p.n}</b><small>${Object.keys(p.cost).map(c => `<em class="${invCount(c) >= p.cost[c] ? 'ok' : 'no'}">${ih(c)}${p.cost[c]}</em>`).join(' ')}</small></span></div>`).join('')
    + `<div class="bstat ${BUILD.err ? 'no' : 'ok'}">${BUILD.err || 'Clique para construir'}<small>Botão direito desmonta e devolve metade · V sai</small></div>`;
}
function renderHotbar() {
  $('hotbar').innerHTML = P.hot.map((id, i) => { const it = id && ITEMS[id], n = id ? invCount(id) : 0, s = id && invFind(id); return `<div class="hs ${i === P.sel ? 'on' : ''} ${id && !n ? 'none' : ''}"><k>${i + 1}</k>${it ? ih(id) : ''}${n > 1 ? `<i>${n}</i>` : ''}${s && s.dur !== undefined ? `<div class="dur"><b style="width:${clamp(s.dur / it.dur, 0, 1) * 100}%"></b></div>` : ''}</div>`; }).join('');
  const it = curItem(); $('itemname').textContent = it ? it.n : P.hot[P.sel] ? ITEMS[P.hot[P.sel]].n + ' (acabou)' : 'Punhos';
}
function renderQuests() {
  const main = G.quests.find(q => QUESTS[q.id].main), sides = G.quests.filter(q => !QUESTS[q.id].main); let h = '';
  const objs = q => QUESTS[q.id].obj.map((o, i) => `<div class="o ${q.prog[i] >= o.n ? 'd' : ''}">${ih(q.prog[i] >= o.n ? 'u_check' : 'u_dot')}<span>${o.txt}${o.n > 1 ? ` (${q.prog[i]}/${o.n})` : ''}</span></div>`).join('');
  if (main) h += `<h4>${QUESTS[main.id].title}</h4>${objs(main)}`; else if (G.flags.won) h += `<h4>Vale em silêncio</h4><div class="o">${ih('u_dot')}<span>Sobreviva o quanto quiser</span></div>`;
  if (sides.length) h += `<div class="sq">${sides.map(q => { const Q = QUESTS[q.id], i = Math.max(0, q.prog.findIndex((p, k) => p < Q.obj[k].n)), o = Q.obj[i]; return `${Q.title}${o.n > 1 ? ` (${q.prog[i]}/${o.n})` : ''}`; }).join('<br>')}</div>`;
  for (const i of G.pins) { const r = RECIPES[i]; if (!r) continue; h += `<div class="pin"><b>${ih(r.out)} ${ITEMS[r.out].n}</b><span class="st">${r.st ? ITEMS[r.st].n : 'Feito à mão'}</span><div class="ings">${Object.keys(r.in).map(k => { const have = invCount(k); return `<span class="ing ${have >= r.in[k] ? 'ok' : 'no'}">${ih(k)} ${ITEMS[k].n} ${Math.min(have, 99)}/${r.in[k]}</span>`; }).join('')}</div></div>`; }
  $('qtrack').innerHTML = h; $('qtrack').hidden = !h;
}
function hud(dt) {
  for (const t of toastsLive) { t.life -= dt; if (t.life < .4) t.el.style.opacity = 0; if (t.life <= 0) t.el.remove(); }
  for (let i = toastsLive.length - 1; i >= 0; i--) if (toastsLive[i].life <= 0) toastsLive.splice(i, 1);
  if (UI.dialog) { const d = UI.dialog, txt = d.lines[d.i][1]; if (d.ch < txt.length) { const p = Math.floor(d.ch); d.ch = Math.min(txt.length, d.ch + dt * 55); if (Math.floor(d.ch) !== p) { $('dg-t').textContent = txt.slice(0, Math.floor(d.ch)); if (Math.floor(d.ch) % 3 === 0) sfx('talk'); } } }
  droneTick(); musicTick(); horrorTick(dt);
  if (G.state === 'title') return;
  setBar('hp', P.hp, maxHp()); setBar('stam', P.stam, maxSt()); setBar('hunger', P.hunger, 100); setBar('thirst', P.thirst, 100); setBar('sleep', P.sleep, 100); setBar('sanity', P.sanity, 100);
  { const ib = $('b-inf'), iv = P.inf || 0; setBar('inf', iv, 100); setH(ib, iv <= 0); if (ib._lo !== (iv >= 75)) { ib._lo = iv >= 75; ib.classList.toggle('low', ib._lo); } setT(ib._v ||= ib.querySelector('.v'), Math.ceil(iv) + '%'); }
  setT($('lvl'), 'Nv ' + P.lvl); setS($('xpbar').firstChild, 'width', (P.xp / xpNeed(P.lvl) * 100).toFixed(1) + '%'); const spt = P.sp ? `+${P.sp} ponto${P.sp > 1 ? 's' : ''}` : ''; if ($('sp').textContent !== spt) $('sp').textContent = spt;
  const h = hourNow(), hh = Math.floor(h), mm = Math.floor((h - hh) * 6) * 10; setT($('ck-t'), String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0')); setT($('ck-d'), `Dia ${dayNum()} · ${DF().n}`);
  const ci = h >= 20.5 || h < 5.5 ? 'u_moon' : h < 7 || h > 18 ? 'u_dusk' : 'u_sun'; if (UI.lastCk !== ci) { UI.lastCk = ci; $('ck-ic').src = iconURL(ci); }
  const w = invWeight(), cap = capacity(), it = curItem(), drv = P.driving; let hi = `<span class="${w > cap ? 'over' : ''}">${ih('u_weight')} ${w.toFixed(1)} / ${cap} kg</span>`;
  if (!drv && it && it.kind === 'gun') hi += `<span>${ih(it.ammo)} ${P.mags[it.id] || 0} / ${invCount(it.ammo)}</span>`; else if (!drv && it && it.kind === 'bow') hi += `<span>${ih('flecha')} ${invCount('flecha')}</span>`;
  if (hi !== UI.lastHi) { UI.lastHi = hi; $('hotinfo').innerHTML = hi; }
  const bm = BUILD.on;
  if (UI.lastDrv !== drv || UI.lastBm !== bm) { UI.lastDrv = drv; UI.lastBm = bm; $('hotbar').hidden = drv || bm; $('buildbar').hidden = !bm; $('carhud').hidden = !drv; $('keys').innerHTML = drv ? KEYS_CAR : KEYS_FOOT; $('itemname').style.visibility = drv || bm ? 'hidden' : ''; $('keys').hidden = bm; }
  if (bm) { const bb = buildBarHTML(); if (bb !== UI.lastBb) { UI.lastBb = bb; $('buildbar').innerHTML = bb; } }
  if (drv) { const c = G.car; $('car-f').style.width = c.fuel + '%'; $('car-h').style.width = c.hp + '%'; $('car-s').textContent = Math.round(Math.abs(c.spd) * .22) + ' km/h'; }
  const st = []; if (w > cap) st.push(['bad', 'u_weight', 'Sobrecarregado']); if (P.hunger <= 0) st.push(['bad', 'carne_assada', 'Faminto']); if (P.thirst <= 0) st.push(['bad', 'u_drop', 'Desidratado']); if (P.sleep <= 0) st.push(['bad', 'u_zzz', 'Exausto']); else if (P.sleep < 20) st.push(['', 'u_zzz', 'Com sono']);
  if (P.sanity <= 0) st.push(['bad', 'u_eye', 'Em colapso']); else if (P.sanity < 25) st.push(['bad', 'u_eye', 'Apavorado']); else if (P.sanity < 50) st.push(['', 'u_eye', 'Inquieto']);
  if (P.inf >= 75) st.push(['bad', 'tecido_vivo', 'Tomado pelo Tecido']); else if (P.inf >= 50) st.push(['bad', 'tecido_vivo', 'Febre']); else if (P.inf >= 25) st.push(['', 'tecido_vivo', 'Infectado']);
  if (P.regen > 0) st.push(['', 'soro', 'Regenerando']); if (P.slowT > 0) st.push(['bad', 'tecido_vivo', 'Agarrado']);
  if (darkness() > .6) { if (G.sheltered) st.push(['', 'u_house', 'Abrigado']); else if (!G.lit) st.push(['bad', 'u_moon', 'No escuro']); }
  const sh = st.map(s => `<div class="${s[0]}">${ih(s[1])} ${s[2]}</div>`).join(''); if (sh !== UI.lastSt) { UI.lastSt = sh; $('status').innerHTML = sh; }
  setS($('hurt'), 'opacity', Math.max(clamp(P.hurtFlash * 2, 0, 1), P.hp < maxHp() * .25 ? .35 + .2 * Math.sin(performance.now() / 200) : 0).toFixed(2));
  setS($('tired'), 'opacity', (P.sleep < 15 ? .8 - P.sleep / 30 : 0).toFixed(2)); setS($('sleepfx'), 'opacity', P.sleeping ? '1' : '0'); if (P.sleeping) $('sleeptxt').textContent = `${$('ck-t').textContent} · Sono ${Math.floor(P.sleep)}%`;
  const b = G.boss; setH($('boss'), !b); if (b) { setT($('boss-n'), b.def.n); setS($('boss-f'), 'width', (clamp(b.hp / b.maxhp, 0, 1) * 100).toFixed(1) + '%'); }
  const hk = P.hot.join() + P.sel; if (G.uiDirty || hk !== UI.lastHot) { UI.lastHot = hk; renderHotbar(); renderQuests(); if (UI.tab && UI.tab !== 'map') renderPanel(); G.uiDirty = false; }
  drawMini(); drawCompass();
}
const QT = { q_vila: ['vila', 'npc:tome'], q_carro: ['posto', 'posto', 'car'], q_pecas: ['parts'], q_torre: ['torre'], q_iris: ['estacao'], q_fendas: ['fis'], q_hospital: ['hospital', 'hospital', 'estacao'], q_barragem: ['barragem'], q_alfa: ['pedreira', 'estacao'], q_sede: ['sede'], q_bunker: ['bunker'], q_omega: ['estacao'], q_mae: ['cratera'], q_fuga: ['aerodromo'] };
function questTarget() {
  const q = G.quests.find(q => QUESTS[q.id].main); if (!q || !QT[q.id]) return null; const a = QT[q.id], i = Math.max(0, q.prog.findIndex((p, k) => p < QUESTS[q.id].obj[k].n)), k = a[Math.min(i, a.length - 1)];
  const near = list => { let b = null, bd = 1e12; for (const o of list) { const dd = dist(P.x, P.y, o.x, o.y); if (dd < bd) { bd = dd; b = o; } } return b; }, poi = id => ({ x: (POIS[id].x + .5) * TILE, y: (POIS[id].y + .5) * TILE });
  if (k === 'car') return G.car; if (k === 'fis') return near(W.fissures.filter(f => !f.sealed));
  if (k === 'parts') { const left = W.objs.filter(o => o.extra && o.extra.some(x => x[0] === 'peca_radio') && !G.looted[o.id]); return left.length ? near(left) : null; }
  if (k.startsWith('npc:')) return W.npcs[k.slice(4)]; return poi(k);
}
function drawCompass() {
  const c = $('compass').getContext('2d'), R = 34, cx = 42, cy = 40; c.clearRect(0, 0, 84, 100);
  c.fillStyle = 'rgba(14,11,17,.88)'; c.strokeStyle = 'rgba(232,224,208,.28)'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, R, 0, 6.3); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(232,224,208,.3)'; c.lineWidth = 1; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, r0 = i % 4 ? R - 4 : R - 8; c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * (R - 1), cy + Math.sin(a) * (R - 1)); c.stroke(); }
  c.font = '700 10px Barlow,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const [t, a, col] of [['N', -1.5708, '#d0584e'], ['L', 0, '#948a98'], ['S', 1.5708, '#948a98'], ['O', 3.1416, '#948a98']]) { c.fillStyle = col; c.fillText(t, cx + Math.cos(a) * (R - 14), cy + Math.sin(a) * (R - 14)); }
  c.save(); c.translate(cx, cy); c.rotate(P.ang); c.fillStyle = 'rgba(232,224,208,.85)'; c.beginPath(); c.moveTo(11, 0); c.lineTo(-5, -4.5); c.lineTo(-2, 0); c.lineTo(-5, 4.5); c.closePath(); c.fill(); c.restore();
  const t = questTarget(); let txt = 'Sem objetivo';
  if (t) { const a = Math.atan2(t.y - P.y, t.x - P.x), dd = dist(P.x, P.y, t.x, t.y); c.save(); c.translate(cx, cy); c.rotate(a); c.fillStyle = '#d9b36c'; c.strokeStyle = '#141018'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(R + 3, 0); c.lineTo(R - 10, -6); c.lineTo(R - 7, 0); c.lineTo(R - 10, 6); c.closePath(); c.fill(); c.stroke(); c.restore(); txt = dd < 160 ? 'Você chegou' : Math.round(dd / 20 / 10) * 10 + ' m'; }
  c.font = '600 11px Barlow,sans-serif'; c.lineWidth = 3; c.strokeStyle = 'rgba(8,6,10,.9)'; c.strokeText(txt, cx, 88); c.fillStyle = t ? '#d9b36c' : '#948a98'; c.fillText(txt, cx, 88);
}
function drawMini() {
  const c = $('mini').getContext('2d'), R = 34, s = 170 / (R * 2), px = P.x / TILE, py = P.y / TILE;
  c.fillStyle = '#0a080c'; c.fillRect(0, 0, 170, 170); c.imageSmoothingEnabled = false;
  c.drawImage(W.mini, (px - R) * 2, (py - R) * 2, R * 4, R * 4, 0, 0, 170, 170);
  const dk = darkness(); if (dk > 0) { c.fillStyle = `rgba(4,4,16,${dk * .55})`; c.fillRect(0, 0, 170, 170); }
  const dot = (x, y, col, r) => { c.fillStyle = col; c.beginPath(); c.arc((x / TILE - px + R) * s, (y / TILE - py + R) * s, r, 0, 6.3); c.fill(); };
  for (const f of W.fissures) if (!f.sealed) dot(f.x, f.y, '#c8485e', 4);
  for (const o of G.placed) if (o.type === 'cama' || o.type === 'fogueira') dot(o.x, o.y, '#d9b36c', 2.5);
  if (dk < .5 || sk('instinto') >= 3) for (const e of G.enemies) if (!e.def.patch && !(e.def.mimic && e.frozen)) dot(e.x, e.y, '#e04a4a', e.def.boss || e.def.reaper ? 5 : 2.5);
  if (G.car && !P.driving) { c.fillStyle = '#e8e0d0'; c.fillRect((G.car.x / TILE - px + R) * s - 4, (G.car.y / TILE - py + R) * s - 3, 8, 6); }
  c.imageSmoothingEnabled = true;
  for (const k in POIS) if (G.pois[k]) { const p = POIS[k], x = clamp((p.x - px + R) * s, 10, 160), y = clamp((p.y - py + R) * s, 10, 160); c.drawImage(IC(p.ic), x - 8, y - 8, 16, 16); }
  c.save(); c.translate(85, 85); c.rotate(P.ang); c.fillStyle = '#e8e0d0'; c.strokeStyle = '#141018'; c.lineWidth = 2; c.beginPath(); c.moveTo(8, 0); c.lineTo(-5, -5); c.lineTo(-2, 0); c.lineTo(-5, 5); c.closePath(); c.stroke(); c.fill(); c.restore();
}

/* ===================== JANELAS ===================== */
const TABS = [['inv', 'u_bag', 'Mochila', 'Tab'], ['craft', 'u_hammer', 'Criação', 'C'], ['skills', 'u_star', 'Habilidades', 'K'], ['journal', 'u_book', 'Diário', 'J'], ['arquivo', 'u_tv', 'Arquivo', 'B'], ['map', 'u_map', 'Mapa', 'M']];
function openPanel(tab) { if (G.state !== 'play' || UI.dialog || P.sleeping) return; if (tab !== 'inv') UI.chest = null; UI.tab = tab; $('shade').hidden = false; renderPanel(); sfx('ui'); mouse.down = false; for (const k in keys) keys[k] = false; }
function closePanel() { UI.tab = null; UI.chest = null; $('shade').hidden = true; }
function openChest(o) { UI.chest = o; UI.sel = -1; openPanel('inv'); }
function nearStation(st) { if (!st) return true; let ok = false; queryObjs(P.x, P.y, 130, o => { if (o.type === st && !o.dead && dist(o.x, o.y, P.x, P.y) < 120) ok = true; }); return ok; }
function slotHTML(s, i, act, on, cls) { const it = ITEMS[s.id]; return `<button class="slot ${on ? 'on' : ''} ${cls || ''}" style="--rc:${it.r ? RARITY[it.r] : ''}" data-a="${act}" data-v="${i}" title="${it.n}">${ih(s.id)}${s.n > 1 ? `<i>${s.n}</i>` : ''}${s.dur !== undefined ? `<div class="dur"><b style="width:${clamp(s.dur / it.dur, 0, 1) * 100}%"></b></div>` : ''}</button>`; }
function renderPanel() {
  $('tabs').innerHTML = TABS.concat(DEV.on ? [['dev', 'u_lock', 'Dev', 'F2']] : []).map(t => `<button class="${UI.tab === t[0] ? 'on' : ''}" data-a="tab" data-v="${t[0]}">${ih(t[1])} ${t[2]}<kbd>${t[3]}</kbd></button>`).join('') + `<button class="x" data-a="close">${ih('u_x')}</button>`;
  const B = $('pbody'), sc = B.scrollTop; let h = '';
  if (UI.tab === 'inv') {
    const w = invWeight(), cap = capacity(), slots = packSlots(), used = P.inv.length, fc = UI.invCat || 'all';
    const CATS = [['all', 'Tudo'], ['arma', 'Armas'], ['comida', 'Comida e cura'], ['mat', 'Materiais'], ['constr', 'Construção'], ['outros', 'Outros']];
    const catOf = it => ['melee', 'ranged', 'ammo', 'throw'].includes(it.t) ? 'arma' : it.t === 'food' || it.t === 'med' ? 'comida' : it.t === 'mat' ? 'mat' : it.t === 'place' ? 'constr' : 'outros';
    const eq = (slot, label) => { const id = P[slot]; return `<label>${label}${id ? `<button class="slot" style="--rc:${RARITY[ITEMS[id].r]}" data-a="uneq" data-v="${slot}" title="Clique para tirar: ${ITEMS[id].n}">${ih(id)}</button>` : `<span class="slot empty">vazio</span>`}</label>`; };
    let cells = ''; for (let i = 0; i < Math.max(slots, used); i++) { const s = P.inv[i]; cells += s ? slotHTML(s, i, UI.chest ? 'tochest' : 'sel', i === UI.sel, (fc !== 'all' && catOf(ITEMS[s.id]) !== fc ? 'dim ' : '') + (i >= slots ? 'over' : '')) : '<span class="slot empty"></span>'; }
    h = `<div class="invw"><div class="col"><div class="eq">${eq('armor', 'Armadura')}${eq('pack', 'Mochila')}
      <div class="wb ${w > cap ? 'over' : ''}"><b>${ih('u_weight')} Peso ${w.toFixed(1)} / ${cap} kg</b>${w > cap ? ' <span style="color:var(--bad)">sobrecarregado</span>' : ''}<div class="t"><div class="f" style="width:${clamp(w / cap, 0, 1) * 100}%"></div></div></div>
      <div class="wb ${used >= slots ? 'over' : ''}"><b>${ih('u_bag')} Espaços ${used} / ${slots}</b>${used >= slots ? ' <span style="color:var(--bad)">cheia</span>' : ''}<div class="t"><div class="f" style="width:${clamp(used / slots, 0, 1) * 100}%"></div></div></div></div>
      <div class="cats" style="margin:0">${CATS.map(c => `<button class="chip ${fc === c[0] ? 'on' : ''}" data-a="invcat" data-v="${c[0]}">${c[1]}</button>`).join('')}<button class="btn sec sm" style="margin-left:auto" data-a="sort">Organizar</button></div>
      <div class="grid">${cells}</div><span class="hint">Uma mochila melhor aumenta os espaços e o peso que você carrega. O que não cabe fica no chão.</span></div><div class="det">`;
    if (UI.chest) h += `<h3>${UI.chest === G.car ? 'Porta-malas' : 'Baú'}</h3><p class="hint">Clique num item para mover entre a mochila e ${UI.chest === G.car ? 'o porta-malas' : 'o baú'}.</p><div class="grid">${UI.chest.inv.map((s, i) => slotHTML(s, i, 'fromchest')).join('') || '<span class="hint">Vazio.</span>'}</div>`;
    else { const s = P.inv[UI.sel]; if (!s) h += `<p class="hint" style="margin:auto;text-align:center">Selecione um item para ver os detalhes.<br><br>Itens de mão vão para a barra de atalho (teclas 1 a 6).</p>`; else h += itemDetail(s); }
    h += `</div></div>`;
  } else if (UI.tab === 'craft') {
    let st = UI.station || ''; if (st && !nearStation(st)) st = UI.station = '';
    const near = STATIONS.filter(nearStation), q = (UI.rq || '').toLowerCase();
    const list = RECIPES.map((r, i) => [r, i, canCraft(r)]).filter(x => x[0].st === st && (!x[0].flag || G.flags[x[0].flag]) && (typeof recipeKnown !== 'function' || recipeKnown(x[0])) && (!q || ITEMS[x[0].out].n.toLowerCase().includes(q))).sort((a, b) => b[2].ok - a[2].ok);
    if (!list.some(x => x[1] === UI.rsel)) UI.rsel = list.length ? list[0][1] : -1;
    h = `<div class="craftw"><div class="col"><div class="sttabs">${[''].concat(STATIONS).map(s => { const ok = !s || near.includes(s); return `<button class="sttab ${s === st ? 'on' : ''}" ${ok ? '' : 'disabled'} data-a="station" data-v="${s}" title="${s ? ITEMS[s].n + (ok ? '' : ': chegue perto de uma para usar') : 'Feito à mão'}">${ih(s || 'u_hand')}</button>`; }).join('')}</div>
      <div class="sthead"><b>${st ? ITEMS[st].n : 'Feito à mão'}</b><span class="hint">${list.filter(x => x[2].ok).length} de ${list.length} prontas${typeof recipeStats === 'function' ? ' · ' + recipeStats() : ''}</span></div>
      <input id="rsearch" class="search" placeholder="Buscar receita..." value="${(UI.rq || '').replace(/"/g, '&quot;')}" autocomplete="off">
      <div class="rlist">${list.map(([r, i, c]) => { const it = ITEMS[r.out], miss = Object.keys(r.in).filter(k => invCount(k) < r.in[k]).length; return `<button class="rrow ${c.ok ? 'can' : ''} ${i === UI.rsel ? 'on' : ''}" data-a="rsel" data-v="${i}">${ih(r.out)}<span><b>${it.n}${r.n > 1 ? ' ×' + r.n : ''}</b><small>${c.ok ? 'Pronto para criar' : !c.eng ? 'Requer Engenharia ' + r.eng : miss ? `Falta${miss > 1 ? 'm' : ''} ${miss} ${miss > 1 ? 'materiais' : 'material'}` : 'Indisponível'}</small></span>${G.pins.includes(i) ? ih('u_star') : ''}</button>`; }).join('') || '<p class="hint" style="padding:10px">Nenhuma receita encontrada.</p>'}${typeof lockedRows === 'function' && !q ? lockedRows(st) : ''}</div></div><div class="det">`;
    const r = RECIPES[UI.rsel];
    if (!r) h += `<p class="hint" style="margin:auto;text-align:center">Escolha uma receita na lista.</p>`;
    else {
      const it = ITEMS[r.out], c = canCraft(r), mx = maxCraft(r), pin = G.pins.includes(UI.rsel); let stt = '';
      const add = (a, b) => stt += `<span>${a}</span><span>${b}</span>`;
      if (it.dmg) add('Dano', it.dmg + (it.pellets ? ' ×' + it.pellets : '')); if (it.def) add('Proteção', Math.round(it.def * 100) + '%'); if (it.cap) add('Capacidade', '+' + it.cap + ' kg'); if (it.slots) add('Espaços', '+' + it.slots);
      if (it.hunger) add('Fome', '+' + it.hunger); if (it.thirst) add('Sede', (it.thirst > 0 ? '+' : '') + it.thirst); if (it.hp) add('Vida', (it.hp > 0 ? '+' : '') + it.hp); if (it.sanity) add('Sanidade', (it.sanity > 0 ? '+' : '') + it.sanity); if (it.dur) add('Durabilidade', it.dur); add('Peso', it.w + ' kg'); add('Você tem', invCount(r.out));
      h += `<div class="chead"><img class="big" src="${iconURL(r.out)}" alt=""><div><h3 style="text-align:left">${it.n}${r.n > 1 ? ' ×' + r.n : ''}</h3><div class="ty" style="text-align:left;color:${RARITY[it.r]}">${TYPE_NAME[it.t]}</div><p>${it.d}</p></div></div><div class="stats">${stt}</div>
        <div class="tag" style="margin-top:6px">Materiais</div><div class="ingl">${Object.keys(r.in).map(k => { const have = invCount(k), need = r.in[k], ok = have >= need; return `<div class="ingrow ${ok ? 'ok' : 'no'}">${ih(k)}<span class="nm">${ITEMS[k].n}</span><div class="t"><div class="f" style="width:${clamp(have / need, 0, 1) * 100}%"></div></div><b>${have} / ${need}</b></div>`; }).join('')}</div>
        ${r.eng ? `<p class="hint" style="color:${c.eng ? 'var(--ok)' : 'var(--bad)'}">Requer a habilidade Engenharia no nível ${r.eng}.</p>` : ''}${c.st ? '' : `<p class="hint" style="color:var(--bad)">Chegue perto de uma ${ITEMS[r.st].n}.</p>`}
        <div class="row" style="margin-top:auto"><button class="btn" data-a="craft" data-v="1" ${c.ok ? '' : 'disabled'}>Criar</button>${mx > 1 ? `<button class="btn sec" data-a="craft" data-v="5">Criar ×${Math.min(5, mx)}</button>` : ''}${mx > 5 ? `<button class="btn sec" data-a="craft" data-v="99">Criar tudo (${mx})</button>` : ''}<button class="btn sec" style="margin-left:auto" data-a="pin">${ih('u_star')} ${pin ? 'Desafixar' : 'Fixar'}</button></div>
        <p class="hint">Receitas fixadas ficam na tela com a contagem de materiais, para você saber o que procurar. Máximo de 3.</p>`;
    }
    h += `</div></div>`;
  } else if (UI.tab === 'skills') {
    h = `<div class="skh"><span class="lvl" style="font-size:17px;padding:3px 12px 1px">Nível ${P.lvl}</span><div class="xpbar" style="height:9px"><i style="width:${P.xp / xpNeed(P.lvl) * 100}%"></i></div><span class="hint">${Math.floor(P.xp)} / ${xpNeed(P.lvl)} XP</span><span class="pts">Pontos: <b>${P.sp}</b></span></div><div class="sktree">`;
    for (const br of SKILLS) { const spent = br.s.reduce((a, s) => a + sk(s.id), 0); h += `<div class="br" style="--bc:${br.c}"><h4>${br.n}</h4><small>${spent} investidos</small>`; br.s.forEach((s, row) => { const r = sk(s.id), lock = spent < row * 2, can = !lock && r < SKILL_MAX && P.sp > 0; if (row) h += `<div class="link ${!lock ? 'f' : ''}"></div>`; h += `<button class="node ${r ? 'has' : ''} ${r >= SKILL_MAX ? 'max' : ''} ${lock ? 'lock' : ''} ${can ? 'can' : ''}" data-a="skill" data-v="${s.id}" data-h="${s.id}" title="${s.d(Math.min(SKILL_MAX, r + 1))}"><div class="o">${ih(lock ? 'u_lock' : s.ic)}</div><span>${s.n}</span><div class="pips">${[0, 1, 2].map(i => `<i class="${i < r ? 'f' : ''}"></i>`).join('')}</div></button>`; }); h += `</div>`; }
    h += `</div><div id="skinfo"><span class="hint">Passe o mouse sobre uma habilidade para ver o que cada um dos três níveis faz. Clique para investir um ponto. Cada linha de um ramo exige 2 pontos a mais investidos nele. Você ganha pontos ao subir de nível.</span></div>`;
  } else if (UI.tab === 'journal') {
    const qh = (q, done) => { const Q = QUESTS[q.id || q]; return `<div class="q ${Q.main ? 'main' : ''}"><span class="tag">${Q.main ? 'História' : 'Secundária'}${done ? ' · concluída' : ''}</span><br><b>${Q.title}</b>${done ? '' : `<p>${Q.desc}</p>` + Q.obj.map((o, i) => `<div class="o ${q.prog[i] >= o.n ? 'd' : ''}">${ih(q.prog[i] >= o.n ? 'u_check' : 'u_dot')} ${o.txt}${o.n > 1 ? ` (${q.prog[i]}/${o.n})` : ''}</div>`).join('')}</div>`; };
    h = `<div class="jr"><div><h3>Missões ativas</h3>${G.quests.map(q => qh(q)).join('') || '<p class="hint">Nenhuma missão ativa.</p>'}<h3 style="margin-top:14px">Concluídas</h3>${Object.keys(G.qdone).map(k => qh(k, 1)).join('') || '<p class="hint">Nada ainda.</p>'}</div>
      <div><h3>Sobrevivente</h3><div class="q"><div class="o"><img class="ic" src="${playerPortrait()}" alt=""> ${P.name || 'Sobrevivente'}${P.origin && ORIGINS[P.origin] ? ' · ' + ORIGINS[P.origin].n : ''}</div><div class="o">${ih('u_clock')} Dia ${dayNum()} no vale · dificuldade ${DF().n}</div><div class="o">${ih('u_skull')} ${G.kills} criaturas eliminadas</div><div class="o">${ih('u_fis_x')} ${Object.keys(G.sealed).length} / ${FISSURES.length} fendas seladas</div><div class="o">${ih('u_map')} ${Object.values(G.pois).filter(v => v === 2).length} / ${Object.keys(POIS).length} locais descobertos</div></div>
      <h3 style="margin-top:14px">Papéis encontrados (${G.notes.length}/${NOTES.length})</h3>${G.notes.slice().sort((a, b) => a - b).map(n => `<div class="q note" data-a="note" data-v="${n}"><b>${NOTES[n][0]}</b><p>${NOTES[n][1]}</p></div>`).join('') || '<p class="hint">Vasculhe armários e caixas pelo vale.</p>'}
      <h3 style="margin-top:14px">Lembrete</h3><p class="hint">${TIPS[dayNum() % TIPS.length]}</p></div></div>`;
  } else if (UI.tab === 'arquivo') {
    const sub2 = UI.arq || 'org', SUBS = [['org', 'Organismos', Object.keys(G.seen).length + '/' + Object.keys(ENEMIES).length], ['fitas', 'Fitas', G.tapes.length + '/' + TAPES.length], ['locais', 'Locais', Object.values(G.pois).filter(v => v === 2).length + '/' + Object.keys(POIS).length], ['papeis', 'Papéis', G.notes.length + '/' + NOTES.length]];
    h = `<div class="cats">${SUBS.map(s => `<button class="chip ${sub2 === s[0] ? 'on' : ''}" data-a="arq" data-v="${s[0]}">${s[1]} <span style="opacity:.7">${s[2]}</span></button>`).join('')}<span class="hint" style="margin-left:auto">Arquivo da Defesa Civil de Serra Sangrenta</span></div>`;
    if (sub2 === 'org') {
      const ks = Object.keys(ENEMIES); if (!UI.org || !G.seen[UI.org]) UI.org = ks.find(k => G.seen[k]) || null;
      h += `<div class="craftw" style="height:calc(100% - 42px)"><div class="rlist">${ks.map((k, i) => G.seen[k] ? `<button class="rrow can ${k === UI.org ? 'on' : ''}" data-a="org" data-v="${k}"><img src="${enemyPortrait(k)}" alt="" style="width:40px;height:40px;background:#0a120f;border-radius:3px"><span><b>${ENEMIES[k].n}</b><small style="color:var(--muted)">Ficha ${String(i + 1).padStart(2, '0')} · ${G.killsBy[k] || 0} eliminado${(G.killsBy[k] || 0) === 1 ? '' : 's'}</small></span></button>` : `<div class="rrow" style="opacity:.45">${ih('u_lock')}<span><b>Sem registro</b><small>Ficha ${String(i + 1).padStart(2, '0')} · nenhum avistamento</small></span></div>`).join('')}</div>`;
      const k = UI.org;
      if (!k) h += `<div class="crtbox" style="display:flex;align-items:center;justify-content:center">NENHUM ORGANISMO REGISTRADO\n\nAs fichas são preenchidas quando você chega perto de cada criatura.</div>`;
      else { const def = ENEMIES[k], B = (lab, v, mx, col) => `<div class="ingrow"><span></span><span class="nm">${lab}</span><div class="t"><div class="f" style="width:${clamp(v / mx, .04, 1) * 100}%;background:${col}"></div></div><b style="color:#d8e8dc">${v}</b></div>`;
        h += `<div class="crtbox" style="overflow:auto;white-space:normal"><div class="chead"><img src="${enemyPortrait(k)}" alt="" style="width:180px;height:180px;flex:none;border:1px solid #2e4a3e;border-radius:4px;background:radial-gradient(circle,#16241e,#070c0a)"><div style="flex:1"><small>Defesa Civil · ficha de campo ${String(Object.keys(ENEMIES).indexOf(k) + 1).padStart(2, '0')}</small><h5 style="font-size:22px">${def.n}</h5><p style="margin:0 0 10px;white-space:pre-wrap">${BESTIARY[k]}</p></div></div>
          <div class="ingl" style="margin-top:12px;font-family:var(--body);text-shadow:none">${B('Resistência', def.hp, 700, '#6fae72')}${B('Dano', def.dmg, 45, '#c8484e')}${B('Velocidade', def.spd, 220, '#c8a04e')}</div>
          <small style="margin-top:12px">Anotação de sobrevivente</small><p style="margin:0 0 10px;font-family:var(--body);color:#d8e8dc;text-shadow:none">${WEAK[k]}</p>
          <small>Material recolhido</small><div class="ings" style="font-family:var(--body);text-shadow:none">${[...new Set(def.drops.map(d => d[0]))].map(id => `<span class="ing" style="color:#d8e8dc">${ih(id)} ${ITEMS[id].n}</span>`).join('')}</div>
          <small style="margin-top:12px">Seu registro</small><p style="margin:0;font-family:var(--body);color:#d8e8dc;text-shadow:none">${G.killsBy[k] || 0} eliminado${(G.killsBy[k] || 0) === 1 ? '' : 's'} por você.</p></div>`; }
      h += `</div>`;
    } else if (sub2 === 'fitas') h += `<div class="arq">${TAPES.map((t, i) => G.tapes.includes(i) ? `<div class="crtbox"><small>Fita ${i + 1} · gravação recuperada</small><h5>${ih('u_tv')} ${t[0]}</h5>${t[1]}</div>` : `<div class="crtbox lock"><small>Fita ${i + 1}</small>SEM SINAL\nProcure televisores nos prédios do vale.</div>`).join('')}</div>`;
    else if (sub2 === 'locais') h += `<div class="arq">${Object.keys(POIS).map(k => G.pois[k] === 2 ? `<div class="q" style="margin:0"><b>${ih(POIS[k].ic)} ${POIS[k].n}</b><p style="margin:4px 0 0">${PDESC[k] || ''}</p></div>` : `<div class="q" style="margin:0;opacity:.5"><b>${ih('u_lock')} ${G.pois[k] === 1 ? POIS[k].n : 'Local desconhecido'}</b><p style="margin:4px 0 0">${G.pois[k] === 1 ? 'Indicado no mapa. Ainda não visitado.' : 'Explore o vale para descobrir.'}</p></div>`).join('')}</div>`;
    else h += `<div class="arq">${NOTES.map((n, i) => G.notes.includes(i) ? `<div class="q note" style="margin:0" data-a="note" data-v="${i}"><b>${ih('u_book')} ${n[0]}</b><p style="margin:4px 0 0">${n[1]}</p></div>` : `<div class="q" style="margin:0;opacity:.5"><b>${ih('u_lock')} Papel não encontrado</b><p style="margin:4px 0 0">Vasculhe armários e caixas pelo vale.</p></div>`).join('')}</div>`;
  } else if (UI.tab === 'dev') { h = devHTML();
  } else if (UI.tab === 'map') {
    h = `<div class="mapw"><canvas id="bigmap" width="800" height="640"></canvas><div class="legend"><span><i style="background:#c8485e"></i>Fenda aberta</span><span><i style="background:#8a8890"></i>Fenda selada</span><span><i style="background:#e8e0d0;border-radius:2px"></i>Caminhonete</span><span>${ih('cama')} Sua cama</span>${Object.keys(POIS).filter(k => G.pois[k]).map(k => `<span>${ih(POIS[k].ic)} ${POIS[k].n}${G.pois[k] === 1 ? ' <span class="hint">(indicado)</span>' : ''}</span>`).join('')}</div></div>`;
  }
  B.innerHTML = h; B.scrollTop = sc; if (UI.tab === 'map') drawBigMap();
}
function itemDetail(s) {
  const it = ITEMS[s.id]; let st = '';
  const add = (a, b) => st += `<span>${a}</span><span>${b}</span>`;
  if (it.dmg) add('Dano', it.dmg + (it.pellets ? ' ×' + it.pellets : '')); if (it.t === 'melee') { add('Alcance', it.range); add('Velocidade', (1 / it.cd).toFixed(1) + '/s'); } if (it.chop >= 1) add('Corte de árvore', '×' + it.chop); if (it.mine) add('Mineração', '×' + it.mine);
  if (it.mag) add('Pente', it.mag); if (it.ammo) add('Munição', ITEMS[it.ammo].n); if (it.kind === 'gun') add('Barulho', it.noise ? (it.noise > 650 ? 'Alto' : 'Médio') : 'Silencioso');
  if (it.hunger) add('Fome', '+' + it.hunger); if (it.thirst) add('Sede', (it.thirst > 0 ? '+' : '') + it.thirst); if (it.sleep) add('Sono', '+' + it.sleep); if (it.hp) add('Vida', (it.hp > 0 ? '+' : '') + it.hp); if (it.regen) add('Regeneração', '+' + it.regen); if (it.sanity) add('Sanidade', (it.sanity > 0 ? '+' : '') + it.sanity);
  if (it.def) add('Proteção', Math.round(it.def * 100) + '%'); if (it.cap) add('Capacidade', '+' + it.cap + ' kg'); if (it.slots) add('Espaços', '+' + it.slots);
  if (s.dur !== undefined) add('Durabilidade', Math.ceil(s.dur / it.dur * 100) + '%'); add('Peso', (it.w * s.n).toFixed(2) + ' kg' + (s.n > 1 ? ` (${it.w} cada)` : ''));
  const hot = ['melee', 'ranged', 'throw', 'place'].includes(it.t), act = it.t === 'food' ? (it.hunger ? 'Comer' : 'Beber') : it.use === 'read' ? 'Ler' : it.t === 'med' || it.use ? 'Usar' : it.t === 'armor' || it.t === 'pack' ? 'Equipar' : hot ? 'Pôr na mão' : '';
  return `<img class="big" src="${iconURL(s.id)}" alt=""><h3>${it.n}${s.n > 1 ? ' ×' + s.n : ''}</h3><div class="ty" style="color:${RARITY[it.r]}">${TYPE_NAME[it.t]}</div><p>${it.d}</p><div class="stats">${st}</div>
    <div class="row" style="margin-top:auto">${act ? `<button class="btn" data-a="use">${act}</button>` : ''}<button class="btn sec" data-a="drop" data-v="1">Largar</button>${s.n > 1 ? `<button class="btn sec" data-a="drop" data-v="all">Largar tudo</button>` : ''}</div>
    ${hot ? `<div class="row"><span class="hint">Atalho:</span>${[0, 1, 2, 3, 4, 5].map(i => `<button class="btn sec sm" data-a="hot" data-v="${i}" ${P.hot[i] === s.id ? 'style="background:var(--gold);color:var(--gold-ink)"' : ''}>${i + 1}</button>`).join('')}</div>` : ''}`;
}
function canCraft(r) { if (DEV.craft) return { st: true, eng: true, ok: true }; const st = nearStation(r.st), eng = !r.eng || sk('engenharia') >= r.eng; let mats = true; for (const k in r.in) if (invCount(k) < r.in[k]) mats = false; return { st, eng, ok: st && eng && mats }; }
function maxCraft(r) { if (DEV.craft) return 99; const c = canCraft(r); if (!c.st || !c.eng) return 0; let m = 99; for (const k in r.in) m = Math.min(m, Math.floor(invCount(k) / r.in[k])); return m; }
function craft(i, times) {
  const r = RECIPES[i]; let done = 0;
  for (let t = 0; t < (times || 1); t++) { if (!r || !canCraft(r).ok) break; if (Math.random() < .1 * sk('poupador')) toast('Você poupou os materiais!', 'u_coin'); else if (!DEV.craft) for (const k in r.in) invRemove(k, r.in[k]); give(r.out, r.n); qev('craft:' + r.out); addXP(3 + (r.st ? 2 : 0)); done++; }
  if (done) { sfx('craft'); const p = G.pins.indexOf(i), t = ITEMS[r.out].t; if (p >= 0 && t !== 'ammo' && t !== 'food' && t !== 'mat') G.pins.splice(p, 1); }
}
function drawBigMap() {
  const cvm = $('bigmap'); if (!cvm) return; const c = cvm.getContext('2d'), s = 800 / MW, fs = 800 / FW; c.imageSmoothingEnabled = false; c.drawImage(W.mini, 0, 0, 800, 640);
  c.fillStyle = 'rgba(20,24,36,.25)'; c.fillRect(0, 0, 800, 640);
  c.fillStyle = '#0a080c'; for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (!G.fog[y * FW + x]) c.fillRect(x * fs, y * fs, fs + .5, fs + .5);
  c.imageSmoothingEnabled = true; c.textAlign = 'center'; c.textBaseline = 'middle';
  const showF = G.qdone.q_iris || G.quests.some(q => q.id === 'q_fendas');
  for (const f of W.fissures) { if (!showF && !G.fog[Math.floor(f.y / FOGC) * FW + Math.floor(f.x / FOGC)]) continue; c.fillStyle = f.sealed ? '#8a8890' : '#c8485e'; c.strokeStyle = '#141018'; c.lineWidth = 2; c.beginPath(); c.arc(f.x / TILE * s, f.y / TILE * s, 6, 0, 6.3); c.fill(); c.stroke(); }
  if (P.bed) c.drawImage(IC('cama'), P.bed.x / TILE * s - 9, P.bed.y / TILE * s - 9, 18, 18);
  if (G.car) { c.fillStyle = '#e8e0d0'; c.strokeStyle = '#141018'; c.lineWidth = 2; c.fillRect(G.car.x / TILE * s - 5, G.car.y / TILE * s - 4, 10, 8); c.strokeRect(G.car.x / TILE * s - 5, G.car.y / TILE * s - 4, 10, 8); }
  for (const k in POIS) if (G.pois[k]) { const p = POIS[k]; c.drawImage(IC(p.ic), p.x * s - 11, p.y * s - 11, 22, 22); c.font = '600 11px Barlow,sans-serif'; c.lineWidth = 3; c.strokeStyle = '#0a080c'; c.strokeText(p.n, p.x * s, p.y * s + 18); c.fillStyle = G.pois[k] === 2 ? '#e8e0d0' : '#d9b36c'; c.fillText(p.n, p.x * s, p.y * s + 18); }
  c.save(); c.translate(P.x / TILE * s, P.y / TILE * s); c.rotate(P.ang); c.fillStyle = '#e8e0d0'; c.strokeStyle = '#b83a44'; c.lineWidth = 3; c.beginPath(); c.moveTo(11, 0); c.lineTo(-7, -7); c.lineTo(-3, 0); c.lineTo(-7, 7); c.closePath(); c.stroke(); c.fill(); c.restore();
}
function panelAct(a, v) {
  if (a.startsWith('dev')) { devAct(a, v); if (G.state === 'play') saveGame(); if (UI.tab) renderPanel(); return; }
  const s = P.inv[UI.sel];
  switch (a) {
    case 'tab': if (v !== 'inv') UI.chest = null; if (v === 'craft' && UI.tab !== 'craft') UI.station = ''; UI.tab = v; break; case 'close': closePanel(); return;
    case 'sel': UI.sel = +v === UI.sel ? -1 : +v; break;
    case 'use': if (s) { useItem(s.id); if (!P.inv[UI.sel] || P.inv[UI.sel].id !== s.id) UI.sel = P.inv.findIndex(x => x.id === s.id); } break;
    case 'hot': if (s) setHot(+v, s.id); break;
    case 'drop': if (s) { const n = v === 'all' ? s.n : 1; G.items.push({ id: s.id, n, x: P.x + Math.cos(P.ang) * 30, y: P.y + Math.sin(P.ang) * 30, vx: 0, vy: 0, t: 0, dur: s.dur, nopick: 2.5 }); s.n -= n; if (s.n <= 0) { P.inv.splice(UI.sel, 1); UI.sel = -1; } } break;
    case 'uneq': unequip(v); break;
    case 'sort': { const ord = Object.keys(ITEMS); P.inv.sort((a, b) => ord.indexOf(a.id) - ord.indexOf(b.id)); UI.sel = -1; break; }
    case 'tochest': { const x = P.inv[+v]; if (x) { P.inv.splice(+v, 1); const it = ITEMS[x.id]; const ex = !it.dur && UI.chest.inv.find(c => c.id === x.id); if (ex) ex.n += x.n; else UI.chest.inv.push(x); sfx('equip'); } break; }
    case 'fromchest': { const x = UI.chest.inv[+v]; if (x && !canTake(x.id, x.n)) toast('Mochila cheia.', 'u_bag'); else if (x) { UI.chest.inv.splice(+v, 1); invAdd(x.id, x.n, x.dur); sfx('equip'); } break; }
    case 'invcat': UI.invCat = v; break; case 'arq': UI.arq = v; break; case 'org': UI.org = v; break; case 'station': UI.station = v; UI.rq = ''; break; case 'rsel': UI.rsel = +v; break; case 'craft': craft(UI.rsel, +v); break;
    case 'pin': { const p = G.pins.indexOf(UI.rsel); if (p >= 0) G.pins.splice(p, 1); else if (G.pins.length >= 3) toast('No máximo 3 receitas fixadas.', 'u_star'); else if (UI.rsel >= 0) G.pins.push(UI.rsel); break; }
    case 'skill': { let br, row; for (const b of SKILLS) b.s.forEach((x, i) => { if (x.id === v) { br = b; row = i; } }); const spent = br.s.reduce((a, x) => a + sk(x.id), 0); if (P.sp > 0 && sk(v) < SKILL_MAX && spent >= row * 2) { P.skills[v] = sk(v) + 1; P.sp--; sfx('level'); P.hp = Math.min(P.hp, maxHp()); } else sfx('click'); break; }
    case 'note': showDialog([['nar', `${NOTES[v][0]}\n\n“${NOTES[v][1]}”`]]); break;
  }
  G.uiDirty = true; if (UI.tab) renderPanel(); if (a === 'skill') skillInfo(v);
}
function skillInfo(id) {
  let s, br, row; for (const b of SKILLS) b.s.forEach((x, i) => { if (x.id === id) { s = x; br = b; row = i; } }); const r = sk(id), el = $('skinfo'); if (!el || !s) return;
  const spent = br.s.reduce((a, x) => a + sk(x.id), 0), lock = spent < row * 2;
  el.innerHTML = `<div class="skt"><b style="color:${br.c}">${ih(s.ic)} ${s.n}</b><span class="hint">${br.n} · nível ${r}/${SKILL_MAX}${lock ? ` · bloqueada: invista mais ${row * 2 - spent} ponto${row * 2 - spent > 1 ? 's' : ''} em ${br.n}` : r < SKILL_MAX ? (P.sp > 0 ? ' · clique para melhorar' : ' · sem pontos disponíveis') : ' · nível máximo'}</span></div>
    <div class="sklv">${[1, 2, 3].map(n => `<div class="${n <= r ? 'got' : n === r + 1 ? 'next' : ''}"><small>Nível ${n}${n <= r ? ' · adquirido' : n === r + 1 ? ' · próximo' : ''}</small>${s.d(n)}</div>`).join('')}</div>`;
}


/* ===================== MODO DESENVOLVEDOR (protegido por senha) ===================== */
function h32(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const DEV_KEY = '1649573390-3288171008';
function devTry(pw) { if (h32(pw) + '-' + h32(pw.split('').reverse().join('') + pw.length) === DEV_KEY) { DEV.on = true; if (G.state === 'play') saveGame(); else DEV.fresh = true; closeOverlay(); toast('Modo desenvolvedor liberado (F2)', 'u_lock', true); sfx('level'); openPanel('dev'); } else { const e = $('dev-err'); if (e) e.textContent = 'Senha incorreta.'; sfx('click'); } }
function showDevLogin() { overlay(`<h2>Modo desenvolvedor</h2><p>Digite a senha para liberar o painel.</p><input id="dev-pw" class="search" type="password" placeholder="Senha" autocomplete="off" style="width:260px"><span id="dev-err" class="hint" style="color:var(--bad);min-height:16px"></span><div class="row"><button class="btn" data-a="devok">Entrar</button><button class="btn sec" data-a="resume">Cancelar</button></div>`); setTimeout(() => { const i = $('dev-pw'); if (i) i.focus(); }, 30); }
const DEV_T = [['god', 'Invulnerável'], ['needs', 'Sem fome, sede, sono e medo'], ['pack', 'Mochila sem limite'], ['craft', 'Criar sem materiais nem bancada']];
function devHTML() {
  const fc = UI.devCat || 'all', TY = [['all', 'Tudo'], ['mat', 'Materiais'], ['food', 'Comida'], ['med', 'Cura'], ['melee', 'Armas brancas'], ['ranged', 'Armas de fogo'], ['ammo', 'Munição'], ['throw', 'Arremesso'], ['armor', 'Armaduras'], ['pack', 'Mochilas'], ['place', 'Construções'], ['util', 'Utilidade'], ['quest', 'Missão']];
  return `<div class="cats">${DEV_T.map(t => `<button class="chip ${DEV[t[0]] ? 'on' : ''}" data-a="devt" data-v="${t[0]}">${t[1]}: ${DEV[t[0]] ? 'ligado' : 'desligado'}</button>`).join('')}</div>
    <div class="cats">${[['lvl', '+5 níveis'], ['sp', '+10 pontos de habilidade'], ['heal', 'Curar tudo'], ['time', 'Avançar 6 horas'], ['map', 'Revelar o mapa'], ['car', 'Caminhonete pronta'], ['kill', 'Eliminar criaturas'], ['quest', 'Concluir missão principal'], ['all', 'Dar um de cada item'], ['unlock', 'Liberar Modo Aventura']].map(a => `<button class="btn sec sm" data-a="deva" data-v="${a[0]}">${a[1]}</button>`).join('')}<button class="btn red sm" style="margin-left:auto" data-a="deva" data-v="off">Desativar modo desenvolvedor</button></div>
    <div class="cats"><span class="hint">Teleporte:</span>${Object.keys(POIS).map(k => `<button class="chip" data-a="devtp" data-v="${k}">${ih(POIS[k].ic)} ${POIS[k].n}</button>`).join('')}</div>
    <div class="cats"><span class="hint">Itens (clique dá uma pilha):</span>${TY.map(t => `<button class="chip ${fc === t[0] ? 'on' : ''}" data-a="devcat" data-v="${t[0]}">${t[1]}</button>`).join('')}</div>
    <div class="grid" style="flex:none;overflow:visible">${Object.keys(ITEMS).filter(k => fc === 'all' || ITEMS[k].t === fc).map(k => `<button class="slot" style="--rc:${ITEMS[k].r ? RARITY[ITEMS[k].r] : ''}" data-a="devg" data-v="${k}" title="${ITEMS[k].n}">${ih(k)}</button>`).join('')}</div>`;
}
function devAct(a, v) {
  if (!DEV.on) return;
  if (a === 'devt') { DEV[v] = !DEV[v]; }
  else if (a === 'devcat') UI.devCat = v;
  else if (a === 'devg') { const it = ITEMS[v]; give(v, it.dur ? 1 : Math.min(it.stack, it.t === 'ammo' ? it.stack : 10)); }
  else if (a === 'devtp') { const p = POIS[v]; let x = (p.x + .5) * TILE, y = (p.y + .5) * TILE; for (let r = 0; r < 14 && (boxSolid(x, y, 14) || !freeSpot(x, y)); r++) for (let k = 0; k < 16; k++) { const nx = (p.x + .5) * TILE + Math.cos(k / 16 * 6.28) * r * 30, ny = (p.y + .5) * TILE + Math.sin(k / 16 * 6.28) * r * 30; if (freeSpot(nx, ny)) { x = nx; y = ny; r = 99; break; } } P.driving = false; P.x = x; P.y = y; cam.x = x - VW / 2; cam.y = y - VH / 2; closePanel(); return; }
  else if (a === 'deva') {
    if (v === 'lvl') { for (let i = 0; i < 5; i++) addXP(xpNeed(P.lvl) - P.xp); }
    else if (v === 'sp') P.sp += 10;
    else if (v === 'heal') { P.hp = maxHp(); P.hunger = P.thirst = P.sleep = P.sanity = 100; P.stam = maxSt(); }
    else if (v === 'time') G.time += 6;
    else if (v === 'map') { G.fog.fill(1); for (const k in POIS) G.pois[k] = 2; }
    else if (v === 'car') { const c = G.car; c.fixed = true; c.fuel = 100; c.hp = 100; c.spd = 0; if (dist(c.x, c.y, P.x, P.y) > 300) { c.x = P.x + 60; c.y = P.y; } }
    else if (v === 'kill') { for (const e of [...G.enemies]) if (!e.dead) killEnemy(e); }
    else if (v === 'quest') { const q = G.quests.find(q => QUESTS[q.id].main); if (q) { closePanel(); q.prog = QUESTS[q.id].obj.map(o => o.n); completeQuest(q); return; } }
    else if (v === 'off') { DEV.on = DEV.god = DEV.needs = DEV.pack = DEV.craft = false; closePanel(); toast('Modo desenvolvedor desativado', 'u_lock', true); G.uiDirty = true; return; }
    else if (v === 'unlock') { unlock('aventura'); toast('Modo Aventura liberado', 'u_star', true); }
    else if (v === 'all') { DEV.pack = true; for (const k in ITEMS) invAdd(k, 1); }
  }
  G.uiDirty = true;
}

/* ===================== TELAS ===================== */
const HELP = `<div class="help"><kbd>W A S D</kbd><span>Andar. Na caminhonete: acelerar, frear e virar</span><kbd>Mouse</kbd><span>Mirar. Clique esquerdo ataca, usa ou constrói</span><kbd>Botão direito</kbd><span>Arremessar a lança</span><kbd>Shift</kbd><span>Correr</span><kbd>Espaço</kbd><span>Rolar (invulnerável por um instante). No carro: freio de mão</span><kbd>E</kbd><span>Interagir, vasculhar, dormir, entrar e sair do carro</span><kbd>R</kbd><span>Recarregar. No carro: abastecer</span><kbd>1 a 6 / Roda</kbd><span>Trocar item da mão</span><kbd>Q</kbd><span>Cura rápida</span><kbd>X</kbd><span>Desmontar construção. No carro: consertar com sucata</span><kbd>V</kbd><span>Modo de construção da base: piso, paredes e portas</span><kbd>+ e -</kbd><span>Aproximar e afastar a câmera</span><kbd>Tab C K J B M</kbd><span>Mochila, Criação, Habilidades, Diário, Arquivo, Mapa</span></div>`;
function showTitle() {
  G.state = 'title'; $('hud').hidden = true; $('over').hidden = true; UI.over = null; closePanel();
  const any = hasSave();
  $('title').hidden = false; $('title').innerHTML = `<h1>SERRA <em>SANGRENTA</em></h1><div class="sub">Não responda se chamarem seu nome.</div><div class="menu">${any ? '<button class="btn" data-a="slots" data-v="load">Continuar</button>' : ''}<button class="btn ${any ? 'sec' : ''}" data-a="slots" data-v="new">Novo Jogo</button><button class="btn sec" data-a="help">Como Jogar</button></div><div class="foot">Versão ${typeof VERSION !== 'undefined' ? VERSION + ' · Ecos do Vale' : '1'} · Jogo para teclado e mouse · O progresso é salvo neste navegador${unlocked('aventura') ? ' · Modo Aventura liberado' : ''}</div>`;
}
const PORTRAITS_P = {};
function playerPortrait(lk) {
  const L = plook(lk), key = JSON.stringify(L); if (PORTRAITS_P[key]) return PORTRAITS_P[key];
  const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'); x.fillStyle = '#231f2a'; x.fillRect(0, 0, 96, 96);
  const t = document.createElement('canvas'); t.width = t.height = 96; drawPreview(t, L, Math.PI / 2, 2.9, 80); x.drawImage(t, 0, 0);
  return PORTRAITS_P[key] = c.toDataURL();
}
function slotCard(n, mode) {
  const s = readSlot(n), confirm = UI.confirm && UI.confirm[1] === n ? UI.confirm[0] : '';
  if (confirm) return `<div class="slotc ask"><b>${confirm === 'del' ? 'Apagar este mundo?' : 'Substituir este mundo?'}</b><span class="hint">${s ? s.name + ' · Dia ' + s.day : ''} será perdido para sempre.</span><div class="row"><button class="btn red sm" data-a="${confirm === 'del' ? 'delslot_ok' : 'pickslot_ok'}" data-v="${n}">${confirm === 'del' ? 'Apagar' : 'Substituir'}</button><button class="btn sec sm" data-a="slotcancel">Cancelar</button></div></div>`;
  if (!s) return `<button class="slotc empty" data-a="pickslot" data-v="${n}" ${mode === 'load' ? 'disabled' : ''}><b>Espaço ${n}</b><span class="hint">${mode === 'load' ? 'Vazio' : 'Começar um mundo novo aqui'}</span></button>`;
  const when = s.at ? new Date(s.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  return `<div class="slotc"><button class="slotmain" data-a="pickslot" data-v="${n}"><img src="${playerPortrait(s.look)}" alt=""><span><small>Espaço ${n}</small><b>${s.name}</b><em>${s.obj}</em><span class="hint">Dia ${s.day} · Nv ${s.lvl} · ${(DIFFS[s.diff] || DIFFS.normal).n}${when ? ' · ' + when : ''}</span></span></button><button class="btn sec sm" data-a="delslot" data-v="${n}" title="Apagar este mundo">${ih('u_x')}</button></div>`;
}
function showSlots(mode) { UI.slotMode = mode; $('title').innerHTML = `<div class="modal card wide"><h2>${mode === 'load' ? 'Continuar' : 'Novo jogo'}</h2><p>${mode === 'load' ? 'Escolha o mundo que quer continuar.' : 'Escolha onde guardar o novo mundo.'}</p><div class="slots">${[1, 2, 3].map(n => slotCard(n, mode)).join('')}</div><button class="btn sec" data-a="back">Voltar</button></div>`; }
function showDiff() {
  const adv = unlocked('aventura');
  $('title').innerHTML = `<div class="modal card wide"><h2>Dificuldade</h2><div class="diffs">${[['facil', 'cha'], ['normal', 'tocha'], ['dificil', 'u_skull']].map(([k, ic]) => `<button class="diff" data-a="diff" data-v="${k}">${ih(ic)}<b>${DIFFS[k].n}</b><span>${DIFFS[k].d}</span></button>`).join('')}</div>
    <button class="diff advc ${adv ? '' : 'locked'}" data-a="diff" data-v="aventura" ${adv ? '' : 'disabled'}>${ih(adv ? 'u_star' : 'u_lock')}<b>Modo Aventura</b><span>${adv ? DIFFS.aventura.d : 'Termine a história de Serra Sangrenta para liberar um modo livre, só para se divertir.'}</span></button>
    <button class="btn sec" data-a="slots" data-v="new">Voltar</button></div>`;
}
function randLook() { const p = a => a[randi(0, a.length - 1)]; return { skin: p(LOOK.skin), hair: p(LOOK.hair), style: p(LOOK.style)[0], shirt: p(LOOK.shirt), pants: p(LOOK.pants) }; }
function showCreate() {
  if (!UI.cc) UI.cc = { name: NAMES[randi(0, NAMES.length - 1)], look: randLook(), origin: 'lenhador' };
  const c = UI.cc, sw = (k, list) => `<div class="sws">${list.map(v => `<button class="sw ${c.look[k] === v ? 'on' : ''}" style="background:${v}" data-a="cc" data-v="${k}|${v}" aria-label="${v}"></button>`).join('')}</div>`;
  $('title').innerHTML = `<div class="modal card wide cc"><h2>Seu sobrevivente</h2><div class="ccg">
    <div class="ccp"><canvas id="cc-prev" width="200" height="250"></canvas><button class="btn sec sm" data-a="ccrand">Sortear aparência</button></div>
    <div class="ccf">
      <label class="ccl">Nome<div class="row"><input id="cc-name" class="search" maxlength="16" value="${c.name.replace(/"/g, '&quot;')}" autocomplete="off" spellcheck="false"><button class="btn sec sm" data-a="ccname">Sortear</button></div></label>
      <label class="ccl">Pele${sw('skin', LOOK.skin)}</label>
      <label class="ccl">Cabelo<div class="cats" style="margin:0">${LOOK.style.map(([k, n]) => `<button class="chip ${c.look.style === k ? 'on' : ''}" data-a="cc" data-v="style|${k}">${n}</button>`).join('')}</div>${sw('hair', LOOK.hair)}</label>
      <label class="ccl">Camisa${sw('shirt', LOOK.shirt)}</label>
      <label class="ccl">Calça${sw('pants', LOOK.pants)}</label>
      <label class="ccl">Origem<div class="origs">${Object.keys(ORIGINS).map(k => `<button class="orig ${c.origin === k ? 'on' : ''}" data-a="ccorig" data-v="${k}">${ih(ORIGINS[k].ic)}<span><b>${ORIGINS[k].n}</b><small>${ORIGINS[k].d}</small></span></button>`).join('')}</div></label>
    </div></div>
    <div class="row"><button class="btn sec" data-a="ccback">Voltar</button><button class="btn" data-a="ccstart">Começar em ${(DIFFS[UI.newDiff] || DIFFS.normal).n}</button></div></div>`;
}
function setupAdventure() {
  Object.assign(G.flags, { aventura: 1, receita_carga: 1, receita_antidoto: 1, energia: 1, radio: 1 });
  Object.assign(G.car, { fixed: true, fuel: 100, hp: 100 });
  G.fog.fill(1); for (const k in POIS) if (G.pois[k] !== 2) G.pois[k] = 1;
  P.sp += 5; P.pack = 'mochila_g'; P.armor = 'colete_couro';
  for (const [k, n] of [['machete', 1], ['espingarda', 1], ['cartucho', 24], ['pistola', 1], ['municao9', 40], ['bandagem', 5], ['kit', 2], ['agua', 3], ['carne_assada', 4], ['tocha', 1], ['lanterna', 1]]) invAdd(k, n);
  P.hot = ['machete', 'espingarda', 'pistola', 'tocha', null, null]; P.sel = 0; P.mags.espingarda = 2; P.mags.pistola = 8;
}
function startNew() {
  const c = UI.cc || { name: 'Sobrevivente', look: {}, origin: null }, diff = UI.newDiff || 'normal';
  audioInit(); $('title').hidden = true; $('hud').hidden = false; UI.lastDrv = undefined;
  resetGame(); G.slot = UI.newSlot || 1; G.diff = diff; G.state = 'play';
  P.name = (c.name || '').trim().slice(0, 16) || 'Sobrevivente'; P.look = Object.assign({}, c.look); P.origin = c.origin; WHO.eu[1] = P.name;
  give('faca', 1, true); const og = ORIGINS[c.origin]; if (og) { P.skills[og.skill] = 1; for (const k in og.items) invAdd(k, og.items[k]); }
  if (diff === 'aventura') { setupAdventure(); showDialog([['nar', 'Modo Aventura. Sem história desta vez: o vale inteiro é seu, a caminhonete está pronta e as criaturas ficam mais fortes a cada noite.'], ['nar', 'Os guardiões ainda esperam: o Alfa na pedreira e a Mãe no fundo da cratera.']]); }
  else showDialog(INTRO.map(t => ['nar', t]).concat([['eu', 'Minha cabeça... A cabana desabou pela metade. Preciso de madeira, pedras e alguma coisa afiada. Depois, água. E preciso de fogo antes que escureça.']]), () => startQuest('q_dia'));
  cam.x = P.x - VW / 2; cam.y = P.y - VH / 2; G.uiDirty = true; UI.cc = null; saveGame();
}
function startGame(load, diff, slot) {
  audioInit(); $('title').hidden = true; $('hud').hidden = false; UI.lastDrv = undefined;
  if (load && loadGame(slot)) { G.state = 'play'; toast('Jogo carregado: ' + P.name, 'u_save'); setTimeout(catchUpAll, 600); }
  else { UI.newDiff = diff; UI.cc = UI.cc || null; startNew(); return; }
  cam.x = P.x - VW / 2; cam.y = P.y - VH / 2; G.uiDirty = true;
}
function overlay(html) { UI.over = true; $('over').hidden = false; $('over').innerHTML = `<div class="modal card">${html}</div>`; $('over').style.background = 'rgba(4,2,8,.72)'; }
function closeOverlay() { UI.over = null; UI.pause = false; $('over').hidden = true; }
function showPause() { UI.pause = true; overlay(`<h2>Pausado</h2><div class="menu"><button class="btn" data-a="resume">Continuar</button><button class="btn sec" data-a="save">Salvar jogo</button><button class="btn sec" data-a="help2">Como Jogar</button><button class="btn sec" data-a="unstuck" title="Use se ficar preso em algum lugar">Ressurgir (se ficar preso)</button></div><div class="sets"><label><span>Zoom</span><input type="range" id="set-zoom" min="0.6" max="2" step="0.05" value="${SET.zoom}"><b id="sv-zoom">${Math.round(SET.zoom * 100)}%</b></label><label><span>Música</span><input type="range" id="set-mus" min="0" max="1" step="0.05" value="${SET.mus}"><b id="sv-mus">${Math.round(SET.mus * 100)}%</b></label><label><span>Sons</span><input type="range" id="set-sfx" min="0" max="1" step="0.05" value="${SET.sfx}"><b id="sv-sfx">${Math.round(SET.sfx * 100)}%</b></label></div><div class="menu"><button class="btn sec" data-a="mute">${muted ? 'Ligar todo o som' : 'Desligar todo o som'}</button><button class="btn sec" data-a="dev">${DEV.on ? 'Painel do desenvolvedor' : 'Modo desenvolvedor'}</button><button class="btn sec" data-a="quit">Salvar e sair</button></div>`); }
function showDeath() { overlay(`<h2 style="color:var(--blood)">${P.deathBy === 'inf' ? 'O Tecido tomou conta' : P.deathBy === 'afogado' ? 'A água te levou' : P.deathBy === 'frio' ? 'O frio venceu' : 'Você não sobreviveu'}</h2><p>${P.deathBy === 'inf' ? 'Por um instante você ouviu seu próprio nome vindo de dentro.' : P.deathBy === 'afogado' ? 'O fôlego acabou no meio da água, e o fundo puxou o resto.' : 'O vale engoliu mais um.'} Mas alguma coisa, ou alguém, arrastou você de volta para o acampamento antes do amanhecer.</p><div class="statsrow"><span>Dia <b>${dayNum()}</b></span><span>Abates <b>${G.kills}</b></span><span>Nível <b>${P.lvl}</b></span></div><p class="hint">Você perde parte da experiência do nível atual. Seus itens continuam com você.</p><button class="btn red" data-a="respawn">Voltar ao acampamento</button>`); P.deathBy = null; }
function showEnding() {
  showDialog([['nar', 'A Carga Ômega canta numa nota que você sente nos dentes. A Grande Fenda estremece, se contrai como uma garganta e desaba sobre si mesma.'], ['radio', 'Íris na escuta... os sismógrafos zeraram. Zeraram! Você fechou. Você fechou tudo!'], ['tome', 'Aqui é o Tomé, pelo rádio da doutora. Vou pôr feijão no fogo. Volta para casa, criatura.'], ['nar', 'Os túneis seguem fechados, e quem os fechou não vai voltar para abrir. Mas, pela primeira vez desde o Grande Tremor, ninguém chama seu nome do lado de fora. A noite em Serra Sangrenta é só noite.']],
    () => overlay(`<h2 style="color:var(--gold)">Serra Sangrenta em silêncio</h2><p>Você selou a Grande Fenda. O vale está em paz, mas continua trancado: resta descobrir se existe uma saída.</p><div class="statsrow"><span>Dias <b>${dayNum()}</b></span><span>Abates <b>${G.kills}</b></span><span>Nível <b>${P.lvl}</b></span></div><p class="hint">O vale continua aberto. Ainda há fendas menores, fitas, papéis e o que restou dentro dos prédios.</p><button class="btn" data-a="resume">Continuar sobrevivendo</button>`));
}
function showEscape() {
  showDialog([['nar', 'O motor engasga, pega, e as pás começam a cortar a neblina. Pela primeira vez você vê Serra Sangrenta de cima: a cratera selada, a cidade apagada, a fumaça fina da chaminé de Tomé.'], ['radio', 'Íris na escuta. Estou vendo você no radar. Conte o que aconteceu aqui. Conte tudo. E conte direito.'], ['nilo', 'Bunker para aeronave. Boletim final: a contenção foi rompida por dentro. Por alguém vivo. Câmbio e desligo.'], ['nar', 'As montanhas passam por baixo. Do outro lado há estradas, luzes, gente que não sabe de nada. Você olha para trás uma vez. Ninguém chama o seu nome.']],
    () => overlay(`<h2 style="color:var(--gold)">Você saiu de Serra Sangrenta</h2><p>Este é o final completo da história. O vale fica para trás, e quem ficou nele sabe que alguém conseguiu sair.</p><div class="statsrow"><span>Dias <b>${dayNum()}</b></span><span>Abates <b>${G.kills}</b></span><span>Nível <b>${P.lvl}</b></span></div>${UI.newUnlock || unlocked('aventura') ? '<p style="color:var(--gold)">Modo Aventura liberado: escolha-o ao começar um novo jogo.</p>' : ''}<p class="hint">Se quiser, a história continua aberta: volte ao vale para fechar as fendas que sobraram.</p><button class="btn" data-a="resume">Voltar ao vale</button>`));
}
function overAct(a, v) {
  sfx('ui');
  if (a === 'slots') { UI.confirm = null; showSlots(v); }
  else if (a === 'pickslot') { const n = +v; if (UI.slotMode === 'load') { if (readSlot(n)) startGame(true, null, n); } else if (readSlot(n)) { UI.confirm = ['replace', n]; showSlots('new'); } else { UI.newSlot = n; UI.confirm = null; showDiff(); } }
  else if (a === 'pickslot_ok') { UI.newSlot = +v; UI.confirm = null; showDiff(); }
  else if (a === 'delslot') { UI.confirm = ['del', +v]; showSlots(UI.slotMode); }
  else if (a === 'delslot_ok') { deleteSlot(+v); UI.confirm = null; if (!hasSave() && UI.slotMode === 'load') showTitle(); else showSlots(UI.slotMode); }
  else if (a === 'slotcancel') { UI.confirm = null; showSlots(UI.slotMode); }
  else if (a === 'diff') { if (v === 'aventura' && !unlocked('aventura')) return; UI.newDiff = v; UI.cc = null; showCreate(); }
  else if (a === 'cc') { const [k, val] = v.split('|'); UI.cc.look[k] = val; showCreate(); }
  else if (a === 'ccrand') { UI.cc.look = randLook(); showCreate(); }
  else if (a === 'ccname') { UI.cc.name = NAMES[randi(0, NAMES.length - 1)]; showCreate(); }
  else if (a === 'ccorig') { UI.cc.origin = v; showCreate(); }
  else if (a === 'ccback') showDiff();
  else if (a === 'ccstart') startNew();
  else if (a === 'help') { $('title').innerHTML = `<div class="modal card"><h2>Como Jogar</h2>${HELP}<p>Coma, beba, durma e não fique no escuro: sua sanidade cai. De dia, explore. À noite, o que mora nas fendas sai para andar. Dentro dos prédios, elas não esperam a noite.</p><button class="btn" data-a="back">Voltar</button></div>`; }
  else if (a === 'back') showTitle();
  else if (a === 'resume') closeOverlay(); else if (a === 'save') { toast(saveGame() ? 'Jogo salvo' : 'Não foi possível salvar neste navegador', 'u_save'); closeOverlay(); }
  else if (a === 'help2') overlay(`<h2>Como Jogar</h2>${HELP}<button class="btn" data-a="resume">Voltar ao jogo</button>`);
  else if (a === 'mute') { muted = !muted; showPause(); }
  else if (a === 'music') { musOn = !musOn; showPause(); }
  else if (a === 'quit') { saveGame(); closeOverlay(); resetGame(); titleCam(); showTitle(); }
  else if (a === 'respawn') { closeOverlay(); respawn(); }
  else if (a === 'unstuck') overlay(`<h2>Ressurgir</h2><p>Use se ficar preso em algum lugar. Você volta para ${P.bed ? 'a sua cama' : 'a cabana onde acordou'}, sem perder nada, mas passa uma hora.${P.driving ? ' A caminhonete vem junto e fica estacionada por perto.' : ''}</p><div class="menu"><button class="btn red" data-a="unstuck2">Ressurgir</button><button class="btn sec" data-a="resume">Cancelar</button></div>`);
  else if (a === 'unstuck2') { closeOverlay(); unstuck(); }
  else if (a === 'dev') { if (DEV.on) { closeOverlay(); openPanel('dev'); } else showDevLogin(); }
  else if (a === 'devok') devTry(($('dev-pw') || {}).value || '');
}
function titleCam() { P.x = 14 * TILE; P.y = 96.6 * TILE; }

/* ===================== ENTRADA ===================== */
function quickHeal() { for (const id of ['bandagem', 'erva', 'soro', 'kit']) if (invCount(id)) { if ((id === 'kit' || id === 'soro') && P.hp > maxHp() * .5) continue; useItem(id); return; } hint('Nenhum item de cura na mochila.'); }
function bindInput() {
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase(); if (e.target && e.target.tagName === 'INPUT' && k !== 'escape' && k !== 'tab' && !(k === 'enter' && e.target.id === 'dev-pw')) return; if (k === 'tab' || k === ' ' || k.startsWith('arrow')) e.preventDefault(); if (e.repeat) return; audioInit();
    if (CS.on) { if (k === ' ' || k === 'escape' || k === 'enter' || k === 'e') csSkip(); e.preventDefault(); return; }
    if (UI.dialog) { if (k === ' ' || k === 'enter' || k === 'e') dialogNext(); return; }
    if (G.state !== 'play') return;
    // pausa: Esc, ou Ctrl+Tab / P para quem não quer usar o Esc (o Esc tira o navegador da tela cheia)
    const pauseKey = k === 'escape' || (k === 'tab' && e.ctrlKey) || (k === 'p' && !e.ctrlKey && !e.altKey && !e.metaKey);
    if (UI.over) { if (k === 'enter' && e.target && e.target.id === 'dev-pw') devTry(e.target.value); else if (pauseKey && UI.pause) closeOverlay(); return; }
    if (k === 'f2' && DEV.on) { e.preventDefault(); if (UI.tab === 'dev') closePanel(); else openPanel('dev'); return; }
    if (pauseKey) { if (UI.tab) closePanel(); else showPause(); return; }
    const tabKey = { tab: 'inv', i: 'inv', c: 'craft', k: 'skills', j: 'journal', b: 'arquivo', m: 'map' }[k];
    if (tabKey) { if (UI.tab === tabKey) closePanel(); else if (tabKey === 'inv' && P.driving) openChest(G.car); else { if (tabKey === 'craft') UI.station = ''; openPanel(tabKey); } return; }
    if (UI.tab) return;
    if (k === '+' || k === '=') { setZoom(SET.zoom + .1); return; } if (k === '-' || k === '_') { setZoom(SET.zoom - .1); return; }
    keys[k] = true;
    if (P.driving) { if (k === 'e') interact(); else if (k === 'r') carRefuel(); else if (k === 'x') carRepair(); return; }
    if (k === 'v') { toggleBuild(); return; }
    if (k >= '1' && k <= '6') { if (BUILD.on) { if (+k <= BUILDS.length) BUILD.sel = +k - 1; } else { P.sel = +k - 1; P.reload = null; } sfx('ui'); }
    else if (k === 'e') interact(); else if (k === 'r') startReload(); else if (k === 'x') dismantle(); else if (k === 'q') quickHeal();
    else if (P.sleeping && k !== 'shift') wakeUp();
  });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; });
  addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  cv.addEventListener('mousedown', e => { audioInit(); if (paused() || CS.on || G.state !== 'play' || P.driving) return; if (e.button === 0) { mouse.down = true; mouse.pressed = true; } else if (e.button === 2) mouse.rpressed = true; });
  addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('wheel', e => { if (G.state === 'play' && !paused() && !P.driving) { if (BUILD.on) BUILD.sel = (BUILD.sel + (e.deltaY > 0 ? 1 : BUILDS.length - 1)) % BUILDS.length; else { P.sel = (P.sel + (e.deltaY > 0 ? 1 : 5)) % 6; P.reload = null; } } }, { passive: true });
  $('dialog').addEventListener('click', dialogNext);
  $('shade').addEventListener('mousedown', e => { if (e.target === $('shade')) closePanel(); });
  $('panel').addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (el && !el.disabled) panelAct(el.dataset.a, el.dataset.v); });
  $('panel').addEventListener('input', e => { if (e.target.id !== 'rsearch') return; UI.rq = e.target.value; renderPanel(); const el = $('rsearch'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } });
  $('panel').addEventListener('mouseover', e => { const el = e.target.closest('[data-h]'); if (el) skillInfo(el.dataset.h); });
  $('over').addEventListener('input', e => { const k = { 'set-zoom': 'zoom', 'set-mus': 'mus', 'set-sfx': 'sfx' }[e.target.id]; if (!k) return; const v = +e.target.value; if (k === 'zoom') setZoom(v, true); else { SET[k] = v; saveSet(); if (AC) OUT(); if (k === 'sfx') sfx('pick'); } $('sv-' + k).textContent = Math.round(SET[k] * 100) + '%'; });
  $('title').addEventListener('input', e => { if (e.target.id === 'cc-name' && UI.cc) UI.cc.name = e.target.value.slice(0, 16); });
  for (const id of ['title', 'over']) $(id).addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (el) { audioInit(); overAct(el.dataset.a, el.dataset.v); } });
  addEventListener('resize', resize);
}

/* ===================== LAÇO PRINCIPAL ===================== */
let lastT = 0, nextT = 0;
function frame(ts) {
  // limite de quadros no celular: 60 por segundo mesmo em telas de 90/120 Hz (desenhar o dobro não deixa
  // o jogo mais liso, só esquenta e gasta bateria) ou 30 para poupar. No PC não há limite, como sempre foi.
  const cap = GFX.fps || (GFX.lite ? 60 : 0);
  if (cap) { const per = 1000 / cap; if (ts < nextT - 2) { requestAnimationFrame(frame); return; } nextT = Math.max(nextT + per, ts); }
  const t0 = performance.now(), dt = Math.min(.05, (ts - lastT) / 1000 || 0); lastT = ts;
  try { frameBody(dt); } catch (e) { console.error(e); }
  if (GFX.onFrame) GFX.onFrame(ts, performance.now() - t0);
  requestAnimationFrame(frame);
}
function frameBody(dt) {
  const pz = paused();
  if (G.state === 'play' && !pz) { if (CS.on) csUpdate(dt); else update(dt); }
  else if (G.state === 'title') { const pv = document.getElementById('cc-prev'); if (pv && UI.cc) drawPreview(pv, UI.cc.look, [Math.PI / 2, 0, -Math.PI / 2, Math.PI][Math.floor(performance.now() / 1400) % 4]); G.time = 19.7; P.x += dt * 14; P.y = 96.6 * TILE; if (P.x > 66 * TILE) P.x = 14 * TILE; mouse.x = cv.clientWidth / 2; mouse.y = cv.clientHeight / 2; }
  const csd = CS.on ? csBeforeDraw() : null;
  try { draw(pz ? 0 : dt); } catch (e) { console.error(e); }
  if (csd !== null) csAfterDraw(csd);
  hud(dt); mouse.pressed = false; mouse.rpressed = false;
}
function boot() {
  cv = $('cv'); g = cv.getContext('2d', MOBILE ? { alpha: false } : undefined); LC = document.createElement('canvas'); lg = LC.getContext('2d');
  // saves de versões com um só espaço vão para o primeiro espaço livre; zerar em qualquer espaço libera o Modo Aventura
  try { const old = localStorage.getItem(SAVE_KEY); if (old) { const n = [1, 2, 3].find(k => !localStorage.getItem(slotKey(k))); if (n) { localStorage.setItem(slotKey(n), old); localStorage.removeItem(SAVE_KEY); } } } catch (e) { }
  for (const n of [1, 2, 3]) { try { const s = JSON.parse(localStorage.getItem(slotKey(n))); if (s && s.qdone && s.qdone.q_fuga) unlock('aventura'); } catch (e) { } }
  resize(); buildSprites(); buildHUD(); bindInput(); resetGame(); titleCam(); showTitle();
  requestAnimationFrame(frame);
}
boot();
