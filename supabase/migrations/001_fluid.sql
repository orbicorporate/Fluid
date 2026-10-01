-- Fluid: cadernos de violão compartilhados entre aluno e professor.
-- Cada caderno guarda documentos JSON (músicas, aulas, progresso, pastilhas, recordes)
-- na tabela items. Quem é membro do caderno lê e escreve tudo.

-- Perfis --------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text,
  created_at timestamptz not null default now()
);

-- Cadernos e membros -------------------------------------------------------
create table if not exists public.notebooks (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Meu caderno',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.notebook_members (
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','teacher')),
  created_at timestamptz not null default now(),
  primary key (notebook_id, user_id)
);
create index if not exists notebook_members_user_idx on public.notebook_members(user_id);

-- Documentos do caderno ------------------------------------------------------
create table if not exists public.items (
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  collection text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (notebook_id, collection, id)
);

-- Convites ---------------------------------------------------------------------
create table if not exists public.invites (
  token text primary key default replace(gen_random_uuid()::text, '-', ''),
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  role text not null default 'teacher' check (role in ('teacher')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz
);
create index if not exists invites_notebook_idx on public.invites(notebook_id);
create index if not exists notebooks_owner_idx on public.notebooks(owner_id);

-- Funções de acesso ------------------------------------------------------------
create or replace function public.is_member(nb uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from notebook_members where notebook_id = nb and user_id = auth.uid());
$$;

create or replace function public.is_owner(nb uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from notebook_members where notebook_id = nb and user_id = auth.uid() and role = 'owner');
$$;

create or replace function public.shares_notebook(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from notebook_members a join notebook_members b on a.notebook_id = b.notebook_id
    where a.user_id = auth.uid() and b.user_id = other);
$$;

-- Novo usuário: perfil + caderno próprio -------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare nb uuid; nm text;
begin
  nm := coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1));
  insert into profiles (id, name, email) values (new.id, nm, new.email) on conflict (id) do nothing;
  insert into notebooks (name, owner_id) values ('Caderno de ' || nm, new.id) returning id into nb;
  insert into notebook_members (notebook_id, user_id, role) values (nb, new.id, 'owner');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Convite: ver quem convidou (antes do login) e aceitar -------------------------
create or replace function public.invite_info(t text)
returns table (notebook_name text, owner_name text, accepted boolean)
language sql stable security definer set search_path = public as $$
  select n.name, p.name, i.accepted_by is not null
  from invites i join notebooks n on n.id = i.notebook_id left join profiles p on p.id = n.owner_id
  where i.token = t;
$$;

create or replace function public.accept_invite(t text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv invites%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into inv from invites where token = t for update;
  if not found then raise exception 'invite_not_found'; end if;
  if inv.accepted_by is not null and inv.accepted_by <> auth.uid() then raise exception 'invite_used'; end if;
  if inv.accepted_by is null and inv.created_at < now() - interval '14 days' then raise exception 'invite_expired'; end if;
  insert into notebook_members (notebook_id, user_id, role) values (inv.notebook_id, auth.uid(), inv.role)
    on conflict (notebook_id, user_id) do nothing;
  update invites set accepted_by = auth.uid(), accepted_at = now() where token = t and accepted_by is null;
  return inv.notebook_id;
end $$;

create or replace function public.items_stamp() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_by := auth.uid(); new.updated_at := now(); return new; end $$;
drop trigger if exists items_stamp on public.items;
create trigger items_stamp before insert or update on public.items for each row execute function public.items_stamp();

revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.is_owner(uuid) from public, anon;
revoke execute on function public.shares_notebook(uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.items_stamp() from public, anon, authenticated;
revoke execute on function public.invite_info(text) from public;
revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.is_owner(uuid) to authenticated;
grant execute on function public.shares_notebook(uuid) to authenticated;
grant execute on function public.invite_info(text) to anon, authenticated;
grant execute on function public.accept_invite(text) to authenticated;

-- RLS -------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.notebooks enable row level security;
alter table public.notebook_members enable row level security;
alter table public.items enable row level security;
alter table public.invites enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_notebook(id));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists notebooks_select on public.notebooks;
create policy notebooks_select on public.notebooks for select to authenticated
  using (public.is_member(id));
drop policy if exists notebooks_update on public.notebooks;
create policy notebooks_update on public.notebooks for update to authenticated
  using (public.is_owner(id)) with check (public.is_owner(id));

drop policy if exists members_select on public.notebook_members;
create policy members_select on public.notebook_members for select to authenticated
  using (public.is_member(notebook_id));
drop policy if exists members_delete on public.notebook_members;
create policy members_delete on public.notebook_members for delete to authenticated
  using (role <> 'owner' and (public.is_owner(notebook_id) or user_id = (select auth.uid())));

drop policy if exists items_all on public.items;
create policy items_all on public.items for all to authenticated
  using (public.is_member(notebook_id)) with check (public.is_member(notebook_id));


drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites for select to authenticated
  using (public.is_owner(notebook_id));
drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites for insert to authenticated
  with check (public.is_owner(notebook_id) and created_by = (select auth.uid()));
drop policy if exists invites_delete on public.invites;
create policy invites_delete on public.invites for delete to authenticated
  using (public.is_owner(notebook_id));

-- Tempo real para os documentos do caderno ----------------------------------------------
alter table public.items replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.items;
exception when duplicate_object then null; end $$;
