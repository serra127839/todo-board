create table if not exists public.shared_state (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

alter table public.shared_state enable row level security;

drop trigger if exists trg_shared_state_updated_at on public.shared_state;
create trigger trg_shared_state_updated_at
before update on public.shared_state
for each row execute function public.set_updated_at();

drop policy if exists shared_state_select_authenticated on public.shared_state;
create policy shared_state_select_authenticated
on public.shared_state
for select
using (auth.role() = 'authenticated');

drop policy if exists shared_state_insert_authenticated on public.shared_state;
create policy shared_state_insert_authenticated
on public.shared_state
for insert
with check (auth.role() = 'authenticated');

drop policy if exists shared_state_update_authenticated on public.shared_state;
create policy shared_state_update_authenticated
on public.shared_state
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
