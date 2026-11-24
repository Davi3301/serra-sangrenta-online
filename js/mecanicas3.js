'use strict';
/* ==========================================================================
   SERRA SANGRENTA 3.0 · MECÂNICAS NOVAS
   Personagem: agachar (Z), bloquear (botão direito), golpe forte (F),
   temperatura do corpo e hipotermia. Armas: flechas de fogo e veneno (T),
   dardos, fumaça. Base: efígies que espantam criaturas, armadilhas de laço
   e de tronco, tambor de fogo. E o Dr. Ramires, na Vila do Pico.
   ========================================================================== */
NPC_NAME.ramires = 'Dr. Ramires';
const v3 = () => { ensureV2(); if (!G.v2.e3) G.v2.e3 = { burn: {}, traps: {} }; return G.v2.e3; };
const pkey = o => Math.round(o.x) + ',' + Math.round(o.y);

/* ------------------------------- teclas ------------------------------- */
addEventListener('keydown', e => {
  if (G.state !== 'play' || paused() || e.repeat || (e.target && e.target.tagName === 'INPUT')) return; const k = e.key.toLowerCase();
  if (k === 'z' && !P.driving) { P.crouch = !P.crouch; toast(P.crouch ? 'Agachado: mais devagar, mais silencioso.' : 'De pé.', 'u_eye'); }
  else if (k === 'f') powerAttack();
  else if (k === 't') cycleArrow();
});
addEventListener('mousedown', e => { if (e.button === 2) mouse.rdown = true; });
addEventListener('mouseup', e => { if (e.button === 2) mouse.rdown = false; });
addEventListener('blur', () => { mouse.rdown = false; });

/* ---------------------------- golpe forte ---------------------------- */
function powerAttack() {
  const it = curItem(); if (!it || it.t !== 'melee' || P.driving || P.atkCd > 0 || P.swing || P.blocking) return;
  const cost = 24; if (P.stam < cost) { hint('Sem fôlego para um golpe forte.'); return; }
  P.stam -= cost; P.stamDelay = .8; P.crouch = false;
  const strong = Object.assign({}, it, { dmg: it.dmg * 2.1, kb: (it.kb || 100) * 1.9, arc: (it.arc || 1.2) * 1.15 });
  P.atkCd = it.cd * 1.7; P.swing = { t: 0, dur: it.cd * 1.05, it: strong, hit: false, ang: P.ang, power: 1 }; sfx('swing'); G.shake = Math.max(G.shake, 3);
  addText(P.x, P.y - 36, 'Golpe forte!', '#e0c060');
}
/* ------------------------------- flechas ------------------------------- */
const ARROWS = [['flecha', 'Comum'], ['flecha_fogo', 'Fogo'], ['flecha_veneno', 'Veneno']];
function curArrow() { const a = P.arrow || 'flecha'; return invCount(a) > 0 ? a : 'flecha'; }
function cycleArrow() {
  const it = curItem(); if (!it || it.kind !== 'bow') return; const have = ARROWS.filter(a => invCount(a[0]) > 0); if (!have.length) { hint('Sem flechas.'); return; }
  const i = have.findIndex(a => a[0] === curArrow()), n = have[(i + 1) % have.length]; P.arrow = n[0]; toast('Flecha: ' + n[1] + ' (' + invCount(n[0]) + ')', n[0]);
}

/* ------------------------------ bloqueio ------------------------------ */
const _hurtPlayer3 = hurtPlayer;
hurtPlayer = function (dmg, ang, kb, src) {
  if (P.blocking && ang !== undefined && !P.dead && P.inv_t <= 0) {
    const from = ang + Math.PI; // de onde veio o golpe
    if (Math.abs(angDiff(from, P.ang)) < 1.25) {
      const cost = 9 + dmg * .45; P.stam -= cost; P.stamDelay = .7; sfx('hit'); burst(P.x + Math.cos(P.ang) * 16, P.y + Math.sin(P.ang) * 16, '#e8e0d0', 8, 140, 2); wear(P.hot[P.sel], 1);
      if (P.stam < 0) { P.stam = 0; P.blocking = false; P.blockBreak = 1.2; addText(P.x, P.y - 36, 'Guarda quebrada!', '#e06060'); return _hurtPlayer3(dmg * .6, ang, kb, src); }
      addText(P.x, P.y - 36, 'Bloqueado', '#c8c0a8'); return _hurtPlayer3(dmg * .22, ang, (kb || 200) * .3, src);
    }
  }
  return _hurtPlayer3(dmg, ang, kb, src);
};

