'use strict';
/* ==========================================================================
   SERRA SANGRENTA 2.0 · SISTEMAS NOVOS
   Receitas descobertas explorando, livros, clima (chuva e neblina), canteiros,
   iscas, adrenalina, o rádio da estação de água e o Seu Dito.
   Carrega por último e se liga ao jogo envolvendo as funções originais.
   ========================================================================== */
NPC_NAME.dito = 'Seu Dito';

/* ----------------------------- estado novo ----------------------------- */
const freshV2 = () => ({ weather: 'limpo', wT: 240, wk: 0, hortas: {}, seen2: {}, buffT: 0, qt: 0, welcome: 1 });
function ensureV2() { if (!G.learned) G.learned = {}; if (!G.v2) G.v2 = freshV2(); }
const _resetGame = resetGame;
resetGame = function () { _resetGame(); G.learned = {}; G.v2 = freshV2(); G.lures = []; P.buffT = 0; };
const _loadGame = loadGame;
loadGame = function (slot) {
  if (!_loadGame(slot)) return false;
  let d = null; try { d = JSON.parse(localStorage.getItem(slotKey(G.slot))); } catch (e) { }
  if (d && d.v2) { G.learned = d.v2.learned || {}; G.v2 = Object.assign(freshV2(), d.v2.state || {}); }
  else { // save da versão 1: tudo o que já se fazia continua liberado
    G.learned = {}; for (const t of OLD_TAGS) G.learned[t] = 1; G.evlog = G.evlog || {}; G.evlog.lesson = OLD_TAGS.length; G.v2 = freshV2(); G.v2.welcome = 0;
  }
  if (G.diff === 'aventura') for (const t in LESSONS) G.learned[t] = 1;
  return true;
};
const _saveGame = saveGame;
saveGame = function () {
  const ok = _saveGame(); if (!ok) return ok;
  try { const k = slotKey(G.slot || 1), d = JSON.parse(localStorage.getItem(k)); d.v2 = { learned: G.learned, state: G.v2 }; localStorage.setItem(k, JSON.stringify(d)); } catch (e) { }
  return ok;
};
const _setupAdventure = setupAdventure;
setupAdventure = function () { _setupAdventure(); ensureV2(); for (const t in LESSONS) G.learned[t] = 1; };

/* ------------------------- receitas e lições ------------------------- */
function recipeKnown(r) { return !r.learn || DEV.craft || !!(G.learned && G.learned[r.learn]); }
function recipeStats() { const all = RECIPES.filter(r => !r.flag || G.flags[r.flag]); return `${all.filter(recipeKnown).length}/${all.length} receitas conhecidas`; }
function lockedRows(st) {
  const by = {}; for (const r of RECIPES) if (r.st === st && (!r.flag || G.flags[r.flag]) && !recipeKnown(r)) (by[r.learn] = by[r.learn] || []).push(r);
  const ks = Object.keys(by); if (!ks.length) return '';
  return `<div class="hint" style="padding:10px 6px 4px">Ainda não descobertas:</div>` + ks.map(k => `<div class="rrow" style="opacity:.6;cursor:default">${ih('u_lock')}<span><b>${by[k].length} receita${by[k].length > 1 ? 's' : ''}: ${LESSONS[k].n}</b><small>${LESSONS[k].hint}</small></span></div>`).join('');
}
function learnLesson(tag, why) {
  ensureV2(); if (!LESSONS[tag] || G.learned[tag]) return false; G.learned[tag] = 1;
  const names = [...new Set(lessonRecipes(tag).map(r => ITEMS[r.out].n))];
  toast(`${why}: ${LESSONS[tag].n}. Agora você sabe fazer ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` e mais ${names.length - 3}` : ''}.`, 'u_book', true);
  sfx('level'); addXP(20); burst(P.x, P.y, '#c8a84e', 16, 120); G.evlog = G.evlog || {}; G.evlog.lesson = Object.keys(G.learned).filter(k => LESSONS[k]).length - 1; qev('lesson'); if (tag === 'horta') startQuest('s_horta'); G.uiDirty = true; return true;
}
function readBook(id) {
  const it = ITEMS[id]; ensureV2();
  if (G.learned[it.learn]) { toast(`Você já sabe tudo o que ${it.n} ensina.`, id); return; }
  invRemove(id, 1); learnLesson(it.learn, 'Você leu ' + it.n);
}
// pegar um material novo pela primeira vez dá a ideia de receitas com ele
const _invAdd = invAdd;
invAdd = function (id, n, dur) {
  _invAdd(id, n, dur);
  const t = ING_LESSON[id]; if (t && G.state === 'play' && G.learned && !G.learned[t]) setTimeout(() => { if (invCount(id) > 0) learnLesson(t, 'Ideia! Ao ver ' + ITEMS[id].n + ', você entendeu'); }, 350);
};
const _useItem = useItem;
useItem = function (id) {
  const it = ITEMS[id]; if (!it || invCount(id) <= 0) return;
  if (it.use === 'read') return readBook(id);
  if (it.use === 'map') { for (const k in POIS) if (!G.pois[k]) G.pois[k] = 1; invRemove(id, 1); toast('Todos os lugares do vale foram marcados no seu mapa (M).', 'mapa_regiao', true); sfx('quest'); return; }
  if (it.buff) { invRemove(id, 1); P.hp = Math.min(maxHp(), P.hp + (it.hp || 0)); P.stam = maxSt(); P.buffT = 40; toast('Adrenalina! Fôlego infinito e pernas rápidas por 40 segundos.', id, true); sfx('heal'); addText(P.x, P.y - 30, '+' + (it.hp || 0), '#6fae72'); G.uiDirty = true; return; }
  return _useItem(id);
};

