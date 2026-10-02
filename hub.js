/* Fluid · Central: pastas, alunos, financeiro e conta (só na versão web).
   Usa o Supabase exposto pelo web.js em window.FluidWeb. Alunos, cobranças e ajustes
   ficam em tabelas privadas do professor; as pastas são os cadernos compartilhados. */
(function(){
  'use strict';
  const W = () => window.FluidWeb;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials = t => (t||'?').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();

  /* ---------- datas e dinheiro ---------- */
  const pad = n => String(n).padStart(2,'0');
  const isoOf = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const today = () => isoOf(new Date());
  const ymOf = iso => iso.slice(0,7);
  const parse = iso => { const [y,m,d] = iso.split('-').map(Number); return new Date(y, m-1, d||1); };
  const addMonths = (ym, k) => { const d = parse(ym+'-01'); d.setMonth(d.getMonth()+k); return isoOf(d).slice(0,7); };
  const dim = ym => { const [y,m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const MON = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const monthName = ym => { const [y,m] = ym.split('-').map(Number); return MONTHS[m-1] + ' ' + y; };
  const shortDate = iso => { const d = parse(iso); return d.getDate() + ' ' + MON[d.getMonth()]; };
  const fullDate = iso => { const d = parse(iso); return pad(d.getDate()) + '/' + pad(d.getMonth()+1) + '/' + d.getFullYear(); };
  const brl = n => (Number(n)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const COLORS = ['#6366F1','#14B8A6','#F97316','#E11D48','#8B5CF6','#0EA5E9','#22C55E','#F59E0B','#EC4899','#64748B'];
  const colorFor = (id, c) => c || COLORS[[...String(id||'')].reduce((a,ch)=>a+ch.charCodeAt(0),0) % COLORS.length];
  const phoneDigits = p => { let d = String(p||'').replace(/\D/g,''); if (d.length===10 || d.length===11) d = '55'+d; return d; };
  const METHODS = [['pix','Pix'],['dinheiro','Dinheiro'],['cartao','Cartão'],['transferencia','Transferência']];
  const METHOD_LABEL = k => k==='isento' ? 'Isento' : (METHODS.find(m=>m[0]===k)||[,k])[1];

  /* ---------- estado ---------- */
  const st = { open:false, tab:'pastas', view:null, students:[], payments:[], settings:{ remind_days:3 }, loaded:false, loadErr:'',
    month: ymOf(today()), finTab:'geral', range:{ preset:'month' }, hq:'', filter:'active', q:'', members:{}, owners:{}, flash:'', busy:false, payOpen:null };

  /* ---------- status das cobranças ---------- */
  function payStatus(p){
    if (p.paid_at) return 'paid';
    const t = today();
    if (p.due_date < t) return 'late';
    if (daysBetween(t, p.due_date) <= (st.settings.remind_days ?? 3)) return 'soon';
    return 'open';
  }
  const STATUS = { paid:['Pago','ok'], late:['Atrasado','bad'], soon:['Vence logo','warn'], open:['A vencer','info'], plan:['Previsto','muted'] };
  function dueLabel(p){
    if (p.paid_at) return 'pago em ' + shortDate(p.paid_at);
    const d = daysBetween(today(), p.due_date);
    if (d < 0) return `venceu há ${-d} ${-d===1?'dia':'dias'}`;
    if (d === 0) return 'vence hoje';
    if (d === 1) return 'vence amanhã';
    return `vence em ${d} dias · ${shortDate(p.due_date)}`;
  }
  const studentById = id => st.students.find(s => s.id === id);
  function studentPayState(s){
    const ps = st.payments.filter(p => p.student_id === s.id && !p.paid_at);
    if (ps.some(p => payStatus(p)==='late')) return 'late';
    if (ps.some(p => payStatus(p)==='soon')) return 'soon';
    return 'ok';
  }
  const scheduleText = s => { const d = (s.lesson_days||[]).slice().sort().map(i=>DAYS[i]); return (d.length ? (d.length>1 ? d.slice(0,-1).join(', ')+' e '+d.slice(-1) : d[0]) : 'Sem dia fixo') + (s.lesson_time ? ' · ' + s.lesson_time.replace(':00','h').replace(':','h') : ''); };

  /* ---------- dados ---------- */
  async function loadTeacher(){
    const sb = W().sb;
    const [a, b, c] = await Promise.all([
      sb.from('students').select('*').order('name'),
      sb.from('payments').select('*').order('due_date'),
      sb.from('teacher_settings').select('*').maybeSingle(),
    ]);
    if (a.error || b.error){ st.loadErr = W().errText(a.error || b.error); st.loaded = true; return; }
    st.students = a.data || []; st.payments = b.data || []; st.settings = c.data || { remind_days:3 }; st.loadErr = '';
    await ensureCharges();
    st.loaded = true; updateBadge();
  }
  // cria as mensalidades que faltam (do início do aluno até o mês atual, no máximo 12 meses para trás)
  async function ensureCharges(){
    const now = ymOf(today()), rows = [];
    st.students.filter(s => s.status==='active' && Number(s.fee) > 0).forEach(s => {
      let ym = ymOf(s.start_date || today()); const floor = addMonths(now, -11); if (ym < floor) ym = floor;
      for (; ym <= now; ym = addMonths(ym, 1)){
        if (st.payments.some(p => p.student_id===s.id && p.period===ym)) continue;
        const due = ym + '-' + pad(Math.min(s.due_day||10, dim(ym)));
        if (s.start_date && due < s.start_date && ymOf(s.start_date)===ym) continue;
        rows.push({ student_id: s.id, period: ym, due_date: due, amount: s.fee });
      }
    });
    if (!rows.length) return;
    const { data, error } = await W().sb.from('payments').upsert(rows, { onConflict: 'student_id,period', ignoreDuplicates: true }).select();
    if (!error && data) st.payments = st.payments.concat(data.filter(d => !st.payments.some(p => p.id===d.id)));
  }
  async function loadFolders(){
    const ids = W().notebooks().map(n => n.id); if (!ids.length) return;
    const { data } = await W().sb.from('notebook_members').select('notebook_id, user_id, role, profiles(name)').in('notebook_id', ids);
    st.members = {}; (data||[]).forEach(m => (st.members[m.notebook_id] ||= []).push(m));
  }

  /* ---------- badge e alertas ---------- */
  function counts(){
    let late = 0, soon = 0, lateSum = 0;
    st.payments.forEach(p => { const k = payStatus(p); if (k==='late'){ late++; lateSum += Number(p.amount)||0; } if (k==='soon') soon++; });
    return { late, soon, lateSum };
  }
  function updateBadge(){
    const c = counts(); window.FLUID_HUB_BADGE = { late: c.late, soon: c.soon };
    if (typeof window.render === 'function'){ try { window.render(); } catch(e){} }
    const key = 'fluid.hub.alert.' + today();
    if ((c.late || c.soon) && !sessionStorage.getItem(key) && typeof window.toast === 'function'){
      sessionStorage.setItem(key, '1');
      setTimeout(() => window.toast(c.late ? `${c.late} ${c.late===1?'mensalidade atrasada':'mensalidades atrasadas'}. Veja no Financeiro.` : `${c.soon} ${c.soon===1?'mensalidade vence':'mensalidades vencem'} nos próximos dias.`), 900);
    }
  }

  /* ---------- casca ---------- */
  let root;
  function mount(){
    if (root) return;
    root = document.createElement('div'); root.className = 'hb-over'; root.hidden = true;
    root.innerHTML = '<div class="hb-sheet" role="dialog" aria-modal="true" aria-label="Central do Fluid"></div>';
    document.body.appendChild(root);
    root.addEventListener('click', onClick);
    root.addEventListener('submit', onSubmit);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);
    document.addEventListener('keydown', e => { if (st.open && e.key==='Escape'){ if (st.view) back(); else close(); } });
  }
  async function open(tab){
    mount(); st.open = true; if (tab) st.tab = tab; st.view = null; root.hidden = false; document.documentElement.classList.add('hb-lock');
    draw();
    try { await Promise.all([W().loadNotebooks().then(loadFolders), st.loaded ? null : loadTeacher()]); } catch(e){ st.loadErr = W().errText(e); }
    draw();
  }
  function close(){ st.open = false; root.hidden = true; root.querySelector('.hb-sheet').innerHTML = ''; document.documentElement.classList.remove('hb-lock'); }
  function back(){ st.view = st.view && st.view.back ? st.view.back : null; draw(); }
  function say(msg){ st.flash = msg; draw(); setTimeout(() => { if (st.flash === msg){ st.flash = ''; const f = root.querySelector('.hb-flash'); f && f.remove(); } }, 2600); }

  function draw(){
    if (!root || !st.open) return;
    const sheet = root.querySelector('.hb-sheet'); const keep = sheet.querySelector('.hb-body'); const y = keep ? keep.scrollTop : 0;
    const c = counts();
    const tabs = [['pastas','Pastas'],['alunos','Alunos'],['financeiro','Financeiro'],['conta','Conta']];
    sheet.innerHTML = `
      <header class="hb-head">
        ${st.view ? `<button class="hb-icon" data-h="back" aria-label="Voltar">${IC.back}</button>` : `<div class="hb-me"><i style="--c:${colorFor(W().me().id)}">${esc(initials(W().me().name))}</i><span><b>${esc(W().me().name)}</b><small>${esc(W().current().name)}</small></span></div>`}
        <button class="hb-icon" data-h="close" aria-label="Fechar">${IC.close}</button>
      </header>
      ${st.view ? '' : `<nav class="hb-tabs" role="tablist">${tabs.map(([k,l]) => `<button role="tab" data-tab="${k}" aria-selected="${st.tab===k}">${l}${k==='financeiro' && c.late ? `<span class="hb-dot bad">${c.late}</span>` : k==='financeiro' && c.soon ? `<span class="hb-dot warn">${c.soon}</span>` : ''}</button>`).join('')}</nav>`}
      <div class="hb-body">${body()}</div>
      ${st.flash ? `<div class="hb-flash" role="status">${esc(st.flash)}</div>` : ''}`;
    const nb = sheet.querySelector('.hb-body'); if (nb && keep && !st.resetScroll) nb.scrollTop = y; st.resetScroll = false;
    const f = sheet.querySelector('[autofocus]'); if (f) f.focus();
  }
  function body(){
    if (st.view) return VIEWS[st.view.type](st.view);
    if (st.tab==='pastas') return viewFolders();
    if (st.tab==='alunos') return guard() || viewStudents();
    if (st.tab==='financeiro') return guard() || viewFinance();
    return viewAccount();
  }
  function guard(){
    if (!st.loaded) return `<div class="hb-empty"><p>Carregando…</p></div>`;
    if (st.loadErr) return `<div class="hb-empty"><h3>Não consegui abrir agora</h3><p>${esc(st.loadErr)}</p><button class="btn" data-h="retry">Tentar de novo</button></div>`;
    return '';
  }

  /* ---------- ícones ---------- */
  const sv = (d, f) => `<svg viewBox="0 0 24 24" fill="${f?'currentColor':'none'}" stroke="${f?'none':'currentColor'}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    back: sv('<path d="M15 18l-6-6 6-6"/>'), close: sv('<path d="M18 6 6 18M6 6l12 12"/>'), plus: sv('<path d="M12 5v14M5 12h14"/>'),
    folder: sv('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>'),
    link: sv('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    wa: sv('<path d="M20.5 3.5A11 11 0 0 0 3.2 17.1L2 22l5-1.3A11 11 0 1 0 20.5 3.5Zm-8.5 17a9 9 0 0 1-4.6-1.3l-.3-.2-3 .8.8-2.9-.2-.3A9 9 0 1 1 12 20.5Zm5-6.7c-.3-.1-1.6-.8-1.9-.9s-.4-.1-.6.1-.7.9-.9 1.1-.3.2-.6.1a7.4 7.4 0 0 1-3.7-3.2c-.3-.5.3-.5.8-1.5.1-.2 0-.3 0-.5l-.9-2c-.2-.5-.5-.5-.6-.5h-.5a1 1 0 0 0-.8.4 3.2 3.2 0 0 0-1 2.4 5.6 5.6 0 0 0 1.2 3 12.8 12.8 0 0 0 4.9 4.3c1.8.8 2.5.8 3.4.7a2.9 2.9 0 0 0 1.9-1.3 2.4 2.4 0 0 0 .2-1.3c-.1-.2-.3-.3-.6-.4Z"/>', true),
    edit: sv('<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>'), check: sv('<path d="M5 12l5 5 9-10"/>'),
    left: sv('<path d="M15 18l-6-6 6-6"/>'), right: sv('<path d="M9 18l6-6-6-6"/>'), gear: sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'),
    cal: sv('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>'), alert: sv('<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>'),
    receipt: sv('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/>'), down: sv('<path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 20h14"/>'), bell: sv('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/>'), grid: sv('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
    trash: sv('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'), pause: sv('<path d="M9 5v14M15 5v14"/>'), play: sv('<path d="M7 5l12 7-12 7Z"/>'), share: sv('<path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>'),
  };
  const pill = (k, label) => `<span class="hb-pill ${STATUS[k]?.[1]||k}">${esc(label || STATUS[k][0])}</span>`;
  const avatar = (name, color, size='') => `<i class="hb-av ${size}" style="--c:${color}">${esc(initials(name))}</i>`;

  /* ================= PASTAS ================= */
  function viewFolders(){
    const nbs = W().notebooks(), cur = W().current();
    const mine = nbs.filter(n => n.role==='owner'), shared = nbs.filter(n => n.role!=='owner');
    const card = n => {
      const mem = (st.members[n.id]||[]), others = mem.filter(m => m.user_id !== W().me().id);
      const stu = st.students.find(s => s.notebook_id === n.id);
      const label = n.role==='owner' ? (n.kind==='student' ? (stu ? 'Pasta do aluno ' + stu.name.split(' ')[0] : 'Pasta de aluno') : 'Pasta pessoal')
        : (n.role==='teacher' ? 'Você é professor aqui' : 'Você é aluno aqui');
      const color = colorFor(n.id, n.color);
      return `<article class="hb-folder${n.id===cur.id?' on':''}" style="--c:${color}">
        <div class="hb-ftop"><span class="hb-fic">${IC.folder}</span>${n.id===cur.id ? '<span class="hb-open-tag">Aberta agora</span>' : ''}</div>
        <b class="hb-fname">${esc(n.name)}</b>
        <small>${esc(label)}</small>
        <div class="hb-fmem">${others.length ? others.slice(0,4).map(m => avatar(m.profiles?.name||'?', colorFor(m.user_id), 'sm')).join('') + `<span>${others.length===1 ? esc((others[0].profiles?.name||'1 pessoa').split(' ')[0]) + (others[0].role==='owner'?' (dono)':others[0].role==='teacher'?' (professor)':' (aluno)') : others.length + ' pessoas'}</span>` : '<span>Só você</span>'}</div>
        <div class="hb-factions">
          ${n.id===cur.id ? '' : `<button class="btn primary sm" data-h="open-nb" data-id="${n.id}">Abrir</button>`}
          ${n.role==='owner' ? `<button class="btn sm" data-h="invite" data-id="${n.id}" data-phone="${esc(stu && stu.phone || '')}">${IC.link}Convidar</button><button class="hb-icon sm" data-h="nb-edit" data-id="${n.id}" aria-label="Editar pasta ${esc(n.name)}">${IC.edit}</button>` : ''}
        </div>
      </article>`;
    };
    return `
      <section class="hb-intro"><h2>Suas pastas</h2><p>Cada pasta é um caderno separado, com músicas, aulas e treinos próprios. Professores podem ter uma pasta pessoal e uma pasta para cada aluno.</p></section>
      <div class="hb-sec-h"><h3>Minhas pastas</h3><button class="btn sm primary" data-h="nb-new">${IC.plus}Nova pasta</button></div>
      <div class="hb-grid">${mine.map(card).join('')}</div>
      ${shared.length ? `<div class="hb-sec-h"><h3>Compartilhadas comigo</h3></div><div class="hb-grid">${shared.map(card).join('')}</div>` : `<p class="hb-hint">Quando alguém convidar você para uma pasta, ela aparece aqui.</p>`}`;
  }
  function viewFolderForm(v){
    const n = v.id ? W().notebooks().find(x => x.id===v.id) : null;
    const free = st.students.filter(s => !s.notebook_id);
    const color = v.color || (n && n.color) || COLORS[(W().notebooks().length) % COLORS.length];
    const kind = v.kind || (n ? n.kind : 'personal');
    return `<form class="hb-form" data-form="nb">
      <h2>${n ? 'Editar pasta' : 'Nova pasta'}</h2>
      ${n ? '' : `<div class="hb-field"><span>Tipo</span><div class="hb-seg">
        <button type="button" data-h="nbkind" data-v="personal" aria-pressed="${kind==='personal'}">Pessoal</button>
        <button type="button" data-h="nbkind" data-v="student" aria-pressed="${kind==='student'}">Para um aluno</button></div></div>`}
      ${!n && kind==='student' ? `<label class="hb-field"><span>Aluno</span><select class="inp" name="student">${free.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}<option value="">Outro (só o nome da pasta)</option></select>
        <small>${free.length ? 'A pasta fica ligada ao aluno. Depois é só convidar ele.' : 'Todos os alunos cadastrados já têm pasta. Cadastre um novo na aba Alunos.'}</small></label>` : ''}
      <label class="hb-field"><span>Nome da pasta</span><input class="inp" name="name" maxlength="60" required value="${esc(n ? n.name : (v.name||''))}" placeholder="${kind==='student' ? 'Pasta do aluno (se vazio, usa o nome dele)' : 'Ex.: Meus estudos'}" ${kind==='student' && !n ? '' : 'autofocus'}></label>
      <div class="hb-field"><span>Cor</span><div class="hb-colors">${COLORS.map(c => `<button type="button" data-h="nbcolor" data-v="${c}" style="--c:${c}" aria-pressed="${c===color}" aria-label="Cor ${c}"></button>`).join('')}</div><input type="hidden" name="color" value="${color}"></div>
      <div class="hb-form-act"><button class="btn primary" type="submit">${n ? 'Salvar' : 'Criar pasta'}</button><button class="btn ghost" type="button" data-h="back">Cancelar</button></div>
      ${n && n.id !== firstOwned()?.id ? `<div class="hb-danger"><p>Apagar a pasta remove as músicas, aulas e treinos dela para todos que têm acesso.</p><button class="btn ghost danger sm" type="button" data-h="nb-del" data-id="${n.id}">${v.armed ? 'Toque de novo para apagar' : 'Apagar pasta'}</button></div>` : ''}
    </form>`;
  }
  const firstOwned = () => W().notebooks().filter(n => n.role==='owner').sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)))[0];
  function viewInvite(v){
    const n = W().notebooks().find(x => x.id===v.id) || W().current();
    const role = v.role || (n.kind==='student' ? 'student' : 'teacher');
    return `<div class="hb-form">
      <h2>Convidar para ${esc(n.name)}</h2>
      <div class="hb-field"><span>Quem você vai convidar?</span><div class="hb-seg">
        <button type="button" data-h="irole" data-v="student" aria-pressed="${role==='student'}">Um aluno</button>
        <button type="button" data-h="irole" data-v="teacher" aria-pressed="${role==='teacher'}">Um professor</button></div></div>
      <p class="hb-hint">${role==='student' ? 'O aluno abre o link, cria a conta e passa a ver e anotar nesta pasta: músicas, aulas, lição de casa e treinos.' : 'O professor abre o link, cria a conta e passa a ver e editar esta pasta junto com você.'}</p>
      ${v.link ? `<div class="hb-linkbox"><input class="inp" readonly value="${esc(v.link)}" aria-label="Link de convite" id="hb-link"><button class="btn" data-h="copy">Copiar</button></div>
        <div class="hb-share"><a class="btn hb-wa" href="https://wa.me/${v.phone ? phoneDigits(v.phone) : ''}?text=${encodeURIComponent(inviteText(role, n.name, v.link))}" target="_blank" rel="noopener">${IC.wa}Mandar no WhatsApp</a>${navigator.share ? `<button class="btn" data-h="share-inv">${IC.share}Compartilhar</button>` : ''}</div>
        <p class="hb-hint">Cada link vale para uma pessoa e vence em 14 dias.</p>`
      : `<button class="btn primary" data-h="gen-inv">${IC.link}Gerar link de convite</button>`}
    </div>`;
  }
  const inviteText = (role, name, link) => role==='student'
    ? `Oi! Criei sua pasta no Fluid (${name}) para a gente anotar as músicas, as aulas e os treinos de violão. Abre o link e cria sua conta: ${link}`
    : `Oi! Estou anotando minhas músicas e aulas de violão no Fluid. Abre este link para ver e editar a pasta ${name} comigo: ${link}`;

  /* ================= ALUNOS ================= */
  function viewStudents(){
    const t = today(), dow = new Date().getDay();
    const act = st.students.filter(s => s.status==='active');
    const todays = act.filter(s => (s.lesson_days||[]).includes(dow)).sort((a,b)=>String(a.lesson_time||'').localeCompare(String(b.lesson_time||'')));
    const monthly = act.reduce((a,s)=>a+(Number(s.fee)||0),0);
    const late = st.students.filter(s => studentPayState(s)==='late').length;
    const q = st.q.trim().toLowerCase();
    const list = st.students.filter(s => (st.filter==='all' || s.status===st.filter) && (!q || [s.name,s.phone,s.email].join(' ').toLowerCase().includes(q)));
    return `
      <div class="hb-stats">
        <div class="hb-stat" style="--c:#6366F1"><small>Alunos ativos</small><b>${act.length}</b></div>
        <div class="hb-stat" style="--c:#14B8A6"><small>Aulas hoje</small><b>${todays.length}</b></div>
        <div class="hb-stat" style="--c:#8B5CF6"><small>Mensalidades</small><b>${brl(monthly)}</b></div>
        <div class="hb-stat" style="--c:${late?'#EF4444':'#22C55E'}"><small>${late?'Com atraso':'Pagamentos'}</small><b>${late || 'Em dia'}</b></div>
      </div>
      ${todays.length ? `<section class="hb-today"><h3>${IC.cal}Aulas de hoje</h3><div class="hb-chips">${todays.map(s => `<button class="hb-chip" data-h="stu" data-id="${s.id}" style="--c:${colorFor(s.id,s.color)}"><b>${esc(s.lesson_time||'—')}</b>${esc(s.name.split(' ')[0])}</button>`).join('')}</div></section>` : ''}
      <div class="hb-tool">
        <input class="inp hb-search" type="search" placeholder="Buscar aluno" value="${esc(st.q)}" data-in="q" aria-label="Buscar aluno">
        <button class="btn primary" data-h="stu-new">${IC.plus}Aluno</button>
      </div>
      <div class="hb-seg wide" role="group" aria-label="Filtro">${[['active','Ativos'],['paused','Pausados'],['all','Todos']].map(([k,l]) => `<button data-h="sfilter" data-v="${k}" aria-pressed="${st.filter===k}">${l} <small>${k==='all'?st.students.length:st.students.filter(s=>s.status===k).length}</small></button>`).join('')}</div>
      ${!st.students.length ? `<div class="hb-empty big"><h3>Cadastre seu primeiro aluno</h3><p>Coloque o nome, o WhatsApp, os dias de aula e a mensalidade. O Fluid cria as cobranças todo mês e avisa quando alguém atrasar.</p><button class="btn primary" data-h="stu-new">${IC.plus}Cadastrar aluno</button></div>`
        : !list.length ? `<div class="hb-empty"><p>Nenhum aluno com esse filtro.</p></div>`
        : `<div class="hb-list">${list.map(s => { const ps = studentPayState(s); return `<button class="hb-row" data-h="stu" data-id="${s.id}">
          ${avatar(s.name, colorFor(s.id,s.color))}
          <span class="hb-rmain"><b>${esc(s.name)}</b><small>${esc(scheduleText(s))}${Number(s.fee)?' · '+brl(s.fee)+'/mês':''}</small></span>
          <span class="hb-rside">${s.status==='paused' ? pill('muted','Pausado') : ps==='late' ? pill('late') : ps==='soon' ? pill('soon') : pill('paid','Em dia')}${s.notebook_id ? `<small class="hb-hasnb">${IC.folder}pasta</small>` : ''}</span>
        </button>`; }).join('')}</div>`}`;
  }
  function viewStudent(v){
    const s = studentById(v.id); if (!s) return `<div class="hb-empty"><p>Aluno não encontrado.</p></div>`;
    const color = colorFor(s.id, s.color), nb = s.notebook_id && W().notebooks().find(n => n.id===s.notebook_id);
    const pays = st.payments.filter(p => p.student_id===s.id).sort((a,b)=>b.due_date.localeCompare(a.due_date));
    const owed = pays.filter(p => !p.paid_at && payStatus(p)==='late').reduce((a,p)=>a+(Number(p.amount)||0),0);
    const paidYear = pays.filter(p => p.paid_at && p.paid_at.slice(0,4)===today().slice(0,4)).reduce((a,p)=>a+(Number(p.amount)||0),0);
    return `
      <section class="hb-hero" style="--c:${color}">
        ${avatar(s.name, color, 'xl')}
        <div><h2>${esc(s.name)}</h2><p>${esc(scheduleText(s))}</p>
          <div class="hb-hero-tags">${s.status==='paused' ? pill('muted','Pausado') : pill(studentPayState(s)==='late'?'late':studentPayState(s)==='soon'?'soon':'paid', studentPayState(s)==='ok'?'Em dia':'')}${owed ? `<span class="hb-pill bad">Deve ${brl(owed)}</span>` : ''}</div></div>
      </section>
      <div class="hb-actions">
        ${s.phone ? `<a class="btn hb-wa" href="https://wa.me/${phoneDigits(s.phone)}" target="_blank" rel="noopener">${IC.wa}WhatsApp</a>` : ''}
        <button class="btn" data-h="stu-edit" data-id="${s.id}">${IC.edit}Editar</button>
        <button class="btn" data-h="stu-pause" data-id="${s.id}">${s.status==='paused' ? IC.play+'Reativar' : IC.pause+'Pausar'}</button>
      </div>
      <div class="hb-cards2">
        <div class="hb-info" style="--c:#8B5CF6"><small>Mensalidade</small><b>${Number(s.fee) ? brl(s.fee) : 'Sem cobrança'}</b><span>${Number(s.fee) ? 'vence todo dia ' + s.due_day : 'Defina um valor para gerar cobranças'}</span></div>
        <div class="hb-info" style="--c:#22C55E"><small>Recebido em ${today().slice(0,4)}</small><b>${brl(paidYear)}</b><span>aluno desde ${fullDate(s.start_date)}</span></div>
      </div>
      <section class="hb-box">
        <div class="hb-sec-h"><h3>${IC.folder}Pasta do aluno</h3></div>
        ${nb ? `<p class="hb-hint">As músicas, aulas e treinos de ${esc(s.name.split(' ')[0])} ficam em <b>${esc(nb.name)}</b>.</p>
          <div class="hb-actions"><button class="btn primary" data-h="open-nb" data-id="${nb.id}">Abrir pasta</button><button class="btn" data-h="invite" data-id="${nb.id}" data-role="student" data-phone="${esc(s.phone||'')}">${IC.link}Convidar ${esc(s.name.split(' ')[0])}</button></div>`
        : `<p class="hb-hint">Crie uma pasta só para este aluno e convide ele. Vocês dois anotam músicas, aulas e lição de casa no mesmo lugar.</p>
          <button class="btn primary" data-h="stu-mknb" data-id="${s.id}">${IC.plus}Criar pasta de ${esc(s.name.split(' ')[0])}</button>`}
      </section>
      <section class="hb-box">
        <div class="hb-sec-h"><h3>${IC.cal}Pagamentos</h3><button class="btn sm" data-h="extra" data-id="${s.id}">${IC.plus}Cobrança avulsa</button></div>
        ${pays.length ? `<div class="hb-list tight">${pays.map(p => payRow(p, true)).join('')}</div>` : `<p class="hb-hint">${Number(s.fee) ? 'As cobranças aparecem aqui a partir do mês de início.' : 'Sem cobranças.'}</p>`}
      </section>
      ${s.notes ? `<section class="hb-box"><h3>Observações</h3><p class="hb-notes">${esc(s.notes)}</p></section>` : ''}`;
  }
  function viewStudentForm(v){
    const s = v.id ? studentById(v.id) : null, d = v.draft || {};
    const val = (k, def='') => esc(d[k] ?? (s ? s[k] ?? def : def));
    const days = d.lesson_days || (s ? s.lesson_days||[] : []);
    const color = d.color || (s && s.color) || COLORS[st.students.length % COLORS.length];
    return `<form class="hb-form" data-form="stu">
      <h2>${s ? 'Editar aluno' : 'Novo aluno'}</h2>
      <label class="hb-field"><span>Nome</span><input class="inp" name="name" required maxlength="80" value="${val('name')}" placeholder="Nome do aluno" ${s?'':'autofocus'}></label>
      <div class="hb-two">
        <label class="hb-field"><span>WhatsApp</span><input class="inp" name="phone" type="tel" inputmode="tel" value="${val('phone')}" placeholder="(15) 99999-9999"></label>
        <label class="hb-field"><span>E-mail</span><input class="inp" name="email" type="email" value="${val('email')}" placeholder="opcional"></label>
      </div>
      <div class="hb-field"><span>Dias de aula</span><div class="hb-days">${DAYS.map((n,i) => `<button type="button" data-h="sday" data-v="${i}" aria-pressed="${days.includes(i)}">${n}</button>`).join('')}</div><input type="hidden" name="lesson_days" value="${days.join(',')}"></div>
      <div class="hb-two">
        <label class="hb-field"><span>Horário</span><input class="inp" name="lesson_time" type="time" value="${val('lesson_time')}"></label>
        <label class="hb-field"><span>Início</span><input class="inp" name="start_date" type="date" value="${val('start_date', today())}"></label>
      </div>
      <div class="hb-two">
        <label class="hb-field"><span>Mensalidade (R$)</span><input class="inp" name="fee" type="number" min="0" step="0.01" inputmode="decimal" value="${val('fee', '')}" placeholder="0,00"></label>
        <label class="hb-field"><span>Vence todo dia</span><select class="inp" name="due_day">${Array.from({length:28},(_,i)=>i+1).map(n => `<option ${String(d.due_day ?? (s ? s.due_day : 10))===String(n)?'selected':''}>${n}</option>`).join('')}</select></label>
      </div>
      <div class="hb-field"><span>Cor</span><div class="hb-colors">${COLORS.map(c => `<button type="button" data-h="scolor" data-v="${c}" style="--c:${c}" aria-pressed="${c===color}" aria-label="Cor ${c}"></button>`).join('')}</div><input type="hidden" name="color" value="${color}"></div>
      <label class="hb-field"><span>Observações</span><textarea class="inp" name="notes" rows="3" placeholder="Nível, objetivos, combinados…">${val('notes')}</textarea></label>
      ${s ? '' : `<label class="hb-check"><input type="checkbox" name="mknb" checked> Criar uma pasta para este aluno</label>`}
      <div class="hb-form-act"><button class="btn primary" type="submit">${s ? 'Salvar' : 'Cadastrar aluno'}</button><button class="btn ghost" type="button" data-h="back">Cancelar</button></div>
      ${s ? `<div class="hb-danger"><p>Excluir o aluno apaga o histórico de pagamentos dele. A pasta continua existindo.</p><button class="btn ghost danger sm" type="button" data-h="stu-del" data-id="${s.id}">${v.armed ? 'Toque de novo para excluir' : 'Excluir aluno'}</button></div>` : ''}
    </form>`;
  }

  /* ================= FINANCEIRO ================= */
  function payRow(p, inStudent){
    const s = studentById(p.student_id); if (!s) return '';
    const k = p.virtual ? 'plan' : payStatus(p), color = colorFor(s.id, s.color);
    const label = p.description || (p.period && /^\d{4}-\d{2}$/.test(p.period) ? 'Mensalidade de ' + MONTHS[+p.period.slice(5)-1] : 'Cobrança');
    const open = st.payOpen === p.id;
    return `<div class="hb-pay ${k}${open?' open':''}" style="--c:${color}">
      <button class="hb-pay-main" ${inStudent ? 'tabindex="-1"' : `data-h="stu" data-id="${s.id}"`}>${avatar(s.name, color, 'sm')}
        <span class="hb-rmain"><b>${esc(inStudent ? label : s.name)}</b><small>${inStudent ? '' : esc(label) + ' · '}${p.virtual ? 'vence ' + shortDate(p.due_date) : esc(dueLabel(p))}${p.paid_at && p.method ? ' · ' + esc(METHOD_LABEL(p.method)) : ''}</small></span>
        <span class="hb-amt">${brl(p.amount)}</span></button>
      ${p.virtual ? '' : `<div class="hb-pay-act">${pill(k)}
        ${p.paid_at ? `<button class="btn ghost sm" data-h="unpay" data-id="${p.id}">Desfazer</button><button class="btn sm" data-h="card" data-id="${p.id}">${IC.receipt}Recibo</button>`
          : `<button class="hb-icon sm" data-h="payedit" data-id="${p.id}" aria-label="Editar cobrança">${IC.edit}</button><button class="btn sm hb-wa" data-h="card" data-id="${p.id}">${IC.wa}${k==='late'?'Cobrar':'Lembrar'}</button><button class="btn sm primary" data-h="payopen" data-id="${p.id}">${IC.check}Recebi</button>`}</div>
        ${open ? `<div class="hb-methods"><span>Recebido como?</span>${METHODS.map(([k2,l]) => `<button class="hb-chip" data-h="pay" data-id="${p.id}" data-v="${k2}">${l}</button>`).join('')}<button class="hb-icon sm" data-h="payopen" data-id="" aria-label="Cancelar">${IC.close}</button></div>` : ''}`}
    </div>`;
  }
  function chargeText(p, s){
    const tpl = (st.settings.charge_msg || '').trim() || 'Oi {nome}! Tudo bem? Passando para lembrar da {descricao} das aulas de violão, no valor de {valor}, {vencimento}.{pix} Obrigado!';
    const late = payStatus(p)==='late';
    const desc = p.description || (/^\d{4}-\d{2}$/.test(p.period) ? 'mensalidade de ' + MONTHS[+p.period.slice(5)-1] : 'cobrança');
    return tpl.replace(/\{nome\}/g, s.name.split(' ')[0]).replace(/\{valor\}/g, brl(p.amount)).replace(/\{descricao\}/g, desc)
      .replace(/\{vencimento\}/g, (late ? 'que venceu em ' : 'com vencimento em ') + fullDate(p.due_date))
      .replace(/\{pix\}/g, st.settings.pix_key ? ' Chave Pix: ' + st.settings.pix_key + '.' : '');
  }
  function monthRows(ym){
    const rows = st.payments.filter(p => ymOf(p.due_date) === ym);
    if (ym > ymOf(today())){ // meses futuros: mostra o previsto pelas mensalidades
      st.students.filter(s => s.status==='active' && Number(s.fee) > 0 && ymOf(s.start_date||today()) <= ym).forEach(s => {
        if (!rows.some(p => p.student_id===s.id && p.period===ym)) rows.push({ id:'v-'+s.id, virtual:true, student_id:s.id, period:ym, due_date: ym+'-'+pad(Math.min(s.due_day||10, dim(ym))), amount:s.fee });
      });
    }
    return rows.sort((a,b) => a.due_date.localeCompare(b.due_date));
  }
  /* ---------- período (filtro de datas) ---------- */
  function rangeOf(){
    const r = st.range, t = today(), cm = ymOf(t);
    if (r.preset==='month') return { from: cm+'-01', to: cm+'-'+pad(dim(cm)), label: monthName(cm) };
    if (r.preset==='last'){ const m = addMonths(cm,-1); return { from: m+'-01', to: m+'-'+pad(dim(m)), label: monthName(m) }; }
    if (r.preset==='3m'){ const m = addMonths(cm,-2); return { from: m+'-01', to: cm+'-'+pad(dim(cm)), label: 'Últimos 3 meses' }; }
    if (r.preset==='year'){ const y = t.slice(0,4); return { from: y+'-01-01', to: y+'-12-31', label: 'Ano de ' + y }; }
    const from = r.from || cm+'-01', to = r.to || t;
    return { from, to, label: fullDate(from) + ' a ' + fullDate(to) };
  }
  const inRange = (d, R) => d && d >= R.from && d <= R.to;
  const sumOf = list => list.reduce((a,p)=>a+(Number(p.amount)||0),0);
  function upcoming(days){ // próximas mensalidades, inclusive as que ainda não foram geradas
    const t = today(), end = isoOf(new Date(parse(t).getTime() + days*864e5)), out = [];
    st.payments.filter(p => !p.paid_at && p.due_date >= t && p.due_date <= end).forEach(p => out.push(p));
    for (let k = 0; k <= 2; k++){ const ym = addMonths(ymOf(t), k);
      st.students.filter(s => s.status==='active' && Number(s.fee) > 0 && ymOf(s.start_date||t) <= ym).forEach(s => {
        const due = ym+'-'+pad(Math.min(s.due_day||10, dim(ym)));
        if (due < t || due > end || st.payments.some(p => p.student_id===s.id && p.period===ym)) return;
        out.push({ id:'v-'+s.id+'-'+ym, virtual:true, student_id:s.id, period:ym, due_date:due, amount:s.fee });
      }); }
    return out.sort((a,b)=>a.due_date.localeCompare(b.due_date));
  }

  function viewFinance(){
    if (!st.students.length) return `<div class="hb-empty big"><h3>Seu financeiro começa pelos alunos</h3><p>Cadastre os alunos com a mensalidade e o dia do vencimento. As cobranças aparecem aqui sozinhas todo mês, com alerta de atraso, lembrete com capinha para o WhatsApp e recibo.</p><button class="btn primary" data-h="stu-new">${IC.plus}Cadastrar aluno</button></div>`;
    const tabs = [['geral','Geral'],['cobrancas','Cobranças'],['historico','Histórico'],['mapa','Quem pagou']];
    const sub = { geral: finOverview, cobrancas: finCharges, historico: finHistory, mapa: finMap }[st.finTab]();
    return `<div class="hb-subtabs" role="tablist">${tabs.map(([k,l]) => `<button role="tab" data-h="fintab" data-v="${k}" aria-selected="${st.finTab===k}">${l}</button>`).join('')}</div>${sub}`;
  }
  function rangeBar(){
    const R = rangeOf(), r = st.range;
    return `<div class="hb-range"><div class="hb-chips">${[['month','Este mês'],['last','Mês passado'],['3m','3 meses'],['year','Este ano'],['custom','Escolher datas']].map(([k,l]) => `<button class="hb-chip${r.preset===k?' on':''}" data-h="range" data-v="${k}">${l}</button>`).join('')}</div>
      ${r.preset==='custom' ? `<div class="hb-two dates"><label class="hb-field"><span>De</span><input class="inp" type="date" data-in="rfrom" value="${R.from}"></label><label class="hb-field"><span>Até</span><input class="inp" type="date" data-in="rto" value="${R.to}"></label></div>` : ''}
      <p class="hb-hint">${IC.cal}<span>${esc(R.label)}</span></p></div>`;
  }
  function finOverview(){
    const R = rangeOf(), t = today();
    const due = st.payments.filter(p => inRange(p.due_date, R));
    const paidIn = st.payments.filter(p => inRange(p.paid_at, R));
    const received = sumOf(paidIn), lateR = sumOf(due.filter(p => payStatus(p)==='late')), openR = sumOf(due.filter(p => !p.paid_at && payStatus(p)!=='late'));
    const expected = sumOf(due), paidDue = due.filter(p => p.paid_at), onTime = paidDue.filter(p => p.paid_at <= p.due_date).length;
    const punct = paidDue.length ? Math.round(onTime / paidDue.length * 100) : null;
    const pct = v => expected ? Math.min(100, Math.max(0, v/expected*100)) : 0;
    const allLate = st.payments.filter(p => payStatus(p)==='late').sort((a,b)=>a.due_date.localeCompare(b.due_date));
    const todayDue = st.payments.filter(p => !p.paid_at && p.due_date === t);
    const week = upcoming(7).filter(p => p.due_date > t);
    const noPhone = st.students.filter(s => s.status==='active' && !s.phone);
    const paidToday = st.payments.filter(p => p.paid_at === t);
    const next = upcoming(30);
    const hist = Array.from({length:6}, (_,i) => addMonths(ymOf(t), i-5)).map(m => { const r = st.payments.filter(p => ymOf(p.due_date)===m); return { m, exp: sumOf(r), got: sumOf(r.filter(p=>p.paid_at)) }; });
    const max = Math.max(1, ...hist.map(h => h.exp));
    const alerts = [
      allLate.length && `<button class="hb-note bad" data-h="go-late">${IC.alert}<span><b>${allLate.length} ${allLate.length===1?'mensalidade atrasada':'mensalidades atrasadas'}</b><small>${brl(sumOf(allLate))} em aberto · toque para cobrar</small></span></button>`,
      todayDue.length && `<button class="hb-note warn" data-h="go-charges">${IC.bell}<span><b>${todayDue.length} ${todayDue.length===1?'vence hoje':'vencem hoje'}</b><small>${todayDue.map(p => esc(studentById(p.student_id)?.name.split(' ')[0]||'')).join(', ')}</small></span></button>`,
      week.length && `<button class="hb-note info" data-h="go-next">${IC.cal}<span><b>${week.length} nos próximos 7 dias</b><small>${brl(sumOf(week))} previstos · mande um lembrete</small></span></button>`,
      paidToday.length && `<div class="hb-note ok">${IC.check}<span><b>${paidToday.length} ${paidToday.length===1?'pagamento recebido':'pagamentos recebidos'} hoje</b><small>${brl(sumOf(paidToday))}</small></span></div>`,
      noPhone.length && `<button class="hb-note muted" data-h="stu" data-id="${noPhone[0].id}">${IC.wa}<span><b>${noPhone.length} ${noPhone.length===1?'aluno sem WhatsApp':'alunos sem WhatsApp'}</b><small>Cadastre para mandar lembretes · ${noPhone.slice(0,3).map(s=>esc(s.name.split(' ')[0])).join(', ')}</small></span></button>`,
    ].filter(Boolean);
    return `${rangeBar()}
      <div class="hb-stats fin">
        <div class="hb-stat" style="--c:#22C55E"><small>Recebido</small><b>${brl(received)}</b><i>${paidIn.length} ${paidIn.length===1?'pagamento':'pagamentos'}</i></div>
        <div class="hb-stat" style="--c:#6366F1"><small>A receber</small><b>${brl(openR)}</b><i>no período</i></div>
        <div class="hb-stat" style="--c:#EF4444"><small>Atrasado</small><b>${brl(lateR)}</b><i>no período</i></div>
        <div class="hb-stat" style="--c:#8B5CF6"><small>Pontualidade</small><b>${punct===null ? '—' : punct+'%'}</b><i>pagos até o vencimento</i></div>
      </div>
      <div class="hb-bar" aria-label="Recebido ${Math.round(pct(sumOf(paidDue)))}% do previsto"><i class="ok" style="width:${pct(sumOf(paidDue))}%"></i><i class="bad" style="width:${pct(lateR)}%"></i><i class="info" style="width:${pct(openR)}%"></i></div>
      <p class="hb-hint center">${expected ? `${brl(sumOf(paidDue))} de ${brl(expected)} previstos no período (${Math.round(pct(sumOf(paidDue)))}%)` : 'Nenhuma cobrança com vencimento no período'}</p>
      <section class="hb-box"><div class="hb-sec-h"><h3>${IC.bell}Avisos</h3></div>${alerts.length ? `<div class="hb-notes-list">${alerts.join('')}</div>` : `<p class="hb-hint">Tudo em dia. Nenhum aviso agora.</p>`}</section>
      <section class="hb-box" id="hb-next"><div class="hb-sec-h"><h3>${IC.cal}Próximas mensalidades</h3><small class="hb-muted">30 dias · ${brl(sumOf(next))}</small></div>
        ${next.length ? `<div class="hb-timeline">${next.map(p => { const s = studentById(p.student_id); if (!s) return ''; const d = daysBetween(t, p.due_date); return `<div class="hb-tl" style="--c:${colorFor(s.id,s.color)}"><span class="hb-tl-date"><b>${parse(p.due_date).getDate()}</b><small>${MON[parse(p.due_date).getMonth()]}</small></span>
          <span class="hb-rmain"><b>${esc(s.name)}</b><small>${d===0?'hoje':d===1?'amanhã':'em '+d+' dias'}${p.virtual?' · ainda não gerada':''}</small></span><span class="hb-amt">${brl(p.amount)}</span>
          ${p.virtual ? '' : `<button class="hb-icon sm wa" data-h="card" data-id="${p.id}" aria-label="Mandar lembrete para ${esc(s.name)}">${IC.wa}</button>`}</div>`; }).join('')}</div>` : `<p class="hb-hint">Nada vence nos próximos 30 dias.</p>`}
      </section>
      <section class="hb-box"><h3>Últimos 6 meses</h3>
        <div class="hb-chart">${hist.map(h => `<div class="hb-col" title="${monthName(h.m)}: recebido ${brl(h.got)} de ${brl(h.exp)}"><b class="hb-colv">${h.got ? brl(h.got).replace(',00','').replace('R$','').trim() : ''}</b><div class="hb-bars"><i class="exp" style="height:${h.exp/max*100}%"></i><i class="got" style="height:${h.got/max*100}%"></i></div><small>${MON[+h.m.slice(5)-1]}</small></div>`).join('')}</div>
        <div class="hb-legend"><span><i class="got"></i>Recebido</span><span><i class="exp"></i>Cobrado</span></div>
      </section>
      <div class="hb-tool"><button class="btn sm" data-h="extra">${IC.plus}Cobrança avulsa</button><button class="btn sm" data-h="settings">${IC.gear}Ajustes de cobrança</button></div>`;
  }
  function finCharges(){
    const ym = st.month, rows = monthRows(ym);
    const paid = sumOf(rows.filter(p => p.paid_at)), late = sumOf(rows.filter(p => !p.virtual && payStatus(p)==='late')), total = sumOf(rows), toGet = total - paid - late;
    const allLate = st.payments.filter(p => payStatus(p)==='late').sort((a,b)=>a.due_date.localeCompare(b.due_date));
    const soon = rows.filter(p => !p.virtual && payStatus(p)==='soon'), open = rows.filter(p => p.virtual || payStatus(p)==='open'), paidRows = rows.filter(p => p.paid_at);
    const pct = v => total ? Math.max(0, v/total*100) : 0;
    const group = (title, list, cls) => list.length ? `<section class="hb-group ${cls}"><h3><span></span>${title}<small>${list.length} · ${brl(sumOf(list))}</small></h3><div class="hb-list tight">${list.map(p => payRow(p)).join('')}</div></section>` : '';
    return `
      <div class="hb-month"><button class="hb-icon" data-h="month" data-v="-1" aria-label="Mês anterior">${IC.left}</button><b>${monthName(ym)}</b><button class="hb-icon" data-h="month" data-v="1" aria-label="Próximo mês">${IC.right}</button></div>
      <div class="hb-mini"><span class="ok"><small>Recebido</small><b>${brl(paid)}</b></span><span class="info"><small>${ym > ymOf(today()) ? 'Previsto' : 'A receber'}</small><b>${brl(toGet)}</b></span><span class="bad"><small>Atrasado</small><b>${brl(late)}</b></span></div>
      <div class="hb-bar"><i class="ok" style="width:${pct(paid)}%"></i><i class="bad" style="width:${pct(late)}%"></i><i class="info" style="width:${pct(toGet)}%"></i></div>
      ${allLate.length ? `<div id="hb-late">${group('Atrasadas (todos os meses)', allLate, 'bad')}</div>` : ''}
      ${group('Vencem nos próximos dias', soon, 'warn')}
      ${group(ym > ymOf(today()) ? 'Previstas' : 'A vencer', open, 'info')}
      ${group('Pagas', paidRows, 'ok')}
      ${!rows.length && !allLate.length ? `<div class="hb-empty"><p>Nenhuma cobrança em ${monthName(ym)}.</p></div>` : ''}
      <div class="hb-tool"><button class="btn sm" data-h="extra">${IC.plus}Cobrança avulsa</button></div>`;
  }
  function finHistory(){
    const R = rangeOf(), q = st.hq.trim().toLowerCase();
    const list = st.payments.filter(p => inRange(p.paid_at, R) && p.method!=='isento' && (!q || (studentById(p.student_id)?.name||'').toLowerCase().includes(q))).sort((a,b)=>b.paid_at.localeCompare(a.paid_at));
    const byMethod = METHODS.map(([k,l]) => [l, sumOf(list.filter(p => p.method===k))]).filter(x => x[1]);
    const byMonth = {}; list.forEach(p => (byMonth[ymOf(p.paid_at)] ||= []).push(p));
    return `${rangeBar()}
      <div class="hb-tool"><input class="inp hb-search" type="search" placeholder="Filtrar por aluno" value="${esc(st.hq)}" data-in="hq" aria-label="Filtrar histórico por aluno"><button class="btn sm" data-h="csv">${IC.down}Exportar</button></div>
      <div class="hb-total"><span><small>Total recebido</small><b>${brl(sumOf(list))}</b></span><span><small>Pagamentos</small><b>${list.length}</b></span></div>
      ${byMethod.length ? `<div class="hb-methods-sum">${byMethod.map(([l,v]) => `<span><small>${l}</small><b>${brl(v)}</b></span>`).join('')}</div>` : ''}
      ${list.length ? Object.keys(byMonth).sort().reverse().map(m => `<section class="hb-group ok"><h3><span></span>${monthName(m)}<small>${byMonth[m].length} · ${brl(sumOf(byMonth[m]))}</small></h3><div class="hb-list tight">${byMonth[m].map(p => payRow(p)).join('')}</div></section>`).join('')
        : `<div class="hb-empty"><p>Nenhum pagamento recebido nesse período.</p></div>`}`;
  }
  function finMap(){
    const t = today(), months = Array.from({length:6}, (_,i) => addMonths(ymOf(t), i-5));
    const studs = st.students.filter(s => s.status==='active' || st.payments.some(p => p.student_id===s.id && months.includes(p.period)));
    const cell = (s, m) => {
      const p = st.payments.find(x => x.student_id===s.id && x.period===m);
      if (!p) return `<span class="hb-cell none" title="${monthName(m)}: sem cobrança">·</span>`;
      const k = payStatus(p);
      return `<button class="hb-cell ${k}" data-h="cell" data-id="${p.id}" title="${esc(s.name)} · ${monthName(m)}: ${STATUS[k][0]} · ${brl(p.amount)}">${k==='paid' ? IC.check : k==='late' ? '!' : ''}</button>`;
    };
    return `<p class="hb-hint">Cada quadradinho é uma mensalidade. Toque para cobrar, mandar recibo ou marcar como paga.</p>
      <div class="hb-map"><div class="hb-map-row head"><span></span>${months.map(m => `<small>${MON[+m.slice(5)-1]}</small>`).join('')}</div>
      ${studs.map(s => `<div class="hb-map-row"><button class="hb-map-name" data-h="stu" data-id="${s.id}">${avatar(s.name, colorFor(s.id,s.color), 'sm')}<span>${esc(s.name.split(' ')[0])}</span></button>${months.map(m => cell(s, m)).join('')}</div>`).join('')}</div>
      <div class="hb-legend wrap"><span><i class="c paid"></i>Pago</span><span><i class="c late"></i>Atrasado</span><span><i class="c soon"></i>Vence logo</span><span><i class="c open"></i>A vencer</span><span><i class="c none"></i>Sem cobrança</span></div>`;
  }

  /* ---------- capinha (imagem) para lembrete e recibo ---------- */
  const F1 = 'M40.6 27H67.2Q70.6 27 70.6 30.4V34.4Q70.6 39.6 65.4 39.6H33.2Q30.6 39.6 32.2 37.6L38.4 28.6Q39.3 27 40.6 27Z';
  const F2 = 'M50.2 45.6H61.2Q64.6 45.6 64.6 49V53.6Q64.6 57.2 61 57.2H50.6Q48.4 57.2 47 59L40.6 67Q38.8 69.2 36 69.2H34Q31 69.2 31 66.4V61Q31 58.2 34 58.2H36.4Q38.6 58.2 39.8 56.7L46.8 47.4Q48.1 45.6 50.2 45.6Z';
  function rr(c, x, y, w, h, r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
  function blob(c, x, y, r, col, a){ const g = c.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)'); c.globalAlpha = a; c.fillStyle = g; c.fillRect(x-r,y-r,r*2,r*2); c.globalAlpha = 1; }
  function fitText(c, text, max, size, weight, family){ let s = size; do { c.font = `${weight} ${s}px ${family}`; s -= 2; } while (c.measureText(text).width > max && s > 20); return c.font; }
  async function drawCard(p){
    const s = studentById(p.student_id), receipt = !!p.paid_at, k = payStatus(p);
    const W_ = window.FluidWeb, W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    try { await document.fonts.ready; } catch(e){}
    const FD = '"Sora", "Instrument Sans", system-ui, sans-serif', FB = '"Instrument Sans", system-ui, sans-serif';
    const accent = receipt ? '#16A34A' : k==='late' ? '#E11D48' : '#7C3AED';
    // fundo
    const bg = c.createLinearGradient(0,0,0,H); bg.addColorStop(0,'#F8F8FD'); bg.addColorStop(1,'#EEF0FA'); c.fillStyle = bg; c.fillRect(0,0,W,H);
    blob(c, 120, 140, 520, '#5EEAC0', .55); blob(c, 980, 260, 520, '#C4B5FD', .6); blob(c, 900, 1260, 600, '#F9A8D4', .55); blob(c, 140, 1200, 500, '#A5F3FC', .5);
    // cartão de vidro
    c.save(); c.shadowColor = 'rgba(60,50,140,.16)'; c.shadowBlur = 60; c.shadowOffsetY = 24; rr(c, 80, 90, W-160, H-180, 64); c.fillStyle = 'rgba(255,255,255,.62)'; c.fill(); c.restore();
    rr(c, 80, 90, W-160, H-180, 64); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.9)'; c.stroke();
    // logo F
    const L = 92, lx = 150, ly = 165;
    rr(c, lx, ly, L, L, 28); const lg = c.createLinearGradient(lx, ly, lx+L, ly+L); lg.addColorStop(0,'rgba(255,255,255,.95)'); lg.addColorStop(1,'rgba(237,233,254,.9)'); c.fillStyle = lg; c.fill();
    rr(c, lx, ly, L, L, 28); const lb = c.createLinearGradient(lx, ly, lx+L, ly); lb.addColorStop(0,'#34E0BE'); lb.addColorStop(.5,'#8B5CF6'); lb.addColorStop(1,'#F43F7E'); c.strokeStyle = lb; c.lineWidth = 3; c.stroke();
    c.save(); c.translate(lx, ly); c.scale(L/100, L/100); const fg = c.createLinearGradient(30,62,72,30); fg.addColorStop(0,'#1FC8A8'); fg.addColorStop(.5,'#9A5BE6'); fg.addColorStop(1,'#E5245E'); c.fillStyle = fg; c.fill(new Path2D(F1)); c.fill(new Path2D(F2)); c.restore();
    c.fillStyle = '#12131C'; c.font = `500 52px "Quicksand", ${FD}`; c.textBaseline = 'middle'; c.fillText('Fluid', lx + L + 26, ly + L/2 + 2);
    // selo
    const tag = receipt ? 'RECIBO DE PAGAMENTO' : k==='late' ? 'MENSALIDADE EM ABERTO' : 'LEMBRETE DE MENSALIDADE';
    c.font = `700 26px ${FB}`; const tw = c.measureText(tag).width + 52; const ty = 340;
    rr(c, 150, ty, tw, 56, 28); c.fillStyle = accent + '1F'; c.fill(); c.fillStyle = accent; c.textBaseline = 'middle'; c.fillText(tag, 176, ty + 29);
    // aluno e descrição
    const desc = p.description || (/^\d{4}-\d{2}$/.test(p.period) ? 'Mensalidade de ' + MONTHS[+p.period.slice(5)-1] + ' de ' + p.period.slice(0,4) : 'Cobrança');
    c.textBaseline = 'alphabetic'; c.fillStyle = '#12131C'; c.font = fitText(c, s.name, W-300, 72, 600, FD); c.fillText(s.name, 150, 500);
    c.fillStyle = '#5B6075'; c.font = `400 38px ${FB}`; c.fillText(desc, 150, 560);
    // valor
    c.fillStyle = '#12131C'; c.font = fitText(c, brl(p.amount), W-300, 150, 700, FD); c.fillText(brl(p.amount), 146, 740);
    // linha
    c.fillStyle = 'rgba(20,22,60,.08)'; c.fillRect(150, 810, W-300, 2);
    // detalhes
    const rows = receipt
      ? [['Pago em', fullDate(p.paid_at)], ['Forma', (METHODS.find(m=>m[0]===p.method)||[,'—'])[1]], ['Vencimento', fullDate(p.due_date)]]
      : [['Vencimento', fullDate(p.due_date) + (k==='late' ? '  ·  em atraso' : '')], st.settings.pix_key ? ['Chave Pix', st.settings.pix_key] : null, ['Aulas', scheduleText(s)]].filter(Boolean);
    rows.forEach(([a,b], i) => { const y = 890 + i*92; c.fillStyle = '#7A7F95'; c.font = `500 30px ${FB}`; c.fillText(a, 150, y); c.fillStyle = (a==='Vencimento' && k==='late' && !receipt) ? '#E11D48' : '#12131C'; c.font = fitText(c, b, W-560, 36, 600, FB); c.textAlign = 'right'; c.fillText(b, W-150, y); c.textAlign = 'left'; });
    // rodapé
    c.fillStyle = '#7A7F95'; c.font = `500 28px ${FB}`; c.fillText('Prof. ' + (W_ && W_.me ? W_.me().name : ''), 150, H-170);
    c.fillStyle = '#A0A4B8'; c.font = `400 26px ${FB}`; c.fillText(receipt ? 'Obrigado pela pontualidade!' : 'Aulas de violão · enviado pelo Fluid', 150, H-128);
    return new Promise(res => cv.toBlob(b => res({ blob: b, url: URL.createObjectURL(b) }), 'image/png'));
  }
  function receiptText(p, s){
    const desc = p.description || (/^\d{4}-\d{2}$/.test(p.period) ? 'mensalidade de ' + MONTHS[+p.period.slice(5)-1] : 'cobrança');
    return `Oi ${s.name.split(' ')[0]}! Recebi o pagamento da ${desc}, no valor de ${brl(p.amount)}, em ${fullDate(p.paid_at)}. Obrigado!`;
  }
  function viewCard(v){
    const p = st.payments.find(x => x.id===v.id); if (!p) return `<div class="hb-empty"><p>Cobrança não encontrada.</p></div>`;
    const s = studentById(p.student_id), receipt = !!p.paid_at;
    if (v.text === undefined) v.text = receipt ? receiptText(p, s) : chargeText(p, s);
    if (!v.img && !v.loading){ v.loading = true; drawCard(p).then(r => { v.img = r.url; v.blob = r.blob; v.loading = false; draw(); }); }
    const canFiles = !!(navigator.canShare && v.blob && navigator.canShare({ files:[new File([v.blob], 'fluid.png', { type:'image/png' })] }));
    return `<div class="hb-form">
      <h2>${receipt ? 'Recibo para ' : (payStatus(p)==='late' ? 'Cobrar ' : 'Lembrete para ')}${esc(s.name.split(' ')[0])}</h2>
      <div class="hb-cardprev">${v.img ? `<img src="${v.img}" alt="Capinha do Fluid com ${receipt?'o recibo':'o lembrete'} de ${esc(s.name)}">` : '<div class="hb-cardload">Montando a capinha…</div>'}</div>
      <label class="hb-field"><span>Mensagem</span><textarea class="inp" rows="4" data-in="ctext">${esc(v.text)}</textarea></label>
      <div class="hb-share col">
        ${canFiles ? `<button class="btn hb-wa" data-h="share-card">${IC.share}Enviar capinha + mensagem</button>` : ''}
        ${s.phone ? `<a class="btn ${canFiles?'':'hb-wa'}" href="https://wa.me/${phoneDigits(s.phone)}?text=${encodeURIComponent(v.text)}" target="_blank" rel="noopener">${IC.wa}Só a mensagem no WhatsApp</a>` : `<p class="hb-hint">${esc(s.name.split(' ')[0])} não tem WhatsApp cadastrado. <button class="linkish" data-h="stu-edit" data-id="${s.id}">Cadastrar</button></p>`}
        ${v.img ? `<a class="btn" href="${v.img}" download="fluid-${receipt?'recibo':'lembrete'}-${esc(s.name.split(' ')[0].toLowerCase())}-${p.due_date}.png">${IC.down}Baixar capinha</a>` : ''}
      </div>
      <p class="hb-hint">${canFiles ? 'No celular, escolha o WhatsApp e o contato: a capinha vai junto com a mensagem.' : 'Baixe a capinha e anexe no WhatsApp, ou mande só a mensagem.'}</p>
    </div>`;
  }
  function viewPayEdit(v){
    const p = st.payments.find(x => x.id===v.id); if (!p) return '';
    const s = studentById(p.student_id);
    return `<form class="hb-form" data-form="payedit"><h2>Editar cobrança</h2><p class="hb-hint">${esc(s.name)}</p>
      <label class="hb-field"><span>Descrição</span><input class="inp" name="description" maxlength="80" value="${esc(p.description||'')}" placeholder="${/^\d{4}-\d{2}$/.test(p.period) ? 'Mensalidade de ' + MONTHS[+p.period.slice(5)-1] : ''}"></label>
      <div class="hb-two"><label class="hb-field"><span>Valor (R$)</span><input class="inp" name="amount" type="number" min="0" step="0.01" inputmode="decimal" value="${Number(p.amount)}"><small>Dê desconto ou ajuste o valor só desta cobrança.</small></label>
        <label class="hb-field"><span>Vencimento</span><input class="inp" name="due_date" type="date" value="${p.due_date}"></label></div>
      <div class="hb-form-act"><button class="btn primary" type="submit">Salvar</button><button class="btn ghost" type="button" data-h="back">Cancelar</button></div>
      <div class="hb-danger"><p>Excluir tira esta cobrança do financeiro (por exemplo, mês de férias). ${/^\d{4}-\d{2}$/.test(p.period) ? 'Ela não volta a ser gerada.' : ''}</p><button class="btn ghost danger sm" type="button" data-h="paydel" data-id="${p.id}">${v.armed ? 'Toque de novo para excluir' : 'Excluir cobrança'}</button></div></form>`;
  }
  function viewExtra(v){
    const act = st.students.filter(s => s.status==='active' || s.id===v.id);
    return `<form class="hb-form" data-form="extra"><h2>Cobrança avulsa</h2>
      <p class="hb-hint">Para aula extra, material, apresentação ou qualquer valor fora da mensalidade.</p>
      <label class="hb-field"><span>Aluno</span><select class="inp" name="student" required>${act.map(s => `<option value="${s.id}" ${s.id===v.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label>
      <label class="hb-field"><span>Descrição</span><input class="inp" name="description" required maxlength="80" placeholder="Ex.: Aula extra de sábado" autofocus></label>
      <div class="hb-two"><label class="hb-field"><span>Valor (R$)</span><input class="inp" name="amount" type="number" min="0" step="0.01" inputmode="decimal" required></label>
        <label class="hb-field"><span>Vencimento</span><input class="inp" name="due_date" type="date" required value="${today()}"></label></div>
      <div class="hb-form-act"><button class="btn primary" type="submit">Criar cobrança</button><button class="btn ghost" type="button" data-h="back">Cancelar</button></div></form>`;
  }
  function viewSettings(){
    const s = st.settings;
    return `<form class="hb-form" data-form="settings"><h2>Ajustes de cobrança</h2>
      <label class="hb-field"><span>Chave Pix</span><input class="inp" name="pix_key" value="${esc(s.pix_key||'')}" placeholder="CPF, e-mail, telefone ou chave aleatória"><small>Vai junto na mensagem de cobrança.</small></label>
      <label class="hb-field"><span>Avisar quantos dias antes do vencimento</span><select class="inp" name="remind_days">${[0,1,2,3,5,7].map(n => `<option value="${n}" ${Number(s.remind_days??3)===n?'selected':''}>${n===0?'Só no dia':n+' '+(n===1?'dia':'dias')}</option>`).join('')}</select></label>
      <label class="hb-field"><span>Mensagem de cobrança</span><textarea class="inp" name="charge_msg" rows="4" placeholder="Oi {nome}! Passando para lembrar da {descricao}, no valor de {valor}, {vencimento}.{pix}">${esc(s.charge_msg||'')}</textarea>
        <small>Use {nome}, {valor}, {descricao}, {vencimento} e {pix}. Deixe em branco para usar a mensagem padrão.</small></label>
      <div class="hb-form-act"><button class="btn primary" type="submit">Salvar</button><button class="btn ghost" type="button" data-h="back">Cancelar</button></div></form>`;
  }

  /* ================= CONTA ================= */
  function viewAccount(){
    const me = W().me(), cur = W().current(), mem = st.members[cur.id] || [];
    return `
      <section class="hb-hero" style="--c:${colorFor(me.id)}">${avatar(me.name, colorFor(me.id), 'xl')}<div><h2>${esc(me.name)}</h2><p>${esc(me.email||'')}</p></div></section>
      <form class="hb-form plain" data-form="profile"><label class="hb-field"><span>Seu nome</span><input class="inp" name="name" maxlength="60" value="${esc(me.name)}"></label><div class="hb-form-act"><button class="btn sm" type="submit">Salvar nome</button></div></form>
      <section class="hb-box"><div class="hb-sec-h"><h3>Quem acessa a pasta aberta</h3></div>
        <p class="hb-hint">${esc(cur.name)}</p>
        <div class="hb-list tight">${mem.map(m => `<div class="hb-row static">${avatar(m.profiles?.name||'?', colorFor(m.user_id), 'sm')}<span class="hb-rmain"><b>${esc(m.profiles?.name||'Sem nome')}${m.user_id===me.id?' (você)':''}</b><small>${m.role==='owner'?'Dono da pasta':m.role==='teacher'?'Professor':'Aluno'}</small></span>
          ${cur.role==='owner' && m.role!=='owner' ? `<button class="btn ghost danger sm" data-h="rm-mem" data-id="${m.user_id}">${st.armRm===m.user_id ? 'Confirmar' : 'Remover'}</button>` : ''}
          ${m.user_id===me.id && m.role!=='owner' ? `<button class="btn ghost danger sm" data-h="leave">${st.armLeave ? 'Confirmar' : 'Sair da pasta'}</button>` : ''}</div>`).join('')}</div>
        ${cur.role==='owner' ? `<button class="btn" data-h="invite" data-id="${cur.id}">${IC.link}Convidar para esta pasta</button>` : ''}
      </section>
      <button class="btn ghost danger" data-h="signout">Sair da conta</button>`;
  }

  const VIEWS = { card: viewCard, payedit: viewPayEdit, nbform: viewFolderForm, invite: viewInvite, student: viewStudent, sform: viewStudentForm, extra: viewExtra, settings: viewSettings };

  /* ---------- ações ---------- */
  const go = (view) => { view.back = st.view; st.view = view; st.resetScroll = true; draw(); const b = root.querySelector('.hb-body'); if (b) b.scrollTop = 0; };
  async function run(fn){ if (st.busy) return; st.busy = true; try { await fn(); } catch(e){ say(W().errText(e)); } finally { st.busy = false; } }
  const must = r => { if (r && r.error) throw r.error; return r && r.data; };

  async function onClick(e){
    if (e.target === root){ close(); return; }
    const t = e.target.closest('[data-h],[data-tab]'); if (!t) return;
    if (t.dataset.tab){ st.tab = t.dataset.tab; st.view = null; st.resetScroll = true; draw(); return; }
    const h = t.dataset.h, id = t.dataset.id, v = t.dataset.v, sb = W().sb;
    if (t.tagName === 'BUTTON' && t.type !== 'submit') e.preventDefault();
    switch (h){
      case 'close': return close();
      case 'back': return back();
      case 'retry': st.loaded = false; draw(); await loadTeacher(); return draw();
      case 'open-nb': if (id === W().current().id) return close(); return W().switchTo(id);
      case 'nb-new': return go({ type:'nbform', kind:'personal' });
      case 'nb-edit': return go({ type:'nbform', id });
      case 'nbkind': st.view.kind = v; return draw();
      case 'nbcolor': case 'scolor': { root.querySelectorAll(`[data-h="${h}"]`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v===v))); const inp = root.querySelector('input[name="color"]'); if (inp) inp.value = v; if (st.view){ st.view.color = v; if (st.view.draft) st.view.draft.color = v; } return; }
      case 'nb-del': if (!st.view.armed){ st.view.armed = true; return draw(); }
        return run(async () => { must(await sb.rpc('delete_notebook', { nb: id })); if (id === W().current().id) return W().switchTo(firstOwned().id); await W().loadNotebooks(); await loadFolders(); st.view = null; say('Pasta apagada'); });
      case 'invite': return go({ type:'invite', id, role: t.dataset.role, phone: t.dataset.phone });
      case 'irole': st.view.role = v; st.view.link = ''; return draw();
      case 'gen-inv': return run(async () => {
        const n = W().notebooks().find(x => x.id===st.view.id) || W().current();
        const role = st.view.role || (n.kind==='student' ? 'student' : 'teacher');
        const d = must(await sb.from('invites').insert({ notebook_id: n.id, role }).select('token').single());
        st.view.role = role; st.view.link = location.origin + location.pathname + '?convite=' + d.token; draw(); });
      case 'copy': { const i = root.querySelector('#hb-link'); try { await navigator.clipboard.writeText(i.value); t.textContent = 'Copiado'; } catch(err){ i.select(); } return; }
      case 'share-inv': { const n = W().notebooks().find(x => x.id===st.view.id) || W().current(); try { await navigator.share({ title:'Convite para o Fluid', text: inviteText(st.view.role, n.name, st.view.link) }); } catch(err){} return; }
      case 'sfilter': st.filter = v; return draw();
      case 'stu': st.payOpen = null; return go({ type:'student', id });
      case 'stu-new': return go({ type:'sform', draft:{} });
      case 'stu-edit': return go({ type:'sform', id, draft:{} });
      case 'sday': { t.setAttribute('aria-pressed', String(t.getAttribute('aria-pressed')!=='true')); const days = [...root.querySelectorAll('[data-h="sday"][aria-pressed="true"]')].map(b => +b.dataset.v); root.querySelector('input[name="lesson_days"]').value = days.join(','); st.view.draft.lesson_days = days; return; }
      case 'stu-pause': return run(async () => { const s = studentById(id); const status = s.status==='paused' ? 'active' : 'paused'; must(await sb.from('students').update({ status }).eq('id', id)); s.status = status; if (status==='active') await ensureCharges(); updateBadge(); say(status==='paused' ? 'Aluno pausado. Não gera novas cobranças.' : 'Aluno reativado'); });
      case 'stu-del': if (!st.view.armed){ st.view.armed = true; return draw(); }
        return run(async () => { must(await sb.from('students').delete().eq('id', id)); st.students = st.students.filter(s => s.id!==id); st.payments = st.payments.filter(p => p.student_id!==id); st.view = null; st.tab = 'alunos'; updateBadge(); say('Aluno excluído'); });
      case 'stu-mknb': return run(async () => { const s = studentById(id); await makeStudentFolder(s); say('Pasta criada'); });
      case 'payopen': st.payOpen = id || null; return draw();
      case 'pay': return run(async () => { const p = st.payments.find(x => x.id===id); const upd = { paid_at: today(), method: v }; must(await sb.from('payments').update(upd).eq('id', id)); Object.assign(p, upd); st.payOpen = null; updateBadge(); say('Pagamento registrado ' + brl(p.amount)); });
      case 'unpay': return run(async () => { const p = st.payments.find(x => x.id===id); must(await sb.from('payments').update({ paid_at: null, method: null }).eq('id', id)); p.paid_at = null; p.method = null; updateBadge(); say('Pagamento desfeito'); });
      case 'month': st.month = addMonths(st.month, +v); return draw();
      case 'fintab': st.finTab = v; st.resetScroll = true; return draw();
      case 'range': st.range = v==='custom' ? { preset:'custom', from: rangeOf().from, to: rangeOf().to } : { preset:v }; return draw();
      case 'go-late': st.finTab = 'cobrancas'; draw(); setTimeout(() => { const el = root.querySelector('#hb-late'); el && el.scrollIntoView({ behavior:'smooth', block:'start' }); }, 50); return;
      case 'go-charges': st.finTab = 'cobrancas'; st.month = ymOf(today()); return draw();
      case 'go-next': { const el = root.querySelector('#hb-next'); el && el.scrollIntoView({ behavior:'smooth', block:'start' }); return; }
      case 'card': return go({ type:'card', id });
      case 'cell': { const p = st.payments.find(x => x.id===id); return go(p && p.paid_at ? { type:'card', id } : { type:'student', id: p.student_id }); }
      case 'share-card': { const vv = st.view; try { await navigator.share({ files:[new File([vv.blob], 'fluid.png', { type:'image/png' })], text: vv.text }); } catch(err){} return; }
      case 'payedit': return go({ type:'payedit', id });
      case 'paydel': if (!st.view.armed){ st.view.armed = true; return draw(); }
        return run(async () => { const p = st.payments.find(x => x.id===id);
          if (/^\d{4}-\d{2}$/.test(p.period)){ must(await sb.from('payments').update({ amount: 0, description: 'Sem cobrança (excluída)', paid_at: p.due_date, method: 'isento' }).eq('id', id)); Object.assign(p, { amount:0, description:'Sem cobrança (excluída)', paid_at:p.due_date, method:'isento' }); }
          else { must(await sb.from('payments').delete().eq('id', id)); st.payments = st.payments.filter(x => x.id!==id); }
          updateBadge(); back(); say('Cobrança excluída'); });
      case 'csv': {
        const R = rangeOf(); const list = st.payments.filter(p => inRange(p.paid_at, R) && p.method!=='isento').sort((a,b)=>a.paid_at.localeCompare(b.paid_at));
        const q = x => '"' + String(x ?? '').replace(/"/g,'""') + '"';
        const csv = ['Aluno;Descrição;Vencimento;Pago em;Forma;Valor'].concat(list.map(p => { const s = studentById(p.student_id); return [q(s?.name), q(p.description || (/^\d{4}-\d{2}$/.test(p.period) ? 'Mensalidade de ' + MONTHS[+p.period.slice(5)-1] : 'Cobrança')), q(fullDate(p.due_date)), q(fullDate(p.paid_at)), q((METHODS.find(m=>m[0]===p.method)||[,p.method])[1]), q(String(Number(p.amount).toFixed(2)).replace('.',','))].join(';'); })).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff'+csv], { type:'text/csv' })); a.download = `fluid-pagamentos-${R.from}-a-${R.to}.csv`; a.click(); return say('Planilha baixada'); }
      case 'scroll-late': { const el = root.querySelector('#hb-late'); el && el.scrollIntoView({ behavior:'smooth', block:'start' }); return; }
      case 'extra': return go({ type:'extra', id });
      case 'settings': return go({ type:'settings' });
      case 'rm-mem': if (st.armRm !== id){ st.armRm = id; return draw(); }
        return run(async () => { must(await sb.from('notebook_members').delete().eq('notebook_id', W().current().id).eq('user_id', id)); st.armRm = null; await loadFolders(); say('Acesso removido'); });
      case 'leave': if (!st.armLeave){ st.armLeave = true; return draw(); }
        return run(async () => { must(await sb.from('notebook_members').delete().eq('notebook_id', W().current().id).eq('user_id', W().me().id)); W().switchTo(firstOwned()?.id || ''); });
      case 'signout': return W().signOut();
    }
  }
  async function makeStudentFolder(s, name){
    const sb = W().sb;
    const nb = must(await sb.rpc('create_notebook', { p_name: name || ('Pasta de ' + s.name.split(' ')[0]), p_kind: 'student', p_color: s.color || colorFor(s.id) }));
    must(await sb.from('students').update({ notebook_id: nb }).eq('id', s.id)); s.notebook_id = nb;
    await W().loadNotebooks(); await loadFolders();
    return nb;
  }
  function onInput(e){
    const t = e.target;
    if (t.dataset.in === 'ctext'){ if (st.view) st.view.text = t.value; return; }
    if (t.dataset.in === 'rfrom' || t.dataset.in === 'rto'){ if (e.type !== 'change') return; st.range[t.dataset.in==='rfrom'?'from':'to'] = t.value; return draw(); }
    if (t.dataset.in === 'hq'){ st.hq = t.value; const pos = t.selectionStart; draw(); const n = root.querySelector('[data-in="hq"]'); if (n){ n.focus(); try { n.setSelectionRange(pos,pos); } catch(err){} } return; }
    if (t.dataset.in === 'q'){ st.q = t.value; const pos = t.selectionStart; draw(); const n = root.querySelector('[data-in="q"]'); if (n){ n.focus(); try { n.setSelectionRange(pos,pos); } catch(err){} } return; }
    if (st.view && st.view.draft && t.name && t.form && t.form.dataset.form==='stu' && t.type !== 'hidden') st.view.draft[t.name] = t.value;
  }
  async function onSubmit(e){
    e.preventDefault();
    const f = e.target, kind = f.dataset.form, fd = Object.fromEntries(new FormData(f).entries()), sb = W().sb;
    if (kind==='nb') return run(async () => {
      const v = st.view;
      if (v.id){ must(await sb.from('notebooks').update({ name: fd.name.trim(), color: fd.color }).eq('id', v.id)); await W().loadNotebooks(); st.view = null; say('Pasta salva'); if (typeof window.render==='function') window.render(); return; }
      if ((v.kind||'personal')==='student' && fd.student){ const s = studentById(fd.student); await makeStudentFolder(s, fd.name.trim() || undefined); st.view = null; return say('Pasta de ' + s.name.split(' ')[0] + ' criada'); }
      must(await sb.rpc('create_notebook', { p_name: fd.name.trim(), p_kind: v.kind||'personal', p_color: fd.color }));
      await W().loadNotebooks(); await loadFolders(); st.view = null; say('Pasta criada');
    });
    if (kind==='stu') return run(async () => {
      const v = st.view, s = v.id ? studentById(v.id) : null;
      const row = { name: fd.name.trim(), phone: fd.phone.trim() || null, email: fd.email.trim() || null, color: fd.color,
        lesson_days: fd.lesson_days ? fd.lesson_days.split(',').map(Number) : [], lesson_time: fd.lesson_time || null,
        fee: Number(String(fd.fee).replace(',','.')) || 0, due_day: Number(fd.due_day) || 10, start_date: fd.start_date || today(), notes: fd.notes.trim() || null };
      if (!row.name) return say('Coloque o nome do aluno');
      if (s){
        must(await sb.from('students').update(row).eq('id', s.id)); Object.assign(s, row);
        // mensalidades em aberto do mês atual acompanham o novo valor
        for (const p of st.payments.filter(p => p.student_id===s.id && !p.paid_at && /^\d{4}-\d{2}$/.test(p.period) && p.period >= ymOf(today()))){
          const upd = { amount: row.fee, due_date: p.period + '-' + pad(Math.min(row.due_day, dim(p.period))) };
          must(await sb.from('payments').update(upd).eq('id', p.id)); Object.assign(p, upd);
        }
        await ensureCharges(); updateBadge(); st.view = { type:'student', id: s.id }; return say('Aluno salvo');
      }
      const created = must(await sb.from('students').insert(row).select().single());
      st.students.push(created); st.students.sort((a,b)=>a.name.localeCompare(b.name));
      if (fd.mknb) await makeStudentFolder(created);
      await ensureCharges(); updateBadge(); st.tab = 'alunos'; st.view = { type:'student', id: created.id }; say('Cadastro salvo: ' + created.name.split(' ')[0]);
    });
    if (kind==='payedit') return run(async () => {
      const p = st.payments.find(x => x.id===st.view.id);
      const upd = { description: fd.description.trim() || null, amount: Number(String(fd.amount).replace(',','.'))||0, due_date: fd.due_date || p.due_date };
      must(await sb.from('payments').update(upd).eq('id', p.id)); Object.assign(p, upd); updateBadge(); back(); say('Cobrança atualizada');
    });
    if (kind==='extra') return run(async () => {
      const row = { student_id: fd.student, period: 'x-' + Date.now().toString(36), description: fd.description.trim(), amount: Number(String(fd.amount).replace(',','.'))||0, due_date: fd.due_date };
      const created = must(await sb.from('payments').insert(row).select().single()); st.payments.push(created); updateBadge(); back(); say('Cobrança criada');
    });
    if (kind==='settings') return run(async () => {
      const row = { user_id: W().me().id, pix_key: fd.pix_key.trim() || null, charge_msg: fd.charge_msg.trim() || null, remind_days: Number(fd.remind_days) };
      must(await sb.from('teacher_settings').upsert(row)); st.settings = row; updateBadge(); back(); say('Ajustes salvos');
    });
    if (kind==='profile') return run(async () => {
      const name = fd.name.trim(); if (!name) return; must(await sb.from('profiles').update({ name }).eq('id', W().me().id)); W().me().name = name; say('Nome salvo');
    });
  }

  /* ---------- estilos ---------- */
  const css = `
  html.hb-lock,html.hb-lock body{overflow:hidden}
  .hb-over{position:fixed;inset:0;z-index:58;display:flex;align-items:flex-end;justify-content:center;background:color-mix(in srgb,var(--bg) 45%,transparent);-webkit-backdrop-filter:blur(18px) saturate(1.5);backdrop-filter:blur(18px) saturate(1.5);animation:fadeIn .2s ease both}
  @media (min-width:720px){.hb-over{align-items:center;padding:24px}}
  .hb-sheet{position:relative;width:min(760px,100%);height:min(94dvh,900px);display:flex;flex-direction:column;border-radius:28px 28px 0 0;background:var(--sheetBg,var(--surface));border:1px solid var(--glassEdge,var(--line));box-shadow:var(--glassHi,none),0 30px 80px rgba(20,22,60,.25);-webkit-backdrop-filter:blur(40px) saturate(1.8);backdrop-filter:blur(40px) saturate(1.8);overflow:hidden;animation:hbUp .35s cubic-bezier(.2,.8,.2,1) both}
  @media (min-width:720px){.hb-sheet{border-radius:28px}}
  @keyframes hbUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
  .hb-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px 8px}
  .hb-me{display:flex;align-items:center;gap:10px;min-width:0}
  .hb-me i{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:600;font-size:13px;color:#fff;background:radial-gradient(circle at 34% 28%,color-mix(in srgb,var(--c) 40%,#fff),var(--c) 55%,color-mix(in srgb,var(--c) 70%,#000));flex-shrink:0}
  .hb-me span{min-width:0}.hb-me b{display:block;font-family:var(--fDisplay);font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hb-me small{display:block;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .hb-icon{width:40px;height:40px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid var(--glassEdgeSoft,var(--line));background:var(--glass,var(--surface));color:var(--text);flex-shrink:0}
  .hb-icon.sm{width:34px;height:34px}.hb-icon svg{width:18px;height:18px}
  .hb-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:4px 16px 6px;padding:4px;border-radius:999px;background:var(--glass2,var(--surface2));border:1px solid var(--line)}
  .hb-tabs button{position:relative;height:38px;border:0;border-radius:999px;background:transparent;font-size:13.5px;font-weight:600;color:var(--muted);display:flex;align-items:center;justify-content:center;gap:6px;padding:0 4px}
  .hb-tabs button[aria-selected="true"]{background:var(--solid,#fff);color:var(--text);box-shadow:0 4px 14px -6px rgba(20,22,60,.25)}
  .hb-dot{min-width:18px;height:18px;padding:0 5px;border-radius:999px;font-size:11px;color:#fff;display:inline-flex;align-items:center;justify-content:center}
  .hb-dot.bad{background:#EF4444}.hb-dot.warn{background:#F59E0B}
  .hb-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px 16px calc(28px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:14px}
  .hb-body>*{flex-shrink:0}
  .hb-body h2{font-family:var(--fDisplay);font-size:20px;margin:0}
  .hb-body h3{font-family:var(--fDisplay);font-size:15px;margin:0;display:flex;align-items:center;gap:8px}
  .hb-body h3 svg{width:17px;height:17px;color:var(--accent)}
  .hb-intro p,.hb-hint{margin:4px 0 0;color:var(--muted);font-size:13.5px;line-height:1.45}
  .hb-hint.center{text-align:center;margin-top:-6px}
  .hb-sec-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:4px}
  .btn.sm{height:36px;padding:0 13px;font-size:13px;gap:6px}
  .btn svg{width:16px;height:16px}
  .hb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px}
  .hb-folder{position:relative;padding:20px 20px 18px;border-radius:24px;display:flex;flex-direction:column;gap:2px;overflow:hidden;
    background:linear-gradient(150deg,color-mix(in srgb,var(--c) 10%,var(--glass,transparent)),color-mix(in srgb,var(--c) 3%,var(--glass,transparent)));
    border:1px solid color-mix(in srgb,var(--c) 16%,var(--glassEdgeSoft,transparent));box-shadow:var(--glassHi,none),0 10px 30px -22px color-mix(in srgb,var(--c) 70%,transparent)}
  .hb-folder::before{content:"";position:absolute;right:-50px;top:-60px;width:160px;height:160px;border-radius:50%;background:var(--c);opacity:.10;filter:blur(30px);pointer-events:none}
  .hb-folder.on{border-color:color-mix(in srgb,var(--c) 45%,transparent);box-shadow:var(--glassHi,none),0 0 0 3px color-mix(in srgb,var(--c) 12%,transparent),0 12px 30px -20px color-mix(in srgb,var(--c) 70%,transparent)}
  .hb-ftop{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  .hb-fic{width:38px;height:38px;border-radius:13px;display:flex;align-items:center;justify-content:center;color:#fff;background:linear-gradient(160deg,color-mix(in srgb,var(--c) 60%,#fff),var(--c));box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 6px 14px -8px var(--c)}
  .hb-fic svg{width:18px;height:18px}
  .hb-open-tag{font-size:11px;font-weight:600;letter-spacing:.02em;color:color-mix(in srgb,var(--c) 85%,var(--text));background:color-mix(in srgb,var(--c) 10%,transparent);padding:4px 10px;border-radius:999px}
  .hb-fname{font-family:var(--fDisplay);font-size:16.5px;font-weight:600;line-height:1.3;letter-spacing:-.01em}
  .hb-folder>small{font-size:12.5px;color:var(--muted)}
  .hb-fmem{display:flex;align-items:center;margin:14px 0 2px;min-height:28px}
  .hb-fmem .hb-av{margin-right:-6px;border:2px solid var(--solid,#fff)}
  .hb-fmem span{margin-left:14px;font-size:12.5px;color:var(--muted)}
  .hb-factions{display:flex;gap:8px;align-items:center;margin-top:16px;padding-top:14px;border-top:1px solid color-mix(in srgb,var(--c) 10%,var(--line))}
  .hb-factions .hb-icon{margin-left:auto}
  .hb-av{width:40px;height:40px;border-radius:50%;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;font-style:normal;font-weight:700;font-size:13px;color:#fff;letter-spacing:.02em;
    background:radial-gradient(circle at 34% 28%,color-mix(in srgb,var(--c) 40%,#fff) 0%,var(--c) 52%,color-mix(in srgb,var(--c) 65%,#000) 100%);box-shadow:inset 0 -3px 6px rgba(0,0,0,.2),inset 0 2px 3px rgba(255,255,255,.3),0 4px 10px -4px var(--c)}
  .hb-av.sm{width:28px;height:28px;font-size:10px}.hb-av.xl{width:64px;height:64px;font-size:21px}
  .hb-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  @media (max-width:560px){.hb-stats{grid-template-columns:1fr 1fr}}
  .hb-stat{position:relative;overflow:hidden;padding:12px 13px;border-radius:18px;background:linear-gradient(160deg,color-mix(in srgb,var(--c) 18%,var(--glass,transparent)),color-mix(in srgb,var(--c) 6%,var(--glass,transparent)));border:1px solid color-mix(in srgb,var(--c) 26%,transparent)}
  .hb-stat::after{content:"";position:absolute;left:0;top:12px;bottom:12px;width:3px;border-radius:3px;background:var(--c)}
  .hb-stat small{display:block;font-size:11.5px;font-weight:600;color:color-mix(in srgb,var(--c) 70%,var(--text));text-transform:uppercase;letter-spacing:.04em}
  .hb-stat b{display:block;font-family:var(--fDisplay);font-size:19px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
  .hb-today{padding:12px 14px;border-radius:18px;background:var(--glass,var(--surface));border:1px solid var(--glassEdgeSoft,var(--line))}
  .hb-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  .hb-chip{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 13px;border-radius:999px;border:1px solid color-mix(in srgb,var(--c,var(--accent)) 30%,transparent);background:color-mix(in srgb,var(--c,var(--accent)) 12%,transparent);font-size:13px;font-weight:500;color:var(--text)}
  .hb-chip b{color:color-mix(in srgb,var(--c,var(--accent)) 80%,var(--text))}
  .hb-tool{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .hb-search{flex:1;min-width:0;height:44px;border-radius:999px;padding:0 16px}
  .hb-seg{display:inline-grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;padding:4px;border-radius:999px;background:var(--glass2,var(--surface2));border:1px solid var(--line)}
  .hb-seg.wide{display:grid}
  .hb-seg button{height:36px;border:0;border-radius:999px;background:transparent;font-size:13px;font-weight:600;color:var(--muted);padding:0 12px}
  .hb-seg button small{opacity:.6;font-weight:500}
  .hb-seg button[aria-pressed="true"]{background:var(--accent);color:var(--onAccent);box-shadow:0 6px 16px -8px var(--glow)}
  .hb-list{display:flex;flex-direction:column;gap:8px}
  .hb-list.tight{gap:6px}
  .hb-row{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:10px 12px;border-radius:18px;border:1px solid var(--glassEdgeSoft,var(--line));background:var(--glass,var(--surface));color:var(--text);transition:transform .15s ease,border-color .15s ease}
  button.hb-row:hover{transform:translateY(-1px);border-color:var(--lineStrong)}
  .hb-rmain{flex:1;min-width:0}.hb-pay .hb-rmain small{white-space:normal}.hb-rmain b{display:block;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hb-rmain small{display:block;font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .hb-rside{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
  .hb-hasnb{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--faint)}.hb-hasnb svg{width:13px;height:13px}
  .hb-pill{display:inline-flex;align-items:center;height:24px;padding:0 10px;border-radius:999px;font-size:11.5px;font-weight:700;white-space:nowrap}
  .hb-pill.ok{background:rgba(34,197,94,.15);color:#15803D}.hb-pill.bad{background:rgba(239,68,68,.14);color:#DC2626}.hb-pill.warn{background:rgba(245,158,11,.17);color:#B45309}.hb-pill.info{background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accentInk)}.hb-pill.muted{background:var(--glass2,var(--surface2));color:var(--muted)}
  :root[data-theme="dark"] .hb-pill.ok{color:#4ADE80}:root[data-theme="dark"] .hb-pill.bad{color:#F87171}:root[data-theme="dark"] .hb-pill.warn{color:#FBBF24}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .hb-pill.ok{color:#4ADE80}:root:not([data-theme="light"]) .hb-pill.bad{color:#F87171}:root:not([data-theme="light"]) .hb-pill.warn{color:#FBBF24}}
  .hb-empty{text-align:center;padding:28px 12px;color:var(--muted)}
  .hb-empty.big{padding:36px 18px;border-radius:24px;border:1px dashed var(--lineStrong);display:flex;flex-direction:column;align-items:center;gap:10px}
  .hb-empty h3{justify-content:center;color:var(--text)}.hb-empty p{max-width:44ch;margin:0 auto;font-size:14px}
  .hb-hero{display:flex;align-items:center;gap:16px;padding:18px;border-radius:24px;background:linear-gradient(135deg,color-mix(in srgb,var(--c) 22%,var(--glass,transparent)),color-mix(in srgb,var(--c) 6%,var(--glass,transparent)));border:1px solid color-mix(in srgb,var(--c) 26%,transparent)}
  .hb-hero p{margin:2px 0 0;color:var(--muted);font-size:13.5px}
  .hb-hero-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
  .hb-actions{display:flex;gap:8px;flex-wrap:wrap}
  .hb-wa{background:#25D366!important;color:#fff!important;border-color:transparent!important;text-decoration:none}
  .hb-cards2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .hb-info{padding:14px;border-radius:20px;background:linear-gradient(160deg,color-mix(in srgb,var(--c) 15%,var(--glass,transparent)),var(--glass,transparent));border:1px solid color-mix(in srgb,var(--c) 22%,transparent)}
  .hb-info small{display:block;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:color-mix(in srgb,var(--c) 70%,var(--text))}
  .hb-info b{display:block;font-family:var(--fDisplay);font-size:20px;margin:3px 0 2px}.hb-info span{font-size:12.5px;color:var(--muted)}
  .hb-box{padding:14px;border-radius:22px;background:var(--glass,var(--surface));border:1px solid var(--glassEdgeSoft,var(--line));display:flex;flex-direction:column;gap:10px}
  .hb-notes{margin:0;white-space:pre-wrap;font-size:14px}
  .hb-form{display:flex;flex-direction:column;gap:14px}
  .hb-form.plain{gap:8px}
  .hb-field{display:flex;flex-direction:column;gap:6px}
  .hb-field>span{font-size:13px;font-weight:600;color:var(--muted)}
  .hb-field small{font-size:12px;color:var(--faint)}
  .hb-field .inp{height:46px;border-radius:14px;padding:0 14px;width:100%}
  .hb-field textarea.inp{height:auto;padding:12px 14px;resize:vertical}
  .hb-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .hb-days{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
  .hb-days button{height:42px;border-radius:12px;border:1px solid var(--line);background:var(--glass2,var(--surface2));font-size:12.5px;font-weight:600;color:var(--muted);padding:0}
  .hb-days button[aria-pressed="true"]{background:var(--accent);color:var(--onAccent);border-color:transparent;box-shadow:0 6px 14px -6px var(--glow)}
  .hb-colors{display:flex;gap:8px;flex-wrap:wrap}
  .hb-colors button{width:32px;height:32px;border-radius:50%;border:0;padding:0;background:radial-gradient(circle at 34% 28%,color-mix(in srgb,var(--c) 45%,#fff),var(--c) 60%);box-shadow:inset 0 -2px 4px rgba(0,0,0,.15)}
  .hb-colors button[aria-pressed="true"]{box-shadow:0 0 0 2px var(--solid,#fff),0 0 0 4px var(--c)}
  .hb-check{display:flex;align-items:center;gap:10px;font-size:14px}.hb-check input{width:20px;height:20px;accent-color:var(--accent)}
  .hb-form-act{display:flex;gap:8px;flex-wrap:wrap}
  .hb-danger{margin-top:8px;padding-top:14px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:8px;align-items:flex-start}
  .hb-danger p{margin:0;font-size:12.5px;color:var(--muted)}
  .hb-linkbox{display:flex;gap:8px}.hb-linkbox .inp{flex:1;min-width:0;height:44px;border-radius:14px;padding:0 12px;font-size:13px}
  .hb-share{display:flex;gap:8px;flex-wrap:wrap}.hb-share .btn{flex:1}
  .hb-month{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px}
  .hb-month b{font-family:var(--fDisplay);font-size:18px;text-transform:capitalize}
  .hb-alert{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:13px 15px;border-radius:18px;border:1px solid rgba(239,68,68,.35);background:linear-gradient(135deg,rgba(239,68,68,.16),rgba(249,115,22,.10));color:var(--text);animation:hbGlow 2.4s ease-in-out infinite}
  .hb-alert svg{width:22px;height:22px;color:#EF4444;flex-shrink:0}.hb-alert b{display:block;font-size:14.5px}.hb-alert small{display:block;font-size:12.5px;color:var(--muted)}
  @keyframes hbGlow{50%{box-shadow:0 0 0 4px rgba(239,68,68,.10)}}
  .hb-bar{display:flex;height:12px;border-radius:999px;overflow:hidden;background:var(--glass2,var(--surface2));border:1px solid var(--line)}
  .hb-bar i{display:block;height:100%;transition:width .5s cubic-bezier(.2,.8,.2,1)}
  .hb-bar i.ok{background:linear-gradient(90deg,#22C55E,#4ADE80)}.hb-bar i.bad{background:linear-gradient(90deg,#EF4444,#F87171)}.hb-bar i.info{background:linear-gradient(90deg,#6366F1,#A5B4FC)}
  .hb-group h3{font-size:14px;margin-bottom:8px}
  .hb-group h3 span{width:10px;height:10px;border-radius:50%}
  .hb-group h3 small{margin-left:auto;font-family:var(--fBody);font-size:12.5px;font-weight:600;color:var(--muted)}
  .hb-group.bad h3 span{background:#EF4444;box-shadow:0 0 0 4px rgba(239,68,68,.15)}.hb-group.warn h3 span{background:#F59E0B;box-shadow:0 0 0 4px rgba(245,158,11,.15)}.hb-group.info h3 span{background:#6366F1;box-shadow:0 0 0 4px rgba(99,102,241,.15)}.hb-group.ok h3 span{background:#22C55E;box-shadow:0 0 0 4px rgba(34,197,94,.15)}
  .hb-pay{border-radius:18px;border:1px solid var(--glassEdgeSoft,var(--line));background:var(--glass,var(--surface));overflow:hidden;position:relative}
  .hb-pay::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px}
  .hb-pay.late::before{background:#EF4444}.hb-pay.soon::before{background:#F59E0B}.hb-pay.open::before{background:#6366F1}.hb-pay.paid::before{background:#22C55E}.hb-pay.plan::before{background:var(--lineStrong)}
  .hb-pay-main{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px 6px 14px;border:0;background:none;text-align:left;color:var(--text)}
  .hb-amt{font-family:var(--fDisplay);font-weight:600;font-size:15px;font-variant-numeric:tabular-nums;white-space:nowrap}
  .hb-pay.paid .hb-amt{color:#16A34A}.hb-pay.late .hb-amt{color:#DC2626}
  .hb-pay-act{display:flex;align-items:center;gap:6px;justify-content:flex-end;padding:0 10px 10px 14px;flex-wrap:wrap}
  .hb-pay-act .hb-pill{margin-right:auto}
  .hb-pay.plan .hb-pay-main{padding-bottom:10px}
  .hb-methods{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:10px 12px 12px 14px;border-top:1px solid var(--line);background:color-mix(in srgb,#22C55E 7%,transparent)}
  .hb-methods>span{font-size:12.5px;font-weight:600;color:var(--muted);margin-right:4px}
  .hb-methods .hb-chip{--c:#22C55E;height:34px}
  .hb-chart{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;align-items:end;height:150px;padding-top:6px}
  .hb-col{display:flex;flex-direction:column;align-items:center;gap:6px;height:100%}
  .hb-bars{flex:1;width:100%;max-width:44px;position:relative;display:flex;align-items:flex-end;justify-content:center}
  .hb-bars i{position:absolute;bottom:0;width:100%;border-radius:10px 10px 4px 4px;min-height:3px}
  .hb-bars i.exp{background:color-mix(in srgb,#8B5CF6 22%,transparent);border:1px dashed color-mix(in srgb,#8B5CF6 55%,transparent)}
  .hb-bars i.got{width:64%;background:linear-gradient(180deg,#4ADE80,#16A34A);box-shadow:0 6px 14px -6px rgba(34,197,94,.6)}
  .hb-col small{font-size:11.5px;color:var(--muted);text-transform:capitalize}
  .hb-legend{display:flex;gap:16px;justify-content:center;font-size:12px;color:var(--muted)}
  .hb-legend span{display:inline-flex;align-items:center;gap:6px}.hb-legend i{width:10px;height:10px;border-radius:3px}
  .hb-legend i.got{background:#22C55E}.hb-legend i.exp{background:color-mix(in srgb,#8B5CF6 35%,transparent);border:1px dashed #8B5CF6}
  .hb-flash{position:absolute;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);padding:11px 18px;border-radius:999px;background:var(--text);color:var(--bg);font-size:13.5px;font-weight:600;box-shadow:0 12px 30px rgba(0,0,0,.25);animation:toastIn .3s cubic-bezier(.2,.8,.2,1) both;white-space:nowrap;max-width:calc(100% - 32px);overflow:hidden;text-overflow:ellipsis}
  .hub-chip{--c:var(--accent);position:relative;display:inline-flex;align-items:center;gap:9px;height:46px;max-width:230px;padding:0 10px 0 5px;border-radius:999px;color:var(--text);
    border:1px solid color-mix(in srgb,var(--c) 28%,var(--glassEdgeSoft,var(--line)));
    background:linear-gradient(135deg,color-mix(in srgb,var(--c) 16%,var(--glass,var(--surface))),color-mix(in srgb,var(--c) 5%,var(--glass,var(--surface))));
    box-shadow:var(--glassHi,none),0 8px 22px -12px color-mix(in srgb,var(--c) 70%,transparent);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);transition:transform .2s cubic-bezier(.2,.8,.2,1),box-shadow .2s}
  .hub-chip:hover{transform:translateY(-1px);box-shadow:var(--glassHi,none),0 12px 26px -12px color-mix(in srgb,var(--c) 80%,transparent)}
  .hub-ic{width:36px;height:36px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;
    background:radial-gradient(circle at 34% 28%,color-mix(in srgb,var(--c) 45%,#fff) 0%,var(--c) 55%,color-mix(in srgb,var(--c) 70%,#000) 100%);box-shadow:inset 0 -2px 5px rgba(0,0,0,.2),inset 0 2px 3px rgba(255,255,255,.35),0 4px 10px -4px var(--c)}
  .hub-ic svg{width:17px;height:17px}
  .hub-tx{display:flex;flex-direction:column;min-width:0;text-align:left;line-height:1.15}
  .hub-tx small{font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:color-mix(in srgb,var(--c) 75%,var(--text))}
  .hub-tx b{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .hub-chev{width:16px;height:16px;flex-shrink:0;color:var(--muted)}
  .hub-chip em{position:absolute;top:-5px;left:30px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;font-style:normal;font-size:11px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;background:#EF4444;box-shadow:0 0 0 2px var(--bg)}
  .hub-chip em.warn{background:#F59E0B}
  @media (max-width:520px){.hub-chip{padding:0 4px;gap:0;height:46px}.hub-tx,.hub-chev{display:none}}

  .hb-subtabs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
  .hb-subtabs::-webkit-scrollbar{display:none}
  .hb-subtabs button{min-width:0;height:36px;padding:0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-radius:999px;border:1px solid var(--line);background:transparent;font-size:13px;font-weight:600;color:var(--muted)}
  .hb-subtabs button[aria-selected="true"]{background:var(--text);color:var(--bg);border-color:transparent}
  .hb-range{display:flex;flex-direction:column;gap:8px}
  .hb-range .hb-chips{margin:0;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px}
  .hb-range .hb-chips::-webkit-scrollbar{display:none}
  .hb-range .hb-chip{flex-shrink:0;--c:var(--accent);background:transparent}
  .hb-range .hb-chip.on{background:color-mix(in srgb,var(--accent) 14%,transparent);border-color:color-mix(in srgb,var(--accent) 45%,transparent);color:var(--accentInk);font-weight:600}
  .hb-range .hb-hint{display:flex;align-items:center;gap:6px;margin:0}.hb-range .hb-hint svg{width:15px;height:15px}
  .hb-two.dates .inp{height:42px}
  .hb-stat i{display:block;font-style:normal;font-size:11.5px;color:var(--muted);margin-top:2px}
  .hb-muted{font-size:12.5px;color:var(--muted);font-weight:600}
  .hb-notes-list{display:flex;flex-direction:column;gap:8px}
  .hb-note{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:11px 13px;border-radius:16px;border:1px solid transparent;color:var(--text);font:inherit}
  .hb-note svg{width:20px;height:20px;flex-shrink:0}
  .hb-note b{display:block;font-size:14px}.hb-note small{display:block;font-size:12.5px;color:var(--muted)}
  .hb-note.bad{background:rgba(239,68,68,.10);border-color:rgba(239,68,68,.25)}.hb-note.bad svg{color:#EF4444}
  .hb-note.warn{background:rgba(245,158,11,.11);border-color:rgba(245,158,11,.28)}.hb-note.warn svg{color:#F59E0B}
  .hb-note.info{background:color-mix(in srgb,#6366F1 9%,transparent);border-color:color-mix(in srgb,#6366F1 22%,transparent)}.hb-note.info svg{color:#6366F1}
  .hb-note.ok{background:rgba(34,197,94,.10);border-color:rgba(34,197,94,.25)}.hb-note.ok svg{color:#16A34A}
  .hb-note.muted{background:var(--glass2,var(--surface2));border-color:var(--line)}.hb-note.muted svg{color:#25D366}
  .hb-timeline{display:flex;flex-direction:column;gap:6px}
  .hb-tl{display:flex;align-items:center;gap:12px;padding:8px 10px 8px 8px;border-radius:16px;background:var(--glass2,var(--surface2));border:1px solid var(--line)}
  .hb-tl-date{width:46px;height:48px;border-radius:13px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;background:color-mix(in srgb,var(--c) 14%,transparent);color:color-mix(in srgb,var(--c) 80%,var(--text))}
  .hb-tl-date b{font-family:var(--fDisplay);font-size:18px;line-height:1}.hb-tl-date small{font-size:11px;font-weight:600;text-transform:uppercase}
  .hb-icon.wa{color:#fff;background:#25D366;border-color:transparent}
  .hb-colv{font-size:10.5px;color:#16A34A;font-weight:700;min-height:14px}
  .hb-mini{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .hb-mini span{padding:10px 12px;border-radius:14px;border:1px solid var(--line)}
  .hb-mini small{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
  .hb-mini b{display:block;font-family:var(--fDisplay);font-size:16px;margin-top:2px;font-variant-numeric:tabular-nums}
  .hb-mini .ok{background:rgba(34,197,94,.08)}.hb-mini .ok small{color:#16A34A}
  .hb-mini .info{background:color-mix(in srgb,#6366F1 8%,transparent)}.hb-mini .info small{color:#6366F1}
  .hb-mini .bad{background:rgba(239,68,68,.08)}.hb-mini .bad small{color:#EF4444}
  .hb-total{display:grid;grid-template-columns:1.4fr 1fr;gap:8px}
  .hb-total span{padding:14px;border-radius:18px;background:linear-gradient(150deg,rgba(34,197,94,.14),rgba(34,197,94,.04));border:1px solid rgba(34,197,94,.22)}
  .hb-total span+span{background:var(--glass,var(--surface));border-color:var(--line)}
  .hb-total small{display:block;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
  .hb-total b{display:block;font-family:var(--fDisplay);font-size:22px;margin-top:2px}
  .hb-methods-sum{display:flex;gap:8px;flex-wrap:wrap}
  .hb-methods-sum span{padding:8px 12px;border-radius:12px;background:var(--glass2,var(--surface2));border:1px solid var(--line)}
  .hb-methods-sum small{display:block;font-size:11px;color:var(--muted)}.hb-methods-sum b{font-size:14px}
  .hb-map{display:flex;flex-direction:column;gap:6px;padding:12px;border-radius:20px;background:var(--glass,var(--surface));border:1px solid var(--glassEdgeSoft,var(--line));overflow-x:auto}
  .hb-map-row{display:grid;grid-template-columns:minmax(110px,1.4fr) repeat(6,minmax(34px,1fr));gap:6px;align-items:center}
  .hb-map-row.head small{text-align:center;font-size:11.5px;font-weight:600;color:var(--muted);text-transform:capitalize}
  .hb-map-name{display:flex;align-items:center;gap:8px;border:0;background:none;padding:0;color:var(--text);font-size:13.5px;font-weight:600;text-align:left;min-width:0}
  .hb-map-name span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .hb-cell{height:34px;border-radius:10px;border:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#fff;padding:0}
  .hb-cell svg{width:16px;height:16px}
  .hb-cell.paid{background:linear-gradient(160deg,#4ADE80,#16A34A)}.hb-cell.late{background:linear-gradient(160deg,#F87171,#DC2626)}
  .hb-cell.soon{background:linear-gradient(160deg,#FCD34D,#F59E0B)}.hb-cell.open{background:color-mix(in srgb,#6366F1 22%,transparent);border:1px solid color-mix(in srgb,#6366F1 40%,transparent)}
  .hb-cell.none{background:var(--glass2,var(--surface2));color:var(--faint)}
  .hb-legend.wrap{flex-wrap:wrap;gap:10px 14px}
  .hb-legend i.c{width:12px;height:12px;border-radius:4px}.hb-legend i.c.paid{background:#22C55E}.hb-legend i.c.late{background:#EF4444}.hb-legend i.c.soon{background:#F59E0B}.hb-legend i.c.open{background:color-mix(in srgb,#6366F1 35%,transparent)}.hb-legend i.c.none{background:var(--line)}
  .hb-cardprev{border-radius:22px;overflow:hidden;border:1px solid var(--line);background:var(--glass2,var(--surface2));aspect-ratio:4/5;max-width:340px;width:100%;align-self:center;box-shadow:0 20px 50px -24px rgba(60,50,140,.35)}
  .hb-cardprev img{display:block;width:100%;height:100%;object-fit:cover}
  .hb-cardload{height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px}
  .hb-share.col{flex-direction:column}.hb-share.col .btn{width:100%;flex:none}
  .linkish{border:0;background:none;padding:0;color:var(--accentInk);font-weight:600;text-decoration:underline;text-underline-offset:3px}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  window.FluidHub = {
    open, close,
    boot(){ mount(); loadTeacher().catch(() => {}); },
    chipHTML(){
      const w = W(); if (!w) return '';
      const b = window.FLUID_HUB_BADGE || {};
      const cur = w.current(), c = colorFor(cur.id, cur.color);
      const role = cur.role==='owner' ? (cur.kind==='student' ? 'Pasta de aluno' : 'Minha pasta') : cur.role==='teacher' ? 'Você é professor' : 'Você é aluno';
      return `<button class="hub-chip" data-act="hub" style="--c:${c}" aria-label="Pastas, alunos e financeiro. Pasta aberta: ${esc(cur.name)}">
        <span class="hub-ic">${IC.folder}</span>
        <span class="hub-tx"><small>${esc(role)}</small><b>${esc(cur.name)}</b></span>
        <svg class="hub-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
        ${b.late ? `<em>${b.late}</em>` : b.soon ? `<em class="warn">${b.soon}</em>` : ''}</button>`;
    },
  };
})();
