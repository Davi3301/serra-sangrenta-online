'use strict';
/* ==========================================================================
   SERRA SANGRENTA 3.0 · DEFESA DA BASE
   Paredes de metal, portões e seteiras; reparar e reforçar paredes;
   Torreta Sentinela (automática e esperta); Ninho de Metralhadora (você opera);
   e o Kit de Blindagem, que transforma a caminhonete num blindado com
   metralhadora que atira enquanto você dirige e vigia a base estacionado.
   ========================================================================== */
Object.assign(TCOL, { 24: [[96, 100, 108], [84, 88, 96]], 25: [[70, 74, 80], [60, 64, 70]], 26: [[104, 102, 106], [92, 90, 94]] });
Object.assign(TPRIO, { 24: 99, 25: 99, 26: 99 });

/* --------------------------- desenho das peças --------------------------- */
const _renderChunkD = renderChunk;
renderChunk = function (cx, cy) {
  const cv = _renderChunkD(cx, cy); if (!G.builds) return cv; const x0 = cx * CH, y0 = cy * CH; let any = false;
  for (let y = y0; y < y0 + CH && !any; y++) for (let x = x0; x < x0 + CH; x++) { const t = tileAt(x, y); if (t >= 24 && t <= 26) { any = true; break; } } if (!any) return cv;
  const c = cv.getContext('2d'); c.save(); c.setTransform(1, 0, 0, 1, -x0 * TILE, -y0 * TILE);
  for (let y = y0; y < y0 + CH; y++) for (let x = x0; x < x0 + CH; x++) {
    const t = tileAt(x, y); if (t < 24 || t > 26) continue; const px = x * TILE, py = y * TILE, S = tileAt(x, y + 1) !== t, N = tileAt(x, y - 1) !== t, Wn = tileAt(x - 1, y) !== t, En = tileAt(x + 1, y) !== t;
    if (t === T.MWALL) { c.fillStyle = '#5e626a'; c.fillRect(px, py, TILE, TILE); c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(px + 3, py + 3, TILE - 6, 5); c.fillStyle = '#2a2c32'; for (const [rx, ry] of [[6, 6], [TILE - 6, 6], [6, TILE - 24], [TILE - 6, TILE - 24]]) { c.beginPath(); c.arc(px + rx, py + ry, 1.8, 0, 7); c.fill(); } if (S) { c.fillStyle = '#7a7e88'; c.fillRect(px, py + TILE - 20, TILE, 20); c.fillStyle = 'rgba(0,0,0,.25)'; for (let k = 0; k < 4; k++) c.fillRect(px + k * 10 + 4, py + TILE - 20, 1.5, 20); c.fillStyle = 'rgba(140,70,30,.25)'; if (hash2(x, y, 3) < .4) c.fillRect(px + 8, py + TILE - 12, 10, 8); } }
    else if (t === T.GATE) { c.fillStyle = '#3a3e46'; c.fillRect(px, py, TILE, TILE); c.fillStyle = '#5a5e68'; for (let k = 0; k < 5; k++) c.fillRect(px + 3 + k * 7.6, py + 2, 3, TILE - 4); c.fillRect(px + 2, py + 8, TILE - 4, 3); c.fillRect(px + 2, py + TILE - 12, TILE - 4, 3); c.fillStyle = '#c4a446'; c.fillRect(px + TILE / 2 - 3, py + TILE / 2 - 3, 6, 6); }
    else if (t === T.SLIT) { c.fillStyle = '#6a686e'; c.fillRect(px, py, TILE, TILE); c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(px, py + 19, TILE, 1.5); c.fillRect(px + 19, py, 1.5, 19); c.fillStyle = '#0e0c10'; c.fillRect(px + 8, py + 16, TILE - 16, 6); if (S) { c.fillStyle = '#56545a'; c.fillRect(px, py + TILE - 20, TILE, 20); c.fillStyle = '#0e0c10'; c.fillRect(px + 9, py + TILE - 13, TILE - 18, 4); } }
    c.fillStyle = '#16141a'; if (N) c.fillRect(px, py, TILE, 2.5); if (S) c.fillRect(px, py + TILE - 2.5, TILE, 2.5); if (Wn) c.fillRect(px, py, 2.5, TILE); if (En) c.fillRect(px + TILE - 2.5, py, 2.5, TILE);
  }
  c.restore(); return cv;
};

