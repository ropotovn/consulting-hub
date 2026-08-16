-- ============================================================
-- stabs · soft-delete for workspaces
-- Delete = mark deleted_at (hidden). Hard-delete after 15 days
-- by the purge job. Restore via support (service_role).
-- ============================================================

alter table public.workspaces add column if not exists deleted_at timestamptz;

-- helper: is the current user a member AND the workspace not deleted?
create or replace function public.is_workspace_active(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    join public.workspaces w on w.id = wm.workspace_id
    where wm.workspace_id = ws_id
      and wm.user_id = auth.uid()
      and w.deleted_at is null
  );
$$;

-- hide soft-deleted workspaces from the member's list
drop policy if exists "workspaces_select" on public.workspaces;
create policy "workspaces_select" on public.workspaces
  for select using (public.is_workspace_active(id));

-- data tables: only ACTIVE members read/write (soft-deleted space is frozen)
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks for select using (public.is_workspace_active(workspace_id));
drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks for insert with check (public.is_workspace_active(workspace_id));
drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks for update using (public.is_workspace_active(workspace_id));
drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks for delete using (public.is_workspace_active(workspace_id));

drop policy if exists "notes_select" on public.notes;
create policy "notes_select" on public.notes for select using (public.is_workspace_active(workspace_id));
drop policy if exists "notes_insert" on public.notes;
create policy "notes_insert" on public.notes for insert with check (public.is_workspace_active(workspace_id));
drop policy if exists "notes_update" on public.notes;
create policy "notes_update" on public.notes for update using (public.is_workspace_active(workspace_id));
drop policy if exists "notes_delete" on public.notes;
create policy "notes_delete" on public.notes for delete using (public.is_workspace_active(workspace_id));

drop policy if exists "boards_select" on public.boards;
create policy "boards_select" on public.boards for select using (public.is_workspace_active(workspace_id));
drop policy if exists "boards_insert" on public.boards;
create policy "boards_insert" on public.boards for insert with check (public.is_workspace_active(workspace_id));
drop policy if exists "boards_update" on public.boards;
create policy "boards_update" on public.boards for update using (public.is_workspace_active(workspace_id));
drop policy if exists "boards_delete" on public.boards;
create policy "boards_delete" on public.boards for delete using (public.is_workspace_active(workspace_id));

-- owner soft-deletes a workspace
create or replace function public.delete_workspace(ws_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Only the workspace owner can delete it';
  end if;
  update public.workspaces set deleted_at = now() where id = ws_id;
end;
$$;
grant execute on function public.delete_workspace(uuid) to authenticated;

-- restore (support only — do NOT grant to authenticated)
create or replace function public.restore_workspace(ws_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.workspaces set deleted_at = null where id = ws_id;
end;
$$;
