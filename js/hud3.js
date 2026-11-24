'use strict';
/* ==========================================================================
   HUD (3.0) · escuro, discreto, com cara de sobrevivência
   Canto inferior esquerdo: placa de ardósia com o medidor de vida (o anel de
   dentro é o fôlego) e as barras finas de necessidades. Hora e dia num
   medalhão escuro. Barra de itens, avisos e missões no mesmo estilo.
   ========================================================================== */
(() => {
  const css = `
  :root{--h-bg:rgba(14,12,16,.9);--h-bg2:#1b171d;--h-line:#3a3238;--h-amb:#c89a4a;--h-txt:#d8cfc0;--h-mut:#8a8088}
  #bars,#clock{display:none!important}
  .hplate{background:var(--h-bg);border:1px solid var(--h-line);box-shadow:0 8px 22px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.04);clip-path:polygon(10px 0,calc(100% - 10px) 0,100% 10px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0 calc(100% - 10px),0 10px)}
  #vit{position:absolute;left:14px;bottom:14px;display:flex;gap:12px;padding:12px 14px 12px 12px;pointer-events:none;align-items:center}
  #vit .gauge{position:relative;width:92px;height:92px;flex:none}
  #vit .gauge svg{position:absolute;inset:0}
  #vit .gauge .c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}
  #vit .gauge img{width:20px;height:20px;opacity:.9} #vit .gauge b{font:800 18px Barlow,sans-serif;color:var(--h-txt);line-height:1} #vit .gauge small{font:700 8.5px Barlow;letter-spacing:.14em;color:var(--h-mut)}
  #needs3{display:flex;flex-direction:column;gap:5px;min-width:150px}
  .nd3{display:grid;grid-template-columns:16px 1fr 26px;align-items:center;gap:7px;transition:opacity .4s}
  .nd3 img{width:16px;height:16px;opacity:.85} .nd3 .tr{height:6px;background:#0a080b;border-radius:1px;box-shadow:inset 0 0 0 1px #2a242a;overflow:hidden}
  .nd3 .tr i{display:block;height:100%;transition:width .2s} .nd3 em{font:700 11px Barlow;font-style:normal;color:var(--h-mut);text-align:right;font-variant-numeric:tabular-nums}
  .nd3.low em{color:#e07a6a} .nd3.low .tr i{animation:ndp .7s infinite alternate} .nd3.hid{display:none}
  @keyframes ndp{from{filter:brightness(1)}to{filter:brightness(1.6)}}
  #xp3{grid-column:1/-1;display:flex;align-items:center;gap:7px;margin-top:3px;font:800 10px Barlow;letter-spacing:.1em;color:var(--h-amb)}
  #xp3 .tr{flex:1;height:3px;background:#0a080b;overflow:hidden} #xp3 .tr i{display:block;height:100%;background:var(--h-amb)}
  #time3{position:absolute;left:14px;top:14px;display:flex;align-items:center;gap:10px;padding:7px 14px 7px 7px;pointer-events:none}
  #time3 .md{width:38px;height:38px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#2a2430,#0e0c10);box-shadow:inset 0 0 0 2px #3a3238,0 0 0 1px #000;display:flex;align-items:center;justify-content:center}
  #time3 .md img{width:22px;height:22px} #time3 b{display:block;font:400 19px "Special Elite",monospace;color:var(--h-txt);line-height:1.05} #time3 small{font:800 9px Barlow;letter-spacing:.16em;color:var(--h-amb)}
  #status{top:68px!important} #status div{background:var(--h-bg)!important;border:1px solid var(--h-line)!important;border-left:3px solid var(--h-amb)!important;border-radius:2px!important;color:var(--h-txt)!important}
  #status .bad{border-left-color:#c84a4a!important;color:#f0c0b8!important}
  #hotbar.card{background:var(--h-bg)!important;border:1px solid var(--h-line)!important;border-radius:4px!important;padding:7px!important;box-shadow:0 8px 22px rgba(0,0,0,.6)!important;clip-path:polygon(10px 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%,0 10px)}
  .hs{border-radius:6px!important;background:linear-gradient(180deg,#221d24,#151217)!important;border:1px solid #2e282f!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
  .hs.on{border-color:var(--h-amb)!important;background:linear-gradient(180deg,#3a2e22,#1d1712)!important;box-shadow:0 0 12px rgba(200,154,74,.35),inset 0 0 0 1px rgba(200,154,74,.4)!important;transform:translateY(-3px)}
  .hs k{color:var(--h-mut)!important}
  #hotinfo span,#stat3 span{background:var(--h-bg)!important;border:1px solid var(--h-line)!important;border-radius:3px!important;color:var(--h-txt)!important;font:700 11.5px Barlow,sans-serif!important;box-shadow:0 3px 8px rgba(0,0,0,.4)}
  #stat3{bottom:118px!important}
  #toasts>*{background:rgba(16,13,18,.94)!important;border:1px solid var(--h-line)!important;border-left:3px solid var(--h-amb)!important;color:var(--h-txt)!important;border-radius:2px!important;box-shadow:0 6px 16px rgba(0,0,0,.55)!important}
  #qtrack{background:var(--h-bg)!important;border:1px solid var(--h-line)!important;border-top:2px solid var(--h-amb)!important;border-radius:2px!important;box-shadow:0 8px 20px rgba(0,0,0,.55)!important}
  #qtrack h4{color:var(--h-amb)!important;font-family:"Special Elite",monospace!important} #qtrack .o{color:var(--h-txt)!important}
  #mini{border-radius:50%!important;border:4px solid #241e26!important;box-shadow:0 0 0 1px #000,0 0 0 3px rgba(200,154,74,.25),0 8px 18px rgba(0,0,0,.6)!important}
  #keys{opacity:.45} #itemname{color:var(--h-txt)!important;font-family:"Special Elite",monospace!important}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();
const NEEDS3 = [['hunger', 'carne_assada', '#b8743a', 'Fome'], ['thirst', 'u_drop', '#3a82b0', 'Sede'], ['sleep', 'u_moon', '#7a68a8', 'Sono'], ['sanity', 'u_eye', '#9a92ae', 'Mente'], ['inf', 'tecido_vivo', '#7a9a3a', 'Tecido'], ['temp', 'pele_branca', '#6a9ac8', 'Calor']];
const H3 = { last: {} };
function buildHud3() {
  const hud = document.getElementById('hud'); if (!hud || document.getElementById('vit')) return;
  const C = 2 * Math.PI * 40, C2 = 2 * Math.PI * 31;
  const v = document.createElement('div'); v.id = 'vit'; v.className = 'hplate';
  v.innerHTML = `<div class="gauge"><svg viewBox="0 0 92 92"><circle cx="46" cy="46" r="40" fill="#0c0a0d" stroke="#241d22" stroke-width="9"/><circle id="g-hp" cx="46" cy="46" r="40" fill="none" stroke="#a8302c" stroke-width="9" stroke-dasharray="${C}" transform="rotate(-90 46 46)"/>
      <circle cx="46" cy="46" r="31" fill="none" stroke="#1e1b16" stroke-width="4"/><circle id="g-st" cx="46" cy="46" r="31" fill="none" stroke="#b8a06a" stroke-width="4" stroke-dasharray="${C2}" transform="rotate(-90 46 46)"/></svg>
      <div class="c"><img src="${iconURL('u_heart')}" alt=""><b id="g-v">100</b><small>VIDA</small></div></div>
    <div id="needs3">${NEEDS3.map(([k, ic, col, n]) => `<div class="nd3" id="n3-${k}" title="${n}"><img src="${iconURL(ic)}" alt=""><div class="tr"><i style="background:${col}"></i></div><em>100</em></div>`).join('')}<div id="xp3"><span id="xp3-l">NV 1</span><div class="tr"><i></i></div><span id="xp3-p"></span></div></div>`;
  hud.appendChild(v);
  const t = document.createElement('div'); t.id = 'time3'; t.className = 'hplate'; t.innerHTML = `<div class="md"><img id="t3-ic" alt=""></div><div><b id="t3-t">07:00</b><small id="t3-d">DIA 1</small></div>`; hud.appendChild(t);
}
const setTxt = (id, s) => { const e = document.getElementById(id); if (e && H3.last[id] !== s) { H3.last[id] = s; e.textContent = s; } };
function hud3() {
  if (!document.getElementById('vit')) buildHud3(); if (G.state === 'title') return;
  const C = 2 * Math.PI * 40, C2 = 2 * Math.PI * 31, hp = clamp(P.hp / maxHp(), 0, 1), stm = clamp(P.stam / maxSt(), 0, 1);
  const gh = document.getElementById('g-hp'); if (gh) { const o = (C * (1 - hp)).toFixed(1); if (!GFX.lite || gh._o !== o) { gh._o = o; gh.setAttribute('stroke-dashoffset', o); } setS(gh, 'opacity', hp < .3 ? (.55 + .45 * Math.abs(Math.sin(performance.now() / 240))).toFixed(2) : '1'); }
  const gs = document.getElementById('g-st'); if (gs) { const o = (C2 * (1 - stm)).toFixed(1); if (!GFX.lite || gs._o !== o) { gs._o = o; gs.setAttribute('stroke-dashoffset', o); } }
  setTxt('g-v', String(Math.max(0, Math.ceil(P.hp))));
  const val = { hunger: P.hunger, thirst: P.thirst, sleep: P.sleep, sanity: P.sanity, inf: P.inf || 0, temp: P.temp === undefined ? 100 : P.temp };
  for (const [k] of NEEDS3) {
    const el = document.getElementById('n3-' + k); if (!el) continue; const v = val[k], hid = k === 'inf' ? v <= 0 : k === 'temp' ? v >= 95 : false, low = k === 'inf' ? v >= 50 : v < 22;
    if (H3.last['h' + k] !== hid) { H3.last['h' + k] = hid; el.classList.toggle('hid', hid); } if (H3.last['l' + k] !== low) { H3.last['l' + k] = low; el.classList.toggle('low', low); }
    const w = Math.round(clamp(v, 0, 100)) + '%'; if (H3.last['w' + k] !== w) { H3.last['w' + k] = w; el.querySelector('i').style.width = w; el.querySelector('em').textContent = k === 'inf' ? Math.ceil(v) + '%' : Math.ceil(v); }
  }
  setTxt('xp3-l', 'NV ' + P.lvl); setTxt('xp3-p', P.sp ? `+${P.sp} PONTO${P.sp > 1 ? 'S' : ''}` : ''); const xi = H3.xi ||= document.querySelector('#xp3 i'); if (xi) setS(xi, 'width', (clamp(P.xp / xpNeed(P.lvl), 0, 1) * 100).toFixed(1) + '%');
  const h = hourNow(), hh = Math.floor(h), mm = Math.floor((h - hh) * 6) * 10; setTxt('t3-t', String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0')); setTxt('t3-d', `DIA ${dayNum()} · ${DF().n.toUpperCase()}`);
  const ci = h >= 20.5 || h < 5.5 ? 'u_moon' : h < 7 || h > 18 ? 'u_dusk' : 'u_sun'; if (H3.ci !== ci) { H3.ci = ci; const im = document.getElementById('t3-ic'); if (im) im.src = iconURL(ci); }
}
const _hud3 = hud;
hud = function (dt) { _hud3(dt); try { hud3(); } catch (e) { } };

/* ---------------- barra de construção sem invadir os painéis ----------------
   Com 8 peças ela ficava mais larga que o espaço entre o painel de vida (esquerda)
   e as teclas (direita) e passava por baixo deles. Agora ela quebra em linhas e
   nunca ocupa mais que o vão livre entre os dois. */
(function () {
  const st = document.createElement('style');
  st.textContent = `#hotwrap{max-width:var(--hotmax,70vw)} #buildbar{flex-wrap:wrap;justify-content:center;max-width:100%}
  #buildbar .bs{min-width:0;flex:0 1 auto;padding:4px 9px 4px 6px} #buildbar .bs img{width:30px;height:30px}
  #buildbar .bstat{flex:1 0 100%;flex-direction:row;align-items:baseline;justify-content:center;gap:10px;min-width:0;padding:3px 6px 0}`;
  document.head.appendChild(st);
  let t = 0;
  function fitHot() {
    const hudEl = document.getElementById('hud'), wrap = document.getElementById('hotwrap'); if (!hudEl || !wrap || hudEl.hidden) return;
    const H = hudEl.getBoundingClientRect(), cx = H.left + H.width / 2;
    const vit = document.getElementById('vit'), keys = document.getElementById('keys');
    const L = vit && vit.offsetWidth ? vit.getBoundingClientRect().right : H.left + 16;
    const R = keys && keys.offsetWidth && keys.textContent.trim() ? keys.getBoundingClientRect().left : H.right - 16;
    if (BUILD.on) {
      // no modo construção a barra ocupa todo o vão entre o painel de vida e a borda direita
      wrap.style.left = Math.round(L - H.left + 12) + 'px'; wrap.style.right = Math.round(H.right - R + 12) + 'px'; wrap.style.transform = 'none'; wrap.style.setProperty('--hotmax', 'none');
    } else {
      wrap.style.left = wrap.style.right = wrap.style.transform = '';
      wrap.style.setProperty('--hotmax', Math.floor(Math.max(320, 2 * Math.min(cx - L, R - cx) - 24)) + 'px');
    }
  }
  window.fitHot = fitHot;
  const _hudFit = hud;
  let lastB = null;
  hud = function (dt) { _hudFit(dt); t -= dt || .016; if (lastB !== BUILD.on) { lastB = BUILD.on; t = 0; } if (t <= 0) { t = .3; try { fitHot(); } catch (e) { } } };
  addEventListener('resize', () => setTimeout(fitHot, 50));
})();