/* ------------------------------- clima ------------------------------- */
const WEATHER = {
  limpo: { n: 'Céu limpo', msg: 'O céu abriu.' },
  chuva: { n: 'Chuva', msg: 'Começou a chover. As criaturas ouvem menos e o coletor enche mais rápido.' },
  neblina: { n: 'Neblina', msg: 'Uma neblina pesada desceu sobre o vale. Ninguém enxerga longe. Nem elas.' },
};
function nextWeather() {
  const r = Math.random(), night = isNight(), w = r < (night ? .45 : .6) ? 'limpo' : r < (night ? .72 : .86) ? 'chuva' : 'neblina';
  if (w !== G.v2.weather) { G.v2.weather = w; toast(WEATHER[w].msg, w === 'chuva' ? 'u_drop' : w === 'neblina' ? 'u_eye' : 'u_sun'); }
  G.v2.wT = w === 'limpo' ? rand(240, 520) : rand(120, 300);
}
// as criaturas percebem você mais tarde com chuva, neblina ou roupa camuflada
function senseMul() { if (!G.v2) return 1; const w = G.v2.weather, k = G.v2.wk || 0; let m = 1 - (w === 'chuva' ? .22 : w === 'neblina' ? .38 : 0) * k; if (P.armor && ITEMS[P.armor].camo) m *= .72; return m; }
const DROPS = []; for (let i = 0; i < 160; i++) DROPS.push({ x: Math.random(), y: Math.random(), s: .7 + Math.random() * .6 });
function drawWeather(dt) {
  if (!G.v2) return; const k = G.v2.wk || 0; if (k <= .01) return;
  const W2 = g.canvas.width, H2 = g.canvas.height; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  if (G.v2.weather === 'chuva') {
    g.fillStyle = `rgba(18,26,44,${.22 * k})`; g.fillRect(0, 0, W2, H2);
    g.strokeStyle = `rgba(180,200,235,${.6 * k})`; g.lineWidth = 1.7; g.beginPath();
    for (let i = 0, n = DROPS.length * GFX.rain | 0; i < n; i++) { const d = DROPS[i]; d.y += dt * 1.6 * d.s; d.x -= dt * .18 * d.s; if (d.y > 1) { d.y -= 1; d.x = Math.random() * 1.2; } if (d.x < -.1) d.x += 1.2; const x = d.x * W2, y = d.y * H2; g.moveTo(x, y); g.lineTo(x - 5 * d.s, y + 18 * d.s); }
    g.stroke();
  } else if (G.v2.weather === 'neblina') {
    const n = darkness(), gr = g.createRadialGradient(W2 / 2, H2 / 2, Math.min(W2, H2) * .16, W2 / 2, H2 / 2, Math.max(W2, H2) * .62);
    const c = n > .5 ? '58,60,70' : '196,200,206'; gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(.55, `rgba(${c},${.45 * k})`); gr.addColorStop(1, `rgba(${c},${.86 * k})`);
    g.fillStyle = gr; g.fillRect(0, 0, W2, H2);
  }
  g.restore();
}
const _draw = draw;
draw = function (dt) { _draw(dt); if (G.state === 'play' && !CS.on) try { drawWeather(Math.min(dt || 0, .05)); } catch (e) { } };

