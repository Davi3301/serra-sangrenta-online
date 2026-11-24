'use strict';
/* ===================== UTILIDADES ===================== */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, y, s) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, s) { return vnoise(x, y, s) * .55 + vnoise(x * 2, y * 2, s + 7) * .3 + vnoise(x * 4, y * 4, s + 13) * .15; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
function angDiff(a, b) { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }

/* ===================== MUNDO ===================== */
const GC = 160, GW = Math.ceil(WORLD_W / GC), GH = Math.ceil(WORLD_H / GC);
const FOGT = 5, FW = MW / FOGT, FH = MH / FOGT, FOGC = FOGT * TILE;
const W = { tiles: null, clear: null, objs: [], grid: [], fissures: [], lairs: [], npcs: {}, mini: null };
const POIS = {
  cabana: { x: 26, y: 121, n: 'Sua Cabana', ic: 'u_house' },
  vila: { x: 40, y: 96, n: 'Vila Serra Sangrenta', ic: 'u_house' },
  posto: { x: 97, y: 90, n: 'Posto de Gasolina', ic: 'gasolina' },
  fazenda: { x: 100, y: 126, n: 'Fazenda Albuquerque', ic: 'milho' },
  mina: { x: 108, y: 51, n: 'Acampamento da Mina', ic: 'picareta_ferro' },
  pedreira: { x: 119, y: 39, n: 'Pedreira', ic: 'pedra' },
  torre: { x: 24, y: 40, n: 'Torre de Rádio', ic: 'm_tower' },
  estacao: { x: 53, y: 22, n: 'Estação Sismológica', ic: 'm_lab' },
  cratera: { x: 75, y: 24, n: 'Cratera', ic: 'm_crater', rad: 7 },
  lago: { x: 75, y: 62, n: 'Lago Espelho', ic: 'm_lake', rad: 14 },
  pantano: { x: 124, y: 104, n: 'Pântano', ic: 'm_swamp', rad: 10 },
  cidade: { x: 197, y: 93, n: 'Alto Ferro', ic: 'm_city', rad: 13 },
  delegacia: { x: 186, y: 91, n: 'Delegacia', ic: 'm_badge', rad: 5 },
  hospital: { x: 183, y: 95, n: 'Hospital de Alto Ferro', ic: 'm_hosp', rad: 6 },
  igreja: { x: 196, y: 66, n: 'Igreja e Cemitério', ic: 'm_church', rad: 8 },
  barragem: { x: 211, y: 39, n: 'Barragem do Ferro', ic: 'm_dam', rad: 8 },
  quarentena: { x: 213, y: 150, n: 'Zona de Quarentena', ic: 'm_tent', rad: 9 },
  serraria: { x: 58, y: 172, n: 'Serraria', ic: 'm_saw', rad: 8 },
  ferrovia: { x: 129, y: 176, n: 'Estação Ferroviária', ic: 'm_train', rad: 8 },
  motel: { x: 162, y: 89, n: 'Motel Beira-Serra', ic: 'cama', rad: 7 },
  sede: { x: 272, y: 105, n: 'Sede da Ferro Fundo', ic: 'm_city', rad: 7 },
  observatorio: { x: 277, y: 34, n: 'Observatório', ic: 'm_scope', rad: 7 },
  aerodromo: { x: 198, y: 219, n: 'Aeródromo', ic: 'm_plane', rad: 9 },
  bunker: { x: 268, y: 210, n: 'Bunker da Defesa Civil', ic: 'm_bunker', rad: 6 },
};
const FISSURES = [[21, 104], [60, 128], [113, 76], [40, 60], [92, 34], [170, 126], [228, 68], [141, 158], [258, 150], [240, 200]];
const BIG_FISSURE = [75, 17];
const CAR_START = [50, 97];

const tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= MW || ty >= MH) ? T.MOUNT : W.tiles[ty * MW + tx];
const tileAtPx = (x, y) => tileAt(Math.floor(x / TILE), Math.floor(y / TILE));
const solidAt = (x, y) => SOLID[tileAtPx(x, y)] === true;
function boxDoor(x, y, r) { const q = (a, b) => { const t = tileAtPx(a, b); return t === T.DOOR || t === T.GATE; }; return q(x - r, y - r) || q(x + r, y - r) || q(x - r, y + r) || q(x + r, y + r); }
function boxSolid(x, y, r) { return solidAt(x - r, y - r) || solidAt(x + r, y - r) || solidAt(x - r, y + r) || solidAt(x + r, y + r); }
function gridAdd(o) { const c = clamp(Math.floor(o.y / GC), 0, GH - 1) * GW + clamp(Math.floor(o.x / GC), 0, GW - 1); (W.grid[c] || (W.grid[c] = [])).push(o); o.cell = c; }
function gridRemove(o) { const a = W.grid[o.cell]; if (!a) return; const i = a.indexOf(o); if (i >= 0) a.splice(i, 1); }
function addObj(o) { o.id = W.objs.length; W.objs.push(o); gridAdd(o); return o; }
function queryObjs(x, y, r, cb) {
  const x0 = clamp(Math.floor((x - r) / GC), 0, GW - 1), x1 = clamp(Math.floor((x + r) / GC), 0, GW - 1);
  const y0 = clamp(Math.floor((y - r) / GC), 0, GH - 1), y1 = clamp(Math.floor((y + r) / GC), 0, GH - 1);
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const a = W.grid[cy * GW + cx]; if (a) for (let i = a.length - 1; i >= 0; i--) cb(a[i]); }
}
const OBJ = {
  tree: { r: 9, solid: 1, hp: 5 }, rock: { r: 15, solid: 1, hp: 6 }, iron: { r: 15, solid: 1, hp: 7 }, coal: { r: 15, solid: 1, hp: 6 }, sulfur: { r: 12, solid: 1, hp: 4 }, crystal: { r: 10, solid: 1, hp: 5 },
  bush: { r: 12 }, grass: { r: 10 }, stick: { r: 8 }, flint: { r: 8 }, stone: { r: 8 }, herb: { r: 8 }, mushroom: { r: 8 }, corn: { r: 9 }, logpile: { r: 17, solid: 1 },
  crate: { r: 14, solid: 1 }, cabinet: { r: 14, solid: 1 }, locker: { r: 14, solid: 1 }, car: { r: 26, solid: 1 }, wagon: { r: 30, solid: 1 }, pump: { r: 11, solid: 1 }, well: { r: 18, solid: 1 }, tower: { r: 18, solid: 1 },
  tv: { r: 12, solid: 1 }, gerador: { r: 20, solid: 1 }, heli: { r: 38, solid: 1 }, muro: { r: 19, solid: 1, hp: 420 }, grave: { r: 9, solid: 1 }, poste: { r: 5, solid: 1 },
  pesquisa: { r: 14, solid: 1 }, fissure: { r: 44 }, bigfissure: { r: 80 }, npc: { r: 12, solid: 1 },
  fogueira: { r: 13 }, cama: { r: 16 }, bancada: { r: 17, solid: 1 }, fornalha: { r: 17, solid: 1 }, costura: { r: 17, solid: 1 }, quimica: { r: 17, solid: 1 }, armeiro: { r: 17, solid: 1 }, bau: { r: 13, solid: 1 },
  lampiao: { r: 8, solid: 1 }, coletor: { r: 14, solid: 1 }, espinhos: { r: 17, hp: 60 }, armadilha_urso: { r: 14, hp: 3 }, barricada: { r: 19, solid: 1, hp: 160 },
};
function mkObj(type, x, y, extra) { const d = OBJ[type]; const o = Object.assign({ type, x, y, r: d.r, solid: !!d.solid, hp: d.hp || 0 }, extra); return addObj(o); }