/* ----------------------------- temperatura ----------------------------- */
function ambientTemp() {
  const x = P.x, y = P.y, dk = darkness(), t0 = tileAtPx(x, y); let t = 92 - dk * 22;
  if (inPlanalto(x, y)) t = 40 - dk * 28; else if (inMataFunda(x, y)) t = 86 - dk * 26;
  if (t0 === T.CAVE) t = Math.min(t, 58);
  if (G.v2 && G.v2.weather === 'chuva' && !INDOOR[t0]) t -= 16 * (G.v2.wk || 0);
  if (INDOOR[t0] && t0 !== T.CAVE) t += 18; if (P.driving) t += 20;
  const wear2 = (P.armor ? ITEMS[P.armor].warm || 0 : 0) + (invCount('gorro') ? 20 : 0); t += wear2 * .75;
  let fire = 0; queryObjs(x, y, 240, o => { if (o.dead) return; if (o.type === 'fogueira' || o.type === 'tambor_fogo' || o.type === 'fornalha') { const d = dist(x, y, o.x, o.y); fire = Math.max(fire, d < 150 ? 1 : d < 240 ? 1 - (d - 150) / 90 : 0); } });
  return Math.max(t, 30 + fire * 70);
}
function tempTick(dt) {
  if (P.temp === undefined) P.temp = 100;
  const tg = clamp(ambientTemp(), 0, 100); P.temp += (tg > P.temp ? 5 : -.75) * dt * (tg > P.temp ? 1 : (P.sprint ? .6 : 1)); P.temp = clamp(P.temp, 0, 100);
  if (P.temp < 35) { P.stam = Math.max(0, P.stam - 3 * dt); P.sanity = Math.max(0, P.sanity - .4 * dt); if (!G.v2.coldWarn) { G.v2.coldWarn = 1; toast('Você está com frio. Ache fogo, abrigo ou roupa quente.', 'pele_branca', true); } }
  else G.v2.coldWarn = 0;
  if (P.temp < 15 && !DEV.god) { P.hp -= 1.6 * dt; if (P.hp <= 0) { P.deathBy = 'frio'; die(); } if (Math.random() < dt * .5) addText(P.x, P.y - 30, 'Hipotermia', '#8ab8e8'); }
}

