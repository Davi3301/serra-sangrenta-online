'use strict';
/* ==========================================================================
   SERRA SANGRENTA 3.0 · MULTIJOGADOR (até 4 amigos)
   Modo separado do jogo solo, com o próprio mundo salvo.
   Quem cria a sala é o anfitrião: o computador dele roda o mundo (criaturas,
   saques, fogo, tempo) e os outros entram com um código. A conexão é direta
   entre os navegadores (WebRTC), e o PeerJS público e gratuito só serve para
   os computadores se acharem. Ninguém precisa pagar servidor.
   Cada jogador tem o próprio personagem (mochila, vida, receitas), salvo no
   próprio computador. Quem cai pode ser reanimado por um amigo.
   ========================================================================== */
const MP = { role: null, peer: null, conns: {}, peers: {}, me: null, code: '', name: '', look: null, t: 0, st: 0, diffT: 0, mirror: null, chat: [], max: 4, ping: 0 };
const MP_PREFIX = 'serrasangrenta-v3-', MP_CHAR = 'serra_mp_personagem', MP_SLOT = 'mp';
// "idioma" do multijogador: só muda quando as mensagens entre os jogos mudam. Versões diferentes do jogo
// (3.6, 3.7...) jogam juntas enquanto falarem o mesmo idioma.
// endereço público do jogo (GitHub Pages): o link de convite abre o jogo direto na tela de entrar na sala
const MP_URL = 'https://davi3301.github.io/serra-sangrenta-online/', mpLink = () => MP_URL + '?sala=' + MP.code;
const MP_PROTO = 3, mpCompat = m => m.proto === MP_PROTO || (!m.proto && /^3\./.test(String(m.ver || '')));
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }, { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' }, { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }] };
const isHost = () => MP.role === 'host', isClient = () => MP.role === 'client', inMP = () => !!MP.role && G.state !== 'title';
const SHIRTS = ['#8a3a34', '#3a5a7a', '#4a6a3a', '#7a5a2a', '#6a3a6a', '#2a6a6a'];

/* ------------------------------ PeerJS ------------------------------ */
function loadPeer() {
  return new Promise((ok, no) => { if (window.Peer) return ok(); const s = document.createElement('script'); s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'; s.onload = () => ok(); s.onerror = () => no(new Error('Não deu para carregar a biblioteca de conexão. Verifique a internet.')); document.head.appendChild(s); });
}
const genCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };
function send(conn, m) { try { if (conn && conn.open) conn.send(m); } catch (e) { } }
function sendHost(m) { send(MP.conns.host, m); }
function broadcast(m, except) { for (const id in MP.conns) if (id !== except) send(MP.conns[id], m); }

/* ------------------------------- sala ------------------------------- */
function lobbyHTML(inner) { return `<div class="modal card wide" style="max-width:620px"><h2 style="margin-bottom:4px">Multijogador</h2><p class="hint" style="margin-top:0">Jogue com até 3 amigos num mundo só de vocês, separado do seu jogo solo. Sobrevivência livre: o vale inteiro, as regiões além da serra, as criaturas e os chefes, sem a história principal.</p>${inner}</div>`; }
function mpLobby(msg) {
  const name = MP.name || (UI.cc && UI.cc.name) || 'Sobrevivente', col = MP.shirt || SHIRTS[0], has = !!localStorage.getItem(slotKey(MP_SLOT));
  $('title').innerHTML = lobbyHTML(`
    <div class="row" style="gap:10px;align-items:center;margin:10px 0"><span style="min-width:90px">Seu nome</span><input id="mp-name" class="search" maxlength="16" value="${name.replace(/"/g, '&quot;')}" style="flex:1"></div>
    <div class="row" style="gap:8px;align-items:center;margin-bottom:12px"><span style="min-width:90px">Sua cor</span>${SHIRTS.map(c => `<button class="mp-col" data-a="mpcol" data-v="${c}" style="width:30px;height:30px;border-radius:50%;background:${c};border:3px solid ${c === col ? '#e8c070' : 'rgba(0,0,0,.4)'};cursor:pointer"></button>`).join('')}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="card" style="padding:12px"><h3 style="margin:0 0 6px">Criar sala</h3><p class="hint">Você é o anfitrião: o mundo roda no seu computador. Deixe o jogo aberto na tela enquanto jogam.</p>
        <div class="row" style="gap:6px;margin:6px 0"><button class="chip ${MP.diff !== 'dificil' ? 'on' : ''}" data-a="mpdiff" data-v="normal">Sobrevivente</button><button class="chip ${MP.diff === 'dificil' ? 'on' : ''}" data-a="mpdiff" data-v="dificil">Pesadelo</button></div>
        <button class="btn" data-a="mphost" data-v="${has ? 'load' : 'new'}" style="width:100%">${has ? 'Continuar mundo' : 'Criar mundo'}</button>${has ? '<button class="btn sec sm" data-a="mphost" data-v="new" style="width:100%;margin-top:6px">Começar um mundo novo</button>' : ''}</div>
      <div class="card" style="padding:12px"><h3 style="margin:0 0 6px">Entrar numa sala</h3><p class="hint">Peça o código para quem criou a sala.</p>
        <input id="mp-code" class="search" maxlength="5" placeholder="CÓDIGO" value="${MP.invite || ''}" style="text-transform:uppercase;letter-spacing:6px;font-size:20px;text-align:center;width:100%;box-sizing:border-box">
        <button class="btn" data-a="mpjoin" style="width:100%;margin-top:8px">Entrar</button></div>
    </div>
    <p id="mp-msg" class="hint" style="min-height:18px;color:var(--gold)">${msg || ''}</p>
    <button class="btn sec" data-a="mpback">Voltar</button>`);
}
function mpWaiting(html) { $('title').innerHTML = lobbyHTML(html + `<p id="mp-msg" class="hint" style="min-height:18px;color:var(--gold)"></p><button class="btn sec" data-a="mpcancel">Cancelar</button>`); }
const mpMsg = t => { const e = document.getElementById('mp-msg'); if (e) e.textContent = t; };
function readLobbyFields() { const n = document.getElementById('mp-name'); if (n) MP.name = (n.value || '').trim().slice(0, 16) || 'Sobrevivente'; MP.shirt = MP.shirt || SHIRTS[0]; const base = (UI.cc && UI.cc.look) || {}; MP.look = Object.assign({ skin: '#c8a288', hair: '#3a2a22', style: 'curto', pants: '#3a3026' }, base, { shirt: MP.shirt }); }
document.getElementById('title').addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || !/^mp/.test(el.dataset.a)) return; e.stopPropagation(); audioInit(); const a = el.dataset.a, v = el.dataset.v;
  if (a === 'mp') return mpLobby();
  if (a === 'mpcol') { readLobbyFields(); MP.shirt = v; return mpLobby(); }
  if (a === 'mpdiff') { readLobbyFields(); MP.diff = v; return mpLobby(); }
  if (a === 'mpback') return showTitle();
  if (a === 'mpcancel') { mpLeave(); return mpLobby(); }
  if (a === 'mphost') { readLobbyFields(); return mpHost(v === 'load'); }
  if (a === 'mpjoin') { readLobbyFields(); const c = (document.getElementById('mp-code').value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length !== 5) return mpMsg('O código tem 5 letras e números.'); return mpJoin(c); }
  if (a === 'mpgo') return mpStartHostGame();
  if (a === 'mpcopy') { const i = document.getElementById('mp-link'); const ok = () => mpMsg('Link copiado. Cole no WhatsApp, Discord...'); try { navigator.clipboard.writeText(mpLink()).then(ok, () => { i.select(); document.execCommand('copy'); ok(); }); } catch (_) { i.select(); try { document.execCommand('copy'); ok(); } catch (e) { mpMsg('Selecione o link e copie.'); } } return; }
}, true);
const _showTitle = showTitle;
showTitle = function () { _showTitle(); const m = document.querySelector('#title .menu'); if (m && !m.querySelector('[data-a="mp"]')) { const b = document.createElement('button'); b.className = 'btn sec'; b.dataset.a = 'mp'; b.textContent = 'Multijogador'; m.appendChild(b); } };

