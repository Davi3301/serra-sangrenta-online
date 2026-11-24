'use strict';
/* ===================== ESTADO ===================== */
const G = { state: 'title', diff: 'normal', time: 7, enemies: [], animals: [], items: [], projs: [], parts: [], texts: [], fires: [], flares: [], bombs: [], rings: [], decals: [], phant: [], placed: [], quests: [], qdone: {}, evlog: {}, flags: {}, dead: {}, looted: {}, sealed: {}, notes: [], tapes: [], pins: [], builds: {}, seen: {}, lairT: {}, pois: {}, kills: 0, killsBy: {}, shake: 0, target: null, emT: 40, tick: 0, saveT: 0, whT: 20, fog: new Uint8Array(FW * FH), boss: null, sheltered: false, lit: true, uiDirty: true, hintT: 0, ghost: null, car: null, reapDay: 0 };
const P = {};
const keys = {}, mouse = { x: 0, y: 0, wx: 0, wy: 0, down: false, pressed: false, rpressed: false };
const DF = () => DIFFS[G.diff] || DIFFS.normal;
const DEV = { on: false, god: false, needs: false, pack: false, craft: false };

function newPlayer() {
  Object.assign(P, { x: 26.5 * TILE, y: 122.8 * TILE, r: 13, ang: 0, hp: 100, stam: 100, hunger: 80, thirst: 70, sleep: 85, sanity: 100, inf: 0, regen: 0, xp: 0, lvl: 1, sp: 0, skills: {}, inv: [], hot: [null, null, null, null, null, null], sel: 0, armor: null, pack: null, mags: {}, bed: null,
    name: 'Sobrevivente', look: null, origin: null,
    atkCd: 0, swing: null, draw: 0, roll: 0, rollCd: 0, rdx: 0, rdy: 0, inv_t: 0, reload: null, action: null, sleeping: false, driving: false, slept: 0, walkT: 0, moving: false, kx: 0, ky: 0, stamDelay: 0, hurtFlash: 0, flash: 0, slowT: 0, dead: false });
}
const sk = id => P.skills[id] || 0;
const maxHp = () => 100 + 15 * sk('vigor');
const maxSt = () => (100 + 15 * sk('atleta')) * (P.sleep <= 0 ? .55 : 1);
const capacity = () => DEV.pack ? 9999 : 30 + (P.pack ? ITEMS[P.pack].cap : 0) + 5 * sk('mula');
const dayNum = () => Math.floor(G.time / 24) + 1;
const hourNow = () => G.time % 24;
const isNight = () => { const h = hourNow(); return h >= 20.5 || h < 5.5; };
function darkness() { const h = hourNow(); if (h >= 7 && h <= 18) return 0; if (h > 18 && h < 21) return (h - 18) / 3; if (h >= 4.5 && h < 7) return 1 - (h - 4.5) / 2.5; return 1; }
const xpNeed = l => 50 + l * 35;
const lightMul = () => 1 + .12 * sk('vigilia');

/* ===================== INVENTÁRIO ===================== */
function invCount(id) { let n = 0; for (const s of P.inv) if (s.id === id) n += s.n; return n; }
function invFind(id) { return P.inv.find(s => s.id === id); }
const BASE_SLOTS = 32;
const packSlots = () => DEV.pack ? 400 : BASE_SLOTS + (P.pack ? ITEMS[P.pack].slots || 0 : 0);
function canTake(id, n = 1) { const it = ITEMS[id], free = packSlots() - P.inv.length; if (it.dur) return free >= n; let room = free * it.stack; for (const s of P.inv) if (s.id === id) room += it.stack - s.n; return room >= n; }
function invAdd(id, n = 1, dur) {
  const it = ITEMS[id]; if (!it) return; const max = packSlots();
  if (it.dur) { while (n > 0 && P.inv.length < max) { P.inv.push({ id, n: 1, dur: dur === undefined ? it.dur : dur }); n--; } }
  else { for (const s of P.inv) { if (s.id === id && s.n < it.stack) { const k = Math.min(n, it.stack - s.n); s.n += k; n -= k; if (!n) break; } } while (n > 0 && P.inv.length < max) { const k = Math.min(n, it.stack); P.inv.push({ id, n: k }); n -= k; } }
  if (n > 0) { for (let i = 0; i < (it.dur ? n : 1); i++) { dropItem(id, it.dur ? 1 : n, P.x, P.y, dur); G.items[G.items.length - 1].nopick = 3; } hint('Mochila cheia. O que não coube caiu no chão.'); }
  if (['melee', 'ranged', 'throw', 'place'].includes(it.t) && !P.hot.includes(id) && invCount(id) > 0) { const i = P.hot.indexOf(null); if (i >= 0) P.hot[i] = id; }
  G.uiDirty = true;
}
function invRemove(id, n = 1) { for (let i = P.inv.length - 1; i >= 0 && n > 0; i--) { const s = P.inv[i]; if (s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (s.n <= 0) P.inv.splice(i, 1); } } G.uiDirty = true; }
function invWeight() { let w = 0; for (const s of P.inv) w += ITEMS[s.id].w * s.n; return w; }
function give(id, n = 1, quiet) { invAdd(id, n); if (!quiet) toast(`+${n} ${ITEMS[id].n}`, id); }
function curItem() { const id = P.hot[P.sel]; return id && invCount(id) > 0 ? ITEMS[id] : null; }
function wear(id, amt = 1) { const s = invFind(id); if (!s || s.dur === undefined) return; s.dur -= amt / (1 + .25 * sk('maos')); if (s.dur <= 0) { P.inv.splice(P.inv.indexOf(s), 1); toast(`${ITEMS[id].n} quebrou!`, 'u_x'); sfx('break'); } G.uiDirty = true; }
function dropItem(id, n, x, y, dur, toss) { const a = Math.random() * 6.28, v = toss === undefined ? rand(40, 110) : toss; G.items.push({ id, n, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, dur, nopick: .45 }); }
function addXP(n) { P.xp += n; while (P.xp >= xpNeed(P.lvl)) { P.xp -= xpNeed(P.lvl); P.lvl++; const g = P.lvl % 5 === 0 ? 2 : 1; P.sp += g; toast(`Nível ${P.lvl}! +${g} ponto${g > 1 ? 's' : ''} de habilidade (K)`, 'u_star', true); sfx('level'); burst(P.x, P.y, '#c8a84e', 24, 160); P.hp = Math.min(maxHp(), P.hp + 25); } G.uiDirty = true; }

function useItem(id) {
  const it = ITEMS[id]; if (!it || invCount(id) <= 0) return;
  if (it.t === 'food' || it.t === 'med') {
    if (it.inf && !(P.inf > 0)) { toast('Você não está infectado.', 'u_check'); return; }
    if (it.t === 'med' && !it.sanity && !it.inf && P.hp >= maxHp()) { toast('Sua vida já está cheia.', 'u_heart'); return; }
    if (it.inf) { const was = P.inf; P.inf = clamp(P.inf + it.inf, 0, 100); addText(P.x + 16, P.y - 40, '-' + Math.round(was - P.inf) + '% infecção', '#9ac25a'); if (P.inf <= 0) toast('O Tecido saiu do seu sangue.', 'u_check', true); }
    if (it.id === 'calmante' && P.sanity >= 99) { toast('Sua cabeça está no lugar.', 'u_eye'); return; }
    let hp = it.hp || 0; if (hp > 0) hp *= 1 + .18 * sk('herbalista'); else hp *= 1 - .3 * sk('estomago');
    P.hunger = Math.min(100, P.hunger + (it.hunger || 0)); P.thirst = clamp(P.thirst + (it.thirst || 0), 0, 100); P.sleep = Math.min(100, P.sleep + (it.sleep || 0)); P.sanity = clamp(P.sanity + (it.sanity || 0), 0, 100);
    P.hp = clamp(P.hp + hp, 1, maxHp()); if (it.regen) P.regen += it.regen; invRemove(id, 1); if (it.back) invAdd(it.back, 1);
    if (it.hunger) qev('eat'); if (it.thirst && it.thirst >= 10) qev('drink');
    sfx(it.t === 'med' ? 'heal' : 'eat'); if (hp > 0) addText(P.x, P.y - 30, '+' + Math.round(hp), '#6fae72'); if (hp < 0) { addText(P.x, P.y - 30, Math.round(hp) + '', '#c8584e'); toast('Isso não caiu bem...', 'u_warn'); }
  } else if (it.use === 'repair') {
    const cur = curItem(), s = cur && invFind(cur.id); if (!s || s.dur === undefined || s.dur >= cur.dur * .98) { toast('Segure na mão um item desgastado para consertar.', 'kit_reparo'); return; }
    s.dur = cur.dur; invRemove(id, 1); toast(`${cur.n} consertado`, 'kit_reparo'); sfx('craft');
  } else if (it.t === 'armor') { invRemove(id, 1); if (P.armor) invAdd(P.armor, 1); P.armor = id; sfx('equip'); }
  else if (it.t === 'pack') { invRemove(id, 1); if (P.pack) invAdd(P.pack, 1); P.pack = id; sfx('equip'); }
  else if (['melee', 'ranged', 'throw', 'place'].includes(it.t)) { setHot(P.sel, id); sfx('equip'); }
  G.uiDirty = true;
}
function setHot(i, id) { const j = P.hot.indexOf(id); if (j >= 0) P.hot[j] = P.hot[i]; P.hot[i] = id; G.uiDirty = true; }
function unequip(slot) { if (!P[slot]) return; if (P.inv.length + 1 > (slot === 'pack' ? BASE_SLOTS : packSlots())) { toast(slot === 'pack' ? 'Esvazie a mochila antes de tirá-la: sem ela só cabem ' + BASE_SLOTS + ' espaços.' : 'Sem espaço na mochila.', 'u_bag'); return; } const id = P[slot]; P[slot] = null; invAdd(id, 1); G.uiDirty = true; }

/* ===================== EFEITOS ===================== */
function addText(x, y, s, c, big) { G.texts.push({ x: x + rand(-8, 8), y, s, c: c || '#e8e0d0', t: 0, big }); }
function burst(x, y, c, n, spd, size) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = rand(.3, 1) * (spd || 100); G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(.3, .7), max: .7, c, s: (size || 3) * rand(.6, 1.3) }); } }
function decal(x, y, r) { G.decals.push({ x: x + rand(-8, 8), y: y + rand(-6, 6), r: r * rand(.7, 1.3), a: Math.random() * 6.28, k: Math.random() }); if (G.decals.length > 140) G.decals.shift(); }
function ring(x, y, r, c, dur) { G.rings.push({ x, y, r, c, t: 0, dur: dur || .4 }); }
function alertNoise(x, y, r) { for (const e of G.enemies) if (!e.def.patch && dist(x, y, e.x, e.y) < r) e.alert = true; }
function explosion(x, y, r, dmg) {
  dmg *= sk('engenharia') >= 3 ? 1.4 : 1;
  for (const e of G.enemies) { const d = dist(x, y, e.x, e.y); if (d < r + e.r) hurtEnemy(e, dmg * (1 - d / (r + e.r) * .5), Math.atan2(e.y - y, e.x - x), 400); }
  if (dist(x, y, P.x, P.y) < r * .8) hurtPlayer(35, Math.atan2(P.y - y, P.x - x), 400);
  burst(x, y, '#e08a3a', 40, 380, 5); burst(x, y, '#3a3034', 30, 240, 6); ring(x, y, r, '#f4e0b0', .5); G.shake = 18; sfx('boom', x, y); alertNoise(x, y, 900);
}

/* ===================== MOVIMENTO ===================== */
function moveEnt(e, dx, dy, ghost) {
  const r = e.r * .75, mob = !!(e.def && ENEMIES[e.type]); e.hitWall = false;
  const bl = (x, y) => boxSolid(x, y, r) || (mob && boxDoor(x, y, r));
  if (!bl(e.x + dx, e.y)) e.x += dx; else { e.hitWall = true; if (mob) e.wallHit = [e.x + Math.sign(dx) * (r + 8), e.y]; }
  if (!bl(e.x, e.y + dy)) e.y += dy; else { e.hitWall = true; if (mob) e.wallHit = [e.x, e.y + Math.sign(dy) * (r + 8)]; }
  if (ghost) return;
  queryObjs(e.x, e.y, e.r + 40, o => {
    if (!o.solid || o.dead || o === e) return; const d = dist(e.x, e.y, o.x, o.y), m = e.r + o.r;
    if (d < m && d > .01) { const nx = e.x + (e.x - o.x) / d * (m - d), ny = e.y + (e.y - o.y) / d * (m - d); if (!boxSolid(nx, ny, r)) { e.x = nx; e.y = ny; } if (o.type === 'barricada' || o.type === 'muro') e.blockObj = o; e.hitObj = true; }
  });
  const c = G.car; if (c && e !== c && !(e === P && P.driving) && dist(e.x, e.y, c.x, c.y) < e.r + c.r - 4) { const d = dist(e.x, e.y, c.x, c.y) || 1; e.x += (e.x - c.x) / d * 3; e.y += (e.y - c.y) / d * 3; }
  e.x = clamp(e.x, 20, WORLD_W - 20); e.y = clamp(e.y, 20, WORLD_H - 20);
}

/* ===================== CAMINHONETE ===================== */
function carDamage(d) { const c = G.car; if (c.hp <= 0) return; c.hp -= d * (1 - .15 * sk('mecanico')); if (c.hp <= 0) { c.hp = 0; toast('A caminhonete morreu. Conserte com Sucata (X).', 'u_car', true); sfx('break'); } G.uiDirty = true; }
function enterCar() { const c = G.car; BUILD.on = false; P.driving = true; P.action = null; P.swing = null; P.draw = 0; G.ghost = null; sfx('door'); if (c.fuel <= 0) hint('Sem gasolina. Aperte R para abastecer.'); }
function exitCar() {
  const c = G.car; for (const a of [-1.57, 1.57, 3.14, 0]) { const x = c.x + Math.cos(c.ang + a) * 42, y = c.y + Math.sin(c.ang + a) * 42; let ok = !boxSolid(x, y, 11); if (ok) queryObjs(x, y, 40, o => { if (o.solid && !o.dead && dist(x, y, o.x, o.y) < o.r + 10) ok = false; }); if (ok) { P.x = x; P.y = y; P.driving = false; c.spd *= .3; sfx('door'); return; } }
  hint('Sem espaço para sair.');
}
function carRefuel() { const c = G.car; if (c.fuel > 85) { hint('O tanque está cheio.'); return; } if (!invCount('gasolina')) { hint('Você não tem gasolina.'); return; } invRemove('gasolina', 1); c.fuel = Math.min(100, c.fuel + 35); sfx('drink'); toast('Abastecido', 'gasolina'); }
function carRepair() { const c = G.car; if (c.hp >= 99) { hint('A caminhonete está inteira.'); return; } if (!invCount('sucata')) { hint('Você precisa de sucata.'); return; } invRemove('sucata', 1); c.hp = Math.min(100, c.hp + 25); sfx('craft'); toast('Reparo feito', 'kit_reparo'); }
function updateCar(dt) {
  const c = G.car, drive = P.driving, on = drive && c.fuel > 0 && c.hp > 0;
  const acc = on ? (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) : 0, steer = drive ? (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) : 0;
  const t = tileAtPx(c.x, c.y), grip = (t === T.ROAD || t === T.CONC || t === T.BRIDGE) ? 1 : (t === T.DIRT || t === T.RAIL || INDOOR[t]) ? .85 : t === T.MUD ? .5 : .72;
  const max = 430 * grip * (c.hp < 30 ? .6 : 1);
  if (acc > 0) c.spd += (c.spd < 0 ? 520 : 330) * dt; else if (acc < 0) c.spd -= (c.spd > 0 ? 460 : 150) * dt; else c.spd -= Math.sign(c.spd) * Math.min(Math.abs(c.spd), 130 * dt);
  if (drive && keys[' ']) c.spd -= Math.sign(c.spd) * Math.min(Math.abs(c.spd), 620 * dt);
  if (c.spd > max) c.spd = Math.max(max, c.spd - 500 * dt); c.spd = Math.max(c.spd, -180 * grip);
  if (Math.abs(c.spd) < 1) { c.spd = 0; if (!drive) return; }
  c.ang += steer * 2.9 * dt * clamp(c.spd / 80, -1, 1) * (Math.abs(c.spd) > 300 ? .85 : 1);
  c.hitObj = false; moveEnt(c, Math.cos(c.ang) * c.spd * dt, Math.sin(c.ang) * c.spd * dt);
  if (c.hitWall || c.hitObj) { const v = Math.abs(c.spd); if (v > 250) { carDamage(v * .025); G.shake = Math.max(G.shake, v * .03); sfx('thud'); burst(c.x + Math.cos(c.ang) * 26, c.y + Math.sin(c.ang) * 26, '#aaa', 8, 140); } c.spd *= v > 250 ? .35 : .9; }
  c.fuel = Math.max(0, c.fuel - Math.abs(c.spd) * dt * .0032 * (1 - .15 * sk('mecanico')));
  const v = Math.abs(c.spd);
  if (v > 90) {
    for (const e of G.enemies) if (!e.dead && e.state !== 'burrow' && dist(c.x, c.y, e.x, e.y) < c.r + e.r) { if (e.carT > 0) continue; e.carT = .5; hurtEnemy(e, v * .22, c.ang + (c.spd < 0 ? Math.PI : 0), e.def.patch ? 0 : 520); const big = e.def.boss || e.r > 19; c.spd *= big ? .2 : e.def.patch ? .7 : .82; carDamage(big ? 14 : e.r * .12); G.shake = Math.max(G.shake, 6); }
    for (const a of G.animals) if (!a.dead && dist(c.x, c.y, a.x, a.y) < c.r + a.r) hurtAnimal(a, 99, c.ang);
    c.nT = (c.nT || 0) - dt; if (c.nT <= 0) { c.nT = .8; alertNoise(c.x, c.y, 460); }
    if (grip < .7 && Math.random() < dt * 20) G.parts.push({ x: c.x - Math.cos(c.ang) * 24, y: c.y - Math.sin(c.ang) * 24, vx: rand(-30, 30), vy: rand(-30, 0), life: .5, max: .5, c: 'rgba(120,110,100,.5)', s: 5 });
  }
  if (c.hp < 35 && c.fixed && Math.random() < dt * 8) G.parts.push({ x: c.x + Math.cos(c.ang) * 22, y: c.y + Math.sin(c.ang) * 22, vx: rand(-10, 10), vy: rand(-50, -25), life: .9, max: .9, c: 'rgba(40,40,44,.6)', s: rand(4, 8) });
  if (drive) { P.x = c.x; P.y = c.y; P.ang = c.ang; P.moving = false; }
}

