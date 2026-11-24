'use strict';
/* ==========================================================================
   CENAS (cutscenes)
   Curtas, feitas com o próprio motor: a câmera vai até o acontecimento, entram
   faixas de cinema e legendas, e o mundo para por alguns segundos. Cada cena
   toca uma única vez por jogo (fica marcada em G.flags) e pode ser pulada.
   ========================================================================== */
const CS = { on: false, cs: null, t: 0, queue: [], hideP: false, cx: 0, cy: 0, mouse: null };

function queueCutscene(id, arg) { if (G.flags['cs_' + id] || CS.queue.some(q => q[0] === id)) return; CS.queue.push([id, arg]); }

// caminho de câmera: [[tempo, x, y], ...] com transições suaves
function csPath(keys) {
  return t => {
    if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
    for (let i = 1; i < keys.length; i++) { const a = keys[i - 1], b = keys[i]; if (t <= b[0]) { const k = (t - a[0]) / Math.max(.001, b[0] - a[0]), e = k * k * (3 - 2 * k); return [a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e]; } }
    const l = keys[keys.length - 1]; return [l[1], l[2]];
  };
}
function csSpawn(type, x, y, still) {
  for (let k = 0; k < 10; k++) { const xx = x + (k ? rand(-40, 40) : 0), yy = y + (k ? rand(-40, 40) : 0); if (freeSpot(xx, yy)) { const e = spawnEnemy(type, xx, yy); if (still) { e.state = 'idle'; e.t = 0; e.lair = -1; e.hx = xx; e.hy = yy; } return e; } }
  return null;
}
function nearestOpenFissure(maxD) { let b = null, bd = maxD; for (const f of W.fissures) { if (f.sealed) continue; const d = dist(f.x, f.y, P.x, P.y); if (d < bd) { bd = d; b = f; } } return b; }

const CUTSCENES = {
  noite() {
    const f = nearestOpenFissure(1300), fx = f ? f.x : P.x + 260, fy = f ? f.y : P.y - 220, px = P.x, py = P.y;
    return { dur: 7.6, cam: csPath([[0, px, py], [1.6, fx, fy + 40], [5.6, fx, fy + 30], [7.2, px, py]]), shake: [1.3, 2.2, 5],
      acts: [[1.4, () => { sfx('emerge', fx, fy); ring(fx, fy, 160, '#c8485e', .6); }], [1.9, () => csSpawn('larva', fx - 30, fy + 20), 1], [2.7, () => csSpawn('rastejante', fx + 35, fy + 10), 1],
        [3.5, () => { csSpawn('larva', fx + 5, fy + 32); sfx('v_rastejante', fx, fy, 'idle'); }, 1], [4.5, () => sfx('roar', fx, fy, 'rastejante')]],
      subs: [[.3, 3.2, 'eu', 'Está escurecendo. E tem alguma coisa se mexendo ali.'], [4.0, 7.2, 'eu', 'Eles estão saindo do chão. Preciso de fogo. Agora.']] };
  },
  vila() {
    const n = W.npcs.tome, px = P.x, py = P.y;
    return { dur: 6.2, cam: csPath([[0, px, py], [1.5, n.x, n.y], [4.6, n.x, n.y], [6, px, py]]), acts: [[1.3, () => sfx('fire', n.x + 80, n.y)]],
      subs: [[1.3, 4.6, 'tome', 'Ei! Você aí, de pé! Venha até o fogo. Devagar, e com as mãos à vista.']] };
  },
  cidade() {
    const px = P.x, py = P.y, y = 92.8 * TILE, x0 = clamp(px, 168 * TILE, 205 * TILE), hs = [];
    return { dur: 8.4, cam: csPath([[0, px, py], [1.3, x0 + 120, y], [5.4, x0 + 860, y], [6.8, x0 + 860, y], [8.2, px, py]]),
      acts: [[.05, () => { for (const [dx, oy] of [[300, -.5], [420, .7], [540, -.2], [660, .5], [770, -.6], [880, .8]]) { const e = csSpawn('hospedeiro', x0 + dx, y + oy * TILE, true); if (e) { e.ang = Math.random() < .5 ? Math.PI / 2 : -Math.PI / 2; hs.push(e); } } }, 1],
        [5.2, () => { for (const e of hs) e.ang = Math.atan2(py - e.y, px - e.x); sfx('whisper', x0 + 860, y); }], [5.7, () => sfx('v_hospedeiro', x0 + 800, y, 'idle')]],
      subs: [[.8, 3.9, 'eu', 'Alto Ferro. Tem gente parada no meio da rua...'], [5.2, 7.7, 'eu', 'Não. Não é gente.']] };
  },
  alfa(e) {
    const px = P.x, py = P.y;
    return { dur: 6.2, cam: csPath([[0, px, py], [1.4, e.x, e.y], [4.6, e.x, e.y], [6, px, py]]), shake: [1.8, 2.8, 12],
      acts: [[1.8, () => { sfx('roar', e.x, e.y, 'alfa'); ring(e.x, e.y, 180, '#c85a7a', .7); e.lunge = .3; }]],
      subs: [[2.3, 5.0, 'eu', 'Aquilo já foi um Brutamontes. Agora é outra coisa.']] };
  },
  mae(e) {
    const f = W.bigFissure, px = P.x, py = P.y;
    return { dur: 7.4, cam: csPath([[0, px, py], [1.2, f.x, f.y + 70], [6, f.x, f.y + 50], [7.2, px, py]]), shake: [0, 3, 7],
      acts: [[0, () => sfx('emerge', f.x, f.y)], [.9, () => ring(f.x, f.y, 260, '#c8485e', .8)], [2.2, () => { sfx('roar', e.x, e.y, 'mae'); G.shake = 22; ring(e.x, e.y, 300, '#e06a8a', .9); }], [3.6, () => sfx('v_mae', e.x, e.y)]],
      subs: [[.4, 2.2, 'eu', 'O chão está se abrindo...'], [3.4, 6.6, 'radio', '...chhh... é ela. A mãe de todas elas. Não deixe que ela toque em você.']] };
  },
  fuga() {
    const h = W.heli, hy = h.y;
    return { dur: 7.2, hideP: true, cam: t => [h.x, hy - 30 - Math.min(1, Math.max(0, (t - 3) / 4)) * 120], fade: t => clamp((t - 5.8) / 1.3, 0, 1),
      acts: [[.2, () => { G.flags.escaped = 1; sfx('roar', h.x, h.y, 'alfa'); }], [2.2, () => sfx('boom', h.x, h.y)]],
      tick: t => { if (t > 3) { const k = Math.min(1, (t - 3) / 4); h.y = hy - k * k * 150; } if (Math.random() < .7) { const a = Math.random() * 6.28; G.parts.push({ x: h.x + Math.cos(a) * 60, y: hy + 10 + Math.sin(a) * 30, vx: Math.cos(a) * 120, vy: Math.sin(a) * 60, life: .7, max: .7, c: 'rgba(150,140,120,.5)', s: rand(4, 9) }); } },
      end: () => { h.y = hy; qev('heli'); },
      subs: [[.8, 3.4, 'eu', 'Vamos. Por favor, pega...'], [3.8, 5.8, 'eu', 'Adeus, Serra Sangrenta.']] };
  },
};