/* ------------------------ reparar e reforçar paredes ------------------------ */
// clicar com a mesma peça numa parede danificada conserta pela metade do custo;
// clicar com uma peça mais forte em cima de uma parede reforça (madeira > pedra > metal)
const _buildPlace = buildPlace;
buildPlace = function () {
  const pc = BUILDS[BUILD.sel], [tx, ty] = BUILD.tile || [], k = bkey(tx, ty), cur = G.builds[k];
  if (cur && pc && cur.id !== 'piso') {
    const cpc = BUILDS.find(p => p.id === cur.id);
    if (dist(P.x, P.y, (tx + .5) * TILE, (ty + .5) * TILE) > 5.5 * TILE) { hint('Longe demais.'); return; }
    if (cur.id === pc.id && cpc && cpc.hp && cur.hp < cpc.hp) {
      const cost = {}; for (const i in pc.cost) cost[i] = Math.ceil(pc.cost[i] / 2); if (!DEV.craft) { for (const i in cost) if (invCount(i) < cost[i]) { hint('Faltam materiais para consertar.'); return; } for (const i in cost) invRemove(i, cost[i]); }
      cur.hp = cpc.hp; sfx('place'); burst((tx + .5) * TILE, (ty + .5) * TILE, '#c8c0a8', 10, 80); addText((tx + .5) * TILE, ty * TILE, 'Consertado', '#9ac25a'); return;
    }
    const door = id => id === 'porta' || id === 'portao';
    if ((WALL_TIER[pc.id] || 0) > (WALL_TIER[cur.id] || 0) && door(pc.id) === door(cur.id)) {
      if (!DEV.craft) { for (const i in pc.cost) if (invCount(i) < pc.cost[i]) { hint('Faltam materiais.'); return; } for (const i in pc.cost) invRemove(i, pc.cost[i]); }
      G.builds[k] = { id: pc.id, hp: pc.hp || 0, orig: cur.orig }; setTile(tx, ty, pc.tile); sfx('place'); burst((tx + .5) * TILE, (ty + .5) * TILE, '#a89878', 14, 100); addText((tx + .5) * TILE, ty * TILE, 'Reforçado', '#e0c060'); addXP(2); return;
    }
  }
  return _buildPlace();
};
const _buildCheck = buildCheck;
buildCheck = function (tx, ty, pc) {
  const cur = G.builds[bkey(tx, ty)]; if (cur && pc && cur.id !== 'piso') { const cpc = BUILDS.find(p => p.id === cur.id); if (cur.id === pc.id && cpc && cpc.hp && cur.hp < cpc.hp) return ''; if ((WALL_TIER[pc.id] || 0) > (WALL_TIER[cur.id] || 0)) return ''; }
  return _buildCheck(tx, ty, pc);
};

