'use strict';
/* ==========================================================================
   SERRA SANGRENTA 3.0 · O MUNDO ALÉM DA SERRA
   Planalto Gelado (leste, x >= 300) e Mata Funda (sul, y >= 240).
   O vale antigo é gerado exatamente como antes; tudo daqui entra depois,
   para os saves antigos continuarem valendo.
   ========================================================================== */
Object.assign(TCOL, { 21: [[226, 232, 238], [204, 214, 224]], 22: [[168, 200, 220], [146, 182, 206]], 23: [[66, 60, 64], [52, 46, 50]] });
Object.assign(TPRIO, { 21: 5.5, 22: .5, 23: 3.8 }); PRIO_LEVELS.push(.5, 3.8, 5.5); PRIO_LEVELS.sort((a, b) => a - b);
const inPlanalto = (x, y) => x >= (W.ridgeE ? W.ridgeE[clamp(Math.floor(y / TILE), 0, MH - 1)] : OW) * TILE; // a linha segue a crista da serra (serra3.js)
const inMataFunda = (x, y) => !inPlanalto(x, y) && y >= (W.ridgeS ? W.ridgeS[clamp(Math.floor(x / TILE), 0, MW - 1)] : OH) * TILE;

// terreno de cada bloco além da serra (chamado pelo genWorld)
function tile3(x, y, S) {
  const e = Math.min(MW - 1 - x, MH - 1 - y, x, y), n = fbm(x * .07, y * .07, S + 300);
  if (e < 4 + n * 6) return T.MOUNT;
  if (x >= OW) { // planalto gelado
    const pk = fbm(x * .05 + 20, y * .05 + 40, S + 310); if (pk > .66) return T.MOUNT; if (pk > .6) return T.ROCK;
    const lk = Math.hypot((x - 366) / 13, (y - 226) / 10) + (fbm(x * .2, y * .2, S + 320) - .5) * .4; if (lk < 1) return T.ICE;
    return fbm(x * .06, y * .06, S + 330) > .52 ? T.FOREST : T.SNOW;
  }
  // mata funda: bem mais fechada que o vale
  const m = fbm(x * .09, y * .09, S + 340); if (m > .68) return T.MUD;
  return fbm(x * .045 + 9, y * .045 + 3, S + 350) > .38 ? T.FOREST : (fbm(x * .11, y * .11, S + 360) > .72 ? T.DIRT : T.GRASS);
}

const POIS3 = {
  passagem_leste: { x: 302, y: 140, n: 'Passagem do Leste', ic: 'm_crater', rad: 6 },
  trilha_sul: { x: 110, y: 242, n: 'Trilha do Sul', ic: 'm_crater', rad: 6 },
  esqui: { x: 345, y: 44, n: 'Estação de Esqui Pico Branco', ic: 'cama', rad: 10 },
  vilapico: { x: 350, y: 133, n: 'Vila do Pico', ic: 'u_house', rad: 12 },
  antena: { x: 384, y: 98, n: 'Antena da Serra', ic: 'm_tower', rad: 6 },
  lagogelo: { x: 366, y: 226, n: 'Lago Congelado', ic: 'm_lake', rad: 12 },
  mosteiro: { x: 330, y: 288, n: 'Mosteiro das Neves', ic: 'm_church', rad: 9 },
  aldeia: { x: 150, y: 284, n: 'Aldeia dos Selvagens', ic: 'u_skull', rad: 12 },
  cavernas: { x: 63, y: 258, n: 'Cavernas do Eco', ic: 'crystal', rad: 8 },
  aviao: { x: 250, y: 285, n: 'Avião Caído', ic: 'm_plane', rad: 10 },
  cacadores: { x: 214, y: 262, n: 'Acampamento dos Caçadores', ic: 'rifle', rad: 7 },
  garimpo: { x: 106, y: 300, n: 'Ruínas do Garimpo', ic: 'picareta_ferro', rad: 8 },
};
const OBJ3 = { oca: { r: 24, solid: 1 }, efigie_s: { r: 10, solid: 1 }, aviao: { r: 40, solid: 1 }, asa: { r: 30, solid: 1 }, mala: { r: 10 }, efigie: { r: 12, solid: 1 }, efigie_ressonante: { r: 16, solid: 1 }, armadilha_laco: { r: 14 }, armadilha_tronco: { r: 18 }, tambor_fogo: { r: 13, solid: 1 } };
Object.assign(OBJ, OBJ3);

