-- Convites nos dois sentidos:
--  'join'    (aluno convida professor): quem aceita entra no caderno do aluno como professor.
--  'connect' (professor convida aluno): quem aceita (o aluno) adiciona o professor ao próprio caderno.
alter table public.invites add column if not exists kind text not null default 'join';
alter table public.invites drop constraint if exists invites_kind_check;
alter table public.invites add constraint invites_kind_check check (kind in ('join','connect'));
alter table public.invites alter column notebook_id drop not null;
alter table public.invites drop constraint if exists invites_kind_nb;
alter table public.invites add constraint invites_kind_nb check ((kind = 'join' and notebook_id is not null) or (kind = 'connect' and notebook_id is null));
create index if not exists invites_created_by_idx on public.invites(created_by);

drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites for select to authenticated
  using (created_by = (select auth.uid()) or private.is_owner(notebook_id));
drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites for insert to authenticated
  with check (created_by = (select auth.uid()) and (
    (kind = 'join' and private.is_owner(notebook_id)) or (kind = 'connect' and notebook_id is null)));
drop policy if exists invites_delete on public.invites;
create policy invites_delete on public.invites for delete to authenticated
  using (created_by = (select auth.uid()) or private.is_owner(notebook_id));

drop function if exists public.invite_info(text);
create function public.invite_info(t text)
returns table (notebook_name text, owner_name text, accepted boolean, kind text, inviter_name text)
language sql stable security definer set search_path = public as $$
  select coalesce(n.name, ''), p.name, i.accepted_by is not null, i.kind, c.name
  from invites i
  left join notebooks n on n.id = i.notebook_id
  left join profiles p on p.id = n.owner_id
  left join profiles c on c.id = i.created_by
  where i.token = t;
$$;
revoke execute on function public.invite_info(text) from public;
grant execute on function public.invite_info(text) to anon, authenticated;

create or replace function public.accept_invite(t text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv invites%rowtype; nb uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into inv from invites where token = t for update;
  if not found then raise exception 'invite_not_found'; end if;
  if inv.accepted_by is not null and inv.accepted_by <> auth.uid() then raise exception 'invite_used'; end if;
  if inv.accepted_by is null and inv.created_at < now() - interval '14 days' then raise exception 'invite_expired'; end if;
  if inv.created_by = auth.uid() then raise exception 'invite_self'; end if;
  if inv.kind = 'connect' then
    select id into nb from notebooks where owner_id = auth.uid() order by created_at limit 1;
    if nb is null then raise exception 'no_notebook'; end if;
    insert into notebook_members (notebook_id, user_id, role) values (nb, inv.created_by, 'teacher')
      on conflict (notebook_id, user_id) do nothing;
  else
    nb := inv.notebook_id;
    insert into notebook_members (notebook_id, user_id, role) values (nb, auth.uid(), inv.role)
      on conflict (notebook_id, user_id) do nothing;
  end if;
  update invites set accepted_by = auth.uid(), accepted_at = now() where token = t and accepted_by is null;
  return nb;
end $$;
revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;