/* ------------------------------ torretas ------------------------------ */
Object.assign(OBJ, { torreta: { r: 14, solid: 1 }, ninho: { r: 26, solid: 1 } });
Object.assign(SHAPES, { torreta: [13, 9, 0, 3], ninho: [26, 12, 0, 6] });
Object.assign(PROJ_SKIP, { torreta: 1, ninho: 1 }); // os tiros passam por cima (dos dois lados)
const _projHitsObjD = projHitsObj;
projHitsObj = function (p) { if (p.src && p.src === G.car) { const c = G.car; G.car = null; try { return _projHitsObjD(p); } finally { G.car = c; } } return _projHitsObjD(p); };
const TUR = () => { const S = v3(); if (!S.turrets) S.turrets = {}; return S.turrets; };
// a linha de tiro passa por parede? (seteira e portão aberto deixam passar)
function clearShot(x0, y0, x1, y1) { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(L / 16); for (let i = 1; i < n; i++) { const k = i / n, t = tileAtPx(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k); if (t === T.MOUNT || t === T.WALL || t === T.WWALL || t === T.SWALL || t === T.MWALL || t === T.DOOR || t === T.GATE) return false; } return true; }
function friendInLine(x0, y0, x1, y1) {
  const who = [P].concat(typeof MP !== 'undefined' && MP.role ? Object.values(MP.peers) : []);
  for (const p of who) { if (p === P && P.dead) continue; const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy || 1, k = clamp(((p.x - x0) * dx + (p.y - y0) * dy) / L, 0, 1); if (dist(p.x, p.y, x0 + dx * k, y0 + dy * k) < 22) return true; } return false;
}
// escolhe o alvo: quem está batendo em parede da base vem primeiro, depois o mais perto
function pickTarget(x, y, R) {
  let best = null, bs = -1e9;
  for (const e of G.enemies) { if (e.dead || e.state === 'burrow' || e.state === 'emerge' || e.def.patch && e.def.spd === 0 && false) continue; const d = dist(x, y, e.x, e.y); if (d > R) continue; if (!clearShot(x, y, e.x, e.y)) continue; const s = -d + (e.wallHit || e.blockObj || e.bt2 ? 400 : 0) + (e.def.boss ? 150 : 0); if (s > bs) { bs = s; best = e; } }
  return best;
}
function turretFire(o, x, y, ang, dmg, spread, speed) {
  const a = ang + (Math.random() - .5) * 2 * spread;
  G.projs.push({ kind: 'bullet', from: 'p', turret: 1, src: o, x: x + Math.cos(ang) * 20, y: y + Math.sin(ang) * 20, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, ang: a, dmg, life: .6, kb: 60, hits: [] });
}
function aimLead(x, y, e, speed) { const vx = (e.x - (e.px === undefined ? e.x : e.px)) / (1 / 60), vy = (e.y - (e.py === undefined ? e.y : e.py)) / (1 / 60), tt = dist(x, y, e.x, e.y) / speed; return Math.atan2(e.y + clamp(vy, -400, 400) * tt * .8 - y, e.x + clamp(vx, -400, 400) * tt * .8 - x); }
function turretTick(dt) {
  if (typeof MP !== 'undefined' && MP.role === 'client') return; // no multijogador quem atira é o anfitrião
  const T2 = TUR();
  for (const o of G.placed) {
    if (o.dead || o.type !== 'torreta') continue; const k = pkey(o); o.ammo = T2[k] || 0; o.cd = (o.cd || 0) - dt; o.ang = o.ang === undefined ? -Math.PI / 2 : o.ang;
    if (o.ammo <= 0) { o.tgt = null; continue; }
    const e = o.tgt && !o.tgt.dead && dist(o.x, o.y, o.tgt.x, o.tgt.y) < 470 && clearShot(o.x, o.y, o.tgt.x, o.tgt.y) ? o.tgt : (o.scan = (o.scan || 0) - dt) <= 0 ? (o.scan = .25, pickTarget(o.x, o.y, 460)) : null; o.tgt = e;
    if (!e) { o.ang += dt * .6; continue; }
    const want = aimLead(o.x, o.y, e, 1100), da = angDiff(want, o.ang); o.ang += clamp(da, -5 * dt, 5 * dt);
    if (Math.abs(da) < .12 && o.cd <= 0 && !friendInLine(o.x, o.y, e.x, e.y)) { o.cd = .16; turretFire(o, o.x, o.y - 10, o.ang, 12, .04, 1100); T2[k] = --o.ammo; o.flash = .06; if (Math.random() < .5) sfx('shot', o.x, o.y); if (Math.random() < .1) alertNoise(o.x, o.y, 380); }
  }
  for (const e of G.enemies) { e.px = e.x; e.py = e.y; }
}
DRAW2.torreta = o => {
  const x = o.x, y = o.y, a = o.ang === undefined ? -Math.PI / 2 : o.ang; shadow(x, y + 10, 16, 5);
  for (const dx of [-11, 0, 11]) seg([x, y - 4, x + dx, y + 10], 3, OL); rr(x - 9, y - 12, 18, 10, 3, '#3a4a34', OL);
  g.save(); g.translate(x, y - 12); g.rotate(a); rr(-8, -7, 18, 14, 4, '#4a5a40', OL); rr(8, -3, 18, 6, 2, '#26282e', OL); if ((o.flash || 0) > 0) { o.flash -= RDT; poly([26, 0, 36, -6, 44, 0, 36, 6], '#f4e0a0'); } g.restore();
  circ(x - 6, y - 7, 2, (o.ammo || 0) > 0 ? (o.tgt ? '#e05050' : '#6fe07a') : '#5a1a1a');
  if (o.ammo !== undefined && o.ammo < 30) { g.save(); g.font = '800 10px Barlow'; g.textAlign = 'center'; g.fillStyle = o.ammo ? '#e0c060' : '#e06060'; g.fillText(o.ammo ? o.ammo + ' bal.' : 'SEM MUNIÇÃO', x, y - 28); g.restore(); }
};
/* --------------------------- ninho de metralhadora --------------------------- */
DRAW2.ninho = o => {
  const x = o.x, y = o.y; shadow(x, y + 14, 30, 8);
  for (let k = 0; k < 7; k++) { const a = Math.PI * (1 + k / 6) * 1 - Math.PI * .0, bx = x + Math.cos(a) * 24, by = y + 8 + Math.sin(a) * 12; ell(bx, by, 10, 6.5, '#a8946a', OL); seg([bx - 5, by, bx + 5, by], 1, 'rgba(60,44,24,.4)'); }
  const a = P.manning === o ? P.ang : (o.ang === undefined ? -Math.PI / 2 : o.ang);
  g.save(); g.translate(x, y - 6); g.rotate(a); rr(-6, -5, 16, 10, 2, '#34363e', OL); rr(8, -2.5, 30, 5, 2, '#26282e', OL); rr(2, -9, 8, 5, 1, '#565a64', OL); if (P.manning === o && (o.flash || 0) > 0) { o.flash -= RDT; poly([38, 0, 48, -7, 58, 0, 48, 7], '#f4e0a0'); } g.restore();
  if (P.manning === o) { const h = (o.heat || 0) / 100; rr(x - 20, y + 24, 40, 5, 2, '#141018'); rr(x - 20, y + 24, 40 * h, 5, 2, o.jam > 0 ? '#e05050' : h > .7 ? '#e0a040' : '#c8c0a8'); }
};
function nestTick(dt) {
  const o = P.manning; if (!o) return; if (o.dead || P.dead || P.driving || dist(P.x, P.y, o.x, o.y + 30) > 80) { P.manning = null; return; }
  P.x = o.x; P.y = o.y + 30; P.moving = false; P.atkCd = Math.max(P.atkCd, .1); o.ang = P.ang;
  o.heat = Math.max(0, (o.heat || 0) - 28 * dt); o.jam = Math.max(0, (o.jam || 0) - dt); o.cd = (o.cd || 0) - dt;
  if (mouse.down && o.cd <= 0 && !(o.jam > 0) && !paused()) {
    if (invCount('municao9') <= 0) { if (mouse.pressed) hint('Sem Munição 9mm.'); return; }
    o.cd = .085; invRemove('municao9', 1); turretFire(o, o.x, o.y - 6, P.ang, 20, .05, 1150); o.flash = .05; o.heat += 5; G.shake = Math.max(G.shake, 1.5); if (Math.random() < .6) sfx('shot', o.x, o.y); if (Math.random() < .15) alertNoise(o.x, o.y, 520);
    if (o.heat >= 100) { o.jam = 2.2; o.heat = 100; toast('A metralhadora superaqueceu!', 'u_warn'); sfx('click'); }
  }
}
Object.assign(EXTRA_TARGET, {
  torreta: o => `Carregar a torreta (${TUR()[pkey(o)] || 0}/300 · Munição 9mm)`,
  ninho: o => P.manning === o ? 'Sair do ninho' : 'Operar a metralhadora',
});
Object.assign(EXTRA_USE, {
  torreta: o => { const k = pkey(o), have = invCount('municao9'), room = 300 - (TUR()[k] || 0); if (!have) { hint('Você não tem Munição 9mm.'); return; } if (room <= 0) { hint('A torreta já está cheia.'); return; } const n = Math.min(have, room); invRemove('municao9', n); TUR()[k] = (TUR()[k] || 0) + n; if (typeof MP !== 'undefined' && MP.role === 'client') sendHost({ t: 'tur', k, n }); toast(`Torreta carregada: +${n} balas.`, 'municao9'); sfx('equip'); },
  ninho: o => { if (P.manning === o) { P.manning = null; toast('Você saiu do ninho.', 'u_hand'); } else { P.manning = o; P.crouch = false; toast('Mire com o mouse e segure o botão para atirar. E para sair.', 'municao9'); sfx('equip'); } },
});