/* ===================== JOGADOR ===================== */
function startAction(label, dur, done) { P.action = { label, t: 0, dur, done }; }
function updatePlayer(dt) {
  P.atkCd -= dt; P.rollCd -= dt; P.inv_t -= dt; P.hurtFlash -= dt; P.flash -= dt; P.stamDelay -= dt; P.slowT -= dt;
  if (P.regen > 0) { const k = Math.min(P.regen, 5 * dt); P.regen -= k; P.hp = Math.min(maxHp(), P.hp + k); }
  if (P.sleeping) return;
  if (P.driving) { P.stam = Math.min(maxSt(), P.stam + 20 * dt); P.sprint = false; return; }
  P.ang = Math.atan2(mouse.wy - P.y, mouse.wx - P.x);
  let mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), my = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  if (!mx && !my && window.STICK && STICK.on) { mx = STICK.x; my = STICK.y; } // analógico de toque: qualquer direção
  const moving = !!(mx || my); P.moving = moving;
  const over = invWeight() / capacity();
  let spd = 150 * (1 + .05 * sk('pes'));
  if (over > 1) spd *= Math.max(.3, 1 - (over - 1) * 1.6);
  if (P.sleep <= 0) spd *= .8; if (tileAtPx(P.x, P.y) === T.MUD) spd *= .65; if (P.draw > 0) spd *= .6; if (P.slowT > 0) spd *= .4; if (P.buffT > 0) spd *= 1.25; if (P.crouch) spd *= .55; if (P.blocking) spd *= .6;
  const sprint = keys.shift && moving && P.stam > 1 && over <= 1 && P.draw <= 0 && P.slowT <= 0; P.sprint = sprint;
  if (sprint) { spd *= 1.55; P.stam -= 12 * dt; P.stamDelay = .5; if (Math.random() < dt * 12) G.parts.push({ x: P.x, y: P.y + 10, vx: rand(-20, 20), vy: rand(-20, 0), life: .4, max: .4, c: 'rgba(200,200,200,.35)', s: 3 }); }
  if (P.roll > 0) { P.roll -= dt; moveEnt(P, P.rdx * 400 * dt, P.rdy * 400 * dt); }
  else if (moving) { const l = Math.hypot(mx, my); moveEnt(P, mx / l * spd * dt, my / l * spd * dt); P.walkT += dt * (sprint ? 14 : 10); if (P.action) P.action = null; }
  if (Math.abs(P.kx) + Math.abs(P.ky) > 5) { moveEnt(P, P.kx * dt, P.ky * dt); P.kx -= P.kx * 9 * dt; P.ky -= P.ky * 9 * dt; }
  if (keys[' '] && P.roll <= 0 && P.rollCd <= 0) {
    const cost = 22 * (1 - .15 * sk('pes'));
    if (over > 1) hint('Mochila pesada demais para rolar.'); else if (P.stam >= cost) { let dx = mx, dy = my; if (!moving) { dx = Math.cos(P.ang); dy = Math.sin(P.ang); } const l = Math.hypot(dx, dy); P.rdx = dx / l; P.rdy = dy / l; P.roll = .26; P.rollCd = .65; P.inv_t = .32; P.stam -= cost; P.stamDelay = .7; P.action = null; P.slowT = 0; sfx('roll'); burst(P.x, P.y + 8, 'rgba(200,200,200,.4)', 6, 60); }
  }
  if (P.stamDelay <= 0) P.stam = Math.min(maxSt(), P.stam + 24 * (1 + .12 * sk('atleta')) * (P.hunger < 12 || P.thirst < 12 ? .5 : 1) * (P.sanity < 25 ? .6 : 1) * (P.inf >= 25 ? .75 : 1) * dt);
  P.stam = clamp(P.stam, 0, maxSt());
  if (P.action) { P.action.t += dt; if (P.action.t >= P.action.dur) { const a = P.action; P.action = null; a.done(); } }
  if (P.reload) { P.reload.t += dt; if (P.hot[P.sel] !== P.reload.id) P.reload = null; else if (P.reload.t >= P.reload.dur) { const it = ITEMS[P.reload.id], cur = P.mags[it.id] || 0, k = Math.min(it.mag - cur, invCount(it.ammo)); invRemove(it.ammo, k); P.mags[it.id] = cur + k; P.reload = null; sfx('reload'); } }
  if (P.swing) { const s = P.swing; s.t += dt; if (!s.hit && s.t >= s.dur * .35) { s.hit = true; meleeHit(s.it, s.ang); } if (s.t >= s.dur) P.swing = null; }
  if (BUILD.on) updateBuild(); else playerAttack(dt);
}
/* ===================== CONSTRUÇÃO DE BASE ===================== */
const BUILD = { on: false, sel: 0, tile: null, err: '' };
const bkey = (tx, ty) => tx + ',' + ty;
function buildKeyAt(x, y) { const k = bkey(Math.floor(x / TILE), Math.floor(y / TILE)); return G.builds[k] ? k : null; }
function setTile(tx, ty, t) {
  W.tiles[ty * MW + tx] = t;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) chunks.delete(Math.floor((tx + dx) / CH) + Math.floor((ty + dy) / CH) * 1000);
  if (W.mini) { const m = W.mini.getContext('2d'); m.fillStyle = tileColor(t, tx, ty); m.fillRect(tx * 2, ty * 2, 2, 2); }
}
function buildCheck(tx, ty, pc) {
  if (tx < 2 || ty < 2 || tx >= MW - 2 || ty >= MH - 2) return 'Fora do vale.';
  const t = tileAt(tx, ty), cx = (tx + .5) * TILE, cy = (ty + .5) * TILE, cur = G.builds[bkey(tx, ty)];
  if (dist(P.x, P.y, cx, cy) > 5.5 * TILE) return 'Longe demais.';
  if (cur && !(cur.id === 'piso' && pc.id !== 'piso')) return 'Já há uma construção aqui.';
  if (!cur && (SOLID[t] || t === T.BRIDGE || t === T.DOOR || t === T.RAIL)) return 'Não dá para construir aqui.';
  if (pc.id === 'piso' && INDOOR[t]) return 'Já existe piso aqui.';
  let blocked = false;
  queryObjs(cx, cy, 70, o => { if (!o.dead && (o.solid || (o.placed && pc.id !== 'piso')) && Math.abs(o.x - cx) < TILE / 2 + o.r * .8 && Math.abs(o.y - cy) < TILE / 2 + o.r * .8) blocked = true; });
  if (pc.id !== 'piso') { const ins = e => Math.abs(e.x - cx) < TILE / 2 + e.r * .75 && Math.abs(e.y - cy) < TILE / 2 + e.r * .75; if ((pc.id !== 'porta' && ins(P)) || G.enemies.some(e => !e.dead && ins(e)) || (G.car && ins(G.car))) blocked = true; }
  if (blocked) return 'Algo está no caminho.';
  if (!DEV.craft) for (const k in pc.cost) if (invCount(k) < pc.cost[k]) return 'Faltam materiais.';
  return '';
}
function buildPlace() {
  const pc = BUILDS[BUILD.sel], [tx, ty] = BUILD.tile, err = buildCheck(tx, ty, pc);
  if (err) { hint(err); sfx('click'); return; }
  if (!DEV.craft) for (const k in pc.cost) invRemove(k, pc.cost[k]);
  const old = G.builds[bkey(tx, ty)]; G.builds[bkey(tx, ty)] = { id: pc.id, hp: pc.hp || 0, orig: old ? old.orig : tileAt(tx, ty) };
  setTile(tx, ty, pc.tile); sfx('place'); burst((tx + .5) * TILE, (ty + .5) * TILE, '#a89878', 10, 80); addXP(1);
}
function removeBuild(k, refund) {
  const b = G.builds[k]; if (!b) return; const [tx, ty] = k.split(',').map(Number), pc = BUILDS.find(p => p.id === b.id);
  delete G.builds[k]; setTile(tx, ty, b.orig); burst((tx + .5) * TILE, (ty + .5) * TILE, '#86683f', 14, 140, 4);
  if (refund && pc) { for (const i in pc.cost) { const n = Math.floor(pc.cost[i] / 2); if (n) give(i, n); } sfx('equip'); } else sfx('break');
}
function damageBuild(k, dmg) { const b = G.builds[k]; if (!b || !b.hp) return; b.hp -= dmg; const [tx, ty] = k.split(',').map(Number); sfx('chop'); burst((tx + .5) * TILE, (ty + .5) * TILE, '#86683f', 4, 90); if (b.hp <= 0) removeBuild(k, false); }
function toggleBuild() { if (P.driving || P.sleeping || P.dead) return; BUILD.on = !BUILD.on; G.ghost = null; P.swing = null; P.draw = 0; if (BUILD.on) toast('Construção: clique para erguer, botão direito para desmontar, V para sair', 'u_hammer', true); G.uiDirty = true; sfx('ui'); }
function updateBuild() {
  const tx = Math.floor(mouse.wx / TILE), ty = Math.floor(mouse.wy / TILE); BUILD.tile = [tx, ty]; BUILD.err = buildCheck(tx, ty, BUILDS[BUILD.sel]);
  if (mouse.pressed) buildPlace();
  else if (mouse.rpressed) { const k = bkey(tx, ty); if (!G.builds[k]) hint('Nada construído aqui.'); else if (dist(P.x, P.y, (tx + .5) * TILE, (ty + .5) * TILE) > 5.5 * TILE) hint('Longe demais.'); else removeBuild(k, true); }
}
function hint(msg) { if (G.hintT > 0) return; G.hintT = 1.6; toast(msg, 'u_speech'); }
function playerAttack(dt) {
  const it = curItem() || FIST;
  if (it.kind === 'bow') {
    if (mouse.down && P.atkCd <= 0) { if (invCount(typeof curArrow === 'function' ? curArrow() : 'flecha') > 0) P.draw = Math.min(1, P.draw + dt / (.75 / (1 + .12 * sk('arqueiro')))); else if (mouse.pressed) hint('Sem flechas.'); }
    else if (P.draw > 0) { if (P.draw > .22) fireBow(it, P.draw); P.draw = 0; }
    return;
  }
  P.draw = 0;
  if (mouse.rpressed && it.toss && !P.swing) throwSpear(it);
  if (it.t === 'place') { updateGhost(it); if (mouse.pressed && G.ghost && G.ghost.ok) placeObj(it); return; } G.ghost = null;
  if (!mouse.down || P.atkCd > 0 || P.action || P.roll > 0) return;
  if (it.kind === 'gun') fireGun(it);
  else if (it.t === 'throw') { if (mouse.pressed) throwItem(it); }
  else if (it.t === 'melee') {
    if (it.fish && waterNear(P.x + Math.cos(P.ang) * 40, P.y + Math.sin(P.ang) * 40, 30)) { if (mouse.pressed) { sfx('splash'); startAction('Pescando...', 3.4, () => { wear('vara', 2); if (Math.random() < .68) { give('peixe_cru', 1); addXP(4); } else toast('Nada mordeu a isca.', 'vara'); }); } return; }
    const cost = it.stam * (1 - .14 * sk('folego'));
    if (P.stam < cost * .5) { hint('Sem fôlego!'); return; }
    P.stam = Math.max(0, P.stam - cost); P.stamDelay = .55; P.atkCd = it.cd; P.swing = { t: 0, dur: it.cd * .7, it, hit: false, ang: P.ang }; sfx('swing');
  }
}
function meleeHit(it, ang) {
  const spear = it.kind === 'thrust';
  const range = it.range * (spear ? 1 + .06 * sk('lanceiro') : 1), arc = it.arc * (spear ? 1 : 1 + .15 * sk('varredura'));
  const base = it.dmg * (1 + .12 * sk('golpe')) * (spear ? 1 + .12 * sk('lanceiro') : 1), kb = (it.kb || 100) * (1 + .2 * sk('varredura'));
  let hit = false;
  const test = e => { const d = dist(P.x, P.y, e.x, e.y) - e.r; return d < range && (d < 12 || Math.abs(angDiff(Math.atan2(e.y - P.y, e.x - P.x), ang)) < arc / 2 + .15); };
  for (const e of G.enemies) if (!e.dead && test(e)) { const crit = Math.random() < .07 * sk('critico'); if (hurtEnemy(e, base * (crit ? 2 : 1) * rand(.9, 1.1) * (it.cristal ? 1.3 : 1), ang, kb, crit)) { hit = true; if (it.stun && !e.def.boss && !e.dead) { e.stun = Math.max(e.stun || 0, it.stun); burst(e.x, e.y, '#8ad8ff', 8, 160); } } }
  for (const a of G.animals) if (!a.dead && test(a)) { hurtAnimal(a, base, ang); hit = true; }
  let best = null, bd = 1e9;
  queryObjs(P.x, P.y, range + 40, o => { if (o.dead || o.placed || (!OBJ[o.type].hp && o.type !== 'grass')) return; const d = dist(P.x, P.y, o.x, o.y) - o.r; if (d < range * .75 && (d < 8 || Math.abs(angDiff(Math.atan2(o.y - P.y, o.x - P.x), ang)) < Math.max(arc / 2, .5)) && d < bd) { bd = d; best = o; } });
  if (best && !hit) hit = hitObj(best, it) || hit;
  if (hit && it.id !== 'punho') wear(it.id, 1);
}
function hitObj(o, it) {
  const bonus = 1 + .25 * sk('lenhador'), extra = () => Math.random() < .22 * sk('coletor') ? 1 : 0;
  if (o.type === 'grass') { pickUp(o); return true; }
  if (o.type === 'tree') {
    o.hp -= (it.chop || .4) * bonus; o.shake = .3; sfx('chop'); if (o.k !== 3) burst(o.x, o.y - 30 * o.s, o.k === 1 ? '#2c5a40' : '#4a7a4c', 5, 90, 4); burst(o.x, o.y - 6, '#86683f', 3, 60);
    if (Math.random() < .14) dropItem('graveto', 1, o.x, o.y + 8); if (o.k === 1 && Math.random() < .1) dropItem('resina', 1, o.x, o.y + 8);
    if (o.hp <= 0) { dropItem('madeira', (o.k === 3 ? 2 : randi(3, 4)) + extra(), o.x, o.y); dropItem('graveto', randi(1, 3), o.x, o.y); if (o.k === 2) dropItem('maca', randi(1, 3), o.x, o.y); if (o.k === 1) dropItem('resina', randi(1, 2), o.x, o.y); if (Math.random() < .25) dropItem('pena', 1, o.x, o.y); addXP(3); killObj(o, 72); sfx('fall'); }
    return true;
  }
  if (o.fixed) return false;
  const pow = (it.mine || 0) * bonus;
  if (!pow) { hint('Você precisa de uma picareta para isso.'); burst(o.x, o.y - 8, '#aaa', 2, 50, 2); sfx('clink'); return false; }
  o.hp -= pow; o.shake = .2; sfx('clink'); burst(o.x, o.y - 8, o.type === 'sulfur' ? '#b09a36' : o.type === 'crystal' ? '#9a5ab0' : '#8c898e', 5, 110);
  if (o.hp <= 0) {
    const D = { rock: [['pedra', 2, 3], ['silex', 0, 1]], iron: [['minerio', 2, 3], ['pedra', 1, 1]], coal: [['carvao', 2, 4]], sulfur: [['enxofre', 2, 3]], crystal: [['cristal', 1, 1]] }[o.type];
    for (const d of D) { const n = randi(d[1], d[2]) + (d[1] ? extra() : 0); if (n) dropItem(d[0], n, o.x, o.y); }
    addXP(4); killObj(o, 96); sfx('fall');
  }
  return true;
}
function killObj(o, hours) { o.dead = true; if (o.type !== 'bush') o.solid = false; G.dead[o.id] = G.time + hours; }
function fireBow(it, c) {
  const ar = typeof curArrow === 'function' ? curArrow() : 'flecha'; invRemove(ar, 1); const sp = 430 + 520 * c;
  G.projs.push({ fire: ar === 'flecha_fogo', poison: ar === 'flecha_veneno', kind: 'arrow', from: 'p', x: P.x + Math.cos(P.ang) * 18, y: P.y + Math.sin(P.ang) * 18, vx: Math.cos(P.ang) * sp, vy: Math.sin(P.ang) * sp, ang: P.ang, dmg: it.dmg * (.35 + .65 * c) * (1 + .12 * sk('arqueiro')), life: .5 + .5 * c, kb: 120 });
  P.atkCd = .25; wear(it.id, 1); sfx('bow');
}
function fireGun(it) {
  const m = P.mags[it.id] || 0;
  if (P.reload) return;
  if (m <= 0) { if (invCount(it.ammo) > 0) startReload(); else if (mouse.pressed) { hint('Sem munição.'); sfx('click'); } return; }
  if (Math.random() >= .06 * sk('economia_m')) P.mags[it.id] = m - 1;
  const n = it.pellets || 1, sp = it.spread * (1 - .22 * sk('mao_firme')) * (P.sanity < 25 ? 1.6 : 1);
  for (let i = 0; i < n; i++) { const a = P.ang + (Math.random() - .5) * 2 * sp, v = it.speed * rand(.92, 1.05); G.projs.push({ poison: !!it.dart, kind: it.pebble ? 'stone' : it.bolt ? 'arrow' : 'bullet', bolt: it.bolt, from: 'p', x: P.x + Math.cos(P.ang) * 24, y: P.y + Math.sin(P.ang) * 24, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ang: a, dmg: it.dmg, life: n > 1 ? .28 : .6, pierce: it.pierce || 0, kb: 110, hits: [] }); }
  P.atkCd = it.cd; if (!it.bolt) { P.flash = .07; G.shake = Math.max(G.shake, n > 1 ? 9 : it.id === 'rifle' ? 8 : 4); P.kx -= Math.cos(P.ang) * (n > 1 ? 150 : 50); P.ky -= Math.sin(P.ang) * (n > 1 ? 150 : 50); }
  wear(it.id, .5); sfx(it.bolt ? 'bow' : n > 1 ? 'shotgun' : 'shot'); if (it.noise) alertNoise(P.x, P.y, it.noise); G.uiDirty = true;
}
function startReload() { const it = curItem(); if (!it || it.kind !== 'gun' || P.reload) return; if ((P.mags[it.id] || 0) >= it.mag) return; if (invCount(it.ammo) <= 0) { hint('Sem munição.'); return; } P.reload = { t: 0, dur: it.reload * (1 - .15 * sk('recarga')), id: it.id }; sfx('click'); }
function throwSpear(it) {
  if (P.stam < 8) { hint('Sem fôlego!'); return; } const s = invFind(it.id); if (!s) return;
  P.inv.splice(P.inv.indexOf(s), 1); P.stam -= 10; P.stamDelay = .6; P.atkCd = .4; G.uiDirty = true;
  G.projs.push({ kind: 'spear', from: 'p', item: it.id, dur: s.dur, x: P.x + Math.cos(P.ang) * 18, y: P.y + Math.sin(P.ang) * 18, vx: Math.cos(P.ang) * 620, vy: Math.sin(P.ang) * 620, ang: P.ang, dmg: it.dmg * 1.5 * (1 + .12 * sk('lanceiro')) * (1 + .12 * sk('golpe')), life: .62, kb: 220, iron: it.iron });
  sfx('bow');
}
function throwItem(it) {
  invRemove(it.id, 1); const d = Math.min(340, dist(P.x, P.y, mouse.wx, mouse.wy)), life = Math.max(.1, d / 430);
  G.projs.push({ kind: 'lob', item: it.id, from: 'p', x: P.x, y: P.y, vx: Math.cos(P.ang) * 430, vy: Math.sin(P.ang) * 430, ang: 0, life, max: life, dmg: 0 }); P.atkCd = .6; sfx('swing');
}
function waterNear(x, y, r) { for (let a = 0; a < 6.28; a += .785) { const t = tileAtPx(x + Math.cos(a) * r, y + Math.sin(a) * r); if (t === T.WATER || t === T.DEEP) return true; } return false; }
function updateGhost(it) {
  const d = clamp(dist(P.x, P.y, mouse.wx, mouse.wy), 34, 95), x = P.x + Math.cos(P.ang) * d, y = P.y + Math.sin(P.ang) * d, r = OBJ[it.id].r;
  let ok = !boxSolid(x, y, r); if (ok) queryObjs(x, y, r + 90, o => { if (!o.dead && (o.solid || o.placed) && (typeof shapeHit === 'function' ? shapeHit(o, x, y, r) : dist(x, y, o.x, o.y) < r + o.r)) ok = false; });
  G.ghost = { x, y, id: it.id, ok, r };
}
function placeObj(it) {
  const g = G.ghost; invRemove(it.id, 1);
  const o = mkObj(it.id, g.x, g.y, { placed: 1 }); if (it.id === 'bau') o.inv = []; if (it.id === 'coletor') o.water = 0; if (it.id === 'cama') P.bed = { x: g.x, y: g.y };
  G.placed.push(o); qev('place:' + it.id); sfx('place'); burst(g.x, g.y, '#a89878', 10, 80); P.atkCd = .3; G.ghost = null;
}
function removePlaced(o, giveBack) {
  gridRemove(o); o.dead = true; const i = G.placed.indexOf(o); if (i >= 0) G.placed.splice(i, 1);
  if (giveBack) { give(o.type, 1); if (o.inv) for (const s of o.inv) invAdd(s.id, s.n, s.dur); } else { burst(o.x, o.y, '#86683f', 14, 140, 4); sfx('break'); }
  if (o.type === 'cama' && P.bed && dist(P.bed.x, P.bed.y, o.x, o.y) < 5) P.bed = null;
}
function dismantle() { let best = null, bd = 70; for (const o of G.placed) { const d = dist(P.x, P.y, o.x, o.y); if (d < bd) { bd = d; best = o; } } if (best) { removePlaced(best, true); sfx('equip'); } else hint('Nada para desmontar por perto.'); }

