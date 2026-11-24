'use strict';
/* ==========================================================================
   CONTROLES DE TOQUE (celular e APK)
   Liga sozinho em tela de toque (ou com ?mobile=1 no endereço).
   · Analógico esquerdo: anda (empurrou até o fim, corre).
   · Analógico direito: mira e ataca/atira enquanto segura (com mira assistida
     no bicho mais próximo da direção). Toque rápido: age no ponto tocado
     (construir, atacar ali).
   · Botões: Usar, Rolar, Golpe forte, Bloquear, Recarregar, Curar, Agachar
     e a fileira de cima com Mochila, Criar, Mapa, Diário, Habilidades,
     Construir, Zoom e Pausa.
   Os botões só "apertam as teclas" do jogo: toda a lógica continua a mesma.
   ========================================================================== */
// MOBILE vem de js/render.js (o primeiro arquivo do jogo), para o motor saber desde o começo
if (MOBILE) (function () {
  // tela: largura fixa de 960 "pixels de página" para a interface caber em qualquer celular deitado
  const vp = document.querySelector('meta[name=viewport]'); if (vp) vp.content = 'width=960, user-scalable=no, viewport-fit=cover';
  document.documentElement.classList.add('mobile');
  window.STICK = { on: false, x: 0, y: 0 };

  const css = `
  html.mobile, html.mobile body { overscroll-behavior: none; -webkit-user-select: none; user-select: none; }
  html.mobile #cv { touch-action: none; }
  html.mobile #keys { display: none !important; }
  #touch { position: fixed; inset: 0; z-index: 30; pointer-events: none; font-family: "Barlow", sans-serif; }
  #touch.off { display: none; }
  #touch .zone { position: absolute; top: 16%; bottom: 0; pointer-events: auto; touch-action: none; }
  #touch .zl { left: 0; width: 45%; } #touch .zr { right: 0; width: 45%; }
  #touch .stick { position: absolute; width: 112px; height: 112px; margin: -56px 0 0 -56px; border-radius: 50%; border: 2px solid rgba(232,224,208,.24); background: rgba(10,8,12,.22); display: none; pointer-events: none; }
  #touch .stick i { position: absolute; left: 50%; top: 50%; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; background: rgba(232,224,208,.32); border: 2px solid rgba(232,224,208,.45); }
  #touch .stick.aim { border-color: rgba(224,80,90,.4); } #touch .stick.aim i { background: rgba(224,80,90,.4); border-color: rgba(255,140,140,.55); }
  /* botões de ação: um bloco no canto direito, em arco em volta do Usar; tamanho e opacidade vêm do menu de gráficos */
  #touch .acts { position: absolute; right: 0; bottom: 0; width: 260px; height: 250px; transform: scale(var(--bs, .85)); transform-origin: 100% 100%; opacity: var(--ba, .85); pointer-events: none; }
  #touch .b { position: absolute; pointer-events: auto; touch-action: none; border-radius: 50%; background: rgba(14,11,17,.62); border: 1.5px solid rgba(232,224,208,.28); color: #efe6d6; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 700; font-size: 9.5px; letter-spacing: .05em; text-transform: uppercase; }
  #touch .b b { font-size: 17px; line-height: 1; margin-bottom: 1px; font-weight: 400; }
  #touch .b.on { background: rgba(200,154,74,.55); border-color: #d9b36c; }
  #touch .b.main { border: 2px solid #d9b36c; color: #ffe2a8; font-size: 11px; } #touch .b.main b { font-size: 24px; }
  #touch .b.red { border-color: rgba(224,80,90,.65); }
  #touch .b.sm { font-size: 8.5px; } #touch .b.sm b { font-size: 14px; }
  #touch .top { position: absolute; top: 5px; left: 50%; transform: translateX(-50%) scale(min(1, var(--bs, .85) + .1)); transform-origin: 50% 0; display: flex; gap: 4px; pointer-events: auto; opacity: max(.7, var(--ba, .85)); }
  #touch .top .b { position: static; width: 46px; height: 32px; border-radius: 6px; font-size: 8px; letter-spacing: .03em; }
  #touch .top .b b { font-size: 12px; margin-bottom: 1px; }
  html.mobile.playing #hotwrap { z-index: 35; pointer-events: auto; }
  html.mobile #hotwrap { transform: translateX(-50%) scale(.74); transform-origin: 50% 100%; bottom: 6px; }
  html.mobile #vit { transform: scale(.68); transform-origin: 0 100%; left: 6px; bottom: 6px; }
  html.mobile #time3 { transform: scale(.74); transform-origin: 0 0; left: 6px; top: 6px; }
  html.mobile #rt { width: 124px !important; right: 6px; top: 6px; gap: 4px; }
  html.mobile #mini { width: 120px !important; height: 120px !important; }
  html.mobile #compass { display: block !important; width: 59px; height: 70px; }
  html.mobile #rt #qtrack { position: fixed; left: 6px; top: 46px; width: 200px !important; transform: scale(.74); transform-origin: 0 0; opacity: .9; }
  html.mobile #rt #qtrack.min > :not(h4) { display: none; }
  html.mobile #rt #qtrack.min h4::after { content: ' ▸'; opacity: .6; }
  html.mobile #toasts { top: 40px; transform: translateX(-50%) scale(.78); transform-origin: 50% 0; }
  html.mobile #status { top: auto; bottom: 96px; transform: scale(.8); transform-origin: 0 100%; }
  html.mobile #hotbar .hs, html.mobile #buildbar .bs { cursor: pointer; }
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // botões: [tecla, rótulo, ícone, centro x (a partir da direita), centro y (a partir de baixo), tamanho, classe]
  // Usar no canto; Golpe, Rolar e Bloquear num arco perto dele; Recarregar, Curar e Agachar num arco de fora
  const BTN = [
    ['e', 'Usar', '✋', 60, 58, 76, 'main'],
    ['f', 'Golpe', '💥', 158, 50, 58, 'red'],
    [' ', 'Rolar', '↻', 132, 128, 58, ''],
    ['block', 'Bloq.', '🛡', 62, 152, 58, ''],
    ['r', 'Recar.', '⟳', 226, 84, 46, 'sm'],
    ['q', 'Curar', '✚', 184, 178, 46, 'sm'],
    ['z', 'Agach.', '⤓', 106, 222, 46, 'sm'],
  ];
  const TOP = [['p', 'Pausa', '☰'], ['tab', 'Mochila', '🎒'], ['c', 'Criar', '🔨'], ['m', 'Mapa', '🗺'], ['j', 'Diário', '📖'], ['k', 'Habil.', '⭐'], ['v', 'Construir', '🧱'], ['t', 'Flecha', '➶']];
  const root = document.createElement('div'); root.id = 'touch';
  root.innerHTML = `<div class="zone zl"></div><div class="zone zr"></div><div class="stick" id="stL"><i></i></div><div class="stick aim" id="stR"><i></i></div>`
    + `<div class="acts">${BTN.map(([k, n, ic, x, y, s, c]) => `<div class="b ${c}" data-k="${k}" style="right:${x - s / 2}px;bottom:${y - s / 2}px;width:${s}px;height:${s}px"><b>${ic}</b>${n}</div>`).join('')}</div>`
    + `<div class="top">${TOP.map(([k, n, ic]) => `<div class="b" data-k="${k}"><b>${ic}</b>${n}</div>`).join('')}</div>`;
  document.body.appendChild(root);
  const $q = s => root.querySelector(s);
  const TB = root.querySelector('.top .b[data-k="t"]');

  const key = (k, type) => { const ev = new KeyboardEvent(type, { key: k === 'tab' ? 'Tab' : k, bubbles: true, cancelable: true }); window.dispatchEvent(ev); };
  const wake = () => { try { audioInit(); } catch (e) { } };

  // ---------------- botões ----------------
  root.querySelectorAll('.b').forEach(el => {
    const k = el.dataset.k;
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); wake(); el.classList.add('on'); try { el.setPointerCapture(e.pointerId); } catch (_) { }
      if (k === 'block') { mouse.rdown = true; mouse.rpressed = true; } else key(k, 'keydown');
    });
    const up = e => { el.classList.remove('on'); if (k === 'block') mouse.rdown = false; else key(k, 'keyup'); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });

  // ---------------- analógicos ----------------
  const S = { L: null, R: null, tapT: 0 };
  function stickStart(side, e) {
    e.preventDefault(); wake(); const z = e.currentTarget; try { z.setPointerCapture(e.pointerId); } catch (_) { }
    S[side] = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    const st = $q(side === 'L' ? '#stL' : '#stR'); st.style.display = 'block'; st.style.left = e.clientX + 'px'; st.style.top = e.clientY + 'px'; st.firstChild.style.transform = '';
  }
  function stickMove(side, e) {
    const s = S[side]; if (!s || s.id !== e.pointerId) return; e.preventDefault(); s.x = e.clientX; s.y = e.clientY;
    let dx = s.x - s.x0, dy = s.y - s.y0; let d = Math.hypot(dx, dy); const R = 48; if (d > 12) s.moved = true;
    // o analógico acompanha o dedo: se passar muito da borda, a base vem atrás
    if (d > R * 1.5) { const k = (d - R * 1.5) / d; s.x0 += dx * k; s.y0 += dy * k; dx = s.x - s.x0; dy = s.y - s.y0; d = Math.hypot(dx, dy); const b = $q(side === 'L' ? '#stL' : '#stR'); b.style.left = s.x0 + 'px'; b.style.top = s.y0 + 'px'; }
    if (d > R) { dx *= R / d; dy *= R / d; }
    $q(side === 'L' ? '#stL' : '#stR').firstChild.style.transform = `translate(${dx}px,${dy}px)`;
  }
  function stickEnd(side, e) {
    const s = S[side]; if (!s || s.id !== e.pointerId) return; S[side] = null; $q(side === 'L' ? '#stL' : '#stR').style.display = 'none';
    if (side === 'L') {
      keys.w = keys.a = keys.s = keys.d = keys.shift = false; STICK.on = false;
      // toque rápido em cima do painel da missão: recolhe ou abre
      const q = document.getElementById('qtrack'), r = q && q.getBoundingClientRect();
      if (r && r.width && !s.moved && performance.now() - s.t < 300 && s.x >= r.left && s.x <= r.right && s.y >= r.top && s.y <= r.bottom) { SET.qmin = !SET.qmin; saveSet(); q.classList.toggle('min', !!SET.qmin); try { sfx('ui'); } catch (_) { } }
    }
    else {
      mouse.down = false;
      // toque rápido sem arrastar: age no ponto tocado (construir, atacar ali)
      if (!s.moved && performance.now() - s.t < 260) { const r = cv.getBoundingClientRect(); mouse.x = s.x - r.left; mouse.y = s.y - r.top; mouse.down = true; mouse.pressed = true; S.tapT = 2; }
    }
  }
  for (const [sel, side] of [['.zl', 'L'], ['.zr', 'R']]) {
    const z = $q(sel);
    z.addEventListener('pointerdown', e => stickStart(side, e));
    z.addEventListener('pointermove', e => stickMove(side, e));
    z.addEventListener('pointerup', e => stickEnd(side, e));
    z.addEventListener('pointercancel', e => stickEnd(side, e));
  }

  // ---------------- barra de itens e de construção por toque ----------------
  document.getElementById('hotbar').addEventListener('pointerdown', e => { const s = e.target.closest('.hs'); if (!s) return; e.preventDefault(); wake(); const i = [...s.parentNode.children].indexOf(s); key(String(i + 1), 'keydown'); key(String(i + 1), 'keyup'); });
  document.getElementById('buildbar').addEventListener('pointerdown', e => { const s = e.target.closest('.bs'); if (!s) return; e.preventDefault(); wake(); const i = [...s.parentNode.querySelectorAll('.bs')].indexOf(s); if (i >= 0) { BUILD.sel = i; try { sfx('ui'); } catch (_) { } G.uiDirty = true; } });
  // cenas: tocar pula; diálogo: tocar avança (o próprio diálogo já aceita clique)
  window.addEventListener('pointerdown', e => { wake(); if (typeof CS !== 'undefined' && CS.on && !e.target.closest('#touch .b')) key(' ', 'keydown'); }, true);

  // ---------------- a cada quadro: direção, mira assistida, mostrar/esconder ----------------
  let lastMove = [0, 1];
  // painel da missão: um toque recolhe ou abre (fica guardado)
  setInterval(() => { const q = document.getElementById('qtrack'); if (q && q.classList.contains('min') !== !!SET.qmin) q.classList.toggle('min', !!SET.qmin); }, 500);
  let lastTick = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    // em telas de 90/120 Hz, no máximo uns 60 por segundo, como o desenho do jogo
    if (now - lastTick < 12) return; lastTick = now;
    const play = typeof G !== 'undefined' && G.state === 'play' && !UI.tab && !UI.over && !UI.dialog && !(typeof CS !== 'undefined' && CS.on) && !P.dead && !P.sleeping;
    root.classList.toggle('off', !play); document.documentElement.classList.toggle('playing', play); if (!play) { STICK.on = false; if (S.L || S.R) { S.L = S.R = null; keys.w = keys.a = keys.s = keys.d = keys.shift = false; mouse.down = false; } return; }
    const px = (P.x - cam.x) * Z, py = (P.y - cam.y - 6) * Z;
    const it = curItem(), bow = !!(it && /arco|besta/.test(it.id)); if (TB.style.display !== (bow ? '' : 'none')) TB.style.display = bow ? '' : 'none';
    // andar
    const L = S.L; if (L) {
      const dx = L.x - L.x0, dy = L.y - L.y0, d = Math.hypot(dx, dy), n = Math.min(1, d / 48), ux = d ? dx / d : 0, uy = d ? dy / d : 0;
      const on = n > .2;
      // a pé: direção livre (360°); dirigindo: as teclas de sempre (acelerar, ré, virar)
      if (P.driving) { STICK.on = false; keys.d = on && ux > .38; keys.a = on && ux < -.38; keys.s = on && uy > .38; keys.w = on && uy < -.38; }
      else { keys.w = keys.a = keys.s = keys.d = false; STICK.on = on; STICK.x = ux; STICK.y = uy; }
      keys.shift = on && n > .92;
      if (on) lastMove = [ux, uy];
    }
    // mirar
    const R = S.R; if (S.tapT > 0) { S.tapT--; if (!S.tapT) mouse.down = false; return; }
    if (R && R.moved) {
      let dx = R.x - R.x0, dy = R.y - R.y0; const d = Math.hypot(dx, dy) || 1; let ux = dx / d, uy = dy / d;
      // mira assistida: o bicho mais próximo dentro de um cone de ~28° na direção do analógico
      let best = null, bs = 1e9; const a0 = Math.atan2(uy, ux);
      for (const e of G.enemies) { if (e.dead || (e.def && e.def.patch)) continue; const ex = e.x - P.x, ey = e.y - P.y, ed = Math.hypot(ex, ey); if (ed > 520) continue; let da = Math.abs(Math.atan2(ey, ex) - a0); if (da > Math.PI) da = 2 * Math.PI - da; if (da > .5) continue; const sc = ed * (1 + da * 2); if (sc < bs) { bs = sc; best = e; } }
      if (best) { mouse.x = (best.x - cam.x) * Z; mouse.y = (best.y - cam.y) * Z; }
      else { mouse.x = px + ux * 200; mouse.y = py + uy * 200; }
      mouse.down = d > 22;
    } else if (!R) {
      // sem mirar: o personagem olha para onde anda
      if (L) { mouse.x = px + lastMove[0] * 160; mouse.y = py + lastMove[1] * 160; }
    }
  }
  requestAnimationFrame(tick);
  // aplica a tela nova (largura fixa e nitidez)
  setTimeout(() => { try { resize(); } catch (e) { } }, 60);
  addEventListener('orientationchange', () => setTimeout(() => { try { resize(); } catch (e) { } }, 300));
  // menu inicial: o rodapé fala de toque, não de teclado e mouse
  const _st = showTitle;
  showTitle = function () {
    _st();
    for (const el of document.querySelectorAll('#title *')) if (!el.children.length && /teclado e mouse/.test(el.textContent))
      el.textContent = el.textContent.replace('Jogo para teclado e mouse', 'Controles de toque').replace('neste navegador', window.SERRA_APP ? 'neste aparelho' : 'neste navegador');
  };
  if (!$('title').hidden) showTitle();
})();