/* ---------------------------- anfitrião ---------------------------- */
async function mpHost(load) {
  mpWaiting('<p>Abrindo a sala...</p>');
  try { await loadPeer(); } catch (e) { return mpLobby(e.message); }
  MP.load = load; MP.code = genCode(); MP.role = 'host'; MP.me = 'host'; MP.peers = {}; MP.conns = {};
  const peer = MP.peer = new Peer(MP_PREFIX + MP.code, { config: ICE, debug: 0 });
  peer.on('open', () => hostLobby());
  peer.on('error', err => { if (err.type === 'unavailable-id') { peer.destroy(); return mpHost(load); } if (G.state === 'title') mpLobby('Erro na conexão: ' + (err.type || err.message)); else toast('Conexão: ' + (err.type || err.message), 'u_warn'); });
  peer.on('connection', conn => {
    conn.on('open', () => { if (Object.keys(MP.conns).length >= MP.max - 1) { send(conn, { t: 'full' }); setTimeout(() => conn.close(), 300); return; } });
    conn.on('data', m => onHostMsg(conn, m));
    conn.on('close', () => hostDrop(conn.peer));
  });
}
function hostLobby() {
  const list = [MP.name + ' (você)'].concat(Object.values(MP.peers).map(p => p.name));
  mpWaiting(`<p style="margin-bottom:4px">Passe este código para os seus amigos:</p>
    <div style="font:400 44px 'Special Elite',monospace;letter-spacing:12px;text-align:center;padding:12px;background:#e4d8bc;color:#2a2018;border-radius:4px;margin:6px 0">${MP.code}</div>
    <p style="margin:8px 0 4px">Ou mande este link: quem abrir joga no navegador, sem baixar nada, e já cai na sua sala.</p>
    <div style="display:flex;gap:6px;align-items:center"><input id="mp-link" class="search" readonly value="${mpLink()}" style="flex:1;min-width:0;font-size:13px;box-sizing:border-box" onclick="this.select()"><button class="btn sm" data-a="mpcopy">Copiar link</button></div>
    <p class="hint">Quem já tem o jogo clica em Multijogador e digita o código. Dá para entrar com o jogo já começado.</p>
    <p><b>Na sala (${list.length}/${MP.max}):</b> ${list.join(', ')}</p>
    <button class="btn" data-a="mpgo" style="width:100%">Começar</button>`);
  // quem já está na sala de espera vê a lista atualizada e sabe que está tudo certo
  broadcast({ t: 'lobby', code: MP.code, names: list.map(n => n.replace(' (você)', '')) });
}
function mpStartHostGame() {
  audioInit(); $('title').hidden = true; $('hud').hidden = false; UI.lastDrv = undefined;
  if (!(MP.load && loadGame(MP_SLOT))) {
    resetGame(); G.slot = MP_SLOT; G.diff = MP.diff || 'normal'; G.state = 'play';
    Object.assign(P, { name: MP.name, look: Object.assign({}, MP.look) }); give('faca', 1, true); give('tocha', 1, true); give('agua', 2, true); give('barra', 2, true);
    P.x = 40 * TILE; P.y = 99 * TILE;
  }
  G.slot = MP_SLOT; G.state = 'play'; P.name = MP.name; P.look = Object.assign({}, P.look || {}, MP.look); WHO.eu[1] = P.name; mpWorldFlags();
  cam.x = P.x - VW / 2; cam.y = P.y - VH / 2; G.uiDirty = true; MP.mirror = null;
  for (const id in MP.conns) sendWelcome(id);
  toast(`Sala ${MP.code} aberta. Seus amigos podem entrar a qualquer momento.`, 'u_star', true); mpChatLine('', `Código da sala: ${MP.code} · convite: ${mpLink()}`);
}
function mpWorldFlags() { G.flags.mp = 1; for (const k of ['cs_noite', 'cs_vila', 'cs_cidade']) G.flags[k] = 1; G.quests = G.quests.filter(q => !QUESTS[q.id].main); CS.queue && (CS.queue.length = 0); }
function hostDrop(id) { const p = MP.peers[id]; delete MP.conns[id]; delete MP.peers[id]; if (p) { mpChatLine('', `${p.name} saiu.`); broadcast({ t: 'left', id }); } if (G.state === 'title' && isHost()) hostLobby(); }
function worldState() {
  return { dead: G.dead, looted: G.looted, sealed: G.sealed, builds: G.builds, placed: G.placed.map(placedRec), time: G.time, diff: G.diff, weather: G.v2 && G.v2.weather, flags: { energia: G.flags.energia, won: G.flags.won }, e3: G.v2 && G.v2.e3, hortas: G.v2 && G.v2.hortas };
}
const placedRec = o => [o.type, Math.round(o.x), Math.round(o.y), o.inv || null, o.water !== undefined ? o.water : null];
const pkey2 = r => r[0] + '@' + r[1] + ',' + r[2];
function sendWelcome(id) {
  const c = MP.conns[id]; if (!c) return; const p = MP.peers[id];
  // quem esperou na sala ainda não mandava sinal de vida: zera o relógio para não ser derrubado ao começar
  if (p) p.last = performance.now();
  const sp = { x: P.x + rand(-40, 40), y: P.y + 40 }; send(c, { t: 'welcome', id, code: MP.code, ver: VERSION, world: worldState(), spawn: sp, players: playerList() });
  mpChatLine('', `${p ? p.name : 'Alguém'} entrou.`); broadcast({ t: 'chat', from: '', msg: `${p ? p.name : 'Alguém'} entrou.` }, id);
}
function playerList() { const l = Object.values(MP.peers).map(p => [p.id, p.name, p.look, Math.round(p.x), Math.round(p.y), +(p.ang || 0).toFixed(2), Math.round(p.hp), Math.round(p.maxhp || 100), p.held || '', p.sw || 0, p.down ? 1 : 0, p.crouch ? 1 : 0, p.armor || '']); l.push(['host', P.name, P.look, Math.round(P.x), Math.round(P.y), +(P.ang || 0).toFixed(2), Math.round(P.hp), Math.round(maxHp()), P.hot[P.sel] || '', P.swing ? +(P.swing.t / P.swing.dur).toFixed(2) : 0, P.downed > 0 ? 1 : 0, P.crouch ? 1 : 0, P.armor || '']); return l; }
function onHostMsg(conn, m) {
  const id = conn.peer; if (!m || !m.t) return; const p = MP.peers[id]; if (p) p.last = performance.now(); // qualquer mensagem conta como sinal de vida
  switch (m.t) {
    case 'hello': if (!mpCompat(m)) { send(conn, { t: 'bye', why: `Versões incompatíveis: a sala está na ${VERSION} e você na ${m.ver}. Atualizem o jogo para a mesma versão.` }); setTimeout(() => conn.close(), 400); return; }
      MP.conns[id] = conn; MP.peers[id] = { id, name: (m.name || 'Amigo').slice(0, 16), look: m.look || {}, x: P.x, y: P.y + 40, tx: P.x, ty: P.y + 40, ang: 0, hp: 100, maxhp: 100, last: performance.now() };
      if (G.state === 'title') hostLobby(); else sendWelcome(id); break;
    case 'hb': break;
    case 'st': if (!p) return; Object.assign(p, { tx: m.x, ty: m.y, ang: m.a, hp: m.hp, maxhp: m.mh, held: m.h, sw: m.sw, down: !!m.dn, crouch: !!m.cr, armor: m.ar, last: performance.now() }); if (p.x === undefined) { p.x = m.x; p.y = m.y; } break;
    case 'hit': { const e = G.enemies.find(o => o.uid === m.u); if (e && !e.dead) { e.lastHitBy = id; e.lastHitT = G.time; hurtEnemy(e, m.d, m.a, m.k, m.c); if (m.p) e.poison = Math.max(e.poison || 0, 6); } break; }
    case 'hitA': { const a = G.animals.find(o => o.uid === m.u); if (a && !a.dead) hurtAnimal(a, m.d, m.a); break; }
    case 'loot': { const o = W.objs[m.o]; if (!o || G.looted[o.id]) { send(conn, { t: 'give', items: [], none: 1 }); break; } hostLoot(conn, o); break; }
    case 'pick': { const it = G.items.find(i => i.uid === m.u && !i.dead); if (it) { it.dead = true; send(conn, { t: 'give', items: [[it.id, it.n, it.dur]], quiet: 1 }); } break; }
    case 'drop': dropItem(m.id, m.n, m.x, m.y, m.dur); break;
    case 'sync': applyDiff(m.d, id); break;
    case 'fx': hostFx(m, id); broadcast({ t: 'fx2', k: m.k, x: m.x, y: m.y, r: m.r, tt: m.tt }, id); break;
    case 'chat': { const msg = String(m.msg || '').slice(0, 140); mpChatLine(p ? p.name : '?', msg); broadcast({ t: 'chat', from: p ? p.name : '?', msg }, id); break; }
    case 'revive': if (m.to === 'host') mpRevived(p ? p.name : 'Um amigo'); else send(MP.conns[m.to], { t: 'revived', by: p ? p.name : 'Um amigo' }); break;
    case 'tur': { if (typeof TUR !== 'function') break; const T2 = TUR(); T2[m.k] = Math.min(300, (T2[m.k] || 0) + (m.n | 0)); break; }
    case 'pong': if (p) p.ping = Math.round(performance.now() - m.s); break;
  }
}
function hostLoot(conn, o) {
  G.looted[o.id] = 1; const items = [];
  if (LOOT[o.loot]) for (const l of LOOT[o.loot]) if (Math.random() < l[1] * .38 * DF().loot) items.push([l[0], Math.max(1, Math.round(randi(l[2], l[3]) * .6))]);
  if (o.extra) for (const x of o.extra) items.push([x[0], x[1]]);
  send(conn, { t: 'give', items, note: o.note, loot: o.loot });
}
function hostFx(m, from) {
  if (m.k === 'fire') G.fires.push({ x: m.x, y: m.y, r: m.r || 50, t: m.tt || 4 });
  else if (m.k === 'acid') G.fires.push({ x: m.x, y: m.y, r: m.r || 60, t: m.tt || 6, acid: 1 });
  else if (m.k === 'flare') G.flares.push({ x: m.x, y: m.y, t: m.tt || 60 });
  else if (m.k === 'lure') (G.lures = G.lures || []).push({ x: m.x, y: m.y, t: m.tt || 15 });
  else if (m.k === 'smoke') (G.smokes = G.smokes || []).push({ x: m.x, y: m.y, t: m.tt || 12 });
  else if (m.k === 'noise') alertNoise(m.x, m.y, m.r || 400);
}

