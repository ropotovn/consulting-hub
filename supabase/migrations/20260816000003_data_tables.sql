-- ============================================================
-- stabs · per-workspace data (tasks, notes, boards)
-- Composite PK (workspace_id, id) so task ids are scoped per workspace
-- and never collide across spaces.
-- ============================================================

create table if not exists public.tasks (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  id          text not null,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table if not exists public.notes (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  id          text not null,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table if not exists public.boards (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  id          text not null,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (workspace_id, id)
);

create index if not exists tasks_ws_idx  on public.tasks  (workspace_id);
create index if not exists notes_ws_idx  on public.notes  (workspace_id);
create index if not exists boards_ws_idx on public.boards (workspace_id);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at before update on public.notes
  for each row execute function public.set_updated_at();

drop trigger if exists boards_set_updated_at on public.boards;
create trigger boards_set_updated_at before update on public.boards
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS — only workspace members touch its data
-- ============================================================
alter table public.tasks  enable row level security;
alter table public.notes  enable row level security;
alter table public.boards enable row level security;

create policy "tasks_select" on public.tasks
  for select using (public.is_workspace_member(workspace_id));
create policy "tasks_insert" on public.tasks
  for insert with check (public.is_workspace_member(workspace_id));
create policy "tasks_update" on public.tasks
  for update using (public.is_workspace_member(workspace_id));
create policy "tasks_delete" on public.tasks
  for delete using (public.is_workspace_member(workspace_id));

create policy "notes_select" on public.notes
  for select using (public.is_workspace_member(workspace_id));
create policy "notes_insert" on public.notes
  for insert with check (public.is_workspace_member(workspace_id));
create policy "notes_update" on public.notes
  for update using (public.is_workspace_member(workspace_id));
create policy "notes_delete" on public.notes
  for delete using (public.is_workspace_member(workspace_id));

create policy "boards_select" on public.boards
  for select using (public.is_workspace_member(workspace_id));
create policy "boards_insert" on public.boards
  for insert with check (public.is_workspace_member(workspace_id));
create policy "boards_update" on public.boards
  for update using (public.is_workspace_member(workspace_id));
create policy "boards_delete" on public.boards
  for delete using (public.is_workspace_member(workspace_id));

grant all on public.tasks, public.notes, public.boards to authenticated;
grant select on public.tasks, public.notes, public.boards to anon;
