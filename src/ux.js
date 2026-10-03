/* ================= UX: Hoje, barra de baixo, botão +, gestos, busca, desfazer, aparência ================= */
const UXI = {
  aa:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18 8 6l5 12M4.6 14h6.8"/><path d="M15 18v-1.2M15 11.5a3 3 0 0 1 3-1.5c1.7 0 3 1 3 2.6V18M21 15c-1.8-.4-6 0-6 1.7 0 1 .9 1.5 2 1.5 2 0 4-1.3 4-3.2"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>',
  music:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>',
  train:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3h5l4 18h-13Z"/><path d="M12 16 16 7"/><path d="M7.5 13h9"/></svg>',
  book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5Z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/><path d="M9 7.5h6M9 11h4"/></svg>',
  panel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="2.2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2"/><path d="M17.25 14v6.5M14 17.25h6.5"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  paste:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="3" width="8" height="4" rx="1.2"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="M9 13h6M9 16.5h4"/></svg>',
  q:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8.5 8.5 0 0 1-12.3 7.6L3.5 21l1.4-4.8A8.5 8.5 0 1 1 21 12Z"/><path d="M9.8 9.6a2.3 2.3 0 0 1 4.4.9c0 1.6-2.2 2-2.2 3.2M12 16.6h.01"/></svg>',
  fork:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v8a3 3 0 0 0 6 0V3"/><path d="M12 14v7"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><path d="M19 3v4M17 5h4"/></svg>',
  metro:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3h5l4 18h-13Z"/><path d="M12 16 16 7"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/></svg>',
  send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3 10 14"/><path d="M21 3 14.5 21l-4.5-7-7-4.5Z"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.7L9.5 4.6A1 1 0 0 0 8 5.5z"/></svg>',
  swap:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  money:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/></svg>',
  spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>',
  stage:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
};

/* ---------- preferências de aparência ---------- */
const UXK = 'fluid.ux';
const ux = Object.assign({ zoom:1, contrast:false, sounds:false, calm:false }, lsGet(UXK, {}) || {});
function uxApply(){
  const r = document.documentElement;
  r.style.setProperty('--uiZoom', String(ux.zoom || 1));
  if (ux.contrast) r.dataset.contrast = 'high'; else delete r.dataset.contrast;
  r.classList.toggle('calm', !!ux.calm);
}
function uxSave(){ lsSet(UXK, ux); uxApply(); }
uxApply();
const reduceMotion = () => ux.calm || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------- sons sutis da interface ---------- */
function uiSound(k){
  if (!ux.sounds) return;
  try { const c = actx(), t = c.currentTime + .01;
    if (k==='done'){ pluck(72, t, .09, .7); pluck(79, t+.08, .09, .9); pluck(84, t+.16, .07, 1.1); }
    else if (k==='undo'){ pluck(79, t, .08, .5); pluck(72, t+.08, .08, .7); }
    else if (k==='open'){ pluck(81, t, .045, .35); }
    else if (k==='tap'){ pluck(88, t, .03, .2); }
  } catch(e){}
}
window.FLUID_SOUND = uiSound;

/* ---------- desfazer: toast com botão ---------- */
function undoToast(msg, undo, ms){
  ms = ms || 5000;
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast undo'; t.setAttribute('role','status');
  t.innerHTML = `<span class="ut-msg"></span>${undo ? '<button class="ut-btn" type="button">Desfazer</button>' : ''}<i class="ut-bar" style="animation-duration:${ms}ms"></i>`;
  t.querySelector('.ut-msg').textContent = msg;
  document.body.appendChild(t);
  let done = false; const kill = () => { if (done) return; done = true; t.classList.add('out'); setTimeout(() => t.remove(), 260); };
  const b = t.querySelector('.ut-btn'); if (b) b.onclick = () => { kill(); uiSound('undo'); hap('undo'); try { undo(); } catch(e){} };
  setTimeout(kill, ms);
}
window.FLUID_UNDO = undoToast;

/* ---------- ilustrações das telas vazias ---------- */
function illo(kind){
  const notes = `<g class="il-notes"><path class="il-n1" d="M150 46v-18l12-3v16" /><circle class="il-n1" cx="147" cy="46" r="4"/><circle class="il-n1" cx="159" cy="43" r="4"/><path class="il-n2" d="M36 58V44l10-2" /><circle class="il-n2" cx="33" cy="58" r="3.5"/></g>`;
  const art = {
    songs: `<g class="il-float"><ellipse cx="100" cy="86" rx="30" ry="26" class="il-fill"/><ellipse cx="100" cy="62" rx="22" ry="19" class="il-fill"/><circle cx="100" cy="76" r="8" class="il-hole"/><rect x="95" y="10" width="10" height="56" rx="3" class="il-neck"/><rect x="92" y="4" width="16" height="12" rx="4" class="il-neck"/><path d="M97 26h6M97 36h6M97 46h6" class="il-line"/><rect x="88" y="98" width="24" height="4" rx="2" class="il-line-f"/></g>${notes}`,
    lessons: `<g class="il-float"><rect x="62" y="16" width="76" height="92" rx="12" class="il-fill"/><path d="M78 40h44M78 54h44M78 68h30" class="il-line"/><circle cx="62" cy="34" r="4" class="il-hole"/><circle cx="62" cy="56" r="4" class="il-hole"/><circle cx="62" cy="78" r="4" class="il-hole"/><g class="il-pen"><path d="M128 84l22-22 8 8-22 22-10 2Z" class="il-neck"/></g></g>${notes}`,
    done: `<g class="il-float"><circle cx="100" cy="60" r="38" class="il-fill"/><path d="M82 61l12 12 24-26" class="il-check"/></g><g class="il-spark"><path d="M44 30l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path d="M156 76l2.4 6 6 2.4-6 2.4-2.4 6-2.4-6-6-2.4 6-2.4z"/><path d="M150 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g>`,
    search: `<g class="il-float"><circle cx="92" cy="54" r="30" class="il-fill"/><circle cx="92" cy="54" r="18" class="il-hole"/><path d="M114 76l22 22" class="il-thick"/></g>${notes}`,
  }[kind] || '';
  return `<svg class="illo il-${kind}" viewBox="0 0 200 120" aria-hidden="true">${art}</svg>`;
}

/* ---------- esqueletos de carregamento ---------- */
function skelCards(n){ return `<div class="skel-wrap" role="status" aria-label="Carregando suas músicas">${Array.from({length:n}, () => `<div class="skel skel-card"><i></i><span><b></b><small></small><em></em></span></div>`).join('')}</div>`; }

/* ---------- números que sobem contando ---------- */
const countMemo = {};
function countFmt(v, f){ if (f==='brl') return (Number(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }); if (f==='pct') return Math.round(v) + '%'; return String(Math.round(v)); }
function countUp(el){
  const to = Number(el.dataset.count), f = el.dataset.fmt || '', key = el.dataset.ck || '';
  if (!isFinite(to)) return; el.dataset.counted = '1';
  const from = key && countMemo[key] != null ? countMemo[key] : 0; if (key) countMemo[key] = to;
  if (from === to || reduceMotion()) { el.textContent = countFmt(to, f); return; }
  const t0 = performance.now(), dur = Math.min(1100, 500 + Math.abs(to - from) * 2);
  const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = countFmt(from + (to - from) * e, f); if (k < 1 && el.isConnected) requestAnimationFrame(step); };
  el.textContent = countFmt(from, f); requestAnimationFrame(step);
}
new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes){ if (n.nodeType !== 1) continue; if (n.dataset && n.dataset.count != null && !n.dataset.counted) countUp(n); n.querySelectorAll && n.querySelectorAll('[data-count]:not([data-counted])').forEach(countUp); } })
  .observe(document.body, { childList:true, subtree:true });

/* ---------- últimas músicas abertas (para "continuar de onde parou") ---------- */
const LASTK = 'fluid.recent';
function recentIds(){ return (lsGet(LASTK, []) || []).filter(id => songs.some(s => s.id === id)); }
function pushRecent(id){ lsSet(LASTK, [id, ...(lsGet(LASTK, []) || []).filter(x => x !== id)].slice(0, 8)); }

/* ---------- abrir música: o card cresce até virar a página ---------- */
let lastOpen = null;
document.addEventListener('pointerdown', e => { const o = e.target.closest('[data-open],[data-sr-song]'); if (o){ const r = o.getBoundingClientRect(); lastOpen = { r, t: Date.now() }; } }, true);
const _openSong = openSong;
openSong = function(id){
  const fresh = !layer.querySelector('.sheet');
  pushRecent(id); _openSong(id); uiSound('open');
  const sh = layer.querySelector('.sheet');
  if (!sh || !fresh || !lastOpen || Date.now() - lastOpen.t > 1200 || reduceMotion() || !sh.animate) return;
  const c = lastOpen.r, r = sh.getBoundingClientRect(); lastOpen = null;
  const ins = [Math.max(0, c.top - r.top), Math.max(0, r.right - c.right), Math.max(0, r.bottom - c.bottom), Math.max(0, c.left - r.left)];
  if (ins[0] + ins[2] >= r.height - 10 || ins[1] + ins[3] >= r.width - 10) return;
  sh.style.animation = 'none';
  sh.animate([{ clipPath:`inset(${ins.map(v => v.toFixed(0)+'px').join(' ')} round 22px)`, opacity:.55 }, { clipPath:'inset(0px 0px 0px 0px round 26px)', opacity:1 }], { duration:420, easing:'cubic-bezier(.32,.72,0,1)' });
  const b = sh.querySelector('.sheet-body'); if (b && b.animate) b.animate([{ opacity:0, transform:'translateY(8px)' }, { opacity:1, transform:'none' }], { duration:320, delay:80, easing:'cubic-bezier(.23,1,.32,1)', fill:'backwards' });
};

/* ---------- apagar música com desfazer ---------- */
async function uxDeleteSong(id){
  const s = songs.find(x => x.id === id); if (!s) return;
  const copy = JSON.parse(JSON.stringify(s)), idx = songs.indexOf(s);
  await deleteSong(id);
  undoToast(`"${copy.title || 'Música'}" apagada`, async () => { if (songs.some(x => x.id === copy.id)) return; songs.splice(Math.min(idx, songs.length), 0, copy); if (db) await writeSong(copy); else lsSave(); render(); toast('Música de volta'); });
}

