'use strict';
/* ==========================================================================
   PRÉDIOS COM CARA DE PRÉDIO
   Cada construção do vale ganha um tipo (casa, escola, hospital, igreja...),
   paredes e piso do material certo, telhado com fachada, janelas e placa, e
   móveis por dentro. O telhado some quando você entra (ou fica atrás dele).
   ========================================================================== */

/* ------------------------------ tipos ------------------------------ */
// telhado: tile (telha), shingle (madeira), slate (ardósia), barn (celeiro), metal (zinco), flat (laje), dome (cúpula)
const BKIND = {
  cabana: { wall: 'log', wc: '#6e4a2c', floor: 'planks', fc: '#6a4a30', roof: 'shingle', rc: '#5a3a26', furn: ['cama_m', 'mesa', 'tapete', 'fogao'] },
  casa: { wall: 'plaster', wc: '#d8cfb8', floor: 'planks', fc: '#8a6440', roof: 'tile', rc: '#9a4a3a', furn: ['cama_m', 'mesa', 'sofa', 'tapete', 'fogao', 'geladeira', 'vaso', 'cama_m'] },
  celeiro: { wall: 'planks', wc: '#8a3a2a', floor: 'hay', fc: '#7a6440', roof: 'barn', rc: '#9a3428', furn: ['feno', 'feno', 'barril', 'caixotes', 'feno'] },
  posto: { wall: 'plaster', wc: '#e0dcd4', accent: '#c83a3a', floor: 'tiles', fc: '#c8c4b8', fc2: '#a8a49a', roof: 'flat', rc: '#d8d4cc', sign: 'POSTO SERRA', furn: ['gondola', 'caixa_reg', 'geladeira'] },
  galpao: { wall: 'metal', wc: '#6a6e76', floor: 'concrete', fc: '#77767a', roof: 'metal', rc: '#6a7480', furn: ['bancada_ferr', 'pneus', 'barril', 'caixotes', 'barril'] },
  lab: { wall: 'plaster', wc: '#dcdcd8', accent: '#3a6a8a', floor: 'tiles', fc: '#d8dcdc', fc2: '#c4c8c8', roof: 'flat', rc: '#c8ccd0', antenna: 1, furn: ['mesa_escr', 'prateleira', 'mesa_escr', 'computador'] },
  delegacia: { wall: 'brick', wc: '#5a6478', floor: 'tiles', fc: '#8a8e96', fc2: '#74787e', roof: 'flat', rc: '#3a4252', sign: 'DELEGACIA', police: 1, furn: ['mesa_escr', 'mesa_escr', 'arquivo', 'cela'] },
  mercado: { wall: 'plaster', wc: '#e0c860', accent: '#c83a3a', floor: 'tiles', fc: '#e4dcc8', fc2: '#c8b890', roof: 'flat', rc: '#b4b4b0', sign: 'MERCADO', ac: 1, furn: ['gondola', 'gondola', 'gondola', 'gondola', 'caixa_reg', 'geladeira'] },
  oficina: { wall: 'metal', wc: '#5a6a7a', floor: 'concrete', fc: '#6a6a6e', roof: 'metal', rc: '#56606e', sign: 'OFICINA', furn: ['bancada_ferr', 'pneus', 'barril', 'bancada_ferr', 'caixotes'] },
  hospital: { wall: 'plaster', wc: '#ecece8', accent: '#3a7ab8', floor: 'tiles', fc: '#e8ecec', fc2: '#d4dcdc', roof: 'flat', rc: '#e4e4e0', sign: 'HOSPITAL', cross: 1, furn: ['maca', 'maca', 'maca', 'mesa_escr', 'maca', 'vaso', 'maca'] },
  igreja: { wall: 'stone', wc: '#8a8478', floor: 'planks', fc: '#5a3e28', roof: 'slate', rc: '#3a3a46', church: 1, furn: ['banco_igreja', 'banco_igreja', 'banco_igreja', 'banco_igreja', 'altar'] },
  militar: { wall: 'concrete', wc: '#5a6448', floor: 'concrete', fc: '#62665a', roof: 'flat', rc: '#4e5a40', star: 1, furn: ['beliche', 'caixotes', 'beliche', 'mesa'] },
  motel: { wall: 'plaster', wc: '#d8b0a0', accent: '#7a3a5a', floor: 'carpet', fc: '#7a3a4a', roof: 'tile', rc: '#7a3a32', sign: 'MOTEL BEIRA-SERRA', furn: ['cama_m', 'cama_m', 'cama_m', 'tapete', 'cama_m', 'vaso'] },
  sede: { wall: 'concrete', wc: '#8a9098', accent: '#c8843a', floor: 'tiles', fc: '#c4c8cc', fc2: '#aeb2b8', roof: 'flat', rc: '#8a8e96', sign: 'FERRO FUNDO MINERAÇÃO', ac: 1, furn: ['mesa_escr', 'mesa_escr', 'computador', 'arquivo', 'mesa_escr', 'vaso', 'prateleira'] },
  observatorio: { wall: 'plaster', wc: '#dcdcd8', floor: 'tiles', fc: '#c8ccd0', fc2: '#b4b8bc', roof: 'dome', rc: '#e4e4e8', sign: 'OBSERVATÓRIO', furn: ['mesa_escr', 'computador', 'prateleira'] },
  bunker: { wall: 'concrete', wc: '#6e7068', floor: 'concrete', fc: '#5e605c', roof: 'flat', rc: '#5a5e52', sign: 'DEFESA CIVIL', star: 1, furn: ['beliche', 'beliche', 'caixotes', 'mesa', 'computador'] },
  escola: { wall: 'brick', wc: '#9a4a36', accent: '#e0c860', floor: 'tiles', fc: '#c8d4c0', fc2: '#aebca8', roof: 'tile', rc: '#c8683a', sign: 'ESCOLA ESTADUAL ALTO DA SERRA', flag: 1, furn: ['carteira', 'carteira', 'carteira', 'carteira', 'carteira', 'carteira', 'quadro', 'mesa_escr', 'carteira', 'carteira'] },
  tratamento: { wall: 'concrete', wc: '#8a9aa4', accent: '#3a7ab8', floor: 'tiles', fc: '#b8c4c8', fc2: '#a0acb0', roof: 'flat', rc: '#9aa4aa', sign: 'ESTAÇÃO DE TRATAMENTO', ac: 1, furn: ['barril', 'mesa_escr', 'computador', 'barril', 'prateleira'] },
  bombeiros: { wall: 'brick', wc: '#a83a30', accent: '#e8e0d0', floor: 'concrete', fc: '#6e6a68', roof: 'flat', rc: '#8a2a24', sign: 'BOMBEIROS', siren: 1, furn: ['beliche', 'mesa', 'bancada_ferr', 'beliche', 'caixotes'] },
  estacao: { wall: 'brick', wc: '#7a5a46', accent: '#e0c860', floor: 'planks', fc: '#6a5038', roof: 'tile', rc: '#5a3a30', sign: 'ESTAÇÃO SERRA SANGRENTA', furn: ['banco_igreja', 'banco_igreja', 'caixotes', 'mesa_escr'] },
  barragem: { wall: 'concrete', wc: '#7a7c80', floor: 'concrete', fc: '#646668', roof: 'flat', rc: '#6a6c70', sign: 'BARRAGEM DO FERRO', antenna: 1, furn: ['computador', 'mesa_escr', 'arquivo'] },
  hangar: { wall: 'metal', wc: '#6a7064', floor: 'concrete', fc: '#6a6a66', roof: 'metal', rc: '#5e6658', sign: 'AERÓDROMO', furn: ['caixotes', 'barril', 'bancada_ferr', 'pneus', 'barril'] },
};
// cor das casas varia um pouco (cada casa da vila é de um jeito)
const HOUSE_WALLS = ['#d8cfb8', '#b8c8a8', '#d0b0a0', '#a8b8c8', '#e0d0a0', '#c8c0d0'];
const HOUSE_ROOFS = ['#9a4a3a', '#7a3a32', '#8a5a3a', '#6a4a3a', '#9a5a40'];
const LOOT_KIND = { cabana: 'cabana', casa: 'casa', garagem: 'galpao', fazenda: 'celeiro', mina: 'galpao', caixa: 'galpao', lab: 'lab', serraria: 'galpao', trem: 'estacao', policia: 'delegacia', mercado: 'mercado', oficina: 'oficina', hospital: 'hospital', igreja: 'igreja', militar: 'militar', escoteiro: 'cabana', escola: 'escola', tratamento: 'tratamento', pesqueiro: 'cabana', bombeiros: 'bombeiros' };
// prédios conhecidos pela posição (canto superior esquerdo)
const BOVER = { '94,85': 'posto', '95,122': 'casa', '104,120': 'celeiro', '49,17': 'lab', '182,83': 'delegacia', '201,82': 'mercado', '223,83': 'oficina', '176,96': 'hospital', '193,56': 'igreja', '202,35': 'barragem', '156,84': 'motel', '266,104': 'sede', '273,26': 'observatorio', '200,210': 'hangar', '264,203': 'bunker', '124,170': 'estacao', '54,170': 'galpao', '26,36': 'galpao' };
const BSIGN = { '49,17': 'ESTAÇÃO SISMOLÓGICA', '54,170': 'SERRARIA', '23,117': '', '31,199': 'ACAMPAMENTO PICA-PAU', '86,203': 'PESQUEIRO DO DITO', '206,147': 'EXÉRCITO', '212,147': 'COMANDO', '216,154': 'ARSENAL', '104,47': 'MINA FERRO FUNDO' };
const BSTYLES = [null]; // índice de estilo por bloco (W.bst)

