-- ============================================================
-- shtab · cloud foundation
-- Accounts, profiles, workspaces, membership, invitations
-- ============================================================
-- Applied via Supabase SQL Editor (paste whole file) or `supabase db push`.
-- Postgres 15+ (gen_random_uuid() is core, no extension needed).

-- ============================================================
-- 1. profiles — public mirror of auth.users (name, avatar, timestamps)
-- ============================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- auto-create a profile row the moment a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2. workspaces — the multi-tenant container
-- ============================================================
create table if not exists public.workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ============================================================
-- 3. workspace_members — many-to-many (a user can be in many workspaces)
-- ============================================================
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null default 'member'
               check (role in ('owner', 'admin', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists wm_user_idx on public.workspace_members (user_id);
create index if not exists wm_ws_idx   on public.workspace_members (workspace_id);

-- auto-add the creator as owner when a workspace is created
create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- ============================================================
-- 4. invitations — email invites into a workspace
-- ============================================================
create table if not exists public.invitations (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email        text not null,
  role         text not null default 'member'
               check (role in ('admin', 'member')),
  token        text not null unique default gen_random_uuid()::text,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'revoked')),
  invited_by   uuid references auth.users (id) on delete set null,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists inv_ws_idx   on public.invitations (workspace_id);
create index if not exists inv_email_idx on public.invitations (lower(email));

-- ============================================================
-- 5. RPCs (SECURITY DEFINER — the only write paths that cross workspace
--    boundaries, so invite-accept and workspace-create stay atomic)
-- ============================================================

-- is the current auth user a member of ws_id?
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

-- create a workspace + auto-add creator as owner (slug-unique safe)
create or replace function public.create_workspace(ws_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text;
  new_slug  text;
  ws_id     uuid;
  i         int := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if ws_name is null or length(trim(ws_name)) = 0 then
    raise exception 'Name is required';
  end if;

  base_slug := lower(regexp_replace(trim(ws_name), '[^a-z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then
    base_slug := 'ws-' || substr(md5(random()::text), 1, 6);
  end if;

  new_slug := base_slug;
  loop
    begin
      insert into public.workspaces (name, slug, created_by)
      values (ws_name, new_slug, auth.uid())
      returning id into ws_id;
      exit;
    exception when unique_violation then
      i := i + 1;
      new_slug := base_slug || '-' || i;
    end;
  end loop;

  return ws_id;
end;
$$;

-- accept an invitation by token (verifies email matches, marks accepted, joins)
create or replace function public.accept_invitation(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv        public.invitations%rowtype;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into inv
  from public.invitations
  where token = invite_token and status = 'pending'
  for update;

  if not found then
    raise exception 'Invitation not found or already used';
  end if;

  if inv.expires_at is not null and inv.expires_at < now() then
    raise exception 'Invitation expired';
  end if;

  select email into user_email from auth.users where id = auth.uid();

  if lower(user_email) <> lower(inv.email) then
    raise exception 'This invitation was sent to a different email address';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (inv.workspace_id, auth.uid(), inv.role)
  on conflict (workspace_id, user_id) do update set role = excluded.role;

  update public.invitations set status = 'accepted' where id = inv.id;

  return inv.workspace_id;
end;
$$;

-- ============================================================
-- 6. Row Level Security
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invitations       enable row level security;

-- profiles: any authenticated user can read basic info (renders names/avatars
-- across workspaces); only the owner can update their own row
create policy "profiles_select" on public.profiles
  for select using (auth.uid() is not null);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- workspaces: members read; creator inserts; owner/admin update; owner delete
create policy "workspaces_select" on public.workspaces
  for select using (public.is_workspace_member(id));
create policy "workspaces_insert" on public.workspaces
  for insert with check (auth.uid() = created_by);
create policy "workspaces_update" on public.workspaces
  for update using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = id and user_id = auth.uid() and role in ('owner', 'admin')
    )
  );
create policy "workspaces_delete" on public.workspaces
  for delete using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = id and user_id = auth.uid() and role = 'owner'
    )
  );

-- workspace_members: members of a workspace can see its roster;
-- owner/admin manage membership (normal invite flow goes through RPCs anyway)
create policy "wm_select" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));
create policy "wm_insert" on public.workspace_members
  for insert with check (
    exists (
      select 1 from public.workspace_members
      where workspace_id = workspace_id and user_id = auth.uid() and role in ('owner', 'admin')
    )
  );
create policy "wm_update" on public.workspace_members
  for update using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = workspace_id and user_id = auth.uid() and role = 'owner'
    )
  );
create policy "wm_delete" on public.workspace_members
  for delete using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = workspace_id and user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- invitations: members of the workspace see all invites;
-- a logged-in user also sees invites addressed to their own email (so they
-- can find and accept an invite before they're a member)
create policy "inv_select_member" on public.invitations
  for select using (public.is_workspace_member(workspace_id));
create policy "inv_select_mine" on public.invitations
  for select using (
    lower(email) = (select lower(email) from auth.users where id = auth.uid())
  );
create policy "inv_insert" on public.invitations
  for insert with check (
    exists (
      select 1 from public.workspace_members
      where workspace_id = workspace_id and user_id = auth.uid() and role in ('owner', 'admin')
    )
  );
create policy "inv_update" on public.invitations
  for update using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = workspace_id and user_id = auth.uid() and role in ('owner', 'admin')
    )
  );
create policy "inv_delete" on public.invitations
  for delete using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = workspace_id and user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- 7. Grants (explicit, even though Supabase default privileges usually cover)
-- ============================================================
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant all on all functions in schema public to authenticated;
grant select on all tables in schema public to anon;
