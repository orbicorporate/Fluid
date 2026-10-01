-- Fluid para professores: várias pastas por pessoa, alunos, cobranças e convites por papel.

-- Pastas (cadernos) ------------------------------------------------------------
alter table public.notebooks add column if not exists kind text not null default 'personal';
alter table public.notebooks drop constraint if exists notebooks_kind_check;
alter table public.notebooks add constraint notebooks_kind_check check (kind in ('personal','student'));
alter table public.notebooks add column if not exists color text;

alter table public.notebook_members drop constraint if exists notebook_members_role_check;
alter table public.notebook_members add constraint notebook_members_role_check check (role in ('owner','teacher','student'));

alter table public.invites drop constraint if exists invites_role_check;
alter table public.invites add constraint invites_role_check check (role in ('teacher','student'));

create or replace function public.create_notebook(p_name text, p_kind text default 'personal', p_color text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare nb uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'name_required'; end if;
  if p_kind not in ('personal','student') then raise exception 'bad_kind'; end if;
  insert into notebooks (name, owner_id, kind, color) values (left(trim(p_name), 60), auth.uid(), p_kind, p_color) returning id into nb;
  insert into notebook_members (notebook_id, user_id, role) values (nb, auth.uid(), 'owner');
  return nb;
end $$;

create or replace function public.delete_notebook(nb uuid) returns void
language plpgsql security definer set search_path = public as $$
declare first_nb uuid;
begin
  if not exists (select 1 from notebook_members where notebook_id = nb and user_id = auth.uid() and role = 'owner') then
    raise exception 'not_owner'; end if;
  select id into first_nb from notebooks where owner_id = auth.uid() order by created_at limit 1;
  if first_nb = nb then raise exception 'keep_first'; end if;
  delete from notebooks where id = nb;
end $$;

revoke execute on function public.create_notebook(text, text, text) from public, anon;
revoke execute on function public.delete_notebook(uuid) from public, anon;
grant execute on function public.create_notebook(text, text, text) to authenticated;
grant execute on function public.delete_notebook(uuid) to authenticated;

-- Convites: dizem o papel (professor ou aluno) e não podem ser aceitos por quem criou
drop function if exists public.invite_info(text);
create function public.invite_info(t text)
returns table (notebook_name text, owner_name text, accepted boolean, role text)
language sql stable security definer set search_path = public as $$
  select n.name, coalesce(c.name, p.name), i.accepted_by is not null, i.role
  from invites i join notebooks n on n.id = i.notebook_id
  left join profiles p on p.id = n.owner_id
  left join profiles c on c.id = i.created_by
  where i.token = t;
$$;
revoke execute on function public.invite_info(text) from public;
grant execute on function public.invite_info(text) to anon, authenticated;

create or replace function public.accept_invite(t text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv invites%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into inv from invites where token = t for update;
  if not found then raise exception 'invite_not_found'; end if;
  if inv.accepted_by is not null and inv.accepted_by <> auth.uid() then raise exception 'invite_used'; end if;
  if inv.accepted_by is null and inv.created_at < now() - interval '14 days' then raise exception 'invite_expired'; end if;
  if inv.created_by = auth.uid() then raise exception 'invite_self'; end if;
  insert into notebook_members (notebook_id, user_id, role) values (inv.notebook_id, auth.uid(), inv.role)
    on conflict (notebook_id, user_id) do nothing;
  update invites set accepted_by = auth.uid(), accepted_at = now() where token = t and accepted_by is null;
  return inv.notebook_id;
end $$;
revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

-- Alunos, cobranças e ajustes do professor (só o professor vê) ---------------------
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  phone text, email text, color text,
  lesson_days int[] not null default '{}',
  lesson_time text,
  fee numeric(10,2) not null default 0,
  due_day int not null default 10 check (due_day between 1 and 28),
  start_date date not null default current_date,
  status text not null default 'active' check (status in ('active','paused')),
  notebook_id uuid references public.notebooks(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists students_teacher_idx on public.students(teacher_id);
create index if not exists students_notebook_idx on public.students(notebook_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  period text not null,
  description text,
  due_date date not null,
  amount numeric(10,2) not null default 0,
  paid_at date,
  method text,
  created_at timestamptz not null default now(),
  unique (student_id, period)
);
create index if not exists payments_teacher_idx on public.payments(teacher_id);

create table if not exists public.teacher_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  pix_key text,
  charge_msg text,
  remind_days int not null default 3 check (remind_days between 0 and 15)
);

alter table public.students enable row level security;
alter table public.payments enable row level security;
alter table public.teacher_settings enable row level security;

drop policy if exists students_own on public.students;
create policy students_own on public.students for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()) and (notebook_id is null or private.is_owner(notebook_id)));
drop policy if exists payments_own on public.payments;
create policy payments_own on public.payments for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()) and exists (select 1 from public.students s where s.id = student_id and s.teacher_id = (select auth.uid())));
drop policy if exists settings_own on public.teacher_settings;
create policy settings_own on public.teacher_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
