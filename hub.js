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

  /* ---------- estado ---------- */
  const st = { open:false, tab:'pastas', view:null, students:[], payments:[], settings:{ remind_days:3 }, loaded:false, loadErr:'',
    month: ymOf(today()), filter:'active', q:'', members:{}, owners:{}, flash:'', busy:false, payOpen:null };

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
        <span class="hb-rmain"><b>${esc(inStudent ? label : s.name)}</b><small>${inStudent ? '' : esc(label) + ' · '}${p.virtual ? 'vence ' + shortDate(p.due_date) : esc(dueLabel(p))}${p.paid_at && p.method ? ' · ' + esc((METHODS.find(m=>m[0]===p.method)||[,p.method])[1]) : ''}</small></span>
        <span class="hb-amt">${brl(p.amount)}</span></button>
      ${p.virtual ? '' : `<div class="hb-pay-act">${pill(k)}
        ${p.paid_at ? `<button class="btn ghost sm" data-h="unpay" data-id="${p.id}">Desfazer</button>`
          : `${s.phone ? `<a class="btn sm hb-wa" href="https://wa.me/${phoneDigits(s.phone)}?text=${encodeURIComponent(chargeText(p, s))}" target="_blank" rel="noopener">${IC.wa}Cobrar</a>` : ''}<button class="btn sm primary" data-h="payopen" data-id="${p.id}">${IC.check}Recebi</button>`}</div>
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
  function viewFinance(){
    const ym = st.month, rows = monthRows(ym);
    const sum = f => rows.filter(f).reduce((a,p)=>a+(Number(p.amount)||0),0);
    const paid = sum(p => p.paid_at), late = sum(p => !p.virtual && payStatus(p)==='late'), total = sum(() => true), toGet = total - paid - late;
    const allLate = st.payments.filter(p => payStatus(p)==='late').sort((a,b)=>a.due_date.localeCompare(b.due_date));
    const lateSum = allLate.reduce((a,p)=>a+(Number(p.amount)||0),0);
    const soon = rows.filter(p => !p.virtual && payStatus(p)==='soon'), open = rows.filter(p => p.virtual || payStatus(p)==='open'), paidRows = rows.filter(p => p.paid_at);
    const pct = v => total ? Math.max(0, v/total*100) : 0;
    // últimos 6 meses
    const hist = Array.from({length:6}, (_,i) => addMonths(ymOf(today()), i-5)).map(m => { const r = st.payments.filter(p => ymOf(p.due_date)===m); return { m, exp: r.reduce((a,p)=>a+(Number(p.amount)||0),0), got: r.filter(p=>p.paid_at).reduce((a,p)=>a+(Number(p.amount)||0),0) }; });
    const max = Math.max(1, ...hist.map(h => h.exp));
    const group = (title, list, cls) => list.length ? `<section class="hb-group ${cls}"><h3><span></span>${title}<small>${list.length} · ${brl(list.reduce((a,p)=>a+(Number(p.amount)||0),0))}</small></h3><div class="hb-list tight">${list.map(p => payRow(p)).join('')}</div></section>` : '';
    if (!st.students.length) return `<div class="hb-empty big"><h3>Seu financeiro começa pelos alunos</h3><p>Cadastre os alunos com a mensalidade e o dia do vencimento. As cobranças aparecem aqui sozinhas todo mês, com alerta de atraso e botão para cobrar no WhatsApp.</p><button class="btn primary" data-h="stu-new">${IC.plus}Cadastrar aluno</button></div>`;
    return `
      <div class="hb-month"><button class="hb-icon" data-h="month" data-v="-1" aria-label="Mês anterior">${IC.left}</button><b>${monthName(ym)}</b><button class="hb-icon" data-h="month" data-v="1" aria-label="Próximo mês">${IC.right}</button></div>
      ${allLate.length ? `<button class="hb-alert" data-h="scroll-late">${IC.alert}<span><b>${allLate.length} ${allLate.length===1?'cobrança atrasada':'cobranças atrasadas'}</b><small>Somando ${brl(lateSum)}. Toque para ver e cobrar.</small></span></button>` : ''}
      <div class="hb-stats fin">
        <div class="hb-stat" style="--c:#22C55E"><small>Recebido</small><b>${brl(paid)}</b></div>
        <div class="hb-stat" style="--c:#6366F1"><small>${ym > ymOf(today()) ? 'Previsto' : 'A receber'}</small><b>${brl(toGet)}</b></div>
        <div class="hb-stat" style="--c:#EF4444"><small>Atrasado no mês</small><b>${brl(late)}</b></div>
        <div class="hb-stat" style="--c:#8B5CF6"><small>Total do mês</small><b>${brl(total)}</b></div>
      </div>
      <div class="hb-bar" aria-label="Recebido ${Math.round(pct(paid))}% do mês"><i class="ok" style="width:${pct(paid)}%"></i><i class="bad" style="width:${pct(late)}%"></i><i class="info" style="width:${pct(toGet)}%"></i></div>
      <p class="hb-hint center">${total ? `${Math.round(pct(paid))}% do mês já recebido` : 'Nenhuma cobrança neste mês'}</p>
      <div class="hb-tool"><button class="btn sm" data-h="extra">${IC.plus}Cobrança avulsa</button><button class="btn sm" data-h="settings">${IC.gear}Ajustes de cobrança</button></div>
      <div id="hb-late">${group('Atrasadas', allLate, 'bad')}</div>
      ${group('Vencem nos próximos dias', soon, 'warn')}
      ${group(ym > ymOf(today()) ? 'Previstas' : 'A vencer', open, 'info')}
      ${group('Pagas', paidRows, 'ok')}
      <section class="hb-box"><h3>Últimos 6 meses</h3>
        <div class="hb-chart">${hist.map(h => `<div class="hb-col" title="${monthName(h.m)}: recebido ${brl(h.got)} de ${brl(h.exp)}"><div class="hb-bars"><i class="exp" style="height:${h.exp/max*100}%"></i><i class="got" style="height:${h.got/max*100}%"></i></div><small>${MON[+h.m.slice(5)-1]}</small></div>`).join('')}</div>
        <div class="hb-legend"><span><i class="got"></i>Recebido</span><span><i class="exp"></i>Cobrado</span></div>
      </section>`;
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

  const VIEWS = { nbform: viewFolderForm, invite: viewInvite, student: viewStudent, sform: viewStudentForm, extra: viewExtra, settings: viewSettings };

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