function hurtPlayer(dmg, ang, kb, src) {
  if (P.inv_t > 0 || P.dead || G.state !== 'play' || DEV.god) return;
  dmg *= DF().dmg;
  if (P.driving) { carDamage(dmg * .5); dmg *= .3; kb = 0; }
  dmg *= (1 - (P.armor ? ITEMS[P.armor].def : 0)) * (1 - .07 * sk('pele'));
  P.hp -= dmg; P.inv_t = .35; P.hurtFlash = .45; G.shake = Math.max(G.shake, 7); P.kx += Math.cos(ang) * (kb === undefined ? 200 : kb); P.ky += Math.sin(ang) * (kb === undefined ? 200 : kb); P.action = null; P.sanity = Math.max(0, P.sanity - 1.5);
  addText(P.x, P.y - 28, '-' + Math.round(dmg), '#d04848'); burst(P.x, P.y, '#a01c28', 8, 120); decal(P.x, P.y, 9); sfx('hurt');
  if (src === 'inf') addInf(dmg * INF_HIT * (P.armor && ITEMS[P.armor].hazmat ? .4 : 1));
  if (P.sleeping) wakeUp('Você foi atacado enquanto dormia!');
  if (P.hp <= 0) die();
}
/* ===================== INFECÇÃO =====================
   Só sobe quando uma criatura fere você (golpe, mordida, ácido, Carne Rasteira).
   Não cresce sozinha com o tempo. O Remédio Antisséptico tira um pouco; o Antídoto, tudo. */
// parte do dano recebido que vira infecção (baixa de propósito: a infecção sobe devagar, golpe a golpe)
const INF_HIT = .12;
const INF_MULT = { facil: .6, normal: 1, aventura: .8, dificil: 1.35 };
const INF_STAGES = [[25, 'A ferida está escurecendo. Você está infectado.'], [50, 'Febre. O Tecido se espalha pelo sangue.'], [75, 'Suas veias ficaram escuras. Ache uma cura logo.']];
function addInf(v) {
  if (DEV.god || P.dead || v <= 0) return; v *= INF_MULT[G.diff] || 1; const was = P.inf || 0; P.inf = Math.min(100, was + v);
  if (v >= .5) addText(P.x + 18, P.y - 14, '+' + (v < 1.5 ? v.toFixed(1) : Math.round(v)) + '% infecção', '#9ac25a');
  for (const [s, msg] of INF_STAGES) if (was < s && P.inf >= s) toast(msg, 'tecido_vivo', true);
  if (P.inf >= 12) startQuest('s_cura');
  if (P.inf >= 100) { P.deathBy = 'inf'; die(); }
}
function infTick(dt) {
  const f = P.inf || 0; if (f < 75 || P.dead) return;
  if (P.hp > 15) P.hp = Math.max(15, P.hp - .15 * dt);
  P.coughT = (P.coughT === undefined ? rand(8, 20) : P.coughT) - dt;
  if (P.coughT <= 0) { P.coughT = rand(18, 36); sfx('cough'); alertNoise(P.x, P.y, 380); addText(P.x, P.y - 34, '*tosse*', '#9ac25a'); }
}
function die() { if (DEV.god) { P.hp = maxHp(); return; } BUILD.on = false; P.hp = 0; P.dead = true; P.driving = false; G.state = 'dead'; sfx('death'); showDeath(); }
// ressurgir sem morrer: tira o jogador de lugares onde ficou preso e leva de volta à cama
function unstuck() {
  if (P.dead || CS.on || G.state !== 'play') return;
  const b = P.bed || { x: 26.5 * TILE, y: 122.8 * TILE }, drv = P.driving;
  Object.assign(P, { driving: false, sleeping: false, action: null, swing: null, reload: null, kx: 0, ky: 0, roll: 0 }); BUILD.on = false;
  let px = b.x, py = b.y + 26; for (let k = 0; k < 60; k++) { const a = k * 2.4, r = k ? 18 + k * 5 : 0, x = b.x + Math.cos(a) * r, y = b.y + 26 + Math.sin(a) * r; if (!boxSolid(x, y, P.r) && !boxDoor(x, y, P.r)) { px = x; py = y; break; } }
  P.x = px; P.y = py;
  if (drv && G.car) for (let k = 0; k < 80; k++) { const a = k * 2.4, r = 70 + k * 5, x = px + Math.cos(a) * r, y = py + Math.sin(a) * r; if (!boxSolid(x, y, 30)) { Object.assign(G.car, { x, y, spd: 0 }); break; } }
  G.time += 1; cam.x = P.x - VW / 2; cam.y = P.y - VH / 2; G.uiDirty = true; sfx('door'); toast('Você voltou ao acampamento. Passou uma hora.', 'u_house', true); saveGame();
}
function respawn() {
  const b = P.bed || { x: 26.5 * TILE, y: 122.8 * TILE }; P.x = b.x; P.y = b.y + 26; P.dead = false; P.driving = false; P.hp = maxHp() * .6; P.hunger = Math.max(P.hunger, 45); P.thirst = Math.max(P.thirst, 45); P.sleep = Math.max(P.sleep, 50); P.sanity = Math.max(P.sanity, 50); P.inf = Math.min(P.inf || 0, 55); P.deathBy = null; P.xp = Math.floor(P.xp * DF().keep); P.kx = P.ky = 0; P.sleeping = false;
  G.time += 6; G.enemies = G.enemies.filter(e => e.def.boss); for (const e of G.enemies) { e.hp = e.maxhp; e.state = 'idle'; e.alert = false; } G.projs = []; G.fires = []; G.phant = []; G.state = 'play'; saveGame();
}

/* ===================== SONO ===================== */
function trySleep() {
  if (G.enemies.some(e => !e.def.patch && dist(e.x, e.y, P.x, P.y) < 380)) { toast('Há algo por perto. Perigoso demais para dormir.', 'u_warn'); return; }
  if (P.sleep > 82 && !isNight()) { toast('Você não está com sono.', 'u_zzz'); return; }
  P.sleeping = true; P.slept = 0; P.action = null; P.swing = null; saveGame(); sfx('sleep');
}
function wakeUp(msg) { if (!P.sleeping) return; P.sleeping = false; if (msg) toast(msg, 'u_clock', true); if (P.slept >= 2) { qev('sleep'); saveGame(); } }
function updateSleep(dth) {
  P.slept += dth; P.sleep = Math.min(100, P.sleep + 13 * (1 + .15 * sk('sono_leve')) * dth); P.sanity = Math.min(100, P.sanity + (G.sheltered ? 9 : 3) * dth);
  if (P.hunger > 20 && P.thirst > 20) P.hp = Math.min(maxHp(), P.hp + 4 * (P.inf >= 50 ? .5 : 1) * dth);
  const h = hourNow();
  if (P.sleep >= 100 && h > 5.5 && h < 20) wakeUp('Você acordou descansado.');
  else if (P.hunger < 6 || P.thirst < 6) wakeUp('A fome e a sede te acordaram.');
  else if (G.enemies.some(e => !e.def.patch && dist(e.x, e.y, P.x, P.y) < 170)) wakeUp('Algo se aproxima!');
}

