'use strict';
/* ==========================================================================
   COLISÃO POR FORMATO
   Antes tudo era um círculo. Agora cada coisa sólida tem o formato do desenho:
   veículos, vagões, móveis, armários, bancadas e caixas são retângulos que giram
   junto com o objeto (a "pegada" no chão, não a parte alta do desenho). O resto
   continua círculo, com o tamanho certo para a escala de cada pedra e árvore.
   Tiros e ácido param nas coisas sólidas, e a caminhonete bate com o corpo todo.
   ========================================================================== */
// [meia-largura, meia-altura, deslocamento x, deslocamento y] no referencial do objeto
const SHAPES = {
  car: [36, 18, 0, 0], wagon: [55, 21, 0, 0], onibus: [47, 16, 0, 0], caminhao: [49, 17, 0, 0], heli: [58, 17, -22, 0],
  cabinet: [15, 9, 0, 5], locker: [15, 9, 0, 5], crate: [14, 11, 0, 5], bau: [15, 9, 0, 5], estante: [17, 9, 0, 5],
  bancada: [18, 10, 0, 3], costura: [18, 10, 0, 3], quimica: [18, 10, 0, 3], armeiro: [18, 10, 0, 3], fornalha: [18, 9, 0, 4],
  logpile: [20, 11, 0, 2], gerador: [24, 12, 0, 1], pesquisa: [19, 8, 0, 3], radio2: [18, 8, 0, 2], barraca: [21, 9, 0, 4],
  muro: [20, 12, 0, 1], coletor: [13, 10, 0, 2], tv: [12, 8, 0, 3], pump: [10, 8, 0, 5],
};
// móveis (por tipo de móvel); os que não estão aqui são planos e não bloqueiam (tapete, quadro)
const FURN_BOX = {
  cama_m: [15, 20, 0, -1], mesa: [15, 11, 0, 0], sofa: [22, 10, 0, -1], fogao: [12, 10, 0, -1], geladeira: [12, 8, 0, 4], vaso: [7, 5, 0, 3],
  feno: [17, 12, 0, -1], barril: [11, 8, 0, 2], caixotes: [18, 10, 0, 2], pneus: [14, 8, 0, 3], bancada_ferr: [22, 11, 0, -1], gondola: [26, 11, 0, -1],
  caixa_reg: [20, 10, 0, 0], mesa_escr: [20, 10, 0, -1], computador: [15, 8, 0, 0], prateleira: [16, 8, 0, 4], arquivo: [10, 8, 0, 4], cela: [21, 4, 0, -6],
  maca: [13, 20, 0, -2], banco_igreja: [19, 6, 0, -2], altar: [24, 10, 0, -2], beliche: [14, 20, 0, -2], carteira: [12, 8, 0, -1],
};
const CAR_BOX = [33, 14, 0, 0];
function shapeOf(o) {
  if (o.box !== undefined) return o.box;
  o.box = o.type === 'movel' ? (FURN_BOX[o.k] || null) : (SHAPES[o.type] || null);
  return o.box;
}
// empurra um círculo (x, y, r) para fora da caixa do objeto; devolve a nova posição ou null se não encosta
function pushOutBox(ex, ey, er, o, b, ang) {
  const a = ang !== undefined ? ang : (o.rot || 0), c = Math.cos(a), s = Math.sin(a);
  const cx = o.x + b[2] * c - b[3] * s, cy = o.y + b[2] * s + b[3] * c;
  const dx = ex - cx, dy = ey - cy, lx = dx * c + dy * s, ly = -dx * s + dy * c;
  const qx = clamp(lx, -b[0], b[0]), qy = clamp(ly, -b[1], b[1]), nx = lx - qx, ny = ly - qy, d = Math.hypot(nx, ny);
  if (d >= er) return null;
  let px, py;
  if (d > 1e-4) { px = qx + nx / d * er; py = qy + ny / d * er; }
  else { const ox = b[0] - Math.abs(lx), oy = b[1] - Math.abs(ly); if (ox < oy) { px = (lx < 0 ? -1 : 1) * (b[0] + er); py = ly; } else { px = lx; py = (ly < 0 ? -1 : 1) * (b[1] + er); } }
  return [cx + px * c - py * s, cy + px * s + py * c];
}
// o círculo (x, y, r) encosta nesse objeto?
function shapeHit(o, x, y, r) { const b = shapeOf(o); return b ? !!pushOutBox(x, y, r, o, b) : dist(x, y, o.x, o.y) < r + o.r; }