/* ------------------- sincronização do mundo (diferenças) ------------------- */
// cada lado compara o próprio estado com a última foto e manda só o que mudou
function snapWorld() { const pl = {}; for (const o of G.placed) if (!o.dead) { const r = placedRec(o); pl[pkey2(r)] = r; } return { dead: Object.assign({}, G.dead), looted: Object.assign({}, G.looted), sealed: Object.assign({}, G.sealed), builds: JSON.parse(JSON.stringify(G.builds)), placed: pl, plj: Object.fromEntries(Object.entries(pl).map(([k, r]) => [k, JSON.stringify(r)])) }; }
function makeDiff(a, b) {
  const d = {}; let any = false;
  for (const k of ['dead', 'looted', 'sealed']) { const add = {}, rem = []; for (const i in b[k]) if (!(i in a[k]) || a[k][i] !== b[k][i]) add[i] = b[k][i]; for (const i in a[k]) if (!(i in b[k])) rem.push(i); if (Object.keys(add).length || rem.length) { d[k] = [add, rem]; any = true; } }
  { const add = {}, rem = []; for (const i in b.builds) if (!a.builds[i] || a.builds[i].id !== b.builds[i].id || a.builds[i].hp !== b.builds[i].hp) add[i] = b.builds[i]; for (const i in a.builds) if (!b.builds[i]) rem.push(i); if (Object.keys(add).length || rem.length) { d.builds = [add, rem]; any = true; } }
  { const add = [], rem = []; for (const k in b.placed) if (a.plj[k] !== b.plj[k]) add.push(b.placed[k]); for (const k in a.placed) if (!b.placed[k]) rem.push(k); if (add.length || rem.length) { d.placed = [add, rem]; any = true; } }
  return any ? d : null;
}
function applyDiff(d, from) {
  if (!d) return;
  if (d.dead) { for (const i in d.dead[0]) { const o = W.objs[i]; G.dead[i] = d.dead[0][i]; if (o) { o.dead = true; if (o.type !== 'bush') o.solid = false; } } if (!isClient() ? false : true) for (const i of d.dead[1]) { const o = W.objs[i]; delete G.dead[i]; if (o && !o.gone) { o.dead = false; o.solid = !!OBJ[o.type].solid; o.hp = OBJ[o.type].hp || 0; } } }
  if (d.looted) for (const i in d.looted[0]) G.looted[i] = 1;
  if (d.sealed) for (const i in d.sealed[0]) { G.sealed[i] = 1; if (W.fissures[i]) W.fissures[i].sealed = true; }
  if (d.builds) { for (const k in d.builds[0]) { const b = d.builds[0][k], pc = BUILDS.find(p => p.id === b.id), [tx, ty] = k.split(',').map(Number); if (!pc) continue; const old = G.builds[k]; G.builds[k] = { id: b.id, hp: b.hp, orig: old ? old.orig : (b.orig !== undefined ? b.orig : tileAt(tx, ty)) }; setTile(tx, ty, pc.tile); } for (const k of d.builds[1]) { const b = G.builds[k]; if (!b) continue; const [tx, ty] = k.split(',').map(Number); delete G.builds[k]; setTile(tx, ty, b.orig); } }
  if (d.placed) {
    for (const r of d.placed[0]) { const k = pkey2(r); let o = G.placed.find(q => !q.dead && pkey2(placedRec(q)) === k); if (!o) { o = mkObj(r[0], r[1], r[2], { placed: 1 }); G.placed.push(o); if (isHost() && typeof onRemotePlace === 'function') onRemotePlace(o); } if (r[3]) o.inv = r[3]; if (r[4] !== null && r[4] !== undefined) o.water = r[4]; }
    for (const k of d.placed[1]) { const o = G.placed.find(q => !q.dead && pkey2(placedRec(q)) === k); if (o) { gridRemove(o); o.dead = true; G.placed.splice(G.placed.indexOf(o), 1); } }
  }
  mirrorMerge(d); // o que veio de fora já faz parte da foto (sem engolir mudanças locais ainda não enviadas)
  if (isHost()) broadcast({ t: 'sync', d }, from);
}
function mirrorMerge(d) {
  const M = MP.mirror; if (!M) return;
  for (const k of ['dead', 'looted', 'sealed']) if (d[k]) { for (const i in d[k][0]) if (G[k][i] !== undefined) M[k][i] = G[k][i]; for (const i of d[k][1]) if (G[k][i] === undefined) delete M[k][i]; }
  if (d.builds) { for (const i in d.builds[0]) if (G.builds[i]) M.builds[i] = JSON.parse(JSON.stringify(G.builds[i])); for (const i of d.builds[1]) delete M.builds[i]; }
  if (d.placed) { for (const r of d.placed[0]) { const k = pkey2(r), o = G.placed.find(q => !q.dead && pkey2(placedRec(q)) === k); if (o) { const rr2 = placedRec(o); M.placed[k] = rr2; M.plj[k] = JSON.stringify(rr2); } } for (const k of d.placed[1]) { delete M.placed[k]; delete M.plj[k]; } }
}
function mpPoison(e) { if (isClient() && e.net) sendHost({ t: 'hit', u: e.uid, d: 0, a: 0, k: 0, c: 0, p: 1 }); }
function onRemotePlace(o) { const S = v3(); if (o.type === 'efigie') { S.burn[pkey(o)] = G.time + 36; o.burn = 1; } if (o.type === 'armadilha_tronco') S.traps[pkey(o)] = 1; if (o.type === 'horta') { ensureV2(); G.v2.hortas[hKey(o)] = G.time; } if (o.type === 'bau' && !o.inv) o.inv = []; }

