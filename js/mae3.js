'use strict';
/* ==========================================================================
   A GRANDE MÃE — desenho novo, no mesmo traço das outras criaturas
   Cores chapadas da paleta de carne (FL, FD, FH2), osso (BN), contorno escuro
   (OL) de 2.5 e os mesmos olhos e dentes dos outros bichos. Ela continua
   sendo um monte de carne com veias no chão, tentáculos, espinhos de osso,
   bolsas de ovos e uma boca de mandíbulas; na fase 2 racha e perde tentáculos.
   ========================================================================== */
(function () {
  // geometria fixa (veias do chão, pústulas, rachaduras)
  function geo(e) {
    if (e._mg) return e._mg;
    let s = 90211; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const veins = [];
    for (let i = 0; i < 12; i++) {
      const pts = []; let ang = i / 12 * 6.283 + rnd() * .3, d = .9;
      for (let j = 0; j < 6; j++) { pts.push(Math.cos(ang) * d, Math.sin(ang) * d * .64 + .12); ang += (rnd() - .5) * .45; d += .15 + rnd() * .08; }
      veins.push({ pts, ph: rnd() });
    }
    const pust = []; for (let i = 0; i < 8; i++) { const a = rnd() * 6.283, d = .5 + rnd() * .38; pust.push([Math.cos(a) * d, Math.sin(a) * d * .78 - .12, .04 + rnd() * .03]); }
    const cracks = []; for (let i = 0; i < 4; i++) { let x = (rnd() - .5) * 1.1, y = (rnd() - .5) * .7 - .2; const p = [x, y]; for (let k = 0; k < 4; k++) { x += (rnd() - .5) * .3; y += (rnd() - .5) * .22; p.push(x, y); } cracks.push(p); }
    return (e._mg = { veins, pust, cracks });
  }

  // corpo com contorno levemente irregular que respira
  function bodyPath(R, br, t) {
    g.beginPath();
    for (let i = 0; i <= 32; i++) {
      const a = i / 32 * 6.283, w = 1 + Math.sin(a * 5 + t * 1.2) * .025 + Math.sin(a * 3 - t * .8) * .02;
      const x = Math.cos(a) * R * w * br, y = -R * .1 + Math.sin(a) * R * .86 * w * br;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
  }

  // tentáculo: contorno grosso + carne, afinando até a ponta (igual ao traço dos outros bichos)
  function tentacle(i, n, R, raise, p2, F, T) {
    const base = -1.57 + (i + .5) / n * 6.283 + Math.sin(i * 7.3) * .12;
    const cut = p2 && (i === 2 || i === 6), N = cut ? 3 : 8, len = R * (1.6 + Math.sin(i * 3.1) * .15) * (1 - raise * .35);
    const pts = []; let ang = base, x = Math.cos(base) * R * .75, y = -R * .1 + Math.sin(base) * R * .6;
    pts.push(x, y);
    for (let j = 1; j <= N; j++) {
      const k = j / 8; ang += Math.sin(T * 1.5 + i * 1.9 - j * .6) * .22 * (k + .25);
      x += Math.cos(ang) * len / 8; y += Math.sin(ang) * len / 8 * .7 - raise * R * .08 * k;
      pts.push(x, y);
    }
    const col = F(i % 2 ? FL : FD), sc = R / 50;
    for (let j = 2; j < pts.length; j += 2) { const w = (12 - j / 2 * 1.1) * sc; seg([pts[j - 2], pts[j - 1], pts[j], pts[j + 1]], w + 5, OL); }
    for (let j = 2; j < pts.length; j += 2) { const w = (12 - j / 2 * 1.1) * sc; seg([pts[j - 2], pts[j - 1], pts[j], pts[j + 1]], w, col); }
    // faixas claras de ventosa, como nas listras dos outros bichos
    g.lineWidth = 1.5; for (let j = 4; j < pts.length - 2; j += 4) circ(pts[j], pts[j + 1], 2.2 * sc, F(FH2));
    const ex = pts[pts.length - 2], ey = pts[pts.length - 1], da = Math.atan2(ey - pts[pts.length - 3], ex - pts[pts.length - 4]);
    g.lineWidth = 2.5;
    if (cut) { circ(ex, ey, 5 * sc, '#2a0a10', OL); circ(ex, ey, 2.5 * sc, F(FH2)); if (Math.random() < .06) G.parts.push({ x: G._maeX + ex, y: G._maeY + ey, vx: rand(-15, 15), vy: rand(10, 40), life: .7, max: .7, c: FD, s: 3 }); }
    else { const c = Math.cos(da), s = Math.sin(da); poly([ex - s * 3, ey + c * 3, ex + c * 10, ey + s * 10, ex + s * 3, ey - c * 3], F(BN), OL); }
  }

  // espinho de osso: triângulo curvo chapado
  function spine(bx, by, tx, ty, w, F) {
    const dx = tx - bx, dy = ty - by, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, mx = (bx + tx) / 2 + nx * l * .12, my = (by + ty) / 2 + ny * l * .12;
    g.beginPath(); g.moveTo(bx - nx * w, by - ny * w); g.quadraticCurveTo(mx - nx * w * .5, my - ny * w * .5, tx, ty); g.quadraticCurveTo(mx + nx * w * .5, my + ny * w * .5, bx + nx * w, by + ny * w); g.closePath();
    g.fillStyle = F(BN); g.fill(); g.strokeStyle = OL; g.stroke();
    g.lineWidth = 1.5; g.strokeStyle = BND; g.beginPath(); g.moveTo(bx + nx * w * .3, by + ny * w * .3); g.quadraticCurveTo(mx + nx * w * .2, my + ny * w * .2, (mx + tx) / 2, (my + ty) / 2); g.stroke(); g.lineWidth = 2.5;
  }

  function drawMae(e) {
    const x = e.x, y = e.y, R = e.r, fl = e.flash > 0, T = RT, p2 = e.hp < e.maxhp * .5, M = geo(e);
    const F = c => fl ? '#f0e8e0' : c, fx = Math.cos(e.ang), fy = Math.sin(e.ang);
    let sc = 1; if (e.state === 'emerge') sc = clamp(1 - e.t / .8, .05, 1); if (e.state === 'leave') sc = clamp(e.t / .9, .05, 1);
    const slamK = e.slam ? clamp(1 - e.slam.t / 1.05, 0, 1) : 0, wind = e.state === 'wind' ? clamp(1 - e.t / .7, 0, 1) : 0;
    const beat = (Math.sin(T * (p2 ? 4 : 2.5)) + 1) / 2, br = 1 + beat * .03 + slamK * .06;
    G._maeX = x; G._maeY = y;

    // aviso do golpe (o mesmo anel de antes)
    if (e.slam) { g.strokeStyle = 'rgba(220,60,110,.8)'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, e.slam.r, 0, 6.3); g.stroke(); circ(x, y, e.slam.r * slamK, 'rgba(220,60,110,.2)'); }
    if (e.state === 'emerge') ell(x, y + R * .5, R * 1.5, R * .7, '#2a2024');

    g.save(); g.translate(x, y); g.scale(sc, sc); g.lineCap = 'round'; g.lineJoin = 'round';
    // chão: mancha de carne e veias que pulsam
    ell(0, R * .2, R * 2, R * 1.2, 'rgba(74,20,30,.45)');
    for (const v of M.veins) {
      const p = v.pts.map(q => q * R); seg(p, 4.5, 'rgba(20,16,24,.55)'); seg(p, 2.2, FD);
      const k = (T * (p2 ? .8 : .5) + v.ph) % 1, j = Math.floor(k * (p.length / 2 - 1)) * 2; circ(p[j], p[j + 1], 2.6, p2 ? FH2 : FL);
    }
    shadow(0, R * .55, R * 1.2, R * .45);

    if (wind) g.translate(Math.sin(T * 47) * 1.5 * wind, 0);
    g.translate(0, -slamK * 10 - beat * 1.5);
    g.lineWidth = 2.5;

    // tentáculos saindo de baixo do corpo
    const nT = 10; for (let i = 0; i < nT; i++) tentacle(i, nT, R, slamK, p2, F, T);

    // espinhos de osso nas costas
    const HL = [.75, 1, .65, 1.1, .9, .7, .95];
    for (let i = 0; i < 7; i++) {
      const a = -2.72 + i * .36, bx = Math.cos(a) * R * .85 * br, by = -R * .1 + Math.sin(a) * R * .72 * br, ox = Math.cos(a), h = HL[i] * R * .7;
      spine(bx, by, bx + ox * h * .55, by - h * .75 - slamK * 8, R * .1, F);
    }

    // corpo: carne chapada, mancha clara em cima, sombra embaixo e dobras
    bodyPath(R, br, T); g.fillStyle = F(FL); g.fill(); g.strokeStyle = OL; g.lineWidth = 2.5; g.stroke();
    g.save(); bodyPath(R, br, T); g.clip();
    ell(R * .3, R * .45, R * .75, R * .4, F(FD));
    ell(-R * .35, -R * .5, R * .45, R * .28, F(FH2));
    g.strokeStyle = F(FD); g.lineWidth = 2;
    for (const [x0, y0, x1, y1, x2, y2] of [[-.85, -.05, -.45, .25, -.1, .05], [.15, -.85, .45, -.5, .9, -.35], [.4, .1, .7, .3, .95, .05], [-.95, .3, -.6, .55, -.3, .5]]) { g.beginPath(); g.moveTo(x0 * R, y0 * R); g.quadraticCurveTo(x1 * R, y1 * R, x2 * R, y2 * R); g.stroke(); }
    // rachaduras da fase 2
    if (p2 && !fl) { const c2 = beat > .5 ? '#e8705a' : '#c84a42'; for (const c of M.cracks) { seg(c.map(q => q * R), 4, '#2a0a10'); seg(c.map(q => q * R), 1.8, c2); } }
    g.restore();
    g.lineWidth = 1.8; for (const [px, py, pr] of M.pust) { if (Math.abs(px) < .5 && py > -.5 && py < .6) continue; circ(px * R, py * R, pr * R, F(FH2), OL); }

    // bolsas de ovos: bolhas claras com a cria escura dentro
    for (const [sx, sy, sr, i] of [[-.7, -.3, .22, 0], [.7, -.34, .2, 1], [-.34, -.72, .15, 2], [.38, -.74, .14, 3]]) {
      const p = 1 + Math.sin(T * 2.5 + i * 1.7) * .08 + (p2 ? .05 : 0), X = sx * R, Y = sy * R, rx = sr * R * p, ry = rx * .82;
      g.lineWidth = 2.5; ell(X, Y, rx, ry, F('#d88a72'), OL);
      if (!fl) { const ca = T * .7 + i * 1.3; ell(X + Math.cos(ca) * rx * .12, Y + Math.sin(ca) * ry * .1, rx * .5, ry * .38, FD, null, ca * .3); circ(X - rx * .4, Y - ry * .4, rx * .16, '#f0c8a8'); }
    }

    // olhos (o mesmo olho dos outros bichos), piscando de vez em quando
    const ox = fx * R * .06, oy = fy * R * .04;
    g.lineWidth = 2;
    for (const [ex, ey, er, i] of [[-.3, -.24, .13, 0], [.3, -.26, .13, 1], [0, -.46, .15, 2], [-.56, -.02, .08, 3], [.56, -.04, .08, 4], [-.18, -.64, .065, 5], [.2, -.66, .065, 6], [-.12, -.07, .05, 7], [.13, -.09, .05, 8]]) {
      const X = ex * R + ox, Y = ey * R + oy, r2 = er * R;
      if (Math.sin(T * .9 + i * 2.3) > .97) { ell(X, Y, r2, r2 * .25, F(FD), OL); continue; }
      circ(X, Y, r2, F('#d8d0c0'), OL); circ(X + fx * r2 * .35, Y + fy * r2 * .35, r2 * .5, '#1a0a10');
      if (r2 > 5) circ(X + fx * r2 * .35 + r2 * .15, Y + fy * r2 * .35 - r2 * .15, r2 * .15, '#e04a4a');
    }

    // boca com dentes e o ácido acendendo antes do cuspe
    const mx = ox, my = R * .34 + oy, mo = clamp(.3 + Math.sin(T * 3) * .08 + wind * .7 + slamK * .3 + (e.state === 'emerge' ? .5 : 0), 0, 1);
    const mrx = R * .4 * (.7 + .3 * mo), mry = R * .24 * (.5 + .5 * mo);
    g.lineWidth = 2.5; ell(mx, my, mrx, mry, '#1a0408', OL);
    g.fillStyle = BN; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, c = Math.cos(a), s = Math.sin(a); g.beginPath(); g.moveTo(mx + Math.cos(a - .2) * mrx, my + Math.sin(a - .2) * mry); g.lineTo(mx + c * mrx * .55, my + s * mry * .55); g.lineTo(mx + Math.cos(a + .2) * mrx, my + Math.sin(a + .2) * mry); g.fill(); }
    if (!fl) { ell(mx, my, mrx * .3, mry * .35, `rgba(150,180,70,${.35 + wind * .55})`); if (wind > .2 && Math.random() < .25) G.parts.push({ x: x + mx + rand(-mrx * .4, mrx * .4), y: y + my + mry * .5, vx: rand(-10, 10), vy: rand(30, 70), life: .5, max: .5, c: '#86963a', s: 3 }); }
    // mandíbulas: ganchos de carne com ponta de osso nos cantos da boca
    for (const s of [-1, 1]) {
      const open = .25 + mo * .75, bx = mx + s * mrx * .8, by = my + mry * .2, tx = mx + s * mrx * (.25 + open * .6), ty = my + mry + R * .3;
      const kx = mx + s * mrx * (1.3 + open * .25), ky = my + mry + R * .05;
      seg([bx, by, kx, ky, tx, ty], 10 * R / 50, OL); seg([bx, by, kx, ky, tx, ty], 5.5 * R / 50, F(FD));
      const da = Math.atan2(ty - ky, tx - kx), c = Math.cos(da), sn = Math.sin(da); poly([tx - sn * 3, ty + c * 3, tx + c * 8, ty + sn * 8, tx + sn * 3, ty - c * 3], F(BN), OL);
    }
    g.restore();

    if (p2 && Math.random() < .2) { const a = rand(0, 6.283); G.parts.push({ x: x + Math.cos(a) * R * .9, y: y + Math.sin(a) * R * .7, vx: rand(-10, 10), vy: rand(20, 60), life: .7, max: .7, c: FD, s: 3 }); }
    if (e.state === 'emerge' && Math.random() < .5) { const a = rand(0, 6.283); G.parts.push({ x: x + Math.cos(a) * R, y: y + Math.sin(a) * R * .6, vx: Math.cos(a) * rand(60, 160), vy: Math.sin(a) * rand(40, 100) - 60, life: .8, max: .8, c: '#3a2e2a', s: 4 }); }
  }

  const _drawEnemyMae = drawEnemy;
  drawEnemy = function (e) { if (e.type !== 'mae' || e.state === 'burrow' || e.state === 'surface') return _drawEnemyMae(e); drawMae(e); };
})();
