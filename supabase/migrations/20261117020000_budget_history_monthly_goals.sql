alter table public.budgets
  add column if not exists notes text check (notes is null or char_length(notes) <= 500);

create table if not exists public.budget_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  budget_id uuid references public.budgets (id) on delete set null,
  month date not null check (extract(day from month) = 1),
  category text not null check (char_length(category) between 1 and 60),
  action text not null check (action in ('created', 'updated', 'deleted')),
  previous_amount bigint,
  amount bigint,
  previous_notes text,
  notes text,
  scheme text not null check (scheme in ('fixed', 'variable')),
  recorded_at timestamptz not null default now()
);

create index if not exists budget_history_user_month_idx
  on public.budget_history (user_id, month, recorded_at desc);

create or replace function public.record_budget_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.budget_history
      (user_id, budget_id, month, category, action, amount, notes, scheme)
    values
      (new.user_id, new.id, new.month, new.category, 'created', new.amount, new.notes, new.scheme);
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.budget_history
      (user_id, budget_id, month, category, action, previous_amount, amount, previous_notes, notes, scheme)
    values
      (new.user_id, new.id, new.month, new.category, 'updated', old.amount, new.amount, old.notes, new.notes, new.scheme);
    return new;
  else
    insert into public.budget_history
      (user_id, budget_id, month, category, action, previous_amount, previous_notes, notes, scheme)
    values
      (old.user_id, null, old.month, old.category, 'deleted', old.amount, old.notes, null, old.scheme);
    return old;
  end if;
end;
$$;

revoke all on function public.record_budget_history() from public, anon, authenticated;

create trigger record_budget_history
  after insert or update or delete on public.budgets
  for each row execute function public.record_budget_history();

create table if not exists public.monthly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  goal_type text not null check (goal_type in ('savings', 'investment')),
  percentage smallint not null check (percentage between 1 and 100),
  saved_amount bigint not null default 0 check (saved_amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, month, goal_type)
);

create index if not exists monthly_goals_user_month_idx
  on public.monthly_goals (user_id, month);

alter table public.budget_history enable row level security;
alter table public.monthly_goals enable row level security;

create policy "Whitelisted users read their own budget history"
  on public.budget_history for select
  using ((select auth.uid()) = user_id and (select public.is_whitelisted_user()));

create policy "Whitelisted users manage their own monthly goals"
  on public.monthly_goals for all
  using ((select auth.uid()) = user_id and (select public.is_whitelisted_user()))
  with check ((select auth.uid()) = user_id and (select public.is_whitelisted_user()));

grant select on public.budget_history to authenticated;
grant select, insert, update, delete on public.monthly_goals to authenticated;

create or replace function public.propagate_category_rename()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.name <> old.name then
    update public.transactions
    set category = new.name
    where user_id = new.user_id and category = old.name;

    update public.budgets
    set category = new.name
    where user_id = new.user_id and category = old.name;
  end if;
  return new;
end;
$$;

revoke all on function public.propagate_category_rename() from public, anon, authenticated;

create trigger propagate_category_rename
  after update of name on public.categories
  for each row execute function public.propagate_category_rename();
