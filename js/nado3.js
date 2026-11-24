'use strict';
/* ==========================================================================
   NADO
   Rios e lagos deixam de ser parede.
   · Água rasa: você entra andando, com a água na cintura. Fica mais devagar e
     não dá para rolar, mas ainda dá para lutar.
   · Água funda: você nada. Não dá para atacar, construir nem usar itens, e o
     fôlego não volta: ele vai gastando (mais rápido com Shift, com a mochila
     pesada e com armadura de metal). Sem fôlego, você se afoga.
   · A água é fria. Sair dela deixa você molhado por um tempo, e molhado o frio
     entra mais rápido. Fogo seca.
   · Os bichos pequenos não entram na água. Os grandes e os que já foram gente
     atravessam o raso, mais devagar. Ninguém segue você no fundo.
   ========================================================================== */
(function () {
  const swimAt = (x, y) => { const t = tileAtPx(x, y); return t === T.DEEP ? 'fundo' : t === T.WATER ? 'raso' : null; };
  window.swimAt = swimAt;
  // quem atravessa água rasa
  const WADE = { hospedeiro: 1, costurado: 1, imitador: 1, bruto: 1, alfa: 1, colhedor: 1, urso: 1, cervo_oco: 1, cao: 1, uivador: 1 };
  const HEAVY = { armadura_placas: 4, colete_balistico: 3, armadura_ossos: 2, armadura_quitina: 2 };

  /* ----------------------------- movimento ----------------------------- */
  const _moveEntN = moveEnt;
  moveEnt = function (e, dx, dy, ghost) {
    if (e === P && !P.driving) {
      const k = swimAt(P.x, P.y); if (k === 'fundo') { dx *= .5; dy *= .5; } else if (k === 'raso') { dx *= .62; dy *= .62; }
      SOLID[T.WATER] = SOLID[T.DEEP] = false;
      try { return _moveEntN(e, dx, dy, ghost); } finally { SOLID[T.WATER] = SOLID[T.DEEP] = true; }
    }
    if (e && e.def && WADE[e.type] && ENEMIES[e.type]) {
      if (swimAt(e.x, e.y)) { dx *= .6; dy *= .6; }
      SOLID[T.WATER] = false;
      try { return _moveEntN(e, dx, dy, ghost); } finally { SOLID[T.WATER] = true; }
    }
    return _moveEntN(e, dx, dy, ghost);
  };

  /* ------------------------------- fôlego ------------------------------- */
  const _updatePlayerN = updatePlayer;
  updatePlayer = function (dt) {
    const k = (P.driving || P.sleeping || P.dead || P.manning) ? null : swimAt(P.x, P.y), was = P.swim;
    P.swim = k;
    if (k) { P.rollCd = Math.max(P.rollCd, .1); P.crouch = false; }
    if (k === 'fundo') { P.stamDelay = Math.max(P.stamDelay, .2); P.swing = null; P.draw = 0; P.reload = null; P.action = null; if (BUILD.on) BUILD.on = false; }
    _updatePlayerN(dt);
    if (k === 'fundo') P.blocking = false;
    if (k && !was) { sfx('roll'); burst(P.x, P.y + 6, 'rgba(190,220,230,.6)', 10, 90); }
    if (k === 'raso' && !G.v2.wadeTip) { G.v2.wadeTip = 1; toast('Água rasa: mais devagar e sem rolar. Os bichos pequenos não entram aqui.', 'agua', true); }
    if (k === 'fundo') {
      if (!G.v2.swimTip) { G.v2.swimTip = 1; toast('Água funda: você está nadando. O fôlego vai gastando; sem fôlego, você se afoga. Mochila pesada afunda.', 'agua', true); }
      const over = invWeight() / capacity(), heavy = HEAVY[P.armor] || 0;
      const drain = (4.5 + Math.max(0, over - .5) * 9 + heavy) * dt;
      P.stam = Math.max(0, P.stam - drain);
      if (P.moving) { P.walkT += dt * 4; if (Math.random() < dt * 9) G.parts.push({ x: P.x + rand(-10, 10), y: P.y + 4, vx: rand(-25, 25), vy: rand(-30, -5), life: .45, max: .45, c: 'rgba(210,232,240,.7)', s: 2.5 }); }
      if (P.stam <= .5) {
        if (!DEV.god) { P.hp -= 9 * dt; P.hurtFlash = Math.max(P.hurtFlash, .1); }
        if (Math.random() < dt * 6) G.parts.push({ x: P.x + rand(-6, 6), y: P.y - 6, vx: rand(-8, 8), vy: rand(-40, -20), life: .6, max: .6, c: 'rgba(220,240,250,.85)', s: 3 });
        P.drownT = (P.drownT || 0) - dt; if (P.drownT <= 0) { P.drownT = 1.4; addText(P.x, P.y - 34, 'Afogando!', '#8ac8e8'); }
        if (P.hp <= 0 && !P.dead) { P.deathBy = 'afogado'; die(); }
      }
    }
    // molhado: seca devagar, rápido perto do fogo
    if (k) P.wet = 60;
    else if (P.wet > 0) { let fire = false; queryObjs(P.x, P.y, 170, o => { if (!o.dead && (o.type === 'fogueira' || o.type === 'tambor_fogo' || o.type === 'fornalha')) fire = true; }); P.wet = Math.max(0, P.wet - dt * (fire ? 6 : INDOOR[tileAtPx(P.x, P.y)] ? 2 : 1)); if (Math.random() < dt * 3 * (P.wet / 60)) G.parts.push({ x: P.x + rand(-8, 8), y: P.y + rand(-14, 6), vx: 0, vy: 30, life: .4, max: .4, c: 'rgba(170,205,225,.7)', s: 2 }); }
  };

  // nada de ataque, construção ou item no fundo
  const _playerAttackN = playerAttack;
  playerAttack = function (dt) { if (P.swim === 'fundo') { P.draw = 0; return; } return _playerAttackN(dt); };
  const _toggleBuildN = toggleBuild;
  toggleBuild = function () { if (P.swim === 'fundo') return hint('Não dá para construir nadando.'); return _toggleBuildN(); };
  const _useItemN = useItem;
  useItem = function (id) { if (P.swim === 'fundo') return hint('Não dá para usar isso nadando.'); return _useItemN(id); };

  // a água é fria; molhado, o frio entra mais
  const _ambientTempN = ambientTemp;
  ambientTemp = function () { let t = _ambientTempN(); if (P.swim === 'fundo') t -= 34; else if (P.swim === 'raso') t -= 16; else if (P.wet > 0) t -= 16 * P.wet / 60; return t; };

  /* ------------------------------- desenho ------------------------------- */
  function waterline(x, wy, moving, deep) {
    g.save(); g.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) { const k = (RT * (moving ? 1.3 : .7) + i / 3) % 1; g.strokeStyle = `rgba(205,230,238,${.45 * (1 - k)})`; g.beginPath(); g.ellipse(x, wy, 13 + k * 22, 4.5 + k * 7, 0, 0, 6.283); g.stroke(); }
    g.fillStyle = 'rgba(200,228,236,.35)'; g.beginPath(); g.ellipse(x, wy, deep ? 12 : 14, 4, 0, 0, 6.283); g.fill();
    g.restore();
  }
  // corta o boneco na linha d'água: em cima normal, embaixo só um vulto azulado
  function drawInWater(x, y, kind, moving, fn, wt) {
    const deep = kind === 'fundo', bob = Math.sin(RT * (deep ? 3 : 2)) * 1.2, sink = deep ? 13 + bob : 4, cut = y + (deep ? 0 : 7);
    g.save(); g.beginPath(); g.rect(x - 70, cut, 140, 70); g.clip(); g.globalAlpha = .22; g.translate(0, sink); fn(); g.restore();
    g.save(); g.fillStyle = 'rgba(30,60,74,.35)'; g.beginPath(); g.ellipse(x, cut + 8, 16, 10, 0, 0, 6.283); g.fill(); g.restore();
    g.save(); g.beginPath(); g.rect(x - 70, y - 120, 140, cut - (y - 120)); g.clip(); g.translate(0, sink); fn(); g.restore();
    if (deep && moving) { // braçadas
      const a = Math.sin((wt === undefined ? RT * 6 : wt) * 1.2); g.save(); g.lineCap = 'round';
      for (const s of [-1, 1]) { const up = s * a > 0; if (!up) continue; const p = [x + s * 9, cut - 2, x + s * 17, cut - 9, x + s * 22, cut - 2]; seg(p, 5.5, OL); seg(p, 3, (P.look && P.look.skin) || PL.skin || '#c8a288'); }
      g.restore();
    }
    waterline(x, cut, moving, deep);
  }
  let hideHeld = false;
  const _drawHeldN = drawHeld;
  drawHeld = function () { if (hideHeld) return; return _drawHeldN.apply(this, arguments); };
  const _drawPlayerN = drawPlayer;
  drawPlayer = function () {
    if (!P.swim || P.driving || P.sleeping || CS.hideP) return _drawPlayerN();
    hideHeld = P.swim === 'fundo';
    try { drawInWater(P.x, P.y, P.swim, P.moving, _drawPlayerN, P.walkT); } finally { hideHeld = false; }
    if (P.swim === 'fundo') { // fôlego em cima da cabeça
      const f = clamp(P.stam / maxSt(), 0, 1), cx = P.x + 24, cy = P.y - 14;
      g.save(); g.lineCap = 'round'; g.lineWidth = 4; g.strokeStyle = 'rgba(10,14,20,.6)'; g.beginPath(); g.arc(cx, cy, 9, 0, 6.283); g.stroke();
      g.strokeStyle = f < .3 ? (Math.sin(RT * 12) > 0 ? '#e05a5a' : '#8a2a2a') : '#8ac8e8'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 9, -1.57, -1.57 + f * 6.283); g.stroke();
      g.fillStyle = 'rgba(200,235,250,.85)'; for (const [bx, by, br] of [[-2, 2, 2.2], [2, -2, 1.5], [0, -5, 1]]) { g.beginPath(); g.arc(cx + bx, cy + by, br, 0, 6.283); g.fill(); }
      g.restore();
    }
  };
  // inimigos dentro do rio
  const _drawEnemyN = drawEnemy;
  drawEnemy = function (e) {
    const k = WADE[e.type] && swimAt(e.x, e.y);
    if (!k || e.state === 'burrow' || e.state === 'surface') return _drawEnemyN(e);
    const cut = e.y + Math.min(14, e.r * .55);
    g.save(); g.beginPath(); g.rect(e.x - 200, e.y - 300, 400, cut - (e.y - 300)); g.clip(); g.translate(0, 5); _drawEnemyN(e); g.restore();
    g.save(); g.fillStyle = 'rgba(30,60,74,.35)'; g.beginPath(); g.ellipse(e.x, cut + 6, e.r * .9, e.r * .4, 0, 0, 6.283); g.fill(); g.restore();
    waterline(e.x, cut, true, false);
  };
  // amigos no multijogador
  if (typeof DRAW2 !== 'undefined' && DRAW2.mp_av) {
    const _mpAvN = DRAW2.mp_av;
    DRAW2.mp_av = o => { const p = o.p, k = !p.down && swimAt(p.x, p.y); if (!k) return _mpAvN(o); drawInWater(p.x, p.y, k, Math.hypot(p.tx - p.x, p.ty - p.y) > 2, () => _mpAvN(o)); };
  }
})();
