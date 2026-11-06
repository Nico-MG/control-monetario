create extension if not exists pgcrypto;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null default current_date,
  description text not null check (char_length(description) between 1 and 120),
  category text not null check (char_length(category) between 1 and 60),
  type text not null check (type in ('income', 'expense')),
  amount bigint not null check (amount > 0),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  category text not null check (char_length(category) between 1 and 60),
  amount bigint not null check (amount >= 0),
  scheme text not null default 'fixed' check (scheme in ('fixed', 'variable')),
  created_at timestamptz not null default now(),
  unique (user_id, month, category)
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  target_amount bigint not null check (target_amount > 0),
  saved_amount bigint not null default 0 check (saved_amount >= 0),
  due_date date,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);
create index if not exists budgets_user_month_idx
  on public.budgets (user_id, month);
create index if not exists savings_goals_user_created_idx
  on public.savings_goals (user_id, created_at desc);

alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;

create policy "Users manage their own transactions"
  on public.transactions for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own budgets"
  on public.budgets for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own savings goals"
  on public.savings_goals for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.budgets to authenticated;
grant select, insert, update, delete on public.savings_goals to authenticated;
