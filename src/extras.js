/* ================= EXTRAS: microfone, afinador, ouvir acorde, gravações, metas e conquistas ================= */

/* ---------- microfone compartilhado ---------- */
const mic = { stream:null, src:null, an:null, users:0 };
async function micOpen(){
  if (mic.an) { mic.users++; return mic; }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('nomic');
  const ctx = actx();
  mic.stream = await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false } });
  mic.src = ctx.createMediaStreamSource(mic.stream);
  mic.an = ctx.createAnalyser(); mic.an.fftSize = 8192; mic.an.smoothingTimeConstant = 0;
  mic.src.connect(mic.an); mic.users = 1;
  return mic;
}
function micClose(force){
  mic.users = Math.max(0, mic.users - 1);
  if (mic.users && !force) return;
  try { mic.src && mic.src.disconnect(); } catch(e){}
  try { mic.stream && mic.stream.getTracks().forEach(t => t.stop()); } catch(e){}
  mic.stream = mic.src = mic.an = null; mic.users = 0;
}
const micErr = e => toast(e && e.name==='NotAllowedError' ? 'Libere o microfone para o Fluid nas permissões do navegador.' : 'Não consegui usar o microfone neste aparelho.');

/* detecção de altura (autocorrelação com refinamento parabólico) */
const pitchBuf = new Float32Array(4096);
function detectPitch(an, sr){
  const buf = pitchBuf.subarray(0, Math.min(4096, an.fftSize)); an.getFloatTimeDomainData(buf);
  let rms = 0; for (let i=0;i<buf.length;i++) rms += buf[i]*buf[i]; rms = Math.sqrt(rms/buf.length);
  if (rms < 0.012) return { f:0, rms };
  const minLag = Math.floor(sr/1000), maxLag = Math.floor(sr/65), n = buf.length - maxLag;
  let best = -1, bestLag = -1; const corr = new Float32Array(maxLag+2);
  for (let lag=minLag; lag<=maxLag; lag++){
    let c = 0, e1 = 0, e2 = 0;
    for (let i=0;i<n;i++){ const a = buf[i], b = buf[i+lag]; c += a*b; e1 += a*a; e2 += b*b; }
    const v = c / Math.sqrt(e1*e2 + 1e-12); corr[lag] = v;
    if (v > best){ best = v; bestLag = lag; }
  }
  if (best < 0.82 || bestLag < 0) return { f:0, rms };
  // prefere a primeira oitava com correlação quase máxima (evita erro de oitava abaixo)
  for (let lag=minLag; lag<bestLag; lag++){ if (corr[lag] > best*0.94 && corr[lag] >= corr[lag-1] && corr[lag] >= corr[lag+1]){ bestLag = lag; break; } }
  const y0 = corr[bestLag-1]||0, y1 = corr[bestLag], y2 = corr[bestLag+1]||0, d = (y2 - y0) / (2*(2*y1 - y0 - y2) || 1);
  return { f: sr / (bestLag + (isFinite(d) ? d : 0)), rms, clarity: best };
}
const NOTE_PT = ['Dó','Dó♯','Ré','Ré♯','Mi','Fá','Fá♯','Sol','Sol♯','Lá','Lá♯','Si'];
const NOTE_EN = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const midiOf = f => 69 + 12*Math.log2(f/440);
const fOf = m => 440*Math.pow(2,(m-69)/12);