function genRegion3(H) {
  Object.assign(POIS, POIS3); Object.assign(OBJ, OBJ3);
  Object.assign(BKIND, { chale: { wall: 'log', wc: '#7a5232', floor: 'planks', fc: '#7a5a3a', roof: 'tile', rc: '#e4eaf0', furn: ['cama_m', 'mesa', 'sofa', 'tapete', 'fogao', 'cama_m'] } });
  Object.assign(LOOT_KIND, { chale: 'chale', antena: 'galpao', pesca: 'cabana', mosteiro: 'igreja', garimpo: 'galpao', cacador: 'cabana' });
  Object.assign(BSIGN, { '338,37': 'PICO BRANCO', '322,281': 'MOSTEIRO DAS NEVES', '380,99': 'ANTENA DA SERRA' });
  const { set, get, building, lair, clearing, road, S } = H, rng = mulberry32(S * 13 + 3003), base = W.objs.length;
  const carve = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { set(x, y, t); W.clear[y * MW + x] = 1; } };
  const disc = (cx, cy, r, t, only) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (Math.hypot(x - cx, y - cy) <= r && (!only || only(get(x, y)))) { set(x, y, t); W.clear[y * MW + x] = 1; } };
  const clean = (x0, y0, x1, y1) => { for (let i = 0; i < base; i++) { const o = W.objs[i]; if (o.dead || !NATURAL[o.type]) continue; const tx = o.x / TILE, ty = o.y / TILE; if (tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1) { gridRemove(o); o.dead = true; o.gone = 1; } } };

  // --- passagens abertas na serra pelo Tremor
  carve(290, 139, 307, 141, T.DIRT); clean(288, 136, 309, 144); road([[236, 141], [289, 140]], 1, T.DIRT); road([[307, 140], [336, 136]], 1, T.DIRT);
  carve(289, 49, 307, 51, T.DIRT); road([[278, 37], [288, 50]], 1, T.DIRT); road([[307, 50], [338, 46]], 1, T.DIRT);
  carve(109, 230, 111, 247, T.DIRT); clean(106, 228, 114, 249); road([[110, 160], [110, 229]], 1, T.DIRT); road([[110, 247], [130, 270], [146, 280]], 1, T.DIRT);
  carve(204, 230, 206, 247, T.DIRT); road([[197, 222], [205, 229]], 1, T.DIRT); road([[205, 247], [214, 260]], 1, T.DIRT);

  // --- Planalto Gelado
  // estação de esqui
  disc(345, 46, 11, T.SNOW); building(338, 37, 14, 8, 's', [['chale', [['machado_gelo', 1]], N3 + 2], ['chale'], ['chale', [['lanterna', 1]]], ['chale'], ['chale']]);
  building(330, 49, 6, 5, 's', [['chale'], ['chale']]); building(354, 49, 6, 5, 's', [['chale', [['gorro', 1]]], ['chale']]);
  for (let k = 0; k < 6; k++) mkObj('poste', 347 * TILE, (34 - k * 5) * TILE);
  lair(345, 52, [['uivador', 2]], { r: 160, night: 1 });
  // vila do pico
  disc(350, 133, 12, T.SNOW); road([[336, 136], [364, 134]], 2, T.ROAD);
  building(337, 125, 7, 6, 's', [['chale'], ['chale']]); building(347, 124, 7, 6, 's', [['chale'], ['casa']]); building(357, 125, 7, 6, 's', [['chale'], ['chale']]);
  building(340, 139, 7, 6, 'n', [['chale'], ['chale']]); building(355, 139, 7, 6, 'n', [['chale', [['chocolate', 3]]], ['chale']]);
  W.npcs.ramires = mkObj('npc', 350.5 * TILE, 133.6 * TILE, { npc: 'ramires' }); mkObj('fogueira', 352.6 * TILE, 133.4 * TILE, { fixed: 1 }); mkObj('well', 347 * TILE, 133.5 * TILE);
  lair(350, 120, [['uivador', 2]], { r: 180, night: 1 }); lair(362, 145, [['hospedeiro', 3]], { r: 120 });
  // antena
  disc(384, 98, 6, T.ROCK); building(380, 99, 6, 5, 's', [['antena', [['peca_radio', 1]]], ['antena']]); mkObj('tower', 386.5 * TILE, 96 * TILE);
  lair(384, 104, [['uivador', 3]], { r: 140 });
  // lago congelado
  building(377, 214, 6, 4, 's', [['pesca', [['vara', 1]]], ['pesca']]); lair(366, 226, [['uivador', 2], ['cervo_oco', 1]], { r: 260, night: 1 });
  // mosteiro
  disc(330, 288, 12, T.SNOW); building(322, 281, 13, 10, 's', [['mosteiro', null, N3 + 3], ['mosteiro'], ['mosteiro'], ['mosteiro', [['calmante', 2]]], ['costura'], ['mosteiro']]);
  for (let y = 293; y <= 299; y += 2) for (let x = 320; x <= 328; x += 2) mkObj('grave', (x + .5) * TILE, (y + .5) * TILE, { k: Math.floor(rng() * 3) });
  lair(330, 296, [['colhedor', 1]], { night: 1, r: 60 }); lair(338, 286, [['uivador', 2]], { r: 160 });

  // --- Mata Funda
  // aldeia dos selvagens
  disc(150, 284, 13, T.DIRT, t => t !== T.WATER && t !== T.DEEP);
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + .3, R = 8.5; mkObj('oca', (150 + Math.cos(a) * R) * TILE, (284 + Math.sin(a) * R * .8) * TILE, { v: rng() }); }
  mkObj('fogueira', 150 * TILE, 284 * TILE, { fixed: 1 }); for (const [x, y] of [[143, 271], [157, 271], [137, 284], [163, 284], [150, 296]]) mkObj('efigie_s', x * TILE, y * TILE, { v: rng() });
  mkObj('crate', 152.6 * TILE, 280 * TILE, { loot: 'aldeia', extra: [['diario_ramires', 1]], note: N3 + 1 }); mkObj('crate', 146 * TILE, 289 * TILE, { loot: 'aldeia', extra: [['cadernos_aldeia', 1]] }); mkObj('crate', 156 * TILE, 290 * TILE, { loot: 'aldeia' });
  lair(150, 284, [['selvagem', 4], ['xama', 1]], { r: 200 }); lair(140, 272, [['selvagem', 3]], { r: 160 }); lair(162, 296, [['selvagem', 3]], { r: 160, night: 1 });
  // cavernas do eco: um maciço de pedra com túneis e salões por dentro
  const CV = [[63, 258, 4], [50, 268, 5], [77, 268, 5], [62, 282, 7], [84, 292, 5], [44, 292, 5], [64, 298, 4]];
  for (let y = 248; y <= 312; y++) for (let x = 28; x <= 100; x++) { const d = Math.hypot((x - 64) / 34, (y - 279) / 29) + (fbm(x * .12, y * .12, S + 370) - .5) * .35; if (d < 1) set(x, y, T.MOUNT); }
  clean(34, 252, 96, 306);
  const tunnel = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) * 2; for (let s = 0; s <= L; s++) { const k = s / L, x = a[0] + (b[0] - a[0]) * k + Math.sin(k * 9 + a[0]) * 2, y = a[1] + (b[1] - a[1]) * k + Math.cos(k * 7 + a[1]) * 2; disc(Math.round(x), Math.round(y), 2, T.CAVE); } };
  for (const [x, y, r] of CV) disc(x, y, r, T.CAVE); for (let i = 0; i < CV.length - 1; i++) tunnel(CV[i], CV[i + 1]); tunnel(CV[1], CV[5]); tunnel(CV[2], CV[4]);
  carve(62, 249, 64, 255, T.CAVE); road([[110, 247], [90, 246], [66, 248]], 1, T.DIRT);
  for (const [x, y, r] of CV) for (let k = 0; k < r; k++) { const a = rng() * 6.283, d = rng() * (r - 1) * TILE, px = (x + .5) * TILE + Math.cos(a) * d, py = (y + .5) * TILE + Math.sin(a) * d; if (tileAtPx(px, py) === T.CAVE) mkObj(['crystal', 'iron', 'coal', 'mushroom', 'crystal'][k % 5], px, py); }
  mkObj('crate', 51 * TILE, 270 * TILE, { loot: 'caverna', note: N3 + 5 }); mkObj('crate', 85 * TILE, 293 * TILE, { loot: 'caverna' }); mkObj('crate', 45 * TILE, 293 * TILE, { loot: 'caverna', extra: [['kit', 1]] }); mkObj('crate', 65 * TILE, 299 * TILE, { loot: 'caverna' });
  lair(77, 268, [['tecelao', 2]], { r: 120 }); lair(50, 268, [['tecelao', 1], ['verme', 2]], { r: 120 }); lair(84, 292, [['tecelao', 2], ['rastejante', 2]], { r: 120 }); lair(62, 283, [['milbracos', 1]], { r: 40 }); lair(44, 292, [['larva', 4], ['verme', 1]], { r: 100 });
  // avião caído
  disc(250, 285, 10, T.DIRT, t => t !== T.WATER && t !== T.DEEP); clean(238, 274, 262, 296);
  for (let k = 0; k < 18; k++) { const a = rng() * 6.283, d = rng() * 9; set(Math.round(250 + Math.cos(a) * d), Math.round(285 + Math.sin(a) * d * .7), T.ROCK); }
  mkObj('aviao', 250 * TILE, 285 * TILE, { rot: -.42, loot: 'mala', note: N3 }); mkObj('asa', 241 * TILE, 281 * TILE, { rot: .9 }); mkObj('asa', 259 * TILE, 290.5 * TILE, { rot: -.2 });
  for (const [x, y] of [[244, 289], [255, 279], [247, 278], [258, 285], [238, 287], [252, 293]]) mkObj('mala', x * TILE, y * TILE, { loot: 'mala', v: rng() });
  lair(250, 288, [['hospedeiro', 4]], { r: 150 }); lair(254, 280, [['pernalta', 1]], { r: 80, night: 1 });
  // acampamento dos caçadores
  disc(214, 262, 6, T.DIRT); for (const [x, y] of [[210, 259], [218, 259], [212, 266]]) mkObj('barraca', x * TILE, y * TILE);
  mkObj('fogueira', 215 * TILE, 263 * TILE, { fixed: 1 }); mkObj('crate', 219 * TILE, 265 * TILE, { loot: 'cacador', extra: [['manual_cacador', 1], ['arco_caca', 1], ['flecha', 10]], note: N3 + 4 }); mkObj('crate', 208.5 * TILE, 263 * TILE, { loot: 'cacador' });
  lair(214, 268, [['cao', 3]], { r: 160 });
  // ruínas do garimpo
  disc(106, 300, 8, T.ROCK); building(102, 296, 7, 5, 's', [['garimpo'], ['garimpo', [['picareta_ferro', 1]]]]);
  for (let k = 0; k < 10; k++) { const a = rng() * 6.283, d = (3 + rng() * 4) * TILE; mkObj(k % 3 ? 'iron' : 'coal', (106 + .5) * TILE + Math.cos(a) * d, (300 + .5) * TILE + Math.sin(a) * d); }
  lair(106, 304, [['pernalta', 1]], { r: 60, night: 1 }); lair(100, 300, [['escavador', 2]], { r: 120 });
  // espalhados pela mata funda, à noite
  for (const [x, y] of [[40, 250], [190, 300], [280, 255], [120, 270], [70, 312], [260, 250]]) lair(x, y, [['pernalta', 1]], { r: 120, night: 1 });
  for (const [x, y] of [[30, 260], [180, 250], [235, 300], [290, 310], [100, 255]]) lair(x, y, [['selvagem', 2]], { r: 180 });

  // --- casas espalhadas (3.0): sítios, cabanas e chalés perdidos no mato, alguns ainda ocupados
  {
    const OKT = [T.GRASS, T.FOREST, T.DIRT, T.SNOW], spots = [], pois = Object.values(POIS);
    const fits = (x, y, w, h) => {
      if (x < 4 || y < 4 || x + w > MW - 4 || y + h > MH - 4) return false;
      for (let j = -2; j <= h + 2; j++) for (let i = -2; i <= w + 2; i++) { const xx = x + i, yy = y + j, t = get(xx, yy); if (!OKT.includes(t) || W.clear[yy * MW + xx]) return false; }
      const cx = x + w / 2, cy = y + h / 2; if (Math.hypot(cx - CAR_START[0], cy - CAR_START[1]) < 30) return false;
      for (const p of pois) if (Math.hypot(cx - p.x, cy - p.y) < (p.rad || 6) + 14) return false;
      for (const s of spots) if (Math.hypot(cx - s[0], cy - s[1]) < 26) return false;
      return true;
    };
    const ZONES = [ // [x0, y0, x1, y1, quantas, tipos]
      [6, 6, OW - 8, OH - 8, 9, ['casa', 'casa', 'cabana', 'fazenda', 'garagem']],
      [OW + 4, 6, MW - 6, MH - 8, 8, ['chale', 'chale', 'cabana', 'casa']],
      [6, OH + 2, OW - 6, MH - 6, 8, ['cabana', 'cabana', 'casa', 'fazenda']],
    ];
    for (const [x0, y0, x1, y1, want, kinds] of ZONES) {
      let made = 0;
      for (let tries = 0; tries < 900 && made < want; tries++) {
        const w = 6 + Math.floor(rng() * 3), h = 5 + Math.floor(rng() * 2), x = x0 + Math.floor(rng() * (x1 - x0 - w)), y = y0 + Math.floor(rng() * (y1 - y0 - h));
        if (!fits(x, y, w, h)) continue;
        const kd = kinds[Math.floor(rng() * kinds.length)], door = rng() < .7 ? 's' : 'n', n = 2 + Math.floor(rng() * 2), conts = [];
        for (let k = 0; k < n; k++) conts.push([k === 2 && kd !== 'chale' ? 'garagem' : kd]);
        if (rng() < .3) conts[0][1] = [[['municao9', 8], ['bandagem', 2], ['feijao', 3], ['corda', 2], ['lanterna', 1]][Math.floor(rng() * 5)]].map(a => [a[0], a[1]]);
        clean(x - 3, y - 3, x + w + 3, y + h + 3); building(x, y, w, h, door, conts);
        const dy = door === 's' ? y + h + 1 : y - 2; disc(x + Math.floor(w / 2), dy, 1, kd === 'chale' ? T.SNOW : T.DIRT);
        const r = rng();
        if (r < .3) mkObj('car', (x + w + 1.6) * TILE, (y + h * .5) * TILE, { loot: 'carro', rot: rng() * 3, col: Math.floor(rng() * 3) });
        else if (r < .5) mkObj('well', (x - 1.4) * TILE, (y + h * .6) * TILE);
        else if (r < .62) mkObj('logpile', (x + w + 1.2) * TILE, (y + 1) * TILE);
        if (rng() < .35) lair(x + Math.floor(w / 2), y + Math.floor(h / 2), [[kd === 'chale' ? 'uivador' : 'hospedeiro', 1 + Math.floor(rng() * 2)]], { r: 90, night: rng() < .5 ? 1 : 0 });
        for (let j = -2; j <= h + 2; j++) for (let i = -2; i <= w + 2; i++) W.clear[(y + j) * MW + x + i] = 1;
        spots.push([x + w / 2, y + h / 2]); made++;
      }
    }
    W.houses3 = spots.length;
  }

  // --- natureza além da serra (árvores, pedras, gravetos...)
  for (let y = 2; y < MH - 2; y++) for (let x = 2; x < MW - 2; x++) {
    if (x < OW && y < OH) continue; const i = y * MW + x; if (W.clear[i]) continue;
    const t = W.tiles[i], r = rng(), jx = (x + .5 + (rng() - .5) * .6) * TILE, jy = (y + .5 + (rng() - .5) * .6) * TILE, k = rng();
    if (t === T.SNOW) { if (r < .05) mkObj('tree', jx, jy, { k: k < .75 ? 1 : 3, s: .85 + rng() * .4, snow: 1 }); else if (r < .07) mkObj('rock', jx, jy, { s: .8 + rng() * .4 }); else if (r < .085) mkObj('stick', jx, jy); else if (r < .095) mkObj('stone', jx, jy); }
    else if (t === T.FOREST) { if (r < (x >= OW ? .16 : .26)) mkObj('tree', jx, jy, { k: x >= OW ? (k < .8 ? 1 : 3) : k < .45 ? 1 : k < .58 ? 3 : k < .66 ? 2 : 0, s: .85 + rng() * .5, snow: x >= OW ? 1 : 0 }); else if (r < .29) mkObj('bush', jx, jy); else if (r < .31) mkObj('mushroom', jx, jy); else if (r < .34) mkObj('stick', jx, jy); else if (r < .355) mkObj('herb', jx, jy); else if (r < .37) mkObj('grass', jx, jy); }
    else if (t === T.GRASS) { if (r < .04) mkObj('tree', jx, jy, { k: k < .3 ? 2 : 0, s: .9 + rng() * .4 }); else if (r < .06) mkObj('bush', jx, jy); else if (r < .12) mkObj('grass', jx, jy); else if (r < .135) mkObj('rock', jx, jy, { s: .8 + rng() * .4 }); else if (r < .15) mkObj('stone', jx, jy); else if (r < .16) mkObj('flint', jx, jy); else if (r < .17) mkObj('herb', jx, jy); }
    else if (t === T.MUD) { if (r < .06) mkObj('mushroom', jx, jy); else if (r < .12) mkObj('herb', jx, jy); else if (r < .24) mkObj('tree', jx, jy, { k: 3, s: .8 + rng() * .4 }); }
    else if (t === T.ROCK) { if (r < .07) mkObj('rock', jx, jy, { s: .9 + rng() * .5 }); else if (r < .11) mkObj('iron', jx, jy); else if (r < .14) mkObj('coal', jx, jy); }
    else if (t === T.DIRT) { if (r < .04) mkObj('stone', jx, jy); else if (r < .06) mkObj('flint', jx, jy); }
  }
}