/* ------------------------- efígies e armadilhas ------------------------- */
const _placeObj3 = placeObj;
placeObj = function (it) {
  _placeObj3(it); const o = G.placed[G.placed.length - 1]; if (!o) return; const S = v3();
  if (it.id === 'efigie') { S.burn[pkey(o)] = G.time + 36; o.burn = 1; toast('A efígie queima por um dia e meio.', 'efigie'); }
  if (it.id === 'armadilha_tronco') S.traps[pkey(o)] = 1;
};
function efigyNear(x, y) { const S = v3(); let hit = null; for (const o of G.placed) { if (o.dead) continue; if (o.type === 'efigie_ressonante' && dist(o.x, o.y, x, y) < 520) return o; if (o.type === 'efigie' && (S.burn[pkey(o)] || 0) > G.time && dist(o.x, o.y, x, y) < 300) hit = o; } return hit; }
function trapTick(dt) {
  const S = v3();
  for (const o of G.placed) {
    if (o.dead) continue;
    if (o.type === 'efigie') o.burn = (S.burn[pkey(o)] || 0) > G.time ? 1 : 0;
    if (o.type === 'armadilha_laco') { o.cd = (o.cd || 0) - dt; if (o.cd > 0) continue; for (const e of G.enemies) if (!e.dead && !e.def.boss && !e.def.patch && dist(e.x, e.y, o.x, o.y) < 18 + e.r * .5) { e.stun = Math.max(e.stun || 0, 5); o.cd = 9; burst(o.x, o.y, '#9c8658', 8, 90); sfx('break', o.x, o.y); addText(e.x, e.y - e.r - 10, 'Preso!', '#e0c060'); break; } }
    if (o.type === 'armadilha_tronco' && S.traps[pkey(o)]) for (const e of G.enemies) if (!e.dead && !e.def.patch && dist(e.x, e.y, o.x, o.y) < 24 + e.r * .5) { S.traps[pkey(o)] = 0; hurtEnemy(e, e.def.boss ? 90 : 160, 0, 300, true); G.shake = Math.max(G.shake, 6); sfx('thud', o.x, o.y); burst(o.x, o.y, '#86683f', 18, 160, 5); break; }
  }
}
Object.assign(EXTRA_TARGET, { armadilha_tronco: o => v3().traps[pkey(o)] ? '' : 'Rearmar o tronco (2 Madeiras)', efigie: o => (v3().burn[pkey(o)] || 0) > G.time ? '' : 'Reacender a efígie (1 Tecido Vivo)' });
Object.assign(EXTRA_USE, {
  armadilha_tronco: o => { if (invCount('madeira') < 2) { hint('Precisa de 2 Madeiras.'); return; } invRemove('madeira', 2); v3().traps[pkey(o)] = 1; sfx('place'); toast('Armadilha armada.', 'armadilha_tronco'); },
  efigie: o => { if (invCount('tecido_vivo') < 1) { hint('Precisa de 1 Tecido Vivo para reacender.'); return; } invRemove('tecido_vivo', 1); v3().burn[pkey(o)] = G.time + 36; o.burn = 1; sfx('fire'); },
});
DRAW2.armadilha_laco = o => { const x = o.x, y = o.y, on = !(o.cd > 0); g.lineWidth = 2; ell(x, y + 2, 13, 7, null, on ? '#c4a86a' : '#6a5a3a'); seg([x - 13, y + 2, x - 18, y - 22], 2.5, '#6e5238'); seg([x - 18, y - 22, x, y + 2], 1.2, on ? '#c4a86a' : 'rgba(0,0,0,0)'); };
DRAW2.armadilha_tronco = o => { const x = o.x, y = o.y, on = v3().traps[pkey(o)]; shadow(x, y + 10, 22, 6); seg([x - 20, y + 10, x - 20, y - 40], 4, '#5a3a22'); seg([x + 20, y + 10, x + 20, y - 40], 4, '#5a3a22'); seg([x - 22, y - 40, x + 22, y - 40], 3, '#5a3a22'); if (on) { seg([x, y - 40, x, y - 26], 1.5, '#c4a86a'); rr(x - 18, y - 28, 36, 12, 6, '#7a5a3a', OL); } else rr(x - 18, y - 2, 36, 12, 6, '#6a4a2a', OL); };
DRAW2.tambor_fogo = o => { const x = o.x, y = o.y; shadow(x, y + 12, 14, 5); rr(x - 12, y - 16, 24, 28, 3, '#6a3a2a', OL); seg([x - 12, y - 6, x + 12, y - 6], 2, 'rgba(0,0,0,.35)'); ell(x, y - 16, 12, 4, '#2a1a14', OL); drawFlame(x, y - 20, .5, 3); lights.push([x, y - 16, 260 + Math.sin(RT * 9 + o.id) * 8, 1, 1]); };
const _effDraw = DRAW2.efigie; DRAW2.efigie = o => { _effDraw(o); if (o.burn) lights.push([o.x, o.y - 30, 220, .9, 1]); };
const _effDraw2 = DRAW2.efigie_ressonante; DRAW2.efigie_ressonante = o => { _effDraw2(o); lights.push([o.x, o.y - 30, 300, .8, 2]); };