function genWorld(seed) {
  const rng = mulberry32(seed), S = seed;
  const tl = W.tiles = new Uint8Array(MW * MH), cl = W.clear = new Uint8Array(MW * MH);
  W.objs = []; W.grid = []; W.fissures = []; W.lairs = []; W.npcs = {}; W.buildings = []; W.bst = new Uint8Array(MW * MH);
  const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < MW && y < MH) tl[y * MW + x] = t; };
  const get = (x, y) => tileAt(x, y);
  const edgeOf = (x, y) => Math.min(x, y, OW - 1 - x, OH - 1 - y); // borda do vale antigo (a serra que o cerca)
  const lair = (x, y, mobs, o) => W.lairs.push(Object.assign({ x: (x + .5) * TILE, y: (y + .5) * TILE, mobs, i: W.lairs.length }, o));
  // --- terreno base, com uma serra dividindo o vale em dois
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (x >= OW || y >= OH) { tl[y * MW + x] = typeof tile3 === 'function' ? tile3(x, y, S) : T.MOUNT; continue; } // além da serra (3.0)
    const e = edgeOf(x, y), n = fbm(x * .07, y * .07, S);
    let t = T.GRASS;
    const rx = 152 + 6 * Math.sin(y * .07) + (fbm(x * .1, y * .1, S + 5) - .5) * 6, pass = (y > 72 && y < 112) || (y > 166 && y < 186);
    if (e < 4 + n * 6) t = T.MOUNT;
    else if (!pass && Math.abs(x - rx) < 2 + n * 3) t = T.MOUNT;
    else if (fbm(x * .045 + 50, y * .045 + 50, S + 3) > .47) t = T.FOREST;
    else if (fbm(x * .11, y * .11, S + 9) > .7) t = T.DIRT;
    tl[y * MW + x] = t;
  }
  // --- lago, rio e riacho
  for (let y = 46; y < 80; y++) for (let x = 56; x < 94; x++) {
    const d = ((x - 75) / 11) ** 2 + ((y - 62) / 8) ** 2 + (fbm(x * .15, y * .15, S + 21) - .5) * .5;
    if (d < .5) set(x, y, T.DEEP); else if (d < 1) set(x, y, T.WATER); else if (d < 1.3 && get(x, y) !== T.MOUNT) set(x, y, T.SAND);
  }
  const river = (y0, y1, fx, wd) => { for (let y = y0; y < y1; y++) { const cx = fx(y); for (let x = Math.floor(cx - 4); x <= cx + 4; x++) { const d = Math.abs(x - cx), t = get(x, y); if (d < wd) { if (t !== T.DEEP) set(x, y, T.WATER); } else if (d < wd + 1.1 && t !== T.WATER && t !== T.DEEP && edgeOf(x, y) > 6) set(x, y, T.SAND); } } };
  river(66, MH, y => 75 + 6 * Math.sin(y * .11) + 3 * Math.sin(y * .23 + 1), 1.5);
  river(108, 135, y => 37 + 2.5 * Math.sin(y * .3), .8);
  // --- represa e rio do leste
  for (let y = 10; y < 32; y++) for (let x = 198; x < 234; x++) { const d = ((x - 216) / 13) ** 2 + ((y - 22) / 8) ** 2 + (fbm(x * .2, y * .2, S + 61) - .5) * .4; if (d < .55) set(x, y, T.DEEP); else if (d < 1) set(x, y, T.WATER); else if (d < 1.4) set(x, y, T.GRASS); }
  river(33, MH, y => y < 70 ? 216 + (y - 33) * .46 : 233 + 3 * Math.sin(y * .12), 1.3);
  for (let x = 202; x <= 230; x++) for (let y = 30; y <= 32; y++) set(x, y, (y === 31 && x > 213 && x < 219) ? T.WATER : T.WALL);
  for (let y = 33; y < 42; y++) for (let x = 200; x < 214; x++) if (get(x, y) !== T.WATER) set(x, y, T.CONC);
  // --- pântano
  for (let y = 88; y < 122; y++) for (let x = 106; x < 142; x++) {
    if (get(x, y) === T.MOUNT) continue;
    const d = Math.hypot((x - 124) / 1.2, y - 104), n = fbm(x * .2, y * .2, S + 31);
    if (d < 5 + n * 2) set(x, y, T.WATER); else if (d < 14 && n > .42) set(x, y, n > .66 ? T.WATER : T.MUD); else if (d < 14) set(x, y, T.FOREST);
  }
  // --- pedreira
  for (let y = 26; y < 58; y++) for (let x = 100; x < 136; x++) { const d = Math.hypot(x - 117, y - 41), n = fbm(x * .18, y * .18, S + 41); if (d < 11 + n * 5 && edgeOf(x, y) > 5) set(x, y, (n > .7 && d > 5) ? T.MOUNT : T.ROCK); }
  // --- cratera
  for (let y = 2; y < 40; y++) for (let x = 54; x < 96; x++) { const d = Math.hypot(x - 75, y - 20), n = fbm(x * .2, y * .2, S + 51); if (d < 12) set(x, y, T.ASH); else if (d < 15.5) set(x, y, (Math.abs(x - 75) <= 1 && y > 20) ? T.ASH : T.MOUNT); else if (d < 18 + n * 4 && get(x, y) !== T.MOUNT) set(x, y, T.ASH); }
  // --- estradas
  const road = (pts, w, t) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0) * 2;
      for (let s = 0; s <= L; s++) { const px = x0 + (x1 - x0) * s / L, py = y0 + (y1 - y0) * s / L;
        for (let dy = 0; dy < w; dy++) for (let dx = 0; dx < w; dx++) {
          const x = Math.round(px) + dx, y = Math.round(py) + dy, c = get(x, y);
          if (x < 0 || y < 0 || x >= MW || y >= MH || (c === T.MOUNT && edgeOf(x, y) < 11) || c === T.WALL || c === T.FLOOR) continue;
          if (c === T.WATER || c === T.DEEP || c === T.BRIDGE) set(x, y, T.BRIDGE); else if (c !== T.ROAD || t === T.RAIL) set(x, y, t);
          cl[y * MW + x] = 1;
        } }
    }
  };
  road([[6, 178], [294, 178]], 2, T.RAIL);
  road([[4, 96], [40, 96], [72, 94], [96, 92], [150, 92], [296, 92]], 2, T.ROAD);
  road([[96, 92], [101, 70], [108, 54]], 2, T.ROAD);
  road([[196, 66], [196, 120]], 2, T.ROAD);
  road([[197, 118], [201, 132], [213, 142]], 2, T.ROAD);
  road([[26, 124], [31, 112], [39, 104], [40, 98]], 1, T.DIRT);
  road([[40, 96], [33, 72], [25, 44], [38, 28], [52, 25]], 1, T.DIRT);
  road([[54, 25], [66, 33], [75, 36], [75, 30]], 1, T.DIRT);
  road([[97, 94], [98, 110], [99, 121]], 1, T.DIRT);
  road([[108, 54], [117, 46]], 1, T.DIRT);
  road([[27, 126], [30, 142], [44, 160], [57, 168]], 1, T.DIRT);
  road([[104, 135], [110, 158], [127, 175]], 1, T.DIRT);
  road([[200, 66], [202, 54], [207, 43]], 1, T.DIRT);
  road([[270, 93], [272, 103]], 2, T.ROAD);
  road([[250, 92], [262, 62], [277, 37]], 1, T.DIRT);
  road([[201, 132], [197, 160], [196, 218]], 2, T.ROAD);
  road([[226, 221], [250, 214], [267, 211]], 2, T.ROAD);
  // --- clareiras
  const clearing = (cx, cy, r, t) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (Math.hypot(x - cx, y - cy) <= r && x > 0 && y > 0 && x < MW && y < MH) { const c = get(x, y); cl[y * MW + x] = 1; if (c === T.FOREST || c === T.DIRT || c === T.GRASS || (c === T.MOUNT && edgeOf(x, y) > 8)) set(x, y, t === undefined ? T.GRASS : t); } };
  clearing(26, 122, 6); clearing(40, 97, 13); clearing(97, 90, 8); clearing(102, 127, 11); clearing(108, 51, 6, T.ROCK); clearing(24, 40, 5, T.DIRT); clearing(53, 22, 7); clearing(119, 39, 5, T.ROCK);
  clearing(272, 110, 9); clearing(277, 30, 7); clearing(268, 206, 8); clearing(162, 86, 8); clearing(205, 215, 9);
  for (let y = 219; y <= 223; y++) for (let x = 170; x <= 228; x++) if (tileAt(x, y) !== T.WATER) { set(x, y, T.CONC); cl[y * MW + x] = 1; }
  for (let y = 89; y <= 91; y++) for (let x = 155; x <= 170; x++) { set(x, y, T.CONC); cl[y * MW + x] = 1; }
  clearing(58, 173, 8, T.DIRT); clearing(129, 174, 8); clearing(196, 61, 10); clearing(207, 38, 5, T.CONC);
  for (let y = 78; y <= 110; y++) for (let x = 166; x <= 234; x++) { const c = get(x, y); cl[y * MW + x] = 1; if (c === T.FOREST || c === T.DIRT || c === T.MOUNT) set(x, y, T.GRASS); if ((y >= 90 && y <= 95 && c !== T.ROAD && c !== T.BRIDGE && c !== T.WATER) || (x >= 194 && x <= 199 && y >= 80 && c !== T.ROAD)) set(x, y, T.CONC); }
  for (let x = 118; x <= 141; x++) for (let y = 176; y <= 177; y++) { set(x, y, T.CONC); cl[y * MW + x] = 1; }
  // --- construções
  const building = (x, y, w, h, door, conts, floor) => {
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) if (x + i >= 0 && y + j >= 0) cl[(y + j) * MW + x + i] = 1;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, (i === 0 || j === 0 || i === w - 1 || j === h - 1) ? T.WALL : (floor || T.FLOOR));
    const m = Math.floor((door === 'n' || door === 's' ? w : h) / 2), F = floor || T.FLOOR;
    if (door === 's') { set(x + m, y + h - 1, F); if (SOLID[get(x + m, y + h)]) set(x + m, y + h, T.GRASS); }
    if (door === 'n') { set(x + m, y, F); if (SOLID[get(x + m, y - 1)]) set(x + m, y - 1, T.GRASS); }
    if (door === 'e') set(x + w - 1, y + m, F); if (door === 'w') set(x, y + m, F);
    const spots = [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2], [m + 1, door === 's' ? 1 : h - 2], [m - 2, door === 's' ? 1 : h - 2], [1, Math.floor(h / 2)], [w - 2, Math.floor(h / 2)]];
    if (typeof onBuilding === 'function') onBuilding(x, y, w, h, door, conts, F);
    conts.forEach((c, i) => { const s = spots[i], px = (x + s[0] + .5) * TILE, py = (y + s[1] + .5) * TILE; if (c[0] === 'tv') mkObj('tv', px, py, { tape: c[1] }); else if (STATIONS.includes(c[0])) mkObj(c[0], px, py, { fixed: 1 }); else mkObj(c[3] || 'cabinet', px, py, { loot: c[0], extra: c[1], note: c[2], lock: c[4] }); });
  };
  building(23, 117, 6, 5, 's', [['cabana', null, 0]]);
  for (const [t, dx, dy] of [['stone', 2.2, 2.6], ['stone', -2.6, 3.4], ['stone', 3.6, 1.2], ['stick', 1.4, 3.6], ['stick', -1.8, 2.2], ['grass', 3.2, 3.3], ['grass', -3.4, 1.6], ['grass', 0.4, 4.4], ['grass', 4.3, 2.4], ['flint', -0.8, 3.2], ['flint', 2.9, 4.4], ['bush', -4, 3.6], ['bush', 4.6, 4.2]]) mkObj(t, (26.5 + dx) * TILE, (121 + dy) * TILE);
  // vila
  building(29, 89, 6, 6, 's', [['casa'], ['casa']]);
  building(37, 89, 6, 6, 's', [['casa'], ['casa', null, 1]]);
  building(45, 88, 7, 7, 's', [['casa'], ['casa'], ['tv', 0]]);
  building(31, 100, 7, 6, 'n', [['casa', [['pistola', 1], ['municao9', 16]]], ['casa']]);
  building(42, 100, 6, 6, 'n', [['casa'], ['garagem']]);
  mkObj('well', 40.5 * TILE, 98.9 * TILE);
  W.npcs.tome = mkObj('npc', 44 * TILE, 95.4 * TILE, { npc: 'tome' });
  mkObj('fogueira', 46 * TILE, 95.3 * TILE, { fixed: 1 });
  mkObj('car', 37.6 * TILE, 98.7 * TILE, { loot: 'carro', rot: .2, col: 0 });
  // posto
  building(94, 85, 7, 5, 's', [['garagem', [['bateria', 1]]], ['garagem', [['lanterna', 1]], 2], ['casa']]);
  W.postoPump = mkObj('pump', 101.5 * TILE, 90.6 * TILE, { loot: 'bomba', extra: [['gasolina', 2]] }); mkObj('pump', 103 * TILE, 90.6 * TILE, { loot: 'bomba' }); // a primeira bomba sempre rende as 2 gasolinas da caminhonete
  mkObj('car', 105 * TILE, 95 * TILE, { loot: 'carro', rot: 1.3, col: 2 }); mkObj('car', 90 * TILE, 95 * TILE, { loot: 'carro', rot: .05, col: 0 }); mkObj('car', 82 * TILE, 91.2 * TILE, { loot: 'carro', rot: -.2, col: 1 });
  // fazenda
  building(95, 122, 7, 6, 'e', [['casa'], ['fazenda', null, 3], ['casa']]);
  building(104, 120, 8, 7, 's', [['fazenda', [['peca_radio', 1]]], ['fazenda', [['espingarda', 1], ['cartucho', 8]]], ['fazenda', [['foice', 1]]], ['caixa']]);
  for (let y = 129; y <= 133; y++) for (let x = 95; x <= 102; x++) if (get(x, y) !== T.MOUNT) { set(x, y, T.DIRT); cl[y * MW + x] = 1; if ((x + y) % 2 === 0 && rng() < .75) mkObj('corn', (x + .5) * TILE, (y + .5) * TILE); }
  // mina
  building(104, 47, 5, 5, 'e', [['mina', [['peca_radio', 1]]], ['mina', null, 4]]);
  building(110, 53, 5, 4, 'n', [['mina', [['rifle', 1], ['bala_rifle', 6]]], ['mina']]);
  mkObj('crate', 110.5 * TILE, 49 * TILE, { loot: 'mina' }); mkObj('crate', 111.6 * TILE, 49.4 * TILE, { loot: 'caixa' }); mkObj('car', 107 * TILE, 57 * TILE, { loot: 'carro', rot: .8, col: 2 });
  // torre e estação
  building(26, 36, 4, 4, 's', [['caixa', [['eletronica', 1]], 5]]);
  W.tower = mkObj('tower', 23.5 * TILE, 40 * TILE);
  building(49, 17, 9, 7, 's', [['lab'], ['lab'], ['lab'], ['lab', [['kit', 1]]]]);
  W.npcs.iris = mkObj('npc', 53.5 * TILE, 19.6 * TILE, { npc: 'iris' });
  mkObj('crate', 47.5 * TILE, 25 * TILE, { loot: 'caixa' });
  // serraria
  building(54, 170, 9, 6, 'n', [['serraria'], ['serraria', [['pe_cabra', 1]]], ['garagem']]);
  for (const [dx, dy] of [[-4, -3], [-5, 1], [7, -2], [8, 2], [3, 5]]) mkObj('logpile', (58 + dx) * TILE, (173 + dy) * TILE);
  lair(60, 166, [['verme', 3]]);
  // ferrovia
  building(124, 170, 11, 6, 's', [['trem'], ['trem'], ['tv', 3], ['caixa']]);
  for (const x of [108, 112.2, 148, 152.2, 156.4]) mkObj('wagon', x * TILE, 179 * TILE, { loot: 'trem', col: Math.floor(rng() * 3) });
  lair(134, 174, [['rastejante', 3], ['cuspidor', 1]]);
  // Alto Ferro
  building(170, 84, 7, 6, 's', [['casa'], ['casa'], ['casa']]);
  building(182, 83, 9, 7, 's', [['policia', [['peca_radio', 1]]], ['policia', [['revolver', 1], ['municao9', 12]]], ['armeiro'], ['policia']]);
  building(201, 82, 11, 8, 's', [['mercado'], ['mercado'], ['mercado'], ['mercado'], ['tv', 1], ['mercado']]);
  building(214, 84, 7, 6, 's', [['casa'], ['casa']]);
  building(223, 83, 9, 7, 's', [['oficina'], ['oficina'], ['oficina', [['bateria', 1]]], ['garagem']]);
  building(176, 96, 15, 10, 'n', [['hospital'], ['hospital'], ['hospital', [['amostra', 1]], 6], ['hospital'], ['quimica'], ['tv', 2], ['hospital'], ['hospital']], T.TILED);
  building(201, 96, 7, 7, 'n', [['casa'], ['casa'], ['casa']]);
  building(210, 96, 7, 6, 'n', [['casa'], ['garagem']]);
  building(220, 96, 8, 7, 'n', [['casa'], ['casa'], ['casa']]);
  for (let x = 168; x <= 232; x += 7) { mkObj('poste', x * TILE, 91.3 * TILE); mkObj('poste', (x + 3.5) * TILE, 94.9 * TILE); }
  for (let y = 70; y <= 118; y += 8) if (y < 88 || y > 97) mkObj('poste', 195.3 * TILE, y * TILE);
  for (const [x, y, r, k] of [[174, 91, .1, 0], [189, 95.1, 3.2, 1], [207, 91, -.15, 2], [218, 95.1, .08, 0], [225.5, 91, 3.1, 1], [199.2, 104, 1.6, 2], [194.6, 76, 1.5, 0]]) mkObj('car', x * TILE, y * TILE, { loot: 'carro', rot: r, col: k });
  lair(196, 94, [['hospedeiro', 3]]); lair(183, 101, [['hospedeiro', 4], ['imitador', 1], ['rasteira', 1]], { r: 130 }); lair(206, 86, [['hospedeiro', 2]], { r: 70 }); lair(204, 99, [['rasteira', 1]], { r: 20 }); lair(186, 86, [['hospedeiro', 2]], { r: 60 }); lair(224, 99, [['hospedeiro', 1], ['rasteira', 1]], { r: 50 });
  // igreja
  building(193, 56, 7, 9, 's', [['igreja'], ['igreja'], ['igreja', [['medalhao', 1]], 8]]);
  for (let y = 57; y <= 63; y += 2) for (let x = 181; x <= 189; x += 2) mkObj('grave', (x + .5) * TILE, (y + .5) * TILE, { k: Math.floor(rng() * 3) });
  lair(186, 66, [['colhedor', 1]], { night: 1 }); lair(196, 60, [['hospedeiro', 2]], { r: 60 });
  // barragem
  building(202, 35, 7, 5, 's', [['oficina'], ['lab']], T.FLOOR);
  W.gerador = mkObj('gerador', 211.5 * TILE, 37 * TILE);
  lair(208, 40, [['rastejante', 3], ['cuspidor', 2]]);
  // zona de quarentena
  for (let y = 144; y <= 161; y++) for (let x = 204; x <= 223; x++) { cl[y * MW + x] = 1; const edge = x === 204 || x === 223 || y === 144 || y === 161; set(x, y, edge && !(y === 144 && (x === 213 || x === 214)) ? T.FENCE : T.CONC); }
  building(206, 147, 5, 4, 's', [['militar'], ['militar']]);
  building(212, 147, 6, 4, 's', [['militar', [['cartao', 1]], 7], ['tv', 4]]);
  building(216, 154, 6, 6, 'w', [['militar', [['smg', 1], ['municao9', 40]], null, 'locker', 'cartao'], ['militar', [['colete_balistico', 1], ['mochila_m', 1], ['kit', 2]], null, 'locker', 'cartao']]);
  mkObj('crate', 208 * TILE, 156 * TILE, { loot: 'militar' }); mkObj('crate', 209.2 * TILE, 157 * TILE, { loot: 'militar' }); mkObj('car', 211 * TILE, 141.6 * TILE, { loot: 'carro', rot: .5, col: 2 });
  lair(211, 155, [['hospedeiro', 5]], { r: 110 }); lair(219, 150, [['rasteira', 1]], { r: 20 });
  // motel na passagem da serra
  building(156, 84, 13, 5, 's', [['casa'], ['casa'], ['casa'], ['casa'], ['garagem'], ['casa']]);
  mkObj('car', 158 * TILE, 90.4 * TILE, { loot: 'carro', rot: .1, col: 1 }); mkObj('car', 167 * TILE, 90.4 * TILE, { loot: 'carro', rot: 3.0, col: 0 });
  lair(162, 86, [['hospedeiro', 3], ['rasteira', 1]], { r: 110 });
  // sede da mineradora
  building(266, 104, 13, 10, 'n', [['lab', [['registro', 1]], 9], ['oficina'], ['lab'], ['mina'], ['lab'], ['policia'], ['oficina'], ['mina']], T.TILED);
  mkObj('car', 263 * TILE, 101 * TILE, { loot: 'carro', rot: 1.2, col: 2 }); mkObj('crate', 280.5 * TILE, 106 * TILE, { loot: 'mina' }); mkObj('crate', 281.4 * TILE, 107.2 * TILE, { loot: 'mina' });
  lair(272, 109, [['imitador', 2], ['hospedeiro', 3], ['rasteira', 1]], { r: 150 }); lair(274, 100, [['bruto', 1]], { r: 60 });
  // observatório
  building(273, 26, 8, 8, 's', [['lab', [['cristal', 2], ['eletronica', 3]], 10], ['lab'], ['casa'], ['lab', [['lanterna', 1]]]]);
  lair(277, 36, [['cuspidor', 3], ['verme', 2]]);
  // aeródromo
  building(200, 210, 11, 7, 's', [['oficina'], ['militar'], ['oficina'], ['garagem'], ['militar']]);
  W.heli = mkObj('heli', 186 * TILE, 221.2 * TILE);
  mkObj('crate', 214 * TILE, 217.5 * TILE, { loot: 'militar' }); mkObj('pump', 192 * TILE, 217.6 * TILE, { loot: 'bomba' });
  lair(190, 221, [['bruto', 1], ['rastejante', 3]], { r: 160 }); lair(212, 221, [['verme', 3]], { r: 120 });
  // bunker
  building(264, 203, 9, 7, 's', [['militar'], ['armeiro'], ['militar'], ['hospital']], T.TILED);
  W.npcs.nilo = mkObj('npc', 268.5 * TILE, 205.6 * TILE, { npc: 'nilo' });
  lair(262, 214, [['hospedeiro', 3], ['cuspidor', 1]], { r: 140 });
  // túneis demolidos
  for (let i = 0; i < 5; i++) { mkObj('rock', (6 + rng() * 3) * TILE, (96 + rng() * 2) * TILE, { s: 1.3, fixed: 1, hp: 999 }); mkObj('rock', (292 + rng() * 3) * TILE, (92 + rng() * 2) * TILE, { s: 1.3, fixed: 1, hp: 999 }); }
  // --- fendas
  FISSURES.forEach(([fx, fy], i) => {
    for (let y = fy - 4; y <= fy + 4; y++) for (let x = fx - 4; x <= fx + 4; x++) { const t = get(x, y); if (Math.hypot(x - fx, y - fy) < 2.8 + rng() * 1.4 && !SOLID[t] && t !== T.ROAD && t !== T.RAIL && !INDOOR[t]) { set(x, y, T.ASH); cl[y * MW + x] = 1; } }
    W.fissures.push(mkObj('fissure', (fx + .5) * TILE, (fy + .5) * TILE, { fi: i }));
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28 + rng(), d = (2.2 + rng() * 1.6) * TILE; const sx = (fx + .5) * TILE + Math.cos(a) * d, sy = (fy + .5) * TILE + Math.sin(a) * d; if (!solidAt(sx, sy)) mkObj('sulfur', sx, sy); }
    lair(fx + 2, fy + 2, [['rasteira', 1]], { r: 20, fis: i });
  });
  W.bigFissure = mkObj('bigfissure', (BIG_FISSURE[0] + .5) * TILE, (BIG_FISSURE[1] + .5) * TILE);
  for (let k = 0; k < 14; k++) { const a = rng() * 6.28, d = (4 + rng() * 6) * TILE; mkObj(rng() < .6 ? 'crystal' : 'sulfur', 75.5 * TILE + Math.cos(a) * d, 20 * TILE + Math.sin(a) * d); }
  // --- recursos naturais
  for (let y = 2; y < OH - 2; y++) for (let x = 2; x < OW - 2; x++) { // só o vale antigo: mantém os mesmos objetos de sempre
    const i = y * MW + x, t = tl[i], r = rng(), jx = (x + .5 + (rng() - .5) * .6) * TILE, jy = (y + .5 + (rng() - .5) * .6) * TILE, k = rng();
    if (cl[i]) continue;
    if (t === T.FOREST) {
      if (r < .2) mkObj('tree', jx, jy, { k: k < .5 ? 1 : k < .58 ? 3 : k < .63 ? 2 : 0, s: .85 + rng() * .45 });
      else if (r < .225) mkObj('bush', jx, jy); else if (r < .245) mkObj('mushroom', jx, jy); else if (r < .275) mkObj('stick', jx, jy); else if (r < .285) mkObj('herb', jx, jy); else if (r < .30) mkObj('grass', jx, jy);
    } else if (t === T.GRASS) {
      if (r < .03) mkObj('tree', jx, jy, { k: k < .2 ? 2 : k < .4 ? 3 : 0, s: .9 + rng() * .4 });
      else if (r < .05) mkObj('bush', jx, jy); else if (r < .11) mkObj('grass', jx, jy); else if (r < .125) mkObj('rock', jx, jy, { s: .8 + rng() * .4 }); else if (r < .14) mkObj('stone', jx, jy); else if (r < .15) mkObj('flint', jx, jy); else if (r < .162) mkObj('herb', jx, jy); else if (r < .175) mkObj('stick', jx, jy);
    } else if (t === T.DIRT) { if (r < .04) mkObj('stone', jx, jy); else if (r < .06) mkObj('flint', jx, jy); else if (r < .08) mkObj('rock', jx, jy, { s: .8 + rng() * .4 }); }
    else if (t === T.SAND) { if (r < .07) mkObj('flint', jx, jy); else if (r < .12) mkObj('stone', jx, jy); else if (r < .16) mkObj('grass', jx, jy); }
    else if (t === T.ROCK) { if (r < .07) mkObj('rock', jx, jy, { s: .9 + rng() * .5 }); else if (r < .115) mkObj('iron', jx, jy); else if (r < .15) mkObj('coal', jx, jy); else if (r < .17) mkObj('stone', jx, jy); }
    else if (t === T.MUD) { if (r < .06) mkObj('mushroom', jx, jy); else if (r < .12) mkObj('herb', jx, jy); else if (r < .18) mkObj('grass', jx, jy); else if (r < .24) mkObj('tree', jx, jy, { k: 3, s: .8 + rng() * .4 }); }
    else if (t === T.ASH) { if (r < .02) mkObj('crystal', jx, jy); else if (r < .07) mkObj('tree', jx, jy, { k: 3, s: .8 + rng() * .5 }); }
  }
  W.pesquisa = mkObj('pesquisa', 207.5 * TILE, 149.5 * TILE); // laboratório de campo da Zona de Quarentena
  if (typeof genExtra === 'function') genExtra({ set, get, building, lair, clearing, road, S }); // lugares novos da 2.0 (sempre depois de tudo)
  if (typeof genRegion3 === 'function') genRegion3({ set, get, building, lair, clearing, road, S }); // além da serra (3.0)
  if (typeof furnishBuildings === 'function') furnishBuildings(); // móveis por dentro dos prédios (depois de tudo, para não mudar o número dos objetos antigos)
  buildMinimap();
}

