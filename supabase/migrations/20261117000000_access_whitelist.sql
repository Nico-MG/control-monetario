create table if not exists public.allowed_users (
  email text primary key check (email = lower(email) and position('@' in email) > 1),
  username text not null check (
    char_length(username) between 3 and 60
    and username = btrim(username)
    and username !~ '[[:cntrl:]]'
  ),
  username_key text generated always as (lower(username)) stored,
  created_at timestamptz not null default now()
);

create unique index if not exists allowed_users_username_key_idx
  on public.allowed_users (username_key);

alter table public.allowed_users enable row level security;
revoke all on table public.allowed_users from anon, authenticated;
grant select on table public.allowed_users to service_role;

create or replace function public.enforce_auth_email_whitelist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.allowed_users allowed
    where allowed.email = lower(new.email)
      and lower(allowed.username) = lower(coalesce(new.raw_user_meta_data ->> 'username', ''))
  ) then
    raise exception 'This email is not authorized to register.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_auth_email_whitelist() from public, anon, authenticated;

create trigger enforce_auth_email_whitelist
  before insert on auth.users
  for each row execute function public.enforce_auth_email_whitelist();

create or replace function public.is_whitelisted_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users auth_user
    join public.allowed_users allowed on allowed.email = lower(auth_user.email)
    where auth_user.id = (select auth.uid())
  );
$$;

revoke all on function public.is_whitelisted_user() from public, anon;
grant execute on function public.is_whitelisted_user() to authenticated;

drop policy if exists "Users manage their own transactions" on public.transactions;
create policy "Whitelisted users manage their own transactions"
  on public.transactions for all
  using ((select auth.uid()) = user_id and (select public.is_whitelisted_user()))
  with check ((select auth.uid()) = user_id and (select public.is_whitelisted_user()));

drop policy if exists "Users manage their own budgets" on public.budgets;
create policy "Whitelisted users manage their own budgets"
  on public.budgets for all
  using ((select auth.uid()) = user_id and (select public.is_whitelisted_user()))
  with check ((select auth.uid()) = user_id and (select public.is_whitelisted_user()));

drop policy if exists "Users manage their own savings goals" on public.savings_goals;
create policy "Whitelisted users manage their own savings goals"
  on public.savings_goals for all
  using ((select auth.uid()) = user_id and (select public.is_whitelisted_user()))
  with check ((select auth.uid()) = user_id and (select public.is_whitelisted_user()));

drop policy if exists "Users manage their own categories" on public.categories;
create policy "Whitelisted users manage their own categories"
  on public.categories for all
  using ((select auth.uid()) = user_id and (select public.is_whitelisted_user()))
  with check ((select auth.uid()) = user_id and (select public.is_whitelisted_user()));