/* ---------------------------- convidado ---------------------------- */
async function mpJoin(code) {
  mpWaiting(`<p>Procurando a sala <b>${code}</b>...</p>`);
  try { await loadPeer(); } catch (e) { return mpLobby(e.message); }
  MP.role = 'client'; MP.code = code; MP.peers = {}; MP.conns = {};
  const peer = MP.peer = new Peer(undefined, { config: ICE, debug: 0 });
  peer.on('open', () => {
    const conn = peer.connect(MP_PREFIX + code, { reliable: true, serialization: 'json' }); MP.conns.host = conn;
    // o prazo só vale até a conexão abrir; depois o convidado espera o anfitrião começar a partida o tempo que for
    const to = setTimeout(() => { if (!MP.joined && !conn.open) { mpLeave(); mpLobby('Não deu para conectar na sala ' + code + '. Confira o código, se o anfitrião está com a sala aberta e se a internet de vocês dois está funcionando.'); } }, 20000);
    conn.on('open', () => { clearTimeout(to); mpMsg('Conectado. Falando com o anfitrião...'); send(conn, { t: 'hello', name: MP.name, look: MP.look, ver: VERSION, proto: MP_PROTO }); });
    conn.on('error', () => { if (!MP.joined) { clearTimeout(to); mpLeave(); mpLobby('A conexão com a sala falhou. Tentem de novo; se continuar, um de vocês pode estar numa rede que bloqueia jogos (rede de escola ou de empresa).'); } });
    conn.on('data', m => onClientMsg(m));
    conn.on('close', () => { if (!MP.joined && MP.role === 'client' && MP.conns.host === conn) { mpLeave(); mpLobby('O anfitrião fechou a sala antes de começar.'); return; } if (MP.joined) { toast('A conexão com o anfitrião caiu.', 'u_warn', true); mpCharSave(); setTimeout(() => { mpLeave(); G.state = 'title'; $('hud').hidden = true; $('title').hidden = false; titleCam(); mpLobby('O anfitrião fechou a sala ou a conexão caiu. Seu personagem foi salvo.'); }, 2500); } });
  });
  peer.on('error', err => { if (!MP.joined) mpLobby(err.type === 'peer-unavailable' ? 'Não existe sala com esse código agora.' : 'Erro na conexão: ' + (err.type || err.message)); });
}
// sinal de vida do convidado fora do laço do jogo: continua mesmo com a janela minimizada ou em outra aba
// (o navegador congela o jogo de abas escondidas, e o anfitrião achava que a pessoa tinha caído)
setInterval(() => { if (isClient() && MP.conns.host && MP.conns.host.open) sendHost({ t: 'hb' }); }, 2000);
function onClientMsg(m) {
  switch (m.t) {
    case 'full': mpLeave(); return mpLobby('A sala está cheia (4 pessoas).');
    case 'bye': mpLeave(); return mpLobby(m.why || 'O anfitrião recusou a entrada.');
    case 'lobby': return mpWaiting(`<p>Você está na sala <b>${m.code}</b>.</p><p><b>Na sala:</b> ${(m.names || []).map(n => String(n).replace(/</g, '&lt;')).join(', ')}</p><p class="hint">Esperando o anfitrião começar a partida. Pode deixar esta tela aberta.</p>`);
    case 'welcome': return clientStart(m);
    case 'snap': return clientSnap(m);
    case 'sync': return applyDiff(m.d);
    case 'give': { if (m.none) { toast('Alguém já vasculhou aqui.', 'u_x'); return; } let any = false; for (const [id, n, dur] of m.items) if (ITEMS[id]) { if (m.quiet) invAdd(id, n, dur); else give(id, n); any = true; } if (!any && !m.quiet) toast('Nada de útil aqui.', 'u_x'); if (m.loot === 'mala') qev('mala'); if (m.note !== undefined && m.note !== null && !G.notes.includes(m.note)) { G.notes.push(m.note); const n = NOTES[m.note]; if (n) showDialog([['nar', `${n[0]}\n\n“${n[1]}”`]], () => qev('note')); } sfx('pick'); return; }
    case 'hurt': if (!P.dead) { hurtPlayer(m.d, m.a, m.k, m.s); if (m.w) { P.slowT = Math.max(P.slowT || 0, 2.6); } } return;
    case 'xp': addXP(m.n); G.kills++; G.killsBy[m.k] = (G.killsBy[m.k] || 0) + 1; qev('kill:' + m.k); qev('kill:any'); return;
    case 'chat': return mpChatLine(m.from, m.msg);
    case 'left': delete MP.peers[m.id]; return;
    case 'revived': return mpRevived(m.by);
    case 'fx2': return clientFx(m);
    case 'ping': return sendHost({ t: 'pong', s: m.s });
  }
}
function clientStart(m) {
  MP.joined = true; MP.me = m.id;
  audioInit(); $('title').hidden = true; $('hud').hidden = false; UI.lastDrv = undefined;
  resetGame(); G.slot = 'mpc'; G.state = 'play'; G.diff = m.world.diff || 'normal';
  // personagem salvo no seu computador (mochila, nível, receitas)
  const ch = mpCharLoad();
  if (ch) { Object.assign(P, ch.P); G.learned = ch.learned || {}; G.notes = ch.notes || []; G.qdone = ch.qdone || {}; G.quests = (ch.quests || []).filter(q => QUESTS[q.id] && !QUESTS[q.id].main); G.evlog = ch.evlog || {}; G.killsBy = ch.killsBy || {}; G.pois = ch.pois || {}; if (ch.fog) for (let i = 0; i < FW * FH; i++) G.fog[i] = ch.fog[i] === '1' ? 1 : 0; }
  else { give('faca', 1, true); give('tocha', 1, true); give('agua', 2, true); give('barra', 2, true); }
  P.name = MP.name; P.look = Object.assign({}, P.look || {}, MP.look); WHO.eu[1] = P.name; P.x = m.spawn.x; P.y = m.spawn.y; P.dead = false; P.downed = 0; if (!(P.hp > 0)) P.hp = maxHp() * .6; P.driving = false;
  mpWorldFlags(); const w = m.world; G.time = w.time; if (G.v2 && w.weather) G.v2.weather = w.weather; if (w.e3 && G.v2) G.v2.e3 = w.e3; if (w.hortas && G.v2) G.v2.hortas = w.hortas; Object.assign(G.flags, w.flags || {});
  G.dead = {}; G.looted = {}; G.sealed = {}; G.builds = {}; for (const o of G.placed) { gridRemove(o); o.dead = true; } G.placed = [];
  applyDiff({ dead: [w.dead, []], looted: [w.looted, []], sealed: [w.sealed, []], builds: [w.builds, []], placed: [w.placed, []] });
  G.enemies = []; G.animals = []; G.items = []; MP.mirror = snapWorld(); MP.ents = {};
  for (const r of m.players) upsertPeer(r);
  cam.x = P.x - VW / 2; cam.y = P.y - VH / 2; G.uiDirty = true; toast(`Você entrou na sala ${m.code}.`, 'u_star', true); mpChatLine('', 'Enter abre o chat.');
}
function upsertPeer(r) {
  const [id, name, look, x, y, ang, hp, mh, held, sw, dn, cr, ar] = r; if (id === MP.me) return; let p = MP.peers[id];
  if (!p) p = MP.peers[id] = { id, x, y }; Object.assign(p, { name, look, tx: x, ty: y, ang, hp, maxhp: mh, held, sw, down: !!dn, crouch: !!cr, armor: ar, last: performance.now() });
}
// fotos do mundo que o anfitrião manda 10 vezes por segundo (só o que está perto de você)
function clientSnap(m) {
  if (m.time !== undefined) { const dt = m.time - G.time; if (Math.abs(dt) > .25) G.time = m.time; else G.time += dt * .3; }
  if (G.v2 && m.w) { G.v2.weather = m.w; G.v2.wk = m.wk; }
  const seen = new Set();
  for (const p of m.pl) { upsertPeer(p); seen.add(p[0]); } for (const id in MP.peers) if (!seen.has(id)) delete MP.peers[id];
  // criaturas
  const keep = new Set();
  for (const r of m.en) { const [u, type, x, y, ang, state, t, hp, mh, fl, po, stn] = r; keep.add(u); let e = MP.ents[u];
    if (!e) { const def = ENEMIES[type]; if (!def) continue; e = MP.ents[u] = { uid: u, type, def, x, y, r: def.r, hp, maxhp: mh, state, t, ang, anim: Math.random() * 9, flash: 0, stun: 0, kx: 0, ky: 0, net: 1, trail: def.snake ? [] : undefined }; G.enemies.push(e); }
    e.tx = x; e.ty = y; e.ang = ang; e.state = state; e.t = t; e.hp = hp; e.maxhp = mh; if (fl) e.flash = .12; e.poison = po ? 1 : 0; e.stun = stn ? .2 : 0; }
  for (const u in MP.ents) if (!keep.has(+u)) { MP.ents[u].dead = true; delete MP.ents[u]; }
  G.enemies = G.enemies.filter(e => !e.dead);
  // bichos
  const ak = new Set(); MP.an = MP.an || {};
  for (const r of m.an) { const [u, type, x, y, ang, hp] = r; ak.add(u); let a = MP.an[u]; if (!a) { const def = ANIMALS[type]; if (!def) continue; a = MP.an[u] = { uid: u, type, def, x, y, r: def.r, hp, ang, anim: 0, flash: 0, net: 1 }; G.animals.push(a); } a.tx = x; a.ty = y; a.ang = ang; a.hp = hp; }
  for (const u in MP.an) if (!ak.has(+u)) { MP.an[u].dead = true; delete MP.an[u]; } G.animals = G.animals.filter(a => !a.dead);
  // itens no chão
  const ik = new Set(); MP.its = MP.its || {};
  for (const r of m.it) { const [u, id, n, x, y] = r; ik.add(u); let it = MP.its[u]; if (!it) { it = MP.its[u] = { uid: u, id, n, x, y, vx: 0, vy: 0, t: 0, nopick: 1e9, net: 1 }; G.items.push(it); } it.n = n; it.x = x; it.y = y; }
  for (const u in MP.its) if (!ik.has(+u)) { MP.its[u].dead = true; delete MP.its[u]; } G.items = G.items.filter(i => !i.dead);
  // fogo, sinalizadores, iscas, fumaça, projéteis de criatura
  G.fires = m.fi.map(f => ({ x: f[0], y: f[1], r: f[2], t: f[3], acid: f[4] })); G.flares = m.fl.map(f => ({ x: f[0], y: f[1], t: f[2] })); G.smokes = (m.sm || []).map(s => ({ x: s[0], y: s[1], t: s[2] }));
  G.projs = G.projs.filter(p => p.from === 'p' || p.kind === 'lob'); for (const p of m.ep) G.projs.push({ kind: p[3], from: 'x', x: p[0], y: p[1], ang: p[2], vx: 0, vy: 0, life: .12, dmg: 0 });
  if (m.car && G.car) Object.assign(G.car, { x: m.car[0], y: m.car[1], ang: m.car[2], fixed: !!m.car[3] });
  if (m.boss !== undefined) G.boss = m.boss ? G.enemies.find(e => e.uid === m.boss) || null : null;
}
function clientFx(m) { if (m.k === 'boom') { burst(m.x, m.y, '#e08a3a', 30, 260, 6); ring(m.x, m.y, m.r || 120, '#ffb060', .5); G.shake = Math.max(G.shake, 8); sfx('boom', m.x, m.y); } }