/* ---------- marcar lição feita: check desenhado + desfazer ---------- */
function uxToggle(lid, list, idx, label){
  toggleItem(lid, list, idx); uiSound('done'); hap('done');
  const l = lessons.find(x => x.id === lid), it = l && (l[list]||[])[idx];
  if (it && it.done){
    const left = pendingCount();
    undoToast(label + (list==='homework' && left===0 ? '. Tudo em dia!' : ''), () => toggleItem(lid, list, idx));
    if (list==='homework' && left===0){ try { confetti(110); } catch(e){} }
  }
}
app.addEventListener('click', e => {
  const b = e.target.closest('[data-tcheck]'); if (!b) return;
  e.stopPropagation(); e.preventDefault();
  if (b.dataset.popped) return; b.dataset.popped = '1';
  const [id, list, i] = b.dataset.tcheck.split(':');
  b.classList.add('checking'); const row = b.closest('.sw, .check-row'); row && row.classList.add('leaving');
  setTimeout(() => uxToggle(id, list, +i, list==='homework' ? 'Lição feita' : 'Dúvida respondida'), reduceMotion() ? 0 : 420);
}, true);

/* ---------- deslizar (lição feita, pagamento recebido, cobrar) ---------- */
let sw = null, swSuppress = 0;
document.addEventListener('pointerdown', e => {
  if (e.button > 0) return; const el = e.target.closest('[data-swipe]'); if (!el) return;
  if (e.target.closest('input,textarea,select')) return;
  const fg = el.querySelector(':scope > .sw-fg'); if (!fg) return;
  sw = { el, fg, bg: el.querySelector(':scope > .sw-bg'), x0: e.clientX, y0: e.clientY, dx: 0, state: 'pending', id: e.pointerId, w: el.offsetWidth, t0: performance.now() };
});
document.addEventListener('pointermove', e => {
  if (!sw || e.pointerId !== sw.id) return;
  const dx = e.clientX - sw.x0, dy = e.clientY - sw.y0;
  if (sw.state === 'pending'){
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)){ sw = null; return; }
    if (Math.abs(dx) < 10) return;
    sw.state = 'drag'; sw.el.classList.add('swiping'); try { sw.el.setPointerCapture(e.pointerId); } catch(err){}
  }
  const canR = !!sw.el.dataset.swipeR, canL = !!sw.el.dataset.swipeL;
  let x = dx; if ((x > 0 && !canR) || (x < 0 && !canL)) x = x / 6;
  const lim = sw.w * .42; if (Math.abs(x) > lim) x = Math.sign(x) * (lim + (Math.abs(x) - lim) / 3);
  sw.dx = x; sw.fg.style.transform = `translateX(${x}px)`;
  const p = Math.min(1, Math.abs(x) / Math.min(120, sw.w * .3));
  sw.el.dataset.dir = x > 0 ? 'r' : 'l'; if (sw.bg){ sw.bg.style.opacity = (.35 + p * .65).toFixed(2); sw.bg.querySelectorAll('span').forEach(s => { s.style.transform = `scale(${(.88 + p * .12).toFixed(3)})`; }); }
  if (p >= 1 && !sw.armed){ sw.armed = true; hap('tick'); sw.el.classList.add('armed'); } else if (p < 1 && sw.armed){ sw.armed = false; sw.el.classList.remove('armed'); }
}, { passive: true });
function swEnd(e){
  if (!sw || (e && e.pointerId !== sw.id)) return; const s = sw; sw = null; if (s.state !== 'drag') return;
  swSuppress = Date.now();
  const dir = s.dx > 0 ? 'r' : 'l', v = Math.abs(s.dx) / Math.max(1, performance.now() - s.t0), fling = v > .55 && Math.abs(s.dx) > 40;
  const ok = (s.armed || fling) && (dir === 'r' ? s.el.dataset.swipeR : s.el.dataset.swipeL);
  if (s.bg) setTimeout(() => { s.bg.style.opacity = ''; s.bg.querySelectorAll('span').forEach(x => { x.style.transform = ''; }); }, 340);
  s.fg.style.transition = 'transform .26s cubic-bezier(.23,1,.32,1)';
  if (ok){
    s.fg.style.transform = `translateX(${dir === 'r' ? s.w : -s.w}px)`;
    setTimeout(() => { s.el.dispatchEvent(new CustomEvent('fluid-swipe', { bubbles: true, detail: { dir } })); lsSet('fluid.swiped', 1); }, 230);
  } else { s.fg.style.transform = ''; setTimeout(() => { s.el.classList.remove('swiping','armed'); s.fg.style.transition = ''; }, 330); }
}
document.addEventListener('pointerup', swEnd); document.addEventListener('pointercancel', swEnd);
document.addEventListener('click', e => { if (Date.now() - swSuppress < 350){ e.stopPropagation(); e.preventDefault(); swSuppress = 0; } }, true);
document.addEventListener('fluid-swipe', e => {
  const el = e.target.closest('[data-swipe]'); if (!el) return; const k = el.dataset.swipe;
  if (k === 'hw' || k === 'q'){ const [lid, i] = el.dataset.k.split(':'); uxToggle(lid, k==='hw' ? 'homework' : 'questions', +i, k==='hw' ? 'Lição feita' : 'Dúvida respondida'); }
  if (k === 'tpay' && window.FluidHub){ if (e.detail.dir === 'r'){ window.FluidHub.quickPay(el.dataset.id); setTimeout(render, 60); } else { render(); window.FluidHub.openCard(el.dataset.id); } }
});

/* ---------- segurar uma música: atalhos ---------- */
let lp = null;
app.addEventListener('pointerdown', e => {
  const o = e.target.closest('[data-open]'); if (!o || e.button > 0) return;
  lp = { o, x: e.clientX, y: e.clientY, t: setTimeout(() => { if (!lp) return; lp.fired = true; o.classList.add('pressed'); hap('hold'); songActions(o.dataset.open); }, 480) };
  o.classList.add('holding');
});
const lpCancel = () => { if (!lp) return; clearTimeout(lp.t); lp.o.classList.remove('holding'); const f = lp.fired; setTimeout(() => lp && lp.o && lp.o.classList.remove('pressed'), 200); if (f) swSuppress = Date.now(); lp = null; };
app.addEventListener('pointermove', e => { if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 9) lpCancel(); });
app.addEventListener('pointerup', lpCancel); app.addEventListener('pointercancel', lpCancel);
app.addEventListener('contextmenu', e => { const o = e.target.closest('[data-open]'); if (!o) return; e.preventDefault(); lpCancel(); songActions(o.dataset.open); });