/* ------------------------------ blindado ------------------------------ */
const _useItemD = useItem;
useItem = function (id) {
  const it = ITEMS[id]; if (it && it.use === 'blindar') { const c = G.car; if (!c || dist(P.x, P.y, c.x, c.y) > 140) { hint('Chegue perto da caminhonete para instalar.'); return; } if (v3().armored) { hint('A caminhonete já está blindada.'); return; } invRemove(id, 1); v3().armored = 1; c.hp = 100; sfx('level'); toast('Caminhonete blindada! Clique para atirar enquanto dirige. Estacionada, ela vigia a base com a Munição 9mm do porta-malas.', 'kit_blindagem', true); burst(c.x, c.y, '#c4a446', 24, 160); return; }
  return _useItemD(id);
};
const _carDamage = carDamage; carDamage = function (d) { return _carDamage(v3().armored ? d * .35 : d); };
function trunkAmmo() { const c = G.car; return (c.inv || []).reduce((n, s) => n + (s.id === 'municao9' ? s.n : 0), 0); }
function takeTrunkAmmo() { const c = G.car; const s = (c.inv || []).find(s => s.id === 'municao9'); if (!s) return false; s.n--; if (s.n <= 0) c.inv.splice(c.inv.indexOf(s), 1); return true; }
function carGunTick(dt) {
  const c = G.car, S = v3(); if (!c || !S.armored) return; c.gcd = (c.gcd || 0) - dt; c.gang = c.gang === undefined ? c.ang : c.gang;
  if (P.driving) { // você atira com o mouse enquanto dirige
    const want = Math.atan2(mouse.wy - c.y, mouse.wx - c.x); c.gang += clamp(angDiff(want, c.gang), -7 * dt, 7 * dt);
    if (mouse.down && c.gcd <= 0 && !paused()) { const has = invCount('municao9') > 0 || trunkAmmo() > 0; if (!has) { if (mouse.pressed) hint('Sem Munição 9mm (mochila ou porta-malas).'); return; } if (invCount('municao9') > 0) invRemove('municao9', 1); else takeTrunkAmmo(); c.gcd = .11; turretFire(c, c.x, c.y - 8, c.gang, 16, .05, 1150); c.gflash = .05; if (Math.random() < .6) sfx('shot', c.x, c.y); }
    return;
  }
  if (typeof MP !== 'undefined' && MP.role === 'client') return;
  // estacionada: modo sentinela com a munição do porta-malas
  if (trunkAmmo() <= 0) { c.gtgt = null; return; }
  const e = c.gtgt && !c.gtgt.dead && dist(c.x, c.y, c.gtgt.x, c.gtgt.y) < 500 && clearShot(c.x, c.y, c.gtgt.x, c.gtgt.y) ? c.gtgt : (c.gscan = (c.gscan || 0) - dt) <= 0 ? (c.gscan = .25, pickTarget(c.x, c.y, 480)) : null; c.gtgt = e;
  if (!e) { c.gang += dt * .5; return; }
  const want = aimLead(c.x, c.y, e, 1150), da = angDiff(want, c.gang); c.gang += clamp(da, -4.5 * dt, 4.5 * dt);
  if (Math.abs(da) < .12 && c.gcd <= 0 && !friendInLine(c.x, c.y, e.x, e.y) && takeTrunkAmmo()) { c.gcd = .14; turretFire(c, c.x, c.y - 8, c.gang, 15, .05, 1150); c.gflash = .05; if (Math.random() < .5) sfx('shot', c.x, c.y); }
}
const _drawCarD = drawCar;
// blindado: casco verde-oliva chanfrado, saias de aço, vigia no lugar do para-brisa,
// caçamba com caixas de munição e uma torre com escudo no teto
drawCar = function (c) {
  if (!v3().armored) return _drawCarD(c);
  const on = P.driving, dead = c.hp <= 0, hull = dead ? '#3a3a30' : '#4e5a3a', dark = dead ? '#2a2a24' : '#3a4430';
  g.save(); g.translate(c.x, c.y); shadow(0, 12, 44, 16); g.rotate(c.ang); g.lineWidth = 2.5;
  g.fillStyle = '#0c0a0e'; for (const [wx, wy] of [[-30, -21], [-12, -21], [14, -21], [-30, 16], [-12, 16], [14, 16]]) rr(wx, wy, 14, 6, 2, '#141216');
  poly([-40, -17, 28, -17, 40, -10, 40, 10, 28, 17, -40, 17], hull, OL);
  rr(-40, -19, 64, 5, 1, dark, OL); rr(-40, 14, 64, 5, 1, dark, OL);
  for (let k = -36; k < 22; k += 9) { circ(k, -16.5, 1.2, '#1e2418'); circ(k, 16.5, 1.2, '#1e2418'); }
  rr(-38, -13, 30, 26, 2, dark, OL); for (const [bx, by] of [[-35, -10], [-24, -10], [-35, 1], [-24, 1]]) { rr(bx, by, 9, 8, 1, '#5a4a2a', OL); seg([bx + 2, by + 4, bx + 7, by + 4], 1, '#c4a446'); }
  poly([-6, -15, 22, -15, 30, -9, 30, 9, 22, 15, -6, 15], dead ? '#34342c' : '#56623f', OL);
  rr(22, -8, 4, 16, 1, '#141a1e'); seg([23, -6, 25, -2], 1, 'rgba(200,220,220,.35)');
  rr(30, -14, 10, 4, 1, '#26282e'); rr(30, 10, 10, 4, 1, '#26282e'); seg([40, -12, 40, 12], 3, '#26282e');
  g.lineWidth = 1.5; circ(38, -7, 2.6, on ? '#f4e8b0' : '#56524a', OL); circ(38, 7, 2.6, on ? '#f4e8b0' : '#56524a', OL);
  g.fillStyle = on && c.spd < -5 ? '#e8e0d0' : '#6a1c1c'; g.fillRect(-41, -12, 2.5, 5); g.fillRect(-41, 7, 2.5, 5);
  g.fillStyle = 'rgba(230,225,200,.55)'; g.font = '900 7px Barlow'; g.textAlign = 'center'; g.save(); g.translate(8, 0); g.rotate(Math.PI / 2); g.fillText('★', 0, 3); g.restore();
  g.restore();
  // torre giratória com escudo
  const ga = c.gang === undefined ? c.ang : c.gang; g.save(); g.translate(c.x, c.y - 4); g.lineWidth = 2.5; circ(0, 0, 10, dead ? '#34342c' : '#465238', OL); g.rotate(ga);
  rr(4, -2.5, 30, 5, 2, '#24262c', OL); rr(30, -3.5, 6, 7, 1, '#1a1c20'); poly([5, -11, 10, -11, 10, 11, 5, 11], '#3e4832', OL); rr(-5, -5, 9, 10, 2, '#2e3426', OL);
  if ((c.gflash || 0) > 0) { c.gflash -= RDT; poly([36, 0, 46, -7, 56, 0, 46, 7], '#f4e0a0'); } g.restore();
  if (!P.driving && trunkAmmo() > 0) { g.save(); g.font = '800 10px Barlow'; g.textAlign = 'center'; g.fillStyle = c.gtgt ? '#e05050' : '#6fe07a'; g.fillText(`SENTINELA · ${trunkAmmo()}`, c.x, c.y - 38); g.restore(); }
  if (P.driving && darkness() > .1) { const fx = Math.cos(c.ang), fy = Math.sin(c.ang), m = lightMul(); lights.push([c.x + fx * 90, c.y + fy * 90, 130 * m, 1], [c.x + fx * 210, c.y + fy * 210, 180 * m, .95], [c.x + fx * 340, c.y + fy * 340, 150 * m, .6], [c.x, c.y, 90, .7]); }
};

/* ------------------------------ passo a passo ------------------------------ */
const _updateD = update;
update = function (dt) { _updateD(dt); if (G.state !== 'play' || CS.on) return; try { turretTick(dt); nestTick(dt); carGunTick(dt); } catch (e) { console.error(e); } };
// no ninho, o clique esquerdo é da metralhadora, não da arma na mão
const _updatePlayerD = updatePlayer;
updatePlayer = function (dt) { if (P.manning) { const mx = P.x, my = P.y; const md = mouse.down, mp = mouse.pressed; mouse.down = false; mouse.pressed = false; _updatePlayerD(dt); mouse.down = md; mouse.pressed = mp; P.x = mx; P.y = my; return; } return _updatePlayerD(dt); };