/* --------------------------- passo a passo --------------------------- */
function farFromAll(x, y, R) { if (dist(x, y, P.x, P.y) <= R) return false; if (isHost()) for (const id in MP.peers) { const p = MP.peers[id]; if (dist(x, y, p.x, p.y) <= R) return false; } return true; }
function mpTick(dt) {
  if (!inMP()) return; const now = performance.now();
  // movimento suave dos outros jogadores
  for (const id in MP.peers) { const p = MP.peers[id]; if (p.tx === undefined) continue; const k = Math.min(1, dt * 12); p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; p.walk = (p.walk || 0) + Math.hypot(p.tx - p.x, p.ty - p.y) * .05; }
  if (P.downed > 0) { P.downed -= dt; if (P.downed <= 0) mpRespawn(); }
  MP.t -= dt; MP.st -= dt; MP.diffT -= dt;
  if (isHost()) {
    for (const id in MP.peers) if (now - MP.peers[id].last > 30000) { const c = MP.conns[id]; if (c) c.close(); hostDrop(id); }
    if (MP.t <= 0) { MP.t = .1; hostSnaps(); }
    if (MP.st <= 0) { MP.st = 2; for (const id in MP.conns) send(MP.conns[id], { t: 'ping', s: now }); }
    if (MP.diffT <= 0) { MP.diffT = .5; const s = snapWorld(); if (MP.mirror) { const d = makeDiff(MP.mirror, s); if (d) broadcast({ t: 'sync', d }); } MP.mirror = s; }
    projHitPeers(); MP.save = (MP.save || 120) - dt; if (MP.save <= 0) { MP.save = 120; saveGame(); }
  } else if (isClient()) {
    if (MP.st <= 0) { MP.st = 1 / 15; sendHost({ t: 'st', x: Math.round(P.x), y: Math.round(P.y), a: +P.ang.toFixed(2), hp: Math.round(P.hp), mh: Math.round(maxHp()), h: P.hot[P.sel] || '', sw: P.swing ? +(P.swing.t / P.swing.dur).toFixed(2) : 0, dn: P.downed > 0 ? 1 : 0, cr: P.crouch ? 1 : 0, ar: P.armor || '' }); }
    // proxies andam até a posição que o anfitrião mandou
    for (const e of G.enemies) if (e.net && e.tx !== undefined) { const k = Math.min(1, dt * 10); e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; }
    for (const a of G.animals) if (a.net && a.tx !== undefined) { const k = Math.min(1, dt * 10); a.x += (a.tx - a.x) * k; a.y += (a.ty - a.y) * k; }
    // pegar itens do chão: pede para o anfitrião
    for (const it of G.items) if (it.net && !it.req && !P.dead && dist(it.x, it.y, P.x, P.y) < 26 && canTake(it.id, it.n)) { it.req = 1; sendHost({ t: 'pick', u: it.uid }); }
    // coisas que você criou e o mundo precisa saber
    for (const f of G.fires) if (!f.net && !f.sent) { f.sent = 1; sendHost({ t: 'fx', k: f.acid ? 'acid' : 'fire', x: f.x, y: f.y, r: f.r, tt: f.t }); }
    for (const f of G.flares) if (!f.sent) { f.sent = 1; sendHost({ t: 'fx', k: 'flare', x: f.x, y: f.y, tt: f.t }); }
    for (const l of (G.lures || [])) if (!l.sent) { l.sent = 1; sendHost({ t: 'fx', k: 'lure', x: l.x, y: l.y, tt: l.t }); }
    for (const s of (G.smokes || [])) if (!s.sent && !s.net) { s.sent = 1; sendHost({ t: 'fx', k: 'smoke', x: s.x, y: s.y, tt: s.t }); }
    if (MP.diffT <= 0) { MP.diffT = .5; const s = snapWorld(); if (MP.mirror) { const d = makeDiff(MP.mirror, s); if (d) { if (d.dead) d.dead[1] = []; sendHost({ t: 'sync', d }); } } MP.mirror = s; }
    MP.save = (MP.save || 60) - dt; if (MP.save <= 0) { MP.save = 60; mpCharSave(); }
  }
}
function hostSnaps() {
  const plist = playerList(), base = { t: 'snap', time: +G.time.toFixed(3), w: G.v2 && G.v2.weather, wk: G.v2 && +(G.v2.wk || 0).toFixed(2), pl: plist, boss: G.boss ? G.boss.uid || 0 : 0, car: G.car ? [Math.round(G.car.x), Math.round(G.car.y), +G.car.ang.toFixed(2), G.car.fixed ? 1 : 0] : null };
  for (const id in MP.conns) {
    const p = MP.peers[id]; if (!p) continue; const R = 1500, near = o => Math.abs(o.x - p.x) < R && Math.abs(o.y - p.y) < R;
    const m = Object.assign({}, base);
    for (const e of G.enemies) if (e.uid === undefined) e.uid = UIDN++;
    m.en = G.enemies.filter(e => !e.dead && near(e)).map(e => [e.uid, e.type, Math.round(e.x), Math.round(e.y), +e.ang.toFixed(2), e.state, +(e.t || 0).toFixed(2), Math.round(e.hp), Math.round(e.maxhp), e.flash > 0 ? 1 : 0, e.poison > 0 ? 1 : 0, e.stun > 0 ? 1 : 0]);
    m.an = G.animals.filter(a => !a.dead && near(a)).map(a => [a.uid, a.type, Math.round(a.x), Math.round(a.y), +(a.ang || 0).toFixed(2), Math.round(a.hp)]);
    m.it = G.items.filter(i => !i.dead && near(i)).map(i => [i.uid, i.id, i.n, Math.round(i.x), Math.round(i.y)]);
    m.fi = G.fires.filter(near).map(f => [Math.round(f.x), Math.round(f.y), f.r, +f.t.toFixed(1), f.acid ? 1 : 0]); m.fl = G.flares.filter(near).map(f => [Math.round(f.x), Math.round(f.y), +f.t.toFixed(1)]); m.sm = (G.smokes || []).filter(near).map(s => [Math.round(s.x), Math.round(s.y), +s.t.toFixed(1)]);
    m.ep = G.projs.filter(q => (q.from === 'e' || q.turret) && !q.dead && near(q)).map(q => [Math.round(q.x), Math.round(q.y), +(q.ang || 0).toFixed(2), q.kind]);
    send(MP.conns[id], m);
  }
}
// tiros e ácido das criaturas também acertam os amigos
function projHitPeers() {
  for (const q of G.projs) { if (q.from !== 'e' || q.dead) continue; for (const id in MP.peers) { const p = MP.peers[id]; if (p.down || dist(q.x, q.y, p.x, p.y) > 18) continue; q.dead = true; send(MP.conns[id], { t: 'hurt', d: q.dmg, a: q.ang, k: 120, s: 'inf', w: q.web ? 1 : 0 }); break; } }
}

