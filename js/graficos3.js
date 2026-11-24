'use strict';
/* ==========================================================================
   GRÁFICOS E DESEMPENHO
   Quatro níveis (Baixa, Média, Alta, Ultra) e o Automático, que mede os
   quadros por segundo enquanto você joga: se o aparelho não dá conta, desce
   um nível; se sobra folga por um tempo, sobe. Limite de 30 ou 60 quadros,
   contador de FPS e, no celular, tamanho e opacidade dos botões de toque.
   Menu: Pausa › Gráficos e desempenho (ou no menu inicial). Só no celular: no PC nada muda.
   ========================================================================== */
(function () {
  const MOB = typeof MOBILE !== 'undefined' && MOBILE;
  if (!MOB) return; // no PC o jogo fica como sempre foi: sem menu de gráficos nem ajuste automático
  const LV = [
    { n: 'Baixa', d: 'A mais leve. Desenha em resolução menor e desliga neblina, granulado, brilho das luzes e reflexos na água.', res: .6, fog: 0, grain: 0, glow: 0, water: 0, lightDiv: 5, rain: .35, parts: 80, hudEvery: 4, snap: 4, burstK: .4 },
    { n: 'Média', d: 'Equilíbrio para a maioria dos celulares. Mantém o brilho das luzes e os reflexos, sem neblina andando nem granulado.', res: .85, fog: 0, grain: 0, glow: 1, water: 1, lightDiv: 4, rain: .6, parts: 220, hudEvery: 2, snap: 3, burstK: .6 },
    { n: 'Alta', d: 'Todos os efeitos ligados, com nitidez boa. Para celulares fortes e computadores.', res: 1.25, fog: 1, grain: 1, glow: 1, water: 1, lightDiv: 3, rain: 1, parts: 500, hudEvery: 2, snap: 2, burstK: .8 },
    { n: 'Ultra', d: 'Tudo no máximo, na resolução total da tela. Pesa bastante em celular.', res: 2, fog: 1, grain: 1, glow: 1, water: 1, lightDiv: 3, rain: 1, parts: 900, hudEvery: 1, snap: 0, burstK: 1 },
  ];
  const MAX_AUTO = MOB ? 2 : 3;
  if (SET.gq === undefined) SET.gq = 'auto';
  if (SET.fpsCap !== 30) SET.fpsCap = 60; // 60 (padrão) ou 30
  if (SET.btn === undefined) SET.btn = .85;
  if (SET.btna === undefined) SET.btna = .85;
  // o automático começa de onde parou da última vez (no celular, de Média na primeira)
  const A = { lvl: clamp(SET.gqAuto !== undefined ? SET.gqAuto : MOB ? 1 : 3, 0, MAX_AUTO), banned: {}, bad: 0, good: 0, warm: 0, w0: 0, n: 0, work: 0 };

  function level() { return SET.gq === 'auto' ? A.lvl : SET.gq; }
  function apply() {
    const L = LV[level()]; for (const k in L) if (k !== 'n' && k !== 'd') GFX[k] = L[k];
    GFX.fps = SET.fpsCap || 60; GFX.mzoom = 1.2; try { resize(); } catch (e) { }
    meterTxt = '';
  }
  function setAuto(l, why) {
    if (l === A.lvl) return; A.lvl = l; SET.gqAuto = l; saveSet(); apply();
    if (why && typeof toast === 'function') toast(`Gráficos: ${LV[l].n} (${why})`, 'u_eye');
  }

  // ---------------- medição e modo automático ----------------
  const meter = document.createElement('div'); meter.id = 'fpsm';
  meter.style.cssText = (MOB ? 'position:fixed;right:136px;top:4px;' : 'position:fixed;left:50%;top:2px;transform:translateX(-50%);') + 'z-index:70;font:700 11px Barlow,sans-serif;color:#efe6d6;background:rgba(10,8,12,.7);padding:1px 7px;border-radius:3px;pointer-events:none;letter-spacing:.04em';
  meter.hidden = !SET.showFps; document.body.appendChild(meter);
  let meterTxt = '', mT = 0, mN = 0;
  GFX.onFrame = function (ts, work) {
    // contador de FPS (atualiza 2 vezes por segundo)
    mN++; if (!mT) mT = ts; if (ts - mT >= 500) { const f = Math.round(mN * 1000 / (ts - mT)); mN = 0; mT = ts; if (!meter.hidden) { const t = `${f} FPS · ${LV[level()].n}${SET.gq === 'auto' ? ' (auto)' : ''}`; if (t !== meterTxt) { meterTxt = t; meter.textContent = t; } } }
    // só mede jogando de verdade (menus, cenas e a primeira carga do mapa não contam)
    const live = G.state === 'play' && !paused() && !(typeof CS !== 'undefined' && CS.on) && !document.hidden && !P.sleeping;
    if (!live) { A.warm = 0; A.w0 = 0; return; }
    if (++A.warm < 90) return;
    if (!A.w0) { A.w0 = A.prev = ts; A.n = 0; A.work = 0; A.s1 = A.s2 = 0; return; }
    const iv = ts - A.prev; A.prev = ts; A.n++; A.work += work; A.s1 += iv; A.s2 += iv * iv; const el = ts - A.w0; if (el < 2000) return;
    const fps = A.n * 1000 / el, wavg = A.work / A.n, m = A.s1 / A.n, jit = Math.sqrt(Math.max(0, A.s2 / A.n - m * m)) / m; A.w0 = 0;
    if (SET.gq !== 'auto') return;
    const target = GFX.fps || 60, budget = 1000 / target;
    // lento de verdade = poucos quadros E (o jogo demora para desenhar OU os quadros saem irregulares).
    // Quadros poucos mas certinhos (economia de bateria, aba em segundo plano) não derrubam a qualidade.
    A.bad = fps < target * .8 && (wavg > budget * .3 || jit > .22) ? A.bad + 1 : 0;
    A.good = fps >= target * .93 && wavg < budget * .4 ? A.good + 1 : 0;
    if (A.bad >= 2 && A.lvl > 0) { A.banned[A.lvl] = 1; A.bad = A.good = 0; A.warm = 0; setAuto(A.lvl - 1, 'para não travar'); }
    else if (A.good >= 5 && A.lvl < MAX_AUTO && !A.banned[A.lvl + 1]) { A.bad = A.good = 0; A.warm = 0; setAuto(A.lvl + 1, 'sobrou desempenho'); }
  };

  // chão adiantado: com folga no quadro, já desenha um pedaço do mapa em volta da câmera
  // (assim andar não engasga quando um pedaço novo entra na tela)
  function prefetch() {
    const x0 = Math.floor(cam.x / CHPX) - 1, x1 = Math.floor((cam.x + VW) / CHPX) + 1, y0 = Math.floor(cam.y / CHPX) - 1, y1 = Math.floor((cam.y + VH) / CHPX) + 1;
    for (let y = Math.max(0, y0); y <= y1; y++) for (let x = Math.max(0, x0); x <= x1; x++) { if (x * CHPX >= WORLD_W || y * CHPX >= WORLD_H || chunks.has(x + y * 1000)) continue; getChunk(x, y); return; }
  }
  const _of = GFX.onFrame; GFX.onFrame = function (ts, work) { _of(ts, work); if (G.state === 'play' && work < 6) try { prefetch(); } catch (e) { } };

  // bichos: cada um vira uma figura própria, refeita a cada GFX.snap quadros (ou na hora, se levar dano,
  // virar ou mudar de ação). Entre uma e outra a figura só é reposicionada: o movimento continua liso e
  // o corpo do bicho (dezenas de traços) não é redesenhado em vetor a cada quadro.
  // Chefes, bichos altos e ataques que saem do corpo (círculos, rajadas) continuam desenhados direto.
  let SN = 0; const _ofs = GFX.onFrame; GFX.onFrame = function (ts, work) { SN++; _ofs(ts, work); };
  const LIVE = { imitador: 1, colhedor: 1, pernalta: 1, mae: 1, milbracos: 1, alfa: 1, rasteira: 1 };
  const _de = drawEnemy;
  drawEnemy = function (e) {
    const d = e.def || {};
    if (!GFX.snap || g.canvas !== cv || LIVE[e.type] || d.boss || d.reaper || d.mimic || d.patch || e.slam || e.r > 30 || (e.state && /wind|surface|burrow|emerge|leave/.test(e.state))) return _de(e);
    const S = DPR * Z * 1.5, half = Math.ceil(Math.max(44, e.r * 2.6 + 28)), px = Math.ceil(half * 2 * S), fl = e.flash > 0;
    let c = e._snap, da = c ? Math.abs(e.ang - c.ang) % 6.2832 : 9; if (da > 3.1416) da = 6.2832 - da;
    if (!c || c.S !== S || c.half !== half || c.fl !== fl || c.st !== e.state || SN - c.n >= GFX.snap || da > .1) {
      if (!c || c.width !== px) { c = e._snap = document.createElement('canvas'); c.width = c.height = px; c.x = c.getContext('2d'); }
      const x = c.x; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, px, px); x.setTransform(S, 0, 0, S, (half - e.x) * S, (half - e.y) * S); x.lineJoin = x.lineCap = 'round';
      const og = g; g = x; try { _de(e); } finally { g = og; }
      c.S = S; c.half = half; c.fl = fl; c.st = e.state; c.n = SN; c.ang = e.ang; c.dx = e.x; c.dy = e.y;
    }
    // a figura foi tirada com o bicho em (dx, dy); desenha deslocada para onde ele está agora
    g.drawImage(c, e.x - half, e.y - half, half * 2, half * 2);
  };

  // explosões de sangue e faíscas: menos partículas nos níveis leves (como no modo leve do The Light of Catacombs)
  const _burst = burst; burst = function (x, y, c, n, spd, size) { return _burst(x, y, c, Math.max(1, Math.round(n * (GFX.burstK || 1))), spd, size); };

  // minimapa e bússola: nos níveis leves, redesenhados menos vezes por segundo
  let hudN = 0; const _dm = drawMini, _dc = drawCompass;
  drawMini = function () { if (GFX.hudEvery > 1 && hudN % GFX.hudEvery) return; _dm(); };
  drawCompass = function () { hudN++; if (GFX.hudEvery > 1 && hudN % GFX.hudEvery) return; _dc(); };

  // ---------------- botões de toque (o mobile3.js usa estas variáveis) ----------------
  function applyBtn() { const r = document.documentElement.style; r.setProperty('--bs', SET.btn); r.setProperty('--ba', SET.btna); }

  // ---------------- menu ----------------
  const css = document.createElement('style');
  css.textContent = `#over .modal.gfx{max-width:640px;max-height:96vh;overflow:auto;padding:14px 20px}
  #over .gfx h2{margin:0 0 4px;font-size:24px}
  #over .gfx .seg{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;margin:6px 0}
  #over .gfx .seg .btn{flex:1 1 0;min-width:78px;margin:0;padding:7px 6px}
  #over .gfx .seg span{font-family:var(--display);color:var(--gold);font-size:14px;margin-right:4px}
  #over .gfx .gd{min-height:34px;margin:2px 0 6px;font-size:12.5px;line-height:1.35;color:var(--muted);text-align:center}
  #over .gfx h3{margin:6px 0 0;font-family:var(--display);font-weight:400;font-size:14px;color:var(--gold);text-align:center}
  #over .gfx .sets{display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;margin:4px 0}
  #over .gfx .menu{margin-top:8px}`;
  document.head.appendChild(css);
  function gfxMenu() {
    const g = SET.gq;
    const desc = g === 'auto' ? `Ajusta sozinho conforme o aparelho aguenta, sem passar de ${LV[MAX_AUTO].n}. Agora está em <b>${LV[A.lvl].n}</b>.` : LV[g].d;
    const qb = [['auto', 'Automático'], ...LV.map((l, i) => [i, l.n])].map(([v, n]) => `<button class="btn ${String(g) === String(v) ? '' : 'sec'}" data-a="gq" data-v="${v}">${n}</button>`).join('');
    const fb = [[30, '30 · poupa bateria'], [60, '60 · mais liso']].map(([v, n]) => `<button class="btn ${SET.fpsCap === v ? '' : 'sec'}" data-a="gfps" data-v="${v}">${n}</button>`).join('');
    const mob = MOB ? `<h3>Botões de toque</h3><div class="sets"><label><span>Tamanho</span><input type="range" id="set-btn" min="0.6" max="1.3" step="0.05" value="${SET.btn}"><b id="sv-btn">${Math.round(SET.btn * 100)}%</b></label><label><span>Opacidade</span><input type="range" id="set-btna" min="0.3" max="1" step="0.05" value="${SET.btna}"><b id="sv-btna">${Math.round(SET.btna * 100)}%</b></label></div>` : '';
    overlay(`<h2>Gráficos e desempenho</h2><div class="seg">${qb}</div><p class="gd">${desc}</p><div class="seg"><span>Quadros por segundo</span>${fb}<button class="btn sec" data-a="gshow">${SET.showFps ? 'Esconder FPS' : 'Mostrar FPS'}</button></div>${mob}<div class="menu"><button class="btn" data-a="gback">Voltar</button></div>`);
    const m = document.querySelector('#over .modal'); if (m) m.classList.add('gfx');
  }
  $('over').addEventListener('input', e => {
    const k = { 'set-btn': 'btn', 'set-btna': 'btna' }[e.target.id]; if (!k) return;
    SET[k] = +e.target.value; saveSet(); applyBtn(); const b = $('sv-' + k); if (b) b.textContent = Math.round(SET[k] * 100) + '%';
  });
  const _oa = overAct;
  overAct = function (a, v) {
    if (a === 'gfx') { UI.gfxFrom = G.state === 'play' ? 'pause' : 'title'; if (UI.gfxFrom === 'title') $('title').hidden = true; sfx('ui'); return gfxMenu(); }
    if (a === 'gq') { sfx('ui'); SET.gq = v === 'auto' ? 'auto' : +v; if (SET.gq === 'auto') { A.banned = {}; A.bad = A.good = A.warm = 0; } saveSet(); apply(); return gfxMenu(); }
    if (a === 'gfps') { sfx('ui'); SET.fpsCap = +v; saveSet(); apply(); A.warm = 0; return gfxMenu(); }
    if (a === 'gshow') { sfx('ui'); SET.showFps = !SET.showFps; saveSet(); meter.hidden = !SET.showFps; meterTxt = ''; return gfxMenu(); }
    if (a === 'gback') { sfx('ui'); if (UI.gfxFrom === 'pause') showPause(); else { $('over').hidden = true; $('over').innerHTML = ''; UI.over = false; showTitle(); } return; }
    return _oa(a, v);
  };
  const _sp = showPause;
  showPause = function () { _sp(); const h = document.querySelector('#over [data-a="help2"]'); if (h) h.insertAdjacentHTML('afterend', '<button class="btn sec" data-a="gfx">Gráficos e desempenho</button>'); };
  const _stt = showTitle;
  showTitle = function () { _stt(); const h = document.querySelector('#title [data-a="help"]'); if (h && !document.querySelector('#title [data-a="gfx"]')) h.insertAdjacentHTML('afterend', '<button class="btn sec" data-a="gfx">Gráficos</button>'); };

  apply(); applyBtn();
  if (!$('title').hidden) showTitle();
  window.GFXMENU = { LV, A, level, apply };
})();