/* ===================== INIMIGOS ===================== */
function spawnEnemy(type, x, y, home) {
  const def = ENEMIES[type], d = dayNum(), hs = (def.boss ? 1.15 : Math.min(2.6, 1 + .09 * (d - 1))) * DF().hp;
  const e = { type, def, x, y, r: def.r, hp: def.hp * hs, maxhp: def.hp * hs, dmg: def.dmg * (def.boss ? 1.1 : Math.min(2.0, 1 + .06 * (d - 1))) * (G.diff === 'facil' ? 1 : 1.1), state: 'emerge', t: .8, ang: Math.random() * 6.28, kx: 0, ky: 0, flash: 0, stun: 0, cd: rand(.8, 2), anim: rand(0, 10), home, sun: 0, sideT: 0, side: 1, cyc: 0, hx: x, hy: y, carT: 0, trail: def.snake ? [] : null };
  if (def.wild) { e.state = 'idle'; e.t = 0; e.side = Math.random() < .5 ? -1 : 1; e.orb = Math.random() * 6.28; }
  G.enemies.push(e); if (!def.patch && !def.wild && G.state === 'play') sfx('emerge', x, y, type); if (!def.patch && !def.wild) burst(x, y, '#3a2c30', 12, 120, 5); return e;
}
function hurtEnemy(e, dmg, ang, kb, crit) {
  if (e.dead || e.state === 'burrow' || e.state === 'leave') return false;
  e.hp -= dmg; e.flash = .12; e.alert = true; e.sun = 0; e.fury = 1.4; e.rage = true;
  if (!e.def.boss && !e.def.patch && !e.def.reaper) { const m = 12 / e.r; e.kx += Math.cos(ang) * (kb || 0) * m; e.ky += Math.sin(ang) * (kb || 0) * m; if (e.state !== 'charge') e.stun = Math.max(e.stun, .1); }
  addText(e.x, e.y - e.r - 8, Math.round(dmg) + (crit ? '!' : ''), crit ? '#e0c060' : '#e8e0d0', crit); burst(e.x, e.y, e.type === 'cuspidor' ? '#7a8a34' : '#8a1c2a', 6, 130); if (Math.random() < .5) decal(e.x, e.y, e.r * .7); sfx('hit', e.x, e.y, e.type);
  if (e.hp <= 0) killEnemy(e); return true;
}
function rollDrops(drops, x, y, mult = 1) { for (const d of drops) { if (Math.random() < d[1] * mult) { let n = d[2]; if (['carne_crua', 'couro', 'quitina', 'osso', 'tecido_vivo'].includes(d[0]) && Math.random() < .25 * sk('esfolador')) n++; dropItem(d[0], n, x, y); } } }
function killEnemy(e) {
  if (e.dead) return;
  e.dead = true; rollDrops(e.def.drops, e.x, e.y, e.def.boss ? 1 : .45 * DF().loot); addXP(e.def.xp); G.kills++; G.killsBy[e.type] = (G.killsBy[e.type] || 0) + 1; P.sanity = Math.min(100, P.sanity + 2 * sk('frieza'));
  burst(e.x, e.y, '#7a1422', e.def.boss ? 60 : 18, e.def.boss ? 320 : 170, 5); for (let i = 0; i < 3; i++) decal(e.x, e.y, e.r); sfx('die', e.x, e.y, e.type); if (e.def.boss) { G.shake = 20; G.boss = null; ring(e.x, e.y, 200, '#e0a0b0', .8); }
  if (e.lair !== undefined && !G.enemies.some(o => o !== e && !o.dead && o.lair === e.lair)) G.lairT[e.lair] = G.time + 44;
  if (e.def.split) for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28, n = spawnEnemy(i ? 'larva' : 'rastejante', e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 18); n.state = 'chase'; n.t = 0; n.lair = e.lair; }
  qev('kill:' + e.type); qev('kill:any');
  if (e.type === 'mae') { for (const o of G.enemies) if (!o.dead && o !== e) { o.dead = true; burst(o.x, o.y, '#7a1422', 10, 120); } showDialog([['eu', G.diff === 'aventura' ? 'Ela caiu. Por esta noite, o vale é meu.' : 'Ela caiu. O chão parou de pulsar... por enquanto. Preciso plantar a Carga Ômega na Grande Fenda antes que ela se refaça.']]); }
}
function steer(e, ang, spd, dt) {
  if (e.sideT > 0) { e.sideT -= dt; ang += e.side * 1.25; }
  let sx = 0, sy = 0;
  for (const o of G.enemies) { if (o === e || o.dead || o.def.patch) continue; const d = dist(e.x, e.y, o.x, o.y), m = e.r + o.r; if (d < m && d > .01) { sx += (e.x - o.x) / d * 60; sy += (e.y - o.y) / d * 60; } }
  moveEnt(e, (Math.cos(ang) * spd + sx) * dt, (Math.sin(ang) * spd + sy) * dt);
  if ((e.hitWall || e.hitObj) && e.sideT <= 0) { e.sideT = rand(.4, 1); e.side = Math.random() < .5 ? -1 : 1; } e.hitObj = false;
  e.ang = ang;
}
function enemyShoot(e, ang, spd) { G.projs.push({ kind: 'acid', from: 'e', x: e.x + Math.cos(ang) * e.r, y: e.y + Math.sin(ang) * e.r, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, ang, dmg: e.type === 'mae' ? 14 : e.dmg, life: 2.2 }); }
function nearOpenFissure(x, y, r) { for (const f of W.fissures) if (!f.sealed && dist(x, y, f.x, f.y) < r) return true; return dist(x, y, 75 * TILE, 20 * TILE) < 20 * TILE; }
const looking = (e, d, w) => !P.sleeping && d < 560 && Math.abs(angDiff(P.ang, Math.atan2(e.y - P.y, e.x - P.x))) < (w || .8);
function updateEnemy(e, dt) {
  e.anim += dt; e.flash -= dt; e.carT -= dt; if (e.fury > 0) e.fury -= dt;
  const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy), pa = Math.atan2(dy, dx), def = e.def, night = isNight();
  e.vT = (e.vT === undefined ? rand(.4, 3) : e.vT) - dt; if (e.vT <= 0) { e.vT = rand(2.4, 5.5) * (def.boss ? .55 : 1) * (e.state === 'idle' ? 1.5 : 1); if (d < 760 && e.state !== 'emerge' && e.state !== 'leave') sfx('v_' + e.type, e.x, e.y, e.state); }
  if (!G.seen[e.type] && d < 280 && e.state !== 'burrow') { G.seen[e.type] = 1; toast('Novo registro no Arquivo: ' + def.n, 'u_tv', true); G.uiDirty = true; }
  if (def.patch) { e.state = 'idle'; if (d < e.r && !P.driving && P.roll <= 0 && !P.dead) { P.slowT = .25; P.hp -= e.dmg * DF().dmg * dt; addInf(e.dmg * DF().dmg * dt * INF_HIT * .35); P.hurtFlash = Math.max(P.hurtFlash, .2); P.sanity = Math.max(0, P.sanity - 2 * dt); if (Math.random() < dt * 5) burst(P.x, P.y + 6, '#8a1c2a', 2, 50); if (P.hp <= 0) die(); } return; }
  if (Math.abs(e.kx) + Math.abs(e.ky) > 4) { moveEnt(e, e.kx * dt, e.ky * dt); e.kx -= e.kx * 8 * dt; e.ky -= e.ky * 8 * dt; }
  if (e.stun > 0) { e.stun -= dt; return; }
  if (e.trail) { const l = e.trail[0]; if (!l || dist(l[0], l[1], e.x, e.y) > 7) { e.trail.unshift([e.x, e.y]); if (e.trail.length > 9) e.trail.pop(); } }
  if (e.type === 'mae') return updateBoss(e, dt, d, pa);
  const exempt = def.boss || def.wild || (e.lair !== undefined && !e.nightOnly) || INDOOR[tileAtPx(e.x, e.y)];
  if (!night && !exempt && e.state !== 'leave' && hourNow() > 6 && hourNow() < 19) { if (!nearOpenFissure(e.x, e.y, 560)) { e.sun += dt; if (e.sun > 5) { e.state = 'leave'; e.t = .9; } } else e.sun = 0; }
  const aggro = def.aggro * (typeof senseMul === 'function' ? senseMul() : 1) * (night ? 1.15 : .85) * (1 - .1 * sk('instinto')) * (def.reaper && (P.sprint || P.driving) ? 1.9 : 1);
  if (def.fly) return updateFlyer(e, dt, d, pa, aggro);
  switch (e.state) {
    case 'emerge': e.t -= dt; if (e.t <= 0) e.state = e.home ? 'idle' : 'chase'; break;
    case 'leave': e.t -= dt; if (e.t <= 0) { e.dead = true; burst(e.x, e.y, '#3a2c30', 10, 100, 5); } break;
    case 'idle':
      if (!def.mimic) { e.cd -= dt; if (e.cd <= 0) { e.cd = rand(1.5, 4); e.wa = Math.random() * 6.28; e.wt = rand(.5, 1.5) * (def.reaper ? 3 : 1); if (dist(e.x, e.y, e.hx, e.hy) > (def.reaper ? 500 : 160)) e.wa = Math.atan2(e.hy - e.y, e.hx - e.x); } if (e.wt > 0) { e.wt -= dt; steer(e, e.wa, def.spd * (def.reaper ? .8 : .35), dt); } }
      if (!P.dead && (d < aggro || e.alert)) { e.state = 'chase'; e.cd = rand(.6, 1.6); if (def.reaper) { sfx('roar', e.x, e.y, e.type); G.shake = Math.max(G.shake, 6); } }
      break;
    case 'chase': {
      if (P.dead) { e.state = 'idle'; break; }
      if (d > (def.reaper ? 620 : 1100) && !def.boss) { e.state = 'idle'; e.alert = false; e.rage = false; break; }
      e.cd -= dt;
      if (e.wallHit) { const k = buildKeyAt(e.wallHit[0], e.wallHit[1]); e.wallHit = null; if (k && G.builds[k].hp) { e.bt2 = (e.bt2 || 0) + dt * 2; if (e.bt2 > .8) { e.bt2 = 0; e.lunge = .15; damageBuild(k, e.dmg * (def.armor || def.charge ? 1.6 : 1)); } } }
      if (e.blockObj) { e.bt = (e.bt || 0) + dt; if (e.bt > .8) { e.bt = 0; const o = e.blockObj; o.hp -= e.dmg; o.shake = .2; sfx('chop', e.x, e.y, e.type); burst(o.x, o.y, '#86683f', 4, 80); if (o.hp <= 0) removePlaced(o); } e.blockObj = null; }
      const reach = e.r + P.r + (def.reaper ? 56 : def.maul ? 20 : 8);
      if (def.ranged) {
        if (d > 280) steer(e, pa, def.spd, dt); else if (d < 170) steer(e, pa + Math.PI, def.spd * .9, dt); else steer(e, pa + 1.57 * e.side, def.spd * .4, dt);
        if (e.cd <= 0 && d < 360) { e.state = 'wind'; e.t = .5; e.atk = 'spit'; }
      } else if (def.scream) {
        if (d > 300) steer(e, pa, def.spd, dt); else if (d < 200) steer(e, pa + Math.PI, def.spd, dt); else steer(e, pa + 1.57 * e.side, def.spd * .5, dt);
        if (e.cd <= 0 && d < 520) { e.state = 'wind'; e.t = .7; e.atk = 'scream'; }
      } else if (def.mimic) {
        const flare = G.flares.some(f => dist(f.x, f.y, e.x, e.y) < 280), dorm = darkness() < .3 && !INDOOR[tileAtPx(e.x, e.y)];
        e.frozen = !(e.fury > 0) && (flare || dorm || looking(e, d));
        if (d < reach + 6 && e.cd <= 0) { e.state = 'wind'; e.t = .28; e.atk = 'melee'; e.reach = reach + 20; }
        else if (!e.frozen) { steer(e, pa, def.spd, dt); e.mv = true; } else e.mv = false;
        if (d < 300 && !P.sleeping) P.sanity = Math.max(0, P.sanity - 1.4 * (1 - .15 * sk('nervos')) * dt);
        e.wh = (e.wh || rand(4, 9)) - dt; if (e.wh <= 0 && d < 500) { e.wh = rand(7, 14); toast(WHISPERS[randi(0, WHISPERS.length - 1)], 'u_speech'); sfx('whisper', e.x, e.y, e.type); }
      } else {
        if (def.leap && d > (def.lp ? def.lp[3] : 90) && d < (def.lp ? def.lp[4] : 280) && e.cd <= 0) { e.state = 'windl'; e.t = def.lp ? def.lp[0] : .45; e.ltgt = [P.x, P.y]; break; }
        if (def.burrow && d > 230 && e.cd <= 0) { e.state = 'burrow'; e.t = 4; burst(e.x, e.y, '#3a2c30', 12, 110, 5); break; }
        if (def.charge && d > 120 && d < 350 && e.cd <= 0) { e.state = 'windc'; e.t = .75; break; }
        let sp = def.spd, a = pa;
        if (def.zig) a += Math.sin(e.anim * 9 + e.hx) * .8;
        if (def.pack && d < 200 && d > reach && e.cd > .4) { a = pa + 1.35 * e.side; sp *= .85; }
        if (def.maul && e.hp < e.maxhp * .5) sp *= 1.35;
        if (def.host) { if (d < 190) e.rage = true; sp = e.rage ? 152 : 48; if (!e.rage) a += Math.sin(e.anim * 2.3) * .5; }
        if (def.snake) { a += Math.sin(e.anim * 7) * .75; if (e.ret > 0) { e.ret -= dt; a = pa + Math.PI + Math.sin(e.anim * 7) * .5; } }
        if (def.reaper) { sp = 72; if (d < 420) { P.sanity = Math.max(0, P.sanity - 1.8 * (1 - .15 * sk('nervos')) * dt); e.stepT = (e.stepT || 0) - dt; if (e.stepT <= 0) { e.stepT = .8; G.shake = Math.max(G.shake, 3 + (420 - d) / 70); sfx('step', e.x, e.y, e.type); } } }
        if (e.type === 'alfa' && e.hp < e.maxhp * .5) sp *= 1.3;
        if (def.armor && e.fury > 0) sp *= 1.9;
        if (d < reach && !(e.ret > 0)) { e.state = 'wind'; e.t = def.reaper ? .8 : def.charge || def.maul ? .5 : .3; e.atk = 'melee'; e.reach = reach + 18; }
        else steer(e, a, sp, dt);
      }
      if (e.type === 'alfa' && e.hp < e.maxhp * .55) { e.sumT = (e.sumT || 6) - dt; if (e.sumT <= 0) { e.sumT = 13; for (let i = 0; i < 2; i++) spawnEnemy('rastejante', e.x + rand(-80, 80), e.y + rand(-80, 80)); ring(e.x, e.y, 120, '#c85a7a', .5); sfx('roar', e.x, e.y, e.type); } }
      break;
    }
    case 'wind': e.t -= dt; if (!def.reaper) e.ang = pa;
      if (e.t <= 0) {
        if (e.atk === 'scream') { ring(e.x, e.y, 420, '#c8485e', .6); G.shake = Math.max(G.shake, 7); sfx('scream', e.x, e.y, e.type); if (d < 420) P.sanity = Math.max(0, P.sanity - 14 * (1 - .15 * sk('nervos'))); alertNoise(e.x, e.y, 700); for (let i = 0; i < 2; i++) { const a = Math.random() * 6.28, x = e.x + Math.cos(a) * 50, y = e.y + Math.sin(a) * 50; if (freeSpot(x, y) && G.enemies.length < 40) { const n = spawnEnemy('larva', x, y); n.state = 'chase'; n.t = 0; n.lair = e.lair; } } e.cd = rand(5, 7); }
        else if (e.atk === 'spit') { enemyShoot(e, pa + rand(-.08, .08), 270); e.cd = rand(1.8, 2.6); sfx('spit', e.x, e.y, e.type); e.side = -e.side; }
        else { e.lunge = .15; if (d < (e.reach || e.r + P.r + 24)) hurtPlayer(e.dmg, pa, def.charge || def.reaper || def.maul ? 340 : 180, 'inf'); if (def.snake) e.ret = 1.1; if (def.mimic) e.cd = .9; if (def.reaper) ring(e.x, e.y, e.reach, '#c8a0a8', .3); }
        e.state = 'recover'; e.t = e.atk === 'spit' ? .3 : def.reaper ? .9 : .55;
      } break;
    case 'recover': e.t -= dt; if (e.t <= 0) e.state = 'chase'; break;
    case 'burrow': e.t -= dt; { const sp = 250; e.x += Math.cos(pa) * sp * dt; e.y += Math.sin(pa) * sp * dt; if (Math.random() < dt * 20) G.parts.push({ x: e.x, y: e.y, vx: rand(-30, 30), vy: rand(-40, -10), life: .4, max: .4, c: '#3a2c30', s: 4 }); if (d < 50 || e.t <= 0) { if (boxSolid(e.x, e.y, e.r)) { e.x = P.x; e.y = P.y; } e.state = 'surface'; e.t = .65; } } break;
    case 'surface': e.t -= dt; if (e.t <= 0) { burst(e.x, e.y, '#3a2c30', 18, 180, 5); ring(e.x, e.y, 50, '#a89898', .3); sfx('thud', e.x, e.y, e.type); if (dist(e.x, e.y, P.x, P.y) < 50) hurtPlayer(e.dmg, pa, 260, 'inf'); e.state = 'recover'; e.t = .7; e.cd = rand(5, 8); } break;
    case 'windl': e.t -= dt; e.ang = pa; if (e.t <= 0) { e.state = 'leap'; e.t = def.lp ? def.lp[2] : .36; e.cdir = Math.atan2(e.ltgt[1] - e.y, e.ltgt[0] - e.x); sfx('leap', e.x, e.y, e.type); } break;
    case 'leap': { const ls = def.lp ? def.lp[1] : 680; e.t -= dt; moveEnt(e, Math.cos(e.cdir) * ls * dt, Math.sin(e.cdir) * ls * dt); } e.ang = e.cdir; if (d < e.r + P.r + 6) { hurtPlayer(e.dmg, e.cdir, 300, 'inf'); e.state = 'recover'; e.t = .6; e.cd = rand(2, 3.2); } else if (e.t <= 0 || e.hitWall) { e.state = 'recover'; e.t = .5; e.cd = rand(2, 3.2); } break;
    case 'windc': e.t -= dt; e.ang = pa; if (e.t <= 0) { e.state = 'charge'; e.t = .85; e.cdir = pa; sfx('roar', e.x, e.y, e.type); } break;
    case 'charge': e.t -= dt; moveEnt(e, Math.cos(e.cdir) * 430 * dt, Math.sin(e.cdir) * 430 * dt); e.ang = e.cdir;
      if (Math.random() < dt * 30) G.parts.push({ x: e.x, y: e.y + e.r * .6, vx: rand(-30, 30), vy: rand(-30, 0), life: .4, max: .4, c: 'rgba(120,110,110,.6)', s: 5 });
      if (d < e.r + P.r + 4) { hurtPlayer(e.dmg * 1.2, e.cdir, 480, 'inf'); e.state = 'recover'; e.t = .7; e.cd = rand(3, 5); }
      else if (e.hitWall || e.hitObj) { e.stun = 1.5; e.state = 'chase'; e.cd = 3; G.shake = 8; burst(e.x, e.y, '#aaa', 14, 160); addText(e.x, e.y - e.r - 10, 'Atordoado!', '#e0c060'); sfx('thud', e.x, e.y, e.type); e.hitObj = false; }
      else if (e.t <= 0) { e.state = 'recover'; e.t = .5; e.cd = rand(3, 5); }
      break;
  }
  if (e.lunge > 0) e.lunge -= dt;
}
// voadores: rodeiam a vítima por cima de tudo e mergulham um de cada vez
function updateFlyer(e, dt, d, pa, aggro) {
  const def = e.def, mv = (ang, sp) => { e.x = clamp(e.x + Math.cos(ang) * sp * dt, 60, WORLD_W - 60); e.y = clamp(e.y + Math.sin(ang) * sp * dt, 60, WORLD_H - 60); e.ang = ang; };
  if (e.h === undefined) e.h = 24;
  if (e.state === 'idle' || P.dead) {
    e.state = 'idle'; e.orb += dt * .9 * e.side; const tx = e.hx + Math.cos(e.orb) * 70, ty = e.hy + Math.sin(e.orb) * 45; mv(Math.atan2(ty - e.y, tx - e.x), def.spd * .45); e.h += (26 - e.h) * dt * 2;
    if (!P.dead && (d < aggro || e.alert)) { e.state = 'chase'; e.cd = rand(1, 2.2); e.orb = Math.atan2(e.y - P.y, e.x - P.x); } return;
  }
  if (e.state === 'dive') { e.t -= dt; mv(e.cdir, 430); e.h = Math.max(4, e.h - dt * 90); if (!e.hitP && d < e.r + P.r + 4) { e.hitP = true; hurtPlayer(e.dmg, e.cdir, 120, 'inf'); } if (e.t <= 0) { e.state = 'chase'; e.cd = rand(1.4, 2.8); e.orb = Math.atan2(e.y - P.y, e.x - P.x); } return; }
  e.state = 'chase';
  if (d > 1100) { e.state = 'idle'; e.hx = e.x; e.hy = e.y; e.alert = false; return; }
  e.orb += dt * 1.4 * e.side; const R = 150 + Math.sin(e.anim * .7 + e.hx) * 30, tx = P.x + Math.cos(e.orb) * R, ty = P.y + Math.sin(e.orb) * R * .8;
  mv(Math.atan2(ty - e.y, tx - e.x), def.spd * (dist(tx, ty, e.x, e.y) > 60 ? 1 : .7)); e.h += (26 - e.h) * dt * 2;
  e.cd -= dt; if (e.cd <= 0 && d < 260) { e.state = 'dive'; e.t = (d + 90) / 430; e.cdir = pa; e.hitP = false; sfx('v_corvo', e.x, e.y, 'dive'); }
}
function updateBoss(e, dt, d, pa) {
  e.ang = pa; const p2 = e.hp < e.maxhp * .5;
  if (e.state === 'emerge') { e.t -= dt; if (e.t <= 0) e.state = 'chase'; return; }
  if (P.dead) return;
  if (d < 600) P.sanity = Math.max(0, P.sanity - .8 * dt);
  if (e.slam) { e.slam.t -= dt; if (e.slam.t <= 0) { ring(e.x, e.y, e.slam.r, '#e06a8a', .45); G.shake = 14; sfx('boom'); if (d < e.slam.r) hurtPlayer(30, pa, 420, 'inf'); e.slam = null; } return; }
  if (e.state === 'wind') { e.t -= dt; if (e.t <= 0) { const n = p2 ? 16 : 10, off = Math.random() * 6.28; for (let i = 0; i < n; i++) enemyShoot(e, off + i / n * 6.28, 190); for (let i = -1; i <= 1; i++) enemyShoot(e, pa + i * .18, 300); sfx('spit', e.x, e.y, e.type); e.state = 'chase'; } return; }
  if (d > 150) moveEnt(e, Math.cos(pa) * e.def.spd * (p2 ? 1.5 : 1) * dt, Math.sin(pa) * e.def.spd * (p2 ? 1.5 : 1) * dt, true);
  e.cd -= dt;
  if (e.cd <= 0) {
    e.cd = p2 ? 2.3 : 3.3; const k = e.cyc++ % 3;
    if (d < 190 && k !== 1) { e.slam = { t: 1.05, r: 190 }; sfx('roar', e.x, e.y, e.type); }
    else if (k === 0 || k === 2) { e.state = 'wind'; e.t = .7; }
    else if (G.enemies.length < 13) { const n = p2 ? 4 : 3; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28; spawnEnemy(p2 && i < 2 ? (i ? 'verme' : 'rastejante') : 'larva', e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90); } ring(e.x, e.y, 110, '#c85a7a', .5); sfx('roar', e.x, e.y, e.type); }
  }
}

