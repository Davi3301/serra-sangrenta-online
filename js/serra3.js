'use strict';
/* ==========================================================================
   SERRA NATURAL E FENDAS NOVAS
   As serras entre o vale, o Planalto Gelado e a Mata Funda eram faixas retas
   (a borda antiga do vale). Agora a crista serpenteia, engrossa e afina, tem
   esporões e um sopé de pedra, e a linha da neve e da mata acompanha a crista.
   As passagens, prédios, estradas, rios e lugares do mapa continuam iguais.
   Também abre fendas novas no vale, no planalto e na mata.
   Tudo roda depois do mundo inteiro estar pronto: os objetos antigos mantêm o
   mesmo número e os saves continuam valendo. Se uma montanha nova cair em
   cima de algo que você construiu, o jogo abre o chão ao carregar.
   ========================================================================== */
(function () {
  const sm = t => t * t * (3 - 2 * t);

  // linha central e meia-largura de cada crista
  function ridges(S) {
    const E = new Float32Array(MH), EW = new Float32Array(MH), SC = new Float32Array(MW), SWd = new Float32Array(MW);
    const pf = (v, c, r) => sm(Math.min(1, Math.abs(v - c) / r)); // 0 no meio de uma passagem
    for (let y = 0; y < MH; y++) {
      const f = Math.min(pf(y, 140, 20), pf(y, 50, 18));
      const low = sm(Math.min(1, Math.max(0, (y - OH + 4) / 16))); // entre a mata e o planalto a linha ondula mais
      E[y] = OW - 3 + ((fbm(y * .022, 3.7, S + 901) - .5) * 60 + (fbm(y * .075, 1.3, S + 911) - .5) * 18 + Math.sin(y * .11 + 1) * 2.5 + low * ((fbm(y * .05, 9.9, S + 909) - .5) * 44 + Math.sin(y * .17) * 5)) * f;
      EW[y] = Math.max(2.2, 2 + (fbm(y * .09, 8.1, S + 902) - .3) * 16) * (.6 + .4 * f);
    }
    for (let x = 0; x < MW; x++) {
      const f = Math.min(pf(x, 110, 18), pf(x, 205, 18));
      SC[x] = OH - 4 + ((fbm(x * .022, 5.3, S + 903) - .5) * 52 + (fbm(x * .075, 4.4, S + 912) - .5) * 16 + Math.sin(x * .1 + 2) * 2.5) * f;
      SWd[x] = Math.max(2.2, 2 + (fbm(x * .09, 2.9, S + 904) - .3) * 16) * (.6 + .4 * f);
    }
    return { E, EW, SC, SWd };
  }

  function killNatural(list) { for (const o of list || []) if (!o.dead) { gridRemove(o); o.dead = true; o.gone = 1; } }

  function reshape(S) {
    const R = ridges(S); W.ridgeE = R.E; W.ridgeS = R.SC;
    const orig = W.r3m = new Uint8Array(MW * MH); // tile antigo + 1, onde virou montanha
    const prot = new Uint8Array(MW * MH), byTile = new Map();
    const inWin = (x, y) => Math.abs(x - OW) < 46 || Math.abs(y - OH) < 40;
    const mark = (cx, cy, r) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (x >= 0 && y >= 0 && x < MW && y < MH && Math.hypot(x + .5 - cx, y + .5 - cy) <= r) prot[y * MW + x] = 1; };
    for (const o of W.objs) {
      if (o.dead) continue; const tx = o.x / TILE, ty = o.y / TILE; if (!inWin(tx, ty)) continue;
      if (NATURAL[o.type]) { const k = Math.floor(ty) * MW + Math.floor(tx); if (!byTile.has(k)) byTile.set(k, []); byTile.get(k).push(o); }
      else mark(tx, ty, (o.r || 14) / TILE + 2);
    }
    for (const L of W.lairs) if (inWin(L.x / TILE, L.y / TILE)) mark(L.x / TILE, L.y / TILE, 3);
    for (const k in POIS) { const p = POIS[k]; if (inWin(p.x, p.y)) mark(p.x + .5, p.y + .5, (p.rad || 6) + 2); }

    const KEEP = new Set([T.ROAD, T.RAIL, T.CONC, T.SAND]), RIVER = new Set([T.WATER, T.DEEP, T.ICE, T.BRIDGE, T.ASH]);
    const valleyT = (x, y) => fbm(x * .045 + 50, y * .045 + 50, S + 3) > .47 ? T.FOREST : (fbm(x * .11, y * .11, S + 9) > .7 ? T.DIRT : T.GRASS);
    const planT = (x, y) => { const pk = fbm(x * .05 + 20, y * .05 + 40, S + 310); if (pk > .66) return T.MOUNT; if (pk > .6) return T.ROCK; return fbm(x * .06, y * .06, S + 330) > .52 ? T.FOREST : T.SNOW; };
    const mataT = (x, y) => { if (fbm(x * .09, y * .09, S + 340) > .68) return T.MUD; return fbm(x * .045 + 9, y * .045 + 3, S + 350) > .38 ? T.FOREST : (fbm(x * .11, y * .11, S + 360) > .72 ? T.DIRT : T.GRASS); };
    const base = W.tiles.slice();

    // desenha as cristas sobre o terreno original
    function apply() {
      W.tiles.set(base); orig.fill(0); const kills = [], flips = [], opened = [];
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        if (!inWin(x, y)) continue;
        const i = y * MW + x; if (prot[i] || W.clear[i] || W.bst[i]) continue;
        const t = base[i]; if (INDOOR[t] || RIVER.has(t)) continue; const keep = KEEP.has(t);
        if (Math.min(x, y, MW - 1 - x, MH - 1 - y) < 11) continue; // borda do mundo fica como está
        const jit = (fbm(x * .22, y * .22, S + 905) - .5) * 2.6, knob = fbm(x * .13, y * .13, S + 906) > .7 ? 3 : 0;
        // crista leste: fechada ao norte da crista sul; mais abaixo vira morros soltos entre a mata e o planalto
        const dE = Math.abs(x - R.E[y]), hE = y < R.SC[Math.min(x, MW - 1)] + 3 ? R.EW[y] : R.EW[y] - 3.4;
        const dS = x < R.E[y] + 3 ? Math.abs(y - R.SC[x]) : Infinity, hS = R.SWd[x];
        const inR = dE < hE + jit + (dE < hE + 4 ? knob : 0) || dS < hS + jit + (dS < hS + 4 ? knob : 0);
        const foot = !inR && (dE < Math.max(hE, 1) + 2.4 + jit || dS < hS + 2.4 + jit);
        const snowEdge = R.E[y] + (fbm(x * .05, y * .05, S + 908) - .5) * 30; // borda da neve recortada, com manchas dos dois lados
        const side = x >= snowEdge ? 'p' : y >= R.SC[x] ? 'm' : 'v', oldSide = x >= OW ? 'p' : y >= OH ? 'm' : 'v';
        if (inR) { if (t !== T.MOUNT && t !== T.CONC) { /* estradas e trilhos acabam na encosta */ orig[i] = t + 1; W.tiles[i] = T.MOUNT; kills.push(i); } continue; }
        if (keep) continue;
        const wasBand = t === T.MOUNT && oldSide === 'v' && Math.min(OW - 1 - x, OH - 1 - y) < 11;
        if (t === T.MOUNT && !wasBand && !(oldSide === 'p' && side !== 'p')) continue; // maciços que já existiam (os picos do planalto recuam junto com a neve)
        if (!wasBand && side === oldSide && !foot) continue;
        let nt = side === 'v' ? valleyT(x, y) : side === 'p' ? planT(x, y) : mataT(x, y);
        if (foot) { const r = fbm(x * .3, y * .3, S + 907); nt = r > .5 ? T.ROCK : side === 'p' ? T.SNOW : nt === T.FOREST && wasBand ? T.GRASS : nt; }
        else if (wasBand && nt === T.FOREST) nt = T.GRASS; // chão recém-aberto: sem a mata fechada
        if (side !== oldSide) flips.push([i, side]);
        if (nt === T.MOUNT && t !== T.MOUNT) { orig[i] = t + 1; kills.push(i); }
        if (nt !== t) { W.tiles[i] = nt; if (t === T.MOUNT) opened.push([x, y, nt, side]); }
      }
      return { kills, flips, opened };
    }
    // a serra tem que continuar fechada fora das passagens: procura um caminho a pé do vale para o outro lado
    const inPass = (x, y) => (x >= 286 && x <= 312 && ((y >= 135 && y <= 145) || (y >= 45 && y <= 55))) || (y >= 226 && y <= 251 && ((x >= 104 && x <= 116) || (x >= 199 && x <= 211)));
    const farSide = (x, y) => (y < R.SC[x] && x >= R.E[y] + R.EW[y] + 3) || (x < R.E[y] && y >= R.SC[x] + R.SWd[x] + 3) || x >= OW + 20 || y >= OH + 20;
    // caminho mais curto do acampamento até o outro lado da serra; devolve os pontos dele que passam pelo miolo da crista
    const leakPath = () => {
      const par = new Int32Array(MW * MH).fill(-1), s0 = 122 * MW + 26, q = new Int32Array(MW * MH); let h = 0, n = 0; q[n++] = s0; par[s0] = s0;
      while (h < n) {
        const i = q[h++], x = i % MW, y = (i / MW) | 0;
        if (farSide(x, y)) { const hits = []; for (let k = i; k !== s0; k = par[k]) { const kx = k % MW, ky = (k / MW) | 0; if (ky < OH + 4 && Math.abs(kx - R.E[ky]) <= R.EW[ky] + 3) hits.push(['E', ky]); else if (kx < MW && Math.abs(ky - R.SC[kx]) <= R.SWd[kx] + 3) hits.push(['S', kx]); } return hits.length ? hits : null; }
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || inPass(nx, ny)) continue; const j = ny * MW + nx; if (par[j] !== -1 || SOLID[W.tiles[j]]) continue; par[j] = i; q[n++] = j; }
      }
      return null;
    };
    const flatten = (arr, base0, k, n) => { for (let d = -11; d <= 11; d++) { const j = k + d; if (j >= 0 && j < n) arr[j] = base0 + (arr[j] - base0) * sm(Math.abs(d) / 12); } };
    let res = apply();
    for (let it = 0; it < 12; it++) {
      const hits = leakPath(); if (!hits) break;
      for (const [w, k] of hits) w === 'E' ? flatten(R.E, OW - 3, k, MH) : flatten(R.SC, OH - 4, k, MW);
      res = apply();
    }
    for (const i of res.kills) killNatural(byTile.get(i));
    for (const [i, side] of res.flips) for (const o of byTile.get(i) || []) if (o.type === 'tree') o.snow = side === 'p' ? 1 : 0;
    const opened = res.opened;
    // um pouco de vida no chão que era montanha
    const rng = mulberry32(S * 7 + 4242);
    for (const [x, y, t, side] of opened) {
      const r = rng(), jx = (x + .5 + (rng() - .5) * .6) * TILE, jy = (y + .5 + (rng() - .5) * .6) * TILE, s = .85 + rng() * .4;
      if (t === T.GRASS && r < .035) { const o = mkObj('tree', jx, jy, { k: rng() < .5 ? 1 : 3, s }); o.r = 9 * Math.min(s, 1.15); }
      else if (t === T.SNOW && r < .045) { const o = mkObj('tree', jx, jy, { k: 1, s, snow: 1 }); o.r = 9 * Math.min(s, 1.15); }
      else if (t === T.ROCK && r < .07) { const o = mkObj('rock', jx, jy, { s }); o.r = 15 * s; }
      else if ((t === T.GRASS || t === T.MUD) && r < .09) mkObj('grass', jx, jy);
      else if ((t === T.ROCK || t === T.DIRT) && r < .1) mkObj('stone', jx, jy);
    }
  }

  // fendas novas: 3 no vale, 3 no planalto, 3 na mata funda (o lugar exato se ajusta ao terreno)
  const NEW_F = [[75, 178], [178, 204], [262, 105], [322, 95], [380, 170], [346, 252], [190, 298], [272, 262], [128, 264]];
  function addFissures(S) {
    const rng = mulberry32(S * 11 + 777);
    const okAt = (cx, cy) => {
      for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) {
        if (Math.hypot(x - cx, y - cy) > 4) continue; if (x < 12 || y < 12 || x >= MW - 12 || y >= MH - 12) return false;
        const i = y * MW + x, t = W.tiles[i]; if (SOLID[t] || W.clear[i] || W.bst[i] || INDOOR[t] || t === T.ROAD || t === T.RAIL || t === T.BRIDGE || t === T.ICE) return false;
      }
      for (const k in POIS) { const p = POIS[k]; if (Math.hypot(p.x - cx, p.y - cy) < (p.rad || 6) + 8) return false; }
      for (const f of W.fissures) if (Math.hypot(f.x / TILE - cx, f.y / TILE - cy) < 22) return false;
      return true;
    };
    for (const [fx0, fy0] of NEW_F) {
      let spot = null;
      for (let r = 0; r <= 14 && !spot; r++) { const n = Math.max(1, r * 8); for (let k = 0; k < n && !spot; k++) { const a = k / n * 6.283, x = Math.round(fx0 + Math.cos(a) * r), y = Math.round(fy0 + Math.sin(a) * r); if (okAt(x, y)) spot = [x, y]; } }
      if (!spot) continue;
      const [fx, fy] = spot, fi = W.fissures.length;
      for (let y = fy - 4; y <= fy + 4; y++) for (let x = fx - 4; x <= fx + 4; x++) { const i = y * MW + x, t = W.tiles[i]; if (Math.hypot(x - fx, y - fy) < 2.8 + rng() * 1.4 && !SOLID[t] && !INDOOR[t]) { W.tiles[i] = T.ASH; W.clear[i] = 1; } }
      queryObjs((fx + .5) * TILE, (fy + .5) * TILE, 5 * TILE, o => { if (!o.dead && NATURAL[o.type] && W.tiles[Math.floor(o.y / TILE) * MW + Math.floor(o.x / TILE)] === T.ASH) killNatural([o]); });
      W.fissures.push(mkObj('fissure', (fx + .5) * TILE, (fy + .5) * TILE, { fi }));
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28 + rng(), d = (2.2 + rng() * 1.6) * TILE, sx = (fx + .5) * TILE + Math.cos(a) * d, sy = (fy + .5) * TILE + Math.sin(a) * d; if (!solidAt(sx, sy)) mkObj('sulfur', sx, sy); }
      W.lairs.push({ x: (fx + 2.5) * TILE, y: (fy + 2.5) * TILE, mobs: [['rasteira', 1]], i: W.lairs.length, r: 20, fis: fi });
    }
  }

  const _genWorldS = genWorld;
  genWorld = function (seed) {
    _genWorldS(seed);
    try { reshape(seed); addFissures(seed); } catch (e) { console.error('serra3', e); }
    buildMinimap(); if (typeof chunks !== 'undefined') chunks.clear();
  };

  // saves antigos: se a crista nova caiu em cima de algo seu, abre o chão em volta
  const _loadGameS = loadGame;
  loadGame = function (slot) {
    const ok = _loadGameS(slot);
    if (ok && W.r3m) {
      const free = (px, py, r) => { const cx = px / TILE, cy = py / TILE; for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { if (x < 0 || y < 0 || x >= MW || y >= MH) continue; const i = y * MW + x; if (W.r3m[i] && W.tiles[i] === T.MOUNT) { setTile(x, y, W.r3m[i] - 1); W.r3m[i] = 0; } } };
      for (const o of G.placed || []) free(o.x, o.y, 2.5);
      for (const k in G.builds || {}) { const [tx, ty] = k.split(',').map(Number); free((tx + .5) * TILE, (ty + .5) * TILE, 2.5); }
      free(P.x, P.y, 2.5); if (G.car) free(G.car.x, G.car.y, 3.5); if (P.bed) free(P.bed.x, P.bed.y, 2.5);
    }
    return ok;
  };
})();