/* -------------- criaturas escolhem o jogador mais perto (anfitrião) -------------- */
const _updateEnemyMP = updateEnemy;
updateEnemy = function (e, dt) {
  if (isClient()) { e.anim += dt; e.flash -= dt; if (e.lunge > 0) e.lunge -= dt; if (e.trail) { const l = e.trail[0]; if (!l || dist(l[0], l[1], e.x, e.y) > 7) { e.trail.unshift([e.x, e.y]); if (e.trail.length > 9) e.trail.pop(); } } return; }
  if (!isHost() || !Object.keys(MP.peers).length) return _updateEnemyMP(e, dt);
  let best = null, bd = P.dead ? 1e9 : dist(e.x, e.y, P.x, P.y);
  for (const id in MP.peers) { const p = MP.peers[id]; if (p.down) continue; const d = dist(e.x, e.y, p.x, p.y); if (d < bd) { bd = d; best = p; } }
  if (!best) return _updateEnemyMP(e, dt);
  const sv = { x: P.x, y: P.y, ang: P.ang, dead: P.dead, driving: P.driving, sleeping: P.sleeping, roll: P.roll, sprint: P.sprint, crouch: P.crouch, sanity: P.sanity, slowT: P.slowT, stam: P.stam, inf: P.inf, blocking: P.blocking };
  Object.assign(P, { x: best.x, y: best.y, ang: best.ang || 0, dead: false, driving: false, sleeping: false, roll: 0, sprint: false, crouch: best.crouch, blocking: false }); MP.target = best;
  try { _updateEnemyMP(e, dt); } finally { Object.assign(P, sv); MP.target = null; }
};
const _hurtPlayerMP = hurtPlayer;
hurtPlayer = function (dmg, ang, kb, src) {
  if (MP.target) { const p = MP.target; if (p.hurtCd > performance.now()) return; p.hurtCd = performance.now() + 350; send(MP.conns[p.id], { t: 'hurt', d: dmg, a: ang, k: kb, s: src }); return; }
  if (P.downed > 0) return; return _hurtPlayerMP(dmg, ang, kb, src);
};
// as criaturas nascem perto de cada jogador, não só do anfitrião
const _spawnTickMP = spawnTick;
spawnTick = function () {
  if (isClient()) { const fireNear = nearLight(P.x, P.y), it = curItem(); G.sheltered = INDOOR[tileAtPx(P.x, P.y)] === true || fireNear; G.lit = darkness() < .5 || fireNear || P.driving || !!(it && it.light) || invCount('lanterna') > 0; G.fireNear = fireNear; return; }
  _spawnTickMP(); if (!isHost()) return;
  const keep = { sheltered: G.sheltered, lit: G.lit, fireNear: G.fireNear }, sx = P.x, sy = P.y, dead = P.dead, slp = P.sleeping;
  for (const id in MP.peers) { const p = MP.peers[id]; if (p.down || dist(p.x, p.y, sx, sy) < 900) continue; P.x = p.x; P.y = p.y; P.dead = false; P.sleeping = false; try { _spawnTickMP(); } catch (e) { } }
  P.x = sx; P.y = sy; P.dead = dead; P.sleeping = slp; Object.assign(G, keep);
};
let UIDN = 1;
const _spawnEnemyMP = spawnEnemy; spawnEnemy = function (...a) { const e = _spawnEnemyMP(...a); if (e) e.uid = UIDN++; return e; };
const _dropItemMP = dropItem;
dropItem = function (id, n, x, y, dur, toss) { if (isClient()) { sendHost({ t: 'drop', id, n, x: Math.round(x), y: Math.round(y), dur }); return; } _dropItemMP(id, n, x, y, dur, toss); const it = G.items[G.items.length - 1]; if (it) it.uid = UIDN++; };
// XP de quem deu o golpe final
const _addXPMP = addXP; addXP = function (n) { if (MP.noXP) return; return _addXPMP(n); };
const _killEnemyMP = killEnemy;
killEnemy = function (e) {
  if (isClient()) return; const who = isHost() && e.lastHitBy && MP.conns[e.lastHitBy] && G.time - (e.lastHitT || 0) < .2 ? e.lastHitBy : null;
  if (who) { MP.noXP = true; try { _killEnemyMP(e); } finally { MP.noXP = false; } send(MP.conns[who], { t: 'xp', n: e.def.xp, k: e.type }); } else _killEnemyMP(e);
};
// no convidado, golpes nas criaturas vão para o anfitrião
const _hurtEnemyMP = hurtEnemy;
hurtEnemy = function (e, dmg, ang, kb, crit) {
  if (!isClient() || !e.net) return _hurtEnemyMP(e, dmg, ang, kb, crit);
  if (e.dead || e.state === 'burrow' || e.state === 'leave') return false;
  sendHost({ t: 'hit', u: e.uid, d: dmg, a: ang, k: kb, c: crit ? 1 : 0, p: 0 }); e.flash = .12;
  addText(e.x, e.y - e.r - 8, Math.round(dmg) + (crit ? '!' : ''), crit ? '#e0c060' : '#e8e0d0', crit); burst(e.x, e.y, '#8a1c2a', 6, 130); sfx('hit', e.x, e.y, e.type); return true;
};
const _hurtAnimalMP = hurtAnimal;
hurtAnimal = function (a, dmg, ang) { if (isClient() && a.net) { sendHost({ t: 'hitA', u: a.uid, d: dmg, a: ang }); a.flash = .12; burst(a.x, a.y, '#8a1c2a', 5, 110); return; } return _hurtAnimalMP(a, dmg, ang); };
const _updateAnimalMP = updateAnimal;
updateAnimal = function (a, dt) { if (isClient() && a.net) { a.anim = (a.anim || 0) + dt; a.flash -= dt; return; } if (isHost() && a.uid === undefined) a.uid = UIDN++; return _updateAnimalMP(a, dt); };
const _lootObjMP = lootObj;
lootObj = function (o) { if (isClient()) { G.looted[o.id] = 1; MP.mirror && (MP.mirror.looted[o.id] = 1); sendHost({ t: 'loot', o: o.id }); return; } return _lootObjMP(o); };
const _explosionMP = explosion;
explosion = function (x, y, r, dmg) { _explosionMP(x, y, r, dmg); if (isClient()) sendHost({ t: 'fx', k: 'noise', x, y, r: 600 }); else if (isHost()) broadcast({ t: 'fx2', k: 'boom', x, y, r }); };
const _enterCarMP = enterCar; enterCar = function () { if (isClient()) { hint('Nesta versão, só o anfitrião dirige a caminhonete.'); return; } return _enterCarMP(); };

