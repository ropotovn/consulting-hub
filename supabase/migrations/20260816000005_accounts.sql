-- ============================================================
-- stabs · accounts layer: usernames, notifications, audit logs
-- ============================================================

-- 1. username on profiles (for @mentions, like Telegram/Slack)
alter table public.profiles add column if not exists username text;
create unique index if not exists profiles_username_key
  on public.profiles (lower(username)) where username is not null;

-- capture username from signup metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    lower(new.raw_user_meta_data ->> 'username')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        username = coalesce(excluded.username, public.profiles.username),
        updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 2. notifications — per-user, per-workspace
-- ============================================================
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  type         text not null check (type in ('assign','mention','comment','status','overdue')),
  entity_type  text check (entity_type in ('task','note')),
  entity_id    text,
  entity_title text,
  actor_id     uuid references auth.users (id) on delete set null,
  actor_name   text,
  message      text,
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists notif_user_idx on public.notifications (user_id, read, created_at desc);
create index if not exists notif_ws_idx   on public.notifications (workspace_id);

alter table public.notifications enable row level security;

-- a user sees only their own notifications
create policy "notif_select_own" on public.notifications
  for select using (user_id = auth.uid());
create policy "notif_update_own" on public.notifications
  for update using (user_id = auth.uid());
create policy "notif_delete_own" on public.notifications
  for delete using (user_id = auth.uid());

-- creating a notification FOR someone else goes through this SECURITY DEFINER
-- RPC (so a member can notify a teammate without bypassing RLS)
create or replace function public.create_notification(
  p_workspace_id uuid,
  p_user_id      uuid,
  p_type         text,
  p_entity_type  text default null,
  p_entity_id    text default null,
  p_entity_title text default null,
  p_actor_id     uuid default null,
  p_actor_name   text default null,
  p_message      text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Not a member of this workspace';
  end if;
  insert into public.notifications
    (workspace_id, user_id, type, entity_type, entity_id, entity_title, actor_id, actor_name, message)
  values
    (p_workspace_id, p_user_id, p_type, p_entity_type, p_entity_id, p_entity_title, p_actor_id, p_actor_name, p_message);
end;
$$;

-- ============================================================
-- 3. audit logs — who changed what, per workspace
-- ============================================================
create table if not exists public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid references auth.users (id) on delete set null,
  user_name    text,
  entity_type  text not null,   -- 'tasks' | 'notes' | 'boards'
  entity_id    text,
  action       text not null,   -- 'insert' | 'update' | 'delete'
  meta         jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists audit_ws_idx     on public.audit_logs (workspace_id, created_at desc);
create index if not exists audit_entity_idx on public.audit_logs (workspace_id, entity_type, entity_id);

alter table public.audit_logs enable row level security;

create policy "audit_select_member" on public.audit_logs
  for select using (public.is_workspace_member(workspace_id));

-- auto-log every task/note/board change. Runs as definer (bypasses RLS) but
-- auth.uid() still reflects the caller (null = service-role/system).
create or replace function public.audit_data_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
  uid   uuid := auth.uid();
  uname text;
  eid   text;
begin
  if tg_op = 'DELETE' then
    ws_id := old.workspace_id; eid := old.id;
  else
    ws_id := new.workspace_id; eid := new.id;
  end if;

  select full_name into uname from public.profiles where id = uid;

  insert into public.audit_logs (workspace_id, user_id, user_name, entity_type, entity_id, action, meta)
  values (
    ws_id, uid, coalesce(uname, 'system'),
    tg_table_name, eid, lower(tg_op),
    case
      when tg_op = 'UPDATE' then jsonb_build_object(
        'changed_keys',
        coalesce(
          (select jsonb_agg(k) from jsonb_object_keys(old.data) k
           where (old.data -> k) is distinct from (new.data -> k)),
          '[]'::jsonb
        )
      )
      else '{}'::jsonb
    end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists tasks_audit on public.tasks;
create trigger tasks_audit after insert or update or delete on public.tasks
  for each row execute function public.audit_data_change();

drop trigger if exists notes_audit on public.notes;
create trigger notes_audit after insert or update or delete on public.notes
  for each row execute function public.audit_data_change();

drop trigger if exists boards_audit on public.boards;
create trigger boards_audit after insert or update or delete on public.boards
  for each row execute function public.audit_data_change();

-- ============================================================
-- grants
-- ============================================================
grant all on public.notifications to authenticated;
grant all on public.audit_logs to authenticated;
grant execute on function public.create_notification(uuid, uuid, text, text, text, text, uuid, text, text) to authenticated;
