create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);

create unique index if not exists categories_user_name_lower_idx
  on public.categories (user_id, lower(name));

insert into public.categories (user_id, name)
select distinct user_id, category
from (
  select user_id, category from public.transactions
  union
  select user_id, category from public.budgets
) existing_categories
on conflict do nothing;

alter table public.categories enable row level security;

create policy "Users manage their own categories"
  on public.categories for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.categories to authenticated;