function playCutscene(id, arg) {
  if (G.flags['cs_' + id] || !CUTSCENES[id]) return; G.flags['cs_' + id] = 1;
  const def = CUTSCENES[id](arg); def.acts = (def.acts || []).map(a => ({ t: a[0], f: a[1], keep: !!a[2], done: false }));
  Object.assign(CS, { on: true, cs: def, t: 0, hideP: !!def.hideP, mouse: [mouse.x, mouse.y] });
  BUILD.on = false; P.action = null; P.swing = null; P.draw = 0; P.reload = null; mouse.down = false; for (const k in keys) keys[k] = false;
  if (P.driving && G.car) G.car.spd = Math.min(G.car.spd, 60);
  G.texts.length = 0;
  $('hud').hidden = true; $('toasts').style.visibility = 'hidden'; $('cs').hidden = false; $('cs-fade').style.opacity = 0;
  requestAnimationFrame(() => $('cs').classList.add('on'));
}
function csEnd(skipped) {
  const c = CS.cs; if (!c) return;
  for (const a of c.acts) if (!a.done && (a.keep || !skipped)) { a.done = true; try { a.f(); } catch (e) { } }
  CS.on = false; CS.cs = null; CS.hideP = false; if (CS.mouse) { mouse.x = CS.mouse[0]; mouse.y = CS.mouse[1]; }
  $('cs').classList.remove('on'); $('cs-sub').classList.remove('show'); $('hud').hidden = false; $('toasts').style.visibility = ''; G.uiDirty = true;
  setTimeout(() => { if (!CS.on) $('cs').hidden = true; }, 650);
  cam.x = P.x - VW / 2; cam.y = P.y - VH / 2;
  if (c.end) c.end();
}
function csSkip() { if (CS.on && CS.t > .4) csEnd(true); }
function csUpdate(dt) {
  const c = CS.cs; CS.t += dt; const t = CS.t;
  for (const a of c.acts) if (!a.done && t >= a.t) { a.done = true; a.f(); }
  if (c.tick) c.tick(t, dt);
  if (c.shake && t >= c.shake[0] && t <= c.shake[1]) G.shake = Math.max(G.shake, c.shake[2]);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - 30 * dt);
  // o mundo fica parado, mas as criaturas respiram e terminam de brotar do chão
  for (const e of G.enemies) { e.anim += dt; e.flash -= dt; if (e.lunge > 0) e.lunge -= dt; if (e.state === 'emerge') { e.t -= dt; if (e.t <= 0) e.state = e.home ? 'idle' : 'chase'; } }
  for (const p of G.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx -= p.vx * 3 * dt; p.vy -= p.vy * 3 * dt; } G.parts = G.parts.filter(p => p.life > 0);
  for (const r of G.rings) r.t += dt; G.rings = G.rings.filter(r => r.t < r.dur);
  const [x, y] = c.cam(t); CS.cx = x; CS.cy = y;
  const s = (c.subs || []).find(q => t >= q[0] && t < q[1]), el = $('cs-sub');
  if (s) { if (CS.subKey !== s) { CS.subKey = s; const w = WHO[s[2]]; $('cs-who').textContent = s[2] === 'eu' ? '' : w[1]; $('cs-txt').textContent = s[3]; el.classList.toggle('me', s[2] === 'eu'); } el.classList.add('show'); } else el.classList.remove('show');
  $('cs-fade').style.opacity = c.fade ? c.fade(t) : 0;
  if (t >= c.dur) csEnd(false);
}
// antes de desenhar: posiciona a câmera no ponto da cena
function csBeforeDraw() {
  const drv = P.driving; P.driving = false; if (drv) CS.hideP = true;
  cam.x = CS.cx - VW / 2; cam.y = CS.cy - VH / 2; mouse.x = Z * (VW / 2 + (CS.cx - P.x) / .14); mouse.y = Z * (VH / 2 + (CS.cy - P.y) / .14);
  return drv;
}
function csAfterDraw(drv) { P.driving = drv; if (drv && CS.cs && !CS.cs.hideP) CS.hideP = false; }
