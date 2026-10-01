-- Tira as funções de checagem de membro da API pública (schema private).
create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.is_member(uuid) set schema private;
alter function public.is_owner(uuid) set schema private;
alter function public.shares_notebook(uuid) set schema private;

create or replace function private.is_member(nb uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.notebook_members where notebook_id = nb and user_id = auth.uid());
$$;
create or replace function private.is_owner(nb uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.notebook_members where notebook_id = nb and user_id = auth.uid() and role = 'owner');
$$;
create or replace function private.shares_notebook(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.notebook_members a join public.notebook_members b on a.notebook_id = b.notebook_id
    where a.user_id = auth.uid() and b.user_id = other);
$$;
