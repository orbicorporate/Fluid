-- Página pública do professor e pedidos de aula (leads).
create table if not exists public.teacher_pages (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  title text, bio text, styles text, price text, city text, whatsapp text, color text,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 2 and 80),
  phone text check (phone is null or length(phone) <= 30),
  message text check (message is null or length(message) <= 500),
  seen boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists leads_teacher_idx on public.leads(teacher_id);

alter table public.teacher_pages enable row level security;
alter table public.leads enable row level security;

drop policy if exists pages_read on public.teacher_pages;
create policy pages_read on public.teacher_pages for select to anon, authenticated
  using (published or user_id = (select auth.uid()));
drop policy if exists pages_own on public.teacher_pages;
create policy pages_own on public.teacher_pages for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads for insert to anon, authenticated
  with check (seen = false and exists (select 1 from public.teacher_pages p where p.user_id = teacher_id and p.published));
drop policy if exists leads_own on public.leads;
create policy leads_own on public.leads for select to authenticated using (teacher_id = (select auth.uid()));
drop policy if exists leads_upd on public.leads;
create policy leads_upd on public.leads for update to authenticated using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
drop policy if exists leads_del on public.leads;
create policy leads_del on public.leads for delete to authenticated using (teacher_id = (select auth.uid()));