function onBuilding(x, y, w, h, door, conts, floor) {
  const key = x + ',' + y, cnt = {}; for (const c of conts) if (c && LOOT_KIND[c[0]]) cnt[LOOT_KIND[c[0]]] = (cnt[LOOT_KIND[c[0]]] || 0) + 1;
  let kind = BOVER[key] || Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || 'casa';
  const K = BKIND[kind], hv = hash2(x, y, 99), st = Object.assign({}, K);
  if (kind === 'casa') { st.wc = HOUSE_WALLS[(hv * HOUSE_WALLS.length) | 0]; st.rc = HOUSE_ROOFS[(hash2(x, y, 7) * HOUSE_ROOFS.length) | 0]; if (hash2(x, y, 13) < .35) { st.floor = 'carpet'; st.fc = ['#6a3a3a', '#3a5a4a', '#4a4a6a'][(hv * 3) | 0]; } }
  if (floor === T.TILED && st.floor !== 'tiles') { st.floor = 'tiles'; st.fc = st.fc || '#d8dcdc'; st.fc2 = st.fc2 || '#c4c8c8'; }
  st.sign = key in BSIGN ? BSIGN[key] : K.sign || '';
  BSTYLES.push(st); const si = BSTYLES.length - 1;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const tx = x + i, ty = y + j; if (tx >= 0 && ty >= 0 && tx < MW && ty < MH) W.bst[ty * MW + tx] = si; }
  W.buildings.push({ x, y, w, h, door, kind, st, a: 1, i: W.buildings.length });
}