/* ------------------------------ iscas ------------------------------ */
// enquanto uma isca fede por perto, a criatura "enxerga" a isca no lugar de você
const _updateEnemy = updateEnemy;
updateEnemy = function (e, dt) {
  const L = G.lures; if (!L || !L.length || e.dead || e.def.boss || e.def.patch || e.def.reaper) return _updateEnemy(e, dt);
  let best = null, bd = 600; for (const l of L) { const d = dist(e.x, e.y, l.x, l.y); if (d < bd) { bd = d; best = l; } }
  if (!best) return _updateEnemy(e, dt);
  const px = P.x, py = P.y; P.x = best.x; P.y = best.y; G._lure = 1; if (e.state === 'idle') e.alert = true;
  try { _updateEnemy(e, dt); } finally { P.x = px; P.y = py; G._lure = 0; }
};
const _hurtPlayer = hurtPlayer;
hurtPlayer = function (dmg, ang, kb, src) { if (G._lure) return; return _hurtPlayer(dmg, ang, kb, src); };

/* ----------------------------- canteiros ----------------------------- */
const GROW_H = 14; // horas de jogo até a colheita
const hKey = o => Math.round(o.x) + ',' + Math.round(o.y);
const hortaProg = o => { ensureV2(); const t0 = G.v2.hortas[hKey(o)]; return t0 === undefined ? 0 : clamp((G.time - t0) / GROW_H, 0, 1); };
const _placeObj = placeObj;
placeObj = function (it) { _placeObj(it); if (it.id === 'horta') { ensureV2(); const o = G.placed[G.placed.length - 1]; if (o) G.v2.hortas[hKey(o)] = G.time; hint('Canteiro plantado. Volte em umas 14 horas para colher.'); } };
function harvest(o) {
  const p = hortaProg(o); if (p < 1) { hint(`Ainda crescendo: ${Math.floor(p * 100)}%.`); return; }
  give('legume', randi(2, 3)); give('milho', randi(1, 2)); if (Math.random() < .5) give('semente', 1);
  G.v2.hortas[hKey(o)] = G.time; addXP(8); sfx('pick'); burst(o.x, o.y, '#6a9a3a', 12, 100); qev('harvest');
}

/* -------------------- rádio da estação de tratamento -------------------- */
function useRadio2(o) {
  if (G.flags.radio2) { showDialog([['radio', '...chhh... Abrigo São Bento na escuta. As crianças estão bem. Câmbio.']]); return; }
  if (invCount('pilha') < 3 || invCount('fio') < 2) { hint('O rádio está morto. Precisa de 3 Pilhas e 2 Fios de Cobre.'); return; }
  startAction('Consertando o rádio...', 2.4, () => {
    invRemove('pilha', 3); invRemove('fio', 2); G.flags.radio2 = 1; sfx('quest');
    showDialog([
      ['nar', 'Você troca as pilhas, emenda o fio de cobre nos bornes e gira o botão. Chiado. Depois, uma voz de mulher, cansada.'],
      ['radio', '...estação de água, aqui é o Abrigo São Bento, câmbio. Tem alguém aí? Câmbio.'],
      ['eu', 'Aqui é {nome}. Estou na estação de água. Procuro as crianças da escola Alto da Serra.'],
      ['radio', 'Aqui é a professora Vera. Estão aqui. As vinte e três. O barco da Defesa Civil desceu o rio na semana do Tremor e atravessou a serra pelo leito, antes de explodirem os túneis.'],
      ['radio', 'Espera... tem uma menina aqui pulando do lado do rádio. Fala, Bia.'],
      ['radio', '"Avisa meu vô que eu tô bem! E fala pra ele trocar a linha da vara pequena, ele sempre esquece!"'],
      ['radio', 'Quando o vale estiver limpo, a estrada da serra vai abrir. Aguentem firme aí dentro. Câmbio, desligo.'],
    ], () => qev('radio2'));
  });
}