/* ===================== ANIMAIS ===================== */
function hurtAnimal(a, dmg, ang) { a.hp -= dmg; a.flash = .12; if (a.def.brave && a.hp > a.def.hp * .3) { if (!(a.angry > 0)) { sfx('roar', a.x, a.y, 'urso'); a.cd = Math.min(a.cd, .3); } a.angry = 9; a.flee = 0; } else a.flee = 4; if (a.type === 'corvo') a.fly = true; addText(a.x, a.y - 14, Math.round(dmg) + '', '#e8e0d0'); burst(a.x, a.y, '#a01c28', 5, 100); sfx('hit'); if (a.hp <= 0) { a.dead = true; decal(a.x, a.y, 9); rollDrops(a.def.drops, a.x, a.y); addXP(a.def.xp); } }
function updateAnimal(a, dt) {
  a.anim += dt; a.flash -= dt; const d = dist(a.x, a.y, P.x, P.y);
  a.vT = (a.vT === undefined ? rand(2, 8) : a.vT) - dt; if (a.vT <= 0) { a.vT = rand(5, 12); if (d < 700 && SFX['a_' + a.type]) sfx('a_' + a.type, a.x, a.y, a.angry > 0 ? 'angry' : ''); }
  if (a.def.brave) return updateBear(a, dt, d);
  if (a.type === 'corvo') { if (d < 170 && !P.sleeping) a.fly = true; a.h = clamp((a.h || 0) + (a.fly ? 60 : -80) * dt, 0, 34); if (a.fly) { a.flee = Math.max(a.flee, .5); const ang = Math.atan2(a.y - P.y, a.x - P.x) + Math.sin(a.anim * 2) * .4; a.x = clamp(a.x + Math.cos(ang) * a.def.spd * dt, 60, WORLD_W - 60); a.y = clamp(a.y + Math.sin(ang) * a.def.spd * dt, 60, WORLD_H - 60); a.ang = ang; a.mv = true; a.flee -= dt; if (d > 420 && !boxSolid(a.x, a.y, 8)) a.fly = false; if (d > 1500) a.dead = true; return; } }
  if (d < (a.type === 'cervo' ? 190 : 120) && !P.sleeping) a.flee = Math.max(a.flee, 1.5);
  if (a.flee > 0) { a.flee -= dt; const ang = Math.atan2(a.y - P.y, a.x - P.x) + Math.sin(a.anim * 5) * (a.type === 'coelho' ? .7 : .2); moveEnt(a, Math.cos(ang) * a.def.spd * dt, Math.sin(ang) * a.def.spd * dt); a.ang = ang; a.mv = true; if (a.hitWall) a.x += rand(-2, 2); }
  else { a.cd -= dt; if (a.cd <= 0) { a.cd = rand(1.5, 5); a.wa = Math.random() * 6.28; a.wt = rand(.4, 1.6); } if (a.wt > 0) { a.wt -= dt; moveEnt(a, Math.cos(a.wa) * a.def.spd * .25 * dt, Math.sin(a.wa) * a.def.spd * .25 * dt); a.ang = a.wa; a.mv = true; } else a.mv = false; }
  if (d > 1500) a.dead = true;
}

// urso sadio: não foge; se você chega perto demais ou o fere, ele ataca
function updateBear(a, dt, d) {
  if (d > 1500) { a.dead = true; return; }
  a.cd -= dt; a.swing = Math.max(0, (a.swing || 0) - dt);
  if (d < 105 && !P.sleeping && !P.driving && !(a.angry > 0) && !(a.calm > 0)) { a.angry = 7; a.cd = Math.min(a.cd, .3); sfx('roar', a.x, a.y, 'urso'); addText(a.x, a.y - 34, '!', '#e0c060', true); }
  if (a.hp < a.def.hp * .3 || P.dead) { a.angry = 0; a.flee = Math.max(a.flee, 2); }
  if (a.flee > 0) { a.flee -= dt; const ang = Math.atan2(a.y - P.y, a.x - P.x); moveEnt(a, Math.cos(ang) * a.def.spd * .8 * dt, Math.sin(ang) * a.def.spd * .8 * dt); a.ang = ang; a.mv = true; return; }
  if (a.angry > 0) {
    a.angry -= dt; const pa = Math.atan2(P.y - a.y, P.x - a.x); a.ang = pa;
    if (a.wind > 0) { a.wind -= dt; a.mv = false; if (a.wind <= 0) { a.swing = .25; if (d < a.r + P.r + 26) hurtPlayer(a.def.dmg, pa, 320); a.cd = 1.3; } return; }
    if (d < a.r + P.r + 14 && a.cd <= 0) { a.wind = .45; return; }
    if (d > 360) { a.angry = Math.min(a.angry, .5); }
    if (d > a.r + P.r + 6) { moveEnt(a, Math.cos(pa) * a.def.spd * dt, Math.sin(pa) * a.def.spd * dt); a.mv = true; } else a.mv = false;
    if (a.angry <= 0) a.calm = 6; return;
  }
  if (a.calm > 0) a.calm -= dt;
  if (a.cd <= 0) { a.cd = rand(2, 6); a.wa = Math.random() * 6.28; a.wt = rand(.8, 2.4); }
  if (a.wt > 0) { a.wt -= dt; moveEnt(a, Math.cos(a.wa) * 30 * dt, Math.sin(a.wa) * 30 * dt); a.ang = a.wa; a.mv = true; } else a.mv = false;
}

/* ===================== PROJÉTEIS ===================== */
function updateProjs(dt) {
  for (const p of G.projs) {
    const steps = p.kind === 'bullet' || p.bolt ? 3 : 1;
    for (let s = 0; s < steps && !p.dead; s++) {
      p.x += p.vx * dt / steps; p.y += p.vy * dt / steps;
      if (p.kind === 'lob') continue;
      const t = tileAtPx(p.x, p.y);
      if (t === T.MOUNT || t === T.WALL || t === T.WWALL || t === T.SWALL || t === T.DOOR || t === T.MWALL || t === T.GATE) { p.dead = true; burst(p.x, p.y, '#aaa', 4, 80, 2); landProj(p, .4); break; }
      if (typeof projHitsObj === 'function' && projHitsObj(p)) { p.dead = true; burst(p.x, p.y, p.kind === 'acid' ? '#86963a' : '#c8c0a8', 5, 90, 2); if (p.kind === 'bullet') sfx('hit', p.x, p.y); landProj(p, .5); break; }
      if (p.from === 'p') {
        const hitT = (e) => { if (e.dead || (p.hits && p.hits.includes(e))) return false; return dist(p.x, p.y, e.x, e.y) < e.r + 5; };
        for (const e of G.enemies) if (hitT(e)) {
          const crit = Math.random() < .07 * sk('certeiro'); if (!hurtEnemy(e, p.dmg * (crit ? 2 : 1) * rand(.92, 1.08) * (e.def.armor ? .5 : 1), p.ang, e.def.patch ? 0 : p.kb, crit)) continue;
          if (p.poison) { e.poison = Math.max(e.poison || 0, 6); if (typeof mpPoison === 'function') mpPoison(e); } if (p.fire) G.fires.push({ x: e.x, y: e.y, r: 44, t: 3.2 });
          if (p.pierce > 0) { p.pierce--; p.hits.push(e); } else { p.dead = true; if (p.kind === 'arrow' && Math.random() < .3 + .15 * sk('economia_m')) dropItem(p.bolt ? 'virote' : 'flecha', 1, e.x, e.y); if (p.kind === 'spear') landProj(p, 1); }
          break;
        }
        if (!p.dead) for (const a of G.animals) if (hitT(a)) { hurtAnimal(a, p.dmg, p.ang); p.dead = true; if (p.kind === 'arrow' && Math.random() < .5) dropItem(p.bolt ? 'virote' : 'flecha', 1, a.x, a.y); if (p.kind === 'spear') landProj(p, 1); break; }
      } else if (!P.dead && dist(p.x, p.y, P.x, P.y) < (P.driving ? 24 : P.r + 5)) { p.dead = true; if (P.inv_t <= 0) hurtPlayer(p.dmg, p.ang, 120, 'inf'); if (p.web) { P.slowT = Math.max(P.slowT || 0, 2.6); toast('Fios de carne prendem suas pernas!', 'corda'); } burst(p.x, p.y, '#7a8a34', 6, 90); }
    }
    p.life -= dt;
    if (p.life <= 0 && !p.dead) {
      p.dead = true;
      if (p.kind === 'lob') { if (p.item === 'molotov') { G.fires.push({ x: p.x, y: p.y, r: 64, t: 4.6 }); sfx('fire'); burst(p.x, p.y, '#e08a3a', 20, 200, 4); alertNoise(p.x, p.y, 300); } else if (p.item === 'bomba') explosion(p.x, p.y, 125, 85); else if (p.item === 'granada') explosion(p.x, p.y, 175, 150); else if (p.item === 'bomba_fumaca') { (G.smokes = G.smokes || []).push({ x: p.x, y: p.y, t: 12 }); sfx('spit'); burst(p.x, p.y, '#c8ccd0', 20, 140, 6); } else if (p.item === 'isca') { (G.lures = G.lures || []).push({ x: p.x, y: p.y, t: 15 }); sfx('spit'); burst(p.x, p.y, '#86963a', 14, 120, 4); decal(p.x, p.y, 14); } else if (p.item === 'frasco_bile') { G.fires.push({ x: p.x, y: p.y, r: 72, t: 7, acid: 1 }); sfx('spit'); burst(p.x, p.y, '#86963a', 18, 180, 4); } else { G.flares.push({ x: p.x, y: p.y, t: 60 }); sfx('fire'); } }
      else landProj(p, .55 + .15 * sk('economia_m'));
    }
  }
  G.projs = G.projs.filter(p => !p.dead);
}
function landProj(p, ch) { if (p.fire) { G.fires.push({ x: p.x, y: p.y, r: 40, t: 3 }); sfx('fire'); } if (p.kind === 'arrow' && Math.random() < ch) dropItem(p.bolt ? 'virote' : 'flecha', 1, p.x, p.y, undefined, 0); if (p.kind === 'spear') { const d = (p.dur || 10) - 5; if (d > 0) dropItem(p.item, 1, p.x, p.y, d, 0); else toast('A lança quebrou.', 'u_x'); } }

