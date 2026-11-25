create table if not exists public.budget_category_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  category text not null check (char_length(category) between 1 and 60),
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, month, category)
);

alter table public.budget_category_status enable row level security;

create policy "Users manage their own budget category status"
  on public.budget_category_status for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.budget_category_status to authenticated;