/* ---------- celebração: confete, vibração, faixa ---------- */
function buzz(p){ try { navigator.vibrate && navigator.vibrate(p); } catch(e){} }
function confetti(n=120, origin){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas'); cv.className = 'confetti'; document.body.appendChild(cv);
  const dpr = Math.min(2, window.devicePixelRatio||1), W = innerWidth, H = innerHeight; cv.width = W*dpr; cv.height = H*dpr; const c = cv.getContext('2d'); c.scale(dpr,dpr);
  const cols = ['#34E0BE','#8B5CF6','#F43F7E','#FACC15','#38BDF8','#FB923C','#22C55E'];
  const ox = origin ? origin.x : W/2, oy = origin ? origin.y : H*0.35;
  const ps = Array.from({length:n}, () => { const a = Math.random()*Math.PI*2, v = 4 + Math.random()*9; return { x:ox, y:oy, vx:Math.cos(a)*v, vy:Math.sin(a)*v - 6, r:Math.random()*Math.PI, vr:(Math.random()-.5)*.3, w:6+Math.random()*7, h:4+Math.random()*5, c:cols[Math.floor(Math.random()*cols.length)], round:Math.random()<.3 }; });
  let t = 0; const step = () => { t++; c.clearRect(0,0,W,H); let alive = 0;
    ps.forEach(p => { p.vy += .28; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr; if (p.y < H+20) alive++;
      c.save(); c.globalAlpha = Math.max(0, 1 - t/150); c.translate(p.x,p.y); c.rotate(p.r); c.fillStyle = p.c;
      if (p.round){ c.beginPath(); c.arc(0,0,p.w/2.4,0,Math.PI*2); c.fill(); } else c.fillRect(-p.w/2,-p.h/2,p.w,p.h); c.restore(); });
    if (alive && t < 160) requestAnimationFrame(step); else cv.remove(); };
  requestAnimationFrame(step);
}
function celebrate(title, sub, icon){
  confetti(); buzz([18,40,18]);
  try { const ctx = actx(), t0 = ctx.currentTime + .02; [72,76,79,84].forEach((m,i) => pluck(m, t0 + i*.09, .18, 1.2)); } catch(e){}
  document.querySelectorAll('.cele').forEach(x => x.remove());
  const el = document.createElement('div'); el.className = 'cele'; el.setAttribute('role','status');
  el.innerHTML = `<span class="cele-ic">${icon||ACH_IC.star}</span><span><small>Conquista desbloqueada</small><b>${esc(title)}</b>${sub?`<em>${esc(sub)}</em>`:''}</span>`;
  document.body.appendChild(el); setTimeout(() => el.classList.add('out'), 3600); setTimeout(() => el.remove(), 4200);
}

/* ---------- afinador ---------- */
let tuner = null;
async function openTuner(){
  tuneStop();
  tuner = { str:0, auto:true, f:0, cents:0, note:'', hold:0, done:{}, raf:0, smooth:0 };
  renderTuner();
  try { await micOpen(); } catch(e){ micErr(e); tuner.err = true; renderTuner(); return; }
  tuner.on = true; markTuned('tuner-open');
  const sr = actx().sampleRate; let last = 0;
  const loop = (ts) => { if (!tuner || !tuner.on) return; tuner.raf = requestAnimationFrame(loop); if (ts - last < 45) return; last = ts;
    const r = detectPitch(mic.an, sr); updateTuner(r); };
  tuner.raf = requestAnimationFrame(loop);
}
function closeTuner(){ if (!tuner) return; cancelAnimationFrame(tuner.raf); if (tuner.on) micClose(); tuner = null; const el = document.getElementById('tuner'); el && el.remove(); }
function tunerTarget(f){
  if (!tuner.auto && tuner.str) return tuner.str;
  let best = 6, bd = 1e9; [1,2,3,4,5,6].forEach(s => { const d = Math.abs(midiOf(f) - OPEN[s]); if (d < bd){ bd = d; best = s; } }); return best;
}
function updateTuner(r){
  const el = document.getElementById('tuner'); if (!el || !tuner) return;
  const needle = el.querySelector('.tu-needle'), big = el.querySelector('.tu-note'), hz = el.querySelector('.tu-hz'), msg = el.querySelector('.tu-msg'), ring = el.querySelector('.tu-gauge');
  if (!r.f || r.f < 60 || r.f > 1100){
    tuner.idle = (tuner.idle||0) + 1;
    if (tuner.idle > 14){ ring.classList.remove('ok','near'); msg.textContent = 'Toque uma corda solta'; hz.textContent = ''; }
    return;
  }
  tuner.idle = 0;
  const s = tunerTarget(r.f), target = OPEN[s], m = midiOf(r.f);
  // se está longe da corda alvo, mostra a nota mais próxima de verdade
  const near = Math.round(m), cents = (m - target) * 100;
  const shown = Math.abs(m - target) > 1.5 ? (m - near) * 100 : cents;
  tuner.smooth = tuner.smooth*0.6 + Math.max(-50, Math.min(50, shown))*0.4;
  const c = tuner.smooth, ok = Math.abs(cents) <= 6;
  needle.style.transform = `rotate(${(c/50)*60}deg)`;
  big.textContent = Math.abs(m - target) > 1.5 ? NOTE_EN[((near%12)+12)%12] : TUNING.find(t=>t[0]===s)[1];
  hz.textContent = r.f.toFixed(1) + ' Hz · ' + (c>0?'+':'') + Math.round(c) + ' cents';
  el.querySelectorAll('.tu-str').forEach(b => b.classList.toggle('cur', +b.dataset.tstr === s));
  ring.classList.toggle('ok', ok); ring.classList.toggle('near', !ok && Math.abs(cents) < 20);
  if (Math.abs(m - target) > 1.5) msg.textContent = m < target ? 'Muito grave: aperte bem a tarraxa' : 'Muito agudo: solte bem a tarraxa';
  else msg.textContent = ok ? 'Afinada!' : cents < 0 ? 'Um pouco grave: aperte a tarraxa' : 'Um pouco aguda: solte a tarraxa';
  if (ok){ tuner.hold++; if (tuner.hold === 8 && !tuner.done[s]){ tuner.done[s] = true; buzz(25); const b = el.querySelector(`.tu-str[data-tstr="${s}"]`); b && b.classList.add('done');
      if (Object.keys(tuner.done).length === 6){ confetti(140); markTuned('all'); msg.textContent = 'Violão todo afinado!'; } } }
  else tuner.hold = 0;
}
function renderTuner(){
  let el = document.getElementById('tuner');
  if (!el){ el = document.createElement('div'); el.id = 'tuner'; el.className = 'practice tuner'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label','Afinador'); document.body.appendChild(el); }
  const ticks = Array.from({length:21}, (_,i) => { const a = -60 + i*6, big = i%5===0; return `<i class="tu-tick${big?' big':''}${i===10?' mid':''}" style="transform:rotate(${a}deg)"></i>`; }).join('');
  el.innerHTML = `<div class="ambient" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="pr-head"><button class="btn icon ghost" data-tu="close" aria-label="Fechar">${I.close}</button><h2>Afinador</h2></div>
    <div class="tu-main">
      ${tuner && tuner.err ? `<div class="empty"><h3>Sem microfone</h3><p>Libere o microfone para o Fluid nas permissões do navegador e abra o afinador de novo. Enquanto isso, use as notas de referência na tela de Treino.</p></div>` : `
      <div class="tu-gauge"><div class="tu-arc">${ticks}<span class="tu-needle"><i></i></span><span class="tu-hub"></span></div>
        <div class="tu-read"><b class="tu-note">–</b><small class="tu-hz"></small></div>
        <p class="tu-msg">${tuner && tuner.on ? 'Toque uma corda solta' : 'Ligando o microfone…'}</p></div>
      <div class="tu-strings">${TUNING.map(([s,n,pt]) => `<button class="tu-str${tuner && tuner.done[s]?' done':''}" data-tstr="${s}" aria-label="Corda ${s}, ${pt}"><b>${n}</b><small>${s}ª</small><i aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></i></button>`).join('')}</div>
      <p class="hint" style="text-align:center;margin:0">Toque uma corda de cada vez, solta. O Fluid descobre qual é sozinho. Toque numa corda acima para ouvir a referência.</p>`}
    </div>`;
  el.onclick = e => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tu === 'close') return closeTuner();
    if (b.dataset.tstr){ const s = +b.dataset.tstr; try { pluck(OPEN[s], actx().currentTime + .02, .3, 2.4); } catch(err){} } };
}
function markTuned(k){ if (k==='all') unlock('tuned'); }