/* ------------------- neve, gelo e caverna no chão ------------------- */
const _renderChunk3 = renderChunk;
renderChunk = function (cx, cy) {
  const cv = _renderChunk3(cx, cy), x0 = cx * CH, y0 = cy * CH; if (x0 + CH < OW - 46 && y0 + CH < OH - 40) return cv;
  const c = cv.getContext('2d'); c.save(); c.setTransform(1, 0, 0, 1, -x0 * TILE, -y0 * TILE);
  for (let y = y0; y < y0 + CH; y++) for (let x = x0; x < x0 + CH; x++) {
    const t = tileAt(x, y), px = x * TILE, py = y * TILE, h = hash2(x, y, 11), h2 = hash2(x, y, 23);
    if (t === T.SNOW) { c.fillStyle = 'rgba(255,255,255,.55)'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(px + hash2(x, y, 80 + k) * 38, py + hash2(x, y, 90 + k) * 38, 1.2, 0, 7); c.fill(); } if (h < .25) { c.fillStyle = 'rgba(150,170,195,.25)'; c.beginPath(); c.ellipse(px + h2 * 30 + 5, py + h * 30 + 8, 10, 4, 0, 0, 7); c.fill(); } }
    else if (t === T.ICE) { c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.2; if (h < .4) { c.beginPath(); c.moveTo(px + h2 * 40, py + h * 10); c.lineTo(px + h * 40, py + 20 + h2 * 20); c.lineTo(px + 10 + h2 * 20, py + 40); c.stroke(); } c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(px + 4, py + 6, 16, 3); }
    else if (t === T.CAVE) { c.fillStyle = 'rgba(0,0,0,.22)'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(px + hash2(x, y, 60 + k) * 36 + 2, py + hash2(x, y, 70 + k) * 36 + 2, 2 + h * 2, 0, 7); c.fill(); } if (h < .08) { c.fillStyle = 'rgba(150,110,200,.35)'; c.beginPath(); c.arc(px + 20, py + 20, 3, 0, 7); c.fill(); } }
    else if (t === T.FOREST && inPlanalto((x + .5) * TILE, (y + .5) * TILE)) { c.fillStyle = 'rgba(240,244,250,.55)'; c.fillRect(px, py, TILE, TILE); }
  }
  c.restore(); return cv;
};

