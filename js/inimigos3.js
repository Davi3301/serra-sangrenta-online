'use strict';
/* ==========================================================================
   SERRA SANGRENTA 3.0 · CRIATURAS NOVAS
   Selvagens (rodeiam em grupo, provocam, atacam pelas costas, recuam feridos,
   arremessam lanças), Xamã (cura e encoraja o grupo), Uivador (fica parado
   na neve e salta), Pernalta (muda de direção sem aviso), Tecelão (cospe fios
   que prendem as pernas) e o Mil-Braços (chefe das cavernas).
   ========================================================================== */
const AI3 = {};
const facing = (e) => { const a = Math.atan2(e.y - P.y, e.x - P.x); return Math.abs(angDiff(a, P.ang)) < .9; }; // você está olhando para ele?
function eThrow(e, ang, spd, o) { G.projs.push(Object.assign({ kind: 'jav', from: 'e', x: e.x + Math.cos(ang) * e.r, y: e.y + Math.sin(ang) * e.r, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, ang, dmg: e.dmg * .8, life: 1.6 }, o || {})); }
function hitP(e, mul, kb) { const d = dist(e.x, e.y, P.x, P.y); if (d < (e.reach || e.r + P.r + 18)) hurtPlayer(e.dmg * (mul || 1), Math.atan2(P.y - e.y, P.x - e.x), kb || 200, 'inf'); }
// o que todo bicho novo faz antes do comportamento dele
function ai3Base(e, dt, d) {
  e.anim += dt; e.flash -= dt; if (e.fury > 0) e.fury -= dt; if (e.lunge > 0) e.lunge -= dt;
  e.vT = (e.vT === undefined ? rand(.4, 3) : e.vT) - dt; if (e.vT <= 0) { e.vT = rand(2.6, 5.5); if (d < 760 && e.state !== 'emerge') sfx('v_' + e.type, e.x, e.y, e.state); }
  if (!G.seen[e.type] && d < 300) { G.seen[e.type] = 1; toast('Novo registro no Arquivo: ' + e.def.n, 'u_tv', true); G.uiDirty = true; }
  if (Math.abs(e.kx) + Math.abs(e.ky) > 4) { moveEnt(e, e.kx * dt, e.ky * dt); e.kx -= e.kx * 8 * dt; e.ky -= e.ky * 8 * dt; }
  if (e.stun > 0) { e.stun -= dt; return false; }
  if (e.state === 'emerge') { e.t -= dt; if (e.t <= 0) e.state = 'idle'; return false; }
  if (e.state === 'leave') { e.t -= dt; if (e.t <= 0) { e.dead = true; burst(e.x, e.y, '#3a2c30', 10, 100, 5); } return false; }
  return true;
}
function wander(e, dt, sp) { e.cd -= dt; if (e.cd <= 0) { e.cd = rand(1.5, 4); e.wa = Math.random() * 6.28; e.wt = rand(.5, 1.6); if (dist(e.x, e.y, e.hx, e.hy) > 260) e.wa = Math.atan2(e.hy - e.y, e.hx - e.x); } if (e.wt > 0) { e.wt -= dt; steer(e, e.wa, sp, dt); } }
const sense = e => e.def.aggro * (typeof senseMul === 'function' ? senseMul() : 1) * (isNight() ? 1.1 : .9);

