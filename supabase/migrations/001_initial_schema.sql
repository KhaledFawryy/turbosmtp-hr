-- ═══════════════════════════════════════════════════════════════════════════
-- turboSMTP HR — Supabase Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. PROFILES ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  name        text not null,
  role        text not null,
  shift       text not null,
  phone       text,
  color       text default '#6366f1',
  is_admin    boolean default false,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;

-- Everyone can read all profiles (needed for schedule/leave views)
create policy "profiles: anyone authenticated can read"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- Each user can update only their own profile
create policy "profiles: own row update"
  on public.profiles for update
  using (auth.uid() = id);

-- ─── 2. LEAVE BALANCES ───────────────────────────────────────────────────────
create table if not exists public.leave_balances (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references public.profiles(id) on delete cascade unique,
  annual_total        int default 21,
  annual_used         int default 0,
  sick_total          int default 6,
  sick_used           int default 0,
  public_total        int default 6,
  public_used         int default 0,
  updated_at          timestamptz default now()
);
alter table public.leave_balances enable row level security;

create policy "balances: authenticated can read all"
  on public.leave_balances for select
  using (auth.role() = 'authenticated');

create policy "balances: admin can update all"
  on public.leave_balances for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ─── 3. LEAVE REQUESTS ───────────────────────────────────────────────────────
create table if not exists public.leave_requests (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.profiles(id) on delete cascade,
  type         text not null check (type in ('annual','sick','public')),
  start_date   date not null,
  end_date     date not null,
  days         int not null,
  status       text default 'pending' check (status in ('pending','approved','rejected')),
  reason       text,
  submitted_at timestamptz default now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid references public.profiles(id)
);
alter table public.leave_requests enable row level security;

-- Agents see their own requests; admins see all
create policy "requests: agent sees own, admin sees all"
  on public.leave_requests for select
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "requests: agent can insert own"
  on public.leave_requests for insert
  with check (auth.uid() = user_id);

-- Only admins can update (approve/reject)
create policy "requests: admin can update"
  on public.leave_requests for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ─── 4. SCHEDULE ─────────────────────────────────────────────────────────────
create table if not exists public.schedule (
  id        uuid default gen_random_uuid() primary key,
  date      date not null,
  user_id   uuid references public.profiles(id) on delete cascade,
  shift     text not null,
  unique(date, user_id)
);
alter table public.schedule enable row level security;

create policy "schedule: authenticated can read"
  on public.schedule for select
  using (auth.role() = 'authenticated');

create policy "schedule: admin can insert/update/delete"
  on public.schedule for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ─── 5. NOTIFICATIONS LOG ────────────────────────────────────────────────────
create table if not exists public.notifications (
  id           uuid default gen_random_uuid() primary key,
  leave_req_id uuid references public.leave_requests(id) on delete set null,
  message      text,
  sent_at      timestamptz default now(),
  sent_by      uuid references public.profiles(id),
  teams_status text default 'queued' check (teams_status in ('queued','sent','failed'))
);
alter table public.notifications enable row level security;

create policy "notifications: admin can read/insert"
  on public.notifications for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ─── 6. REALTIME ─────────────────────────────────────────────────────────────
-- Enable realtime on key tables so the UI updates live for all users
alter publication supabase_realtime add table public.leave_requests;
alter publication supabase_realtime add table public.schedule;
alter publication supabase_realtime add table public.notifications;

-- ─── 7. HELPER FUNCTION — update balance on approval ─────────────────────────
create or replace function public.apply_leave_balance()
returns trigger language plpgsql security definer as $$
begin
  -- Only fire when status changes TO 'approved'
  if new.status = 'approved' and old.status != 'approved' then
    if new.type = 'annual' then
      update public.leave_balances
        set annual_used = annual_used + new.days, updated_at = now()
        where user_id = new.user_id;
    elsif new.type = 'sick' then
      update public.leave_balances
        set sick_used = sick_used + new.days, updated_at = now()
        where user_id = new.user_id;
    elsif new.type = 'public' then
      update public.leave_balances
        set public_used = public_used + new.days, updated_at = now()
        where user_id = new.user_id;
    end if;
  end if;
  -- Reverse if changed FROM 'approved' to 'rejected'
  if new.status = 'rejected' and old.status = 'approved' then
    if new.type = 'annual' then
      update public.leave_balances
        set annual_used = greatest(0, annual_used - new.days), updated_at = now()
        where user_id = new.user_id;
    elsif new.type = 'sick' then
      update public.leave_balances
        set sick_used = greatest(0, sick_used - new.days), updated_at = now()
        where user_id = new.user_id;
    elsif new.type = 'public' then
      update public.leave_balances
        set public_used = greatest(0, public_used - new.days), updated_at = now()
        where user_id = new.user_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger on_leave_status_change
  after update on public.leave_requests
  for each row execute function public.apply_leave_balance();

-- ─── 8. AUTO-CREATE PROFILE + BALANCE ON SIGNUP ──────────────────────────────
-- This runs automatically when a new user signs up via Supabase Auth
-- You still need to manually set name/role/shift/is_admin after creation
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, role, shift, color, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'L1 Support Agent'),
    coalesce(new.raw_user_meta_data->>'shift', 'Morning (8-4)'),
    coalesce(new.raw_user_meta_data->>'color', '#6366f1'),
    coalesce((new.raw_user_meta_data->>'is_admin')::boolean, false)
  );
  insert into public.leave_balances (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