/* ------------------------------ Seu Dito ------------------------------ */
const _talk = talk;
talk = function (npc) {
  if (npc !== 'dito') return _talk(npc);
  const before = Object.keys(G.qdone).length, has = id => G.quests.find(q => q.id === id);
  if (G.diff !== 'aventura') startQuest('s_dito1');
  qev('talk:dito'); if (has('s_dito2') && invCount('mochila_bia')) qev('deliver:bia');
  if (Object.keys(G.qdone).length !== before) return;
  const L = has('s_dito2') ? 'A escola fica no norte, a oeste da igreja de Alto Ferro. Qualquer coisa da Bia, viu? Qualquer coisa.'
    : has('s_dito3') ? 'A gruta fica no meio do vale, a leste da fazenda, no fim da trilha de terra. Cuidado com o que mora perto dos cristais.'
    : has('s_dito4') ? 'O rádio da estação de água precisa de pilha e de fio de cobre. A estação fica no leste, depois de Alto Ferro, subindo para o observatório.'
    : G.flags.criancas ? 'Troquei a linha da vara pequena. Para quando ela voltar. Senta aí, o peixe tá pegando.'
    : 'O rio dá peixe pra quem tem paciência. E a água dele, ferve antes de beber, que o Tecido gosta de água parada.';
  showDialog([['dito', L]]);
};

/* -------------------- objetos novos: alvo e uso -------------------- */
const EXTRA_TARGET = {
  radio2: () => G.flags.radio2 ? 'Rádio da estação' : 'Rádio quebrado (3 Pilhas, 2 Fios de Cobre)',
  horta: o => { const p = hortaProg(o); return p >= 1 ? 'Colher o canteiro' : `Canteiro (${Math.floor(p * 100)}%)`; },
};
const EXTRA_USE = { radio2: useRadio2, horta: harvest };

/* ------------------------- desenho dos objetos ------------------------- */
const DRAW2 = {
  estante(o) { const x = o.x, y = o.y, L = G.looted[o.id]; shadow(x, y + 14, 18, 6); rr(x - 17, y - 30, 34, 44, 2, '#5a3a22', OL); for (const sy of [-20, -6, 8]) seg([x - 15, y + sy, x + 15, y + sy], 2, OL);
    const cols = ['#8a3a3a', '#3a5a76', '#c4a446', '#4a6a34', '#a0587a', '#d4ccb4']; for (let r = 0; r < 3; r++) for (let i = 0; i < (L ? 2 : 6); i++) rr(x - 14 + i * 4.6, y - 31 + r * 14 + 2, 3.6, 9 - (i % 3), .6, cols[(i + r * 2) % 6]); },
  onibus(o) { g.save(); g.translate(o.x, o.y); shadow(0, 14, 50, 14); g.rotate(o.rot || 0); rr(-48, -17, 96, 34, 6, G.looted[o.id] ? '#8a7a3a' : '#c8a83a', OL); rr(-48, -17, 96, 8, 4, '#a88a2a', OL); for (let i = 0; i < 7; i++) rr(-40 + i * 12, -12, 9, 9, 1.5, '#2a3440', OL); rr(36, -12, 9, 24, 2, '#2a3440', OL); seg([-46, 8, 44, 8], 3, '#141018'); g.restore(); },
  barraca(o) { const x = o.x, y = o.y; shadow(x, y + 12, 22, 7); poly([x - 22, y + 12, x, y - 20, x + 22, y + 12], '#4a6a34', OL); poly([x - 6, y + 12, x, y - 6, x + 6, y + 12], '#1a2416', OL); seg([x, y - 20, x, y - 26], 2, OL); },
  tanque(o) { const x = o.x, y = o.y; shadow(x, y + 18, 32, 10); ell(x, y, 30, 22, '#86868e', OL); ell(x, y - 4, 26, 17, '#3a5a66', OL); ell(x - 6, y - 8, 9, 4, 'rgba(200,220,230,.3)'); seg([x - 30, y, x + 30, y], 2, 'rgba(0,0,0,.25)'); },
  caminhao(o) { g.save(); g.translate(o.x, o.y); shadow(0, 14, 50, 14); g.rotate(o.rot || 0); rr(-50, -18, 100, 36, 5, G.looted[o.id] ? '#7a2a2a' : '#b83030', OL); rr(26, -16, 22, 32, 4, '#c84040', OL); rr(32, -12, 12, 24, 2, '#2a3440', OL); for (let i = 0; i < 8; i++) seg([-44 + i * 8, -10, -44 + i * 8, 10], 2, '#b0b4c0'); seg([-46, -10, 20, -10], 2, '#b0b4c0'); seg([-46, 10, 20, 10], 2, '#b0b4c0'); g.restore(); },
  radio2(o) { const x = o.x, y = o.y, on = G.flags.radio2; shadow(x, y + 12, 18, 6); rr(x - 18, y - 6, 36, 16, 2, '#5a4a3a', OL); rr(x - 13, y - 22, 26, 17, 3, '#34363e', OL); circ(x - 6, y - 13, 4, '#565a64', OL); for (let i = 0; i < 3; i++) seg([x + 2, y - 18 + i * 4, x + 9, y - 18 + i * 4], 1.5, '#868a94'); seg([x + 10, y - 22, x + 16, y - 40], 2, OL); circ(x + 16, y - 41, 2, on ? '#6fe07a' : '#6a1c1c'); if (on && Math.sin(RT * 4) > 0) circ(x + 9, y - 10, 2, '#6fe07a'); },
  horta(o) { const x = o.x, y = o.y, p = hortaProg(o); rr(x - 20, y - 12, 40, 26, 3, '#4a3020', OL); for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { const px = x - 14 + i * 9.4, py = y - 4 + r * 11; if (p >= 1) { circ(px, py, 4.5, r ? '#c4843a' : '#d8a03a', OL); seg([px, py - 4, px + 2, py - 7], 1.5, '#4a7a2a'); } else { const h = 3 + p * 8; seg([px, py + 2, px, py + 2 - h], 2, '#5a9a3a'); circ(px - 2, py + 2 - h, 1.6 + p * 1.6, '#6aaa44'); circ(px + 2, py + 1 - h, 1.6 + p * 1.6, '#6aaa44'); } } },
};
const _drawObj = drawObj;
drawObj = function (o) { const f = DRAW2[o.type]; if (f) { g.lineWidth = 2.5; return f(o); } return _drawObj(o); };

