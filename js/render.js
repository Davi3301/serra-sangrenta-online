'use strict';
/* ===================== TELA ===================== */
let cv, g, LC, lg, GRAIN, DPR = 1, Z = 1, VW = 1280, VH = 720;
const cam = { x: 0, y: 0 };
const FONT = '"Barlow",system-ui,sans-serif', OL = '#141018';
const FL = '#8a2c36', FD = '#4a141e', FH2 = '#b85a62', BN = '#d6ceb4', BND = '#8a8068';
/* Qualidade gráfica (js/graficos3.js escolhe o nível e troca estes valores).
   res: densidade de pixels do desenho (abaixo de 1 o jogo desenha menor e o navegador amplia);
   fog/grain/glow/water: neblina andando, granulado de filme, brilho das luzes, reflexos na água;
   lightDiv: resolução da camada de escuridão (maior = mais leve); rain: fração das gotas; parts: limite de partículas. */
const MOBILE = /[?&]mobile=1/.test(location.search) || !!window.SERRA_APP || (matchMedia('(pointer: coarse)').matches && ('ontouchstart' in window) && !/[?&]mobile=0/.test(location.search));
/* No PC estes valores ficam fixos (o jogo desenha exatamente como antes). No celular, js/graficos3.js troca
   conforme a qualidade escolhida, e lite liga os atalhos de desempenho que só valem lá. */
const GFX = { lite: MOBILE ? 1 : 0, res: 2, fog: 1, grain: 1, glow: 1, water: 1, lightDiv: 3, rain: 1, parts: Infinity, fps: 0, hudEvery: 1, mzoom: 1, burstK: 1 };
function resize() {
  const real = window.devicePixelRatio || 1; DPR = GFX.res < 1 ? GFX.res : Math.min(real, GFX.res); const w = cv.clientWidth || innerWidth, h = cv.clientHeight || innerHeight;
  cv.width = Math.max(200, Math.round(w * DPR)); cv.height = Math.max(120, Math.round(h * DPR)); Z = clamp(h / 720, .75, 2) * (GFX.mzoom || 1) * (typeof SET !== 'undefined' ? SET.zoom : 1); VW = w / Z; VH = h / Z;
  LC.width = Math.ceil(cv.width / GFX.lightDiv); LC.height = Math.ceil(cv.height / GFX.lightDiv);
}
function circ(x, y, r, f, s) { g.beginPath(); g.arc(x, y, r, 0, 6.2832); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.strokeStyle = s; g.stroke(); } }
function ell(x, y, rx, ry, f, s, rot) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.2832); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.strokeStyle = s; g.stroke(); } }
function rr(x, y, w, h, r, f, s) { g.beginPath(); g.roundRect(x, y, w, h, r); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.strokeStyle = s; g.stroke(); } }
function poly(p, f, s) { g.beginPath(); for (let i = 0; i < p.length; i += 2) i ? g.lineTo(p[i], p[i + 1]) : g.moveTo(p[i], p[i + 1]); g.closePath(); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.strokeStyle = s; g.stroke(); } }
function seg(p, w, c) { g.beginPath(); for (let i = 0; i < p.length; i += 2) i ? g.lineTo(p[i], p[i + 1]) : g.moveTo(p[i], p[i + 1]); g.strokeStyle = c; g.lineWidth = w; g.stroke(); }
function shadow(x, y, rx, ry) { ell(x, y, rx, ry || rx * .42, 'rgba(6,8,14,.38)'); }
function icon(name, x, y, s) { g.drawImage(IC(name), x - s / 2, y - s / 2, s, s); }

/* ===================== SPRITES PRÉ-RENDERIZADOS ===================== */
const SPR = {};
function mkSprite(w, h, fn) { const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const o = g; g = c.getContext('2d'); g.scale(2, 2); g.lineJoin = g.lineCap = 'round'; fn(); g = o; c.w = w; c.h = h; return c; }
function buildSprites() {
  const leafy = (c1, c2, c3, c4) => () => { shadow(60, 126, 32, 11); rr(54, 92, 12, 34, 3, '#4a3626', OL); seg([57, 98, 57, 122], 2, 'rgba(0,0,0,.3)'); g.lineWidth = 3; const B = [[40, 70, 25], [80, 72, 24], [60, 48, 29], [60, 82, 25], [34, 56, 14], [86, 54, 13]]; for (const [x, y, r] of B) circ(x, y, r + 3, OL); for (const [x, y, r] of B) circ(x, y, r, c1); circ(66, 78, 20, c2); circ(84, 76, 14, c2); circ(52, 44, 19, c3); circ(38, 62, 11, c3); circ(46, 38, 7, c4); g.fillStyle = 'rgba(0,0,0,.2)'; for (const [x, y] of [[50, 66], [72, 58], [44, 82], [70, 90], [62, 36]]) { g.beginPath(); g.arc(x, y, 3, 0, 6.3); g.fill(); } };
  SPR.tree0 = mkSprite(120, 140, leafy('#2e5a40', '#234a36', '#3c6e4a', '#4e8258'));
  SPR.tree2 = mkSprite(120, 140, () => { leafy('#4a5a32', '#3a4a2a', '#5c6e3a', '#70823e')(); g.lineWidth = 1.5; for (const [x, y] of [[42, 58], [70, 44], [80, 76], [56, 84], [34, 78], [62, 64]]) { circ(x, y, 4.2, '#8a2a2a', OL); circ(x - 1.2, y - 1.4, 1.2, '#c86a5a'); } });
  SPR.tree1 = mkSprite(120, 150, () => { shadow(60, 136, 27, 9); rr(55, 110, 10, 26, 3, '#3e2c20', OL); const tri = (y, w, h, f, f2) => { g.beginPath(); g.moveTo(60, y); g.lineTo(60 + w * .5, y + h * .55); g.lineTo(60 + w * .38, y + h * .55); g.lineTo(60 + w, y + h); g.quadraticCurveTo(60, y + h + 9, 60 - w, y + h); g.lineTo(60 - w * .38, y + h * .55); g.lineTo(60 - w * .5, y + h * .55); g.closePath(); g.fillStyle = f; g.fill(); g.strokeStyle = OL; g.lineWidth = 3; g.stroke(); g.beginPath(); g.moveTo(60, y + 4); g.lineTo(60 + w * .8, y + h - 2); g.quadraticCurveTo(64, y + h + 4, 60, y + h * .6); g.closePath(); g.fillStyle = f2; g.fill(); }; tri(62, 34, 54, '#24483a', '#1a3a30'); tri(36, 28, 50, '#2a5442', '#1e4236'); tri(8, 21, 46, '#30604a', '#244c3c'); });
  SPR.tree3 = mkSprite(120, 140, () => { shadow(60, 126, 20, 7); g.lineCap = 'round'; const br = (p, w) => { seg(p, w + 4, OL); seg(p, w, '#4a3a34'); }; br([60, 126, 58, 84, 62, 50], 8); br([59, 92, 36, 62, 30, 38], 5); br([60, 80, 86, 56, 94, 34], 5); br([40, 68, 22, 62], 3); br([82, 60, 98, 60], 3); br([61, 56, 52, 28], 4); br([62, 52, 74, 26], 3); br([32, 46, 22, 30], 2.5); br([92, 40, 102, 26], 2.5); seg([58, 120, 58, 88], 2, 'rgba(0,0,0,.35)'); });
  SPR.rock = mkSprite(60, 50, () => { shadow(30, 40, 25, 8); g.lineWidth = 3; poly([8, 38, 12, 18, 26, 8, 44, 12, 53, 28, 50, 40], '#6c6a70', OL); poly([14, 20, 26, 10, 42, 14, 34, 24], '#8c8a90'); poly([34, 24, 50, 30, 49, 39, 38, 39], '#56545a'); seg([34, 24, 38, 38], 1.5, 'rgba(0,0,0,.4)'); });
  const ore = cols => mkSprite(60, 50, () => { g.drawImage(SPR.rock, 0, 0, 60, 50); g.lineWidth = 1.5; for (const [x, y, r] of [[20, 28, 4.5], [34, 32, 5], [42, 22, 3.5], [27, 17, 3], [46, 34, 3]]) { circ(x, y, r, cols[0], OL); circ(x - 1, y - 1, r * .35, cols[1]); } });
  SPR.iron = ore(['#a8623a', '#d89a6a']); SPR.coal = ore(['#1e1e24', '#4a4c58']);
  const shards = (c1, c3) => mkSprite(50, 50, () => { shadow(25, 42, 18, 6); g.lineWidth = 2.5; for (const [x, w, h, a] of [[14, 8, 20, -.3], [25, 10, 32, 0], [36, 8, 22, .35]]) { g.save(); g.translate(x, 42); g.rotate(a); poly([-w / 2, 0, -w / 2, -h * .6, 0, -h, w / 2, -h * .6, w / 2, 0], c1, OL); poly([-w / 2 + 1.5, -2, -w / 2 + 1.5, -h * .58, 0, -h + 3, 0, -2], c3); g.restore(); } });
  SPR.sulfur = shards('#a8922e', '#d8c85c'); SPR.crystal = shards('#6e3684', '#b890d0');
  SPR.bush = mkSprite(50, 44, () => { shadow(25, 36, 21, 6); for (const [x, y, r] of [[15, 26, 11], [35, 26, 11], [25, 18, 13]]) circ(x, y, r + 2.5, OL); for (const [x, y, r] of [[15, 26, 11], [35, 26, 11], [25, 18, 13]]) circ(x, y, r, '#33583e'); circ(30, 26, 9, '#284a34'); circ(21, 14, 6, '#467050'); });
  SPR.berries = mkSprite(50, 44, () => { g.lineWidth = 1.2; for (const [x, y] of [[14, 24], [24, 14], [34, 22], [27, 28], [19, 32], [36, 30]]) { circ(x, y, 3.2, '#3a3a7a', OL); circ(x - .8, y - .8, 1, '#8a8ac8'); } });
  GRAIN = document.createElement('canvas'); GRAIN.width = GRAIN.height = 128; const gc = GRAIN.getContext('2d'), id = gc.createImageData(128, 128); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 26; } gc.putImageData(id, 0, 0);
}
/* manchas de luz, brilho e neblina: o mesmo degradê radial, feito uma vez numa imagem e depois só carimbado
   (criar degradês novos a cada quadro custava caro no celular) */
const SOFT = {};
function softSpr(key, inner, rgb) { let c = SOFT[key]; if (!c) { c = SOFT[key] = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), gr = x.createRadialGradient(128, 128, 128 * inner, 128, 128, 128); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); } return c; }
/* figuras prontas de objetos pequenos: o mesmo desenho de antes, feito uma vez só e depois só copiado */
const OSPR = {}, GRASS_F = 12;
function objSpr(key, w, h, ox, oy, fn) { let s = OSPR[key]; if (!s) { s = OSPR[key] = mkSprite(w, h, () => fn(ox, oy)); s.ox = ox; s.oy = oy; } return s; }
function putObj(s, x, y) { g.drawImage(s, x - s.ox, y - s.oy, s.w, s.h); }
function grassAt(x, y, ph) { g.lineCap = 'round'; for (let i = -2; i <= 2; i++) { const tx = x + i * 7 + Math.sin(ph + i) * 2, ty = y - 12 - (2 - Math.abs(i)) * 3; g.beginPath(); g.moveTo(x + i * 3, y + 6); g.quadraticCurveTo(x + i * 5, y - 6, tx, ty); g.strokeStyle = OL; g.lineWidth = 5; g.stroke(); g.strokeStyle = i % 2 ? '#5a7a44' : '#486a3c'; g.lineWidth = 2.6; g.stroke(); } }
function drawSpr(s, x, y, ox, oy, sc, rot, alpha) { g.save(); g.translate(x, y); if (rot) g.rotate(rot); if (sc && sc !== 1) g.scale(sc, sc); if (alpha !== undefined) g.globalAlpha = alpha; g.drawImage(s, -ox, -oy, s.w, s.h); g.restore(); }