/* ===================== INTERAÇÃO ===================== */
const PICK = { stick: ['graveto', 1, 2, 'Pegar gravetos'], stone: ['pedra', 1, 1, 'Pegar pedra'], flint: ['silex', 1, 1, 'Pegar sílex'], herb: ['erva', 1, 2, 'Colher erva'], mushroom: ['cogumelo', 1, 1, 'Colher cogumelo'], corn: ['milho', 1, 2, 'Colher milho'], grass: ['fibra', 2, 3, 'Colher capim'], bush: ['frutas', 2, 4, 'Colher frutas'] };
const NPC_NAME = { tome: 'Tomé', iris: 'Dra. Íris', nilo: 'Cabo Nilo' };
function findTarget() {
  if (P.driving) { G.target = { kind: 'exit', label: 'Sair da caminhonete' }; return; }
  let best = null, bd = 38, label = '';
  queryObjs(P.x, P.y, 130, o => {
    if (o.dead) return; const d = dist(P.x, P.y, o.x, o.y) - o.r; if (d >= bd) return; let l = '';
    const t = o.type;
    if (PICK[t]) l = PICK[t][3];
    else if (t === 'logpile') l = 'Pegar toras';
    else if (o.loot) { if (!G.looted[o.id]) l = t === 'pump' ? 'Drenar bomba' : o.lock ? 'Abrir armário do arsenal' : 'Vasculhar'; }
    else if (t === 'well') l = 'Beber do poço'; else if (t === 'tower') l = 'Torre de Rádio'; else if (t === 'npc') l = 'Falar com ' + NPC_NAME[o.npc];
    else if (t === 'tv') l = G.tapes.includes(o.tape) ? 'Rever a fita' : 'Ligar o televisor';
    else if (t === 'gerador') l = G.flags.energia ? '' : 'Gerador auxiliar';
    else if (t === 'pesquisa') l = G.flags.receita_antidoto ? 'Reler a pesquisa' : 'Ler a pesquisa do exército';
    else if (t === 'heli') l = G.flags.escaped ? '' : 'Helicóptero militar';
    else if (t === 'fissure') { if (!o.sealed && !o.arming) l = invCount('carga') ? 'Plantar Carga Sísmica' : 'Fenda aberta (requer Carga Sísmica)'; }
    else if (t === 'bigfissure') { if (!G.flags.won) l = 'A Grande Fenda'; }
    else if (t === 'cama') l = 'Dormir'; else if (t === 'bau') l = 'Abrir baú'; else if (t === 'coletor') l = `Coletor de Chuva (${Math.floor(o.water || 0)})`;
    else if (typeof EXTRA_TARGET !== 'undefined' && EXTRA_TARGET[t]) l = EXTRA_TARGET[t](o);
    else if (STATIONS.includes(t)) l = 'Usar ' + ITEMS[t].n;
    if (l) { best = o; bd = d; label = l; }
  });
  const c = G.car; if (c && dist(P.x, P.y, c.x, c.y) < c.r + 30 && (!best || bd > 10)) { G.target = { kind: 'car', o: c, label: !c.fixed ? 'Consertar caminhonete (Bateria, 2 Gasolinas)' : 'Dirigir' }; return; }
  if (!best && waterNear(P.x, P.y, 34)) { G.target = { kind: 'water', label: invCount('garrafa') ? 'Beber e encher garrafas' : 'Beber água' }; return; }
  G.target = best ? { o: best, label } : null;
}
function pickUp(o) { const p = PICK[o.type]; const n = randi(p[1], p[2]) + (Math.random() < .22 * sk('coletor') ? 1 : 0); give(p[0], n); addXP(1); killObj(o, o.type === 'bush' ? 48 : 72); sfx('pick'); burst(o.x, o.y, '#6a8a5a', 5, 70); }
function interact() {
  if (P.sleeping) { wakeUp(); return; }
  const tg = G.target; if (!tg || P.action) return;
  if (tg.kind === 'exit') { exitCar(); return; }
  if (tg.kind === 'car') {
    const c = G.car;
    if (c.fixed) enterCar();
    else if (invCount('bateria') >= 1 && invCount('gasolina') >= 2) startAction('Consertando...', 2.5, () => { invRemove('bateria', 1); invRemove('gasolina', 2); c.fixed = true; c.fuel = 70; c.hp = 80; sfx('level'); toast('A caminhonete pegou!', 'u_car', true); qev('fixcar'); });
    else hint('Faltam peças: 1 Bateria de Carro e 2 Gasolinas.');
    return;
  }
  if (tg.kind === 'water') {
    P.thirst = Math.min(100, P.thirst + 20); const b = invCount('garrafa'); if (b) { invRemove('garrafa', b); invAdd('agua_suja', b); toast(`${b} garrafa${b > 1 ? 's' : ''} com água suja`, 'agua_suja'); }
    if (Math.random() < .28 - .07 * sk('estomago')) { P.hp = Math.max(1, P.hp - 5); toast('A água não caiu bem. Ferva antes de beber.', 'u_warn'); } sfx('drink'); qev('drink'); return;
  }
  const o = tg.o, t = o.type;
  if (PICK[t]) pickUp(o);
  else if (t === 'logpile') startAction('Carregando toras...', 1.2, () => { give('madeira', randi(3, 5)); killObj(o, 120); sfx('pick'); });
  else if (o.loot) { if (o.lock && !invCount(o.lock)) { hint('Trancado. Requer ' + ITEMS[o.lock].n + '.'); sfx('click'); } else startAction(t === 'pump' ? 'Drenando...' : 'Vasculhando...', 1.1, () => lootObj(o)); }
  else if (t === 'well') { P.thirst = Math.min(100, P.thirst + 32); const b = invCount('garrafa'); if (b) { invRemove('garrafa', b); invAdd('agua', b); toast(`${b} garrafa${b > 1 ? 's' : ''} com água limpa`, 'agua'); } sfx('drink'); qev('drink'); }
  else if (t === 'coletor') { if ((o.water || 0) < 1) hint('O coletor ainda está vazio.'); else { o.water--; if (invCount('garrafa')) { invRemove('garrafa', 1); give('agua', 1); } else { P.thirst = Math.min(100, P.thirst + 42); qev('drink'); } sfx('drink'); } }
  else if (t === 'npc') talk(o.npc);
  else if (t === 'tower') useTower();
  else if (t === 'tv') watchTape(o);
  else if (t === 'gerador') useGenerator(o);
  else if (t === 'pesquisa') readResearch();
  else if (t === 'heli') useHeli();
  else if (t === 'fissure') { if (invCount('carga')) { invRemove('carga', 1); o.arming = true; G.bombs.push({ x: o.x, y: o.y, t: 3.5, f: o }); toast('Carga armada! CORRA!', 'carga', true); sfx('click'); alertNoise(o.x, o.y, 700); } else hint('Você precisa de uma Carga Sísmica para selar a fenda.'); }
  else if (t === 'bigfissure') {
    const q = G.quests.find(q => q.id === 'q_mae');
    if (q && q.prog[1] >= 1 && invCount('carga_omega')) { invRemove('carga_omega', 1); G.bombs.push({ x: o.x, y: o.y, t: 5, f: o, omega: 1 }); toast('Carga Ômega armada! SAIA DAÍ!', 'carga_omega', true); G.flags.won = 1; }
    else if (q && q.prog[1] < 1) hint('A Mãe ainda vive. Impossível chegar perto.'); else hint('Um abismo quente e úmido. Uma carga comum não faria nem cócegas.');
  }
  else if (t === 'cama') { P.bed = { x: o.x, y: o.y }; trySleep(); }
  else if (t === 'bau') openChest(o);
  else if (typeof EXTRA_USE !== 'undefined' && EXTRA_USE[t]) EXTRA_USE[t](o);
  else { UI.station = t; openPanel('craft'); }
}
function lootObj(o) {
  G.looted[o.id] = 1; let any = false;
  for (const l of LOOT[o.loot]) if (Math.random() < l[1] * .38 * DF().loot) { give(l[0], Math.max(1, Math.round(randi(l[2], l[3]) * .6))); any = true; }
  if (o.extra) for (const x of o.extra) { give(x[0], x[1]); any = true; }
  if (o === W.postoPump) G.flags.gas_posto = 1;
  if (!any) toast('Nada de útil aqui.', 'u_x'); sfx('pick'); addXP(2); if (o.lock) qev('armory');
  if (o.note !== undefined && o.note !== null) { G.notes.push(o.note); startQuest('s_notas'); const n = NOTES[o.note]; showDialog([['nar', `${n[0]}\n\n“${n[1]}”`]], () => qev('note')); }
}
function watchTape(o) {
  const tp = TAPES[o.tape], neu = !G.tapes.includes(o.tape); if (neu) { G.tapes.push(o.tape); startQuest('s_fitas'); if (o.tape === 4) startQuest('s_lacre'); }
  sfx('static'); showDialog([['tv', `${tp[0]}\n\n${tp[1]}`]], () => { if (neu) { P.sanity = Math.max(0, P.sanity - 6); qev('tape'); } });
}
function readResearch() {
  const neu = !G.flags.receita_antidoto; sfx('pick');
  showDialog([['nar', 'Relatório de campo · Laboratório da Zona de Quarentena\n\n“O Tecido entra pelas feridas. Cada mordida, cada arranhão deixa um pouco dele no sangue. O corpo segura por um tempo. Depois, deixa de ser corpo.\n\nO soro funciona: duas Bolsas de Bile neutralizam a fase ativa, um Cristal Abissal estabiliza, dois de Álcool e um Antisséptico fazem o resto. Mesa de química. Aplicar antes da fase final.”'],
    ['eu', neu ? 'Uma cura. Eles tinham uma cura e ficaram trancados aqui com ela. Preciso de uma Mesa de Química.' : 'Bile, cristal, álcool e antisséptico. Numa Mesa de Química.']], () => {
    if (!neu) return; G.flags.receita_antidoto = 1; toast('Receita aprendida: Antídoto do Tecido', 'antidoto', true); sfx('level'); addXP(60); qev('learn:antidoto'); G.uiDirty = true; saveGame();
  });
}
function useGenerator(o) {
  const q = G.quests.find(q => q.id === 'q_barragem');
  if (!q) { hint('Um gerador auxiliar. Ainda não há motivo para ligá-lo.'); return; }
  if (invCount('gasolina') < 2 || invCount('eletronica') < 1) { hint('O gerador precisa de 2 Gasolinas e 1 Peça Eletrônica.'); return; }
  startAction('Dando a partida...', 3, () => {
    invRemove('gasolina', 2); invRemove('eletronica', 1); G.flags.energia = 1; G.shake = 14; sfx('roar'); toast('O gerador ruge. O vale inteiro ouviu.', 'u_warn', true); qev('gerador');
    const types = ['rastejante', 'rastejante', 'cuspidor', 'hospedeiro', 'verme', 'rastejante', 'hospedeiro', 'escavador', 'verme'];
    for (const tp of types) for (let k = 0; k < 10; k++) { const a = Math.random() * 6.28, r = rand(340, 520), x = o.x + Math.cos(a) * r, y = o.y + Math.sin(a) * r; if (freeSpot(x, y)) { const e = spawnEnemy(tp, x, y); e.alert = true; e.lair = -1; break; } }
  });
}
function useHeli() {
  const q = G.quests.find(q => q.id === 'q_fuga');
  if (!q) { hint('Um helicóptero do exército. Sem bateria, sem combustível, e você tem coisa mais urgente para resolver.'); return; }
  if (invCount('gasolina') < 4 || invCount('bateria') < 1) { hint('O helicóptero precisa de 4 Gasolinas e 1 Bateria de Carro.'); return; }
  startAction('Preparando a decolagem...', 4, () => { invRemove('gasolina', 4); invRemove('bateria', 1); queueCutscene('fuga'); });
}
function useTower() {
  const q = G.quests.find(q => q.id === 'q_torre');
  if (q) { if (invCount('peca_radio') >= 3) { invRemove('peca_radio', 3); G.flags.radio = 1; sfx('level'); qev('use:radio'); } else hint('Faltam peças de rádio.'); }
  else if (G.flags.radio) showDialog([['radio', '...chhh... ' + TIPS[randi(0, TIPS.length - 1)]]]);
  else hint('A torre está muda. Faltam peças.');
}
function talk(npc) {
  const before = Object.keys(G.qdone).length, main = G.quests.find(q => QUESTS[q.id].main), mid = main ? main.id : '', has = id => G.quests.find(q => q.id === id);
  if (npc === 'nilo') {
    qev('talk:nilo'); if (Object.keys(G.qdone).length !== before) return;
    const L = { q_omega: 'Leve o detonador para a sua doutora. E não aperte nada antes da hora.', q_mae: 'Se aquilo cair, eu vou saber daqui. O chão para de tremer.', q_fuga: 'O helicóptero está no aeródromo, ao norte daqui. Quatro galões de gasolina e uma bateria de carro. A oficina de Alto Ferro tinha baterias.' }[mid];
    showDialog([['nilo', L || (G.flags.escaped ? 'Então a porta abriu. Eu fico. Alguém precisa ler o boletim dizendo que acabou.' : 'Este bunker aguenta. Tem uma Bancada de Armeiro ali no canto, use à vontade. Só feche a porta quando sair.')]]); return;
  }
  if (npc === 'tome') {
    qev('talk:tome');
    if (has('s_tome') && invCount('carne_assada') >= 4) { invRemove('carne_assada', 4); qev('deliver:tome'); }
    if (has('s_medalhao') && invCount('medalhao')) qev('deliver:medalhao');
    if (Object.keys(G.qdone).length !== before) return;
    const L = { q_carro: 'A bateria você acha no posto, depois da ponte, a leste. As bombas ainda têm gasolina no fundo. A caminhonete está ali, do lado da praça.', q_pecas: 'Uma peça está no celeiro da fazenda, ao sul do posto. Outra no acampamento da mina, ao norte dele. A terceira na delegacia de Alto Ferro, lá no fim da estrada. A cidade não ficou vazia, viu?', q_torre: 'A torre fica no morro, a noroeste. Segue a trilha de terra que sai da vila para o norte. Carro não sobe lá.', q_fendas: 'Fendas? Tem uma na mata a oeste daqui e outra descendo o rio. O chão em volta fica vermelho e mole. Não pisa no que se mexe.', q_hospital: 'O hospital... minha Marta morreu lá, antes de tudo isso. Hoje eu agradeço. Entra de dia e não responde se alguém te chamar do corredor.', q_barragem: 'A barragem fica no fim do mundo, para o nordeste da cidade. Leva gasolina sobrando para voltar.', q_alfa: 'O Alfa... já vi aquele bicho derrubar um caminhão. Bata e saia de perto. E não fique na frente quando ele correr.', q_mae: 'Vai mesmo entrar na cratera? Então come bem, dorme bem e leva tudo que tiver de bala.' }[mid];
    showDialog([['tome', L || (G.flags.won ? 'Você fechou a Grande Fenda. Vou poder dormir de janela aberta de novo. Obrigado.' : 'O poço da praça tem água limpa. Encha suas garrafas sempre que passar por aqui.')], ['tome', has('s_medalhao') ? 'Se passar pela igreja, ao norte da cidade... a cripta. O medalhão da Marta. Eu queria ver de novo.' : has('s_tome') ? 'E se sobrar carne assada, eu aceito. Faz dias que só como feijão frio.' : TIPS[randi(0, TIPS.length - 1)]]]);
  } else {
    const qa = has('q_alfa');
    if (qa && qa.prog[0] >= 1 && !invCount('nucleo')) { showDialog([['iris', 'Você derrotou o Alfa? E o núcleo? Volte e pegue, ele deve ter caído perto do corpo.']]); return; }
    qev('talk:iris'); if (Object.keys(G.qdone).length !== before) return;
    const L = { q_fendas: 'Carga Sísmica: 3 pólvoras, 2 sucatas, 1 peça eletrônica e 1 fita, numa Mesa de Química. Pólvora é enxofre com carvão. Plante na fenda e corra.', q_hospital: 'O hospital fica no lado sul da avenida principal de Alto Ferro. A amostra deve estar na ala de isolamento. Não confie em quem estiver de pé lá dentro.', q_barragem: 'A casa de controle fica logo abaixo do paredão da barragem. O gerador pede 2 gasolinas e 1 peça eletrônica.', q_alfa: 'O Alfa fica na pedreira, a leste da mina. Ele fica atordoado se bater numa rocha durante a investida. Use isso.', q_sede: 'A sede da Ferro Fundo fica no fim da estrada, a leste de Alto Ferro. Procure o arquivo. E não fique de costas para os corredores.', q_bunker: 'O bunker fica no extremo sudeste, depois do aeródromo. Se houver alguém lá, deixe que ele fale primeiro.', q_omega: 'Preciso das três coisas juntas: o núcleo, os registros e o detonador.', q_fuga: 'Um helicóptero? Vá. Eu fico: alguém precisa vigiar os sismógrafos. Mas vá.', q_mae: 'A passagem da cratera fica a leste da estação. Plante a Carga Ômega só depois que a Mãe cair.' }[mid];
    showDialog([['iris', L || (G.flags.won ? 'Os sismógrafos estão em silêncio. Pela primeira vez em semanas. Você conseguiu.' : 'Estou monitorando as fendas daqui. Volte quando precisar.')]]);
  }
}

/* ===================== MISSÕES ===================== */
function startQuest(id) { if (G.qdone[id] || G.quests.find(q => q.id === id)) return; const q = { id, prog: QUESTS[id].obj.map(() => 0) }; G.quests.push(q); toast('Nova missão: ' + QUESTS[id].title, 'u_book', true); G.uiDirty = true; sfx('quest'); questHooks(id); catchUp(q); setTimeout(checkQuests, 0); }
/* O que você já fez antes de a missão aparecer também conta. Ficam de fora só as
   conversas, as entregas e as contagens de abates que pedem algo novo ("sobreviva ao que o barulho atraiu"). */