/* ---------- ouvir o acorde pelo microfone (treino de trocas) ---------- */
const chromaBuf = new Float32Array(4096);
function chroma(an, sr){
  const bins = an.frequencyBinCount, data = chromaBuf.length >= bins ? chromaBuf.subarray(0, bins) : new Float32Array(bins);
  an.getFloatFrequencyData(data);
  const ch = new Float32Array(12), hz = sr / an.fftSize; let energy = 0;
  for (let i = Math.ceil(70/hz); i < Math.min(bins, Math.floor(1300/hz)); i++){
    const db = data[i]; if (db < -75) continue; const p = Math.pow(10, db/20);
    const m = 69 + 12*Math.log2(i*hz/440), pc = ((Math.round(m)%12)+12)%12, w = 1 - Math.abs(m - Math.round(m))*1.6; if (w <= 0) continue;
    ch[pc] += p*w; energy += p;
  }
  const mx = Math.max(...ch); if (mx > 0) for (let i=0;i<12;i++) ch[i] /= mx;
  return { ch, energy };
}
function chordScore(ch, name){
  const pcs = new Set(chordMidis(shapeOf(name), 0).map(m => m % 12)); let inS = 0, outS = 0, tot = 0;
  for (let i=0;i<12;i++){ tot += ch[i]; if (pcs.has(i)) inS += ch[i]; else outS += ch[i]; }
  let cover = 0; pcs.forEach(p => { if (ch[p] > .35) cover++; });
  return tot ? (inS/tot) * (cover / pcs.size) : 0;
}
async function trListenToggle(){
  const t = trainer; if (!t) return;
  if (t.listen){ t.listen = false; cancelAnimationFrame(t.lraf); micClose(); renderTrainer(); return; }
  try { await micOpen(); } catch(e){ micErr(e); return; }
  t.listen = true; t.heardFlip = null; t.lastHit = 0; renderTrainer();
  const sr = actx().sampleRate; let last = 0, streak = 0, cand = null;
  const loop = (ts) => { if (!trainer || !trainer.listen) return; trainer.lraf = requestAnimationFrame(loop); if (ts - last < 60) return; last = ts;
    const { ch, energy } = chroma(mic.an, sr); const el = document.getElementById('trainer'); const lv = el && el.querySelector('.tr-ear');
    if (energy < 0.02){ if (lv) lv.dataset.state = 'quiet'; streak = 0; return; }
    const flip = t.count % 2 === 1, from = flip ? t.b : t.a, to = flip ? t.a : t.b;
    const sTo = chordScore(ch, to), sFrom = chordScore(ch, from);
    const hit = sTo > 0.55 && sTo > sFrom + 0.06 ? to : sFrom > 0.55 && sFrom > sTo + 0.06 ? from : null;
    if (lv){ lv.dataset.state = hit===to ? 'good' : hit===from ? 'same' : 'listen'; const m = lv.querySelector('i'); if (m) m.style.width = Math.round(Math.max(sTo, sFrom)*100) + '%'; }
    if (hit === to){ streak = cand === to ? streak + 1 : 1; cand = to; } else { streak = 0; cand = hit; }
    if (streak >= 3 && t.state === 'run' && ts - t.lastHit > 450){ t.lastHit = ts; streak = 0; buzz(12); trTap(); }
  };
  t.lraf = requestAnimationFrame(loop);
}