/* --------------------- objetos novos do mapa --------------------- */
Object.assign(SHAPES, { oca: [22, 14, 0, 4], aviao: [70, 17, 0, 0], asa: [44, 10, 0, 0], efigie_s: [8, 6, 0, 4], efigie: [10, 7, 0, 4], efigie_ressonante: [14, 9, 0, 4], tambor_fogo: [12, 9, 0, 3] });
Object.assign(DRAW2, {
  oca(o) { const x = o.x, y = o.y; shadow(x, y + 14, 28, 9); g.beginPath(); g.moveTo(x - 26, y + 14); g.quadraticCurveTo(x - 24, y - 30, x, y - 36); g.quadraticCurveTo(x + 24, y - 30, x + 26, y + 14); g.closePath(); g.fillStyle = '#8a7444'; g.fill(); g.strokeStyle = OL; g.lineWidth = 2.5; g.stroke();
    g.strokeStyle = 'rgba(60,44,20,.6)'; g.lineWidth = 1.5; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x - 24 + k * 2, y + 10 - k * 9); g.lineTo(x + 24 - k * 2, y + 10 - k * 9); g.stroke(); } rr(x - 7, y - 4, 14, 18, 6, '#1a1210', OL); seg([x - 3, y - 36, x + 4, y - 46], 2.5, '#5a3a22'); seg([x + 3, y - 36, x - 4, y - 46], 2.5, '#5a3a22'); },
  efigie_s(o) { drawEffigy(o.x, o.y, false, o.v); }, efigie(o) { drawEffigy(o.x, o.y, (o.burn || 0) > 0, o.v || .3); }, efigie_ressonante(o) { drawEffigy(o.x, o.y, true, .5, true); },
  aviao(o) { g.save(); g.translate(o.x, o.y); shadow(0, 18, 80, 18); g.rotate(o.rot || 0); rr(-72, -17, 144, 34, 16, '#c8ccd0', OL); for (let k = 0; k < 12; k++) rr(-56 + k * 9, -9, 5, 6, 1.5, '#2a3440'); rr(52, -12, 22, 24, 10, '#a8acb4', OL); rr(-66, -6, 12, 12, 2, '#2a2224'); seg([-72, 2, 72, 2], 3, '#c83a3a'); g.fillStyle = 'rgba(30,24,20,.5)'; g.beginPath(); g.ellipse(-20, 6, 26, 9, .2, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(-74, -14, 6, 28); g.restore(); },
  asa(o) { g.save(); g.translate(o.x, o.y); shadow(0, 10, 46, 10); g.rotate(o.rot || 0); g.beginPath(); g.moveTo(-44, -6); g.lineTo(40, -10); g.lineTo(44, 4); g.lineTo(-40, 10); g.closePath(); g.fillStyle = '#b4b8c0'; g.fill(); g.strokeStyle = OL; g.lineWidth = 2.5; g.stroke(); seg([-30, 0, 34, -2], 1.5, 'rgba(0,0,0,.25)'); rr(-6, 4, 16, 9, 4, '#8a8e96', OL); g.restore(); },
  mala(o) { const L = G.looted[o.id], c = ['#3a4a6a', '#6a3a3a', '#3a5a3a', '#5a4a3a'][((o.v || 0) * 4) | 0]; shadow(o.x, o.y + 8, 13, 4); rr(o.x - 12, o.y - 9, 24, 17, 3, L ? '#2a2628' : c, OL); seg([o.x - 4, o.y - 9, o.x - 4, o.y - 13, o.x + 4, o.y - 13, o.x + 4, o.y - 9], 2, OL); if (L) seg([o.x - 10, o.y - 2, o.x + 10, o.y - 2], 2, '#c8c0a8'); },
});
function drawEffigy(x, y, lit, v, big) {
  const s = big ? 1.4 : 1; shadow(x, y + 10, 14 * s, 5); seg([x, y + 10, x, y - 40 * s], 5, OL); seg([x, y + 10, x, y - 40 * s], 3, '#d6ceb4');
  seg([x - 16 * s, y - 26 * s, x + 16 * s, y - 22 * s], 5, OL); seg([x - 16 * s, y - 26 * s, x + 16 * s, y - 22 * s], 3, '#d6ceb4'); for (const dx of [-14, 14]) { seg([x + dx * s, y - 24 * s, x + dx * s * 1.2, y - 6 * s], 3, '#c4bca2'); }
  circ(x, y - 46 * s, 8 * s, big ? '#c84a7a' : '#e4dccc', OL); circ(x - 3 * s, y - 47 * s, 2 * s, '#141018'); circ(x + 3 * s, y - 47 * s, 2 * s, '#141018');
  seg([x - 10 * s, y - 14 * s, x + 10 * s, y - 14 * s], 3, v < .5 ? '#8a2a2a' : '#5a3a22');
  if (lit) { const f = .6 + .4 * Math.sin(RT * 8 + x); g.save(); g.globalAlpha = .35 * f; circ(x, y - 30 * s, 26 * s, big ? '#e07aa8' : '#e08a3a'); g.restore(); if (!big) drawFlame(x, y - 54 * s, .4, 2); }
}

/* -------------- saves antigos: a névoa do mapa tinha outro tamanho -------------- */
const _loadGame3 = loadGame;
loadGame = function (slot) {
  if (!_loadGame3(slot)) return false;
  try { const d = JSON.parse(localStorage.getItem(slotKey(G.slot))); const oFW = OW / FOGT, oFH = OH / FOGT; if (d.fog && d.fog.length === oFW * oFH) { G.fog.fill(0); for (let y = 0; y < oFH; y++) for (let x = 0; x < oFW; x++) if (d.fog[y * oFW + x] === '1') G.fog[y * FW + x] = 1; } } catch (e) { }
  return true;
};
