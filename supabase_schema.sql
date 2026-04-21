create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists projects_user_name_unique on public.projects (user_id, name);

create table if not exists public.project_state (
  project_id uuid primary key references public.projects (id) on delete cascade,
  user_id uuid not null default auth.uid(),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null default auth.uid(),
  name text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists snapshots_project_created_at on public.snapshots (project_id, created_at desc);

alter table if exists public.projects add column if not exists user_id uuid;
alter table if exists public.projects alter column user_id set default auth.uid();

alter table if exists public.project_state add column if not exists user_id uuid;
alter table if exists public.project_state alter column user_id set default auth.uid();

alter table if exists public.snapshots add column if not exists user_id uuid;
alter table if exists public.snapshots alter column user_id set default auth.uid();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_project_state_updated_at on public.project_state;
create trigger trg_project_state_updated_at
before update on public.project_state
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.project_state enable row level security;
alter table public.snapshots enable row level security;

drop policy if exists projects_select_own on public.projects;
create policy projects_select_own
on public.projects
for select
using (user_id = auth.uid());

drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own
on public.projects
for insert
with check (user_id = auth.uid());

drop policy if exists projects_update_own on public.projects;
create policy projects_update_own
on public.projects
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists projects_delete_own on public.projects;
create policy projects_delete_own
on public.projects
for delete
using (user_id = auth.uid());

drop policy if exists project_state_select_own on public.project_state;
create policy project_state_select_own
on public.project_state
for select
using (
  user_id = auth.uid()
  and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);

drop policy if exists project_state_insert_own on public.project_state;
create policy project_state_insert_own
on public.project_state
for insert
with check (
  user_id = auth.uid()
  and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);

drop policy if exists project_state_update_own on public.project_state;
create policy project_state_update_own
on public.project_state
for update
using (
  user_id = auth.uid()
  and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
)
with check (
  user_id = auth.uid()
  and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);

drop policy if exists project_state_delete_own on public.project_state;
create policy project_state_delete_own
on public.project_state
for delete
using (
  user_id = auth.uid()
  and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);

drop policy if exists snapshots_select_own on public.snapshots;
create policy snapshots_select_own
on public.snapshots
for select
using (
  user_id = auth.uid()
  and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);

drop policy if exists snapshots_insert_own on public.snapshots;
create policy snapshots_insert_own
on public.snapshots
for insert
with check (
  user_id = auth.uid()
  and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);

drop policy if exists snapshots_update_own on public.snapshots;
create policy snapshots_update_own
on public.snapshots
for update
using (
  user_id = auth.uid()
  and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
)
with check (
  user_id = auth.uid()
  and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);

drop policy if exists snapshots_delete_own on public.snapshots;
create policy snapshots_delete_own
on public.snapshots
for delete
using (
  user_id = auth.uid()
  and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);
