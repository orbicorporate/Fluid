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

  let inviteErr = '', inviteOk = false;
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
  .fx-invite{display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:20px;background:var(--glass,var(--surface));border:1px solid var(--glassEdgeSoft,var(--line));border-top-color:var(--glassEdge,var(--line))}
  .fx-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:999px;background:var(--glass2,var(--surface2));border:1px solid var(--line)}
  .fx-seg button{height:38px;border:0;border-radius:999px;background:transparent;font-size:13px;font-weight:600;color:var(--muted);padding:0 8px}
  .fx-seg button[aria-pressed="true"]{background:var(--accent);color:var(--onAccent);box-shadow:0 6px 16px -6px var(--glow)}
  .fx-share{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  .fx-share .btn{flex:1;text-decoration:none}
  .fx-wa{background:#25D366!important;color:#fff!important;border-color:transparent!important}
  .fx-note{margin-top:8px!important;font-size:12.5px!important}
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
  const brand = `<div class="fx-brand"><div class="brand-orb" aria-hidden="true"><svg class="brand-ico fl" viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="flBgd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1C0B06"/><stop offset=".5" stop-color="#0D0504"/><stop offset=".78" stop-color="#5E1C07"/><stop offset=".94" stop-color="#F06A1A"/><stop offset="1" stop-color="#FFB070"/></linearGradient><linearGradient id="flRimd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A2A0C"/><stop offset=".6" stop-color="#B8420E"/><stop offset="1" stop-color="#FFB46E"/></linearGradient><linearGradient id="flFd" gradientUnits="userSpaceOnUse" x1="0" y1="27" x2="0" y2="70"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#EEF9FF"/><stop offset="1" stop-color="#A9E2FA"/></linearGradient><linearGradient id="flShined" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#FFE3C8" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><radialGradient id="flGlowd" cx=".5" cy="1" r=".75"><stop offset="0" stop-color="#FF8A2A" stop-opacity=".9"/><stop offset="1" stop-color="#FF6A00" stop-opacity="0"/></radialGradient><linearGradient id="flBgl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".62"/><stop offset=".45" stop-color="#F3F4FF" stop-opacity=".22"/><stop offset="1" stop-color="#EDE9FE" stop-opacity=".34"/></linearGradient><linearGradient id="flRiml" x1="0" y1=".5" x2="1" y2=".5"><stop offset="0" stop-color="#34E0BE"/><stop offset=".5" stop-color="#8B5CF6"/><stop offset="1" stop-color="#F43F7E"/><animateTransform attributeName="gradientTransform" type="rotate" from="0 .5 .5" to="360 .5 .5" dur="9s" repeatCount="indefinite"/></linearGradient><linearGradient id="flFl" gradientUnits="userSpaceOnUse" x1="30" y1="62" x2="72" y2="30" spreadMethod="reflect"><stop offset="0" stop-color="#1FC8A8"/><stop offset=".3" stop-color="#3FB8D8"/><stop offset=".62" stop-color="#9A5BE6"/><stop offset="1" stop-color="#E5245E"/><animateTransform attributeName="gradientTransform" type="translate" values="0 0;-26 0;0 0" dur="3.5s" repeatCount="indefinite"/></linearGradient><linearGradient id="flShinel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#FFFFFF" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><radialGradient id="flGlowlA" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#2EE0B8" stop-opacity=".55"/><stop offset="1" stop-color="#2EE0B8" stop-opacity="0"/></radialGradient><radialGradient id="flGlowlB" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#F0457F" stop-opacity=".45"/><stop offset="1" stop-color="#F0457F" stop-opacity="0"/></radialGradient><radialGradient id="flGlowlC" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8B5CF6" stop-opacity=".4"/><stop offset="1" stop-color="#8B5CF6" stop-opacity="0"/></radialGradient><clipPath id="flClipF"><path d="M40.6 27H67.2Q70.6 27 70.6 30.4V34.4Q70.6 39.6 65.4 39.6H33.2Q30.6 39.6 32.2 37.6L38.4 28.6Q39.3 27 40.6 27Z"/><path d="M50.2 45.6H61.2Q64.6 45.6 64.6 49V53.6Q64.6 57.2 61 57.2H50.6Q48.4 57.2 47 59L40.6 67Q38.8 69.2 36 69.2H34Q31 69.2 31 66.4V61Q31 58.2 34 58.2H36.4Q38.6 58.2 39.8 56.7L46.8 47.4Q48.1 45.6 50.2 45.6Z"/></clipPath><clipPath id="flClipBox"><rect x="5" y="5" width="90" height="90" rx="27"/></clipPath><filter id="flBlur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter></defs><g class="fl-box fl-l"><rect x="5" y="5" width="90" height="90" rx="27" fill="url(#flBgl)"/><g clip-path="url(#flClipBox)"><ellipse class="fl-gA" cx="16" cy="92" rx="34" ry="24" fill="url(#flGlowlA)"/><ellipse class="fl-gC" cx="50" cy="100" rx="30" ry="16" fill="url(#flGlowlC)"/><ellipse class="fl-gB" cx="86" cy="88" rx="30" ry="24" fill="url(#flGlowlB)"/><path d="M14 18Q30 8 62 9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".9" filter="url(#flBlur)"/></g></g><g class="fl-box fl-d"><rect x="5" y="5" width="90" height="90" rx="27" fill="url(#flBgd)"/><g clip-path="url(#flClipBox)"><ellipse class="fl-glow" cx="50" cy="100" rx="58" ry="30" fill="url(#flGlowd)"/></g><rect x="5.6" y="5.6" width="88.8" height="88.8" rx="26.4" fill="none" stroke="url(#flRimd)" stroke-width="1.2" opacity=".9"/><rect class="fl-run fl-run-b" x="5.6" y="5.6" width="88.8" height="88.8" rx="26.4" pathLength="100" fill="none" stroke="#FFB070" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="14 86" filter="url(#flBlur)"/><rect class="fl-run" x="5.6" y="5.6" width="88.8" height="88.8" rx="26.4" pathLength="100" fill="none" stroke="#FFE2C4" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="14 86"/></g><g class="fl-f fl-l"><g class="fl-b1"><path d="M40.6 27H67.2Q70.6 27 70.6 30.4V34.4Q70.6 39.6 65.4 39.6H33.2Q30.6 39.6 32.2 37.6L38.4 28.6Q39.3 27 40.6 27Z" fill="url(#flFl)"/></g><g class="fl-b2"><path d="M50.2 45.6H61.2Q64.6 45.6 64.6 49V53.6Q64.6 57.2 61 57.2H50.6Q48.4 57.2 47 59L40.6 67Q38.8 69.2 36 69.2H34Q31 69.2 31 66.4V61Q31 58.2 34 58.2H36.4Q38.6 58.2 39.8 56.7L46.8 47.4Q48.1 45.6 50.2 45.6Z" fill="url(#flFl)"/></g><g clip-path="url(#flClipF)"><rect class="fl-shine" x="-30" y="20" width="22" height="56" fill="url(#flShinel)" transform="skewX(-22)"/></g></g><g class="fl-f fl-d"><g class="fl-b1"><path d="M40.6 27H67.2Q70.6 27 70.6 30.4V34.4Q70.6 39.6 65.4 39.6H33.2Q30.6 39.6 32.2 37.6L38.4 28.6Q39.3 27 40.6 27Z" fill="url(#flFd)"/></g><g class="fl-b2"><path d="M50.2 45.6H61.2Q64.6 45.6 64.6 49V53.6Q64.6 57.2 61 57.2H50.6Q48.4 57.2 47 59L40.6 67Q38.8 69.2 36 69.2H34Q31 69.2 31 66.4V61Q31 58.2 34 58.2H36.4Q38.6 58.2 39.8 56.7L46.8 47.4Q48.1 45.6 50.2 45.6Z" fill="url(#flFd)"/></g><g clip-path="url(#flClipF)"><rect class="fl-shine" x="-30" y="20" width="22" height="56" fill="url(#flShined)" transform="skewX(-22)"/></g></g></svg></div><b>Fluid</b></div>`;
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
    if (/invite_self/.test(m)) return 'Esse convite foi criado por você. Mande o link para a outra pessoa abrir.';
    if (/no_notebook/.test(m)) return 'Sua conta ainda não tem caderno. Recarregue a página e abra o link de novo.';
    if (/invite_expired/.test(m)) return 'Esse convite venceu (vale 14 dias). Peça um novo link.';
    return 'Não deu certo agora. Confira a conexão e tente de novo.';
  };

  /* ---------- auth screens ---------- */
  async function inviteBanner(){
    if (!inviteToken || !sb) return '';
    try { const { data } = await sb.rpc('invite_info', { t: inviteToken }); const r = data && data[0];
      if (r && !r.accepted) return r.kind==='connect'
        ? `<div class="fx-inv">${esc(r.inviter_name||'Seu professor')} quer acompanhar seu caderno de violão no Fluid. Entre ou crie sua conta para aceitar.</div>`
        : `<div class="fx-inv">${esc(r.owner_name||'Um aluno')} convidou você para colaborar no ${esc(r.notebook_name)}. Entre ou crie sua conta para abrir.</div>`;
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
      try { const { data } = await sb.rpc('accept_invite', { t: inviteToken }); if (data){ localStorage.setItem(LSNB, data); inviteOk = true; } }
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
    if (inviteOk && !inviteErr){ inviteOk = false; show(`${brand}<h2>Convite aceito</h2><p>Pronto, vocês estão conectados. Tudo o que um anotar no caderno aparece para o outro na hora. Para trocar de caderno, toque no seu nome no canto da tela.</p><button class="btn primary" type="button" id="fx-close">Abrir o caderno</button>`); over.onclick = e => { if (e.target.closest('#fx-close')) hide(); }; }
    if (inviteErr){ show(`${brand}<h2>Convite</h2><p>${esc(inviteErr)}</p><button class="btn primary" type="button" id="fx-close">Continuar</button>`); over.onclick = e => { if (e.target.closest('#fx-close')) hide(); }; inviteErr = ''; }
  }
  function renderAccBtn(){
    const other = current.role==='teacher';
    accBtn.innerHTML = `<i aria-hidden="true">${esc(initials(me.name))}</i><span>${other ? esc(current.name) : esc(me.name)}</span>`;
    accBtn.setAttribute('aria-label', 'Conta e caderno: ' + current.name);
    accBtn.hidden = false;
  }
  function switchTo(id){ localStorage.setItem(LSNB, id); location.reload(); }

  const ownNotebook = () => notebooks.find(n => n.role==='owner');
  function helpFor(k){ return k==='join'
    ? 'Seu professor abre o link, cria a conta e passa a ver e editar o seu caderno: músicas, aulas e treinos.'
    : 'Para professores: o aluno abre o link, entra com a conta dele e você passa a acompanhar e editar o caderno dele. Ele aparece na sua lista de cadernos.'; }
  function inviteMsg(k, link){ return k==='join'
    ? `Oi! Estou anotando minhas músicas e aulas de violão no Fluid. Abre este link para ver e editar meu caderno comigo: ${link}`
    : `Oi! Vou acompanhar seus treinos de violão pelo Fluid. Abre este link e entra com sua conta para eu ver e anotar as músicas no seu caderno: ${link}`; }
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
      <div class="fx-sec">Convidar para colaborar</div>
      <div class="fx-invite">
        <div class="fx-seg" role="group" aria-label="Quem você quer convidar">
          <button type="button" data-ik="join" aria-pressed="true">Convidar meu professor</button>
          <button type="button" data-ik="connect" aria-pressed="false">Convidar um aluno</button>
        </div>
        <p id="fx-ihelp">${helpFor('join')}</p>
        <div id="fx-invbox">${msg}</div>
        <button class="btn primary" type="button" id="fx-inv">Gerar link de convite</button>
      </div>
      <button class="btn" type="button" id="fx-close">Fechar</button>`);
    let ik = 'join';
    over.onclick = async e => {
      const t = e.target.closest('button'); if (!t){ if (e.target === over) hide(); return; }
      if (t.id==='fx-close') hide();
      if (t.id==='fx-out'){ await sb.auth.signOut(); localStorage.removeItem(LSNB); location.reload(); }
      if (t.dataset.nb && t.dataset.nb !== current.id) switchTo(t.dataset.nb);
      if (t.dataset.rm){ if (t.dataset.armed){ await sb.from('notebook_members').delete().eq('notebook_id', current.id).eq('user_id', t.dataset.rm); showAccount(); } else { t.dataset.armed='1'; t.textContent='Confirmar'; } }
      if (t.dataset.ik){ ik = t.dataset.ik; over.querySelectorAll('[data-ik]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ik===ik))); over.querySelector('#fx-ihelp').textContent = helpFor(ik); over.querySelector('#fx-invbox').innerHTML = ''; const g = over.querySelector('#fx-inv'); g.hidden = false; g.disabled = false; }
      if (t.id==='fx-inv'){
        const own = ownNotebook();
        if (ik==='join' && !own){ over.querySelector('#fx-invbox').innerHTML = `<p class="fx-err">Não encontrei o seu caderno.</p>`; return; }
        t.disabled = true;
        const row = ik==='join' ? { notebook_id: own.id, kind: 'join' } : { kind: 'connect' };
        const { data, error } = await sb.from('invites').insert(row).select('token').single();
        if (error){ t.disabled = false; over.querySelector('#fx-invbox').innerHTML = `<p class="fx-err">${esc(errText(error))}</p>`; return; }
        const link = location.origin + location.pathname + '?convite=' + data.token;
        const text = inviteMsg(ik, link);
        over.querySelector('#fx-invbox').innerHTML = `<div class="fx-copy"><input class="inp" id="fx-invlink" readonly value="${esc(link)}" aria-label="Link de convite"><button class="btn" type="button" id="fx-cp">Copiar</button></div>
          <div class="fx-share"><a class="btn fx-wa" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">Mandar no WhatsApp</a>${navigator.share ? `<button class="btn" type="button" id="fx-sh">Compartilhar</button>` : ''}</div>
          <p class="fx-note">Cada link vale para uma pessoa e vence em 14 dias.</p>`;
        over.querySelector('#fx-invbox').dataset.text = text;
        t.hidden = true;
      }
      if (t.id==='fx-sh'){ try { await navigator.share({ title: 'Convite para o Fluid', text: over.querySelector('#fx-invbox').dataset.text }); } catch(err){} }
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