/* ---------- folha de baixo genérica (atalhos, aparência, dúvida rápida) ---------- */
function uxSheet(html, cls){
  uxSheetClose(true);
  const el = document.createElement('div'); el.id = 'ux-sheet'; el.className = 'ux-layer';
  el.innerHTML = `<div class="ux-scrim" data-ux-close></div><div class="ux-sheet ${cls||''}" role="dialog" aria-modal="true"><div class="ux-grab-zone"><i class="ux-grab"></i></div>${html}</div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target.closest('[data-ux-close]')) uxSheetClose(); });
  setTimeout(() => { const f = el.querySelector('[autofocus]') || el.querySelector('button:not([data-ux-close])'); f && f.focus({ preventScroll:true }); }, 60);
  return el;
}
function uxSheetClose(now){
  const el = document.getElementById('ux-sheet'); if (!el) return;
  if (now || reduceMotion()){ el.remove(); return; }
  el.classList.add('out'); setTimeout(() => el.remove(), 240);
}
function songActions(id){
  const s = songs.find(x => x.id === id); if (!s) return;
  const names = [...new Set(songNames(s))];
  const acts = [
    ['play', 'Tocar junto', 'Metrônomo, batida e acorde da vez', () => openPractice(s)],
    names.length >= 2 && ['swap', 'Treinar as trocas', names.slice(0,4).join(' → ') + (names.length > 4 ? '…' : ''), () => { openSong(s.id); openTrocas(s); }],
    ['music', 'Abrir a música', 'Acordes, letra, batida e gravações', () => openSong(s.id)],
    ['edit', 'Editar', 'Título, acordes, capo, letra', () => openEditor(s)],
    window.FluidHub && window.FluidWeb && ['send', 'Enviar para um aluno', 'Copia para outra pasta', () => window.FluidHub.sendSong(s)],
    ['copy', 'Copiar como mensagem', 'Para mandar no WhatsApp', async () => { try { await navigator.clipboard.writeText(toMessage(s)); toast('Mensagem copiada'); } catch(e){ openSong(s.id); } }],
    ['trash', 'Apagar', 'Dá para desfazer logo depois', () => uxDeleteSong(s.id), 'danger'],
  ].filter(Boolean);
  const el = uxSheet(`<div class="ux-sh-head"><span class="dotc" style="background:${hueOf(s)}">${esc(initials(s.title))}</span><span><b>${esc(s.title || 'Sem título')}</b><small>${esc(s.artist || 'Artista não informado')}${s.capo ? ' · capo ' + s.capo : ''}</small></span></div>
    <div class="ux-acts">${acts.map((a, i) => `<button class="ux-act ${a[4]||''}" data-i="${i}" style="animation-delay:${i*30}ms"><span class="ux-act-ic">${UXI[a[0]]}</span><span><b>${a[1]}</b><small>${esc(a[2])}</small></span></button>`).join('')}</div>`);
  el.addEventListener('click', e => { const b = e.target.closest('.ux-act'); if (!b) return; uxSheetClose(true); acts[+b.dataset.i][3](); });
}

/* ---------- aparência: tema, letra, contraste, sons, movimento ---------- */
function openLook(){
  const th = (() => { try { return localStorage.getItem('fluid.theme') || 'auto'; } catch(e){ return 'auto'; } })();
  const tog = (k, t, d) => `<button class="ux-tog" role="switch" aria-checked="${!!ux[k]}" data-look="${k}"><span><b>${t}</b><small>${d}</small></span><i aria-hidden="true"></i></button>`;
  const el = uxSheet(`<h2 class="ux-sh-title">Aparência</h2>
    <div class="ux-look">
      <div class="ux-row"><span class="ux-lbl">Tema</span><div class="seg" role="group" aria-label="Tema">${[['light','Claro'],['dark','Escuro'],['auto','Automático']].map(([k,l]) => `<button data-theme-set="${k}" aria-pressed="${th===k}">${l}</button>`).join('')}</div></div>
      <div class="ux-row"><span class="ux-lbl">Tamanho da letra</span><div class="seg" role="group" aria-label="Tamanho da letra">${[[1,'A','Normal'],[1.12,'A','Grande'],[1.25,'A','Maior']].map(([z,l,t],i) => `<button data-zoom="${z}" aria-pressed="${Math.abs((ux.zoom||1)-z)<.01}" aria-label="${t}" style="font-size:${13+i*3}px">${l}</button>`).join('')}</div></div>
      <p class="ux-prev">Para ler de longe, com o violão no colo.</p>
      ${tog('contrast', 'Alto contraste', 'Textos e bordas mais fortes')}
      ${tog('sounds', 'Sons da interface', 'Um toque suave ao concluir e desfazer')}
      ${tog('calm', 'Menos movimento', 'Desliga as animações')}
    </div>`, 'look');
  el.addEventListener('click', e => {
    const t = e.target.closest('[data-theme-set],[data-zoom],[data-look]'); if (!t) return;
    if (t.dataset.themeSet){ const v = t.dataset.themeSet; try { if (v==='auto') localStorage.removeItem('fluid.theme'); else localStorage.setItem('fluid.theme', v); } catch(err){} applyTheme(v==='auto' ? null : v); }
    if (t.dataset.zoom){ ux.zoom = +t.dataset.zoom; uxSave(); }
    if (t.dataset.look){ ux[t.dataset.look] = !ux[t.dataset.look]; uxSave(); if (t.dataset.look==='sounds' && ux.sounds){ try { unlockAudio(); } catch(err){} uiSound('done'); } }
    buzz(6); render(); const y = el.querySelector('.ux-sheet').scrollTop; openLook(); const n = document.querySelector('#ux-sheet .ux-sheet'); if (n){ n.style.animation = 'none'; n.scrollTop = y; } const sc = document.querySelector('#ux-sheet .ux-scrim'); if (sc) sc.style.animation = 'none';
  });
}

/* ---------- dúvida rápida para a próxima aula ---------- */
function quickQuestion(){
  if (!lessons.length){ toast('Registre a primeira aula para anotar dúvidas'); openLesson(null); return; }
  const el = uxSheet(`<h2 class="ux-sh-title">Dúvida para a próxima aula</h2>
    <form class="ux-qform"><input class="inp" id="ux-q" placeholder="Ex.: como abafar a corda no ritmo?" maxlength="160" autofocus enterkeyhint="send" autocomplete="off"><button class="btn primary" type="submit">Anotar</button></form>
    <p class="ux-prev">Fica na tela Aulas, em "Levar na próxima aula".</p>`);
  el.querySelector('form').onsubmit = e => { e.preventDefault(); const v = el.querySelector('#ux-q').value.trim(); if (!v) return; const last = lessons[0];
    saveLesson({ ...last, questions: [...(last.questions||[]).map(x => ({...x})), { t: v, done: false }] }); uxSheetClose(); render(); uiSound('done'); toast('Dúvida anotada'); };
}

/* ---------- botão + com menu que se abre ---------- */
function fabItems(){
  const teacher = window.FluidHub && window.FluidHub.todayInfo && window.FluidHub.todayInfo();
  return [
    ['paste', 'Colar mensagem do professor', '#8B5CF6', () => openEditor(null, { paste: true })],
    ['music', 'Nova música', '#14B8A6', () => openEditor(null)],
    ['book', 'Registrar aula', '#F97316', () => openLesson(null)],
    ['q', 'Anotar dúvida', '#0EA5E9', quickQuestion],
    ['fork', 'Afinar', '#E11D48', () => openTuner()],
    window.FluidHub && window.FluidWeb && ['user', teacher ? 'Novo aluno' : 'Dar aulas: cadastrar aluno', '#6366F1', () => window.FluidHub.newStudent()],
  ].filter(Boolean);
}
function fabOpen(){
  if (document.getElementById('ux-fab')) return fabClose();
  const items = fabItems(); hap('tab'); uiSound('tap');
  const el = document.createElement('div'); el.id = 'ux-fab'; el.className = 'ux-layer';
  el.innerHTML = `<div class="ux-scrim fab-scrim" data-ux-close></div><div class="fab-menu" role="menu" aria-label="Criar">${items.map((it, i) => `<button class="fab-it" role="menuitem" data-i="${i}" data-k="${it[0]}" style="--c:${it[2]};--d:${(items.length-1-i)*22}ms"><span class="fab-lb">${it[1]}</span><span class="fab-ic">${UXI[it[0]]}</span></button>`).join('')}</div>`;
  document.body.appendChild(el); document.body.classList.add('fab-on');
  el.addEventListener('click', e => { if (e.target.closest('[data-ux-close]')) return fabClose(); const b = e.target.closest('.fab-it'); if (!b) return; fabRun(items, +b.dataset.i); });
  setTimeout(() => { const f = el.querySelector('.fab-it:last-child'); f && f.focus({ preventScroll:true }); }, 50);
}
function fabRun(items, i){ const it = items[i]; if (!it) return; fabClose(); lsSet('fluid.fab.last', it[0]); hap('tick'); it[3](); }
function fabClose(){ const el = document.getElementById('ux-fab'); document.body.classList.remove('fab-on'); if (!el) return; el.classList.add('out'); setTimeout(() => el.remove(), 220); }

/* ---------- barra de navegação de baixo ---------- */
const DOCK = [['hoje','Hoje','home'],['musicas','Músicas','music'],['+','',''],['treino','Treinar','train'],['aulas','Aulas','book']];
let dockEl = null;
function liveLesson(){
  const ti = window.FluidHub && window.FluidHub.todayInfo ? window.FluidHub.todayInfo() : null; if (!ti) return null;
  const now = new Date(), m = now.getHours()*60 + now.getMinutes();
  return ti.lessons.find(x => { if (!x.time || x.status === 'falta') return false; const [h, mm] = x.time.split(':').map(Number); const t = h*60 + (mm||0); return m >= t - 15 && m <= t + 60; }) || null;
}
function lessonDay(){ // aluno: o dia da semana em que as aulas costumam acontecer
  if (!lessons.length || lessons.some(l => l.date === todayLocal())) return false;
  const dow = new Date().getDay(); return lessons.slice(0, 8).filter(l => l.date && new Date(l.date + 'T12:00').getDay() === dow).length >= 2;
}
function dockSync(){
  const hub = window.FluidHub && window.FluidWeb, live = hub ? liveLesson() : null;
  const items = hub ? [...DOCK, ['painel','Painel','panel']] : DOCK;
  if (!dockEl || dockEl.dataset.n !== String(items.length)){
    dockEl && dockEl.remove();
    dockEl = document.createElement('nav'); dockEl.className = 'dock'; dockEl.setAttribute('aria-label','Seções'); dockEl.dataset.n = String(items.length);
    dockEl.innerHTML = `<div class="dock-in"><i class="dock-pill" aria-hidden="true"></i>${items.map(([k,l,ic]) => k==='+' ? `<button class="dock-plus" data-dock="+" aria-label="Criar: música, aula, dúvida. Segure para repetir a última">${UXI.plus}</button>` : `<button class="dock-b" data-dock="${k}" aria-label="${l}"><span class="dock-ic">${UXI[ic]}<em class="dock-badge" hidden></em></span><small>${l}</small></button>`).join('')}</div>`;
    document.body.appendChild(dockEl);
    dockEl.addEventListener('click', e => { const b = e.target.closest('[data-dock]'); if (!b) return; const k = b.dataset.dock;
      if (k === '+') return fabOpen();
      fabClose();
      if (k === 'painel'){ hap('tab'); const lv = liveLesson(); return lv ? window.FluidHub.openStudent(lv.id) : window.FluidHub.open(); }
      if (k === view.tab){ window.scrollTo({ top:0, behavior: reduceMotion() ? 'auto' : 'smooth' }); return; }
      goTab(k); });
    plusHold(dockEl.querySelector('.dock-plus'));
  }
  dockEl.querySelectorAll('[data-dock]').forEach(b => { const on = b.dataset.dock === view.tab; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
  const LBL = { hoje:'Hoje', musicas:'Músicas', treino:'Treinar', aulas:'Aulas', painel:'Painel' };
  const setB = (k, n, cls, what) => { const btn = dockEl.querySelector(`[data-dock="${k}"]`), b = btn && btn.querySelector('.dock-badge'); if (!b) return; b.hidden = !n; b.textContent = n === true ? '' : n > 9 ? '9+' : String(n||''); b.className = 'dock-badge ' + (cls||'') + (n === true ? ' dot' : ''); b.setAttribute('aria-hidden','true');
    btn.setAttribute('aria-label', LBL[k] + (n === true ? ', ' + (what || 'novidades') : n ? ', ' + n + ' ' + (what || 'pendentes') : '')); };
  const news = window.FLUID_NEWS || {};
  setB('aulas', pendingCount() || (news.lessons && view.tab !== 'aulas' ? true : 0), '', pendingCount() ? (pendingCount() === 1 ? 'lição pendente' : 'lições pendentes') : 'aula nova');
  setB('musicas', news.songs && view.tab !== 'musicas' ? true : 0, 'glow', 'música nova do professor');
  const pb = dockEl.querySelector('[data-dock="aulas"]'); pb && pb.classList.toggle('pulse', lessonDay());
  const pn = dockEl.querySelector('[data-dock="painel"]');
  if (pn){ pn.classList.toggle('live', !!live); pn.querySelector('small').textContent = live ? 'Aula agora' : 'Painel'; pn.setAttribute('aria-label', live ? 'Aula agora com ' + live.name : 'Painel');
    const hb = window.FLUID_HUB_BADGE || {}; setB('painel', live ? 0 : (hb.late || hb.soon), hb.late ? '' : 'warn', hb.late ? 'mensalidades atrasadas' : 'mensalidades vencendo'); if (live) pn.setAttribute('aria-label', 'Aula agora com ' + live.name); }
  requestAnimationFrame(movePill);
}
function movePill(){
  if (!dockEl) return; const pill = dockEl.querySelector('.dock-pill'), on = dockEl.querySelector('.dock-b.on'); if (!pill) return;
  if (!on){ pill.style.opacity = '0'; return; }
  const first = !pill.dataset.ready; if (first) pill.style.transition = 'none';
  pill.style.opacity = '1'; pill.style.width = on.offsetWidth + 'px'; pill.style.transform = `translateX(${on.offsetLeft}px)`;
  if (first){ pill.offsetWidth; pill.style.transition = ''; pill.dataset.ready = '1'; }
}
addEventListener('resize', () => requestAnimationFrame(movePill));
setInterval(() => { try { dockSync(); } catch(e){} }, 60000);
function bump(b){ if (reduceMotion()) return; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); setTimeout(() => b.classList.remove('bump'), 700); }
/* segurar o +: abre o menu; arrastar e soltar sobre uma opção executa; soltar no próprio + repete a última */
function plusHold(btn){
  let h = null;
  btn.addEventListener('pointerdown', e => { if (e.button > 0) return; h = { x: e.clientX, y: e.clientY, id: e.pointerId, t: setTimeout(() => { if (!h) return; h.on = true; hap('hold'); if (!document.getElementById('ux-fab')) fabOpen(); const last = lsGet('fluid.fab.last', ''); const m = document.querySelector('#ux-fab'); m && m.classList.add('held'); const li = last && m && [...m.querySelectorAll('.fab-it')].find(x => x.dataset.k === last); li && li.classList.add('last'); try { btn.setPointerCapture(e.pointerId); } catch(err){} }, 380) }; });
  btn.addEventListener('pointermove', e => { if (!h) return; if (!h.on){ if (Math.hypot(e.clientX - h.x, e.clientY - h.y) > 12){ clearTimeout(h.t); h = null; } return; }
    const el = document.elementFromPoint(e.clientX, e.clientY), it = el && el.closest('.fab-it');
    document.querySelectorAll('#ux-fab .fab-it').forEach(x => x.classList.toggle('hot', x === it)); if (it && it !== h.hot){ h.hot = it; hap('tick'); } if (!it) h.hot = null; });
  const end = e => { if (!h) return; clearTimeout(h.t); const was = h; h = null; if (!was.on) return; swSuppress = Date.now();
    const items = fabItems(), m = document.getElementById('ux-fab');
    if (was.hot){ fabRun(items, +was.hot.dataset.i); return; }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el.closest('.dock-plus')){ const last = lsGet('fluid.fab.last', ''), i = items.findIndex(x => x[0] === last); if (i >= 0) return fabRun(items, i); }
    m && m.classList.remove('held'); };
  btn.addEventListener('pointerup', end); btn.addEventListener('pointercancel', () => { if (h) clearTimeout(h.t); h = null; });
}
/* ---------- vibração com "assinatura" por tipo de ação ---------- */
const HAPT = { tab: 5, tick: 4, hold: 18, done: [12, 50, 20], undo: [8, 40, 8], swipe: [6, 30, 10], refresh: [10, 30, 10, 30, 14] };
function hap(k){ if (ux.calm) return; buzz(HAPT[k] || 6); }
/* ---------- cada aba lembra onde você estava ---------- */
const scrollMem = {};
function goTab(k){
  if (k === view.tab) return;
  scrollMem[view.tab] = window.scrollY; hap('tab');
  const go = () => { setTab(k); render(); window.scrollTo(0, scrollMem[k] || 0); dockShow(); };
  uiSound('tap');
  if (document.startViewTransition && !reduceMotion()){
    const order = ['hoje','musicas','treino','aulas'], dir = order.indexOf(k) > order.indexOf(view.tab) ? 'fwd' : 'back';
    document.documentElement.dataset.vt = dir; const t = document.startViewTransition(go); t.finished.finally(() => { delete document.documentElement.dataset.vt; });
  } else { go(); bootIn(); }
}
function bootIn(){ if (reduceMotion()) return; app.classList.remove('boot'); void app.offsetWidth; app.classList.add('boot'); clearTimeout(bootIn.t); bootIn.t = setTimeout(() => app.classList.remove('boot'), 1100); }

/* ---------- busca universal ---------- */
const nrm = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function openSearch(viaKey){
  if (document.getElementById('ux-search')) return;
  fabClose();
  const el = document.createElement('div'); el.id = 'ux-search'; el.className = 'ux-layer';
  el.innerHTML = `<div class="ux-scrim" data-ux-close></div><div class="srch" role="dialog" aria-modal="true" aria-label="Buscar no Fluid">
    <label class="srch-bar">${I.search}<input id="sr-q" type="search" placeholder="Música, acorde, aula${window.FluidHub && window.FluidWeb ? ', aluno' : ''} ou o que fazer" autocomplete="off" enterkeyhint="go" aria-controls="sr-list"><button class="srch-x" data-ux-close aria-label="Fechar">Esc</button></label>
    <div class="srch-list" id="sr-list" role="listbox"></div></div>`;
  if (viaKey === true) el.classList.add('kbd');
  document.body.appendChild(el); document.body.classList.add('sr-on');
  const q = el.querySelector('#sr-q'); let items = [], sel = 0;
  const draw = () => {
    items = srItems(q.value); sel = Math.min(sel, Math.max(0, items.filter(x => !x.h).length - 1));
    const list = el.querySelector('#sr-list'); let n = -1;
    list.innerHTML = items.length ? items.map(it => { if (it.h) return `<h4 class="sr-h">${esc(it.h)}</h4>`; n++;
      return `<button class="sr-it${n===sel?' sel':''}" role="option" aria-selected="${n===sel}" data-n="${n}" ${it.song ? `data-sr-song="${esc(it.song)}"` : ''}>${it.lead || `<span class="sr-ic" style="--c:${it.c||'var(--accent)'}">${UXI[it.ic]||UXI.spark}</span>`}<span class="sr-tx"><b>${it.html || esc(it.t)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>${it.kbd ? `<kbd>${it.kbd}</kbd>` : UXI.chev}</button>`; }).join('')
      : `<div class="sr-empty">${illo('search')}<p>Nada com "${esc(q.value)}". Tente o nome da música, um acorde como Am ou um assunto da aula.</p></div>`;
  };
  const act = n => { const it = items.filter(x => !x.h)[n]; if (!it) return; closeSearch(true); it.run(); };
  q.addEventListener('input', () => { sel = 0; draw(); });
  q.addEventListener('keydown', e => { const max = items.filter(x => !x.h).length - 1;
    if (e.key === 'ArrowDown'){ e.preventDefault(); sel = Math.min(max, sel + 1); draw(); el.querySelector('.sr-it.sel')?.scrollIntoView({ block:'nearest' }); }
    if (e.key === 'ArrowUp'){ e.preventDefault(); sel = Math.max(0, sel - 1); draw(); el.querySelector('.sr-it.sel')?.scrollIntoView({ block:'nearest' }); }
    if (e.key === 'Enter'){ e.preventDefault(); act(sel); } });
  el.addEventListener('click', e => { if (e.target.closest('[data-ux-close]')) return closeSearch(); const b = e.target.closest('.sr-it'); if (b) act(+b.dataset.n); });
  draw(); setTimeout(() => q.focus(), 30);
}
function closeSearch(now){ const el = document.getElementById('ux-search'); document.body.classList.remove('sr-on'); if (!el) return; if (now){ el.remove(); return; } el.classList.add('out'); setTimeout(() => el.remove(), 200); }
function srItems(raw){
  const k = nrm(raw).trim(), out = [], hub = window.FluidHub && window.FluidWeb;
  const songLead = s => `<span class="dotc sr-dot" style="background:${hueOf(s)}">${esc(initials(s.title))}</span>`;
  const songItem = s => ({ song: s.id, t: s.title || 'Sem título', sub: [s.artist, [...new Set(songNames(s))].slice(0,6).join(' '), s.capo ? 'capo ' + s.capo : ''].filter(Boolean).join(' · '), lead: songLead(s), run: () => openSong(s.id) });
  const cmds = [
    { t:'Afinar o violão', ic:'fork', c:'#E11D48', kw:'afinador afinar tuner corda', run: () => openTuner() },
    { t:'Metrônomo', ic:'metro', c:'#14B8A6', kw:'metronomo bpm tempo clique ritmo', run: () => { metro.open = true; try { localStorage.setItem('fluid.metro.open','1'); } catch(e){} goTab('treino'); setTimeout(() => document.getElementById('metro')?.scrollIntoView({ behavior:'smooth', block:'center' }), 80); } },
    { t:'Treinar troca de acordes', ic:'swap', c:'#8B5CF6', kw:'treino trocas minuto exercicio', run: () => goTab('treino') },
    { t:'Nova música', ic:'music', c:'#14B8A6', kw:'adicionar criar cadastrar musica', run: () => openEditor(null) },
    { t:'Colar mensagem do professor', ic:'paste', c:'#8B5CF6', kw:'colar mensagem whatsapp professor', run: () => openEditor(null, { paste:true }) },
    { t:'Registrar aula', ic:'book', c:'#F97316', kw:'aula nova registrar licao', run: () => openLesson(null) },
    { t:'Anotar dúvida para a aula', ic:'q', c:'#0EA5E9', kw:'duvida pergunta proxima aula', run: quickQuestion },
    { t: isDark() ? 'Usar modo claro' : 'Usar modo escuro', ic:'aa', c:'#64748B', kw:'tema escuro claro dark light noite', run: toggleTheme },
    { t:'Aparência e tamanho da letra', ic:'aa', c:'#64748B', kw:'letra fonte tamanho contraste sons acessibilidade', run: openLook },
    hub && { t:'Financeiro', ic:'money', c:'#22C55E', kw:'financeiro mensalidade cobranca pagamento pix dinheiro', run: () => window.FluidHub.open('financeiro') },
    hub && { t:'Agenda da semana', ic:'cal', c:'#F97316', kw:'agenda aulas semana presenca falta reposicao', run: () => window.FluidHub.open('agenda') },
    hub && { t:'Alunos', ic:'user', c:'#6366F1', kw:'alunos aluno cadastro', run: () => window.FluidHub.open('alunos') },
    hub && { t:'Pastas e convites', ic:'panel', c:'#0EA5E9', kw:'pasta convite link compartilhar', run: () => window.FluidHub.open('pastas') },
  ].filter(Boolean);
  if (!k){
    const rec = recentIds().slice(0, 4).map(id => songs.find(s => s.id === id)).filter(Boolean);
    if (rec.length){ out.push({ h:'Abertas recentemente' }); rec.forEach(s => out.push(songItem(s))); }
    out.push({ h:'Atalhos' }); cmds.slice(0, 6).forEach(c => out.push(c));
    return out;
  }
  // acordes
  const {names} = chordStats(); const guess = normName(raw.trim());
  const chs = [...new Set([...names.filter(n => nrm(n).startsWith(k) || nrm(codeFor[n]||'').startsWith(k)), ...(chordFromName(guess) && !names.includes(guess) ? [guess] : [])])].slice(0, 4);
  if (chs.length){ out.push({ h:'Acordes' }); chs.forEach(n => { const sh = shapeOf(n), uses = songs.filter(s => songNames(s).includes(n)).length;
    out.push({ t: n, lead: `<span class="sr-dia">${diagram(sh, { label: n })}</span>`, sub: (codeOf(sh) ? codeOf(sh) + ' · ' : '') + (uses ? `em ${uses} ${uses===1?'música':'músicas'}` : 'ainda não está nas suas músicas'), run: () => showPop(n) }); }); }
  // músicas
  const ms = songs.filter(s => nrm([s.title, s.artist, (s.tags||[]).join(' '), songNames(s).join(' '), s.notes].join(' ')).includes(k)).slice(0, 6);
  if (ms.length){ out.push({ h:'Músicas' }); ms.forEach(s => out.push(songItem(s))); }
  // alunos
  if (hub && window.FluidHub.search){ const st = window.FluidHub.search(raw); if (st.length){ out.push({ h:'Alunos' }); st.forEach(s => out.push({ t: s.name, sub: s.sub, lead: `<span class="dotc sr-dot" style="background:${s.color}">${esc(initials(s.name))}</span>`, run: () => window.FluidHub.openStudent(s.id) })); } }
  // aulas
  const ls = lessons.filter(l => nrm([l.summary, ...(l.homework||[]).map(h => h.t), ...(l.questions||[]).map(q => q.t)].join(' ')).includes(k)).slice(0, 4);
  if (ls.length){ out.push({ h:'Aulas' }); ls.forEach(l => { const p = dateParts(l.date); const txt = [l.summary, ...(l.homework||[]).map(h => h.t), ...(l.questions||[]).map(q => q.t)].find(x => nrm(x).includes(k)) || '';
    out.push({ t: `Aula de ${p.wk}, ${p.d} ${p.mon}`, sub: txt.split('\n').find(x => nrm(x).includes(k)) || txt, ic:'book', c:'#F97316', run: () => openLesson(l) }); }); }
  // atalhos
  const cs = cmds.filter(c => nrm(c.t + ' ' + c.kw).split(/\s+/).some(w => w.startsWith(k))).slice(0, 4);
  if (cs.length){ out.push({ h:'Fazer' }); cs.forEach(c => out.push(c)); }
  return out;
}

/* ---------- tela Hoje ---------- */
function focusPick(){
  const pairs = suggestedPairs(); if (!pairs.length) return null; const now = Date.now();
  return pairs.slice(0, 14).map(p => { const r = changes.pairs[p.k], runs = (r && r.runs) || [], last = runs.length ? new Date(runs[runs.length-1].at).getTime() : 0;
    const days = last ? Math.floor((now - last) / 864e5) : null, best = (r && r.best) || 0;
    return { ...p, best, days, score: (best ? 300 / Math.max(best, 1) : 60) + (days === null ? 25 : Math.min(days, 14) * 5) + p.songs.length * 4 }; })
    .sort((a, b) => b.score - a.score)[0];
}
function greet(){ const h = new Date().getHours(); return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
function hwRow(l, i, h){
  const due = l.hwDue, late = due && due < todayLocal(), dp = due && dateParts(due);
  return `<div class="sw hj-hw" data-swipe="hw" data-k="${esc(l.id)}:${i}" data-swipe-r="Feito"><div class="sw-bg" aria-hidden="true"><span class="r">${UXI.check}Feito</span></div>
    <div class="sw-fg check-row"><button class="check" data-tcheck="${esc(l.id)}:homework:${i}" aria-label="Marcar como feito"></button><span class="check-t">${esc(h.t)}<small>${due ? `<b class="due${late?' late':''}">${late ? 'atrasada, era ' : 'até '}${dp.d} ${dp.mon}</b>` : 'aula de ' + dateParts(l.date).d + ' ' + dateParts(l.date).mon}</small></span></div></div>`;
}
function renderHoje(){
  const me = window.FluidWeb && window.FluidWeb.me ? (window.FluidWeb.me().name || '').split(' ')[0] : '';
  const dateTxt = new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });
  const num = view.display === 'num'; const lab = n => { const c = codeOf(shapeOf(n)); return num && c ? c : n; };
  const t = todayLocal(), today = minsOn(t), daily = Math.max(5, Math.round((pract.goal || 90) / 7)), dpct = Math.min(1, today / daily), R = 25, C = 2 * Math.PI * R;
  const f = songs.length ? focusPick() : null;
  const rec = recentIds().map(id => songs.find(s => s.id === id)).filter(Boolean); const cont = rec[0] || songs[0];
  const open = []; lessons.forEach(l => (l.homework||[]).forEach((h, i) => { if (!h.done) open.push({ l, i, h }); }));
  open.sort((a, b) => (a.l.hwDue || '9999').localeCompare(b.l.hwDue || '9999'));
  const ti = window.FluidHub && window.FluidHub.todayInfo ? window.FluidHub.todayInfo() : null;
  const qn = lessons[0] ? (lessons[0].questions||[]).filter(q => !q.done).length : 0;
  const ST = { ok:['Presente','ok'], falta:['Faltou','bad'] };
  const teacher = ti ? `<section class="hj-card hj-teach" style="--d:2">
      <div class="hj-h"><h3>${UXI.cal}No estúdio hoje</h3><button class="linkish" data-ux="hub" data-v="agenda">Agenda</button></div>
      ${ti.lessons.length ? `<div class="hj-lessons">${ti.lessons.map(x => `<button class="hj-lesson ${x.status}" data-ux="stu" data-v="${esc(x.id)}" style="--c:${x.color}"><b class="hj-time">${esc(x.time || '—')}</b><span class="dotc" style="background:${x.color}">${esc(initials(x.name))}</span><span class="hj-ln"><b>${esc(x.name)}</b><small>${x.repo ? 'Reposição' : ST[x.status] ? ST[x.status][0] : 'Agendada'}</small></span>${UXI.chev}</button>`).join('')}</div>`
        : `<p class="hj-muted">Nenhuma aula marcada para hoje. ${ti.students ? 'Dia livre para estudar!' : ''}</p>`}
      ${ti.late.length ? `<div class="hj-h sub"><h4>${UXI.money}Atrasadas <span class="hj-pill bad">${ti.lateSum}</span></h4><button class="linkish" data-ux="hub" data-v="financeiro">Financeiro</button></div>
        <div class="hj-pays">${ti.late.slice(0, 3).map(p => `<div class="sw" data-swipe="tpay" data-id="${esc(p.id)}" data-swipe-r="Recebi" data-swipe-l="Cobrar"><div class="sw-bg" aria-hidden="true"><span class="r">${UXI.check}Recebi</span><span class="l">${UXI.send}Cobrar</span></div>
          <button class="sw-fg hj-pay" data-ux="card" data-v="${esc(p.id)}"><span class="dotc" style="background:${p.color}">${esc(initials(p.name))}</span><span class="hj-ln"><b>${esc(p.name)}</b><small>${esc(p.label)}</small></span><b class="hj-amt">${esc(p.amount)}</b></button></div>`).join('')}</div>
        ${lsGet('fluid.swiped', 0) ? '' : `<p class="sw-tip">Deslize para a direita quando receber, para a esquerda para cobrar no WhatsApp.</p>`}`
        : ti.soon ? `<p class="hj-muted">${ti.soon} ${ti.soon===1?'mensalidade vence':'mensalidades vencem'} nos próximos dias.</p>` : `<p class="hj-ok">${UXI.check}Mensalidades em dia</p>`}
      ${ti.leads ? `<button class="hj-lead" data-ux="hub" data-v="conta">${UXI.spark}<span><b>${ti.leads} ${ti.leads===1?'novo interessado':'novos interessados'}</b><small>pela sua página pública</small></span>${UXI.chev}</button>` : ''}
    </section>` : '';
  const hero = !songs.length ? `<section class="hj-card hj-empty" style="--d:1">${illo('songs')}<h3>Vamos começar seu caderno</h3><p>Cole a mensagem que o professor mandou no WhatsApp. O Fluid separa link, capotraste, acordes e batida sozinho.</p>
      <div class="hj-btns"><button class="btn primary" data-ux="paste">${UXI.paste}Colar mensagem</button><button class="btn" data-ux="new">${UXI.plus}Criar do zero</button></div></section>`
    : `<section class="hj-card hj-hero" style="--d:1">
      <div class="hj-ring" aria-label="Hoje: ${today} de ${daily} minutos"><svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="${R}" class="rg-track"/><circle cx="30" cy="30" r="${R}" class="rg-prog" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${(C*(1-dpct)).toFixed(1)}"/></svg><span><b data-count="${today}" data-ck="today-min">${today}</b><small>/${daily} min</small></span></div>
      <div class="hj-hero-tx"><small class="hj-kicker">${dpct >= 1 ? 'Meta de hoje batida' : 'Treino de hoje'}</small>
        ${f ? `<h3>Troca <span class="hj-ch${num?' mono':''}">${esc(lab(f.a))}</span><i>→</i><span class="hj-ch${num?' mono':''}">${esc(lab(f.b))}</span></h3>
          <p>${f.days === null ? `Você ainda não treinou essa troca. Ela aparece em ${esc(f.songs.slice(0,2).join(' e '))}.` : f.days >= 2 ? `Faz ${f.days} dias que você não treina essa troca. Seu recorde é ${f.best} por minuto.` : `Seu recorde é ${f.best} trocas por minuto. Bora passar dessa marca?`}</p>
          <button class="btn primary hj-go" data-ux="pair" data-v="${esc(f.a)}|${esc(f.b)}">${UXI.play}Treinar 1 minuto</button>`
        : `<h3>Toque junto com o metrônomo</h3><p>Escolha uma música e treine a batida no seu ritmo.</p>`}
      </div></section>`;
  const contCard = cont ? `<button class="hj-card hj-cont" data-ux="practice" data-v="${esc(cont.id)}" style="--d:3;--sc:${hueOf(cont)}">
      <span class="dotc big" style="background:${hueOf(cont)}">${esc(initials(cont.title))}</span>
      <span class="hj-ln"><small class="hj-kicker">${rec[0] ? 'Continuar de onde parou' : 'Que tal tocar'}</small><b>${esc(cont.title || 'Sem título')}</b><small>${esc([...new Set(songNames(cont))].slice(0,5).map(lab).join(' · ') || cont.artist || '')}</small></span>
      <span class="hj-play" aria-hidden="true">${UXI.play}</span></button>` : '';
  const hw = lessons.length ? `<section class="hj-card" style="--d:4">
      <div class="hj-h"><h3>${UXI.book}Lição de casa</h3>${open.length ? `<span class="hj-pill">${open.length}</span>` : ''}<button class="linkish" data-ux="tab" data-v="aulas">Ver aulas</button></div>
      ${open.length ? `<div class="check-list">${open.slice(0, 4).map(({l,i,h}) => hwRow(l, i, h)).join('')}</div>${open.length > 4 ? `<button class="linkish hj-more" data-ux="tab" data-v="aulas">mais ${open.length - 4}</button>` : ''}
        ${lsGet('fluid.swiped', 0) ? '' : `<p class="sw-tip">Deslize para a direita para marcar como feita.</p>`}`
        : `<div class="all-done">${illo('done')}<p>Tudo feito. Que orgulho!</p></div>`}
      <button class="hj-ask" data-ux="ask">${UXI.q}<span>${qn ? `${qn} ${qn===1?'dúvida':'dúvidas'} para a próxima aula` : 'Anotar dúvida para a próxima aula'}</span>${UXI.plus}</button>
    </section>` : '';
  app.innerHTML = headerHTML() + `
    <div class="hj-greet"><h1>${greet()}${me ? ', ' + esc(me) : ''}</h1><p>${esc(dateTxt)}</p></div>
    <button class="hj-search" data-act="search">${I.search}<span>Buscar música, acorde, aula${window.FluidHub && window.FluidWeb ? ', aluno' : ''}…</span><kbd>/</kbd></button>
    ${ti && ti.lessons.length ? teacher + hero : hero + teacher}
    ${contCard}
    ${hw}
    ${songs.length || totalMins() ? `<div class="hj-pract" style="--d:5">${practHTML()}</div>` : ''}
    <div style="--d:6" class="hj-metro">${metroHTML()}</div>`;
}
app.addEventListener('click', e => {
  const a = e.target.closest('[data-act="search"],[data-act="look"],[data-ux]'); if (!a) return;
  if (a.dataset.act === 'search') return openSearch();
  if (a.dataset.act === 'look') return openLook();
  const k = a.dataset.ux, v = a.dataset.v;
  if (k === 'pair'){ const [x, y] = v.split('|'); openTrainer(x, y); }
  if (k === 'practice'){ const s = songs.find(z => z.id === v); if (s){ pushRecent(s.id); openPractice(s); } }
  if (k === 'tab') goTab(v);
  if (k === 'ask') quickQuestion();
  if (k === 'paste') openEditor(null, { paste:true });
  if (k === 'new') openEditor(null);
  if (k === 'hub' && window.FluidHub) window.FluidHub.open(v);
  if (k === 'stu' && window.FluidHub) window.FluidHub.openStudent(v);
  if (k === 'card' && window.FluidHub) window.FluidHub.openCard(v);
});

/* ---------- render: Hoje + barra + transições ---------- */
const _render = render;
render = function(){
  if (view.tab === 'hoje'){ cancelAnimationFrame(orbitRAF); renderHoje(); } else _render();
  app.dataset.tab = view.tab;
  if (!render.booted && mode !== 'loading'){ render.booted = true; bootIn(); }
  const nw = window.FLUID_NEWS; if (nw){ if (view.tab === 'musicas') nw.songs = 0; if (view.tab === 'aulas') nw.lessons = 0; }
  try { dockSync(); } catch(e){}
  try { miniSync(); } catch(e){}
};

/* ---------- treino: modo palco e acorde que "voa" ---------- */
let stageLock = null;
async function stageToggle(force){
  const el = document.getElementById('practice'); if (!el) return;
  const on = force != null ? force : !el.classList.contains('stage'); el.classList.toggle('stage', on);
  try { if (on && el.requestFullscreen && !document.fullscreenElement) await el.requestFullscreen(); else if (!on && document.fullscreenElement) await document.exitFullscreen(); } catch(e){}
  try { if (on && navigator.wakeLock) stageLock = await navigator.wakeLock.request('screen'); else if (!on && stageLock){ stageLock.release(); stageLock = null; } } catch(e){}
  renderPractice();
}
document.addEventListener('fullscreenchange', () => { const el = document.getElementById('practice'); if (el && !document.fullscreenElement && el.classList.contains('stage')){ el.classList.remove('stage'); try { stageLock && stageLock.release(); } catch(e){} stageLock = null; renderPractice(); } });
const _renderPractice = renderPractice;
renderPractice = function(){
  _renderPractice(); const p = practice, el = document.getElementById('practice'); if (!p || !el) return;
  const head = el.querySelector('.pr-head');
  if (head && !head.querySelector('[data-stage]')){ const b = document.createElement('button'); b.className = 'btn stage-b' + (el.classList.contains('stage') ? ' on-guide' : ''); b.dataset.stage = '1'; b.innerHTML = UXI.stage + (el.classList.contains('stage') ? 'Sair do palco' : 'Modo palco'); b.setAttribute('aria-pressed', String(el.classList.contains('stage'))); b.title = 'Tela cheia, letra grande e tela sempre acesa'; head.appendChild(b); }
  if (head && !head.querySelector('[data-mini]')){ const m = document.createElement('button'); m.className = 'btn icon ghost mini-b'; m.dataset.mini = '1'; m.setAttribute('aria-label', 'Minimizar: continua tocando enquanto você navega'); m.title = 'Minimizar'; m.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'; head.insertBefore(m, head.children[1] || null); }
  if (!el.dataset.uxBound){ el.dataset.uxBound = '1'; el.addEventListener('click', e => { if (e.target.closest('[data-stage]')){ e.stopPropagation(); stageToggle(); } if (e.target.closest('[data-mini]')){ e.stopPropagation(); practMini(true); } }, true); }
  try { miniUpdate(); } catch(e){}
  const nm = (el.querySelector('.pr-name') || {}).textContent || '', now = performance.now();
  if (nm !== p._uxNm){ if (p._uxNm != null) p._uxAt = now; p._uxNm = nm; }
  const dt = now - (p._uxAt || -1e9), box = el.querySelector('.pr-now');
  if (box && dt < 520 && !reduceMotion()){ box.classList.add('swap'); box.style.animationDelay = (-dt).toFixed(0) + 'ms'; }
};
const _closePractice = closePractice;
closePractice = function(){ if (practice) practice.mini = false; document.body.classList.remove('pr-mini'); const el = document.getElementById('practice'); if (el && el.classList.contains('stage')){ try { document.fullscreenElement && document.exitFullscreen(); } catch(e){} try { stageLock && stageLock.release(); } catch(e){} stageLock = null; } _closePractice(); try { miniSync(); } catch(e){} };
const _openPractice = openPractice;
openPractice = function(s){ if (practice) closePractice(); _openPractice(s); };

/* ---------- meta da semana batida: anel brilha ---------- */
const _practHTML = practHTML;
practHTML = function(){ const h = _practHTML(); return weekMins() >= (pract.goal || 90) ? h.replace('class="pr-ring"', 'class="pr-ring full"') : h; };

/* ---------- folhas: no celular sobem de baixo e fecham puxando ---------- */
let dg = null;
document.addEventListener('pointerdown', e => {
  if (e.button > 0) return; const h = e.target.closest('.sheet-head, .hb-head, .ux-grab-zone, .ux-sh-head, .ux-sh-title'); if (!h) return;
  if (e.target.closest('button,input,select,textarea,a,label')) return;
  const sheet = h.closest('.sheet, .hb-sheet, .ux-sheet'); if (!sheet) return;
  if (sheet.classList.contains('sheet') && (!matchMedia('(max-width:640px)').matches || view.sheet === 'editor')) return;
  dg = { sheet, y0: e.clientY, t0: performance.now(), dy: 0, id: e.pointerId };
});
document.addEventListener('pointermove', e => {
  if (!dg || e.pointerId !== dg.id) return; const dy = e.clientY - dg.y0;
  if (!dg.on){ if (dy < 6) return; dg.on = true; dg.sheet.style.animation = 'none'; dg.sheet.style.transition = 'none'; try { dg.sheet.setPointerCapture(e.pointerId); } catch(err){} }
  dg.dy = Math.max(0, dy); dg.sheet.style.transform = `translateY(${dg.dy}px)`;
}, { passive: true });
function dgEnd(e){
  if (!dg || (e && e.pointerId !== dg.id)) return; const d = dg; dg = null; if (!d.on) return;
  const v = d.dy / Math.max(1, performance.now() - d.t0);
  d.sheet.style.transition = 'transform .3s cubic-bezier(.2,.8,.2,1)';
  if (d.dy > 120 || (d.dy > 40 && v > .5)){
    d.sheet.style.transform = 'translateY(105%)'; swSuppress = Date.now();
    setTimeout(() => { d.sheet.style.transform = ''; d.sheet.style.transition = '';
      if (d.sheet.classList.contains('hb-sheet')) window.FluidHub && window.FluidHub.close();
      else if (d.sheet.classList.contains('ux-sheet')) uxSheetClose(true);
      else { if (view.sheet === 'lesson') led = null; closeSheet(); } }, 260);
  } else { d.sheet.style.transform = ''; setTimeout(() => { d.sheet.style.transition = ''; }, 320); }
}
document.addEventListener('pointerup', dgEnd); document.addEventListener('pointercancel', dgEnd);

/* ---------- teclado: / ou Ctrl+K busca, Esc fecha camadas ---------- */
window.addEventListener('keydown', e => {
  const typing = ['INPUT','TEXTAREA','SELECT'].includes((document.activeElement||{}).tagName);
  if (e.key === 'Escape'){
    if (document.getElementById('ux-search')){ e.stopImmediatePropagation(); e.preventDefault(); return closeSearch(true); }
    if (document.getElementById('ux-fab')){ e.stopImmediatePropagation(); return fabClose(); }
    if (document.getElementById('ux-sheet')){ e.stopImmediatePropagation(); return uxSheetClose(); }
  }
  if (((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing && !view.sheet && !practice && !trainer)){ e.preventDefault(); openSearch(true); }
}, true);

/* ================= NAVEGAÇÃO VIVA ================= */
const touchy = () => window.matchMedia && matchMedia('(hover: none)').matches;
function layerOpen(){ return !!(view.sheet || (practice && !practice.mini) || trainer || pop.chord || document.querySelector('#ux-search,#ux-fab,#ux-sheet,#tuner,.cele') || (window.FluidHub && window.FluidHub.isOpen && window.FluidHub.isOpen())); }

/* ---------- a barra some ao rolar para baixo e volta ao rolar para cima ---------- */
let lastY = window.scrollY, dockHidden = false, scrollRaf = 0;
function dockShow(){ if (dockHidden){ dockHidden = false; document.body.classList.remove('dock-hide'); } }
addEventListener('scroll', () => {
  if (scrollRaf) return; scrollRaf = requestAnimationFrame(() => { scrollRaf = 0;
    const y = window.scrollY, d = y - lastY, nearEnd = y + innerHeight >= document.documentElement.scrollHeight - 40;
    if (Math.abs(d) > 6){ const hide = d > 0 && y > 140 && !nearEnd; if (hide !== dockHidden){ dockHidden = hide; document.body.classList.toggle('dock-hide', hide); } lastY = y; }
    if (nearEnd) dockShow();
    try { miniSync(); } catch(e){} });
}, { passive: true });

/* ---------- minibarra: o que está tocando ---------- */
let mbEl = null;
function metroVisible(){ const m = document.getElementById('metro'); if (!m) return false; const r = m.getBoundingClientRect(); return r.bottom > 60 && r.top < innerHeight - 120; }
function practMini(on){
  const el = document.getElementById('practice'); if (!practice || !el) return;
  if (on && el.classList.contains('stage')) stageToggle(false);
  practice.mini = on; el.classList.toggle('mini', on); document.body.classList.toggle('pr-mini', on);
  if (!on) renderPractice(); hap('tab'); dockShow(); miniSync();
}
function miniSync(){
  const pr = practice && practice.mini, mt = !pr && metro.playing && !metroVisible();
  const kind = pr ? 'pr' : mt ? 'mt' : '';
  if (!kind){ if (mbEl){ const e = mbEl; mbEl = null; e.classList.add('out'); setTimeout(() => e.remove(), 260); } document.body.classList.remove('mb-on'); return; }
  if (!mbEl || mbEl.dataset.kind !== kind){
    mbEl && mbEl.remove();
    mbEl = document.createElement('div'); mbEl.className = 'minibar'; mbEl.dataset.kind = kind; mbEl.setAttribute('role','region'); mbEl.setAttribute('aria-label', 'Tocando agora');
    mbEl.innerHTML = kind === 'pr'
      ? `<button class="mb-main" data-mb="pr-open" aria-label="Voltar para o treino"><span class="mb-art" style="--c:${hueOf(practice.s)}"><b class="mb-ch"></b><i class="mb-eq"><i></i><i></i><i></i></i></span><span class="mb-tx"><b>${esc(practice.s.title || 'Treino')}</b><small class="mb-sub"></small></span></button>
         <button class="mb-btn" data-mb="pr-toggle" aria-label="Tocar ou pausar"></button><button class="mb-btn ghost" data-mb="pr-close" aria-label="Encerrar treino">${I.close}</button><i class="mb-prog"></i>`
      : `<button class="mb-main" data-mb="mt-open" aria-label="Ir para o metrônomo"><span class="mb-art mt" style="--c:#14B8A6">${UXI.metro}</span><span class="mb-tx"><b>Metrônomo</b><small class="mb-sub"></small></span><span class="mb-dots"></span></button>
         <button class="mb-btn" data-mb="mt-stop" aria-label="Parar o metrônomo">${I.pause}</button>`;
    document.body.appendChild(mbEl);
    mbEl.addEventListener('click', e => { const b = e.target.closest('[data-mb]'); if (!b) return; const k = b.dataset.mb; hap('tick');
      if (k === 'pr-open') practMini(false);
      if (k === 'pr-toggle'){ practice.playing ? stopMetro() : startMetro(); }
      if (k === 'pr-close') closePractice();
      if (k === 'mt-stop') metroStop();
      if (k === 'mt-open'){ if (view.tab !== 'hoje' && view.tab !== 'treino') goTab('treino'); setTimeout(() => document.getElementById('metro')?.scrollIntoView({ behavior:'smooth', block:'center' }), 60); }
    });
  }
  document.body.classList.add('mb-on');
  miniUpdate();
}
function miniUpdate(){
  if (!mbEl) return;
  if (mbEl.dataset.kind === 'pr' && practice){ const p = practice, ch = p.s.chords || [], ci = ch.length ? Math.floor(p.bar / p.bpc) % ch.length : 0, cur = ch[ci];
    mbEl.querySelector('.mb-ch').textContent = cur ? detect(cur) : '♪';
    mbEl.querySelector('.mb-sub').textContent = (p.playing ? 'Tocando' : 'Pausado') + ' · ' + Math.round(p.bpm) + ' bpm' + (ch.length > 1 ? ' · depois ' + detect(ch[(ci+1) % ch.length]) : '');
    const tg = mbEl.querySelector('[data-mb="pr-toggle"]'); const ic = p.playing ? 'pause' : 'play'; if (tg.dataset.ic !== ic){ tg.dataset.ic = ic; tg.innerHTML = I[ic]; }
    mbEl.classList.toggle('playing', !!p.playing);
    const pg = mbEl.querySelector('.mb-prog'); if (pg) pg.style.transform = `scaleX(${ch.length ? ((ci + 1) / ch.length).toFixed(3) : 0})`;
  }
  if (mbEl.dataset.kind === 'mt'){ mbEl.querySelector('.mb-sub').textContent = metro.bpm + ' bpm · ' + (metro.beats === 6 ? '6/8' : metro.beats + '/4');
    const d = mbEl.querySelector('.mb-dots'); const n = metro.beats === 6 ? 6 : metro.beats; if (d.children.length !== n) d.innerHTML = '<i></i>'.repeat(n);
    [...d.children].forEach((x, i) => x.classList.toggle('on', i === metro.beat)); mbEl.classList.add('playing'); }
}
const _metroUI = metroUI; metroUI = function(){ _metroUI(); try { miniSync(); } catch(e){} };
const _metroDots = metroDots; metroDots = function(){ _metroDots(); if (mbEl && mbEl.dataset.kind === 'mt') miniUpdate(); };

/* ---------- deslizar para os lados troca de aba ---------- */
const TABS = ['hoje','musicas','treino','aulas'];
function hScroll(el){ for (let n = el; n && n !== document.body; n = n.parentElement){ if (n.scrollWidth > n.clientWidth + 4){ const o = getComputedStyle(n).overflowX; if (o === 'auto' || o === 'scroll') return true; } } return false; }
let tsw = null;
app.addEventListener('touchstart', e => {
  if (e.touches.length !== 1 || layerOpen()) return; const t = e.target;
  if (t.closest('[data-swipe],input,textarea,select,[contenteditable],.orbit,.metro input') || hScroll(t)) return;
  const x = e.touches[0].clientX; if (x < 18 || x > innerWidth - 18) return; // bordas: gesto do sistema
  tsw = { x0: x, y0: e.touches[0].clientY, dx: 0, on: false, t0: performance.now() };
}, { passive: true });
app.addEventListener('touchmove', e => {
  if (!tsw) return; const dx = e.touches[0].clientX - tsw.x0, dy = e.touches[0].clientY - tsw.y0;
  if (!tsw.on){ if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)){ tsw = null; return; } if (Math.abs(dx) < 16 || Math.abs(dx) < Math.abs(dy) * 1.6) return; tsw.on = true; tsw.x0 += Math.sign(dx) * 16; if (lp) lpCancel(); }
  const d = e.touches[0].clientX - tsw.x0, i = TABS.indexOf(view.tab), nb = TABS[i + (d < 0 ? 1 : -1)];
  tsw.dx = d; const x = nb ? d * .45 : d * .12;
  app.style.transition = 'none'; app.style.transform = `translateX(${x}px)`; app.style.opacity = String(1 - Math.min(.35, Math.abs(x) / 600));
  edgeHint(nb && Math.abs(d) > 30 ? nb : null, d < 0 ? 'r' : 'l', Math.min(1, Math.abs(d) / 110));
}, { passive: true });
function tswEnd(){
  if (!tsw) return; const s = tsw; tsw = null; if (!s.on) return; swSuppress = Date.now(); edgeHint(null);
  const i = TABS.indexOf(view.tab), nb = TABS[i + (s.dx < 0 ? 1 : -1)];
  const reset = () => { app.style.transition = ''; app.style.transform = ''; app.style.opacity = ''; };
  const v = Math.abs(s.dx) / Math.max(1, performance.now() - s.t0);
  if (nb && (Math.abs(s.dx) > 80 || (Math.abs(s.dx) > 36 && v > .5))){ reset(); goTab(nb); }
  else { app.style.transition = 'transform .28s cubic-bezier(.23,1,.32,1), opacity .2s'; app.style.transform = ''; app.style.opacity = ''; setTimeout(reset, 300); }
}
app.addEventListener('touchend', tswEnd); app.addEventListener('touchcancel', tswEnd);
let hintEl = null;
function edgeHint(tab, side, p){
  if (!tab){ if (hintEl){ hintEl.remove(); hintEl = null; } return; }
  if (!hintEl){ hintEl = document.createElement('div'); hintEl.className = 'edge-hint'; document.body.appendChild(hintEl); }
  const names = { hoje:'Hoje', musicas:'Músicas', treino:'Treinar', aulas:'Aulas' }, ic = { hoje:'home', musicas:'music', treino:'train', aulas:'book' };
  hintEl.className = 'edge-hint ' + side + (p >= 1 ? ' ready' : ''); hintEl.style.opacity = p.toFixed(2); hintEl.style.transform = `translateY(-50%) scale(${(.9 + p * .1).toFixed(3)})`;
  const html = `${UXI[ic[tab]]}<span>${names[tab]}</span>`; if (hintEl.dataset.t !== tab){ hintEl.dataset.t = tab; hintEl.innerHTML = html; }
  if (p >= 1 && !hintEl.dataset.r){ hintEl.dataset.r = '1'; hap('tick'); } if (p < 1) delete hintEl.dataset.r;
}

/* ---------- na música: deslizar passa para a próxima ou a anterior ---------- */
let ssw = null;
function songOrder(){ const f = filtered(); return (f.length ? f : songs).map(s => s.id); }
layer.addEventListener('touchstart', e => {
  if (view.sheet !== 'song' || e.touches.length !== 1 || trainer || pop.chord) return;
  const t = e.target; if (!t.closest('.sheet-body') || t.closest('input,textarea,select,[data-swipe],.rb,.fb,.lyrics') || hScroll(t)) return;
  const x = e.touches[0].clientX; if (x < 18 || x > innerWidth - 18) return;
  ssw = { x0: x, y0: e.touches[0].clientY, dx: 0, on: false, t0: performance.now() };
}, { passive: true });
layer.addEventListener('touchmove', e => {
  if (!ssw) return; const dx = e.touches[0].clientX - ssw.x0, dy = e.touches[0].clientY - ssw.y0;
  if (!ssw.on){ if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)){ ssw = null; return; } if (Math.abs(dx) < 16 || Math.abs(dx) < Math.abs(dy) * 1.6) return; ssw.on = true; ssw.x0 += Math.sign(dx) * 16; }
  const d = e.touches[0].clientX - ssw.x0, ord = songOrder(), i = ord.indexOf(view.song), nid = ord[i + (d < 0 ? 1 : -1)];
  ssw.dx = d; ssw.nid = nid; const b = layer.querySelector('.sheet-body'); if (!b) return;
  const x = nid ? d * .5 : d * .12; b.style.transition = 'none'; b.style.transform = `translateX(${x}px)`; b.style.opacity = String(1 - Math.min(.5, Math.abs(x) / 500));
  peek(nid && Math.abs(d) > 30 ? songs.find(s => s.id === nid) : null, d < 0 ? 'r' : 'l', Math.min(1, Math.abs(d) / 110));
}, { passive: true });
function sswEnd(){
  if (!ssw) return; const s = ssw; ssw = null; if (!s.on) return; swSuppress = Date.now(); peek(null);
  const b = layer.querySelector('.sheet-body'); if (!b) return;
  const v = Math.abs(s.dx) / Math.max(1, performance.now() - s.t0);
  if (s.nid && (Math.abs(s.dx) > 80 || (Math.abs(s.dx) > 36 && v > .5))) songGo(s.nid, s.dx < 0 ? 1 : -1);
  else { b.style.transition = 'transform .28s cubic-bezier(.23,1,.32,1), opacity .2s'; b.style.transform = ''; b.style.opacity = ''; setTimeout(() => { b.style.transition = ''; }, 300); }
}
function songGo(nid, dir){
  const b = layer.querySelector('.sheet-body'); if (!b) return; const rm = reduceMotion(); hap('swipe');
  if (!rm){ b.style.transition = 'transform .14s cubic-bezier(.4,0,1,1), opacity .14s'; b.style.transform = `translateX(${-dir * 24}%)`; b.style.opacity = '0'; }
  setTimeout(() => { pushRecent(nid); view.song = nid; view.confirmDel = false; refreshSheet(); uiSound('open');
    const nb = layer.querySelector('.sheet-body'); if (nb && nb.animate && !rm) nb.animate([{ transform:`translateX(${dir * 16}%)`, opacity:0 }, { transform:'none', opacity:1 }], { duration:260, easing:'cubic-bezier(.23,1,.32,1)' }); }, rm ? 0 : 140);
}
/* botões visíveis de anterior / próxima (alternativa ao gesto) */
const _refreshSheet = refreshSheet;
refreshSheet = function(){
  _refreshSheet();
  if (view.sheet !== 'song') return; const body = layer.querySelector('.sheet-body'); if (!body || body.querySelector('.sh-nav')) return;
  const ord = songOrder(), i = ord.indexOf(view.song), prev = songs.find(s => s.id === ord[i-1]), next = songs.find(s => s.id === ord[i+1]); if (!prev && !next) return;
  const nav = document.createElement('nav'); nav.className = 'sh-nav'; nav.setAttribute('aria-label', 'Outras músicas');
  nav.innerHTML = `${prev ? `<button class="sh-nb" data-go="${esc(prev.id)}" data-dir="-1"><span aria-hidden="true">${I.back}</span><span><small>Anterior</small><b>${esc(prev.title || 'Sem título')}</b></span></button>` : '<span></span>'}${next ? `<button class="sh-nb nx" data-go="${esc(next.id)}" data-dir="1"><span><small>Próxima</small><b>${esc(next.title || 'Sem título')}</b></span><span aria-hidden="true">${I.chev}</span></button>` : ''}`;
  body.appendChild(nav);
  nav.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return; e.stopPropagation(); songGo(b.dataset.go, +b.dataset.dir); });
};
layer.addEventListener('touchend', sswEnd); layer.addEventListener('touchcancel', sswEnd);
let peekEl = null;
function peek(s, side, p){
  if (!s){ if (peekEl){ peekEl.remove(); peekEl = null; } return; }
  if (!peekEl){ peekEl = document.createElement('div'); document.body.appendChild(peekEl); }
  peekEl.className = 'song-peek ' + side + (p >= 1 ? ' ready' : ''); peekEl.style.opacity = p.toFixed(2); peekEl.style.transform = `translateY(-50%) scale(${(.92 + p * .08).toFixed(3)})`;
  if (peekEl.dataset.id !== s.id){ peekEl.dataset.id = s.id; peekEl.innerHTML = `<span class="dotc" style="background:${hueOf(s)}">${esc(initials(s.title))}</span><span><small>${side === 'r' ? 'Próxima' : 'Anterior'}</small><b>${esc(s.title || 'Sem título')}</b></span>`; }
  if (p >= 1 && !peekEl.dataset.r){ peekEl.dataset.r = '1'; hap('tick'); } if (p < 1) delete peekEl.dataset.r;
}

/* ---------- puxar para atualizar (tela Hoje) ---------- */
let ptr = null, ptrEl = null, refreshing = false;
document.addEventListener('touchstart', e => {
  if (refreshing || view.tab !== 'hoje' || window.scrollY > 2 || e.touches.length !== 1 || layerOpen()) return;
  if (!e.target.closest('#app')) return;
  ptr = { y0: e.touches[0].clientY, x0: e.touches[0].clientX, dy: 0 };
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!ptr) return; const dy = e.touches[0].clientY - ptr.y0, dx = e.touches[0].clientX - ptr.x0;
  if (dy < 0 || (Math.abs(dx) > Math.abs(dy) && !ptr.on)){ ptrReset(); return; }
  if (!ptr.on && dy < 10) return; ptr.on = true;
  const pull = Math.min(110, dy * .5); ptr.dy = pull;
  if (!ptrEl){ ptrEl = document.createElement('div'); ptrEl.className = 'ptr'; ptrEl.innerHTML = `<span class="ptr-ic"><svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="ptrG" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#1FC8A8"/><stop offset=".5" stop-color="#9A5BE6"/><stop offset="1" stop-color="#E5245E"/></linearGradient></defs><path d="M40.6 27H67.2Q70.6 27 70.6 30.4V34.4Q70.6 39.6 65.4 39.6H33.2Q30.6 39.6 32.2 37.6L38.4 28.6Q39.3 27 40.6 27Z" fill="url(#ptrG)"/><path d="M50.2 45.6H61.2Q64.6 45.6 64.6 49V53.6Q64.6 57.2 61 57.2H50.6Q48.4 57.2 47 59L40.6 67Q38.8 69.2 36 69.2H34Q31 69.2 31 66.4V61Q31 58.2 34 58.2H36.4Q38.6 58.2 39.8 56.7L46.8 47.4Q48.1 45.6 50.2 45.6Z" fill="url(#ptrG)"/></svg></span><small>Puxe para atualizar</small>`; document.body.appendChild(ptrEl); }
  const ready = pull >= 70; ptrEl.classList.toggle('ready', ready); ptrEl.querySelector('small').textContent = ready ? 'Solte para atualizar' : 'Puxe para atualizar';
  if (ready && !ptr.r){ ptr.r = true; hap('tick'); } if (!ready) ptr.r = false;
  ptrEl.style.transform = `translateY(${pull}px)`; ptrEl.querySelector('svg').style.transform = `rotate(${(pull * 3.2).toFixed(0)}deg)`; ptrEl.style.opacity = String(Math.min(1, pull / 40));
  app.style.transition = 'none'; app.style.transform = `translateY(${pull * .6}px)`;
}, { passive: true });
function ptrReset(){ ptr = null; app.style.transition = 'transform .35s cubic-bezier(.2,.9,.3,1.2)'; app.style.transform = ''; setTimeout(() => { app.style.transition = ''; }, 360);
  if (ptrEl && !refreshing){ const e = ptrEl; ptrEl = null; e.classList.add('out'); setTimeout(() => e.remove(), 250); } }