// criaturas fogem de efígies acesas (menos os chefes)
const _updateEnemyE = updateEnemy;
updateEnemy = function (e, dt) {
  if (!e.dead && !e.def.boss && !e.def.patch && e.state !== 'emerge' && e.state !== 'burrow') {
    const ef = efigyNear(e.x, e.y);
    if (ef) { e.anim += dt; e.flash -= dt; const a = Math.atan2(e.y - ef.y, e.x - ef.x); steer(e, a, (e.def.spd || 80) * .9, dt); e.ang = a; e.alert = false; if (e.state !== 'idle') e.state = e.def.ai3 ? 'idle' : 'idle'; return; }
  }
  // dentro da fumaça, ninguém acha você
  if (G.smokes && G.smokes.length && !e.def.boss) for (const s of G.smokes) if (dist(e.x, e.y, s.x, s.y) < 150 || dist(P.x, P.y, s.x, s.y) < 150) { if (dist(e.x, e.y, P.x, P.y) > 70) { e.alert = false; if (e.state === 'chase' || e.state === 'stalk' || e.state === 'rush') e.state = 'idle'; } break; }
  return _updateEnemyE(e, dt);
};
const _senseMul3 = senseMul;
senseMul = function () { let m = _senseMul3(); if (P.crouch) m *= .55; if (P.crouch && P.armor && ITEMS[P.armor].leaf) { const t = tileAtPx(P.x, P.y); if (t === T.FOREST || t === T.GRASS || t === T.MUD) m *= .5; } return m; };

/* ------------------------------ Dr. Ramires ------------------------------ */
const _talk3 = talk;
talk = function (npc) {
  if (npc !== 'ramires') return _talk3(npc);
  const before = Object.keys(G.qdone).length, has = id => G.quests.find(q => q.id === id);
  if (G.diff !== 'aventura') { startQuest('q3_serra'); startQuest('q3_pico'); }
  qev('talk:ramires'); if (has('q3_aldeia') && invCount('diario_ramires')) qev('deliver:ramires');
  if (Object.keys(G.qdone).length !== before) return;
  const L = has('q3_aldeia') ? 'A aldeia fica no meio da Mata Funda, ao sul. Agache no mato, fique de frente para eles e não corra. Meus cadernos devem estar numa caixa perto da fogueira grande.'
    : has('q3_caverna') ? 'As Cavernas do Eco ficam a oeste da aldeia. Lá dentro é escuro como breu: leve tocha, lanterna, sinalizador, tudo.'
    : has('q3_efigie') ? 'Ossos, cristal e o coração. Monte a efígie no meio da sua base e durma tranquilo pela primeira vez.'
    : G.qdone.q3_efigie ? 'Escrevi um capítulo inteiro sobre você. Ninguém vai acreditar.' : 'Aqui em cima a noite congela. Fique perto do fogo, beba coisa quente e não durma de roupa molhada.';
  showDialog([['ramires', L]]);
};