const QEV_NOPAST = /^(talk|deliver):|^kill:any$/;
function pastEv(ev) {
  let v = (G.evlog && G.evlog[ev]) || 0; const i = ev.indexOf(':'), k = i < 0 ? ev : ev.slice(0, i), a = i < 0 ? '' : ev.slice(i + 1);
  if (k === 'place') v = Math.max(v, G.placed.some(o => o.type === a) ? 1 : 0);
  else if (k === 'reach') v = Math.max(v, G.pois[a] === 2 ? 1 : 0);
  else if (k === 'craft') v = Math.max(v, invCount(a) > 0 ? 1 : 0);
  else if (k === 'kill') v = Math.max(v, G.killsBy[a] || 0);
  else if (k === 'learn') v = Math.max(v, G.flags['receita_' + a] ? 1 : 0);
  else if (ev === 'seal') v = Math.max(v, Object.keys(G.sealed).length);
  else if (ev === 'tape') v = Math.max(v, G.tapes.length);
  else if (ev === 'note') v = Math.max(v, G.notes.length);
  else if (ev === 'use:radio') v = Math.max(v, G.flags.radio ? 1 : 0);
  else if (ev === 'gerador') v = Math.max(v, G.flags.energia ? 1 : 0);
  else if (ev === 'fixcar') v = Math.max(v, G.car && G.car.fixed ? 1 : 0);
  else if (ev === 'heli') v = Math.max(v, G.flags.escaped ? 1 : 0);
  return v;
}
function catchUp(q) {
  const Q = QUESTS[q.id]; if (!Q) return;
  for (let i = 0; i < Q.obj.length; i++) { const o = Q.obj[i]; if (q.prog[i] >= o.n || seqBlocked(Q, q, i)) continue; let v = 0;
    if (o.t === 'have') v = invCount(o.id); else if (o.t === 'ev' && !QEV_NOPAST.test(o.ev)) v = pastEv(o.ev); else continue;
    v = Math.min(o.n, v); if (v > q.prog[i]) { q.prog[i] = v; G.uiDirty = true; } }
}
function catchUpAll() { for (const q of G.quests) catchUp(q); checkQuests(); }
function questHooks(id) {
  const M = { q_vila: ['vila'], q_carro: ['posto'], q_pecas: ['fazenda', 'mina', 'cidade', 'delegacia'], q_torre: ['torre'], q_iris: ['estacao'], q_hospital: ['hospital'], q_barragem: ['barragem'], q_alfa: ['pedreira'], q_sede: ['sede'], q_bunker: ['bunker'], q_omega: ['estacao'], q_fuga: ['aerodromo'], q_mae: ['cratera'], s_medalhao: ['igreja'], s_lacre: ['quarentena'], s_cura: ['quarentena'] }[id];
  if (M) M.forEach(p => G.pois[p] = G.pois[p] || 1);
}
function seqBlocked(Q, q, i) { return Q.seq && Q.obj.some((p, j) => j < i && q.prog[j] < p.n); }
function qev(ev, n = 1) {
  G.evlog = G.evlog || {}; G.evlog[ev] = (G.evlog[ev] || 0) + n; const past = !QEV_NOPAST.test(ev);
  for (const q of G.quests) { const Q = QUESTS[q.id]; for (let i = 0; i < Q.obj.length; i++) { const o = Q.obj[i]; if (o.t !== 'ev' || o.ev !== ev || q.prog[i] >= o.n || seqBlocked(Q, q, i)) continue; q.prog[i] = Math.min(o.n, past ? Math.max(q.prog[i], pastEv(ev)) : q.prog[i] + n); G.uiDirty = true; } }
  for (const q of G.quests) catchUp(q);
  checkQuests();
}
function checkQuests() {
  for (const q of [...G.quests]) { const Q = QUESTS[q.id]; let all = true; Q.obj.forEach((o, i) => { if (o.t === 'have' && !seqBlocked(Q, q, i)) { const v = Math.min(o.n, invCount(o.id)); if (v > q.prog[i]) { q.prog[i] = v; G.uiDirty = true; } } if (q.prog[i] < o.n) all = false; }); if (all) completeQuest(q); }
}
function completeQuest(q) {
  const Q = QUESTS[q.id]; G.quests.splice(G.quests.indexOf(q), 1); G.qdone[q.id] = 1; G.uiDirty = true;
  const fin = () => {
    if (Q.take) for (const k in Q.take) invRemove(k, Q.take[k]); if (Q.give) for (const k in Q.give) give(k, Q.give[k]); if (Q.flag) G.flags[Q.flag] = 1;
    toast('Missão concluída: ' + Q.title, 'u_check', true); sfx('level'); addXP(Q.xp);
    if (Q.next) startQuest(Q.next);
    if (q.id === 'q_vila') { startQuest('s_caca'); startQuest('s_tome'); } if (q.id === 'q_carro') startQuest('s_medalhao'); if (q.id === 'q_iris') startQuest('s_paz'); if (q.id === 'q_pecas') startQuest('s_lacre');
    if (q.id === 'q_mae') showEnding(); if (q.id === 'q_fuga') { UI.newUnlock = unlock('aventura'); showEscape(); } saveGame();
  };
  if (Q.end && Q.end.length) showDialog(Q.end, fin); else fin();
}

/* ===================== GERADOR DE CRIATURAS ===================== */
function pickType(day, strong) {
  const w = [['larva', 2], ['rastejante', 5]]; if (day >= 2) { w.push(['cuspidor', 2 + (strong ? 1 : 0)]); w.push(['verme', 1.6]); } if (day >= 3) w.push(['escavador', 2]); if (day >= (strong ? 4 : 5)) w.push(['bruto', strong ? 1.2 : .6]);
  if (day >= (strong ? 3 : 4)) w.push(['saltador', 1.6]);
  if (day >= (strong ? 4 : 5)) w.push(['aglomerado', 1.1]);
  if (day >= (strong ? 5 : 6) && G.enemies.filter(e => e.type === 'gritador').length < 2) w.push(['gritador', .9]);
  if (day >= (strong ? 6 : 7)) w.push(['costurado', .9]);
  if (P.x > 160 * TILE) w.push(['hospedeiro', 4]);
  if (!strong && day >= 3 && !G.enemies.some(e => e.type === 'imitador')) w.push(['imitador', .8]);
  let t = 0; for (const x of w) t += x[1]; let r = Math.random() * t; for (const x of w) { r -= x[1]; if (r <= 0) return x[0]; } return 'rastejante';
}
// a infecção chega aos bichos do mato aos poucos: primeiro as lebres, depois cães, corvos, cervos e, por fim, algo maior
const WILD_DAY = { lebre: 2, cao: 3, corvo: 4, cervo_oco: 5, urso: 7 };
function wildTick(day, night) {
  const d = day + (G.diff === 'dificil' ? 1 : G.diff === 'facil' ? -1 : 0) + (G.diff === 'aventura' ? 3 : 0); if (d < 2) return;
  const wild = G.enemies.filter(e => e.def.wild && !e.dead).length, cap = Math.min(12, 1 + (d - 1) * 1.3) * DF().spawn;
  if (wild >= cap || Math.random() > (night ? .09 : .05)) return;
  const w = []; for (const k in WILD_DAY) if (d >= WILD_DAY[k] && !(k === 'urso' && G.enemies.some(e => e.type === 'urso'))) w.push([k, { lebre: 3, cao: 2.6, corvo: 2, cervo_oco: 1.3, urso: .6 }[k]]);
  let tot = 0; for (const x of w) tot += x[1]; let r = Math.random() * tot, tp = 'lebre'; for (const x of w) { r -= x[1]; if (r <= 0) { tp = x[0]; break; } }
  const a = Math.random() * 6.28, R = rand(620, 900), x = P.x + Math.cos(a) * R, y = P.y + Math.sin(a) * R, t = tileAtPx(x, y);
  if (!(t === T.GRASS || t === T.FOREST) || !freeSpot(x, y) || nearLight(x, y) || (tp === 'urso' && t !== T.FOREST)) return;
  const n = tp === 'lebre' ? randi(2, 3) : tp === 'cao' ? randi(2, d >= 6 ? 4 : 3) : tp === 'corvo' ? randi(3, 5) : 1;
  for (let i = 0; i < n; i++) for (let k = 0; k < 6; k++) { const xx = x + (i ? rand(-50, 50) : 0), yy = y + (i ? rand(-50, 50) : 0); if (tp === 'corvo' || freeSpot(xx, yy)) { const e = spawnEnemy(tp, xx, yy); e.hx = x; e.hy = y; break; } }
}
function freeSpot(x, y) { return !boxSolid(x, y, 16) && x > 60 && y > 60 && x < WORLD_W - 60 && y < WORLD_H - 60; }
function nearLight(x, y) { return G.placed.some(o => (o.type === 'fogueira' || o.type === 'lampiao') && dist(o.x, o.y, x, y) < 270) || dist(x, y, 46 * TILE, 95.3 * TILE) < 270 || G.fires.some(f => dist(f.x, f.y, x, y) < 200) || G.flares.some(f => dist(f.x, f.y, x, y) < 300); }
function spawnTick() {
  const night = isNight(), day = dayNum(), sm = DF().spawn, cnt = G.enemies.filter(e => !e.def.boss && !e.def.patch && e.lair === undefined).length, cap = (night ? Math.min(30, 7 + day * 2.5) : 7) * sm;
  const fireNear = nearLight(P.x, P.y), it = curItem();
  G.sheltered = INDOOR[tileAtPx(P.x, P.y)] === true || fireNear;
  G.lit = darkness() < .5 || fireNear || P.driving || !!(it && it.light) || invCount('lanterna') > 0 || !!(G.flags.energia && P.x > 166 * TILE && P.x < 234 * TILE && P.y > 86 * TILE && P.y < 100 * TILE);
  G.fireNear = fireNear;
  if (!G.flags.cs_noite && dayNum() === 1 && hourNow() >= 19.6 && !P.sleeping) queueCutscene('noite');
  for (const L of W.lairs) {
    if (L.fis !== undefined && W.fissures[L.fis].sealed) continue; if (L.night && !night) continue;
    const d = dist(P.x, P.y, L.x, L.y); if (d > 950 || d < 620 || G.time < (G.lairT[L.i] || 0) || G.enemies.some(e => e.lair === L.i)) continue;
    for (const [tp, n] of L.mobs) for (let k = 0; k < n; k++) for (let tr = 0; tr < 12; tr++) { const R = L.r || 90, x = L.x + rand(-R, R), y = L.y + rand(-R, R); if (freeSpot(x, y) || (ENEMIES[tp].patch && !solidAt(x, y))) { const e = spawnEnemy(tp, x, y); e.lair = L.i; e.nightOnly = L.night; e.state = 'idle'; e.hx = x; e.hy = y; break; } }
    G.lairT[L.i] = G.time + .5;
  }
  wildTick(day, night);
  if (G.flags.won && (!night || Math.random() > .15)) { bossTick(); return; }
  const fs = W.fissures.concat([W.bigFissure]);
  for (const f of fs) {
    if (f.sealed) continue; const d = dist(P.x, P.y, f.x, f.y), big = f.type === 'bigfissure'; if (d > 1150 || d < 260) continue;
    const local = G.enemies.filter(e => e.home === f).length, lim = (big ? 5 : night ? Math.min(6, 2 + day * .5) : 2) * sm;
    if (local < lim && cnt < cap + (big ? 4 : 0) && Math.random() < (night ? .24 : .08)) { const a = Math.random() * 6.28, r = rand(30, big ? 200 : 80), x = f.x + Math.cos(a) * r, y = f.y + Math.sin(a) * r; if (freeSpot(x, y)) spawnEnemy(pickType(day + (big ? 3 : 0), true), x, y, f); }
  }
  if (night) {
    G.emT -= P.sleeping ? (G.sheltered ? 1.5 : 4) : 1;
    if (G.emT <= 0 && cnt < cap) {
      const sealed = Object.keys(G.sealed).length;
      G.emT = rand(24, 40) * Math.max(.5, 1 - day * .03) * (1 + .1 * sealed) * (day === 1 ? 1.7 : 1) / sm;
      const n = 1 + (Math.random() < .35 + day * .05 ? 1 : 0) + (day > 3 && Math.random() < .4 ? 1 : 0) + (day > 6 && Math.random() < .5 ? 1 : 0);
      for (let i = 0; i < n; i++) for (let k = 0; k < 8; k++) { const a = Math.random() * 6.28, r = rand(380, 540), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (freeSpot(x, y) && !INDOOR[tileAtPx(x, y)]) { const tp = pickType(day), e = spawnEnemy(tp, x, y); if (tp === 'imitador') { e.state = 'chase'; e.t = 0; } break; } }
    }
    const h = hourNow();
    if (day >= 4 && G.reapDay !== day && (h > 22.5 || h < 3) && !G.enemies.some(e => e.type === 'colhedor') && Math.random() < .03 * sm) {
      for (let k = 0; k < 12; k++) { const a = Math.random() * 6.28, x = P.x + Math.cos(a) * 760, y = P.y + Math.sin(a) * 760; if (freeSpot(x, y)) { const e = spawnEnemy('colhedor', x, y); e.state = 'idle'; e.hx = P.x; e.hy = P.y; G.reapDay = day; break; } }
    }
  }
  bossTick();
  if (G.animals.length < Math.max(5, 10 - day) && Math.random() < .5) { // (3.7: mínimo de 5 animais em vez de 4)
    const a = Math.random() * 6.28, r = rand(560, 860), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r, t = tileAtPx(x, y);
    if ((t === T.GRASS || t === T.FOREST) && freeSpot(x, y)) {
      const farm = dist(x, y, 100 * TILE, 126 * TILE) < 22 * TILE, town = ['vila', 'cidade', 'fazenda'].some(k => dist(x, y, (POIS[k].x + .5) * TILE, (POIS[k].y + .5) * TILE) < 28 * TILE);
      const type = farm && Math.random() < .75 ? 'galinha' : town && Math.random() < .12 ? 'galinha' : town && Math.random() < .3 ? 'cachorro' : t === T.FOREST && Math.random() < .05 && !G.animals.some(o => o.type === 'urso') ? 'urso' : Math.random() < .16 ? 'corvo' : Math.random() < .04 ? 'cachorro' : Math.random() < (t === T.FOREST ? .45 : .25) ? 'cervo' : Math.random() < .3 ? 'galinha' : 'coelho';
      const def = ANIMALS[type], n = type === 'corvo' ? randi(2, 4) : type === 'galinha' && Math.random() < .25 ? 2 : 1; // galinha às vezes vem em dupla
      for (let i = 0; i < n; i++) { const xx = x + (i ? rand(-40, 40) : 0), yy = y + (i ? rand(-40, 40) : 0); if (i && !freeSpot(xx, yy)) continue; G.animals.push({ type, def, x: xx, y: yy, r: def.r, hp: def.hp, ang: Math.random() * 6.28, anim: rand(0, 9), flash: 0, flee: 0, cd: 1, wt: 0 }); }
    }
  }
  for (const id in G.dead) if (G.time >= G.dead[id]) { const o = W.objs[id]; if (o && dist(o.x, o.y, P.x, P.y) > 700) { o.dead = false; o.solid = !!OBJ[o.type].solid; o.hp = OBJ[o.type].hp || 0; delete G.dead[id]; } }
  for (const o of G.placed) if (o.type === 'coletor') o.water = Math.min(4, (o.water || 0) + 1 / HOUR_SEC / 5);
  for (const k in POIS) { const p = POIS[k], d = dist(P.x, P.y, (p.x + .5) * TILE, (p.y + .5) * TILE); if (d < (p.rad || 9) * TILE) { if (G.pois[k] !== 2) { G.pois[k] = 2; toast('Local descoberto: ' + p.n, p.ic, true); addXP(15); sfx('quest'); if (k === 'vila' || k === 'cidade') queueCutscene(k); } qev('reach:' + k); } }
  checkQuests();
}
function bossTick() {
  const q9 = G.quests.find(q => q.id === 'q_alfa');
  if (((q9 && q9.prog[0] < 1) || (G.diff === 'aventura' && !G.killsBy.alfa)) && !G.enemies.some(e => e.type === 'alfa') && dist(P.x, P.y, 119 * TILE, 39 * TILE) < 800) { const e = spawnEnemy('alfa', 119.5 * TILE, 39.5 * TILE); e.home = { x: e.x, y: e.y }; e.state = 'idle'; queueCutscene('alfa', e); }
  const q10 = G.quests.find(q => q.id === 'q_mae');
  if (((q10 && q10.prog[0] >= 1 && q10.prog[1] < 1) || (G.diff === 'aventura' && !G.killsBy.mae && dist(P.x, P.y, 75.5 * TILE, 20 * TILE) < 9 * TILE)) && !G.enemies.some(e => e.type === 'mae')) { const e = spawnEnemy('mae', 75.5 * TILE, 19.5 * TILE); e.t = 1.6; queueCutscene('mae', e); }
  G.boss = G.enemies.find(e => e.def.boss && !e.dead && dist(e.x, e.y, P.x, P.y) < 900) || G.enemies.find(e => e.def.reaper && !e.dead && e.state !== 'idle' && dist(e.x, e.y, P.x, P.y) < 700) || null;
}