/* --------------------------- passo a passo --------------------------- */
function update2(dt) {
  if (G.state !== 'play' || paused() || CS.on) return; ensureV2(); const V = G.v2;
  // clima
  V.wT -= dt; if (V.wT <= 0) nextWeather(); V.wk = clamp((V.wk || 0) + (V.weather === 'limpo' ? -dt : dt) / 6, 0, 1);
  if (V.weather === 'chuva' && V.wk > .5) { for (const o of G.placed) if (o.type === 'coletor') o.water = Math.min(4, (o.water || 0) + dt / HOUR_SEC / 2.5); for (const f of G.fires) if (!f.acid) f.t -= dt * .4; }
  // adrenalina
  if (P.buffT > 0) { P.buffT -= dt; P.stam = maxSt(); if (P.buffT <= 0) { P.buffT = 0; toast('O efeito da adrenalina passou.', 'adrenalina'); } }
  // iscas
  if (G.lures && G.lures.length) { for (const l of G.lures) { l.t -= dt; if (Math.random() < dt * 8) G.parts.push({ x: l.x + rand(-8, 8), y: l.y, vx: rand(-10, 10), vy: rand(-40, -20), life: .8, max: .8, c: 'rgba(140,160,60,.5)', s: 3 }); } G.lures = G.lures.filter(l => l.t > 0); }
  // uma vez por segundo
  V.qt -= dt; if (V.qt > 0) return; V.qt = 1;
  if (invCount('binoculo')) { const fx = Math.floor(P.x / FOGC), fy = Math.floor(P.y / FOGC); for (let y = fy - 5; y <= fy + 5; y++) for (let x = fx - 5; x <= fx + 5; x++) if (x >= 0 && y >= 0 && x < FW && y < FH && Math.hypot(x - fx, y - fy) <= 5.2) G.fog[y * FW + x] = 1; }
  const seenN = Object.keys(POIS2).filter(k => G.pois[k] === 2).length; G.evlog = G.evlog || {}; if (seenN > (G.evlog.reach2 || 0)) { G.evlog.reach2 = seenN - 1; qev('reach2'); }
  if (G.diff !== 'aventura') {
    startQuest('s_explora');
    if (G.qdone.q_vila || G.pois.pesqueiro === 2) startQuest('s_dito1');
    if (Object.keys(G.learned).some(t => !OLD_TAGS.includes(t)) || G.qdone.q_fogo) startQuest('s_mestre');
    if (G.learned.horta) startQuest('s_horta');
    if (G.flags.radio2 && G.quests.find(q => q.id === 's_dito4')) qev('radio2');
  }
  if (!V.welcome) { V.welcome = 1; showDialog([['nar', 'Serra Sangrenta 2.0 · Ecos do Vale.\n\nO vale ganhou seis lugares novos, armas, roupas, livros que ensinam receitas, chuva, neblina e canteiros. Algumas receitas agora precisam ser descobertas: leia o que achar e repare nos materiais novos.\n\nTudo o que você já sabia fazer continua liberado.']]); }
}
const _update = update;
update = function (dt) { _update(dt); try { update2(dt); } catch (e) { console.error(e); } };