/* ---------------------- cair, reanimar, descansar ---------------------- */
const _dieMP = die;
die = function () {
  if (!inMP() || DEV.god) return _dieMP();
  if (P.downed > 0) return; P.downed = 30; P.dead = true; P.hp = 0; P.driving = false; BUILD.on = false; sfx('death'); toast('Você caiu! Um amigo pode te reanimar em 30 segundos.', 'u_skull', true);
  if (isClient()) sendHost({ t: 'chat', msg: '(caiu! precisa de ajuda)' }); else broadcast({ t: 'chat', from: P.name, msg: '(caiu! precisa de ajuda)' });
};
function mpRevived(by) { if (!(P.downed > 0)) return; P.downed = 0; P.dead = false; P.hp = maxHp() * .35; P.inv_t = 2; toast(`${by} te reanimou!`, 'u_heart', true); sfx('heal'); }
function mpRespawn() { const b = P.bed || { x: 40 * TILE, y: 99 * TILE }; P.x = b.x; P.y = b.y + 26; P.dead = false; P.downed = 0; P.hp = maxHp() * .6; P.hunger = Math.max(P.hunger, 45); P.thirst = Math.max(P.thirst, 45); P.inf = Math.min(P.inf || 0, 60); P.inv_t = 3; cam.x = P.x - VW / 2; cam.y = P.y - VH / 2; toast('Ninguém chegou a tempo. Você acordou no seu ponto de retorno.', 'u_house', true); }
const _trySleepMP = trySleep;
trySleep = function () { if (!inMP()) return _trySleepMP(); if (P.sleep > 90) { hint('Você não está com sono.'); return; } startAction('Descansando...', 4, () => { P.sleep = Math.min(100, P.sleep + 55); P.sanity = Math.min(100, P.sanity + 10); toast('No multijogador o tempo não para: você só descansa um pouco.', 'u_zzz'); }); };
// reanimar um amigo caído (segure E perto dele)
const _findTargetMP = findTarget;
findTarget = function () { _findTargetMP(); if (!inMP() || P.dead || P.driving) return; for (const id in MP.peers) { const p = MP.peers[id]; if (p.down && dist(P.x, P.y, p.x, p.y) < 46) { G.target = { kind: 'revive', label: 'Reanimar ' + p.name, peer: p }; return; } } };
const _interactMP = interact;
interact = function () { const tg = G.target; if (tg && tg.kind === 'revive' && !P.action) { startAction('Reanimando ' + tg.peer.name + '...', 3, () => { if (isHost()) send(MP.conns[tg.peer.id], { t: 'revived', by: P.name }); else sendHost({ t: 'revive', to: tg.peer.id }); sfx('heal'); }); return; } return _interactMP(); };

/* ----------------------- personagem do convidado ----------------------- */
function mpCharSave() { if (!isClient()) return; try { const keep = ['hp', 'stam', 'hunger', 'thirst', 'sleep', 'sanity', 'inf', 'xp', 'lvl', 'sp', 'skills', 'inv', 'hot', 'sel', 'armor', 'pack', 'mags', 'temp']; const p = {}; for (const k of keep) p[k] = P[k]; localStorage.setItem(MP_CHAR, JSON.stringify({ P: p, learned: G.learned, notes: G.notes, qdone: G.qdone, quests: G.quests, evlog: G.evlog, killsBy: G.killsBy, pois: G.pois, fog: Array.from(G.fog).join('') })); } catch (e) { } }
function mpCharLoad() { try { return JSON.parse(localStorage.getItem(MP_CHAR)); } catch (e) { return null; } }
const _saveGameMP = saveGame; saveGame = function () { if (isClient()) { mpCharSave(); return true; } return _saveGameMP(); };
function mpLeave() { try { if (MP.peer) MP.peer.destroy(); } catch (e) { } Object.assign(MP, { role: null, peer: null, conns: {}, peers: {}, joined: false, mirror: null, ents: {}, an: {}, its: {} }); }
addEventListener('beforeunload', () => { if (isClient()) mpCharSave(); });