/* ---------- gravações (ficam neste aparelho) ---------- */
const REC_DB = 'fluid-rec';
function recDb(){ return new Promise((res, rej) => { const r = indexedDB.open(REC_DB, 1); r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('recs')){ const s = d.createObjectStore('recs', { keyPath:'id' }); s.createIndex('song','songId'); } }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function recList(songId){ try { const d = await recDb(); return await new Promise((res) => { const out = []; const tx = d.transaction('recs'); tx.objectStore('recs').index('song').openCursor(IDBKeyRange.only(songId)).onsuccess = e => { const c = e.target.result; if (c){ out.push(c.value); c.continue(); } else res(out.sort((a,b)=>a.at.localeCompare(b.at))); }; }); } catch(e){ return []; } }
async function recPut(r){ const d = await recDb(); return new Promise((res, rej) => { const tx = d.transaction('recs','readwrite'); tx.objectStore('recs').put(r); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
async function recDel(id){ const d = await recDb(); return new Promise(res => { const tx = d.transaction('recs','readwrite'); tx.objectStore('recs').delete(id); tx.oncomplete = res; }); }
const rec = { mr:null, chunks:[], songId:null, t0:0, timer:0, audio:null, playing:null, cache:{} };
const fmtDur = s => Math.floor(s/60) + ':' + String(Math.round(s%60)).padStart(2,'0');
function recSection(s){
  const recording = rec.mr && rec.songId === s.id;
  setTimeout(() => recFill(s.id), 0);
  return `<section class="rec-sec">
    <div class="sec-h"><h3>Gravações</h3><span class="hint">ficam neste aparelho</span></div>
    <div class="rec-top">
      <button class="rec-btn${recording?' on':''}" data-rec="${recording?'stop':'start'}" data-song="${esc(s.id)}" aria-label="${recording?'Parar gravação':'Gravar um trecho'}"><span class="rec-dot"></span></button>
      <div class="rec-info">${recording ? `<b class="rec-time" id="rec-time">0:00</b><span class="rec-lvl"><i id="rec-lvl"></i></span>` : `<b>Grave você tocando</b><small>Daqui a algumas semanas, compare com a primeira e ouça a evolução.</small>`}</div>
    </div>
    <div class="rec-list" id="rec-list-${esc(s.id)}"></div>
  </section>`;
}
async function recFill(songId){
  const box = document.getElementById('rec-list-' + songId); if (!box) return;
  const list = await recList(songId); rec.cache[songId] = list;
  if (!list.length){ box.innerHTML = ''; return; }
  const first = list[0], lastR = list[list.length-1];
  box.innerHTML = (list.length > 1 ? `<button class="btn rec-cmp" data-rec="cmp" data-song="${esc(songId)}">${I.play}Comparar a primeira com a última <small>${Math.max(0, Math.round((new Date(lastR.at) - new Date(first.at))/864e5))} dias de diferença</small></button>` : '')
    + list.slice().reverse().map((r, i) => `<div class="rec-item${rec.playing===r.id?' playing':''}">
      <button class="rec-play" data-rec="play" data-id="${r.id}" data-song="${esc(songId)}" aria-label="${rec.playing===r.id?'Pausar':'Ouvir'} gravação">${rec.playing===r.id ? I.pause : I.play}</button>
      <span class="rec-meta"><b>${new Date(r.at).toLocaleDateString('pt-BR', { day:'numeric', month:'short' })}${i===list.length-1 && list.length>1 ? ' · primeira' : i===0 ? ' · mais recente' : ''}</b><small>${fmtDur(r.dur)} · ${new Date(r.at).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}</small></span>
      <span class="rec-wave" aria-hidden="true">${(r.peaks||[]).map(p => `<i style="height:${Math.max(8, Math.round(p*100))}%"></i>`).join('')}</span>
      <button class="rec-x" data-rec="del" data-id="${r.id}" data-song="${esc(songId)}" aria-label="Apagar gravação">${I.close}</button></div>`).join('');
}
async function recStart(songId){
  if (rec.mr) return;
  if (!window.MediaRecorder){ toast('Este navegador não grava áudio.'); return; }
  try { await micOpen(); } catch(e){ micErr(e); return; }
  const type = ['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
  rec.mr = new MediaRecorder(mic.stream, type ? { mimeType:type } : undefined); rec.chunks = []; rec.songId = songId; rec.t0 = performance.now(); rec.peaks = [];
  rec.mr.ondataavailable = e => e.data.size && rec.chunks.push(e.data);
  rec.mr.onstop = async () => {
    const dur = (performance.now() - rec.t0)/1000, blob = new Blob(rec.chunks, { type: rec.mr.mimeType || 'audio/webm' });
    const peaks = []; const step = Math.max(1, Math.floor(rec.peaks.length/40)); for (let i=0;i<rec.peaks.length;i+=step) peaks.push(Math.min(1, Math.sqrt(rec.peaks.slice(i,i+step).reduce((a,b)=>Math.max(a,b),0))*1.6));
    const sid = rec.songId; rec.mr = null; clearInterval(rec.timer); micClose();
    if (dur > 1.2){ await recPut({ id:'r'+Date.now().toString(36), songId:sid, at:new Date().toISOString(), dur, blob, peaks }); unlock('rec1'); toast('Gravação salva'); }
    refreshSheet();
  };
  rec.mr.start(250); refreshSheet(); buzz(15);
  const buf = new Float32Array(1024);
  rec.timer = setInterval(() => { const t = document.getElementById('rec-time'); if (t) t.textContent = fmtDur((performance.now()-rec.t0)/1000);
    if (mic.an){ mic.an.getFloatTimeDomainData(buf); let m = 0; for (let i=0;i<buf.length;i++) m = Math.max(m, Math.abs(buf[i])); rec.peaks.push(m); const l = document.getElementById('rec-lvl'); if (l) l.style.width = Math.min(100, m*260) + '%'; }
    if (performance.now() - rec.t0 > 5*60*1000) recStop(); }, 120);
}
function recStop(){ if (rec.mr && rec.mr.state !== 'inactive') rec.mr.stop(); }
function recStopAudio(){ if (rec.audio){ rec.audio.pause(); rec.audio.onended = null; } rec.audio = null; const was = rec.playing; rec.playing = null; return was; }
async function recPlay(songId, id, then){
  const was = recStopAudio(); if (was === id && !then){ recFill(songId); return; }
  const r = (rec.cache[songId] || await recList(songId)).find(x => x.id === id); if (!r) return;
  const a = new Audio(URL.createObjectURL(r.blob)); rec.audio = a; rec.playing = id; a.play().catch(()=>{});
  a.onended = () => { rec.playing = null; rec.audio = null; recFill(songId); then && then(); };
  recFill(songId);
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-rec]'); if (!b) return;
  const a = b.dataset.rec, sid = b.dataset.song;
  if (a === 'start') return recStart(sid);
  if (a === 'stop') return recStop();
  if (a === 'play') return recPlay(sid, b.dataset.id);
  if (a === 'del'){ if (!b.dataset.armed){ b.dataset.armed = '1'; b.classList.add('armed'); toast('Toque de novo para apagar a gravação'); return; } recStopAudio(); await recDel(b.dataset.id); recFill(sid); return; }
  if (a === 'cmp'){ const l = rec.cache[sid] || await recList(sid); if (l.length < 2) return; toast('Tocando a primeira gravação, depois a última'); recPlay(sid, l[0].id, () => setTimeout(() => recPlay(sid, l[l.length-1].id), 700)); }
});

/* ---------- tempo de treino, sequência, metas e conquistas ---------- */
let along = null;
let pract = { days:{}, goal:90, ach:{} };
const LSPR = 'fluid.practice.v1';
function practLoad(d){ pract = { days:{}, goal:90, ach:{}, ...(d||{}) }; }
let practDirty = 0;
async function practSave(){
  practDirty = 0;
  if (db){ try { await db.doc('meta/practice').set(JSON.parse(JSON.stringify(pract))); } catch(e){} }
  else lsSet(LSPR, pract);
}
function practActive(){
  return !document.hidden && (metro.playing || (practice && practice.playing) || (trainer && trainer.state === 'run') || !!(tuner && tuner.on) || !!rec.mr || !!(along && along.playing));
}
setInterval(() => {
  if (!practActive()) return;
  const d = todayLocal(); pract.days[d] = (pract.days[d] || 0) + 5; practDirty += 5;
  if (practDirty >= 60){ practSave(); checkAch(); updatePractCard(); }
}, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden && practDirty) practSave(); });
const dayAdd = (iso, k) => { const [y,m,d] = iso.split('-').map(Number); const dt = new Date(y, m-1, d+k); return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0'); };
const minsOn = iso => Math.floor((pract.days[iso] || 0) / 60);
function streakNow(){
  let d = todayLocal(), n = 0; if (minsOn(d) < 1) d = dayAdd(d, -1);
  while (minsOn(d) >= 1){ n++; d = dayAdd(d, -1); } return n;
}
function weekDays(){ const t = new Date(); const dow = (t.getDay()+6)%7; const mon = dayAdd(todayLocal(), -dow); return Array.from({length:7}, (_,i) => dayAdd(mon, i)); }
const weekMins = () => weekDays().reduce((a,d) => a + minsOn(d), 0);
const totalMins = () => Math.floor(Object.values(pract.days).reduce((a,b)=>a+b,0)/60);
const ACH_IC = {
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9Z"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.2 1-3.6 2-4.6.3 1.6 1.2 2.6 2.3 2.6C10.6 8.5 11 5 12 2Z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  note: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 18.5A2.5 2.5 0 1 1 6.5 16H9V5l11-2v12.5A2.5 2.5 0 1 1 17.5 13H20V6.4l-9 1.6v10.5Z"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7Z"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  fork: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8 3v8a4 4 0 0 0 8 0V3M12 15v6"/></svg>',
};
const ACH = [
  { k:'first',   t:'Primeiro treino',      d:'Treinou pela primeira vez',          ic:'note',   c:'#14B8A6', ok:() => totalMins() >= 1 },
  { k:'streak3', t:'3 dias seguidos',      d:'Treinou 3 dias sem pular',            ic:'flame',  c:'#F97316', ok:() => streakNow() >= 3 },
  { k:'streak7', t:'Uma semana inteira',   d:'7 dias seguidos treinando',           ic:'flame',  c:'#EF4444', ok:() => streakNow() >= 7 },
  { k:'streak30',t:'Mês de fogo',          d:'30 dias seguidos treinando',          ic:'flame',  c:'#DB2777', ok:() => streakNow() >= 30 },
  { k:'day30',   t:'Meia hora focado',     d:'30 minutos de treino num dia',        ic:'clock',  c:'#6366F1', ok:() => Object.keys(pract.days).some(d => minsOn(d) >= 30) },
  { k:'goal',    t:'Meta da semana',       d:'Bateu a meta de minutos da semana',   ic:'target', c:'#22C55E', ok:() => weekMins() >= (pract.goal||90) },
  { k:'chord1',  t:'Primeiro acorde',      d:'Marcou um acorde como aprendido',     ic:'star',   c:'#8B5CF6', ok:() => (progress.mastered||[]).length >= 1 },
  { k:'chord5',  t:'Cinco acordes',        d:'5 acordes no anel de dentro',         ic:'star',   c:'#7C3AED', ok:() => (progress.mastered||[]).length >= 5 },
  { k:'chord10', t:'Dez acordes',          d:'10 acordes aprendidos',               ic:'star',   c:'#4F46E5', ok:() => (progress.mastered||[]).length >= 10 },
  { k:'ready1',  t:'Primeira música pronta', d:'Sabe todos os acordes de uma música', ic:'note', c:'#0EA5E9', ok:() => songs.some(isReady) },
  { k:'songs5',  t:'Repertório',           d:'5 músicas no caderno',                ic:'note',   c:'#0284C7', ok:() => songs.length >= 5 },
  { k:'swap30',  t:'Mão rápida',           d:'30 trocas em 1 minuto',               ic:'bolt',   c:'#FACC15', ok:() => Object.values(changes.pairs||{}).some(p => (p.best||0) >= 30) },
  { k:'rec1',    t:'Primeira gravação',    d:'Gravou você tocando',                 ic:'mic',    c:'#EC4899', ok:() => !!pract.ach.rec1 },
  { k:'tuned',   t:'Ouvido afinado',       d:'Afinou as 6 cordas pelo afinador',    ic:'fork',   c:'#10B981', ok:() => !!pract.ach.tuned },
];
let achReady = false;
function unlock(k){ if (pract.ach[k]) return; pract.ach[k] = new Date().toISOString(); const a = ACH.find(x => x.k===k); if (a && achReady) celebrate(a.t, a.d, ACH_IC[a.ic]); practSave(); updatePractCard(); }
function checkAch(){ if (!achReady) return; ACH.forEach(a => { if (!pract.ach[a.k] && a.k!=='rec1' && a.k!=='tuned' && a.ok()) unlock(a.k); }); }
setTimeout(() => { // primeira carga: registra o que já foi conquistado sem fazer festa
  ACH.forEach(a => { if (!pract.ach[a.k] && a.k!=='rec1' && a.k!=='tuned' && a.ok()) pract.ach[a.k] = new Date().toISOString(); });
  achReady = true; updatePractCard();
}, 4000);

function practHTML(){
  const st = streakNow(), wk = weekMins(), goal = pract.goal || 90, pct = Math.min(1, wk/goal), days = weekDays(), t = todayLocal();
  const mx = Math.max(15, ...days.map(minsOn)); const R = 34, C = 2*Math.PI*R;
  const got = ACH.filter(a => pract.ach[a.k]).length;
  return `<section class="pract" id="pract" aria-label="Seu treino">
    <div class="pr-streak${st?' lit':''}"><span class="flame" aria-hidden="true">${ACH_IC.flame}</span><span><b>${st}</b><small>${st===1?'dia seguido':'dias seguidos'}</small></span></div>
    <button class="pr-ring" data-act="pract-goal" aria-label="Meta da semana: ${wk} de ${goal} minutos. Toque para mudar a meta">
      <svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="${R}" class="rg-track"/><circle cx="40" cy="40" r="${R}" class="rg-prog" style="stroke-dasharray:${C};stroke-dashoffset:${(C*(1-pct)).toFixed(1)}"/></svg>
      <span><b>${wk}</b><small>de ${goal} min</small></span></button>
    <div class="pr-week" aria-label="Minutos por dia nesta semana">${days.map((d,i) => `<span class="${d===t?'today':''}${minsOn(d)?' on':''}" title="${minsOn(d)} min"><i style="height:${Math.max(6, Math.round(minsOn(d)/mx*100))}%"></i><small>${'STQQSSD'[i]}</small></span>`).join('')}</div>
    <div class="pr-ach"><div class="pr-ach-h"><small>Conquistas</small><b>${got}/${ACH.length}</b></div>
      <div class="pr-badges">${ACH.map(a => `<button class="badge-a${pract.ach[a.k]?' got':''}" style="--c:${a.c}" data-ach="${a.k}" aria-label="${esc(a.t)}: ${esc(a.d)}${pract.ach[a.k]?' (conquistada)':''}">${ACH_IC[a.ic]}</button>`).join('')}</div></div>
  </section>`;
}
function updatePractCard(){ const el = document.getElementById('pract'); if (el) el.outerHTML = practHTML(); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ach]'); if (b){ const a = ACH.find(x => x.k === b.dataset.ach); if (a){ toast((pract.ach[a.k] ? 'Conquistada: ' : 'Para conquistar: ') + a.t + '. ' + a.d); if (pract.ach[a.k]){ const r = b.getBoundingClientRect(); confetti(40, { x:r.left+r.width/2, y:r.top }); } } return; }
  const g = e.target.closest('[data-act="pract-goal"]'); if (g){ const opts = [30,60,90,120,180,240,300]; const i = opts.indexOf(pract.goal||90); pract.goal = opts[(i+1) % opts.length]; practSave(); updatePractCard(); toast('Meta da semana: ' + pract.goal + ' minutos de treino'); return; }
  const p = e.target.closest('.btn.primary, .metro-play, .play, .tr-dial, .rec-btn'); if (p) buzz(8);
}, true);
/* ================= FIM EXTRAS ================= */