/* ------------------------- passo a passo da 3.0 ------------------------- */
const STAT3 = document.createElement('div'); STAT3.id = 'stat3'; STAT3.style.cssText = 'position:absolute;left:50%;bottom:92px;transform:translateX(-50%);display:flex;gap:6px;pointer-events:none;font:700 12px Barlow,sans-serif;letter-spacing:.5px;z-index:5';
function statTick() {
  if (!STAT3.isConnected) { const h = document.getElementById('hud'); if (h) h.appendChild(STAT3); }
  const chips = [], it = curItem();
  if (P.crouch) chips.push(['AGACHADO', '#c8c0a8']); if (P.blocking) chips.push(['BLOQUEANDO', '#e0c060']);
  if (it && it.kind === 'bow') { const a = curArrow(), n = ARROWS.find(x => x[0] === a); chips.push([`FLECHA: ${n ? n[1] : 'Comum'} (${invCount(a)}) · T`, a === 'flecha_fogo' ? '#e08a3a' : a === 'flecha_veneno' ? '#9ac25a' : '#c8c0a8']); }
  const html = chips.map(c => `<span style="background:rgba(14,11,17,.82);border:1px solid ${c[1]};color:${c[1]};padding:3px 8px;border-radius:999px">${c[0]}</span>`).join('');
  if (STAT3.innerHTML !== html) STAT3.innerHTML = html;
}
function update3(dt) {
  if (G.state !== 'play' || paused() || CS.on) return; ensureV2();
  // bloqueio: segurar o botão direito com uma arma branca que não é de arremesso
  const it = curItem(); P.blockBreak = Math.max(0, (P.blockBreak || 0) - dt);
  P.blocking = !!(mouse.rdown && it && it.t === 'melee' && !it.toss && !P.driving && P.stam > 0 && !(P.blockBreak > 0) && !P.swing);
  if (P.blocking) { P.atkCd = Math.max(P.atkCd, .15); P.stamDelay = Math.max(P.stamDelay, .3); P.crouch = false; }
  if (P.sprint) P.crouch = false;
  tempTick(dt); trapTick(dt);
  // veneno nas criaturas
  for (const e of G.enemies) if (e.poison > 0 && !e.dead) { e.poison -= dt; e.hp -= (e.def.boss ? 4 : 7) * dt; if (Math.random() < dt * 6) G.parts.push({ x: e.x + rand(-6, 6), y: e.y - 6, vx: rand(-10, 10), vy: rand(-40, -20), life: .6, max: .6, c: 'rgba(134,150,58,.7)', s: 3 }); if (e.hp <= 0) killEnemy(e); }
  if (G.smokes) { for (const s of G.smokes) s.t -= dt; G.smokes = G.smokes.filter(s => s.t > 0); }
  // história e missões
  V3Q.t -= dt; if (V3Q.t <= 0) { V3Q.t = 1; questTick3(); }
  statTick();
}
const V3Q = { t: 0 };
function questTick3() {
  if (G.diff === 'aventura') return;
  const crossed = P.x >= OW * TILE || P.y >= OH * TILE; G.evlog = G.evlog || {};
  if (crossed && !(G.evlog.reach3 > 0)) qev('reach3');
  if (dayNum() >= 3 || G.qdone.q_carro || crossed) startQuest('q3_serra');
  if (G.pois.aviao === 2) startQuest('s3_voo');
  if (inPlanalto(P.x, P.y)) startQuest('s3_frio');
}
const _lootObj3 = lootObj;
lootObj = function (o) { const was = G.looted[o.id]; _lootObj3(o); if (!was && o.loot === 'mala') qev('mala'); };
const _useItem3 = useItem;
useItem = function (id) { const it = ITEMS[id], n0 = invCount(id); _useItem3(id); if (it && it.warm && invCount(id) < n0) { P.temp = Math.min(100, (P.temp || 100) + it.warm); addText(P.x, P.y - 44, '+calor', '#e0a060'); } };
const _update3 = update;
update = function (dt) { _update3(dt); try { update3(dt); } catch (e) { console.error(e); } };

/* ------------------------ desenho: fumaça, frio, agachar ------------------------ */
const _draw3 = draw;
draw = function (dt) {
  _draw3(dt); if (G.state !== 'play') return; const W2 = g.canvas.width, H2 = g.canvas.height;
  if (G.smokes && G.smokes.length) { const S = DPR * Z; g.save(); g.setTransform(S, 0, 0, S, -cam.x * S, -cam.y * S); for (const s of G.smokes) { const a = Math.min(1, s.t / 2) * .7; for (let k = 0; k < 7; k++) { const ang = k * .9 + RT * .2, r = 60 + (k % 3) * 30; g.fillStyle = `rgba(200,204,210,${a * .35})`; g.beginPath(); g.arc(s.x + Math.cos(ang) * r * .6, s.y + Math.sin(ang) * r * .5, 70, 0, 7); g.fill(); } } g.restore(); }
  if (P.temp !== undefined && P.temp < 50) { const k = (50 - P.temp) / 50; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const gr = g.createRadialGradient(W2 / 2, H2 / 2, Math.min(W2, H2) * .3, W2 / 2, H2 / 2, Math.max(W2, H2) * .7); gr.addColorStop(0, 'rgba(180,210,240,0)'); gr.addColorStop(1, `rgba(200,225,250,${.55 * k})`); g.fillStyle = gr; g.fillRect(0, 0, W2, H2); g.restore(); }
};
const _drawPlayer3 = drawPlayer;
drawPlayer = function () {
  if (!P.crouch && !P.blocking) return _drawPlayer3();
  g.save(); if (P.crouch) { g.translate(P.x, P.y + 13); g.scale(1.06, .8); g.translate(-P.x, -(P.y + 13)); } _drawPlayer3(); g.restore();
  if (P.blocking) { g.save(); g.lineWidth = 3; g.strokeStyle = 'rgba(232,224,208,.75)'; g.beginPath(); g.arc(P.x, P.y - 4, 22, P.ang - 1, P.ang + 1); g.stroke(); g.restore(); }
};