/* ---------------------------- personagens ---------------------------- */
moveEnt = function (e, dx, dy, ghost) {
  if (e === G.car) return moveCar(e, dx, dy);
  const r = e.r * .75, mob = !!(e.def && ENEMIES[e.type]); e.hitWall = false;
  const bl = (x, y) => boxSolid(x, y, r) || (mob && boxDoor(x, y, r));
  if (!bl(e.x + dx, e.y)) e.x += dx; else { e.hitWall = true; if (mob) e.wallHit = [e.x + Math.sign(dx) * (r + 8), e.y]; }
  if (!bl(e.x, e.y + dy)) e.y += dy; else { e.hitWall = true; if (mob) e.wallHit = [e.x, e.y + Math.sign(dy) * (r + 8)]; }
  if (ghost) return;
  const er = e.r * .8;
  for (let pass = 0; pass < 2; pass++) {
    let moved = false;
    queryObjs(e.x, e.y, e.r + 90, o => {
      if (!o.solid || o.dead || o === e) return; let np = null; const b = shapeOf(o);
      if (b) np = pushOutBox(e.x, e.y, er, o, b);
      else { const d = dist(e.x, e.y, o.x, o.y), m = e.r + o.r; if (d < m && d > .01) np = [e.x + (e.x - o.x) / d * (m - d), e.y + (e.y - o.y) / d * (m - d)]; }
      if (!np) return; if (!boxSolid(np[0], np[1], r)) { e.x = np[0]; e.y = np[1]; moved = true; }
      if (o.type === 'barricada' || o.type === 'muro') e.blockObj = o; e.hitObj = true;
    });
    if (!moved) break;
  }
  // a caminhonete parada é sólida como um carro; andando, só empurra (para atropelar continuar funcionando)
  const c = G.car; if (c && e !== c && !(e === P && P.driving)) {
    if (P.driving && Math.abs(c.spd) > 30) { if (dist(e.x, e.y, c.x, c.y) < e.r + c.r - 4) { const d = dist(e.x, e.y, c.x, c.y) || 1; e.x += (e.x - c.x) / d * 3; e.y += (e.y - c.y) / d * 3; } }
    else { const np = pushOutBox(e.x, e.y, er, c, CAR_BOX, c.ang); if (np && !boxSolid(np[0], np[1], r)) { e.x = np[0]; e.y = np[1]; e.hitObj = true; } }
  }
  e.x = clamp(e.x, 20, WORLD_W - 20); e.y = clamp(e.y, 20, WORLD_H - 20);
};

/* ---------------------------- caminhonete ---------------------------- */
// o corpo da caminhonete é medido com três círculos ao longo dela (frente, meio e traseira)
function carBlocked(x, y, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  for (const k of [-21, 0, 21]) {
    const px = x + c * k, py = y + s * k; if (boxSolid(px, py, 12)) return 'wall'; let hit = null;
    queryObjs(px, py, 100, o => { if (hit || !o.solid || o.dead || o === G.car) return; if (shapeHit(o, px, py, 13)) hit = o; });
    if (hit) return hit;
  }
  return null;
}
function moveCar(c, dx, dy) {
  c.hitWall = false;
  // virar contra uma parede não enfia a caminhonete nela
  if (c.prevAng !== undefined && c.prevAng !== c.ang && carBlocked(c.x, c.y, c.ang) && !carBlocked(c.x, c.y, c.prevAng)) { c.ang = c.prevAng; }
  if (carBlocked(c.x, c.y, c.ang)) { c.x += dx; c.y += dy; } // já estava presa: deixa sair
  else {
    const h = carBlocked(c.x + dx, c.y + dy, c.ang);
    if (!h) { c.x += dx; c.y += dy; }
    else { if (!carBlocked(c.x + dx, c.y, c.ang)) c.x += dx * .6; else if (!carBlocked(c.x, c.y + dy, c.ang)) c.y += dy * .6; if (h === 'wall') c.hitWall = true; else c.hitObj = true; }
  }
  c.x = clamp(c.x, 40, WORLD_W - 40); c.y = clamp(c.y, 40, WORLD_H - 40);
}
const _updateCar = updateCar;
updateCar = function (dt) { if (G.car) G.car.prevAng = G.car.ang; return _updateCar(dt); };

/* ------------------------- tiros e projéteis ------------------------- */
const PROJ_SKIP = { poste: 1, grave: 1, npc: 1 };
function projHitsObj(p) {
  let hit = null;
  queryObjs(p.x, p.y, 100, o => { if (hit || !o.solid || o.dead || PROJ_SKIP[o.type]) return; const b = shapeOf(o); if (b ? pushOutBox(p.x, p.y, 2, o, b) : dist(p.x, p.y, o.x, o.y) < o.r * .8) hit = o; });
  if (!hit && G.car && !P.driving && pushOutBox(p.x, p.y, 2, G.car, CAR_BOX, G.car.ang)) hit = G.car;
  return hit;
}

/* ---------------------- tamanho certo de cada coisa ---------------------- */
const _genWorld = genWorld;
genWorld = function (seed) {
  _genWorld(seed);
  for (const o of W.objs) {
    if (o.s && o.type === 'rock') o.r = 15 * o.s;
    else if (o.s && o.type === 'tree') o.r = 9 * Math.min(o.s, 1.15);
  }
};