/* ================= TOCAR JUNTO: vídeo do YouTube dentro do treino ================= */
const ytIdOf = u => { if (!u) return ''; const m = String(u).match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : ''; };
let ytApi = null;
function ytLoad(){
  if (ytApi) return ytApi;
  ytApi = new Promise(res => {
    if (window.YT && window.YT.Player) return res(window.YT);
    const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { prev && prev(); res(window.YT); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = () => res(null); document.head.appendChild(s);
    setTimeout(() => res(window.YT && window.YT.Player ? window.YT : null), 9000);
  });
  return ytApi;
}
along = { show:false, rate:1, player:null, ready:false, vid:'', playing:false };
function alongVid(s){ return ytIdOf(s.yt) || ytIdOf(s.link); }
function alongCard(){
  const p = practice; if (!p) return;
  let el = document.getElementById('along');
  if (!along.show){ el && el.remove(); return; }
  const vid = alongVid(p.s);
  if (!el){ el = document.createElement('div'); el.id = 'along'; el.className = 'along'; document.body.appendChild(el); }
  if (!vid){
    const q = encodeURIComponent([p.s.title, p.s.artist].filter(Boolean).join(' '));
    el.innerHTML = `<div class="al-head"><b>Tocar junto com a música</b><button class="al-x" data-al="close" aria-label="Fechar">${I.close}</button></div>
      <p>Cole o link do vídeo no YouTube para tocar junto, com a velocidade que quiser.</p>
      <div class="al-row"><input class="inp" id="al-url" placeholder="https://youtube.com/watch?v=..." inputmode="url"><button class="btn primary" data-al="save">Usar</button></div>
      <a class="al-find" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">Procurar "${esc(p.s.title||'a música')}" no YouTube</a>`;
    return;
  }
  if (along.vid !== vid || !el.querySelector('#al-frame')){
    along.vid = vid; along.ready = false; along.player = null;
    el.innerHTML = `<div class="al-video"><div id="al-frame"></div></div>
      <div class="al-bar"><div class="seg" role="group" aria-label="Velocidade">${[.5,.75,1].map(r => `<button data-al-rate="${r}" aria-pressed="${along.rate===r}">${r===1?'Normal':Math.round(r*100)+'%'}</button>`).join('')}</div>
        <button class="al-x" data-al="close" aria-label="Fechar vídeo">${I.close}</button></div>`;
    ytLoad().then(YT => {
      if (!YT){ const f = el.querySelector('.al-video'); if (f) f.innerHTML = `<p class="al-err">O vídeo não carregou aqui. <a href="https://youtu.be/${vid}" target="_blank" rel="noopener">Abrir no YouTube</a></p>`; return; }
      along.player = new YT.Player('al-frame', { videoId: vid, playerVars:{ playsinline:1, rel:0, modestbranding:1 },
        events:{ onReady: () => { along.ready = true; try { along.player.setPlaybackRate(along.rate); } catch(e){} if (practice && practice.playing) alongPlay(); },
                 onStateChange: e => { along.playing = e.data === 1; } } });
    });
  } else {
    el.querySelectorAll('[data-al-rate]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.alRate === along.rate)));
  }
}
function alongPlay(){ if (along.player && along.ready){ try { along.player.setPlaybackRate(along.rate); along.player.playVideo(); } catch(e){} } }
function alongPause(){ if (along.player && along.ready){ try { along.player.pauseVideo(); } catch(e){} } }
function alongClose(){ alongPause(); along.show = false; try { along.player && along.player.destroy(); } catch(e){} along.player = null; along.vid = ''; along.ready = false; const el = document.getElementById('along'); el && el.remove(); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-al],[data-al-rate]'); if (!b) return;
  const p = practice; if (!p) return;
  if (b.dataset.alRate){ along.rate = +b.dataset.alRate; const base = p.baseBpm || p.bpm; p.baseBpm = base; p.bpm = Math.round(base * along.rate); try { along.player && along.player.setPlaybackRate(along.rate); } catch(err){} renderPractice(); alongCard(); return; }
  const a = b.dataset.al;
  if (a === 'toggle'){ along.show = !along.show; if (along.show){ p.baseBpm = p.baseBpm || p.bpm; } alongCard(); renderPractice(); return; }
  if (a === 'close'){ alongClose(); renderPractice(); return; }
  if (a === 'save'){ const v = (document.getElementById('al-url')||{}).value || ''; const id = ytIdOf(v); if (!id){ toast('Esse link não parece ser do YouTube'); return; }
    p.s = { ...p.s, yt: v.trim() }; saveSong(p.s); alongCard(); toast('Vídeo salvo nesta música'); return; }
  if (a === 'click'){ p.mute = !p.mute; renderPractice(); return; }
});
/* ================= FIM TOCAR JUNTO ================= */