/* ===================== ATUALIZAÇÃO ===================== */
function update(dt) {
  frameNo++;
  if (CS.queue.length && !CS.on && !P.sleeping && !P.dead && G.state === 'play') { const [id, arg] = CS.queue.shift(); playCutscene(id, arg); return; }
  if (DEV.god) P.hp = maxHp(); if (DEV.needs) { P.hunger = P.thirst = P.sleep = P.sanity = 100; P.stam = maxSt(); }
  const dth = dt / HOUR_SEC * (P.sleeping ? 45 : 1); G.time += dth;
  G.hintT -= dt; if (G.shake > 0) G.shake = Math.max(0, G.shake - 40 * dt);
  const nd = DF().needs, sl = P.sleeping ? .4 : 1, sprint = P.sprint ? 1.5 : 1;
  const fi = P.inf >= 25 ? 1.25 : 1;
  P.hunger = Math.max(0, P.hunger - 4.8 * nd * (1 - .1 * sk('estomago')) * sl * sprint * fi * dth);
  P.thirst = Math.max(0, P.thirst - 6.4 * nd * (1 - .1 * sk('camelo')) * sl * sprint * fi * dth);
  if (P.sleeping) updateSleep(dth); else P.sleep = Math.max(0, P.sleep - 4.0 * nd * (1 - .1 * sk('sono_leve')) * dth);
  if (!P.dead) {
    let dmg = 0; if (P.hunger <= 0) dmg += 1.4; if (P.thirst <= 0) dmg += 1.8; if (P.sleep <= 0) dmg += .25; if (P.sanity <= 0) dmg += .6;
    if (dmg) { P.hp -= dmg * dt * (P.sleeping ? 3 : 1); if (P.hp <= 0) die(); }
    else if (P.hunger > 40 && P.thirst > 40 && P.hp < maxHp() && !(P.inf >= 50)) P.hp = Math.min(maxHp(), P.hp + .25 * dt);
    infTick(dt);
  }
  if (G.state !== 'play') return;
  if (!P.sleeping) {
    const dk = darkness(); let ds = 0;
    if (dk > .6 && !G.lit) ds -= .55; else if (dk < .3) ds += .22; else if (G.fireNear) ds += .5; else if (G.lit) ds += .06; if (P.inf >= 50) ds -= .12;
    if (tileAtPx(P.x, P.y) === T.ASH) ds -= .4;
    if (ds < 0) ds *= (1 - .15 * sk('nervos')) * nd;
    P.sanity = clamp(P.sanity + ds * dt, 0, 100);
    G.whT -= dt;
    if (P.sanity < 50 && G.whT <= 0) {
      G.whT = rand(9, 20) * (1 + .2 * sk('frieza')) * (P.sanity < 20 ? .5 : 1); toast(WHISPERS[randi(0, WHISPERS.length - 1)], 'u_speech'); sfx('whisper', P.x - Math.cos(P.ang) * 240 + rand(-150, 150), P.y - Math.sin(P.ang) * 240 + rand(-150, 150));
      if (!P.driving) for (let k = 0; k < 6; k++) { const a = P.ang + Math.PI + rand(-1.6, 1.6), r = rand(230, 380), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (!solidAt(x, y)) { G.phant.push({ x, y, t: rand(8, 16), seen: 0 }); break; } }
    }
  }
  for (const f of G.phant) { f.t -= dt; const d = dist(f.x, f.y, P.x, P.y); if (looking(f, d, .45)) f.seen += dt; if (f.seen > .9 || d < 110 || P.sanity > 70) f.t = Math.min(f.t, .3); } G.phant = G.phant.filter(f => f.t > 0);
  if (G.car) updateCar(dt);
  updatePlayer(dt);
  for (const e of G.enemies) { if (!e.dead) updateEnemy(e, dt); if (!e.def.boss && (typeof farFromAll === 'function' ? farFromAll(e.x, e.y, 1800) : dist(e.x, e.y, P.x, P.y) > 1800)) e.dead = true; }
  G.enemies = G.enemies.filter(e => !e.dead);
  for (const a of G.animals) updateAnimal(a, dt); G.animals = G.animals.filter(a => !a.dead);
  updateProjs(dt);
  for (const it of G.items) {
    it.t += dt; it.nopick -= dt; it.x += it.vx * dt; it.y += it.vy * dt; it.vx -= it.vx * 6 * dt; it.vy -= it.vy * 6 * dt;
    if (it.nopick <= 0 && !P.dead && !P.driving) { const d = dist(it.x, it.y, P.x, P.y); if (d < 70) { it.x += (P.x - it.x) / d * 260 * dt; it.y += (P.y - it.y) / d * 260 * dt; } if (d < 20) { if (canTake(it.id, it.n)) { it.dead = true; invAdd(it.id, it.n, it.dur); toast(`+${it.n} ${ITEMS[it.id].n}`, it.id); sfx('pick'); } else { it.nopick = 2.5; hint('Mochila cheia.'); } } }
    if (it.t > 400) it.dead = true;
  }
  G.items = G.items.filter(i => !i.dead);
  const eng = sk('engenharia') >= 3 ? 1.4 : 1;
  for (const f of G.fires) { f.t -= dt; for (const e of G.enemies) if (dist(f.x, f.y, e.x, e.y) < f.r + e.r) { e.hp -= 16 * eng * (e.def.patch ? 2.6 : 1) * dt; e.alert = true; e.flash = .05; if (e.hp <= 0) killEnemy(e); } if (dist(f.x, f.y, P.x, P.y) < f.r - 8 && P.roll <= 0 && !P.driving && !(P.armor && ITEMS[P.armor].fireproof && !f.acid)) { P.hp -= 9 * dt; P.hurtFlash = .2; if (P.hp <= 0) die(); } if (Math.random() < dt * 40) { const a = Math.random() * 6.28, r = Math.random() * f.r; G.parts.push({ x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r, vx: rand(-10, 10), vy: rand(-80, -30), life: .5, max: .5, c: f.acid ? '#9aa83a' : Math.random() < .5 ? '#e08a3a' : '#c8502a', s: rand(3, 7), glow: 1 }); } }
  G.fires = G.fires.filter(f => f.t > 0);
  for (const f of G.flares) { f.t -= dt; if (Math.random() < dt * 14) G.parts.push({ x: f.x, y: f.y, vx: rand(-25, 25), vy: rand(-70, -20), life: .6, max: .6, c: '#ff8a7a', s: rand(2, 4), glow: 1 }); if (dist(f.x, f.y, P.x, P.y) < 260) P.sanity = Math.min(100, P.sanity + .8 * dt); } G.flares = G.flares.filter(f => f.t > 0);
  for (const b of G.bombs) {
    const pt = Math.ceil(b.t); b.t -= dt; if (Math.ceil(b.t) !== pt && b.t > 0) { addText(b.x, b.y - 30, Math.ceil(b.t) + '', '#e0c060', true); sfx('click'); }
    if (b.t <= 0) { explosion(b.x, b.y, b.omega ? 320 : 150, b.omega ? 300 : 90); b.f.sealed = true; if (b.omega) { G.shake = 30; qev('omega'); } else { G.sealed[b.f.fi] = 1; qev('seal'); addXP(80); toast('Fenda selada!', 'u_fis_x', true); } }
  }
  G.bombs = G.bombs.filter(b => b.t > 0);
  for (const o of [...G.placed]) {
    if (o.shake > 0) o.shake -= dt;
    if (o.type === 'espinhos') { for (const e of G.enemies) if (e.state !== 'burrow' && !e.def.patch && dist(o.x, o.y, e.x, e.y) < o.r + e.r) { e.hp -= 15 * eng * dt; e.flash = .05; o.hp -= 5 * dt; if (Math.random() < dt * 6) burst(e.x, e.y, '#8a1c2a', 2, 60); if (e.hp <= 0) killEnemy(e); } if (o.hp <= 0) removePlaced(o); }
    else if (o.type === 'armadilha_urso') { o.cd = (o.cd || 0) - dt; if (o.cd <= 0) for (const e of G.enemies) if (e.state !== 'burrow' && !e.def.patch && !e.dead && dist(o.x, o.y, e.x, e.y) < o.r + e.r) { hurtEnemy(e, 65 * eng, 0, 0); if (!e.def.boss) e.stun = 3; o.cd = 2; o.hp--; sfx('clink'); if (o.hp <= 0) removePlaced(o); break; } }
  }
  for (const p of G.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx -= p.vx * 3 * dt; p.vy -= p.vy * 3 * dt; } G.parts = G.parts.filter(p => p.life > 0); if (G.parts.length > GFX.parts) G.parts.splice(0, G.parts.length - GFX.parts);
  for (const t of G.texts) { t.t += dt; t.y -= 34 * dt; } G.texts = G.texts.filter(t => t.t < .9);
  for (const r of G.rings) r.t += dt; G.rings = G.rings.filter(r => r.t < r.dur);
  findTarget();
  G.tick -= dt; if (G.tick <= 0) { G.tick = 1; spawnTick(); const fx = clamp(Math.floor(P.x / FOGC), 0, FW - 1), fy = clamp(Math.floor(P.y / FOGC), 0, FH - 1); for (let y = fy - 2; y <= fy + 2; y++) for (let x = fx - 2; x <= fx + 2; x++) if (x >= 0 && y >= 0 && x < FW && y < FH && Math.hypot(x - fx, y - fy) < 2.6) G.fog[y * FW + x] = 1; }
  G.saveT += dt; if (G.saveT > 90 && !G.boss && !P.dead) { G.saveT = 0; saveGame(); }
}

/* ===================== SALVAR / CARREGAR ===================== */
function saveGame() {
  const c = G.car;
  const d = { v: 3, at: Date.now(), diff: G.diff, time: G.time, P: { name: P.name, look: P.look, origin: P.origin, x: P.x, y: P.y, hp: P.hp, inf: P.inf, stam: P.stam, hunger: P.hunger, thirst: P.thirst, sleep: P.sleep, sanity: P.sanity, xp: P.xp, lvl: P.lvl, sp: P.sp, skills: P.skills, inv: P.inv, hot: P.hot, sel: P.sel, armor: P.armor, pack: P.pack, mags: P.mags, bed: P.bed, driving: P.driving },
    car: { x: c.x, y: c.y, ang: c.ang, fuel: c.fuel, hp: c.hp, fixed: c.fixed, inv: c.inv },
    quests: G.quests, qdone: G.qdone, evlog: G.evlog, flags: G.flags, dead: G.dead, looted: G.looted, sealed: G.sealed, notes: G.notes, tapes: G.tapes, pins: G.pins, builds: G.builds, seen: G.seen, lairT: G.lairT, pois: G.pois, kills: G.kills, killsBy: G.killsBy, reapDay: G.reapDay, fog: Array.from(G.fog).join(''), placed: G.placed.map(o => ({ type: o.type, x: o.x, y: o.y, hp: o.hp, inv: o.inv, water: o.water })),
    dev: DEV.on ? { god: DEV.god, needs: DEV.needs, pack: DEV.pack, craft: DEV.craft } : 0 }; // modo desenvolvedor fica guardado no save
  DEV.fresh = false; try { localStorage.setItem(slotKey(G.slot || 1), JSON.stringify(d)); return true; } catch (e) { return false; }
}
/* ----- espaços de salvamento e desbloqueios ----- */
const slotKey = n => SAVE_KEY + '_s' + n;
function readSlot(n) {
  try {
    const d = JSON.parse(localStorage.getItem(slotKey(n))); if (!d || d.v !== 3) return null;
    const main = (d.quests || []).find(q => QUESTS[q.id] && QUESTS[q.id].main), qd = d.qdone || {};
    return { name: (d.P && d.P.name) || 'Sobrevivente', look: d.P && d.P.look, origin: d.P && d.P.origin, diff: d.diff, day: Math.floor((d.time || 0) / 24) + 1, lvl: (d.P && d.P.lvl) || 1, at: d.at,
      obj: d.diff === 'aventura' ? 'Explorando o vale' : main ? QUESTS[main.id].title : qd.q_fuga ? 'História concluída' : 'Sobrevivendo' };
  } catch (e) { return null; }
}
function hasSave() { return [1, 2, 3].some(n => !!readSlot(n)); }
function deleteSlot(n) { try { localStorage.removeItem(slotKey(n)); } catch (e) { } }
function unlocked(k) { try { return !!(JSON.parse(localStorage.getItem(UNLOCK_KEY)) || {})[k]; } catch (e) { return false; } }
function unlock(k) { try { const u = JSON.parse(localStorage.getItem(UNLOCK_KEY)) || {}; if (u[k]) return false; u[k] = 1; localStorage.setItem(UNLOCK_KEY, JSON.stringify(u)); return true; } catch (e) { return false; } }
function resetGame() {
  Object.assign(G, { time: 7, enemies: [], animals: [], items: [], projs: [], parts: [], texts: [], fires: [], flares: [], bombs: [], rings: [], decals: [], phant: [], placed: [], quests: [], qdone: {}, evlog: {}, flags: {}, dead: {}, looted: {}, sealed: {}, notes: [], tapes: [], pins: [], builds: {}, seen: {}, lairT: {}, pois: { cabana: 2 }, kills: 0, killsBy: {}, boss: null, emT: 50, whT: 20, reapDay: 0, fog: new Uint8Array(FW * FH), ghost: null, target: null, lit: true, fireNear: false });
  genWorld(1337); chunks.clear(); newPlayer();
  G.car = { x: CAR_START[0] * TILE, y: CAR_START[1] * TILE, ang: 0, spd: 0, fuel: 0, hp: 60, fixed: false, inv: [], r: 22 };
}
function loadGame(slot) {
  slot = slot || G.slot || 1; let d; try { d = JSON.parse(localStorage.getItem(slotKey(slot))); } catch (e) { return false; } if (!d || d.v !== 3) return false;
  resetGame(); G.slot = slot; Object.assign(P, d.P); WHO.eu[1] = P.name || 'Você'; G.time = d.time; G.diff = d.diff || 'normal'; Object.assign(G.car, d.car || {});
  for (const k of ['quests', 'qdone', 'evlog', 'flags', 'dead', 'looted', 'sealed', 'notes', 'tapes', 'pins', 'builds', 'seen', 'lairT', 'pois', 'kills', 'killsBy', 'reapDay']) if (d[k] !== undefined) G[k] = d[k];
  if (d.fog) for (let i = 0; i < FW * FH; i++) G.fog[i] = d.fog[i] === '1' ? 1 : 0;
  for (const id in G.dead) { const o = W.objs[id]; if (o) { o.dead = true; if (o.type !== 'bush') o.solid = false; } }
  for (const i in G.sealed) if (W.fissures[i]) W.fissures[i].sealed = true; if (G.flags.won) W.bigFissure.sealed = true;
  for (const k in G.builds || {}) { const b = G.builds[k], pc = BUILDS.find(p => p.id === b.id), [tx, ty] = k.split(',').map(Number); if (pc) setTile(tx, ty, pc.tile); else delete G.builds[k]; }
  for (const p of d.placed || []) { const o = mkObj(p.type, p.x, p.y, { placed: 1 }); o.hp = p.hp; if (p.inv) o.inv = p.inv; if (p.water !== undefined) o.water = p.water; G.placed.push(o); }
  if (W.postoPump && G.car && !G.car.fixed && !G.flags.gas_posto && G.looted[W.postoPump.id]) delete G.looted[W.postoPump.id];
  // modo desenvolvedor: volta ligado se estava ligado neste save (ou se acabou de ser liberado na tela inicial)
  if (d.dev) Object.assign(DEV, { on: true }, d.dev); else if (!DEV.fresh) DEV.on = DEV.god = DEV.needs = DEV.pack = DEV.craft = false;
  DEV.fresh = false;
  return true;
}