document.addEventListener('touchend', async () => {
  if (!ptr) return; const go = ptr.on && ptr.dy >= 70; if (ptr.on) swSuppress = Date.now();
  if (!go) return ptrReset();
  refreshing = true; ptr = null; ptrEl.classList.add('spin'); ptrEl.querySelector('small').textContent = 'Atualizando…'; ptrEl.style.transform = 'translateY(60px)'; ptrEl.querySelector('svg').style.transform = '';
  app.style.transition = 'transform .3s'; app.style.transform = 'translateY(40px)'; hap('refresh');
  const t0 = Date.now();
  try { await Promise.all([db && db.refresh ? db.refresh() : null, window.FluidHub && window.FluidHub.refresh ? window.FluidHub.refresh() : null]); } catch(e){}
  await new Promise(r => setTimeout(r, Math.max(0, 900 - (Date.now() - t0))));
  refreshing = false; render(); ptrReset(); uiSound('done'); toast('Tudo atualizado');
});

/* ---------- botão voltar do celular fecha a camada aberta ---------- */
let histOn = false, ignorePop = 0;
function closeTop(){
  if (document.getElementById('ux-search')) return closeSearch();
  if (document.getElementById('ux-fab')) return fabClose();
  if (document.getElementById('ux-sheet')) return uxSheetClose();
  if (document.querySelector('.cele')) return document.querySelectorAll('.cele').forEach(x => x.remove());
  if (document.getElementById('tuner')) return closeTuner();
  if (trainer) return closeTrainer();
  if (pop.chord) return closePop();
  if (practice && !practice.mini) return practice.playing ? practMini(true) : closePractice();
  if (window.FluidHub && window.FluidHub.isOpen && window.FluidHub.isOpen()) return window.FluidHub.back();
  if (view.sheet === 'editor'){ toast('Toque em Salvar ou em Cancelar'); return; }
  if (view.sheet === 'trocas'){ view.sheet = 'song'; return refreshSheet(); }
  if (view.sheet === 'lesson'){ led = null; return closeSheet(); }
  if (view.sheet) return closeSheet();
}
setInterval(() => {
  const o = layerOpen();
  try { if (o && !histOn){ history.pushState({ fluidLayer: 1 }, ''); histOn = true; }
    else if (!o && histOn){ histOn = false; ignorePop++; history.back(); } } catch(e){}
}, 250);
addEventListener('popstate', () => {
  if (ignorePop){ ignorePop--; return; } if (!histOn) return; histOn = false;
  closeTop();
});

/* ---------- atalhos do ícone do app (segurar o ícone na tela inicial) ---------- */
(function(){
  let a = ''; try { a = new URLSearchParams(location.search).get('a') || ''; } catch(e){} if (!a) return;
  try { const u = new URL(location.href); u.searchParams.delete('a'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch(e){}
  const run = () => { if (mode === 'loading') return setTimeout(run, 300);
    if (a === 'afinar') openTuner();
    if (a === 'metronomo'){ metro.open = true; try { localStorage.setItem('fluid.metro.open','1'); } catch(e){} goTab('treino'); setTimeout(() => document.getElementById('metro')?.scrollIntoView({ behavior:'smooth', block:'center' }), 200); }
    if (a === 'duvida') quickQuestion();
    if (a === 'buscar') openSearch(); };
  setTimeout(run, 600);
})();
/* ================= FIM UX ================= */