/* ------------------------------ Selvagem ------------------------------ */
AI3.selvagem = (e, dt, d, pa) => {
  const masked = invCount('mascara_osso') > 0, ag = sense(e) * (masked ? .55 : 1);
  e.side = e.side || (Math.random() < .5 ? -1 : 1); e.spear = e.spear === undefined ? randi(1, 2) : e.spear;
  switch (e.state) {
    case 'idle': wander(e, dt, 60); if (!P.dead && (d < ag || e.alert)) { e.state = 'stalk'; e.cd = rand(2, 4); e.R = rand(170, 240); } break;
    case 'stalk': { // rodeia na beira da luz, provocando
      if (P.dead || d > 1200) { e.state = 'idle'; e.alert = false; break; }
      if (e.hp < e.maxhp * .35 && !e.fled) { e.state = 'flee'; e.t = rand(4, 6); e.fled = 1; sfx('v_selvagem', e.x, e.y, 'chase'); break; }
      e.cd -= dt; const want = facing(e) && d < 150 ? e.R + 60 : e.R;
      const a = pa + (d > want + 30 ? 0 : d < want - 30 ? Math.PI : e.side * 1.45); steer(e, a, d > want + 30 ? e.def.spd : e.def.spd * .55, dt);
      if (Math.random() < dt * .25) e.side = -e.side;
      if (e.spear > 0 && d > 190 && d < 330 && e.cd <= 0 && Math.random() < dt * 1.2) { e.state = 'windt'; e.t = .55; break; }
      // atacam quando você vira as costas ou depois de um tempo, um de cada vez
      const others = G.enemies.filter(o => o !== e && !o.dead && o.state === 'rush').length;
      if (e.cd <= 0 && others < 1 && (!facing(e) || Math.random() < dt * .35)) { e.state = 'rush'; e.t = 2.2; }
      break;
    }
    case 'rush': e.t -= dt; steer(e, pa, e.def.spd * 1.25, dt); if (d < e.r + P.r + 8) { e.state = 'wind'; e.t = .28; e.reach = e.r + P.r + 26; } else if (e.t <= 0) { e.state = 'stalk'; e.cd = rand(2, 4); } break;
    case 'wind': e.t -= dt; e.ang = pa; if (e.t <= 0) { e.lunge = .15; hitP(e, 1, 200); e.state = 'recover'; e.t = .45; } break;
    case 'recover': e.t -= dt; steer(e, pa + Math.PI, e.def.spd * .8, dt); if (e.t <= 0) { e.state = 'stalk'; e.cd = rand(2.5, 5); } break;
    case 'windt': e.t -= dt; e.ang = pa; if (e.t <= 0) { const lead = Math.atan2(P.y + (P.vy || 0) * .2 - e.y, P.x + (P.vx || 0) * .2 - e.x); eThrow(e, lead + rand(-.06, .06), 520); e.spear--; sfx('swing', e.x, e.y); e.state = 'stalk'; e.cd = rand(2, 3.5); } break;
    case 'flee': e.t -= dt; steer(e, Math.atan2(e.hy - e.y, e.hx - e.x) * .5 + (pa + Math.PI) * .5, e.def.spd * 1.15, dt); e.hp = Math.min(e.maxhp, e.hp + 6 * dt); if (e.t <= 0) { e.state = 'stalk'; e.cd = rand(2, 4); } break;
    default: e.state = 'stalk';
  }
};
/* -------------------------------- Xamã -------------------------------- */
AI3.xama = (e, dt, d, pa) => {
  const ag = sense(e); e.side = e.side || 1;
  if (e.state === 'idle') { wander(e, dt, 50); if (!P.dead && (d < ag || e.alert)) { e.state = 'stalk'; e.cd = 3; } return; }
  if (P.dead || d > 1300) { e.state = 'idle'; return; }
  e.cd -= dt; e.hT = (e.hT || 4) - dt;
  if (e.state === 'cast') { e.t -= dt; e.ang = pa; if (e.t <= 0) { // cura e encoraja quem está por perto
      ring(e.x, e.y, 300, '#86c84a', .8); sfx('scream', e.x, e.y, e.type); for (const o of G.enemies) if (!o.dead && o !== e && dist(o.x, o.y, e.x, e.y) < 300 && o.def.ai3 === 'selvagem') { o.hp = Math.min(o.maxhp, o.hp + 35); o.fled = 0; o.state = 'rush'; o.t = 2; }
      if (d < 360) P.sanity = Math.max(0, P.sanity - 10); e.state = 'stalk'; } return; }
  steer(e, pa + (d > 300 ? 0 : d < 220 ? Math.PI : e.side * 1.5), e.def.spd * (d > 300 ? 1 : .6), dt);
  if (e.hT <= 0) { e.hT = rand(7, 10); e.state = 'cast'; e.t = .9; }
  else if (d < e.r + P.r + 6 && e.cd <= 0) { e.lunge = .15; hitP(e, 1, 160); e.cd = 1.2; }
};
/* ------------------------------- Uivador ------------------------------- */
AI3.uivador = (e, dt, d, pa) => {
  const ag = sense(e);
  switch (e.state) {
    case 'idle': e.still = (e.still || 0) + dt; if (!P.dead && d < Math.min(ag, 300)) { e.state = 'windl'; e.t = .35; sfx('v_uivador', e.x, e.y, 'chase'); } else if (e.still > 6) { wander(e, dt, 70); if (e.wt <= 0) e.still = 0; } break;
    case 'windl': e.t -= dt; e.ang = pa; if (e.t <= 0) { e.state = 'leap'; e.t = .38; e.cdir = pa; } break;
    case 'leap': e.t -= dt; moveEnt(e, Math.cos(e.cdir) * 640 * dt, Math.sin(e.cdir) * 640 * dt); e.ang = e.cdir; if (d < e.r + P.r + 6) { hitP(e, 1, 260); e.state = 'retreat'; e.t = 1.3; } else if (e.t <= 0) { e.state = 'retreat'; e.t = .8; } break;
    case 'retreat': e.t -= dt; steer(e, pa + Math.PI + .6, e.def.spd, dt); if (e.t <= 0) { e.state = P.dead || d > 900 ? 'idle' : 'circle'; e.t = rand(1, 2); } break;
    case 'circle': e.t -= dt; steer(e, pa + 1.4, e.def.spd * .7, dt); if (e.t <= 0 && d < 340) { e.state = 'windl'; e.t = .35; } else if (e.t <= 0) steer(e, pa, e.def.spd, dt); break;
    default: e.state = 'idle';
  }
};
/* ------------------------------- Pernalta ------------------------------- */
AI3.pernalta = (e, dt, d, pa) => {
  const ag = sense(e);
  switch (e.state) {
    case 'idle': wander(e, dt, 80); if (!P.dead && (d < ag || e.alert)) { e.state = 'chase'; e.jt = 0; } break;
    case 'chase': if (P.dead || d > 1300) { e.state = 'idle'; break; }
      e.jt -= dt; if (e.jt <= 0) { e.jt = rand(.35, .9); e.off = rand(-1.3, 1.3); }
      if (d < 140 && e.cd <= 0) { e.state = 'windl'; e.t = .3; break; } e.cd -= dt; steer(e, pa + (d > 160 ? e.off : 0), e.def.spd, dt); break;
    case 'windl': e.t -= dt; e.ang = pa; if (e.t <= 0) { e.state = 'leap'; e.t = .3; e.cdir = pa; sfx('leap', e.x, e.y); } break;
    case 'leap': e.t -= dt; moveEnt(e, Math.cos(e.cdir) * 600 * dt, Math.sin(e.cdir) * 600 * dt); if (d < e.r + P.r + 8) { hitP(e, 1, 300); e.state = 'recover'; e.t = .8; e.cd = 1.4; } else if (e.t <= 0) { e.state = 'recover'; e.t = .5; e.cd = 1; } break;
    case 'recover': e.t -= dt; if (e.t <= 0) e.state = 'chase'; break;
    default: e.state = 'idle';
  }
};
/* ------------------------------- Tecelão ------------------------------- */
AI3.tecelao = (e, dt, d, pa) => {
  const ag = sense(e); e.side = e.side || 1;
  if (e.state === 'idle') { wander(e, dt, 40); if (!P.dead && (d < ag || e.alert)) { e.state = 'chase'; e.cd = 1; } return; }
  if (P.dead || d > 1000) { e.state = 'idle'; return; }
  if (e.state === 'wind') { e.t -= dt; e.ang = pa; if (e.t <= 0) { eThrow(e, pa + rand(-.05, .05), 330, { kind: 'acid', web: 1, dmg: e.dmg * .6 }); sfx('spit', e.x, e.y); e.state = 'chase'; e.cd = rand(1.8, 2.6); e.side = -e.side; } return; }
  e.cd -= dt; steer(e, pa + (d > 260 ? 0 : d < 170 ? Math.PI : e.side * 1.5), e.def.spd * (d < 170 ? 1.1 : .7), dt);
  if (e.cd <= 0 && d < 380) { e.state = 'wind'; e.t = .45; } else if (d < e.r + P.r + 4 && e.cd < 1) { hitP(e, 1, 140); e.cd = 1.5; }
};
/* ------------------------------ Mil-Braços ------------------------------ */
AI3.milbracos = (e, dt, d, pa) => {
  if (e.state === 'idle') { if (!P.dead && d < 420) { e.state = 'chase'; G.boss = e; sfx('roar', e.x, e.y); G.shake = 14; toast('O Mil-Braços acordou.', 'u_skull', true); } return; }
  if (P.dead) { e.state = 'idle'; return; } G.boss = e; e.cd -= dt; e.ct = (e.ct || 5) - dt;
  switch (e.state) {
    case 'chase': steer(e, pa, e.def.spd * (e.hp < e.maxhp * .5 ? 1.35 : 1), dt);
      if (d < 120 && e.cd <= 0) { e.state = 'sweep'; e.t = .7; }
      else if (d > 230 && e.ct <= 0) { e.state = 'windc'; e.t = .8; e.ct = rand(5, 8); }
      if (e.hp < e.maxhp * .5) { e.sumT = (e.sumT || 4) - dt; if (e.sumT <= 0) { e.sumT = 10; for (let i = 0; i < 3; i++) { const l = spawnEnemy('larva', e.x + rand(-60, 60), e.y + rand(-60, 60)); l.lair = -1; l.state = 'chase'; } } }
      break;
    case 'sweep': e.t -= dt; if (e.t <= 0) { ring(e.x, e.y, 130, '#e06a8a', .5); G.shake = 10; sfx('thud', e.x, e.y); if (d < 135) hurtPlayer(e.dmg, pa, 420, 'inf'); e.state = 'recover'; e.t = .9; e.cd = rand(1.6, 2.4); } break;
    case 'windc': e.t -= dt; e.ang = pa; if (e.t <= 0) { e.state = 'charge'; e.t = 1; e.cdir = pa; sfx('roar', e.x, e.y); } break;
    case 'charge': e.t -= dt; moveEnt(e, Math.cos(e.cdir) * 420 * dt, Math.sin(e.cdir) * 420 * dt); if (d < e.r + P.r + 6) { hurtPlayer(e.dmg * 1.2, e.cdir, 520, 'inf'); e.state = 'recover'; e.t = .8; } else if (e.hitWall || e.hitObj) { e.stun = 1.8; e.state = 'chase'; G.shake = 12; addText(e.x, e.y - e.r - 10, 'Atordoado!', '#e0c060'); } else if (e.t <= 0) { e.state = 'recover'; e.t = .5; } break;
    case 'recover': e.t -= dt; if (e.t <= 0) e.state = 'chase'; break;
    default: e.state = 'chase';
  }
};