/* ===================== DESENHO DO TERRENO ===================== */
const TCOL = { 0: [[88, 114, 80], [72, 98, 72]], 1: [[60, 88, 66], [48, 74, 58]], 2: [[122, 102, 80], [108, 90, 70]], 3: [[150, 140, 112], [138, 128, 100]], 4: [[58, 96, 112], [48, 84, 102]], 5: [[36, 66, 86], [30, 58, 78]], 6: [[112, 110, 110], [98, 96, 98]], 7: [[86, 82, 86], [72, 70, 76]], 8: [[70, 70, 78], [62, 62, 70]], 9: [[124, 100, 74], [114, 92, 68]], 10: [[136, 130, 122], [136, 130, 122]], 11: [[80, 72, 58], [70, 62, 50]], 12: [[82, 44, 54], [62, 34, 46]], 13: [[112, 86, 60], [102, 78, 54]], 14: [[100, 100, 104], [90, 90, 96]], 15: [[84, 80, 78], [76, 72, 72]], 16: [[150, 156, 152], [138, 146, 142]], 17: [[96, 96, 100], [88, 88, 94]], 18: [[110, 80, 52], [100, 72, 46]], 19: [[84, 58, 38], [76, 52, 34]], 20: [[118, 116, 122], [104, 102, 108]] };
const TPRIO = { 5: -1, 4: 0, 3: 1, 8: 2, 15: 2.1, 14: 2.2, 11: 2.5, 2: 3, 12: 3.5, 6: 4, 0: 5, 1: 6, 7: 99, 10: 99, 9: 98, 13: 97, 16: 98, 17: 99, 18: 98, 19: 99, 20: 99 };
const PRIO_LEVELS = [0, 1, 2, 2.1, 2.2, 2.5, 3, 3.5, 4, 5, 6];
function tileColor(t, x, y) { const c = TCOL[t], k = vnoise(x * .35, y * .35, 77 + t); return `rgb(${c[0][0] + (c[1][0] - c[0][0]) * k | 0},${c[0][1] + (c[1][1] - c[0][1]) * k | 0},${c[0][2] + (c[1][2] - c[0][2]) * k | 0})`; }
const CH = 8, CHPX = CH * TILE, chunks = new Map();
let frameNo = 0;
function getChunk(cx, cy) {
  const key = cx + cy * 1000; let c = chunks.get(key);
  if (!c) {
    if (chunks.size > 90) { let old = null, ok = 0; for (const [k, v] of chunks) if (!old || v.used < old.used) { old = v; ok = k; } chunks.delete(ok); }
    c = { cv: renderChunk(cx, cy), used: 0 }; chunks.set(key, c);
  }
  c.used = frameNo; return c.cv;
}
function renderChunk(cx, cy) {
  const cv = document.createElement('canvas'); cv.width = cv.height = CHPX; const g = cv.getContext('2d');
  const x0 = cx * CH, y0 = cy * CH; g.translate(-x0 * TILE, -y0 * TILE); g.lineCap = 'round';
  for (let y = y0 - 1; y <= y0 + CH; y++) for (let x = x0 - 1; x <= x0 + CH; x++) { const t = tileAt(x, y); g.fillStyle = tileColor(t, x, y); g.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1); }
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const lv of PRIO_LEVELS) for (let y = y0 - 1; y <= y0 + CH; y++) for (let x = x0 - 1; x <= x0 + CH; x++) {
    const t = tileAt(x, y); if (TPRIO[t] !== lv) continue;
    g.fillStyle = tileColor(t, x, y);
    for (let d = 0; d < 4; d++) {
      const nt = tileAt(x + dirs[d][0], y + dirs[d][1]); if (TPRIO[nt] >= lv) continue;
      for (let k = 0; k < 3; k++) {
        const h = hash2(x * 4 + d, y * 4 + k, 5), f = (k + .5) / 3 + (h - .5) * .12, rad = 6 + h * 5;
        let px, py; if (dirs[d][0] !== 0) { px = (x + (dirs[d][0] > 0 ? 1 : 0)) * TILE; py = (y + f) * TILE; } else { px = (x + f) * TILE; py = (y + (dirs[d][1] > 0 ? 1 : 0)) * TILE; }
        g.beginPath(); g.arc(px, py, rad, 0, 6.3); g.fill();
      }
    }
  }
  for (let y = y0 - 1; y <= y0 + CH; y++) for (let x = x0 - 1; x <= x0 + CH; x++) {
    const t = tileAt(x, y), px = x * TILE, py = y * TILE, h = hash2(x, y, 11), h2 = hash2(x, y, 23), h3 = hash2(x, y, 37);
    if (t === T.GRASS || t === T.FOREST) {
      g.strokeStyle = t === T.GRASS ? 'rgba(40,70,44,.5)' : 'rgba(24,48,34,.5)'; g.lineWidth = 2;
      for (let k = 0; k < 2; k++) { const gx = px + hash2(x, y, 40 + k) * 34 + 3, gy = py + hash2(x, y, 50 + k) * 30 + 8; g.beginPath(); g.moveTo(gx - 3, gy); g.lineTo(gx - 4, gy - 5); g.moveTo(gx, gy); g.lineTo(gx, gy - 7); g.moveTo(gx + 3, gy); g.lineTo(gx + 5, gy - 5); g.stroke(); }
      if (t === T.GRASS && h < .05) { g.fillStyle = ['#b8b09c', '#a89a5a', '#8a6a7a'][h2 * 3 | 0]; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(px + 8 + hash2(x, y, 60 + k) * 24, py + 8 + hash2(x, y, 70 + k) * 24, 2, 0, 6.3); g.fill(); } }
      if (h3 < .3) { g.fillStyle = 'rgba(16,30,24,.22)'; g.beginPath(); g.ellipse(px + h2 * 30 + 5, py + h * 30 + 5, 9, 5, h * 6, 0, 6.3); g.fill(); }
    } else if (t === T.DIRT || t === T.SAND || t === T.ROCK || t === T.ROAD || t === T.CONC) {
      g.fillStyle = 'rgba(0,0,0,.16)';
      for (let k = 0; k < 2; k++) { g.beginPath(); g.arc(px + hash2(x, y, 80 + k) * 36 + 2, py + hash2(x, y, 90 + k) * 36 + 2, 1.5 + h * 1.5, 0, 6.3); g.fill(); }
      if (t !== T.SAND && t !== T.DIRT && h2 < .3) { g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px + h * 30, py + h3 * 30); g.lineTo(px + h * 30 + 8, py + h3 * 30 + 5); g.lineTo(px + h * 30 + 10, py + h3 * 30 + 13); g.stroke(); }
      if (t === T.CONC) { g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 1; g.strokeRect(px + .5, py + .5, TILE, TILE); }
      if ((t === T.ROAD || t === T.CONC) && h3 < .035) { g.fillStyle = 'rgba(70,14,22,.55)'; g.beginPath(); g.ellipse(px + 20, py + 20, 12 + h * 6, 7 + h2 * 5, h * 6, 0, 6.3); g.fill(); g.beginPath(); g.arc(px + 8 + h2 * 20, py + 30, 3, 0, 6.3); g.fill(); }
    } else if (t === T.MUD) { g.fillStyle = 'rgba(30,26,20,.4)'; g.beginPath(); g.ellipse(px + 20 + (h - .5) * 14, py + 20 + (h2 - .5) * 14, 9 + h3 * 5, 5 + h * 3, 0, 0, 6.3); g.fill(); }
    else if (t === T.ASH) {
      g.strokeStyle = 'rgba(190,50,70,.45)'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(px + h2 * 30, py + h3 * 30); g.quadraticCurveTo(px + 20, py + h * 40, px + h3 * 36 + 4, py + h2 * 30 + 10); g.stroke();
      if (h < .22) { g.fillStyle = 'rgba(140,40,56,.6)'; g.beginPath(); g.arc(px + 8 + h2 * 24, py + 8 + h3 * 24, 3 + h * 10, 0, 6.3); g.fill(); g.fillStyle = 'rgba(230,150,150,.35)'; g.beginPath(); g.arc(px + 7 + h2 * 24, py + 7 + h3 * 24, 1.5, 0, 6.3); g.fill(); }
    }
    else if (t === T.FLOOR) { g.strokeStyle = 'rgba(40,24,12,.35)'; g.lineWidth = 1; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(px, py + k * 10 + .5); g.lineTo(px + TILE, py + k * 10 + .5); g.stroke(); } g.beginPath(); g.moveTo(px + 8 + h * 24, py); g.lineTo(px + 8 + h * 24, py + 10); g.moveTo(px + 8 + h2 * 24, py + 20); g.lineTo(px + 8 + h2 * 24, py + 30); g.stroke(); if (h3 < .08) { g.fillStyle = 'rgba(70,14,22,.45)'; g.beginPath(); g.ellipse(px + 20, py + 22, 13, 8, h * 5, 0, 6.3); g.fill(); } }
    else if (t === T.TILED) { g.strokeStyle = 'rgba(40,50,50,.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px + .5, py); g.lineTo(px + .5, py + TILE); g.moveTo(px + 20.5, py); g.lineTo(px + 20.5, py + TILE); g.moveTo(px, py + .5); g.lineTo(px + TILE, py + .5); g.moveTo(px, py + 20.5); g.lineTo(px + TILE, py + 20.5); g.stroke(); if (h < .2) { g.fillStyle = 'rgba(90,16,26,.5)'; g.beginPath(); g.ellipse(px + 10 + h2 * 20, py + 10 + h3 * 20, 6 + h * 40, 4 + h2 * 6, h3 * 6, 0, 6.3); g.fill(); if (h < .08) { g.fillRect(px + 10 + h2 * 20, py + 10 + h3 * 20, 3, 26); } } }
    else if (t === T.RAIL) { g.fillStyle = 'rgba(60,42,28,.9)'; for (let k = 0; k < 4; k++) g.fillRect(px + k * 10 + 2, py + 2, 5, TILE - 4); if (tileAt(x, y - 1) !== T.RAIL) { g.fillStyle = '#8a8e98'; g.fillRect(px, py + 22, TILE + 1, 3); g.fillStyle = '#3a3c44'; g.fillRect(px, py + 25, TILE + 1, 1.5); } else { g.fillStyle = '#8a8e98'; g.fillRect(px, py + 12, TILE + 1, 3); g.fillStyle = '#3a3c44'; g.fillRect(px, py + 15, TILE + 1, 1.5); } }
    else if (t === T.BRIDGE) { g.strokeStyle = 'rgba(40,24,12,.5)'; g.lineWidth = 1.5; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(px + k * 10 + .5, py); g.lineTo(px + k * 10 + .5, py + TILE); g.stroke(); } }
    else if (t === T.WATER || t === T.DEEP) { for (const d of dirs) { const nt = tileAt(x + d[0], y + d[1]); if (nt !== T.WATER && nt !== T.DEEP && nt !== T.BRIDGE) { g.fillStyle = 'rgba(180,210,210,.12)'; if (d[0]) g.fillRect(px + (d[0] > 0 ? TILE - 12 : 0), py, 12, TILE); else g.fillRect(px, py + (d[1] > 0 ? TILE - 12 : 0), TILE, 12); } } }
    if (!SOLID[t] || t === T.WATER || t === T.DEEP) { const nt = tileAt(x, y - 1); if (nt === T.MOUNT || nt === T.WALL) { const gr = g.createLinearGradient(0, py, 0, py + 20); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(px, py, TILE, 20); } }
  }
  for (let y = y0 - 1; y <= y0 + CH; y++) for (let x = x0 - 1; x <= x0 + CH; x++) {
    const t = tileAt(x, y); if (t !== T.MOUNT && t !== T.WALL && t !== T.FENCE && t !== T.WWALL && t !== T.SWALL && t !== T.DOOR) continue;
    const px = x * TILE, py = y * TILE, h = hash2(x, y, 11), h2 = hash2(x, y, 23), S = tileAt(x, y + 1) !== t, Nn = tileAt(x, y - 1) !== t, Wn = tileAt(x - 1, y) !== t, En = tileAt(x + 1, y) !== t;
    if (t === T.FENCE) { g.strokeStyle = 'rgba(20,20,26,.7)'; g.lineWidth = 1; g.beginPath(); for (let k = -4; k < 5; k++) { g.moveTo(px + k * 10, py); g.lineTo(px + k * 10 + TILE, py + TILE); g.moveTo(px + k * 10 + TILE, py); g.lineTo(px + k * 10, py + TILE); } g.save(); g.beginPath(); g.rect(px, py, TILE, TILE); g.clip(); g.beginPath(); for (let k = -4; k < 5; k++) { g.moveTo(px + k * 10, py); g.lineTo(px + k * 10 + TILE, py + TILE); g.moveTo(px + k * 10 + TILE, py); g.lineTo(px + k * 10, py + TILE); } g.stroke(); g.restore(); g.fillStyle = '#2e2e36'; if (Nn || S) { g.fillRect(px, py + 17, TILE, 4); } if (Wn || En) g.fillRect(px + 18, py, 4, TILE); g.fillRect(px + 16, py + 15, 8, 8); continue; }
    if (t === T.DOOR) { g.fillStyle = '#3a281a'; g.fillRect(px, py, TILE, TILE); g.fillStyle = '#6e4e30'; g.fillRect(px + 4, py + 3, TILE - 8, TILE - 6); g.fillStyle = 'rgba(0,0,0,.3)'; for (let k = 1; k < 4; k++) g.fillRect(px + 4 + k * 8, py + 3, 1.5, TILE - 6); g.fillStyle = '#c4a446'; g.beginPath(); g.arc(px + 29, py + 21, 2.5, 0, 6.3); g.fill(); continue; }
    if (t === T.MOUNT) {
      g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.ellipse(px + 12 + h * 14, py + 12 + h2 * 12, 10, 6, -.4, 0, 6.3); g.fill();
      g.fillStyle = 'rgba(0,0,0,.16)'; g.beginPath(); g.ellipse(px + 24 + h2 * 10, py + 28 - h * 8, 8, 5, .5, 0, 6.3); g.fill();
      if (S) { g.fillStyle = '#3e3a42'; g.fillRect(px, py + TILE - 18, TILE, 18); g.fillStyle = 'rgba(0,0,0,.25)'; for (let k = 0; k < 3; k++) g.fillRect(px + 4 + k * 13 + h * 4, py + TILE - 16, 3, 14); }
      g.fillStyle = '#26232a';
    } else {
      const ww = t === T.WWALL, sw = t === T.SWALL;
      if (ww) { g.fillStyle = 'rgba(20,10,4,.5)'; for (let k = 1; k < 4; k++) g.fillRect(px, py + k * 10 - 1, TILE, 2); g.fillStyle = 'rgba(190,150,100,.18)'; for (let k = 0; k < 4; k++) g.fillRect(px + 2, py + k * 10 + 1, TILE - 4, 2); g.fillStyle = 'rgba(20,10,4,.55)'; g.fillRect(px + 13 + (y % 2) * 12, py, 2, TILE); }
      if (sw) { g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(px, py + 19, TILE, 1.5); g.fillRect(px + 19, py, 1.5, 19); g.fillRect(px + 9, py + 20, 1.5, 20); g.fillRect(px + 29, py + 20, 1.5, 20); }
      if (S) { g.fillStyle = ww ? '#5a4030' : sw ? '#55535a' : '#665e56'; g.fillRect(px, py + TILE - 20, TILE, 20); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(px, py + TILE - 10, TILE, 2); g.fillRect(px + 18 + h * 6, py + TILE - 20, 2, 10); if (h2 < .25) { g.fillStyle = 'rgba(50,10,18,.5)'; g.fillRect(px + 6 + h * 20, py + TILE - 18, 4, 16); g.fillRect(px + 4 + h * 20, py + TILE - 18, 9, 5); } }
      g.fillStyle = ww ? '#2a1c12' : sw ? '#1e1c22' : '#332e2c';
    }
    if (Nn) g.fillRect(px, py, TILE, 2.5); if (S) g.fillRect(px, py + TILE - 2.5, TILE, 2.5); if (Wn) g.fillRect(px, py, 2.5, TILE); if (En) g.fillRect(px + TILE - 2.5, py, 2.5, TILE);
    if (S) g.fillRect(px, py + TILE - (t === T.MOUNT ? 19 : 21), TILE, 2);
  }
  return cv;
}

/* ===================== MINIMAPA ===================== */
function buildMinimap() {
  const cv = W.mini = document.createElement('canvas'); cv.width = MW * 2; cv.height = MH * 2; const g = cv.getContext('2d');
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { g.fillStyle = tileColor(tileAt(x, y), x, y); g.fillRect(x * 2, y * 2, 2, 2); }
  g.fillStyle = 'rgba(14,34,24,.6)'; for (const o of W.objs) if (o.type === 'tree') g.fillRect(o.x / TILE * 2 | 0, o.y / TILE * 2 | 0, 1, 1);
}