/* ------------------------- paredes e pisos ------------------------- */
const shadeC = (hex, k) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g2 = (n >> 8) & 255, b = n & 255, f = v => clamp(Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k), 0, 255); return `rgb(${f(r)},${f(g2)},${f(b)})`; };
function paintFloor(c, st, x, y, px, py) {
  const T2 = TILE, h = hash2(x, y, 11), h2 = hash2(x, y, 23);
  if (st.floor === 'planks') {
    c.fillStyle = st.fc; c.fillRect(px, py, T2, T2);
    for (let k = 0; k < 4; k++) { const rowShade = hash2(x, y * 4 + k, 61); c.fillStyle = `rgba(${rowShade < .5 ? '0,0,0' : '255,240,220'},${.05 + rowShade * .06})`; c.fillRect(px, py + k * 10, T2, 10); c.fillStyle = 'rgba(30,16,6,.45)'; c.fillRect(px, py + k * 10 + 9, T2, 1.2); const sx = px + ((hash2(x * 3 + k, y, 71) * 30) | 0) + 5; c.fillRect(sx, py + k * 10, 1.2, 9); }
  } else if (st.floor === 'tiles') {
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { c.fillStyle = (i + j + x + y) % 2 ? st.fc : (st.fc2 || st.fc); c.fillRect(px + i * 20, py + j * 20, 20, 20); }
    c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 1; c.strokeRect(px + .5, py + .5, 19, 19); c.strokeRect(px + 20.5, py + 20.5, 19, 19); c.strokeRect(px + 20.5, py + .5, 19, 19); c.strokeRect(px + .5, py + 20.5, 19, 19);
    if (h < .06) { c.fillStyle = 'rgba(80,20,28,.35)'; c.beginPath(); c.ellipse(px + 10 + h2 * 20, py + 20, 9, 5, h2 * 3, 0, 7); c.fill(); }
  } else if (st.floor === 'carpet') {
    c.fillStyle = st.fc; c.fillRect(px, py, T2, T2); c.fillStyle = 'rgba(255,255,255,.05)'; for (let k = 0; k < 6; k++) c.fillRect(px + hash2(x, y, 80 + k) * 38, py + hash2(x, y, 90 + k) * 38, 2, 2);
    c.strokeStyle = 'rgba(0,0,0,.08)'; c.lineWidth = 1; c.strokeRect(px + .5, py + .5, T2 - 1, T2 - 1);
  } else if (st.floor === 'concrete') {
    c.fillStyle = st.fc; c.fillRect(px, py, T2, T2); c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1; c.strokeRect(px + .5, py + .5, T2, T2);
    if (h < .25) { c.fillStyle = 'rgba(20,20,20,.16)'; c.beginPath(); c.ellipse(px + 8 + h2 * 24, py + 8 + h * 60, 8 + h2 * 6, 5, h * 6, 0, 7); c.fill(); }
  } else if (st.floor === 'hay') {
    c.fillStyle = st.fc; c.fillRect(px, py, T2, T2); c.strokeStyle = 'rgba(220,190,110,.55)'; c.lineWidth = 1.2; c.beginPath(); for (let k = 0; k < 7; k++) { const a = hash2(x, y, 120 + k) * 6.3, sx = px + hash2(x, y, 130 + k) * 38, sy = py + hash2(x, y, 140 + k) * 38; c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a) * 7, sy + Math.sin(a) * 7); } c.stroke();
  }
  // sombra da parede de cima
  if (tileAt(x, y - 1) === T.WALL) { const gr = c.createLinearGradient(0, py, 0, py + 18); gr.addColorStop(0, 'rgba(0,0,0,.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(px, py, T2, 18); }
}
function paintWall(c, st, x, y, px, py) {
  const T2 = TILE, S = tileAt(x, y + 1) !== T.WALL, top = shadeC(st.wc, -.25), face = st.wc, h = hash2(x, y, 11);
  c.fillStyle = top; c.fillRect(px, py, T2, T2);
  c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(px + 3, py + 3, T2 - 6, 4);
  if (S) {
    const fy = py + T2 - 20; c.fillStyle = face; c.fillRect(px, fy, T2, 20);
    if (st.wall === 'brick') { c.fillStyle = 'rgba(30,14,10,.35)'; for (let r = 0; r < 4; r++) { c.fillRect(px, fy + r * 5 + 4, T2, 1); for (let b = 0; b < 4; b++) c.fillRect(px + b * 12 + (r % 2 ? 6 : 0), fy + r * 5, 1, 5); } }
    else if (st.wall === 'log') { for (let r = 0; r < 3; r++) { c.fillStyle = 'rgba(20,10,4,.45)'; c.fillRect(px, fy + r * 7 + 6, T2, 1.5); c.fillStyle = 'rgba(255,220,170,.12)'; c.fillRect(px, fy + r * 7 + 1, T2, 2); } }
    else if (st.wall === 'planks') { c.fillStyle = 'rgba(20,10,4,.4)'; for (let b = 0; b < 5; b++) c.fillRect(px + b * 8, fy, 1.2, 20); }
    else if (st.wall === 'metal') { c.fillStyle = 'rgba(0,0,0,.22)'; for (let b = 0; b < 8; b++) c.fillRect(px + b * 5, fy, 1.5, 20); c.fillStyle = 'rgba(255,255,255,.08)'; for (let b = 0; b < 8; b++) c.fillRect(px + b * 5 + 2, fy, 1, 20); if (h < .3) { c.fillStyle = 'rgba(140,70,30,.35)'; c.fillRect(px + h * 30, fy + 8, 9, 10); } }
    else if (st.wall === 'stone') { c.fillStyle = 'rgba(0,0,0,.25)'; for (let r = 0; r < 2; r++) { c.fillRect(px, fy + r * 10 + 9, T2, 1.2); for (let b = 0; b < 3; b++) c.fillRect(px + b * 14 + (r ? 7 : 0) + hash2(x + b, y + r, 5) * 4, fy + r * 10, 1.2, 10); } }
    else if (st.wall === 'concrete') { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(px + T2 - 1, fy, 1, 20); c.fillRect(px, fy + 10, T2, 1); }
    else { c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(px, fy + 15, T2, 5); }
    if (st.accent) { c.fillStyle = st.accent; c.fillRect(px, fy + 3, T2, 3); }
    c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(px, fy, T2, 2);
  }
  c.fillStyle = shadeC(st.wc, -.6); const N = tileAt(x, y - 1) !== T.WALL, Wn = tileAt(x - 1, y) !== T.WALL, En = tileAt(x + 1, y) !== T.WALL;
  if (N) c.fillRect(px, py, T2, 2.5); if (S) c.fillRect(px, py + T2 - 2.5, T2, 2.5); if (Wn) c.fillRect(px, py, 2.5, T2); if (En) c.fillRect(px + T2 - 2.5, py, 2.5, T2);
}
const _renderChunk = renderChunk;
renderChunk = function (cx, cy) {
  const cv = _renderChunk(cx, cy); if (!W.bst) return cv;
  const c = cv.getContext('2d'), x0 = cx * CH, y0 = cy * CH; c.save(); c.setTransform(1, 0, 0, 1, -x0 * TILE, -y0 * TILE);
  for (let y = y0; y < y0 + CH; y++) for (let x = x0; x < x0 + CH; x++) {
    if (x < 0 || y < 0 || x >= MW || y >= MH) continue; const si = W.bst[y * MW + x]; if (!si) continue; const st = BSTYLES[si], t = tileAt(x, y);
    if (t === T.WALL) paintWall(c, st, x, y, x * TILE, y * TILE); else if (t === T.FLOOR || t === T.TILED) paintFloor(c, st, x, y, x * TILE, y * TILE);
  }
  c.restore(); return cv;
};

/* --------------------------- telhados --------------------------- */
const LIFT = 26, FAC = 30; // o telhado sobe um pouco (dá altura) e deixa a fachada aparecendo embaixo
function windowAt(c, x, y, w, h, lit) { c.fillStyle = '#1a1e24'; c.fillRect(x - 1.5, y - 1.5, w + 3, h + 3); c.fillStyle = lit ? '#e8c870' : '#3a5a6e'; c.fillRect(x, y, w, h); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x + 1, y + 1, w * .4, h - 2); c.fillStyle = '#1a1e24'; c.fillRect(x + w / 2 - .6, y, 1.2, h); }
function buildRoof(b) {
  const st = b.st, Wd = b.w * TILE, Ht = b.h * TILE, OV = 7, cw = Wd + OV * 2, ch = Ht + LIFT + 6;
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const c = cv.getContext('2d'); c.lineJoin = 'round';
  const rx = 0, ry = 0, rw = cw, rh = Ht + LIFT - FAC; // área do telhado (dentro do canvas)
  const fy = rh, fh = FAC; // fachada embaixo
  // --- fachada (parede da frente vista de pé)
  c.fillStyle = st.wc; c.fillRect(OV, fy, Wd, fh);
  if (st.wall === 'brick') { c.fillStyle = 'rgba(30,14,10,.3)'; for (let r = 0; r < 6; r++) { c.fillRect(OV, fy + r * 5 + 4, Wd, 1); for (let k = 0; k < Wd / 12; k++) c.fillRect(OV + k * 12 + (r % 2 ? 6 : 0), fy + r * 5, 1, 5); } }
  else if (st.wall === 'log' || st.wall === 'planks') { c.fillStyle = 'rgba(20,10,4,.35)'; if (st.wall === 'log') for (let r = 0; r < 4; r++) c.fillRect(OV, fy + r * 7 + 6, Wd, 1.5); else for (let k = 0; k < Wd / 8; k++) c.fillRect(OV + k * 8, fy, 1.2, fh); }
  else if (st.wall === 'metal') { c.fillStyle = 'rgba(0,0,0,.2)'; for (let k = 0; k < Wd / 5; k++) c.fillRect(OV + k * 5, fy, 1.5, fh); }
  else if (st.wall === 'stone') { c.fillStyle = 'rgba(0,0,0,.22)'; for (let r = 0; r < 3; r++) { c.fillRect(OV, fy + r * 10 + 9, Wd, 1.2); for (let k = 0; k < Wd / 14; k++) c.fillRect(OV + k * 14 + (r % 2 ? 7 : 0), fy + r * 10, 1.2, 10); } }
  if (st.accent) { c.fillStyle = st.accent; c.fillRect(OV, fy + 4, Wd, 3); }
  c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(OV, fy + fh - 4, Wd, 4);
  // janelas e porta da frente
  const doorX = b.door === 's' ? OV + Math.floor(b.w / 2) * TILE : -999, lit = hash2(b.x, b.y, 5) < .25;
  for (let wx = OV + 10; wx < OV + Wd - 22; wx += st.wall === 'metal' ? 70 : 46) { if (Math.abs(wx + 7 - (doorX + TILE / 2)) < 30) continue; windowAt(c, wx, fy + 9, 15, 12, lit && hash2(wx, b.y, 3) < .5); }
  if (b.door === 's') { c.fillStyle = '#1a1210'; c.fillRect(doorX + 6, fy + 5, TILE - 12, fh - 5); c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(doorX + 8, fy + 7, 3, fh - 9); }
  c.strokeStyle = '#141018'; c.lineWidth = 2.5; c.strokeRect(OV + 1, fy, Wd - 2, fh - 1);
  // --- telhado
  const roof = st.rc, dark = shadeC(roof, -.3), light = shadeC(roof, .12);
  c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(rx + 2, ry + 4, rw - 4, rh);
  if (st.roof === 'tile' || st.roof === 'shingle' || st.roof === 'slate' || st.roof === 'barn') {
    const horiz = rw >= rh * .8; // cumeeira no sentido mais comprido
    c.fillStyle = roof; c.fillRect(rx, ry, rw, rh);
    if (horiz) { c.fillStyle = light; c.fillRect(rx, ry, rw, rh / 2); c.fillStyle = dark; c.fillRect(rx, ry + rh / 2, rw, rh / 2); }
    else { c.fillStyle = light; c.fillRect(rx, ry, rw / 2, rh); c.fillStyle = dark; c.fillRect(rx + rw / 2, ry, rw / 2, rh); }
    // fileiras de telha
    const step = st.roof === 'slate' ? 7 : st.roof === 'shingle' ? 8 : 6; c.fillStyle = 'rgba(0,0,0,.2)';
    if (horiz) for (let yy = ry + step; yy < ry + rh; yy += step) { c.fillRect(rx, yy, rw, 1.2); for (let xx = rx + ((yy / step) % 2 ? 0 : 5); xx < rx + rw; xx += 10) c.fillRect(xx, yy - step + 1, 1, step - 1); }
    else for (let xx = rx + step; xx < rx + rw; xx += step) { c.fillRect(xx, ry, 1.2, rh); for (let yy = ry + ((xx / step) % 2 ? 0 : 5); yy < ry + rh; yy += 10) c.fillRect(xx - step + 1, yy, step - 1, 1); }
    c.strokeStyle = shadeC(roof, -.5); c.lineWidth = 3; c.beginPath(); if (horiz) { c.moveTo(rx + 4, ry + rh / 2); c.lineTo(rx + rw - 4, ry + rh / 2); } else { c.moveTo(rx + rw / 2, ry + 4); c.lineTo(rx + rw / 2, ry + rh - 4); } c.stroke();
    if (st.roof === 'barn') { c.strokeStyle = '#e8e0d0'; c.lineWidth = 2.5; c.strokeRect(rx + 3, ry + 3, rw - 6, rh - 6); c.beginPath(); c.moveTo(rx + 3, ry + 3); c.lineTo(rx + rw - 3, ry + rh - 3); c.moveTo(rx + rw - 3, ry + 3); c.lineTo(rx + 3, ry + rh - 3); c.globalAlpha = .45; c.stroke(); c.globalAlpha = 1; }
    if ((b.kind === 'casa' || b.kind === 'cabana' || b.kind === 'estacao') && rw > 120) { const chx = rx + rw * (.25 + hash2(b.x, b.y, 4) * .5), chy = ry + rh * .22; c.fillStyle = '#5a4a44'; c.fillRect(chx - 7, chy - 10, 14, 18); c.fillStyle = '#2a2224'; c.fillRect(chx - 5, chy - 10, 10, 4); c.strokeStyle = '#141018'; c.lineWidth = 2; c.strokeRect(chx - 7, chy - 10, 14, 18); }
    if (st.church) { // torre do sino e cruz
      const tx = rx + rw / 2, ty = ry + rh * .2; c.fillStyle = '#6a6458'; c.fillRect(tx - 16, ty - 6, 32, 34); c.fillStyle = '#2a2a34'; c.beginPath(); c.moveTo(tx - 20, ty - 4); c.lineTo(tx, ty - 26); c.lineTo(tx + 20, ty - 4); c.closePath(); c.fill(); c.strokeStyle = '#141018'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#d8c890'; c.fillRect(tx - 1.8, ty - 44, 3.6, 20); c.fillRect(tx - 7, ty - 38, 14, 3.6); c.fillStyle = '#1a1e24'; c.beginPath(); c.arc(tx, ty + 12, 7, Math.PI, 0); c.fill(); c.fillRect(tx - 7, ty + 12, 14, 8);
    }
  } else if (st.roof === 'metal') {
    c.fillStyle = roof; c.fillRect(rx, ry, rw, rh); c.fillStyle = 'rgba(0,0,0,.18)'; for (let xx = rx; xx < rx + rw; xx += 7) c.fillRect(xx, ry, 2, rh); c.fillStyle = 'rgba(255,255,255,.1)'; for (let xx = rx + 3; xx < rx + rw; xx += 7) c.fillRect(xx, ry, 1.2, rh);
    for (let k = 0; k < 4; k++) { const h = hash2(b.x + k, b.y, 33); if (h < .55) { c.fillStyle = 'rgba(150,70,30,.35)'; c.beginPath(); c.ellipse(rx + hash2(b.x, b.y + k, 34) * rw, ry + hash2(b.x + k, b.y + k, 35) * rh, 10 + h * 14, 6 + h * 8, 0, 0, 7); c.fill(); } }
    c.fillStyle = 'rgba(200,230,240,.25)'; for (let k = 0; k < Math.floor(rw / 90); k++) c.fillRect(rx + 30 + k * 90, ry + rh * .3, 26, rh * .35); // telhas transparentes
  } else if (st.roof === 'dome') {
    c.fillStyle = roof; c.fillRect(rx, ry, rw, rh); c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(rx, ry + rh - 8, rw, 8);
    const dx = rx + rw / 2, dy = ry + rh / 2, R = Math.min(rw, rh) * .42; const gr = c.createRadialGradient(dx - R * .3, dy - R * .4, R * .1, dx, dy, R); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#a8aab4'); c.fillStyle = gr; c.beginPath(); c.arc(dx, dy, R, 0, 7); c.fill(); c.strokeStyle = '#141018'; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = '#2a2e38'; c.save(); c.translate(dx, dy); c.rotate(-.5); c.fillRect(-5, -R, 10, R); c.restore();
  } else { // laje
    c.fillStyle = roof; c.fillRect(rx, ry, rw, rh); c.fillStyle = shadeC(roof, -.2); c.fillRect(rx, ry, rw, 6); c.fillRect(rx, ry, 6, rh); c.fillRect(rx + rw - 6, ry, 6, rh); c.fillRect(rx, ry + rh - 6, rw, 6);
    c.fillStyle = 'rgba(0,0,0,.07)'; for (let k = 0; k < rw * rh / 250; k++) c.fillRect(rx + 6 + hash2(k, b.x, 1) * (rw - 12), ry + 6 + hash2(k, b.y, 2) * (rh - 12), 2, 2);
    if (st.ac) for (let k = 0; k < Math.max(1, Math.floor(rw / 110)); k++) { const ax = rx + 22 + k * 110 + hash2(k, b.x, 9) * 20, ay = ry + 14 + hash2(k, b.y, 8) * (rh - 50); c.fillStyle = '#9a9ea4'; c.fillRect(ax, ay, 30, 22); c.strokeStyle = '#141018'; c.lineWidth = 2; c.strokeRect(ax, ay, 30, 22); c.beginPath(); c.arc(ax + 15, ay + 11, 7, 0, 7); c.fillStyle = '#5a5e64'; c.fill(); c.stroke(); }
    if (st.cross) { const cx2 = rx + rw * .5, cy2 = ry + rh * .45; c.fillStyle = '#c83a3a'; c.fillRect(cx2 - 30, cy2 - 9, 60, 18); c.fillRect(cx2 - 9, cy2 - 30, 18, 60); const hx = rx + rw * .82, hy = ry + rh * .35, R = Math.min(34, rh * .3); c.strokeStyle = '#e8c840'; c.lineWidth = 3; c.beginPath(); c.arc(hx, hy, R, 0, 7); c.stroke(); c.fillStyle = '#e8c840'; c.font = `800 ${R}px Barlow,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('H', hx, hy + 2); }
    if (st.star) { const sx = rx + rw / 2, sy = ry + rh * .45, R = Math.min(rw, rh) * .2; c.fillStyle = 'rgba(232,224,200,.55)'; c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? R * .4 : R; c.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } c.closePath(); c.fill(); }
    if (st.police) { const px = rx + rw * .25, py = ry + rh * .3; c.fillStyle = '#141018'; c.fillRect(px - 16, py - 5, 32, 10); c.fillStyle = '#d83a3a'; c.fillRect(px - 14, py - 3, 13, 6); c.fillStyle = '#3a6ad8'; c.fillRect(px + 1, py - 3, 13, 6); }
    if (st.siren) { const px = rx + rw * .3, py = ry + rh * .35; c.fillStyle = '#e8e0d0'; c.beginPath(); c.arc(px, py, 10, 0, 7); c.fill(); c.fillStyle = '#d83a3a'; c.beginPath(); c.arc(px, py, 6, 0, 7); c.fill(); c.fillStyle = '#e8e0d0'; c.font = '800 20px Barlow,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('193', rx + rw * .66, ry + rh * .42); }
    if (st.antenna) { const ax = rx + rw * .78, ay = ry + rh * .3; c.strokeStyle = '#141018'; c.lineWidth = 2; c.beginPath(); c.moveTo(ax, ay + 14); c.lineTo(ax, ay - 30); c.stroke(); c.strokeStyle = '#9a9ea4'; c.lineWidth = 1.5; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(ax - 8 + k * 2, ay - 20 + k * 9); c.lineTo(ax + 8 - k * 2, ay - 20 + k * 9); c.stroke(); } c.fillStyle = '#c8ccd0'; c.beginPath(); c.ellipse(ax - 30, ay + 4, 13, 9, -.4, 0, 7); c.fill(); c.strokeStyle = '#141018'; c.stroke(); }
  }
  if (st.flag) { const fx = rx + rw - 22, fy2 = ry + 8; c.strokeStyle = '#141018'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(fx, fy2 + 40); c.lineTo(fx, fy2 - 26); c.stroke(); c.fillStyle = '#3a8a3a'; c.fillRect(fx, fy2 - 26, 22, 15); c.fillStyle = '#e8c840'; c.beginPath(); c.moveTo(fx + 11, fy2 - 24); c.lineTo(fx + 20, fy2 - 18.5); c.lineTo(fx + 11, fy2 - 13); c.lineTo(fx + 2, fy2 - 18.5); c.closePath(); c.fill(); c.fillStyle = '#2a4a8a'; c.beginPath(); c.arc(fx + 11, fy2 - 18.5, 3, 0, 7); c.fill(); }
  c.strokeStyle = '#141018'; c.lineWidth = 3; c.strokeRect(rx + 1.5, ry + 1.5, rw - 3, rh - 1.5);
  // --- placa
  if (st.sign) {
    const fs = st.sign.length > 22 ? 17 : st.sign.length > 14 ? 19 : 22; c.font = `800 ${fs}px Barlow,sans-serif`; if ('letterSpacing' in c) c.letterSpacing = '1.5px'; const tw = Math.min(cw - 8, c.measureText(st.sign).width + 22), sx = clamp((b.door === 's' ? doorX + TILE / 2 : cw / 2) - tw / 2, 4, cw - tw - 4), sy = rh - fs - 14;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(sx + 3, sy + 4, tw + 4, fs + 12); c.fillStyle = '#141018'; c.fillRect(sx - 2, sy - 2, tw + 4, fs + 12); c.fillStyle = st.kind === 'hospital' || b.kind === 'hospital' ? '#e8ecec' : '#24202a'; c.fillRect(sx, sy, tw, fs + 8);
    c.fillStyle = b.kind === 'hospital' ? '#c83a3a' : b.kind === 'bombeiros' ? '#e8c840' : b.kind === 'delegacia' ? '#8ab8e8' : '#e8dcc0'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(st.sign, sx + tw / 2, sy + fs / 2 + 4, tw - 12);
  }
  b.spr = cv; b.ox = b.x * TILE - OV; b.oy = b.y * TILE - LIFT;
}
// o telhado some quando você está dentro e fica meio transparente se você estiver atrás dele.
// Entra na lista de desenho pela base do prédio: quem está na frente da fachada aparece na frente.
function roofEntries(cx, cy, dt) {
  const out = []; if (!W.buildings) return out; const px = P.x, py = P.y, inside = INDOOR[tileAtPx(px, py)];
  for (const b of W.buildings) {
    const X = b.x * TILE, Y = b.y * TILE, Wd = b.w * TILE, Ht = b.h * TILE;
    if (X + Wd + 20 < cx || X - 20 > cx + VW || Y + Ht + 20 < cy || Y - LIFT - 60 > cy + VH) continue;
    const isIn = inside && px > X && px < X + Wd && py > Y && py < Y + Ht + 4, behind = px > X - 10 && px < X + Wd + 10 && py > Y - LIFT - 50 && py < Y + Ht - 6;
    const tgt = G.state !== 'play' && G.state !== 'title' ? 1 : isIn ? 0 : behind ? .35 : 1; b.a += (tgt - b.a) * Math.min(1, (dt || .016) * 7);
    if (b.a < .02) continue; if (!b.spr) buildRoof(b);
    out.push({ type: 'roof_spr', x: X + Wd / 2, y: Y + Ht - 1, b });
  }
  return out;
}
DRAW2.roof_spr = o => { const b = o.b; g.globalAlpha = b.a; g.drawImage(b.spr, b.ox, b.oy); g.globalAlpha = 1; };

/* ------------------------------ móveis ------------------------------ */
OBJ.movel = { r: 10 };
function furnishBuildings() {
  if (!W.buildings) return; const rng = mulberry32(4242);
  for (const b of W.buildings) {
    const K = BKIND[b.kind]; if (!K || !K.furn) continue;
    const inside = (tx, ty) => tx > b.x && ty > b.y && tx < b.x + b.w - 1 && ty < b.y + b.h - 1 && (tileAt(tx, ty) === T.FLOOR || tileAt(tx, ty) === T.TILED);
    // o que já existe lá dentro (armários, baús, estações, pessoas) ocupa o próprio bloco
    const conts = [], busy = new Set();
    queryObjs((b.x + b.w / 2) * TILE, (b.y + b.h / 2) * TILE, Math.max(b.w, b.h) * TILE, o => { if (o.dead || o.type === 'movel') return; const tx = Math.floor(o.x / TILE), ty = Math.floor(o.y / TILE); if (tx < b.x || ty < b.y || tx >= b.x + b.w || ty >= b.y + b.h) return; conts.push([tx, ty]); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) busy.add((tx + i) + ',' + (ty + j)); });
    const m = Math.floor((b.door === 'n' || b.door === 's' ? b.w : b.h) / 2);
    const door = b.door === 's' ? [b.x + m, b.y + b.h - 2] : b.door === 'n' ? [b.x + m, b.y + 1] : b.door === 'e' ? [b.x + b.w - 2, b.y + m] : [b.x + 1, b.y + m];
    for (let k = 0; k < Math.max(b.w, b.h); k++) { if (b.door === 's') busy.add((b.x + m) + ',' + (b.y + b.h - 1 - k)); if (b.door === 'n') busy.add((b.x + m) + ',' + (b.y + k)); if (b.door === 'e') busy.add((b.x + b.w - 1 - k) + ',' + (b.y + m)); if (b.door === 'w') busy.add((b.x + k) + ',' + (b.y + m)); }
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) busy.add((door[0] + i) + ',' + (door[1] + j));
    const blocked = new Set(conts.map(c => c[0] + ',' + c[1]));
    // a porta ainda alcança cada armário, baú e estação?
    const allReachable = () => {
      const seen = new Set([door.join(',')]), q = [door];
      while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || blocked.has(k) || !inside(nx, ny)) continue; seen.add(k); q.push([nx, ny]); } }
      return conts.every(([cx2, cy2]) => !inside(cx2, cy2) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((cx2 + dx) + ',' + (cy2 + dy))));
    };
    const tilesOf = (x, y, k) => { const bx = FURN_BOX[k]; if (!bx) return []; const out = []; for (let ty = Math.floor((y + bx[3] - bx[1] + 3) / TILE); ty <= Math.floor((y + bx[3] + bx[1] - 3) / TILE); ty++) for (let tx = Math.floor((x - bx[0] + 3) / TILE); tx <= Math.floor((x + bx[0] - 3) / TILE); tx++) out.push(tx + ',' + ty); return out; };
    const place = (tx, ty, k) => {
      const x = (tx + .5) * TILE, y = (ty + .5) * TILE + (k === 'tapete' ? -16 : 0), ts = tilesOf(x, y, k);
      if (ts.some(t => busy.has(t) || blocked.has(t))) return false;
      ts.forEach(t => blocked.add(t)); if (ts.length && !allReachable()) { ts.forEach(t => blocked.delete(t)); return false; }
      const o = mkObj('movel', x, y, { k, v: rng(), deco: 1 }); o.solid = !!FURN_BOX[k]; return true;
    };
    const free = []; for (let j = 1; j < b.h - 1; j++) for (let i = 1; i < b.w - 1; i++) { const tx = b.x + i, ty = b.y + j; if (!busy.has(tx + ',' + ty) && inside(tx, ty)) free.push([tx, ty]); }
    if (b.kind === 'escola') { // carteiras em grade, com corredores
      for (const [tx, ty] of free) if ((tx - b.x) % 2 === 1 && (ty - b.y) % 2 === 1) place(tx, ty, 'carteira');
      for (const [tx, ty] of free) if (tileAt(tx, ty - 1) === T.WALL && place(tx, ty, 'quadro')) break;
      continue;
    }
    if (b.kind === 'igreja') { // bancos em fileiras, com o corredor do meio livre até o altar
      const mid = b.x + m; for (const [tx, ty] of free) if (ty >= b.y + 3 && ty <= b.y + b.h - 3 && tx !== mid) place(tx, ty, 'banco_igreja');
      for (let k = -1; k <= 1; k++) busy.delete((mid + k) + ',' + (b.y + 1)); // o altar fica no fim do corredor, sem fechar a passagem
      place(mid, b.y + 1, 'altar');
      continue;
    }
    for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
    let n = Math.min(K.furn.length, Math.ceil(free.length / 3)), fi = 0; const used = new Set();
    for (const [tx, ty] of free) {
      if (fi >= n) break; if (used.has(tx + ',' + ty)) continue; const k = K.furn[fi % K.furn.length];
      if (k === 'quadro' && tileAt(tx, ty - 1) !== T.WALL) continue;
      if (!place(tx, ty, k)) continue;
      fi++; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) used.add((tx + i) + ',' + (ty + j));
    }
  }
}
const FURN = {
  cama_m(x, y, v) { shadow(x, y + 16, 18, 5); rr(x - 15, y - 22, 30, 42, 3, '#6e4a2c', OL); rr(x - 12, y - 18, 24, 36, 3, ['#d8d0c0', '#a8b8c8', '#c8a8a8'][(v * 3) | 0], OL); rr(x - 10, y - 17, 20, 9, 3, '#f0ece4', OL); rr(x - 12, y - 4, 24, 22, 3, ['#4a6a8a', '#8a4a4a', '#5a7a4a'][(v * 3) | 0], OL); },
  mesa(x, y) { shadow(x, y + 12, 18, 5); for (const [dx, dy] of [[-20, 0], [20, 0], [0, -16], [0, 16]]) rr(x + dx - 5, y + dy - 5, 10, 10, 2, '#5a3a22', OL); rr(x - 15, y - 11, 30, 22, 3, '#8a6440', OL); circ(x - 4, y - 2, 3.5, '#e8e0d0', OL); },
  sofa(x, y, v) { shadow(x, y + 12, 22, 5); const c = ['#6a3a3a', '#3a5a6a', '#5a6a3a'][(v * 3) | 0]; rr(x - 22, y - 12, 44, 22, 4, shadeC(c.replace('#', '#'), -.2), OL); rr(x - 18, y - 6, 17, 13, 3, c, OL); rr(x + 1, y - 6, 17, 13, 3, c, OL); },
  tapete(x, y, v) { const c = ['#7a3a3a', '#3a5a4a', '#5a4a7a'][(v * 3) | 0]; rr(x - 26, y, 52, 34, 3, c); g.strokeStyle = 'rgba(232,210,160,.5)'; g.lineWidth = 2; g.strokeRect(x - 22, y + 4, 44, 26); g.fillStyle = 'rgba(232,210,160,.35)'; g.fillRect(x - 8, y + 12, 16, 10); },
  fogao(x, y) { shadow(x, y + 12, 13, 4); rr(x - 12, y - 14, 24, 24, 2, '#e4e0d8', OL); for (const [dx, dy] of [[-5, -7], [5, -7], [-5, 2], [5, 2]]) circ(x + dx, y + dy, 3.4, '#34363e', OL); },
  geladeira(x, y) { shadow(x, y + 13, 13, 4); rr(x - 12, y - 26, 24, 38, 3, '#e8e8e4', OL); seg([x - 12, y - 10, x + 12, y - 10], 2, OL); seg([x + 7, y - 20, x + 7, y - 14], 2, '#8a8e96'); seg([x + 7, y - 6, x + 7, y + 4], 2, '#8a8e96'); },
  vaso(x, y) { shadow(x, y + 8, 9, 3); rr(x - 7, y - 4, 14, 12, 2, '#a8583a', OL); circ(x - 4, y - 10, 6, '#4a7a3a', OL); circ(x + 4, y - 12, 6, '#5a8a44', OL); circ(x, y - 17, 5, '#4a7a3a', OL); },
  feno(x, y) { shadow(x, y + 12, 18, 5); rr(x - 17, y - 13, 34, 24, 4, '#c8a858', OL); g.strokeStyle = 'rgba(120,90,40,.6)'; g.lineWidth = 1.5; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x - 14, y - 8 + k * 4); g.lineTo(x + 14, y - 9 + k * 4); g.stroke(); } seg([x - 6, y - 13, x - 6, y + 11], 2, '#7a5a2a'); seg([x + 6, y - 13, x + 6, y + 11], 2, '#7a5a2a'); },
  barril(x, y, v) { shadow(x, y + 12, 12, 4); const c = ['#3a5a7a', '#8a3a2a', '#5a6a3a'][(v * 3) | 0]; rr(x - 11, y - 18, 22, 28, 4, c, OL); ell(x, y - 18, 11, 4, shadeC(c, .2), OL); seg([x - 11, y - 8, x + 11, y - 8], 2, 'rgba(0,0,0,.4)'); seg([x - 11, y + 2, x + 11, y + 2], 2, 'rgba(0,0,0,.4)'); },
  caixotes(x, y) { shadow(x, y + 13, 18, 5); rr(x - 18, y - 6, 20, 18, 2, '#86643c', OL); rr(x + 1, y - 8, 17, 20, 2, '#7a5a34', OL); rr(x - 10, y - 24, 20, 18, 2, '#96744e', OL); seg([x - 18, y + 3, x + 2, y + 3], 1.5, 'rgba(0,0,0,.35)'); },
  pneus(x, y) { for (let k = 0; k < 3; k++) { ell(x, y + 6 - k * 8, 14, 7, '#26262a', OL); ell(x, y + 6 - k * 8, 6, 3, '#4a4a50'); } },
  bancada_ferr(x, y) { shadow(x, y + 12, 22, 5); rr(x - 22, y - 12, 44, 22, 2, '#6a5038', OL); rr(x - 16, y - 9, 10, 6, 1, '#b0b4c0', OL); seg([x - 2, y - 7, x + 10, y - 3], 3, '#c83a3a'); circ(x + 14, y + 2, 4, '#8a8e96', OL); },
  gondola(x, y) { shadow(x, y + 12, 24, 5); rr(x - 26, y - 12, 52, 22, 2, '#9a9ea4', OL); const cs = ['#c83a3a', '#e0c03a', '#3a7ab8', '#5a9a3a', '#e8e0d0', '#c8843a']; for (let r = 0; r < 2; r++) for (let k = 0; k < 8; k++) rr(x - 24 + k * 6, y - 10 + r * 10, 5, 8, 1, cs[(k + r * 3) % 6]); },
  caixa_reg(x, y) { shadow(x, y + 12, 20, 5); rr(x - 20, y - 10, 40, 20, 2, '#5a5e64', OL); rr(x + 4, y - 18, 14, 11, 2, '#34363e', OL); rr(x + 6, y - 16, 10, 5, 1, '#6fe07a'); },
  mesa_escr(x, y) { shadow(x, y + 12, 20, 5); rr(x - 20, y - 11, 40, 20, 2, '#7a5a3a', OL); rr(x - 15, y - 8, 12, 9, 1, '#e8e4dc', OL); rr(x - 12, y - 6, 12, 9, 1, '#f4f0e8', OL); rr(x + 4, y - 9, 13, 9, 1, '#34363e', OL); rr(x - 6, y + 10, 12, 8, 2, '#3a3a42', OL); },
  computador(x, y) { shadow(x, y + 10, 15, 4); rr(x - 15, y - 8, 30, 16, 2, '#6a6e76', OL); rr(x - 9, y - 22, 18, 14, 2, '#34363e', OL); rr(x - 7, y - 20, 14, 10, 1, '#3a7ab8'); },
  prateleira(x, y) { shadow(x, y + 12, 16, 5); rr(x - 16, y - 26, 32, 38, 2, '#8a8e96', OL); for (const sy of [-16, -4, 8]) seg([x - 14, y + sy, x + 14, y + sy], 2, OL); for (let k = 0; k < 6; k++) rr(x - 13 + k * 4.4, y - 25 + (k % 3) * 12, 3.6, 8, .6, ['#c8ccd0', '#86963a', '#c4843a'][k % 3]); },
  arquivo(x, y) { shadow(x, y + 12, 11, 4); rr(x - 10, y - 22, 20, 34, 2, '#6a7078', OL); for (let k = 0; k < 3; k++) { seg([x - 10, y - 12 + k * 10, x + 10, y - 12 + k * 10], 1.5, OL); rr(x - 4, y - 19 + k * 10, 8, 2.5, 1, '#c8ccd0'); } },
  cela(x, y) { for (let k = 0; k < 7; k++) seg([x - 20 + k * 6.6, y - 24, x - 20 + k * 6.6, y + 12], 2.5, '#5a5e64'); seg([x - 22, y - 24, x + 22, y - 24], 3, OL); seg([x - 22, y + 12, x + 22, y + 12], 3, OL); },
  maca(x, y) { shadow(x, y + 16, 16, 5); rr(x - 13, y - 22, 26, 40, 3, '#c8ccd0', OL); rr(x - 10, y - 19, 20, 34, 2, '#f0f4f4', OL); rr(x - 8, y - 18, 16, 7, 2, '#ffffff', OL); rr(x - 10, y - 2, 20, 16, 2, '#7aa8c8', OL); seg([x + 18, y - 26, x + 18, y + 10], 2, '#8a8e96'); rr(x + 14, y - 30, 8, 9, 2, '#c8e0e8', OL); },
  banco_igreja(x, y) { shadow(x, y + 8, 20, 4); rr(x - 20.5, y - 8, 41, 13, 2, '#5a3a22', OL); rr(x - 20.5, y - 11, 41, 5, 2, '#4a2e1a', OL); },
  altar(x, y) { shadow(x, y + 10, 24, 5); rr(x - 24, y - 12, 48, 20, 2, '#e8e0d0', OL); rr(x - 24, y - 12, 48, 6, 2, '#8a2a2a', OL); for (const dx of [-14, 14]) { rr(x + dx - 2, y - 24, 4, 12, 1, '#f0ead8', OL); circ(x + dx, y - 27, 2.5, '#f0c060'); } },
  beliche(x, y) { shadow(x, y + 16, 16, 5); rr(x - 14, y - 22, 28, 40, 2, '#4a5040', OL); rr(x - 11, y - 18, 22, 32, 2, '#6a7458', OL); seg([x - 11, y - 2, x + 11, y - 2], 2.5, OL); rr(x - 9, y - 17, 18, 6, 2, '#c8c8b8', OL); },
  carteira(x, y) { shadow(x, y + 10, 12, 4); rr(x - 12, y - 10, 24, 13, 2, '#c8a46a', OL); rr(x - 7, y + 5, 14, 9, 2, '#3a6a8a', OL); },
  quadro(x, y) { rr(x - 34, y - 34, 68, 22, 2, '#2a4a34', OL); g.strokeStyle = 'rgba(232,232,220,.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - 26, y - 27); g.lineTo(x - 4, y - 27); g.moveTo(x - 26, y - 21); g.lineTo(x + 10, y - 21); g.stroke(); },
};
DRAW2.movel = o => { const f = FURN[o.k]; if (f) { g.lineWidth = 2; f(o.x, o.y, o.v || 0); } };