/* ===================== OBJETOS ===================== */
let RT = 0, RDT = 0;
const lights = [];
function box(x, y, w, h, top, c, c2) { shadow(x, y + h * .35, w * .62, 6); rr(x - w / 2, y - h + 8, w, h, 3, c, OL); rr(x - w / 2, y - h + 8, w, top, 3, c2, OL); }
function drawObj(o) {
  const x = o.x, y = o.y, t = o.type; g.lineWidth = 2.5;
  if (o.shake > 0 && !o.placed) o.shake -= RDT; const sh = o.shake > 0 ? Math.sin(RT * 50) * o.shake * .25 : 0;
  switch (t) {
    case 'tree': {
      if (o.dead) { shadow(x, y + 2, 12, 5); ell(x, y, 9, 6, '#5a4434', OL); ell(x, y, 5, 3, null, 'rgba(0,0,0,.4)'); return; }
      const behind = P.y < y - 6 && P.y > y - 105 * o.s && Math.abs(P.x - x) < 38 * o.s;
      drawSpr(SPR['tree' + o.k], x, y, 60, o.k === 1 ? 136 : 126, o.s, sh + (o.k === 3 ? 0 : Math.sin(RT * 1.1 + o.id) * .012), behind ? .4 : 1); return;
    }
    case 'rock': case 'iron': case 'coal': drawSpr(SPR[t], x + sh * 20, y, 30, 30, (o.s || 1)); return;
    case 'sulfur': case 'crystal': drawSpr(SPR[t], x + sh * 20, y, 25, 38, 1); return;
    case 'bush': drawSpr(SPR.bush, x, y, 25, 30, 1); if (!o.dead) drawSpr(SPR.berries, x, y, 25, 30, 1); return;
    // objetos miúdos e numerosos: desenhados uma vez numa figura pronta (a grama guarda 12 quadros do balanço)
    case 'grass': if (GFX.lite) { const f = ((RT * 1.6 + o.id) / 6.2832 % 1 + 1) % 1 * GRASS_F | 0; putObj(objSpr('grass' + f, 44, 40, 22, 28, (x, y) => grassAt(x, y, f / GRASS_F * 6.2832)), x, y); return; } g.lineCap = 'round'; for (let i = -2; i <= 2; i++) { const tx = x + i * 7 + Math.sin(RT * 1.6 + o.id + i) * 2, ty = y - 12 - (2 - Math.abs(i)) * 3; g.beginPath(); g.moveTo(x + i * 3, y + 6); g.quadraticCurveTo(x + i * 5, y - 6, tx, ty); g.strokeStyle = OL; g.lineWidth = 5; g.stroke(); g.strokeStyle = i % 2 ? '#5a7a44' : '#486a3c'; g.lineWidth = 2.6; g.stroke(); } return;
    case 'stick': if (GFX.lite) { putObj(objSpr('stick', 28, 20, 14, 10, (x, y) => { g.lineCap = 'round'; seg([x - 9, y + 3, x + 9, y - 3], 6, OL); seg([x - 5, y - 4, x + 7, y + 5], 6, OL); seg([x - 9, y + 3, x + 9, y - 3], 3, '#86683f'); seg([x - 5, y - 4, x + 7, y + 5], 3, '#6e5238'); }), x, y); return; } g.lineCap = 'round'; seg([x - 9, y + 3, x + 9, y - 3], 6, OL); seg([x - 5, y - 4, x + 7, y + 5], 6, OL); seg([x - 9, y + 3, x + 9, y - 3], 3, '#86683f'); seg([x - 5, y - 4, x + 7, y + 5], 3, '#6e5238'); return;
    case 'stone': if (GFX.lite) { putObj(objSpr('stone', 24, 20, 12, 10, (x, y) => { shadow(x, y + 4, 9, 3); g.lineWidth = 2; poly([x - 8, y + 3, x - 5, y - 5, x + 3, y - 6, x + 8, y, x + 5, y + 5], '#77747a', OL); poly([x - 4, y - 3, x + 2, y - 4, x, y], '#9c999e'); }), x, y); return; } shadow(x, y + 4, 9, 3); g.lineWidth = 2; poly([x - 8, y + 3, x - 5, y - 5, x + 3, y - 6, x + 8, y, x + 5, y + 5], '#77747a', OL); poly([x - 4, y - 3, x + 2, y - 4, x, y], '#9c999e'); return;
    case 'flint': if (GFX.lite) { putObj(objSpr('flint', 22, 20, 11, 10, (x, y) => { shadow(x, y + 4, 8, 3); g.lineWidth = 2; poly([x - 7, y + 4, x - 1, y - 7, x + 7, y + 3], '#383c48', OL); poly([x - 1, y - 5, x + 1, y + 2, x - 4, y + 2], '#687084'); }), x, y); return; } shadow(x, y + 4, 8, 3); g.lineWidth = 2; poly([x - 7, y + 4, x - 1, y - 7, x + 7, y + 3], '#383c48', OL); poly([x - 1, y - 5, x + 1, y + 2, x - 4, y + 2], '#687084'); return;
    case 'herb': if (GFX.lite) { putObj(objSpr('herb', 26, 26, 13, 14, (x, y) => { seg([x, y + 5, x, y - 6], 4.5, OL); seg([x, y + 5, x, y - 6], 2, '#3a6a34'); g.lineWidth = 1.5; ell(x - 5, y - 1, 5, 2.5, '#487838', OL, -.5); ell(x + 5, y - 3, 5, 2.5, '#487838', OL, .5); circ(x, y - 8, 3, '#c8c0d0', OL); }), x, y); return; } seg([x, y + 5, x, y - 6], 4.5, OL); seg([x, y + 5, x, y - 6], 2, '#3a6a34'); g.lineWidth = 1.5; ell(x - 5, y - 1, 5, 2.5, '#487838', OL, -.5); ell(x + 5, y - 3, 5, 2.5, '#487838', OL, .5); circ(x, y - 8, 3, '#c8c0d0', OL); return;
    case 'mushroom': shadow(x, y + 5, 7, 3); g.lineWidth = 2; rr(x - 2.5, y - 3, 5, 8, 2, '#d4ccb4', OL); g.beginPath(); g.arc(x, y - 3, 8, Math.PI, 0); g.closePath(); g.fillStyle = '#863a2a'; g.fill(); g.strokeStyle = OL; g.stroke(); circ(x - 3, y - 6, 1.5, '#d4ccb4'); circ(x + 3, y - 5, 1.2, '#d4ccb4'); return;
    case 'corn': seg([x, y + 8, x, y - 18], 5.5, OL); seg([x, y + 8, x, y - 18], 3, '#58783a'); g.lineWidth = 1.5; ell(x - 6, y - 6, 8, 3, '#58783a', OL, -.7); ell(x + 6, y - 10, 8, 3, '#58783a', OL, .7); ell(x + 3, y - 2, 3.5, 7, '#c4a43a', OL, .25); return;
    case 'logpile': shadow(x, y + 12, 24, 7); g.lineWidth = 2.5; for (const [dx, dy] of [[-12, 6], [0, 6], [12, 6], [-6, -5], [6, -5]]) { circ(x + dx, y + dy, 7.5, '#a8845a', OL); circ(x + dx, y + dy, 3.5, null, 'rgba(0,0,0,.35)'); } return;
    case 'crate': { const L = G.looted[o.id]; box(x, y + 4, 28, 28, 8, L ? '#4a4038' : '#7a5a3c', L ? '#3a3230' : '#96744e'); if (!L) { seg([x - 11, y - 6, x + 11, y + 10], 2, OL); seg([x + 11, y - 6, x - 11, y + 10], 2, OL); } else rr(x - 10, y - 14, 20, 5, 2, '#141018'); return; }
    case 'cabinet': case 'locker': { const L = G.looted[o.id], lk = t === 'locker'; rr(x - 15, y - 26, 30, 40, 3, L ? '#4a443e' : lk ? '#4a5a48' : '#7a5a3c', OL); rr(x - 15, y - 26, 30, 8, 3, lk ? '#5e7058' : '#96744e', OL); seg([x, y - 18, x, y + 14], 2, OL); if (L) rr(x - 13, y - 16, 11, 28, 2, '#141018'); else { circ(x - 4, y, 2, '#c4a446'); circ(x + 4, y, 2, '#c4a446'); if (lk) { rr(x - 5, y - 12, 10, 8, 2, '#c8b04e', OL); } } return; }
    case 'car': case 'wagon': {
      const wg = t === 'wagon', cols = wg ? [['#5a3028', '#3a1e1a'], ['#3a4a44', '#26322e'], ['#4a4438', '#322e26']][o.col || 0] : [['#6a3a34', '#4a2622'], ['#3a5066', '#263444'], ['#6e6238', '#4a4226']][o.col || 0];
      g.save(); g.translate(x, y); shadow(0, 14, wg ? 58 : 40, 12); g.rotate(o.rot || 0);
      if (wg) { rr(-56, -22, 112, 44, 4, cols[0], OL); for (let i = -2; i <= 2; i++) seg([i * 20, -22, i * 20, 22], 2, cols[1]); rr(-12, -22, 24, 44, 0, cols[1], OL); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-50, -26, 20, 5); g.fillRect(30, -26, 20, 5); g.fillRect(-50, 21, 20, 5); g.fillRect(30, 21, 20, 5); }
      else { rr(-38, -20, 76, 40, 10, cols[0], OL); rr(-20, -16, 36, 32, 6, cols[1], OL); rr(-16, -13, 11, 26, 3, '#3a4a50', OL); rr(4, -13, 9, 26, 3, '#3a4a50', OL); seg([6, -10, 11, 2], 1.5, 'rgba(200,220,220,.5)'); circ(34, -12, 3, '#56524a'); circ(34, 12, 3, '#56524a'); g.fillStyle = '#141018'; g.fillRect(-30, -23, 13, 5); g.fillRect(17, -23, 13, 5); g.fillRect(-30, 18, 13, 5); g.fillRect(17, 18, 13, 5); g.fillStyle = 'rgba(90,40,20,.5)'; g.beginPath(); g.ellipse(-26, 6, 8, 5, 1, 0, 6.3); g.fill(); g.beginPath(); g.ellipse(22, -14, 6, 3, 0, 0, 6.3); g.fill(); }
      if (G.looted[o.id]) { g.fillStyle = 'rgba(10,8,12,.35)'; g.beginPath(); g.roundRect(wg ? -56 : -38, wg ? -22 : -20, wg ? 112 : 76, wg ? 44 : 40, 8); g.fill(); } g.restore(); return;
    }
    case 'pump': shadow(x, y + 12, 13, 5); rr(x - 10, y - 26, 20, 38, 3, G.looted[o.id] ? '#4a4444' : '#7a3028', OL); rr(x - 7, y - 22, 14, 10, 2, '#aaa294', OL); g.strokeStyle = OL; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 10, y - 12); g.quadraticCurveTo(x + 20, y - 4, x + 12, y + 6); g.stroke(); return;
    case 'well': shadow(x, y + 16, 26, 9); ell(x, y, 20, 14, '#77747a', OL); ell(x, y - 1, 14, 9, '#2a4e60', OL); ell(x - 4, y - 3, 4, 2, 'rgba(200,220,220,.35)'); seg([x - 19, y, x - 19, y - 34], 6, OL); seg([x + 19, y, x + 19, y - 34], 6, OL); seg([x - 19, y, x - 19, y - 34], 3, '#6e5238'); seg([x + 19, y, x + 19, y - 34], 3, '#6e5238'); poly([x - 26, y - 32, x, y - 48, x + 26, y - 32], '#5a3028', OL); return;
    case 'tower': { shadow(x, y + 10, 30, 10); g.strokeStyle = OL; g.lineWidth = 7; g.beginPath(); g.moveTo(x - 20, y + 8); g.lineTo(x - 3, y - 130); g.moveTo(x + 20, y + 8); g.lineTo(x + 3, y - 130); g.stroke(); g.strokeStyle = '#6a6e78'; g.lineWidth = 3.5; g.stroke(); g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 6; i++) { const yy = y + 8 - i * 23, w = 20 - i * 2.9, w2 = 20 - (i + 1) * 2.9; g.moveTo(x - w, yy); g.lineTo(x + w2, yy - 23); g.moveTo(x + w, yy); g.lineTo(x - w2, yy - 23); } g.stroke(); seg([x, y - 130, x, y - 156], 3, '#6a6e78'); const on = G.flags.radio; g.lineWidth = 2; circ(x, y - 158, 4, on ? (Math.sin(RT * 4) > 0 ? '#e04a4a' : '#6a1c1c') : '#2a2428', OL); rr(x - 9, y - 6, 18, 14, 3, '#3a3e48', OL); return; }
    case 'npc': drawHuman(x, y, Math.atan2(P.y - y, P.x - x), o.npc === 'dito' ? { skin: '#a07858', hair: '#dcd8d0', shirt: '#3a5a66', pants: '#4a4030', hat: '#8a7a4a' } : o.npc === 'ramires' ? { skin: '#c8a288', hair: '#6a6058', shirt: '#5a6a4a', pants: '#3a3430', pack: 1 } : o.npc === 'nilo' ? { skin: '#9a7a60', hair: '#2a2a24', shirt: '#3a4a34', pants: '#2a3024', hat: '#34422e' } : o.npc === 'tome' ? { skin: '#b88e70', hair: '#a8a49c', shirt: '#6a4630', pants: '#3a3430', hat: '#4a3826' } : { skin: '#a87858', hair: '#2a2028', shirt: '#c4c8cc', pants: '#3a4250', glasses: 1 }); label(NPC_NAME[o.npc], x, y - 42, '#d9b36c'); return;
    case 'fogueira': { shadow(x, y + 6, 18, 7); g.lineWidth = 2; for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; ell(x + Math.cos(a) * 13, y + Math.sin(a) * 8 + 2, 4.5, 3.5, '#77747a', OL); } seg([x - 8, y + 4, x + 8, y - 2], 7, OL); seg([x + 8, y + 4, x - 8, y - 2], 7, OL); seg([x - 8, y + 4, x + 8, y - 2], 4, '#4a3020'); seg([x + 8, y + 4, x - 8, y - 2], 4, '#4a3020'); drawFlame(x, y - 2, 1, o.id); return; }
    case 'cama': rr(x - 14, y - 20, 28, 40, 5, '#8a7a44', OL); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 4; i++) { g.moveTo(x - 10, y - 4 + i * 6); g.lineTo(x + 10, y - 2 + i * 6); } g.stroke(); g.lineWidth = 2; rr(x - 10, y - 17, 20, 10, 3, '#aaa294', OL); return;
    case 'bancada': case 'costura': case 'quimica': case 'armeiro': {
      const c = { bancada: ['#7a5a3c', '#96744e'], costura: ['#6a5040', '#86685a'], quimica: ['#4a4e58', '#6a6e78'], armeiro: ['#34363e', '#4e525c'] }[t];
      shadow(x, y + 14, 23, 7); rr(x - 20, y + 2, 5, 12, 1, c[0], OL); rr(x + 15, y + 2, 5, 12, 1, c[0], OL); rr(x - 21, y - 14, 42, 20, 3, c[0], OL); rr(x - 21, y - 14, 42, 6, 3, c[1], OL); g.lineWidth = 1.5;
      if (t === 'bancada') { seg([x - 12, y - 4, x - 2, y + 2], 3, '#868a94'); rr(x - 16, y - 8, 7, 5, 1, '#868a94', OL); circ(x + 9, y - 1, 4, '#983838', OL); }
      else if (t === 'costura') { rr(x - 14, y - 6, 10, 8, 2, '#aaa294', OL); circ(x + 6, y - 2, 4.5, '#982a2a', OL); circ(x + 6, y - 2, 1.5, '#d4ccbc'); seg([x + 12, y - 8, x + 16, y + 2], 1.2, '#c8ced8'); }
      else if (t === 'quimica') { poly([x - 12, y - 18, x - 8, y - 18, x - 8, y - 12, x - 3, y, x - 17, y], '#8aa0a0', OL); poly([x - 14, y - 4, x - 6, y - 4, x - 4, y - 1, x - 16, y - 1], '#66863a'); rr(x + 4, y - 14, 6, 14, 2, '#8aa0a0', OL); rr(x + 5, y - 7, 4, 6, 1, '#982a56'); rr(x + 12, y - 10, 5, 10, 2, '#c4843a', OL); }
      else { poly([x - 14, y - 6, x + 4, y - 6, x + 4, y - 2, x - 6, y - 2, x - 7, y + 3, x - 12, y + 3, x - 11, y - 2, x - 14, y - 2], '#868a94', OL); rr(x + 8, y - 8, 9, 9, 1, '#56524a', OL); circ(x + 12.5, y - 3.5, 2, '#c4a446'); }
      return;
    }
    case 'fornalha': shadow(x, y + 14, 22, 7); g.beginPath(); g.moveTo(x - 18, y + 12); g.lineTo(x - 18, y - 6); g.quadraticCurveTo(x, y - 34, x + 18, y - 6); g.lineTo(x + 18, y + 12); g.closePath(); g.fillStyle = '#6c6a70'; g.fill(); g.strokeStyle = OL; g.lineWidth = 2.5; g.stroke(); g.beginPath(); g.arc(x, y + 4, 9, Math.PI, 0); g.lineTo(x + 9, y + 10); g.lineTo(x - 9, y + 10); g.closePath(); g.fillStyle = `rgb(224,${110 + Math.sin(RT * 8) * 26 | 0},50)`; g.fill(); g.stroke(); return;
    case 'bau': box(x, y + 4, 30, 24, 9, '#6e4a2c', '#86603c'); rr(x - 3, y - 8, 6, 8, 1.5, '#c4a446', OL); return;
    case 'lampiao': shadow(x, y + 8, 9, 4); seg([x, y + 8, x, y - 26], 5.5, OL); seg([x, y + 8, x, y - 26], 2.5, '#56524a'); rr(x - 6, y - 40, 12, 15, 2, `rgb(232,${190 + Math.sin(RT * 9 + o.id) * 12 | 0},110)`, OL); rr(x - 7, y - 43, 14, 4, 1, '#34363e', OL); return;
    case 'coletor': shadow(x, y + 12, 17, 6); rr(x - 13, y - 14, 26, 26, 4, '#3a5a66', OL); ell(x, y - 13, 13, 5, (o.water || 0) >= 1 ? '#4886ac' : '#1a2a30', OL); seg([x - 13, y - 2, x + 13, y - 2], 2, OL); poly([x - 18, y - 30, x + 18, y - 30, x + 6, y - 16, x - 6, y - 16], '#8a8478', OL); return;
    case 'espinhos': g.lineCap = 'round'; for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28, px = x + Math.cos(a) * 11, py = y + Math.sin(a) * 7; seg([px, py + 4, px + Math.cos(a) * 3, py - 9], 5, OL); seg([px, py + 4, px + Math.cos(a) * 3, py - 9], 2.5, '#86683f'); } seg([x, y + 4, x, y - 11], 5, OL); seg([x, y + 4, x, y - 11], 2.5, '#86683f'); return;
    case 'armadilha_urso': g.lineWidth = 2; ell(x, y, 13, 8, '#3a3e48', OL); ell(x, y, 5, 3, '#868a94', OL); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; poly([x + Math.cos(a) * 11 - 2, y + Math.sin(a) * 7, x + Math.cos(a) * 14, y + Math.sin(a) * 9 - 7, x + Math.cos(a) * 11 + 2, y + Math.sin(a) * 7], '#c8ced8', OL); } return;
    case 'barricada': { g.save(); g.translate(x + sh * 20, y); shadow(0, 14, 24, 7); g.strokeStyle = OL; g.lineWidth = 10; g.beginPath(); g.moveTo(-18, 10); g.lineTo(18, -18); g.moveTo(18, 10); g.lineTo(-18, -18); g.moveTo(-22, -2); g.lineTo(22, -2); g.stroke(); g.strokeStyle = '#7a5a3c'; g.lineWidth = 5.5; g.stroke(); g.restore(); if (o.hp < 160) bar(x, y - 30, 30, o.hp / 160, '#c8a84e'); return; }
    case 'pesquisa': { seg([x - 15, y + 2, x - 15, y + 13], 3, OL); seg([x + 15, y + 2, x + 15, y + 13], 3, OL); rr(x - 19, y - 12, 38, 16, 2, '#5a4a3a', OL); rr(x - 15, y - 15, 13, 10, 1, '#d8d0c0', OL); seg([x - 13, y - 12, x - 5, y - 12], 1, '#8a8478'); seg([x - 13, y - 9, x - 6, y - 9], 1, '#8a8478'); rr(x + 1, y - 17, 15, 12, 1, '#8a2a2a', OL); circ(x + 8.5, y - 11, 3, '#e0c060', OL); circ(x + 8.5, y - 11, 1, '#8a2a2a'); rr(x - 3, y - 22, 6, 9, 1, '#c4cccc', OL); rr(x - 2, y - 18, 4, 4, 0, '#5aa83a');
      if (!G.flags.receita_antidoto) { circ(x, y - 28, 2.5 + Math.sin(RT * 4) * .8, 'rgba(224,192,96,.85)'); lights.push([x, y - 10, 60, .35]); } return; }
    case 'tv': rr(x - 16, y - 4, 32, 14, 2, '#4a3826', OL); rr(x - 13, y - 26, 26, 22, 3, '#34363e', OL); { const on = G.target && G.target.o === o; rr(x - 10, y - 23, 17, 16, 2, on ? `rgb(${90 + Math.random() * 60 | 0},${120 + Math.random() * 50 | 0},${110 + Math.random() * 40 | 0})` : '#1a2224', OL); if (on) lights.push([x, y - 14, 90, .6]); } circ(x + 10, y - 19, 1.6, '#c4a446'); seg([x - 6, y - 26, x, y - 34, x + 8, y - 28], 1.5, '#868a94'); return;
    case 'gerador': shadow(x, y + 16, 28, 9); rr(x - 24, y - 16, 48, 30, 4, '#5a5a34', OL); rr(x - 24, y - 16, 48, 9, 4, '#76763e', OL); rr(x - 18, y - 2, 14, 10, 2, '#34363e', OL); circ(x + 10, y + 2, 7, '#34363e', OL); circ(x + 10, y + 2, 2.5, G.flags.energia ? '#6fe07a' : '#6a1c1c'); rr(x + 12, y - 30, 6, 15, 2, '#34363e', OL); if (G.flags.energia) { g.save(); g.translate(Math.sin(RT * 60) * .6, 0); g.restore(); if (RDT > 0 && Math.random() < .2) G.parts.push({ x: x + 15, y: y - 32, vx: rand(-8, 8), vy: rand(-40, -20), life: .8, max: .8, c: 'rgba(60,60,64,.5)', s: rand(3, 6) }); } return;
    case 'grave': shadow(x, y + 6, 11, 4); if (o.k === 0) { seg([x, y + 6, x, y - 20], 7, OL); seg([x - 8, y - 11, x + 8, y - 11], 7, OL); seg([x, y + 6, x, y - 20], 3.5, '#77747a'); seg([x - 8, y - 11, x + 8, y - 11], 3.5, '#77747a'); } else { g.beginPath(); g.moveTo(x - 9, y + 6); g.lineTo(x - 9, y - 12); g.quadraticCurveTo(x, y - 24, x + 9, y - 12); g.lineTo(x + 9, y + 6); g.closePath(); g.fillStyle = o.k === 1 ? '#77747a' : '#66646a'; g.fill(); g.strokeStyle = OL; g.stroke(); seg([x - 4, y - 8, x + 4, y - 8], 1.5, 'rgba(0,0,0,.4)'); seg([x - 4, y - 3, x + 4, y - 3], 1.5, 'rgba(0,0,0,.4)'); } return;
    case 'muro': { g.save(); g.translate(x + sh * 20, y); shadow(0, 14, 24, 7); rr(-20, -22, 40, 34, 2, '#6c6a70', OL); rr(-20, -22, 40, 9, 2, '#8c8a90', OL); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 2; i++) { g.moveTo(-20, -3 + i * 8); g.lineTo(20, -3 + i * 8); } for (let i = 0; i < 3; i++) { g.moveTo(-10 + i * 12, -13); g.lineTo(-10 + i * 12, -3); g.moveTo(-16 + i * 12, -3); g.lineTo(-16 + i * 12, 5); } g.stroke(); g.restore(); if (o.hp < 420) bar(x, y - 32, 34, o.hp / 420, '#c8a84e'); return; }
    case 'heli': { const on = G.flags.escaped; g.save(); g.translate(x, y); shadow(0, 18, 60, 18); g.lineWidth = 2.5; rr(-78, -5, 50, 10, 3, '#3a4a34', OL); rr(-84, -16, 10, 22, 2, '#34422e', OL); g.beginPath(); g.ellipse(0, 0, 36, 22, 0, 0, 6.3); g.fillStyle = '#44543c'; g.fill(); g.strokeStyle = OL; g.stroke(); g.beginPath(); g.ellipse(18, 0, 16, 15, 0, -1.4, 1.4); g.fillStyle = '#3a4e56'; g.fill(); g.stroke(); seg([20, -9, 28, -2], 1.5, 'rgba(210,225,225,.45)'); seg([-22, 24, 24, 24], 5.5, OL); seg([-22, -24, 24, -24], 5.5, OL); seg([-22, 24, 24, 24], 2.5, '#2a2c34'); seg([-22, -24, 24, -24], 2.5, '#2a2c34'); g.rotate(on ? RT * 14 : .5); seg([-64, 0, 64, 0], 7, OL); seg([0, -64, 0, 64], 7, OL); seg([-64, 0, 64, 0], 3.5, '#1e1a22'); seg([0, -64, 0, 64], 3.5, '#1e1a22'); circ(0, 0, 6, '#56524a', OL); g.restore(); return; }
    case 'poste': { shadow(x, y + 4, 7, 3); seg([x, y + 4, x, y - 62], 6, OL); seg([x, y + 4, x, y - 62], 3, '#3a3e48'); seg([x, y - 62, x + 14, y - 66], 5.5, OL); seg([x, y - 62, x + 14, y - 66], 2.5, '#3a3e48'); const on = G.flags.energia && ((o.id * 7) % 5 !== 0 || Math.sin(RT * 13 + o.id) > -.2); rr(x + 8, y - 68, 12, 5, 2, on ? '#f0dc9c' : '#2a2c34', OL); if (on && darkness() > .1) lights.push([x + 12, y - 10, 210, .9, 1]); return; }
  }
}
function drawFlame(x, y, s, seed) {
  for (let i = 0; i < 3; i++) { const f = Math.sin(RT * (9 + i * 3) + seed + i) * .15 + 1, w = (9 - i * 2.5) * s, h = (22 - i * 6) * s * f; g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * 1.1, y - h * .5, x + Math.sin(RT * 7 + i + seed) * 3, y - h); g.quadraticCurveTo(x + w * 1.1, y - h * .5, x + w, y); g.quadraticCurveTo(x, y + w * .7, x - w, y); g.fillStyle = ['#c8502a', '#e08a3a', '#f4d47c'][i]; g.fill(); }
}
function drawFissure(o) {
  const big = o.type === 'bigfissure', s = big ? 2.3 : 1, x = o.x, y = o.y, pul = .5 + .5 * Math.sin(RT * 1.6 + o.id);
  g.lineWidth = 2;
  if (o.sealed) { for (let i = 0; i < (big ? 16 : 8); i++) { const a = i * 2.4, r = (8 + (i * 7 % 22)) * s; ell(x + Math.cos(a) * r, y + Math.sin(a) * r * .55, 10 * s * .7, 7 * s * .7, i % 2 ? '#5c5a60' : '#6c6a70', OL); } return; }
  const gr = g.createRadialGradient(x, y, 4, x, y, 80 * s); gr.addColorStop(0, `rgba(200,40,70,${.3 + pul * .2})`); gr.addColorStop(1, 'rgba(200,40,70,0)'); g.fillStyle = gr; g.fillRect(x - 80 * s, y - 80 * s, 160 * s, 160 * s);
  const pts = [[-44, 0], [-30, -9], [-16, -4], [-4, -14], [10, -6], [26, -12], [44, -2], [30, 7], [14, 3], [2, 13], [-12, 6], [-28, 10]];
  g.lineCap = 'round'; for (let i = 0; i < pts.length; i += 2) { const p = pts[i], a = Math.atan2(p[1], p[0]) + Math.sin(RT + i) * .2, L = (16 + (i * 5 % 9)) * s; seg([x + p[0] * s, y + p[1] * s, x + p[0] * s + Math.cos(a) * L, y + p[1] * s + Math.sin(a) * L * .6], 4 * s, FD); }
  g.beginPath(); pts.forEach((p, i) => { const px = x + p[0] * s, py = y + p[1] * s; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.fillStyle = '#0c060a'; g.fill(); g.strokeStyle = FD; g.lineWidth = 5; g.stroke(); g.strokeStyle = FL; g.lineWidth = 1.5; g.stroke();
  g.beginPath(); pts.forEach((p, i) => { const px = x + p[0] * s * .6, py = y + p[1] * s * .5; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.fillStyle = `rgba(220,50,80,${.35 + pul * .35})`; g.fill();
  g.fillStyle = BN; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length], mx = x + (p[0] + q[0]) / 2 * s, my = y + (p[1] + q[1]) / 2 * s; g.beginPath(); g.moveTo(mx - 2 * s, my); g.lineTo(mx - (p[0] + q[0]) * .04 * s, my - (p[1] + q[1]) * .12 * s); g.lineTo(mx + 2 * s, my); g.fill(); }
  if (RDT > 0 && G.state === 'play' && Math.random() < .2) G.parts.push({ x: x + rand(-30, 30) * s, y: y + rand(-6, 6) * s, vx: rand(-6, 6), vy: rand(-45, -20), life: 1, max: 1, c: '#e06a7a', s: rand(1.5, 3.5), glow: 1 });
}
function bar(x, y, w, f, c) { rr(x - w / 2 - 1, y - 1, w + 2, 6, 2, 'rgba(8,6,10,.7)'); if (f > 0) rr(x - w / 2, y, w * clamp(f, 0, 1), 4, 1, c); }
function label(s, x, y, c) { g.font = `600 12px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3.5; g.strokeStyle = 'rgba(8,6,10,.85)'; g.strokeText(s, x, y); g.fillStyle = c || '#e8e0d0'; g.fillText(s, x, y); }

/* ===================== PERSONAGENS ===================== */
function drawHuman(x, y, ang, o) {
  const bob = o.moving ? Math.sin(o.walkT || 0) * 1.5 : 0, fx = Math.cos(ang), fy = Math.sin(ang);
  shadow(x, y + 13, 12, 5); g.lineWidth = 2.5;
  const st = o.moving ? Math.sin(o.walkT) * 4 : 0, pants = o.pants || '#2e3038';
  rr(x - 8, y + 4 + st * .4, 6, 10, 2, pants, OL); rr(x + 2, y + 4 - st * .4, 6, 10, 2, pants, OL);
  if (o.pack) rr(x - 7 - fx * 8, y - 8 - fy * 4 + bob, 14, 15, 3, '#4a3626', OL);
  rr(x - 9, y - 10 + bob, 18, 19, 5, o.shirt, OL);
  g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x - 8 + (fx > 0 ? 0 : 9), y - 8 + bob, 7, 15);
  if (o.armor) { rr(x - 8, y - 8 + bob, 16, 12, 3, o.armor, OL); }
  if (o.growth) { g.lineWidth = 1.5; circ(x - 7, y - 8 + bob, 6, FL, OL); circ(x - 10, y - 2 + bob, 4, FH2, OL); circ(x - 4, y - 12 + bob, 3.5, FD, OL); g.lineWidth = 2.5; }
  const hy = y - 17 + bob;
  if (o.style === 'longo') { g.lineWidth = 1.4; rr(x - 10, hy - 6, 20, 18, 7, o.hair, OL); g.lineWidth = 2.5; }
  circ(x, hy, 8.5, o.skin, OL);
  if (o.style === 'raspado') { g.globalAlpha = .45; g.beginPath(); g.arc(x, hy, 8, Math.PI * 1.05, Math.PI * 1.95); g.lineWidth = 3; g.strokeStyle = o.hair; g.stroke(); g.globalAlpha = 1; g.lineWidth = 2.5; }
  else if (o.style !== 'bone') {
  g.beginPath(); g.arc(x, hy, 8.5, Math.PI * 1.02 - fx * .25, Math.PI * 1.98 - fx * .25); g.quadraticCurveTo(x - fx * 2, hy - 3 + fy * 4, x - 8.5 * Math.cos(.06 + fx * .25), hy - 8.5 * Math.sin(.06)); g.fillStyle = o.hair; g.fill();
  if (fy < -.35) { g.beginPath(); g.arc(x, hy, 8, Math.PI * .9, Math.PI * 2.1); g.fillStyle = o.hair; g.fill(); }
  }
  if (fy > -.55) { const ex = fx * 2.8, ey = 1 + fy * 1.8; g.fillStyle = o.eye || OL; g.fillRect(x - 4.4 + ex, hy + ey - .8, 2.6, 2); g.fillRect(x + 1.8 + ex, hy + ey - .8, 2.6, 2); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x - 4.8 + ex, hy + ey + 1.6, 3.4, 1.2); g.fillRect(x + 1.4 + ex, hy + ey + 1.6, 3.4, 1.2); if (o.glasses) { g.strokeStyle = '#c8ced8'; g.lineWidth = 1; g.strokeRect(x - 5.4 + ex, hy + ey - 2, 4.4, 4); g.strokeRect(x + 1 + ex, hy + ey - 2, 4.4, 4); } }
  if (o.style === 'longo' && fy > -.5) { for (const sx of [-1, 1]) if (fx * sx < .6) rr(x + sx * 6.2 - 1.8, hy - 3, 3.6, 11, 1.6, o.hair); }
  if (o.style === 'bone') { const cc = o.shirt; g.lineWidth = 2; g.beginPath(); g.arc(x, hy - .5, 8.9, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fillStyle = cc; g.fill(); g.strokeStyle = OL; g.stroke(); if (fy > -.5) { g.lineWidth = 1.6; ell(x + fx * 7, hy - 4.5 + fy * 1.2, 4.5 + 4.5 * Math.abs(fy), 2.3, cc, OL); } circ(x, hy - 8.6, 1.4, 'rgba(0,0,0,.35)'); g.lineWidth = 2.5; }
  if (o.hat) { g.lineWidth = 2; ell(x, hy - 5, 12, 4, o.hat, OL); rr(x - 6.5, hy - 12, 13, 8, 3, o.hat, OL); }
}
function drawHeld(it, x, y, ang, sw, draw) {
  g.save(); g.translate(x, y);
  let a = ang, push = 0;
  if (sw) { const k = sw.t / sw.dur, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; if (it.kind === 'thrust') push = Math.sin(k * Math.PI) * 22; else { const arc = it.arc || 1.2; a = sw.ang + (-arc / 2 + arc * e) * (it.id === 'punho' ? .3 : 1); if (it.id !== 'punho') { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, it.range * .85, sw.ang - arc / 2, a); g.closePath(); g.fillStyle = `rgba(230,225,215,${.16 * (1 - k)})`; g.fill(); } else push = Math.sin(k * Math.PI) * 10; } }
  g.rotate(a); g.translate(11 + push, 0); g.lineCap = 'round';
  const line = (x0, x1, w, c) => { seg([x0, 0, x1, 0], w + 3, OL); seg([x0, 0, x1, 0], w, c); };
  const metal = it.iron ? '#b0b4c0' : '#7c8088', wood = '#6e5238'; g.lineWidth = 1.5;
  switch (it.held) {
    case 'knife': line(0, 5, 3, wood); poly([5, -3, 17, 0, 5, 3], '#b0b4c0', OL); break;
    case 'club': line(0, 22, 4, wood); line(13, 22, 6, '#86683f'); if (it.iron) for (let i = 0; i < 3; i++) seg([14 + i * 3.5, -5, 14 + i * 3.5, 5], 1.2, '#b0b4c0'); break;
    case 'axe': line(0, 22, 3, it.red ? '#a83030' : wood); poly([15, -2, 18, -11, 27, -8, 25, 0, 22, -1], metal, OL); break;
    case 'pick': line(0, 22, 3, wood); g.strokeStyle = OL; g.lineWidth = 6.5; g.beginPath(); g.arc(12, 0, 12, -1.1, 1.1); g.stroke(); g.strokeStyle = metal; g.lineWidth = 3; g.stroke(); break;
    case 'spear': line(-14, 34, 3, wood); poly([32, -4.5, 46, 0, 32, 4.5], it.cristal ? '#b088c4' : it.iron ? '#b0b4c0' : '#687084', OL); if (it.cristal) { g.save(); g.globalAlpha = .35 + .2 * Math.sin(RT * 4); circ(40, 0, 7, '#c8a0e8'); g.restore(); } break;
    case 'fork': line(-14, 36, 3, it.iron ? '#3a5a66' : wood); seg([36, -8, 36, 8], 2.5, OL); for (const yy of [-7, 0, 7]) { seg([36, yy, 48, yy], 4, OL); seg([36, yy, 48, yy], 2, '#b0b4c0'); } break;
    case 'bat': line(0, 8, 3, '#3a281a'); line(8, 26, 5.5, it.zap ? '#565a64' : '#a8845a'); if (it.zap && Math.random() < .5) { seg([26, -4, 30, 2, 27, 5, 32, 9], 1.5, '#aef4ff'); } break;
    case 'chainsaw': { rr(-4, -6, 16, 12, 3, '#c8843a', OL); rr(12, -3.5, 28, 7, 3.5, '#b0b4c0', OL); const k = (RT * 40) % 4; for (let i = 0; i < 6; i++) circ(14 + i * 4.4 + k, -3.5, 1, OL); break; }
    case 'sling': seg([0, 0, 10, 0], 5, OL); seg([0, 0, 10, 0], 3, wood); seg([10, 0, 18, -6], 4.5, OL); seg([10, 0, 18, 6], 4.5, OL); seg([10, 0, 18, -6], 2.5, wood); seg([10, 0, 18, 6], 2.5, wood); seg([18, -6, 14 - (draw || 0) * 6, 0, 18, 6], 1.2, '#c4ccd4'); break;
    case 'machete': line(0, 6, 4, '#3a281a'); poly([6, -2, 26, -5, 33, -2, 30, 3, 6, 3], it.cristal ? '#b088c4' : '#c8ced8', OL); break;
    case 'sickle': line(0, 14, 3, wood); g.strokeStyle = OL; g.lineWidth = 6; g.beginPath(); g.arc(20, -4, 10, 1.4, 5.2); g.stroke(); g.strokeStyle = '#b0b4c0'; g.lineWidth = 2.8; g.stroke(); break;
    case 'sledge': line(0, 26, 3.5, wood); rr(22, -9, 11, 18, 2, '#7e828e', OL); break;
    case 'torch': line(0, 16, 3, wood); g.rotate(-a); drawFlame(Math.cos(a) * 18, Math.sin(a) * 18 + 4, .55, 3); break;
    case 'rod': line(0, 34, 1.8, wood); seg([34, 0, 40, 8], 1, 'rgba(220,220,220,.7)'); break;
    case 'bow': { const d = (draw || 0) * 9; g.strokeStyle = OL; g.lineWidth = 6; g.beginPath(); g.arc(-2, 0, 15, -1.25, 1.25); g.stroke(); g.strokeStyle = wood; g.lineWidth = 3; g.stroke(); const sx = -2 + Math.cos(1.25) * 15, sy = Math.sin(1.25) * 15; seg([sx, -sy, sx - d, 0, sx, sy], 1.2, '#d4ccb4'); if (draw > 0) { seg([sx - d, 0, sx - d + 24, 0], 2, '#86683f'); poly([sx - d + 22, -3, sx - d + 29, 0, sx - d + 22, 3], '#687084', OL); } break; }
    case 'crossbow': rr(-4, -2.5, 24, 5, 1, wood, OL); g.strokeStyle = OL; g.lineWidth = 5.5; g.beginPath(); g.arc(8, 0, 13, -1, 1); g.stroke(); g.strokeStyle = '#7e828e'; g.lineWidth = 2.5; g.stroke(); seg([15, -11, 15, 11], 1, '#d4ccb4'); break;
    case 'pistol': rr(0, -3, 14, 6, 1.5, '#34363e', OL); rr(0, 0, 5, 7, 1.5, '#583a22', OL); break;
    case 'smg': rr(-2, -3, 22, 6, 1.5, '#34363e', OL); rr(6, 2, 4, 9, 1, '#34363e', OL); rr(-2, 1, 4, 6, 1, '#34363e', OL); break;
    case 'shotgun': rr(-6, -2.5, 12, 6, 2, '#583a22', OL); rr(6, -3, 24, 3, 1, '#565a64', OL); rr(6, 0, 24, 3, 1, '#565a64', OL); break;
    case 'rifle': rr(-8, -2.5, 16, 6, 2, '#583a22', OL); rr(8, -2, 28, 4, 1.5, '#34363e', OL); rr(8, -6, 10, 3, 1.5, '#141018'); break;
    default: if (it.ic) { g.rotate(-a); icon(it.id, Math.cos(a) * 4, Math.sin(a) * 4, 16); }
  }
  if (it.kind === 'gun' && !it.bolt && P.flash > 0) { const L = it.held === 'pistol' ? 16 : it.held === 'smg' ? 22 : 34; poly([L, 0, L + 10, -8, L + 22, 0, L + 10, 8], '#f4e0a0'); circ(L + 6, 0, 6, '#e08a3a'); }
  g.restore();
}
const PL = { skin: '#c8a288', hair: '#3a2a22', shirt: '#3a4250', pants: '#2a2c34' };
function plook(lk) { const L = lk || P.look || {}; return { skin: L.skin || PL.skin, hair: L.hair || PL.hair, shirt: L.shirt || PL.shirt, pants: L.pants || PL.pants, style: L.style || 'curto' }; }
// desenha o personagem num canvas à parte (tela de criação, retratos)
function drawPreview(cvp, lk, ang, scale, cy) { const c2 = cvp.getContext('2d'), old = g; g = c2; c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, cvp.width, cvp.height); c2.lineJoin = c2.lineCap = 'round'; c2.translate(cvp.width / 2, cy === undefined ? cvp.height * .66 : cy); const s = scale || cvp.height / 44; c2.scale(s, s); try { drawHuman(0, 0, ang, plook(lk)); } catch (e) { } g = old; }
function drawPlayer() {
  if (CS.hideP) return;
  const x = P.x, y = P.y;
  if (P.driving) return;
  if (P.sleeping) { g.save(); g.translate(x, y); g.rotate(-1.57); drawHuman(0, 0, 1.57, plook()); g.restore(); g.font = `600 15px ${FONT}`; g.fillStyle = '#b0a8c8'; g.textAlign = 'center'; for (let i = 0; i < 3; i++) { const k = (RT * .6 + i / 3) % 1; g.globalAlpha = 1 - k; g.fillText('z', x + 14 + k * 14 + Math.sin(k * 6) * 3, y - 16 - k * 26); } g.globalAlpha = 1; return; }
  const it = curItem() || FIST, back = Math.sin(P.ang) < -.2;
  g.save();
  if (P.roll > 0) { g.translate(x, y); g.rotate((1 - P.roll / .26) * 6.28 * (P.rdx < 0 ? -1 : 1)); g.scale(.85, .85); g.translate(-x, -y); }
  if (P.inv_t > 0 && P.roll <= 0 && Math.sin(RT * 50) > 0) g.globalAlpha = .5;
  const hx = x, hy = y - 2;
  if (back && P.roll <= 0) drawHeld(it, hx, hy, P.ang, P.swing, P.draw);
  drawHuman(x, y, P.ang, Object.assign({ moving: P.moving, walkT: P.walkT, pack: P.pack, armor: P.armor ? ({ jaqueta: '#4a4e5c', colete_couro: '#765030', armadura_quitina: '#c4b89c', armadura_placas: '#7e828e', colete_balistico: '#3a4a34' }[P.armor]) : null }, plook()));
  if (!back && P.roll <= 0) drawHeld(it, hx, hy, P.ang, P.swing, P.draw);
  g.restore();
}
function drawCar(c) {
  g.save(); g.translate(c.x, c.y); shadow(0, 10, 38, 14); g.rotate(c.ang); g.lineWidth = 2.5;
  g.fillStyle = '#0c0a0e'; for (const [wx, wy] of [[-24, -18], [14, -18], [-24, 13], [14, 13]]) g.fillRect(wx, wy, 12, 5);
  rr(-34, -15, 68, 30, 5, c.fixed ? '#6e3028' : '#4e3632', OL); rr(-32, -12, 26, 24, 2, '#2a1c1a', OL); for (let i = 0; i < 4; i++) seg([-28 + i * 6, -11, -28 + i * 6, 11], 1, 'rgba(0,0,0,.35)');
  rr(-6, -14, 22, 28, 4, c.fixed ? '#5a2620' : '#40302c', OL); rr(10, -11, 6, 22, 2, '#3a4e56', OL); rr(-5, -11, 4, 22, 1, '#2a3a40'); seg([11, -8, 15, -2], 1.2, 'rgba(210,225,225,.45)');
  seg([20, -12, 20, 12], 1.5, 'rgba(0,0,0,.3)'); g.fillStyle = 'rgba(90,40,20,.55)'; g.beginPath(); g.ellipse(26, 6, 6, 4, .5, 0, 6.3); g.fill(); g.beginPath(); g.ellipse(-20, -13, 7, 2.5, 0, 0, 6.3); g.fill();
  const on = P.driving; g.lineWidth = 1.5; circ(33, -10, 3, on ? '#f4e8b0' : '#56524a', OL); circ(33, 10, 3, on ? '#f4e8b0' : '#56524a', OL); g.fillStyle = on && c.spd < -5 ? '#e8e0d0' : '#6a1c1c'; g.fillRect(-35, -12, 2.5, 5); g.fillRect(-35, 7, 2.5, 5);
  if (!c.fixed) { rr(17, -13, 16, 26, 2, '#2a2224', OL); seg([20, -8, 30, -8], 2, '#56524a'); seg([20, 0, 30, 0], 2, '#56524a'); }
  g.restore();
  if (P.driving && darkness() > .1) { const fx = Math.cos(c.ang), fy = Math.sin(c.ang), m = lightMul(); lights.push([c.x + fx * 90, c.y + fy * 90, 130 * m, 1], [c.x + fx * 210, c.y + fy * 210, 180 * m, .95], [c.x + fx * 340, c.y + fy * 340, 150 * m, .6], [c.x, c.y, 90, .7]); }
}
function mimicShape(x, y, a, open, ph) {
  const sway = Math.sin(RT * 1.2 + ph) * 1.5; g.lineWidth = 2.5; g.lineCap = 'round';
  shadow(x, y + 10, 10, 4);
  seg([x - 4, y + 10, x - 3, y - 14], 6.5, OL); seg([x + 4, y + 10, x + 3, y - 14], 6.5, OL); seg([x - 4, y + 10, x - 3, y - 14], 3.5, '#1e161c'); seg([x + 4, y + 10, x + 3, y - 14], 3.5, '#1e161c');
  rr(x - 7 + sway * .3, y - 46, 14, 34, 6, '#241a20', OL);
  for (const s of [-1, 1]) { seg([x + s * 7 + sway * .3, y - 40, x + s * 11 + sway, y - 12, x + s * 9 + sway, y + 6], 5.5, OL); seg([x + s * 7 + sway * .3, y - 40, x + s * 11 + sway, y - 12, x + s * 9 + sway, y + 6], 2.8, '#241a20'); seg([x + s * 9 + sway, y + 6, x + s * 12 + sway, y + 14], 2, BND); seg([x + s * 9 + sway, y + 6, x + s * 7 + sway, y + 14], 2, BND); }
  const hx = x + sway * .6, hy = y - 54; ell(hx, hy, 6.5, 8.5, '#c8beb0', OL);
  if (open) { ell(hx, hy + 1, 3.5, 6, '#3a0a14', OL); g.fillStyle = BN; for (let i = 0; i < 4; i++) { g.fillRect(hx - 3 + i * 1.8, hy - 4, 1, 3); g.fillRect(hx - 3 + i * 1.8, hy + 3, 1, 3); } }
  else seg([hx, hy - 4, hx, hy + 5], 1.5, '#3a0a14');
}
function drawEnemy(e) {
  const x = e.x, y = e.y, r = e.r, t = e.type, fl = e.flash > 0; let sc = 1;
  if (e.state === 'burrow') { ell(x, y, 16, 9, '#3a3034', OL); ell(x - 3, y - 2, 7, 4, '#4e4248'); return; }
  if (e.state === 'surface') { const k = 1 - e.t / .65; g.strokeStyle = `rgba(220,60,70,${.5 + k * .4})`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 50, 0, 6.3); g.stroke(); circ(x, y, 50 * k, 'rgba(220,60,70,.22)'); ell(x, y, 16, 9, '#3a3034', OL); return; }
  if (e.state === 'emerge') { sc = clamp(1 - e.t / .8, .05, 1); ell(x, y + r * .5, r * 1.5, r * .7, '#2a2024'); }
  if (e.state === 'leave') { sc = clamp(e.t / .9, .05, 1); ell(x, y + r * .5, r * 1.5, r * .7, '#2a2024'); }
  if (e.state === 'wind' || e.state === 'windc') sc *= 1 + Math.sin(RT * 40) * .05;
  if (e.state === 'windc') { g.save(); g.translate(x, y); g.rotate(e.ang); g.fillStyle = `rgba(220,50,60,${.12 + .22 * (1 - e.t / .75)})`; g.fillRect(0, -r, 360, r * 2); g.restore(); }
  if (e.state === 'wind' && e.def.reaper) { g.beginPath(); g.arc(x, y, e.reach, 0, 6.3); g.fillStyle = `rgba(220,50,60,${.1 + .2 * (1 - e.t / .8)})`; g.fill(); g.strokeStyle = 'rgba(220,60,70,.7)'; g.lineWidth = 2.5; g.stroke(); }
  if (e.slam) { const k = 1 - e.slam.t / 1.05; g.strokeStyle = 'rgba(220,60,110,.8)'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, e.slam.r, 0, 6.3); g.stroke(); circ(x, y, e.slam.r * k, 'rgba(220,60,110,.2)'); }
  const F = c => fl ? '#f0e8e0' : c, wig = Math.sin(e.anim * 14);
  if (t === 'verme') { const tr = e.trail || []; g.lineWidth = 2; for (let i = tr.length - 1; i >= 0; i--) { const rr2 = r * (.9 - i * .07); circ(tr[i][0], tr[i][1], rr2, F(i % 2 ? FD : FL), OL); } }
  if (t === 'imitador') { if (sc < 1) { g.save(); g.translate(x, y); g.scale(1, sc); g.translate(-x, -y); } if (fl) g.globalAlpha = .7; mimicShape(x, y, e.ang, e.state === 'wind' || e.fury > 0, e.anim); g.globalAlpha = 1; if (sc < 1) g.restore(); if (e.hp < e.maxhp) bar(x, y - 70, 30, e.hp / e.maxhp, '#c8484e'); return; }
  shadow(x, y + r * .8, r * 1.1, r * .4);
  g.save(); g.translate(x, y); g.scale(sc, sc); g.lineWidth = 2.5; g.lineCap = 'round';
  const lx = e.lunge > 0 ? Math.cos(e.ang) * 8 : 0, ly = e.lunge > 0 ? Math.sin(e.ang) * 8 : 0; g.translate(lx, ly);
  const teeth = (cx, cy, rad, n) => { g.fillStyle = BN; for (let i = 0; i < n; i++) { const a = i / n * 6.28; g.beginPath(); g.moveTo(cx + Math.cos(a - .2) * rad, cy + Math.sin(a - .2) * rad); g.lineTo(cx + Math.cos(a) * rad * .4, cy + Math.sin(a) * rad * .4); g.lineTo(cx + Math.cos(a + .2) * rad, cy + Math.sin(a + .2) * rad); g.fill(); } };
  const eye = (ex, ey, er, fx, fy) => { circ(ex, ey, er, '#d8d0c0', OL); circ(ex + fx * er * .35, ey + fy * er * .35, er * .5, '#1a0a10'); };
  if (t === 'larva' || t === 'rastejante' || t === 'escavador' || t === 'verme') {
    g.rotate(e.ang);
    if (t === 'larva') { g.lineWidth = 1.8; seg([-12, Math.sin(e.anim * 12) * 3, -5, 0], 3, FD); circ(-4, Math.sin(e.anim * 12 + 1) * 2, 5, F(FD), OL); circ(1, 0, 6.5, F(FL), OL); circ(-1, -2, 2, FH2); circ(5, 0, 3.6, '#2a0a10', OL); teeth(5, 0, 3.4, 6); }
    else if (t === 'verme') { circ(0, 0, r, F(FL), OL); poly([4, -7, 15, -4 - wig * 2, 6, 0, 15, 4 + wig * 2, 4, 7], '#2a0a10', OL); g.fillStyle = BN; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(7, s * 5); g.lineTo(13, s * (3 + wig)); g.lineTo(9, s * 2); g.fill(); } circ(-2, -4, 1.6, '#e8d060'); circ(-2, 4, 1.6, '#e8d060'); }
    else if (t === 'rastejante') {
      for (const s of [-1, 1]) for (const [bx, k] of [[6, 1], [-8, -1]]) { const w = wig * 4 * k * s; seg([bx, s * 5, bx + 3 + w, s * 15, bx + 9 + w, s * 20], 6, OL); seg([bx, s * 5, bx + 3 + w, s * 15, bx + 9 + w, s * 20], 3, F(FH2)); }
      ell(-2, 0, 14, 8.5, F(FL), OL); g.lineWidth = 1.6; for (let i = -2; i <= 1; i++) { g.strokeStyle = BN; g.beginPath(); g.arc(i * 5 - 1, 0, 7, -1.1, 1.1); g.stroke(); } seg([-12, 0, 6, 0], 1.6, BND); g.lineWidth = 2.5;
      ell(12, 0, 7, 6, F('#cfc6b0'), OL); circ(13, -2.8, 2, '#1a0a10'); circ(13, 2.8, 2, '#1a0a10'); circ(13.4, -2.8, .8, '#e04a4a'); circ(13.4, 2.8, .8, '#e04a4a'); seg([16, -3, 19, -1 - wig, 16, 0, 19, 1 + wig, 16, 3], 1.5, OL);
    } else {
      for (let i = 2; i >= 0; i--) { ell(-i * 9 + 4, Math.sin(e.anim * 8 + i) * 2, 11 - i * 1.5, 10 - i * 1.5, F(i % 2 ? FD : FL), OL); g.lineWidth = 2; g.strokeStyle = BN; g.beginPath(); g.arc(-i * 9 + 4, Math.sin(e.anim * 8 + i) * 2, 8 - i, -1.2, 1.2); g.stroke(); g.lineWidth = 2.5; }
      circ(11, 0, 8, F(FL), OL); circ(14, 0, 4, '#2a0a10', OL); teeth(14, 0, 3.8, 6);
      for (const s of [-1, 1]) poly([8, s * 8, 24 + wig * 2, s * (13 + wig * 2 * s), 20, s * 7, 13, s * 5], BN, OL);
    }
  } else if (t === 'cuspidor') {
    const fx = Math.cos(e.ang), fy = Math.sin(e.ang), p = 1 + Math.sin(e.anim * 4) * .08 + (e.state === 'wind' ? .25 : 0);
    for (const s of [-1, 1]) { seg([s * 6, 6, s * 11, 13], 6, OL); seg([s * 6, 6, s * 11, 13], 3, FH2); }
    circ(0, 2, 11, F(FL), OL); circ(-fx * 3, -7 - fy * 2, 11 * p, fl ? '#f0e8e0' : 'rgba(150,160,60,.92)', OL); g.strokeStyle = 'rgba(90,30,30,.6)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-fx * 3 - 6, -4); g.quadraticCurveTo(-fx * 3, -12 * p, -fx * 3 + 5, -15 * p); g.moveTo(-fx * 3 + 6, -3); g.quadraticCurveTo(-fx * 3 + 3, -9, -fx * 3 - 3, -14 * p); g.stroke(); circ(-fx * 3 - 3, -11 * p, 2.5, 'rgba(230,235,170,.5)'); g.lineWidth = 2;
    eye(fx * 5, 3 + fy * 3, 4.5, fx, fy); ell(fx * 8, 10 + fy * 2, 3.5, 2.5, '#2a0a10', OL);
  } else if (t === 'hospedeiro') {
    const lurch = e.rage ? Math.sin(e.anim * 16) * 2 : Math.sin(e.anim * 3) * 2.5; g.translate(lurch, 0); g.rotate(e.rage ? Math.cos(e.ang) * .12 : Math.sin(e.anim * 3) * .08);
    drawHuman(0, 0, e.ang, { skin: fl ? '#f0e8e0' : '#8a8c84', hair: '#2a2428', shirt: ['#4a4a44', '#5a4a44', '#3e4a52', '#4a5240'][e.anim * 0 + (Math.floor(e.hx) % 4)], pants: '#2a2a2e', moving: true, walkT: e.anim * (e.rage ? 14 : 5), growth: 1, eye: '#e8d8c8' });
    g.lineWidth = 2; const a = e.ang; seg([0, -4, Math.cos(a) * 14, -4 + Math.sin(a) * 10 + (e.rage ? 0 : 6)], 5.5, OL); seg([0, -4, Math.cos(a) * 14, -4 + Math.sin(a) * 10 + (e.rage ? 0 : 6)], 2.8, FL);
  } else if (t === 'bruto' || t === 'alfa') {
    const alfa = t === 'alfa', fx = Math.cos(e.ang), fy = Math.sin(e.ang), cr = '#9a5ab0';
    for (let i = -2; i <= 2; i++) { const a = -1.57 + i * .42 - fx * .4, bx = Math.cos(a) * r * .8, by = Math.sin(a) * r * .8, L = r * (.7 - Math.abs(i) * .12); poly([bx - 5, by + 3, bx + Math.cos(a) * L, by + Math.sin(a) * L, bx + 5, by + 3], fl ? '#f0e8e0' : alfa ? cr : BN, OL); }
    for (const s of [-1, 1]) { circ(s * (r + 2) + fx * 5, 5 + wig * 2 * s + fy * 6, r * .38, F(FD), OL); g.lineWidth = 1.5; seg([s * (r + 2) + fx * 5 - 3, 3 + wig * 2 * s + fy * 6, s * (r + 2) + fx * 5 + 3, 3 + wig * 2 * s + fy * 6], 1.5, BND); g.lineWidth = 2.5; }
    circ(0, 0, r, F(FL), OL); ell(-r * .3, -r * .2, r * .45, r * .35, F(FH2)); ell(r * .35, r * .3, r * .4, r * .3, F(FD)); g.strokeStyle = FD; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-r * .7, r * .2); g.quadraticCurveTo(0, r * .5, r * .2, -r * .1); g.moveTo(-r * .1, -r * .7); g.quadraticCurveTo(r * .3, -r * .3, r * .7, -r * .1); g.stroke(); g.lineWidth = 2;
    for (const [ax, ay] of [[-r * .55, r * .5], [r * .5, r * .62], [0, r * .78]]) { seg([ax, ay, ax + Math.sin(e.anim * 3 + ax) * 3, ay + 7], 4.5, OL); seg([ax, ay, ax + Math.sin(e.anim * 3 + ax) * 3, ay + 7], 2.2, FH2); }
    if (alfa) circ(0, r * .15, 6 + Math.sin(RT * 5) * 1.5, '#aef4ff', '#4ab8d8');
    const ex = fx * r * .3, ey = -r * .28 + fy * r * .25; eye(-r * .3 + ex, ey, r * .14, fx, fy); eye(r * .28 + ex, ey - 2, r * .11, fx, fy); eye(ex + 1, ey + r * .22, r * .08, fx, fy);
    ell(ex, ey + r * .55, r * .3, r * .16, '#2a0a10', OL); g.fillStyle = BN; for (let i = -2; i <= 2; i++) g.fillRect(ex + i * r * .11 - 1, ey + r * .45, 2, r * .12);
    if (e.stun > .3) { for (let i = 0; i < 3; i++) circ(Math.cos(RT * 5 + i * 2.1) * r * .7, -r - 6 + Math.sin(RT * 5 + i * 2.1) * 4, 2.5, '#e0c060', OL); }
  } else if (t === 'aglomerado') {
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28 + Math.sin(e.anim * 2 + i) * .2, L = r * 1.2 + wig * 3 * (i % 2 ? 1 : -1), p = [Math.cos(a) * r * .6, Math.sin(a) * r * .6, Math.cos(a + .25) * L, Math.sin(a + .25) * L]; seg(p, 6.5, OL); seg(p, 3.2, F(i % 3 ? FH2 : '#8a8c84')); }
    for (const [bx, by, br] of [[-8, -6, 13], [9, -4, 12], [0, 7, 14], [-11, 8, 9], [12, 9, 9], [2, -13, 9]]) circ(bx + Math.sin(e.anim * 3 + bx) * 1.5, by + Math.cos(e.anim * 2.6 + by) * 1.5, br * r / 21, F(bx > 0 ? FL : FD), OL);
    for (const [fx2, fy2, fs] of [[-8, -7, 1], [9, -5, .85], [1, 8, .9]]) { const x2 = fx2 * r / 21, y2 = fy2 * r / 21; ell(x2, y2, 4.6 * fs, 5.6 * fs, F('#b8aa98'), OL); circ(x2 - 1.6 * fs, y2 - 1 * fs, 1.1 * fs, OL); circ(x2 + 1.6 * fs, y2 - 1 * fs, 1.1 * fs, OL); ell(x2, y2 + 2.5 * fs, 1.6 * fs, 1.3 * fs, '#2a0a10'); }
    eye(-1, -1, 3.4, Math.cos(e.ang), Math.sin(e.ang)); eye(6, 4, 2.4, Math.cos(e.ang), Math.sin(e.ang));
  } else if (t === 'saltador') {
    g.rotate(e.ang); const cr = e.state === 'windl' ? .72 : e.state === 'leap' ? 1.3 : 1; g.scale(cr, 1 / cr * .8 + .2);
    for (const s of [-1, 1]) { const lg = [-4, s * 5, -17, s * 14, -6, s * 19, -21, s * 22]; seg(lg, 6, OL); seg(lg, 2.8, F('#8a8c84')); const ar = [6, s * 5, 13, s * 12, 17, s * 10]; seg(ar, 5, OL); seg(ar, 2.2, F('#8a8c84')); }
    ell(0, 0, 12, 7, F('#9a9c90'), OL); g.strokeStyle = BND; g.lineWidth = 1.3; g.beginPath(); for (let i = -1; i <= 1; i++) { g.moveTo(-6 + i * 5, -5); g.lineTo(-6 + i * 5, 5); } g.stroke(); g.lineWidth = 2.5;
    ell(13, 0, 6, 5.5, F('#b8aa98'), OL); ell(17, 0, 4, 4.5, '#2a0a10', OL); teeth(17, 0, 4, 8); circ(12, -3, 1.4, '#e04a4a'); circ(12, 3, 1.4, '#e04a4a');
  } else if (t === 'gritador') {
    const op = e.state === 'wind' && e.atk === 'scream' ? 1 - e.t / .7 : .15 + .1 * Math.sin(e.anim * 3);
    for (const s of [-1, 1]) { const ar = [s * 9, -4, s * 17, 4 + wig * 2, s * 13, 14]; seg(ar, 4.5, OL); seg(ar, 2.2, F(FH2)); }
    ell(0, 0, 12, 16, F(FL), OL); ell(-4, -6, 4, 7, F(FH2));
    ell(0, 1, 4 + op * 5, 6 + op * 9, '#1a0408', OL); teeth(0, 1, Math.min(5 + op * 5, 9), 10);
    g.strokeStyle = FD; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-10, -8); g.quadraticCurveTo(-6, 0, -10, 10); g.moveTo(10, -8); g.quadraticCurveTo(6, 0, 10, 10); g.stroke(); g.lineWidth = 2.5;
    for (const [ex, ey] of [[-6, -12], [6, -13], [0, -16]]) eye(ex, ey, 2.4, Math.cos(e.ang), Math.sin(e.ang));
    if (op > .5) { g.strokeStyle = `rgba(220,70,90,${op * .5})`; g.lineWidth = 2; for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(0, 0, 16 + i * 8 * op, 0, 6.3); g.stroke(); } g.lineWidth = 2.5; }
  } else if (t === 'costurado') {
    g.scale(1.35, 1.35); g.translate(Math.sin(e.anim * (e.fury > 0 ? 16 : 6)) * 1.5, 0);
    drawHuman(0, 0, e.ang, { skin: fl ? '#f0e8e0' : '#9a8a80', hair: '#1e161a', shirt: '#5a3a34', pants: '#2a2228', moving: true, walkT: e.anim * (e.fury > 0 ? 14 : 6), growth: 1, eye: '#e04a4a' });
    g.strokeStyle = '#e8dcc8'; g.lineWidth = .9; g.beginPath(); for (const [x0, y0, x1, y1] of [[-8, -8, 7, -2], [-5, -22, 5, -13], [-8, 2, 8, 6]]) { g.moveTo(x0, y0); g.lineTo(x1, y1); for (let k = 1; k < 5; k++) { const tx = x0 + (x1 - x0) * k / 5, ty = y0 + (y1 - y0) * k / 5; g.moveTo(tx - 1.4, ty - 2); g.lineTo(tx + 1.4, ty + 2); } } g.stroke(); g.lineWidth = 2.5;
    const a = e.ang, ex = [7, -4, 7 + Math.cos(a) * 14, 1 + Math.sin(a) * 10, 7 + Math.cos(a) * 20, 3 + Math.sin(a) * 13]; seg(ex, 6, OL); seg(ex, 3, F(FL));
  } else if (t === 'colhedor') {
    const st = Math.sin(e.anim * (e.state === 'chase' ? 3.2 : 1.6)) * 7, fx = Math.cos(e.ang), col = fl ? '#f0e8e0' : '#1c1418';
    for (const s of [-1, 1]) { seg([s * 8 + st * s, 14, s * 6, -30, s * 3, -64], 7, OL); seg([s * 8 + st * s, 14, s * 6, -30, s * 3, -64], 4, col); }
    rr(-11, -96, 22, 36, 8, col, OL); circ(-fx * 6, -78, 11, fl ? '#f0e8e0' : '#3a2428', OL); g.strokeStyle = FD; g.lineWidth = 1.4; g.beginPath(); g.arc(-fx * 6, -78, 7, 0, 4); g.stroke(); g.lineWidth = 2.5;
    for (const s of [-1, 1]) { const sw = e.state === 'wind' ? -18 * s : 0; seg([s * 10, -88, s * 20 + sw, -50, s * 24 + sw + fx * 6, -6], 6.5, OL); seg([s * 10, -88, s * 20 + sw, -50, s * 24 + sw + fx * 6, -6], 3.5, col); poly([s * 24 + sw + fx * 6 - 3, -8, s * 30 + sw + fx * 14, 16, s * 22 + sw + fx * 6, 10, s * 26 + sw + fx * 6, -6], BN, OL); }
    ell(fx * 3, -104, 7.5, 9, '#c8beb0', OL); circ(fx * 5, -105, 3.2, '#1a0a10'); circ(fx * 5.6, -105, 1.3, `rgba(255,${180 + Math.sin(RT * 3) * 40 | 0},120,.95)`);
  } else if (t === 'mae') {
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28 + Math.sin(RT + i) * .15, L = r * 1.5 + Math.sin(RT * 2 + i * 1.7) * 10; g.strokeStyle = OL; g.lineWidth = 12; g.beginPath(); g.moveTo(Math.cos(a) * r * .7, Math.sin(a) * r * .6); g.quadraticCurveTo(Math.cos(a + .3) * L * .8, Math.sin(a + .3) * L * .7, Math.cos(a + Math.sin(RT * 1.5 + i) * .4) * L, Math.sin(a + Math.sin(RT * 1.5 + i) * .4) * L * .8); g.stroke(); g.strokeStyle = F(i % 2 ? FL : FD); g.lineWidth = 7; g.stroke(); }
    g.lineWidth = 2.5; for (let i = -3; i <= 3; i++) { const a = -1.57 + i * .3, L = r * (.7 - Math.abs(i) * .1); poly([Math.cos(a) * r * .8 - 7, Math.sin(a) * r * .8 + 4, Math.cos(a) * (r * .8 + L), Math.sin(a) * (r * .8 + L), Math.cos(a) * r * .8 + 7, Math.sin(a) * r * .8 + 4], fl ? '#f0e8e0' : BN, OL); }
    circ(0, 0, r, F(FL), OL); ell(-r * .3, -r * .1, r * .5, r * .4, F(FH2)); ell(r * .3, r * .35, r * .45, r * .35, F(FD)); g.strokeStyle = FD; g.lineWidth = 2; g.beginPath(); g.moveTo(-r * .8, 0); g.quadraticCurveTo(-r * .2, r * .6, r * .5, -r * .5); g.moveTo(-r * .3, -r * .8); g.quadraticCurveTo(r * .2, -r * .2, r * .85, r * .1); g.stroke();
    const mo = 12 + Math.sin(RT * 3) * 3 + (e.state === 'wind' ? 9 : 0); ell(0, r * .35, 18, mo, '#1a0408', OL); teeth(0, r * .35, Math.min(17, mo), 12); ell(0, r * .35, 6, mo * .4, `rgba(230,60,90,${.4 + .3 * Math.sin(RT * 6)})`);
    const fx = Math.cos(e.ang), fy = Math.sin(e.ang); g.lineWidth = 2; for (const [ex, ey, er] of [[-22, -14, 7], [22, -14, 7], [0, -26, 9], [-36, 4, 5], [36, 4, 5], [-12, -38, 4], [12, -38, 4], [-30, -28, 3.5], [30, -28, 3.5]]) { if (Math.sin(RT * 1.3 + ex) > .96) { ell(ex, ey, er, 1, FD); continue; } eye(ex, ey, er, fx, fy); }
  } else if (t === 'lebre') {
    const f = Math.cos(e.ang) < 0 ? -1 : 1, hop = e.state === 'idle' && !(e.wt > 0) ? 0 : Math.abs(Math.sin(e.anim * 14)) * 4; g.translate(0, -hop); g.scale(f, 1); g.lineWidth = 2;
    seg([-6, 3, -10, 9], 3.5, OL); seg([5, 4, 7, 9], 3, OL); seg([-10, -1, -14, -5, -16, -3], 1.6, FD);
    ell(0, 0, 10, 7, F(FL), OL); g.strokeStyle = BND; g.lineWidth = 1.2; g.beginPath(); for (let i = -1; i <= 1; i++) { g.moveTo(-5 + i * 4, -5); g.quadraticCurveTo(-3 + i * 4, 0, -5 + i * 4, 5); } g.stroke(); g.lineWidth = 2;
    ell(6, -14, 2, 6.5, F(FD), OL, -.2); ell(10, -13, 1.8, 5.5, F(FH2), OL, .3); circ(8, -5, 5.5, F('#b8aa98'), OL); circ(9.6, -6.5, 1.6, '#e04a4a'); ell(12.4, -3, 2.2, 1.6, '#2a0a10', OL); g.fillStyle = BN; g.fillRect(11.6, -3.8, 1, 1.8); g.fillRect(13, -3.8, 1, 1.8);
  } else if (t === 'cao') {
    const f = Math.cos(e.ang) < 0 ? -1 : 1, run = e.state !== 'idle', st = Math.sin(e.anim * (run ? 16 : 6)) * 4, cr = e.state === 'windl' ? 3 : 0, op = e.state === 'leap' || e.state === 'wind' ? 1 : run ? .5 : .15; g.scale(f, 1); g.translate(0, cr);
    seg([-13, -2, -19, -7 + Math.sin(e.anim * 9) * 2], 3, OL);
    for (const [lx, k] of [[-9, 1], [-5, -1], [7, -1], [10, 1]]) { const p = [lx, 3, lx + st * k, 13 - cr]; seg(p, 4.5, OL); seg(p, 2.2, F('#4e403a')); }
    ell(0, 0, 14, 7.5, F('#4e403a'), OL); ell(-2, 1, 8, 5, F(FL)); g.strokeStyle = BN; g.lineWidth = 1.3; g.beginPath(); for (let i = -1; i <= 2; i++) { g.moveTo(-4 + i * 3, -3); g.quadraticCurveTo(-2 + i * 3, 1, -4 + i * 3, 5); } g.stroke(); g.lineWidth = 2.5;
    seg([-6, -6, -3, -12, 1, -10], 1.8, FD); seg([2, -7, 4, -12], 1.6, FD);
    poly([10, -8, 11, -16, 14, -9], F('#3e322e'), OL); ell(14, -4, 7, 5.5, F('#4e403a'), OL);
    poly([16, -7, 26, -5, 17, -2], F('#5a4a44'), OL); poly([16, -1, 24, 1 + op * 5, 15, 3], '#2a0a10', OL); g.fillStyle = BN; for (let i = 0; i < 3; i++) { g.fillRect(18 + i * 2.4, -2.6, 1.1, 1.8); g.fillRect(17.5 + i * 2.2, .2 + op * 2, 1.1, 1.8); }
    circ(15, -6, 1.5, '#e04a4a'); circ(11.6, -6.4, 1, '#e04a4a');
  } else if (t === 'corvo') {
    g.translate(0, -(e.h === undefined ? 24 : e.h)); g.rotate(e.ang); const dv = e.state === 'dive', fw = Math.sin(e.anim * (dv ? 6 : 17)), span = dv ? 8 : 14 + fw * 6;
    for (const s of [-1, 1]) { poly([3, s * 3, -3, s * span, -8, s * (span - 1), -6, s * (span * .6), -11, s * (span * .7), -6, s * 4], F('#1c181c'), OL); }
    poly([-7, -3, -15, -5, -13, 0, -15, 5, -7, 3], F('#1c181c'), OL);
    ell(0, 0, 9, 4.5, F('#28222a'), OL); ell(1, 0, 4, 2.4, '#7a1c2a'); g.strokeStyle = BN; g.lineWidth = 1; g.beginPath(); for (let i = -1; i <= 1; i++) { g.moveTo(1 + i * 2, -2.2); g.lineTo(1 + i * 2, 2.2); } g.stroke(); g.lineWidth = 2.5;
    circ(9, 0, 4, F('#28222a'), OL); poly([12, -1.6, 18, 0, 12, 1.6], '#8a8478', OL); circ(10, -1.7, 1.1, '#e04a4a'); circ(10, 1.7, 1.1, '#e04a4a');
  } else if (t === 'cervo_oco') {
    const f = Math.cos(e.ang) < 0 ? -1 : 1, low = e.state === 'windc' || e.state === 'charge' ? 1 : 0, st = Math.sin(e.anim * (e.state === 'charge' ? 18 : e.state === 'idle' ? 4 : 9)) * 4; g.scale(f, 1);
    for (const [lx, k] of [[-11, 1], [-7, -1], [8, -1], [12, 1]]) { const p = [lx, 6, lx + st * k, 22]; seg(p, 4.5, OL); seg(p, 2.2, F('#6a6058')); }
    ell(0, 0, 17, 10, F('#8a7a6a'), OL); ell(1, 2, 9, 6, '#1a0a10', OL); for (let i = -2; i <= 2; i++) seg([i * 3.4, -3.5, i * 3.4 + 1, 7], 1.6, BN); for (let i = 0; i < 5; i++) circ(-12 + i * 5, -9.5, 1.8, BN, OL);
    seg([-6, -8, -2, -15, 3, -12], 1.6, FD);
    const hx = 17, hy = low ? -2 : -13; seg([12, -4, hx, hy], 7, OL); seg([12, -4, hx, hy], 4, F('#8a7a6a'));
    g.save(); g.translate(hx, hy - 3); g.rotate(low ? 1.05 : 0);
    for (const p of [[0, 0, -6, -14, -2, -25], [-4, -10, -14, -16], [-2, -20, -10, -28], [2, 0, 8, -16, 6, -27], [7, -12, 15, -18], [6, -22, 13, -30]]) { seg(p, 4, OL); seg(p, 2, '#d8cfc0'); }
    seg([-6, -14, 1, -11, 8, -16], 1.5, FD); g.restore();
    ell(hx + 3, hy, 7, 5, F('#d8cfc0'), OL, low ? .5 : 0); circ(hx + 3, hy - 1.5, 2, '#1a0a10'); circ(hx + 3.3, hy - 1.5, .9, '#e04a4a'); circ(hx + 7, hy + 1.5, 1, '#1a0a10');
    if (e.stun > .3) for (let i = 0; i < 3; i++) circ(Math.cos(RT * 5 + i * 2.1) * 10, -30 + Math.sin(RT * 5 + i * 2.1) * 4, 2.5, '#e0c060', OL);
  } else if (t === 'urso') {
    const f = Math.cos(e.ang) < 0 ? -1 : 1, st = Math.sin(e.anim * (e.state === 'chase' ? 7 : 3)) * 4, rear = e.state === 'wind' ? clamp(1 - e.t / .5, 0, 1) : 0, mo = clamp(.25 + (e.state === 'chase' ? .3 : 0) + rear * .7 + Math.sin(e.anim * 3) * .08, 0, 1); g.scale(f, 1); g.rotate(-rear * .3);
    for (const [lx, k] of [[-15, 1], [-9, -1], [10, -1], [16, 1]]) { const p = [lx, 8, lx + st * k, 22]; seg(p, 9, OL); seg(p, 6, F('#3a2a24')); }
    ell(0, 0, 25, 16, F('#3a2a24'), OL); g.strokeStyle = '#2a1c18'; g.lineWidth = 1.6; g.beginPath(); for (let i = 0; i < 7; i++) { const a = -2.6 + i * .45; g.moveTo(Math.cos(a) * 20, Math.sin(a) * 12); g.lineTo(Math.cos(a) * 24, Math.sin(a) * 15 - 2); } g.stroke(); g.lineWidth = 2.5;
    ell(-6, -13, 10, 5, F(FD), OL); eye(-10, -13, 2.2, 1, 0); eye(-3, -14, 1.7, 1, 0);
    ell(4, 3, 8, 3 + 9 * mo, '#1a0408', OL); g.strokeStyle = F(FL); g.lineWidth = 2; g.beginPath(); g.ellipse(4, 3, 8, 3 + 9 * mo, 0, 0, 6.3); g.stroke(); g.lineWidth = 2.5; g.fillStyle = BN; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(4 - 3 - 1.4, 3 + i * (2 + 3 * mo)); g.lineTo(4 - 3 + 2.6, 3 + i * (2 + 3 * mo) + 1); g.lineTo(4 - 3 - 1.4, 3 + i * (2 + 3 * mo) + 2); g.fill(); g.beginPath(); g.moveTo(4 + 3 + 1.4, 3 + i * (2 + 3 * mo)); g.lineTo(4 + 3 - 2.6, 3 + i * (2 + 3 * mo) + 1); g.lineTo(4 + 3 + 1.4, 3 + i * (2 + 3 * mo) + 2); g.fill(); }
    if (rear > 0) { const p = [16, 0, 26, -8 - rear * 10, 32, -10 - rear * 14]; seg(p, 8, OL); seg(p, 5, F('#3a2a24')); for (let i = -1; i <= 1; i++) poly([31, -11 - rear * 14 + i * 3, 38, -12 - rear * 16 + i * 4, 32, -9 - rear * 14 + i * 3], BN, OL); }
    circ(20, -17, 3.5, F('#3a2a24'), OL); circ(24, -8, 10, F('#3a2a24'), OL); ell(32, -5, 5.5, 4, F('#54423a'), OL); circ(36.5, -6, 1.8, OL); seg([29, -1, 30, 5, 28, 8], 2, FD); circ(27, -11, 1.8, '#e04a4a');
  }
  g.restore();
  if (e.hp < e.maxhp && !e.def.boss) bar(x, y - r - 12 - (t === 'colhedor' ? 100 : 0), Math.max(22, r * 2), e.hp / e.maxhp, '#c8484e');
}
function drawPatch(e) {
  const x = e.x, y = e.y, r = e.r * (1 + Math.sin(e.anim * 2) * .03), fl = e.flash > 0; g.lineWidth = 3;
  g.beginPath(); for (let i = 0; i <= 14; i++) { const a = i / 14 * 6.28, rr2 = r * (.82 + hash2(i % 14, Math.floor(e.hx), 3) * .3 + Math.sin(e.anim * 2 + i) * .03); const px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2 * .72; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.fillStyle = fl ? '#f0e8e0' : FD; g.fill(); g.strokeStyle = OL; g.stroke();
  ell(x - 4, y - 2, r * .62, r * .42, fl ? '#f0e8e0' : FL); ell(x + 8, y + 5, r * .3, r * .2, FH2); g.strokeStyle = FD; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * 1.05 + 1; g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + .5) * r * .4, y + Math.sin(a + .5) * r * .3, x + Math.cos(a) * r * .8, y + Math.sin(a) * r * .55); } g.stroke();
  g.lineWidth = 1.6; const pa = Math.atan2(P.y - y, P.x - x), fx = Math.cos(pa), fy = Math.sin(pa);
  for (const [ex, ey, er] of [[-14, -8, 5], [10, -10, 4], [16, 8, 3.5], [-8, 10, 3]]) { if (Math.sin(RT * 1.7 + ex) > .94) continue; circ(x + ex, y + ey, er, '#d8d0c0', OL); circ(x + ex + fx * er * .4, y + ey + fy * er * .4, er * .5, '#1a0a10'); }
  ell(x - 20, y + 4, 5, 3, '#2a0a10', OL); if (e.hp < e.maxhp) bar(x, y - r * .8 - 8, 44, e.hp / e.maxhp, '#c8484e');
}
function drawAnimal(a) {
  const x = a.x, y = a.y, f = Math.cos(a.ang) < 0 ? -1 : 1, hop = a.mv ? Math.abs(Math.sin(a.anim * 12)) * 4 : 0, F = c => a.flash > 0 ? '#f0e8e0' : c; g.lineWidth = 2;
  shadow(x, y + a.r * .7, a.r, a.r * .4); g.save(); g.translate(x, y - hop); g.scale(f, 1);
  if (a.type === 'coelho') { ell(0, 0, 9, 7, F('#8a7e70'), OL); circ(-8, -1, 3, '#c8c0b4', OL); circ(7, -5, 5.5, F('#968a7c'), OL); ell(5, -13, 2.2, 6, F('#968a7c'), OL, -.15); ell(9, -13, 2.2, 6, F('#968a7c'), OL, .2); circ(9, -5.5, 1.2, OL); }
  else if (a.type === 'cervo') { const st = a.mv ? Math.sin(a.anim * 12) * 3 : 0; g.lineCap = 'round'; seg([-8, 6, -8 + st, 15], 5, OL); seg([8, 6, 8 - st, 15], 5, OL); seg([-8, 6, -8 + st, 15], 2.5, '#4a3626'); seg([8, 6, 8 - st, 15], 2.5, '#4a3626'); ell(0, 0, 14, 9, F('#7a5a40'), OL); ell(-2, 3, 9, 4, F('#8e6e52')); circ(-14, -2, 3, '#c8c0b4', OL); circ(14, -10, 6.5, F('#86644a'), OL); circ(16, -11, 1.3, OL); circ(19.5, -8.5, 1.4, OL); seg([11, -15, 8, -24, 9.5, -20, 5, -22], 1.8, '#a89878'); seg([15, -16, 17, -25, 16, -21, 20, -23], 1.8, '#a89878'); }
  else if (a.type === 'cachorro') { const st = a.mv ? Math.sin(a.anim * 14) * 3.5 : 0; g.lineCap = 'round'; seg([-11, -2, -16, -9 + Math.sin(a.anim * (a.mv ? 10 : 4)) * 2], 3, OL); seg([-11, -2, -16, -9 + Math.sin(a.anim * (a.mv ? 10 : 4)) * 2], 1.6, F('#8a6a48')); for (const [lx, k] of [[-8, 1], [-4, -1], [6, -1], [9, 1]]) { seg([lx, 3, lx + st * k, 12], 4, OL); seg([lx, 3, lx + st * k, 12], 2, F('#7a5c3e')); } ell(0, 0, 12, 6.5, F('#8a6a48'), OL); ell(-1, 2, 7, 3, F('#a48460')); ell(12, -5, 6, 5, F('#8a6a48'), OL); ell(17, -3.5, 4, 2.6, F('#a48460'), OL); circ(20.5, -4.2, 1.3, OL); circ(13.5, -6.5, 1.1, OL); ell(9.5, -6, 2.2, 4.5, F('#5a4430'), OL, .5); }
  else if (a.type === 'corvo') { if (a.h > 2) { g.restore(); g.save(); g.translate(x, y - a.h); g.rotate(a.ang); const fw = Math.sin(a.anim * 18), sp = 12 + fw * 5; for (const s of [-1, 1]) poly([3, s * 2.5, -2, s * sp, -7, s * (sp - 1), -5, s * 3], F('#1c1a20'), OL); poly([-6, -2.5, -12, -3.5, -12, 3.5, -6, 2.5], F('#1c1a20'), OL); ell(0, 0, 7, 3.6, F('#26222a'), OL); circ(7, 0, 3.2, F('#26222a'), OL); poly([9.5, -1.2, 14, 0, 9.5, 1.2], '#4a4650', OL); } else { const pk = Math.max(0, Math.sin(a.anim * 3)) > .7 ? 3 : 0; seg([-1, 3, -2, 8], 1.4, OL); seg([2, 3, 3, 8], 1.4, OL); poly([-5, -2, -12, 0, -11, 2, -4, 2], F('#1c1a20'), OL); ell(0, 0, 7, 4.5, F('#26222a'), OL); circ(6, -3 + pk, 3.4, F('#26222a'), OL); poly([8.5, -4 + pk, 13, -2.6 + pk, 8.5, -1.8 + pk], '#4a4650', OL); circ(7, -4 + pk, .8, '#c8c0b4'); } }
  else if (a.type === 'urso') { const st = a.mv ? Math.sin(a.anim * (a.angry > 0 ? 9 : 4)) * 4 : 0, rear = a.wind > 0 ? 1 - a.wind / .45 : a.swing > 0 ? 1 : 0; g.rotate(-rear * .3); g.lineCap = 'round'; for (const [lx, k] of [[-14, 1], [-8, -1], [9, -1], [14, 1]]) { seg([lx, 7, lx + st * k, 20], 8.5, OL); seg([lx, 7, lx + st * k, 20], 5.5, F('#5a3e2a')); } ell(0, 0, 23, 14, F('#6a4a32'), OL); ell(-6, -9, 12, 4, F('#7a5a3e')); g.strokeStyle = '#4a3222'; g.lineWidth = 1.4; g.beginPath(); for (let i = 0; i < 6; i++) { const q = -2.5 + i * .5; g.moveTo(Math.cos(q) * 19, Math.sin(q) * 11); g.lineTo(Math.cos(q) * 23, Math.sin(q) * 14 - 2); } g.stroke(); g.lineWidth = 2; circ(18, -15, 3.2, F('#6a4a32'), OL); circ(22, -7, 9, F('#6a4a32'), OL); ell(29.5, -4.5, 5, 3.6, F('#9a7a5a'), OL); circ(33.6, -5.5, 1.7, OL); circ(24.5, -9.5, 1.3, OL); if (a.angry > 0) seg([27, -1, 31, 0], 1.6, '#e8e0d0'); if (rear > 0) { const p = [10, 4, 22, 2 - rear * 12, 30, -rear * 20]; seg(p, 7.5, OL); seg(p, 4.5, F('#5a3e2a')); for (let i = -1; i <= 1; i++) poly([29, -rear * 20 - 2 + i * 3, 36, -rear * 22 + i * 4, 30, -rear * 20 + 1 + i * 3], '#e8e0d0', OL); } }
  else { ell(0, 0, 8, 7, F('#b0a898'), OL); circ(6, -6, 4.5, F('#b0a898'), OL); circ(6, -11, 2.2, '#8a2a2a', OL); poly([10, -6, 14, -5, 10, -4], '#c8883a', OL); circ(7.5, -7, 1, OL); ell(-7, -2, 4, 3, '#8a8478', OL, .5); }
  g.restore();
}

/* ===================== QUADRO ===================== */
let indoorK = 0;
function draw(dt) {
  RDT = dt; RT += dt;
  const tx = P.x + (mouse.x / Z - VW / 2) * (P.driving ? 0 : .14) + (P.driving ? Math.cos(P.ang) * clamp(G.car.spd, -100, 430) * .35 : 0), ty = P.y + (mouse.y / Z - VH / 2) * (P.driving ? 0 : .14) + (P.driving ? Math.sin(P.ang) * clamp(G.car.spd, -100, 430) * .35 : 0);
  cam.x += (tx - VW / 2 - cam.x) * Math.min(1, dt * (P.driving ? 5 : 10)); cam.y += (ty - VH / 2 - cam.y) * Math.min(1, dt * (P.driving ? 5 : 10));
  cam.x = clamp(cam.x, 0, WORLD_W - VW); cam.y = clamp(cam.y, 0, WORLD_H - VH);
  const sk2 = G.shake + (P.sanity < 25 && G.state === 'play' ? (25 - P.sanity) * .05 : 0);
  const cx = Math.round((cam.x + (sk2 ? rand(-1, 1) * sk2 * .5 : 0)) * 2) / 2, cy = Math.round((cam.y + (sk2 ? rand(-1, 1) * sk2 * .5 : 0)) * 2) / 2;
  mouse.wx = cx + mouse.x / Z; mouse.wy = cy + mouse.y / Z;
  const S = DPR * Z; g.setTransform(S, 0, 0, S, -cx * S, -cy * S); g.lineJoin = g.lineCap = 'round'; g.globalAlpha = 1;
  const c0x = Math.floor(cx / CHPX), c1x = Math.floor((cx + VW) / CHPX), c0y = Math.floor(cy / CHPX), c1y = Math.floor((cy + VH) / CHPX);
  for (let y = c0y; y <= c1y; y++) for (let x = c0x; x <= c1x; x++) g.drawImage(getChunk(x, y), x * CHPX, y * CHPX);
  g.strokeStyle = 'rgba(190,215,215,.2)'; g.lineWidth = 2;
  const t0x = Math.floor(cx / TILE), t1x = Math.floor((cx + VW) / TILE), t0y = Math.floor(cy / TILE), t1y = Math.floor((cy + VH) / TILE);
  if (GFX.water) { g.beginPath(); for (let y = t0y; y <= t1y; y++) for (let x = t0x; x <= t1x; x++) { const t = tileAt(x, y); if (t !== T.WATER && t !== T.DEEP) continue; const h = hash2(x, y, 3); if (h > .55) continue; const px = x * TILE + 8 + h * 30 + Math.sin(RT * .8 + h * 20) * 6, py = y * TILE + 10 + h * 36; g.moveTo(px, py); g.quadraticCurveTo(px + 6, py - 3, px + 12, py); } g.stroke(); }
  // sangue no chão
  for (const d of G.decals) { if (d.x < cx - 40 || d.x > cx + VW + 40 || d.y < cy - 40 || d.y > cy + VH + 40) continue; g.fillStyle = 'rgba(74,12,22,.6)'; g.beginPath(); g.ellipse(d.x, d.y, d.r, d.r * .6, d.a, 0, 6.3); g.fill(); g.beginPath(); g.arc(d.x + Math.cos(d.a) * d.r * 1.2, d.y + Math.sin(d.a) * d.r * .8, d.r * .3, 0, 6.3); g.arc(d.x - Math.sin(d.a) * d.r, d.y + Math.cos(d.a) * d.r * .7, d.r * .22, 0, 6.3); g.fill(); }
  const list = [], flat = []; lights.length = 0;
  queryObjs(cx + VW / 2, cy + VH / 2, Math.max(VW, VH) / 2 + 200, o => {
    if (o.x < cx - 120 || o.x > cx + VW + 120 || o.y < cy - 60 || o.y > cy + VH + 180) return;
    const t = o.type;
    if (t === 'fissure' || t === 'bigfissure') { flat.push(o); if (!o.sealed) lights.push([o.x, o.y, t === 'bigfissure' ? 380 : 190, .6, 2]); return; }
    if (o.dead && t !== 'tree' && t !== 'bush') return;
    if (t === 'cama' || t === 'espinhos' || t === 'armadilha_urso') flat.push(o); else list.push(o);
    if (t === 'fogueira') lights.push([o.x, o.y, 280 + Math.sin(RT * 9 + o.id) * 10, 1, 1]); else if (t === 'lampiao') lights.push([o.x, o.y - 20, 240 + Math.sin(RT * 9 + o.id) * 5, 1, 1]); else if (t === 'fornalha') lights.push([o.x, o.y, 150, .8, 1]); else if (t === 'crystal' && !o.dead) lights.push([o.x, o.y - 10, 60, .45]); else if (t === 'tower' && G.flags.radio) lights.push([o.x, o.y - 150, 90, .6, 2]);
  });
  for (const o of flat) if (o.type === 'fissure' || o.type === 'bigfissure') drawFissure(o); else drawObj(o);
  for (const e of G.enemies) if (e.def.patch) drawPatch(e);
  for (const f of G.fires) { if (f.acid) { circ(f.x, f.y, f.r, `rgba(140,160,50,${.34 * Math.min(1, f.t)})`); circ(f.x - 14, f.y + 6, f.r * .4, `rgba(190,205,90,${.2 * Math.min(1, f.t)})`); } else { circ(f.x, f.y, f.r, `rgba(220,100,40,${.2 * Math.min(1, f.t)})`); lights.push([f.x, f.y, 240, 1, 1]); } }
  for (const f of G.flares) { circ(f.x, f.y, 5 + Math.sin(RT * 30) * 1.5, '#ffb0a0'); lights.push([f.x, f.y, 300 * Math.min(1, f.t / 4), 1, 2]); }
  for (const r of G.rings) { const k = r.t / r.dur; g.strokeStyle = r.c; g.globalAlpha = 1 - k; g.lineWidth = 6 * (1 - k) + 1; g.beginPath(); g.arc(r.x, r.y, r.r * (.3 + .7 * k), 0, 6.3); g.stroke(); g.globalAlpha = 1; }
  for (const b of G.bombs) { icon(b.omega ? 'carga_omega' : 'carga', b.x, b.y - 6 + Math.sin(RT * 30) * 1.5, 26); g.lineWidth = 2; circ(b.x, b.y, (b.omega ? 320 : 150) * .8, null, `rgba(220,60,60,${.3 + .3 * Math.sin(RT * 14)})`); lights.push([b.x, b.y, 120, .8, 2]); }
  for (const k in G.builds) { const b = G.builds[k]; if (!b.hp) continue; const pc = BUILDS.find(p => p.id === b.id); if (!pc || b.hp >= pc.hp) continue; const [tx, ty] = k.split(',').map(Number), x = (tx + .5) * TILE, y = ty * TILE; if (x < cx - 40 || x > cx + VW + 40 || y < cy - 40 || y > cy + VH + 40) continue; bar(x, y - 4, 30, b.hp / pc.hp, '#c8a84e'); }
  if (BUILD.on && BUILD.tile && G.state === 'play') { const [tx, ty] = BUILD.tile, pc = BUILDS[BUILD.sel], ok = !BUILD.err; g.lineWidth = 2; g.globalAlpha = .9; rr(tx * TILE + 1, ty * TILE + 1, TILE - 2, TILE - 2, 2, ok ? 'rgba(110,174,114,.3)' : 'rgba(200,72,78,.3)', ok ? '#6fae72' : '#c8484e'); g.globalAlpha = .75; icon(pc.ic, (tx + .5) * TILE, (ty + .5) * TILE, 28); g.globalAlpha = 1; g.strokeStyle = 'rgba(232,224,208,.25)'; g.setLineDash([4, 6]); g.beginPath(); g.arc(P.x, P.y, 5.5 * TILE, 0, 6.3); g.stroke(); g.setLineDash([]); }
  if (G.ghost) { const q = G.ghost; g.lineWidth = 2; circ(q.x, q.y, q.r + 4, q.ok ? 'rgba(110,174,114,.25)' : 'rgba(200,72,78,.25)', q.ok ? '#6fae72' : '#c8484e'); g.globalAlpha = .75; icon(q.id, q.x, q.y, 30); g.globalAlpha = 1; }
  if (G.target && G.target.o) { const o = G.target.o; g.strokeStyle = `rgba(232,224,208,${.45 + .3 * Math.sin(RT * 6)})`; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.ellipse(o.x, o.y + 2, o.r + 8, (o.r + 8) * .6, 0, 0, 6.3); g.stroke(); g.setLineDash([]); }
  for (const it of G.items) list.push(it); for (const e of G.enemies) if (!e.def.patch) list.push(e); for (const a of G.animals) list.push(a); for (const f of G.phant) list.push(f); if (G.car) list.push(G.car); list.push(P);
  if (typeof roofEntries === 'function') for (const r of roofEntries(cx, cy, dt)) list.push(r); // telhados entram na ordem de profundidade (quem está na frente do prédio aparece na frente)
  list.sort((a, b) => a.y - b.y);
  for (const o of list) {
    if (o === P) { if (G.state !== 'title') drawPlayer(); } else if (o === G.car) drawCar(o); else if (o.def) { if (ENEMIES[o.type]) drawEnemy(o); else drawAnimal(o); }
    else if (o.type) drawObj(o);
    else if (o.seen !== undefined) { g.globalAlpha = clamp(o.t * 2, 0, .75); mimicShape(o.x, o.y, 0, false, o.x); g.globalAlpha = 1; }
    else { const b = Math.sin(RT * 4 + o.x) * 2; shadow(o.x, o.y + 9, 8, 3); icon(o.id, o.x, o.y - 3 + b, 22); }
  }
  for (const p of G.projs) {
    g.save(); g.translate(p.x, p.y);
    if (p.kind === 'lob') { const k = 1 - p.life / p.max; g.translate(0, -Math.sin(k * Math.PI) * 40); g.rotate(RT * 14); icon(p.item, 0, 0, 22); lights.push([p.x, p.y, 80, .8, 1]); }
    else if (p.kind === 'acid') { g.lineWidth = 2; circ(0, 0, 6, '#86963a', OL); circ(-1.5, -1.5, 2, '#d0d890'); lights.push([p.x, p.y, 50, .4]); }
    else { g.rotate(p.ang); if (p.kind === 'bullet') seg([-22, 0, 0, 0], 2.5, 'rgba(244,224,160,.9)'); else if (p.kind === 'stone') { seg([-10, 0, 0, 0], 2, 'rgba(200,200,200,.35)'); circ(0, 0, 3.2, '#8c898e', OL); } else { const L = p.kind === 'spear' ? 40 : p.bolt ? 14 : 20; seg([-L, 0, 0, 0], p.kind === 'spear' ? 4 : 2.5, p.bolt ? '#565a64' : '#6e5238'); poly([0, -3.5, 9, 0, 0, 3.5], p.iron || p.bolt ? '#b0b4c0' : '#687084'); if (p.kind === 'arrow') seg([-L, -3, -L + 5, 0, -L, 3], 2, '#c4c0b2'); } }
    g.restore();
  }
  for (const p of G.parts) { g.globalAlpha = clamp(p.life / p.max, 0, 1); circ(p.x, p.y, p.s, p.c); } g.globalAlpha = 1;
  // neblina
  const dk0 = darkness(), h = hourNow();
  if (GFX.fog) for (let i = 0; i < 7; i++) { const fx = cx + ((i * 331.7 + RT * (5 + i)) % (VW + 600)) - 300, fy = cy + ((i * 197.3 + Math.sin(RT * .05 + i) * 80) % (VH + 200) + VH + 200) % (VH + 200) - 100; if (GFX.lite) { g.globalAlpha = .09 * (1 - dk0 * .6); g.drawImage(softSpr('fog', 10 / 260, '170,180,190'), fx - 260, fy - 260, 520, 520); } else { const gr = g.createRadialGradient(fx, fy, 10, fx, fy, 260); gr.addColorStop(0, `rgba(170,180,190,${.09 * (1 - dk0 * .6)})`); gr.addColorStop(1, 'rgba(170,180,190,0)'); g.fillStyle = gr; g.fillRect(fx - 260, fy - 260, 520, 520); } } g.globalAlpha = 1;
  // iluminação
  indoorK += ((INDOOR[tileAtPx(P.x, P.y)] ? 1 : 0) - indoorK) * Math.min(1, dt * 3);
  const dk = Math.max(dk0, indoorK * .55);
  if (dk > .02) {
    const m = lightMul(); lights.push([P.x, P.y, 105, .55]);
    if (!P.driving && G.state === 'play') { const it = curItem(); if (it && it.light) lights.push([P.x, P.y, (it.light + Math.sin(RT * 10) * 6) * m, 1, 1]); if (invCount('lanterna')) lights.push([P.x + Math.cos(P.ang) * 110, P.y + Math.sin(P.ang) * 110, 250 * m, 1], [P.x + Math.cos(P.ang) * 40, P.y + Math.sin(P.ang) * 40, 110, .8]); if (P.flash > 0) lights.push([P.x, P.y, 260, 1, 1]); }
    const ls = LC.width / cv.width * S; lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, LC.width, LC.height); lg.fillStyle = `rgba(4,5,14,${dk * .95})`; lg.fillRect(0, 0, LC.width, LC.height); lg.globalCompositeOperation = 'destination-out';
    for (const L of lights) { const x = (L[0] - cx) * ls, y = (L[1] - cy) * ls, r = L[2] * ls; if (x < -r || y < -r || x > LC.width + r || y > LC.height + r || r <= 0) continue; if (GFX.lite) { lg.globalAlpha = L[3]; lg.drawImage(softSpr('hole', .1, '0,0,0'), x - r, y - r, r * 2, r * 2); } else { const gr = lg.createRadialGradient(x, y, r * .1, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${L[3]})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); lg.fillStyle = gr; lg.fillRect(x - r, y - r, r * 2, r * 2); } } lg.globalAlpha = 1;
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(LC, 0, 0, cv.width, cv.height); g.setTransform(S, 0, 0, S, -cx * S, -cy * S);
    g.globalCompositeOperation = 'lighter'; if (GFX.glow) for (const L of lights) if (L[4]) { if (GFX.lite) { const r = L[2] * .8; g.globalAlpha = .15 * dk; g.drawImage(L[4] === 2 ? softSpr('glowR', 0, '230,50,60') : softSpr('glowO', 0, '255,150,60'), L[0] - r, L[1] - r, r * 2, r * 2); } else { const gr = g.createRadialGradient(L[0], L[1], 0, L[0], L[1], L[2] * .8), c = L[4] === 2 ? '230,50,60' : '255,150,60'; gr.addColorStop(0, `rgba(${c},${.15 * dk})`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(L[0] - L[2], L[1] - L[2], L[2] * 2, L[2] * 2); } } g.globalAlpha = 1;
    for (const e of G.enemies) if (e.state !== 'burrow' && e.state !== 'surface' && !e.def.patch && !e.def.host && !e.def.armor) { const tall = e.def.mimic ? 54 : e.def.reaper ? 105 : (e.type === 'bruto' || e.type === 'alfa') ? e.r * .25 : 0, a = e.ang, ex = e.x + (tall ? Math.cos(a) * 3 : Math.cos(a) * e.r * .6), ey = e.y + (tall ? 0 : Math.sin(a) * e.r * .4) - tall; g.fillStyle = e.def.mimic ? `rgba(230,230,220,${.35 * dk})` : `rgba(240,90,70,${.55 * dk})`; g.beginPath(); if (e.def.mimic) g.ellipse(ex, ey, 5, 7, 0, 0, 6.3); else { g.arc(ex - Math.sin(a) * 3.5, ey + Math.cos(a) * 3.5, 2, 0, 6.3); g.arc(ex + Math.sin(a) * 3.5, ey - Math.cos(a) * 3.5, 2, 0, 6.3); } g.fill(); }
    g.globalCompositeOperation = 'source-over';
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  const dusk = h > 16.5 && h < 20.5 ? Math.sin((h - 16.5) / 4 * Math.PI) : h > 4.8 && h < 7.5 ? Math.sin((h - 4.8) / 2.7 * Math.PI) : 0;
  g.fillStyle = `rgba(${28 + dusk * 110 | 0},${34 + dusk * 20 | 0},${52 - dusk * 20 | 0},${.16 + dusk * .08})`; g.fillRect(0, 0, cv.width, cv.height);
  if (P.inf >= 50 && G.state === 'play') { const k = (P.inf - 50) / 50, gr = g.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * .3, cv.width / 2, cv.height / 2, Math.max(cv.width, cv.height) * .7); gr.addColorStop(0, 'rgba(60,90,20,0)'); gr.addColorStop(1, `rgba(60,90,20,${(.18 + .22 * k) * (.85 + .15 * Math.sin(RT * 2.2))})`); g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height); }
  if (P.sanity < 45 && G.state === 'play') { g.fillStyle = `rgba(90,10,30,${(45 - P.sanity) / 45 * (.14 + .06 * Math.sin(RT * 3))})`; g.fillRect(0, 0, cv.width, cv.height); }
  if (GFX.grain) { const pat = g.createPattern(GRAIN, 'repeat'); g.save(); g.translate(Math.random() * 128 | 0, Math.random() * 128 | 0); g.scale(DPR * 1.5, DPR * 1.5); g.fillStyle = pat; g.globalAlpha = .55 + (P.sanity < 45 ? (45 - P.sanity) / 60 : 0); g.fillRect(-128, -128, cv.width + 256, cv.height + 256); g.restore(); g.globalAlpha = 1; }
  g.setTransform(S, 0, 0, S, -cx * S, -cy * S);
  // textos e indicadores
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const t of G.texts) { const k = t.t / .9; g.globalAlpha = 1 - k * k; g.font = `700 ${t.big ? 20 : 14}px ${FONT}`; g.lineWidth = 3.5; g.strokeStyle = 'rgba(8,6,10,.85)'; g.strokeText(t.s, t.x, t.y); g.fillStyle = t.c; g.fillText(t.s, t.x, t.y); } g.globalAlpha = 1;
  if (G.target && !P.sleeping && !P.action && !P.driving && !BUILD.on && !CS.on && G.state === 'play') { const o = G.target.o || { x: P.x, y: P.y + 10, r: 10 }, s = G.target.label; g.font = `600 13px ${FONT}`; const w = g.measureText(s).width + 40, ly = o.y - o.r - (o.type === 'tower' ? 60 : P.driving ? 44 : 34); g.lineWidth = 1.5; rr(o.x - w / 2, ly - 12, w, 24, 4, 'rgba(14,11,17,.9)', 'rgba(217,179,108,.4)'); rr(o.x - w / 2 + 4, ly - 8, 18, 16, 3, '#d9b36c'); g.fillStyle = '#141018'; g.font = `700 11px ${FONT}`; g.fillText('E', o.x - w / 2 + 13, ly + .5); g.fillStyle = '#e8e0d0'; g.font = `600 13px ${FONT}`; g.fillText(s, o.x + 11, ly + .5); }
  const prog = P.action ? [P.action.label, P.action.t / P.action.dur] : P.reload ? ['Recarregando', P.reload.t / P.reload.dur] : null;
  if (prog) { label(prog[0], P.x, P.y - 52); rr(P.x - 26, P.y - 44, 52, 8, 2, 'rgba(14,11,17,.9)'); rr(P.x - 24, P.y - 42, 48 * clamp(prog[1], 0, 1), 4, 1, '#d9b36c'); }
  if (P.draw > 0) { g.strokeStyle = 'rgba(14,11,17,.7)'; g.lineWidth = 6; g.beginPath(); g.arc(mouse.wx, mouse.wy, 16, -1.57, -1.57 + 6.28); g.stroke(); g.strokeStyle = P.draw >= 1 ? '#6fae72' : '#d9b36c'; g.lineWidth = 3.5; g.beginPath(); g.arc(mouse.wx, mouse.wy, 16, -1.57, -1.57 + 6.28 * P.draw); g.stroke(); }
}

/* ===================== RETRATOS DO ARQUIVO ===================== */
const PORTRAITS = {};
function enemyPortrait(type) {
  if (PORTRAITS[type]) return PORTRAITS[type];
  const def = ENEMIES[type], c = document.createElement('canvas'); c.width = c.height = 220; const old = g, oRT = RT;
  try {
    g = c.getContext('2d'); g.lineJoin = g.lineCap = 'round'; RT = 1.3;
    const tall = def.mimic || def.reaper, sc = def.r > 40 ? 1.25 : def.r > 22 ? 2.2 : tall ? (def.reaper ? 1.45 : 2.3) : def.patch ? 2.0 : 110 / (def.r + 22);
    const fit = { cervo_oco: [2.25, 150], corvo: [3, 120], urso: [2.1, 120] }[type];
    g.translate(110, fit ? fit[1] : tall ? 196 : def.patch ? 118 : 124); g.scale(fit ? fit[0] : sc, fit ? fit[0] : sc);
    const e = { type, def, x: 0, y: 0, r: def.r, hp: 1, maxhp: 1, state: def.mimic ? 'chase' : 'idle', ang: .7, anim: 1.2, flash: 0, stun: 0, fury: 0, lunge: 0, hx: 3, hy: 0, rage: false, h: 8, trail: def.snake ? [[-9, 3], [-18, 7], [-26, 4], [-33, -3], [-38, -11], [-40, -20]] : null };
    if (def.patch) drawPatch(e); else drawEnemy(e);
  } catch (err) { console.error('retrato', type, err); }
  g = old; RT = oRT; return PORTRAITS[type] = c.toDataURL();
}
