-- ============================================================
-- stabs · policy fixes (apply after the foundation migration)
-- ============================================================

-- helper: is the current user owner/admin of this workspace?
create or replace function public.is_workspace_admin(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

grant execute on function public.is_workspace_admin(uuid) to anon, authenticated;

-- invitations: "my invites" must read the email from the JWT — auth.users is
-- not readable from inside an RLS policy expression.
drop policy if exists "inv_select_mine" on public.invitations;
create policy "inv_select_mine" on public.invitations
  for select using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- invitations: scope writes to the workspace the actor actually administers.
drop policy if exists "inv_insert" on public.invitations;
create policy "inv_insert" on public.invitations
  for insert with check (public.is_workspace_admin(workspace_id));

drop policy if exists "inv_update" on public.invitations;
create policy "inv_update" on public.invitations
  for update using (public.is_workspace_admin(workspace_id));

drop policy if exists "inv_delete" on public.invitations;
create policy "inv_delete" on public.invitations
  for delete using (public.is_workspace_admin(workspace_id));

-- workspace_members: remove the self-referential write policies (membership is
-- managed by the on_workspace_created trigger and the accept_invitation RPC).
drop policy if exists "wm_insert" on public.workspace_members;
drop policy if exists "wm_update" on public.workspace_members;
drop policy if exists "wm_delete" on public.workspace_members;