const _updateEnemy3 = updateEnemy;
updateEnemy = function (e, dt) {
  const f = AI3[e.def.ai3]; if (!f) return _updateEnemy3(e, dt);
  const d = dist(e.x, e.y, P.x, P.y), pa = Math.atan2(P.y - e.y, P.x - e.x);
  if (!ai3Base(e, dt, d)) return;
  if (e.hx === undefined) { e.hx = e.x; e.hy = e.y; }
  f(e, dt, d, pa);
};

/* ------------------------------- desenho ------------------------------- */
const DRAW3 = {
  selvagem(e, fl) {
    const look = { skin: fl ? '#f0e8e0' : '#a07858', hair: '#2a1a10', shirt: '#6a4a2a', pants: '#4a3020', moving: e.state !== 'idle' && e.state !== 'wind', walkT: e.anim * 9, style: 'curto' };
    drawHuman(e.x, e.y, e.ang, look); const hy = e.y - 17;
    seg([e.x - 8, e.y - 4, e.x + 8, e.y - 6], 2.5, '#8a2a2a'); seg([e.x - 8, e.y + 1, e.x + 8, e.y - 1], 2, '#8a2a2a'); // pintura
    circ(e.x, hy + 1, 7.5, '#e4dccc', OL); circ(e.x - 2.8, hy, 1.8, '#141018'); circ(e.x + 2.8, hy, 1.8, '#141018'); seg([e.x - 3, hy + 4, e.x + 3, hy + 4], 1.5, '#8a2a2a'); // máscara de osso
    g.save(); g.translate(e.x, e.y - 2); g.rotate(e.ang + (e.state === 'windt' ? -.6 : .2)); seg([-10, 6, 30 + (e.lunge > 0 ? 8 : 0), 6], 3, '#5a3a22'); poly([28, 3, 38, 6, 28, 9], '#d6ceb4', OL); g.restore();
  },
  xama(e, fl) {
    const look = { skin: fl ? '#f0e8e0' : '#8a6a50', hair: '#e4dccc', shirt: '#3a2a3a', pants: '#2a2024', moving: e.state === 'stalk', walkT: e.anim * 7, style: 'longo' };
    drawHuman(e.x, e.y, e.ang, look); const hy = e.y - 17;
    for (let k = 0; k < 5; k++) seg([e.x - 10 + k * 5, hy - 8, e.x - 12 + k * 6, hy - 18 - (k % 2) * 4], 2.5, k % 2 ? '#c83a3a' : '#e4dccc'); // cocar
    circ(e.x, hy + 1, 7.5, '#d4ccb4', OL); circ(e.x - 2.8, hy, 1.8, '#c84a7a'); circ(e.x + 2.8, hy, 1.8, '#c84a7a');
    seg([e.x + 12, e.y + 10, e.x + 16, e.y - 30], 3, '#5a3a22'); circ(e.x + 16, e.y - 32, 5, e.state === 'cast' ? '#aef48a' : '#b088c4', OL);
    if (e.state === 'cast') { g.save(); g.globalAlpha = .3; circ(e.x, e.y, 40 + Math.sin(RT * 20) * 6, '#86c84a'); g.restore(); }
  },
  uivador(e, fl) {
    const still = e.state === 'idle', a = e.ang; g.save(); if (still && tileAtPx(e.x, e.y) === T.SNOW) g.globalAlpha = .38;
    g.translate(e.x, e.y); shadow(0, 10, 18, 6); g.rotate(a); const w = Math.sin(e.anim * 14) * (still ? 0 : 4);
    for (const [lx, ly] of [[-10, -9], [-10, 9], [9, -9], [9, 9]]) seg([lx, ly, lx + (lx > 0 ? 6 : -4) + w * (ly > 0 ? 1 : -1), ly * 1.4], 4, '#b8c0cc');
    ell(0, 0, 18, 11, fl ? '#ffffff' : '#e4e8ee', OL); for (let k = 0; k < 4; k++) seg([-12 + k * 6, -9, -14 + k * 6, -13], 2, '#c8d0dc');
    circ(17, 0, 8, fl ? '#ffffff' : '#dce2ea', OL); circ(20, -3, 2, '#e04040'); circ(20, 3, 2, '#e04040'); g.restore();
  },
  pernalta(e, fl) {
    const x = e.x, y = e.y, wl = e.anim * (e.state === 'idle' ? 4 : 11); shadow(x, y + 12, 24, 7);
    for (let k = 0; k < 3; k++) { const a = k / 3 * 6.283 + Math.sin(wl + k * 2) * .3, fx = x + Math.cos(a) * 26, fy = y + 10 + Math.sin(a) * 12; seg([x, y - 34, (x + fx) / 2 + Math.cos(a) * 6, y - 40, fx, fy], 6, OL); seg([x, y - 34, (x + fx) / 2 + Math.cos(a) * 6, y - 40, fx, fy], 3, fl ? '#f0e8e0' : '#c49c8a'); }
    ell(x, y - 42, 13, 16, fl ? '#f0e8e0' : '#b88a7a', OL); ell(x - 3, y - 46, 5, 7, '#8a2a3a'); for (let k = 0; k < 3; k++) circ(x - 6 + k * 6, y - 52 + Math.sin(RT * 3 + k) * 2, 2, '#141018');
    seg([x - 10, y - 38, x - 20, y - 22], 3, '#c49c8a'); seg([x + 10, y - 38, x + 22, y - 26], 3, '#c49c8a');
  },
  tecelao(e, fl) {
    const x = e.x, y = e.y, w = Math.sin(e.anim * 10) * 3; shadow(x, y + 8, 20, 6);
    for (let k = 0; k < 8; k++) { const s = k < 4 ? -1 : 1, i = k % 4, a = (s < 0 ? Math.PI : 0) + (i - 1.5) * .45 * s; seg([x, y, x + Math.cos(a) * 18, y + Math.sin(a) * 14 - 6, x + Math.cos(a) * 26 + (i % 2 ? w : -w), y + Math.sin(a) * 20 + 4], 2.5, fl ? '#ffffff' : '#5a2a34'); }
    ell(x, y, 14, 11, fl ? '#f0e8e0' : '#7a3040', OL); ell(x, y - 2, 9, 6, '#a84a5a'); for (let k = 0; k < 4; k++) circ(x - 6 + k * 4, y - 7, 1.8, '#e0c060');
    if (e.state === 'wind') { g.save(); g.globalAlpha = .5; circ(x + Math.cos(e.ang) * 14, y + Math.sin(e.ang) * 14, 6, '#e8e0d0'); g.restore(); }
  },
  milbracos(e, fl) {
    const x = e.x, y = e.y, r = e.r; shadow(x, y + r * .5, r * 1.3, r * .5);
    for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283 + Math.sin(e.anim * 2 + k) * .25 + (e.state === 'sweep' ? e.anim * 8 : 0), L = r + 22 + Math.sin(e.anim * 5 + k * 1.7) * 8, ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L * .7; seg([x + Math.cos(a) * r * .6, y + Math.sin(a) * r * .4, (x + ex) / 2 + Math.cos(a + 1) * 6, (y + ey) / 2, ex, ey], 8, OL); seg([x + Math.cos(a) * r * .6, y + Math.sin(a) * r * .4, (x + ex) / 2 + Math.cos(a + 1) * 6, (y + ey) / 2, ex, ey], 5, fl ? '#f0e8e0' : '#b47a7a'); circ(ex, ey, 4, '#8a4a4a', OL); }
    ell(x, y - 6, r, r * .85, fl ? '#f0e8e0' : '#9a4a5a', OL); ell(x - 6, y - 14, r * .5, r * .35, '#c86a7a'); for (let k = 0; k < 5; k++) ell(x - 14 + k * 7, y + 2 + Math.sin(e.anim * 4 + k) * 2, 3, 5, '#5a1a24');
    if (e.state === 'windc') { g.save(); g.translate(x, y); g.rotate(e.ang); g.fillStyle = 'rgba(220,50,60,.25)'; g.fillRect(0, -r, 380, r * 2); g.restore(); }
    if (e.state === 'sweep') { g.save(); g.globalAlpha = .25 * (1 - e.t / .7); circ(x, y, 135, '#e06a8a'); g.restore(); }
  },
};
const _drawEnemy3 = drawEnemy;
drawEnemy = function (e) {
  const f = DRAW3[e.type]; if (!f) return _drawEnemy3(e);
  if (e.state === 'emerge' || e.state === 'leave') { const k = e.state === 'emerge' ? clamp(1 - e.t / .8, .05, 1) : clamp(e.t / .9, .05, 1); g.save(); g.globalAlpha = k; f(e, e.flash > 0); g.restore(); }
  else f(e, e.flash > 0);
  if (e.hp < e.maxhp && !e.def.boss) { const w = 30; rr(e.x - w / 2, e.y - e.r - 34, w, 4, 2, '#141018'); rr(e.x - w / 2, e.y - e.r - 34, w * clamp(e.hp / e.maxhp, 0, 1), 4, 2, '#c83a3a'); }
  if (e.poison > 0) { g.save(); g.globalAlpha = .45; circ(e.x, e.y - 8, e.r + 4, '#86963a'); g.restore(); }
};

/* ------------------------------- vozes ------------------------------- */
for (const [k, base] of [['selvagem', 'hospedeiro'], ['xama', 'gritador'], ['uivador', 'cao'], ['pernalta', 'saltador'], ['tecelao', 'cuspidor'], ['milbracos', 'bruto']]) if (!SFX['v_' + k] && SFX['v_' + base]) SFX['v_' + k] = SFX['v_' + base];
