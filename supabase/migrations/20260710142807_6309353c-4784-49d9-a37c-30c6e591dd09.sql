do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'manager', 'petugas', 'viewer');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, anon;

create or replace function public.get_user_roles(_user_id uuid)
returns public.app_role[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(role order by role), array[]::public.app_role[])
  from public.user_roles where user_id = _user_id
$$;
grant execute on function public.get_user_roles(uuid) to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_select_admin" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_self" on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "user_roles_select_own" on public.user_roles;
drop policy if exists "user_roles_select_admin" on public.user_roles;
drop policy if exists "user_roles_admin_write" on public.user_roles;
create policy "user_roles_select_own" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "user_roles_select_admin" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "user_roles_admin_write" on public.user_roles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, 'viewer')
  on conflict (user_id, role) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();