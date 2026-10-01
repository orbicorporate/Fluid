/* Fluid na web: login, cadernos compartilhados e convites (Supabase).
   Fora do Claude, este arquivo instala um window.claude compatível com o que o app usa:
   use('db') -> documentos do caderno no Supabase, em tempo real
   use('mcp') -> busca no Spotify pela função /api/spotify-search
   use('sample') -> interpretação com IA pela função /api/interpret */
(() => {
  if (window.claude && window.claude.use) return; // dentro do Claude: usa a plataforma
  window.FLUID_WEB = true;
  const cfg = window.FLUID_CONFIG || {};
  const sb = window.supabase && cfg.supabaseUrl ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const LSNB = 'fluid.notebook';
  const params = new URLSearchParams(location.search);
  let inviteToken = params.get('convite') || sessionStorage.getItem('fluid.convite') || '';
  if (params.get('convite')) { sessionStorage.setItem('fluid.convite', inviteToken); history.replaceState(null, '', location.pathname); }

  let inviteErr = '';
  let session = null, me = null, notebooks = [], current = null, features = { spotify:false, ai:false };
  let resolveDb; const dbReady = new Promise(r => resolveDb = r);

  /* ---------- UI shell ---------- */
  const css = `
  [hidden]{display:none!important}
  .fx-over{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:16px;background:color-mix(in srgb,var(--bg) 55%,transparent);-webkit-backdrop-filter:blur(24px) saturate(1.6);backdrop-filter:blur(24px) saturate(1.6);overflow-y:auto}
  .fx-card{width:min(420px,100%);padding:28px 24px 24px;border-radius:28px;background:var(--sheetBg,var(--surface));border:1px solid var(--glassEdge,var(--line));box-shadow:var(--glassHi,none),0 30px 80px rgba(20,22,60,.22);display:flex;flex-direction:column;gap:14px;-webkit-backdrop-filter:blur(40px) saturate(1.8);backdrop-filter:blur(40px) saturate(1.8);animation:cardIn .5s cubic-bezier(.2,.8,.2,1) both}
  .fx-brand{display:flex;align-items:center;gap:10px}
  .fx-brand b{font-family:var(--fDisplay);font-size:24px;font-weight:600;letter-spacing:-.02em}
  .fx-card h2{font-size:20px;margin:4px 0 0}
  .fx-card p{margin:0;color:var(--muted);font-size:14px}
  .fx-card form{display:flex;flex-direction:column;gap:12px}
  .fx-err{color:var(--bad);font-size:13.5px;min-height:18px}
  .fx-ok{color:var(--ok);font-size:13.5px}
  .fx-link{border:0;background:none;padding:6px 0;color:var(--accentInk);font-weight:600;text-decoration:underline;text-underline-offset:3px;align-self:flex-start}
  .fx-inv{padding:12px 14px;border-radius:16px;background:var(--glowSoft);color:var(--accentInk);font-size:14px;font-weight:500}
  .fx-acc{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:19;display:flex;align-items:center;gap:8px;height:44px;padding:0 14px 0 6px;border-radius:999px;border:1px solid var(--glassEdge,var(--line));background:var(--glass,var(--surface));box-shadow:var(--glassHi,none),0 10px 30px -10px rgba(20,22,60,.3);-webkit-backdrop-filter:blur(22px) saturate(1.7);backdrop-filter:blur(22px) saturate(1.7);font-size:13px;font-weight:600;max-width:calc(100% - 32px)}
  .fx-acc i{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--accent);color:var(--onAccent);font-style:normal;font-family:var(--fDisplay);font-size:13px;flex-shrink:0}
  .fx-acc span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fx-list{display:flex;flex-direction:column;gap:8px}
  .fx-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:16px;background:var(--glass2,var(--surface2));border:1px solid var(--glassEdgeSoft,var(--line));text-align:left;width:100%}
  .fx-row.on{border-color:var(--accent);box-shadow:0 0 0 3px var(--glowSoft)}
  .fx-row b{display:block;font-weight:600}
  .fx-row small{color:var(--muted);font-size:12.5px}
  .fx-row .grow{flex:1;min-width:0}
  .fx-sec{font-size:12px;font-weight:600;color:var(--faint);text-transform:uppercase;letter-spacing:.06em;margin-top:6px}
  .fx-copy{display:flex;gap:8px}
  .fx-copy input{flex:1;min-width:0;font-family:var(--fMono);font-size:12.5px}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const over = document.createElement('div'); over.className = 'fx-over'; over.hidden = true; document.body.appendChild(over);
  const accBtn = document.createElement('button'); accBtn.className = 'fx-acc'; accBtn.hidden = true; accBtn.type = 'button'; document.body.appendChild(accBtn);
  accBtn.onclick = () => showAccount();
  const initials = t => (t||'?').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const brand = `<div class="fx-brand"><div class="brand-orb" aria-hidden="true"><svg class="brand-ico lg" viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="flgb"><path d="M50 29C62 29 67 37 66 46C65 52 61 54 62 58C74 61 75 73 71 80C66 89 34 89 29 80C25 73 26 61 38 58C39 54 35 52 34 46C33 37 38 29 50 29Z"/></clipPath></defs><g class="lg-splash"><circle class="lg-blob lg-b1" cx="64" cy="40" r="14" fill="#F97316" opacity=".88" style="--o:64px 40px;animation-delay:0s"/><circle class="lg-blob lg-b2" cx="33" cy="57" r="11" fill="#E11D48" opacity=".88" style="--o:33px 57px;animation-delay:-2s"/><circle class="lg-blob lg-b3" cx="71" cy="67" r="10" fill="#14B8A6" opacity=".88" style="--o:71px 67px;animation-delay:-4s"/><circle class="lg-blob lg-b4" cx="30" cy="38" r="7" fill="#FACC15" opacity=".88" style="--o:30px 38px;animation-delay:-1s"/><circle class="lg-blob lg-b5" cx="57" cy="82" r="6" fill="#7C3AED" opacity=".88" style="--o:57px 82px;animation-delay:-3s"/></g><g class="lg-sw"><circle cx="70" cy="34" r="12" fill="none" stroke="#FACC15" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="30 10 14 8"/><circle cx="70" cy="34" r="7.5" fill="none" stroke="#FDE68A" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="18 7"/></g><g class="lg-sw2"><circle cx="27" cy="68" r="8" fill="none" stroke="#38BDF8" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="14 9 6 9"/></g><circle class="lg-dot" cx="20" cy="40" r="2.4" fill="#1D4ED8" style="animation-delay:-0s"/><circle class="lg-dot" cx="80" cy="53" r="2" fill="#E11D48" style="animation-delay:-0.6s"/><circle class="lg-dot" cx="24" cy="77" r="2.8" fill="#F59E0B" style="animation-delay:-1.2s"/><circle class="lg-dot" cx="82" cy="28" r="1.6" fill="#14B8A6" style="animation-delay:-0.3s"/><circle class="lg-dot" cx="17" cy="57" r="1.5" fill="#7C3AED" style="animation-delay:-0.9s"/><circle class="lg-dot" cx="77" cy="86" r="1.8" fill="#1D4ED8" style="animation-delay:-1.5s"/><circle class="lg-dot" cx="30" cy="24" r="1.3" fill="#F97316" style="animation-delay:-0.45s"/><circle class="lg-dot" cx="86" cy="72" r="1.4" fill="#FACC15" style="animation-delay:-2.1s"/><circle class="lg-dot" cx="14" cy="30" r="1.1" fill="#E11D48" style="animation-delay:-1.8s"/><g class="lg-gtr"><g clip-path="url(#flgb)"><g transform="rotate(-28 50 60)"><g class="lg-flow"><rect x="-20" y="-62" width="140" height="10.6" fill="#1D4ED8"/><rect x="-20" y="-52" width="140" height="10.6" fill="#F59E0B"/><rect x="-20" y="-42" width="140" height="10.6" fill="#14B8A6"/><rect x="-20" y="-32" width="140" height="10.6" fill="#E11D48"/><rect x="-20" y="-22" width="140" height="10.6" fill="#7C3AED"/><rect x="-20" y="-12" width="140" height="10.6" fill="#F97316"/><rect x="-20" y="-2" width="140" height="10.6" fill="#0EA5E9"/><rect x="-20" y="8" width="140" height="10.6" fill="#FACC15"/><rect x="-20" y="18" width="140" height="10.6" fill="#1D4ED8"/><rect x="-20" y="28" width="140" height="10.6" fill="#F59E0B"/><rect x="-20" y="38" width="140" height="10.6" fill="#14B8A6"/><rect x="-20" y="48" width="140" height="10.6" fill="#E11D48"/><rect x="-20" y="58" width="140" height="10.6" fill="#7C3AED"/><rect x="-20" y="68" width="140" height="10.6" fill="#F97316"/><rect x="-20" y="78" width="140" height="10.6" fill="#0EA5E9"/><rect x="-20" y="88" width="140" height="10.6" fill="#FACC15"/><rect x="-20" y="98" width="140" height="10.6" fill="#1D4ED8"/><rect x="-20" y="108" width="140" height="10.6" fill="#F59E0B"/></g></g><circle class="lg-ins" cx="40" cy="76" r="7" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.2" stroke-dasharray="16 6" style="--o:40px 76px;--s:9s"/><circle class="lg-ins" cx="40" cy="76" r="4" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.2" stroke-dasharray="10 5" style="--o:40px 76px;--s:6s"/><circle class="lg-ins" cx="61" cy="40" r="5" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.2" stroke-dasharray="12 5" style="--o:61px 40px;--s:7s"/><circle class="lg-ins" cx="63" cy="72" r="5" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.2" stroke-dasharray="9 4" style="--o:63px 72px;--s:8s"/></g><path d="M50 29C62 29 67 37 66 46C65 52 61 54 62 58C74 61 75 73 71 80C66 89 34 89 29 80C25 73 26 61 38 58C39 54 35 52 34 46C33 37 38 29 50 29Z" fill="none" stroke="#1E1B4B" stroke-width="1.6"/><rect x="46.8" y="10" width="6.4" height="42" rx="1" fill="#1E1B4B"/><line x1="46.8" x2="53.2" y1="16" y2="16" stroke="#A5B4FC" stroke-width=".5" opacity=".7"/><line x1="46.8" x2="53.2" y1="21" y2="21" stroke="#A5B4FC" stroke-width=".5" opacity=".7"/><line x1="46.8" x2="53.2" y1="26" y2="26" stroke="#A5B4FC" stroke-width=".5" opacity=".7"/><line x1="46.8" x2="53.2" y1="31" y2="31" stroke="#A5B4FC" stroke-width=".5" opacity=".7"/><line x1="46.8" x2="53.2" y1="36" y2="36" stroke="#A5B4FC" stroke-width=".5" opacity=".7"/><line x1="46.8" x2="53.2" y1="41" y2="41" stroke="#A5B4FC" stroke-width=".5" opacity=".7"/><path d="M45 2.5H55L54 12H46Z" fill="#1E1B4B"/><circle cx="43.6" cy="5" r="1.3" fill="#F59E0B"/><circle cx="43.9" cy="9" r="1.3" fill="#F59E0B"/><circle cx="56.4" cy="5" r="1.3" fill="#F59E0B"/><circle cx="56.1" cy="9" r="1.3" fill="#F59E0B"/><circle class="lg-ring" cx="50" cy="55" r="8.4" fill="none" stroke="#E11D48" stroke-width="1.8"/><circle cx="50" cy="55" r="6.6" fill="#1E1B4B"/><rect x="41.5" y="73" width="17" height="3.4" rx="1.6" fill="#1E1B4B"/><line class="lg-str" x1="48.4" x2="48.4" y1="5" y2="74.5" stroke="#FEF3C7" stroke-width=".42" style="--i:0"/><line class="lg-str" x1="49.47" x2="49.47" y1="5" y2="74.5" stroke="#FEF3C7" stroke-width=".42" style="--i:1"/><line class="lg-str" x1="50.53" x2="50.53" y1="5" y2="74.5" stroke="#FEF3C7" stroke-width=".42" style="--i:2"/><line class="lg-str" x1="51.6" x2="51.6" y1="5" y2="74.5" stroke="#FEF3C7" stroke-width=".42" style="--i:3"/></g></svg></div><b>Fluid</b></div>`;
  function show(html){ over.innerHTML = `<div class="fx-card" role="dialog" aria-modal="true">${html}</div>`; over.hidden = false; }
  function hide(){ over.hidden = true; over.innerHTML = ''; }
  const errText = e => {
    const m = (e && (e.message || e.error_description || e.code)) || '';
    if (/Invalid login/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/already registered|already exists/i.test(m)) return 'Esse e-mail já tem conta. Entre com ele.';
    if (/Password should be/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.';
    if (/Email not confirmed/i.test(m)) return 'Confirme o e-mail pelo link que chegou na sua caixa de entrada.';
    if (/invite_used/.test(m)) return 'Esse convite já foi usado por outra pessoa. Peça um novo.';
    if (/invite_not_found/.test(m)) return 'Convite não encontrado. Peça um novo link.';
    if (/invite_expired/.test(m)) return 'Esse convite venceu (vale 14 dias). Peça um novo link.';
    return 'Não deu certo agora. Confira a conexão e tente de novo.';
  };

  /* ---------- auth screens ---------- */
  async function inviteBanner(){
    if (!inviteToken || !sb) return '';
    try { const { data } = await sb.rpc('invite_info', { t: inviteToken }); const r = data && data[0];
      if (r && !r.accepted) return `<div class="fx-inv">${esc(r.owner_name||'Um aluno')} convidou você para o ${esc(r.notebook_name)}. Entre ou crie sua conta para abrir.</div>`;
    } catch(e){}
    return '';
  }
  async function showLogin(mode='in', msg=''){
    const inv = await inviteBanner();
    const up = mode==='up';
    show(`${brand}${inv}
      <h2>${up?'Criar conta':'Entrar'}</h2>
      <form id="fx-f" autocomplete="on">
        ${up?`<div class="field"><label for="fx-name">Seu nome</label><input class="inp" id="fx-name" autocomplete="name" required></div>`:''}
        <div class="field"><label for="fx-email">E-mail</label><input class="inp" id="fx-email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="fx-pass">Senha</label><input class="inp" id="fx-pass" type="password" autocomplete="${up?'new-password':'current-password'}" minlength="6" required></div>
        <p class="fx-err" id="fx-err" role="alert">${esc(msg)}</p>
        <button class="btn primary" type="submit">${up?'Criar conta':'Entrar'}</button>
      </form>
      <button class="fx-link" type="button" id="fx-sw">${up?'Já tenho conta':'Criar uma conta'}</button>`);
    over.querySelector('#fx-sw').onclick = () => showLogin(up?'in':'up');
    over.querySelector('#fx-f').onsubmit = async e => {
      e.preventDefault(); const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
      const email = over.querySelector('#fx-email').value.trim(), password = over.querySelector('#fx-pass').value;
      const errEl = over.querySelector('#fx-err'); errEl.textContent = '';
      try {
        if (up){
          const name = over.querySelector('#fx-name').value.trim();
          const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name } } });
          if (error) throw error;
          if (!data.session){ btn.disabled = false; errEl.className = 'fx-ok'; errEl.textContent = 'Conta criada. Abra o link de confirmação que chegou no seu e-mail e depois entre.'; return; }
        } else {
          const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error;
        }
      } catch(err){ btn.disabled = false; errEl.className = 'fx-err'; errEl.textContent = errText(err); }
    };
  }

  /* ---------- after login ---------- */
  async function loadMe(){
    const uid = session.user.id;
    const { data: p } = await sb.from('profiles').select('id,name,email').eq('id', uid).maybeSingle();
    me = p || { id: uid, name: session.user.user_metadata?.name || session.user.email, email: session.user.email };
    if (inviteToken){
      try { const { data } = await sb.rpc('accept_invite', { t: inviteToken }); if (data) localStorage.setItem(LSNB, data); }
      catch(e){ inviteErr = errText(e); }
      inviteToken = ''; sessionStorage.removeItem('fluid.convite');
    }
    const { data: mem } = await sb.from('notebook_members').select('role, notebook_id, notebooks(id,name,owner_id)').eq('user_id', uid);
    notebooks = (mem||[]).filter(m=>m.notebooks).map(m => ({ id: m.notebooks.id, name: m.notebooks.name, role: m.role, owner_id: m.notebooks.owner_id }));
    const saved = localStorage.getItem(LSNB);
    current = notebooks.find(n => n.id === saved) || notebooks.find(n => n.role==='owner') || notebooks[0];
    if (!current){ show(`${brand}<h2>Nenhum caderno</h2><p>Sua conta ainda não tem caderno. Recarregue a página em alguns segundos.</p>`); return; }
    localStorage.setItem(LSNB, current.id);
    try { const r = await fetch('/api/config'); if (r.ok) features = await r.json(); } catch(e){}
    hide(); renderAccBtn();
    resolveDb(makeDb(current.id));
    if (inviteErr){ show(`${brand}<h2>Convite</h2><p>${esc(inviteErr)}</p><button class="btn primary" type="button" id="fx-close">Continuar</button>`); over.onclick = e => { if (e.target.closest('#fx-close')) hide(); }; inviteErr = ''; }
  }
  function renderAccBtn(){
    const other = current.role==='teacher';
    accBtn.innerHTML = `<i aria-hidden="true">${esc(initials(me.name))}</i><span>${other ? esc(current.name) : esc(me.name)}</span>`;
    accBtn.setAttribute('aria-label', 'Conta e caderno: ' + current.name);
    accBtn.hidden = false;
  }
  function switchTo(id){ localStorage.setItem(LSNB, id); location.reload(); }

  async function showAccount(msg=''){
    const isOwner = current.role==='owner';
    let members = [];
    try { const { data } = await sb.from('notebook_members').select('user_id, role, profiles(name,email)').eq('notebook_id', current.id); members = data||[]; } catch(e){}
    show(`${brand}
      <div class="fx-row" style="background:transparent;border:0;padding:0"><div class="grow"><b>${esc(me.name)}</b><small>${esc(me.email||'')}</small></div><button class="btn ghost" type="button" id="fx-out">Sair</button></div>
      <div class="fx-sec">Cadernos</div>
      <div class="fx-list">${notebooks.map(n=>`<button type="button" class="fx-row${n.id===current.id?' on':''}" data-nb="${esc(n.id)}"><div class="grow"><b>${esc(n.name)}</b><small>${n.role==='owner'?'seu caderno':'você é professor aqui'}</small></div></button>`).join('')}</div>
      <div class="fx-sec">Quem tem acesso a este caderno</div>
      <div class="fx-list">${members.map(m=>`<div class="fx-row"><div class="grow"><b>${esc(m.profiles?.name||'Sem nome')}</b><small>${m.role==='owner'?'aluno, dono do caderno':'professor'}${m.user_id===me.id?' · você':''}</small></div>${isOwner && m.role!=='owner' ? `<button class="btn ghost danger" type="button" data-rm="${esc(m.user_id)}">Remover</button>`:''}</div>`).join('')}</div>
      ${isOwner ? `<div class="fx-sec">Convidar professor</div>
        <p>Gere um link e mande para ele no WhatsApp. Ele cria a conta pelo link e passa a ver e editar este caderno.</p>
        <div id="fx-invbox">${msg}</div>
        <button class="btn primary" type="button" id="fx-inv">Gerar link de convite</button>` : ''}
      <button class="btn" type="button" id="fx-close">Fechar</button>`);
    over.onclick = async e => {
      const t = e.target.closest('button'); if (!t){ if (e.target === over) hide(); return; }
      if (t.id==='fx-close') hide();
      if (t.id==='fx-out'){ await sb.auth.signOut(); localStorage.removeItem(LSNB); location.reload(); }
      if (t.dataset.nb && t.dataset.nb !== current.id) switchTo(t.dataset.nb);
      if (t.dataset.rm){ if (t.dataset.armed){ await sb.from('notebook_members').delete().eq('notebook_id', current.id).eq('user_id', t.dataset.rm); showAccount(); } else { t.dataset.armed='1'; t.textContent='Confirmar'; } }
      if (t.id==='fx-inv'){
        t.disabled = true;
        const { data, error } = await sb.from('invites').insert({ notebook_id: current.id }).select('token').single();
        if (error){ t.disabled = false; over.querySelector('#fx-invbox').innerHTML = `<p class="fx-err">${esc(errText(error))}</p>`; return; }
        const link = location.origin + location.pathname + '?convite=' + data.token;
        over.querySelector('#fx-invbox').innerHTML = `<div class="fx-copy"><input class="inp" id="fx-invlink" readonly value="${esc(link)}" aria-label="Link de convite"><button class="btn" type="button" id="fx-cp">Copiar</button></div><p style="margin-top:8px">Cada link vale para uma pessoa.</p>`;
        t.hidden = true;
      }
      if (t.id==='fx-cp'){ const inp = over.querySelector('#fx-invlink'); try { await navigator.clipboard.writeText(inp.value); t.textContent = 'Copiado'; } catch(err){ inp.select(); } }
    };
  }

  /* ---------- db shim over the items table ---------- */
  function makeDb(nb){
    const cache = new Map(); // collection -> Map(id -> data)
    const colSubs = new Map(), docSubs = new Map();
    const col = c => { if (!cache.has(c)) cache.set(c, new Map()); return cache.get(c); };
    const snapCol = c => ({ docs: [...col(c).entries()].map(([id, d]) => ({ id, exists: true, data: () => d })), size: col(c).size, empty: !col(c).size });
    const snapDoc = (c, id) => { const d = col(c).get(id); return { id, exists: !!d, data: () => d }; };
    const emit = c => { (colSubs.get(c)||[]).forEach(fn => fn(snapCol(c))); col(c).forEach((_, id) => {}); (docSubs.get(c)||new Map()).forEach((fns, id) => fns.forEach(fn => fn(snapDoc(c, id)))); };
    let loaded = null;
    const load = () => loaded || (loaded = (async () => {
      const { data, error } = await sb.from('items').select('collection,id,data').eq('notebook_id', nb);
      if (error) throw { code: 'unavailable', message: error.message };
      (data||[]).forEach(r => col(r.collection).set(r.id, r.data));
      sb.channel('items-' + nb).on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: 'notebook_id=eq.' + nb }, p => {
        const r = p.new && p.new.collection ? p.new : p.old; if (!r || !r.collection) return;
        if (r.notebook_id && r.notebook_id !== nb) return;
        if (p.eventType === 'DELETE') col(r.collection).delete(r.id); else col(r.collection).set(r.id, p.new.data);
        emit(r.collection);
      }).subscribe();
    })());
    const write = async (c, id, data) => {
      col(c).set(id, data); emit(c);
      const { error } = await sb.from('items').upsert({ notebook_id: nb, collection: c, id, data, updated_at: new Date().toISOString() });
      if (error) throw { code: 'unavailable', message: error.message };
    };
    const del = async (c, id) => {
      col(c).delete(id); emit(c);
      const { error } = await sb.from('items').delete().eq('notebook_id', nb).eq('collection', c).eq('id', id);
      if (error) throw { code: 'unavailable', message: error.message };
    };
    const docRef = (c, id) => ({
      id, path: c + '/' + id,
      get: async () => { await load(); return snapDoc(c, id); },
      set: data => write(c, id, JSON.parse(JSON.stringify(data))),
      update: async data => { await load(); const cur = col(c).get(id) || {}; return write(c, id, { ...cur, ...JSON.parse(JSON.stringify(data)) }); },
      delete: () => del(c, id),
      onSnapshot: (next, err) => { const m = docSubs.get(c) || new Map(); docSubs.set(c, m); const arr = m.get(id) || []; arr.push(next); m.set(id, arr);
        load().then(() => next(snapDoc(c, id))).catch(e => err && err(e)); return () => { m.set(id, (m.get(id)||[]).filter(f => f !== next)); }; }
    });
    return {
      collection: c => ({ path: c,
        doc: id => docRef(c, id || ('d' + Date.now().toString(36) + Math.random().toString(36).slice(2,7))),
        onSnapshot: (next, err) => { const arr = colSubs.get(c) || []; arr.push(next); colSubs.set(c, arr);
          load().then(() => next(snapCol(c))).catch(e => err && err(e)); return () => colSubs.set(c, (colSubs.get(c)||[]).filter(f => f !== next)); },
        get: async () => { await load(); return snapCol(c); } }),
      doc: path => { const [c, id] = path.split('/'); return docRef(c, id); }
    };
  }

  /* ---------- Spotify + IA through Vercel functions ---------- */
  const authHeader = async () => { const { data } = await sb.auth.getSession(); return data.session ? { Authorization: 'Bearer ' + data.session.access_token } : {}; };
  const mcpShim = { callTool: async (server, tool, input) => {
    const r = await fetch('/api/spotify-search?q=' + encodeURIComponent(input.prompt || ''), { headers: await authHeader() });
    if (r.status === 429) throw { code: 'rate_limited' };
    if (!r.ok) throw { code: 'upstream_error' };
    return { payload: await r.json() };
  } };
  const sampleShim = async () => { throw { code: 'unsupported' }; };
  sampleShim.json = async (prompt) => {
    const r = await fetch('/api/interpret', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) }, body: JSON.stringify({ prompt }) });
    if (r.status === 429) throw { code: 'rate_limited' };
    if (!r.ok) throw { code: 'upstream_error' };
    return (await r.json()).json;
  };

  window.claude = { use: async name => {
    if (name === 'db') return dbReady;
    if (name === 'mcp'){ await dbReady; return features.spotify ? mcpShim : null; }
    if (name === 'sample'){ await dbReady; return features.ai ? sampleShim : null; }
    return null;
  } };

  function bootFail(e){ console.error(e); show(`${brand}<h2>Não consegui abrir seu caderno</h2><p>Confira a internet e tente de novo.</p><button class="btn primary" type="button" onclick="location.reload()">Tentar de novo</button>`); }
  /* ---------- boot ---------- */
  if (!sb){ document.addEventListener('DOMContentLoaded', () => show(`${brand}<h2>Configuração pendente</h2><p>Falta conectar o banco (config.js).</p>`)); return; }
  sb.auth.onAuthStateChange((ev, s) => {
    if (ev === 'SIGNED_IN' && !session && s){ session = s; loadMe().catch(bootFail); }
    if (ev === 'SIGNED_OUT'){ session = null; }
  });
  sb.auth.getSession().then(({ data }) => { if (data.session){ session = data.session; loadMe().catch(bootFail); } else showLogin(inviteToken ? 'up' : 'in'); });
})();