/* ------------------------- desenho dos amigos ------------------------- */
const _roofEntriesMP = roofEntries;
roofEntries = function (cx, cy, dt) { const out = _roofEntriesMP(cx, cy, dt); if (inMP()) { for (const id in MP.peers) { const p = MP.peers[id]; if (p.x > cx - 80 && p.x < cx + VW + 80 && p.y > cy - 80 && p.y < cy + VH + 120) out.push({ type: 'mp_av', x: p.x, y: p.y, p }); } if (P.downed > 0) out.push({ type: 'mp_me_down', x: P.x, y: P.y }); } return out; };
DRAW2.mp_av = o => {
  const p = o.p, look = Object.assign({ skin: '#c8a288', hair: '#3a2a22', shirt: '#5a3a34', pants: '#3a3026' }, p.look || {}, { moving: Math.hypot(p.tx - p.x, p.ty - p.y) > 2, walkT: p.walk || 0, armor: p.armor ? ITEMS[p.armor] && ITEMS[p.armor].ic.split('|')[1] : null });
  if (p.down) { g.save(); g.translate(p.x, p.y); g.rotate(1.5); g.translate(-p.x, -p.y); drawHuman(p.x, p.y, 0, look); g.restore(); const k = .5 + .5 * Math.sin(RT * 6); g.save(); g.globalAlpha = .35 * k; circ(p.x, p.y, 30, '#c83a3a'); g.restore(); }
  else { g.save(); if (p.crouch) { g.translate(p.x, p.y + 13); g.scale(1.06, .8); g.translate(-p.x, -(p.y + 13)); } drawHuman(p.x, p.y, p.ang || 0, look); const it = ITEMS[p.held]; if (it && it.held) drawHeld(it, p.x, p.y - 2, p.ang || 0, p.sw > 0 ? { t: p.sw * .3, dur: .3, ang: p.ang } : null, 0); g.restore(); }
  g.save(); g.font = '800 12px Barlow,sans-serif'; g.textAlign = 'center'; const nm = p.name + (p.down ? ' · CAÍDO' : ''), w = g.measureText(nm).width + 12; g.fillStyle = 'rgba(14,11,17,.75)'; g.beginPath(); g.roundRect(p.x - w / 2, p.y - 52, w, 16, 8); g.fill(); g.fillStyle = p.down ? '#ff8a8a' : '#efe2c2'; g.fillText(nm, p.x, p.y - 40);
  const f = clamp(p.hp / (p.maxhp || 100), 0, 1); g.fillStyle = '#141018'; g.fillRect(p.x - 16, p.y - 33, 32, 4); g.fillStyle = f < .3 ? '#e05050' : '#6fae72'; g.fillRect(p.x - 16, p.y - 33, 32 * f, 4); g.restore();
};
DRAW2.mp_me_down = o => { g.save(); g.font = '800 14px Barlow,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ff8a8a'; g.fillText(`CAÍDO · ${Math.ceil(P.downed)}s · espere um amigo`, P.x, P.y - 46); g.restore(); };
// setas na borda da tela apontando para os amigos fora de vista
const _drawMP = draw;
draw = function (dt) {
  _drawMP(dt); if (!inMP()) return; const S = DPR * Z, W2 = g.canvas.width, H2 = g.canvas.height; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  for (const id in MP.peers) { const p = MP.peers[id], sx = (p.x - cam.x) * S, sy = (p.y - cam.y) * S; if (sx > 0 && sy > 0 && sx < W2 && sy < H2) continue; const a = Math.atan2(sy - H2 / 2, sx - W2 / 2), m = 34, ex = clamp(W2 / 2 + Math.cos(a) * W2, m, W2 - m), ey = clamp(H2 / 2 + Math.sin(a) * H2, m, H2 - m);
    g.save(); g.translate(ex, ey); g.rotate(a); g.fillStyle = p.down ? '#e05050' : '#e8c070'; g.beginPath(); g.moveTo(14, 0); g.lineTo(-8, -9); g.lineTo(-8, 9); g.closePath(); g.fill(); g.restore(); g.font = '800 12px Barlow,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#efe2c2'; g.fillText(`${p.name} · ${Math.round(dist(P.x, P.y, p.x, p.y) / TILE)}m`, ex, ey + (ey > H2 / 2 ? -14 : 24)); }
  g.restore();
};

/* --------------------------- chat e jogadores --------------------------- */
const MPUI = document.createElement('div'); MPUI.id = 'mpui'; MPUI.style.cssText = 'position:absolute;left:16px;bottom:186px;pointer-events:none;display:flex;flex-direction:column;gap:6px;z-index:6;font:600 12px Barlow,sans-serif';
const CHATIN = document.createElement('input'); CHATIN.maxLength = 140; CHATIN.placeholder = 'Mensagem (Enter envia, Esc fecha)'; CHATIN.style.cssText = 'position:absolute;left:16px;bottom:150px;width:300px;padding:6px 10px;border-radius:4px;border:0;background:#e4d8bc;color:#2a2018;font:13px "Special Elite",monospace;display:none;z-index:20;pointer-events:auto';
function mpChatLine(from, msg) { MP.chat.push({ from, msg, t: performance.now() }); if (MP.chat.length > 8) MP.chat.shift(); }
function mpUI() {
  if (!inMP()) { if (MPUI.isConnected) MPUI.remove(); return; } const h = document.getElementById('hud'); if (h && !MPUI.isConnected) { h.appendChild(MPUI); h.appendChild(CHATIN); }
  const now = performance.now(), me = { name: P.name, hp: P.hp, maxhp: maxHp(), down: P.downed > 0 };
  const rows = [me].concat(Object.values(MP.peers)).map(p => { const f = clamp(p.hp / (p.maxhp || 100), 0, 1); return `<div style="display:flex;align-items:center;gap:6px;background:rgba(14,11,17,.7);padding:3px 8px;border-radius:999px;width:max-content"><span style="color:${p.down ? '#ff8a8a' : '#efe2c2'}">${p.name}${p.down ? ' (caído)' : ''}</span><span style="width:46px;height:5px;background:#141018;border-radius:3px;overflow:hidden"><i style="display:block;height:100%;width:${f * 100}%;background:${f < .3 ? '#e05050' : '#6fae72'}"></i></span>${p.ping ? `<small style="color:#948a98">${p.ping}ms</small>` : ''}</div>`; }).join('');
  const chat = MP.chat.filter(c => now - c.t < 14000 || CHATIN.style.display === 'block').map(c => `<div style="background:rgba(228,216,188,.92);color:#2a2018;padding:3px 9px;border-radius:2px;font:12px 'Special Elite',monospace;max-width:320px">${c.from ? `<b>${c.from}:</b> ` : ''}${String(c.msg).replace(/</g, '&lt;')}</div>`).join('');
  const html = `<div style="font:800 10px Barlow;letter-spacing:.12em;color:#e8c070">SALA ${MP.code}</div>${rows}<div style="height:6px"></div>${chat}`;
  if (MPUI.innerHTML !== html) MPUI.innerHTML = html;
}
addEventListener('keydown', e => {
  if (!inMP()) return;
  if (document.activeElement === CHATIN) { e.stopPropagation(); if (e.key === 'Enter') { const msg = CHATIN.value.trim(); if (msg) { mpChatLine(P.name, msg); if (isHost()) broadcast({ t: 'chat', from: P.name, msg }); else sendHost({ t: 'chat', msg }); } CHATIN.value = ''; CHATIN.style.display = 'none'; CHATIN.blur(); } else if (e.key === 'Escape') { CHATIN.value = ''; CHATIN.style.display = 'none'; CHATIN.blur(); } return; }
  if (e.key === 'Enter' && !UI.dialog && !UI.tab && G.state === 'play') { e.preventDefault(); e.stopPropagation(); CHATIN.style.display = 'block'; setTimeout(() => CHATIN.focus(), 0); }
}, true);

/* ------- o mundo continua andando com os menus abertos (todo mundo junto) ------- */
const _hudMP = hud;
hud = function (dt) {
  _hudMP(dt); try { mpUI(); } catch (e) { }
  if (inMP() && G.state === 'play') { try { if (paused() && !CS.on) update(Math.min(dt || .016, .05)); mpTick(Math.min(dt || .016, .05)); } catch (e) { console.error(e); } }
};
// caído: não anda, não ataca, só espera
const _updatePlayerMP = updatePlayer;
updatePlayer = function (dt) { if (P.downed > 0) { P.swing = null; P.action = null; P.draw = 0; P.moving = false; return; } return _updatePlayerMP(dt); };
if (G.state === 'title') showTitle(); // a tela inicial já tinha sido montada antes deste arquivo
// link de convite (…?sala=CÓDIGO): abre direto a tela de entrar, com o código preenchido
{ const m = /[?&]sala=([A-Za-z0-9]{5})/.exec(location.search); if (m) { MP.invite = m[1].toUpperCase(); setTimeout(() => { if (G.state === 'title') mpLobby(`Você foi convidado para a sala ${MP.invite}. Escolha seu nome e sua cor e clique em Entrar.`); }, 200); } }
