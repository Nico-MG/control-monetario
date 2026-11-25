alter table public.categories
  add column if not exists transaction_type text not null default 'expense'
    check (transaction_type in ('income', 'expense')),
  add column if not exists scheme text not null default 'fixed'
    check (scheme in ('fixed', 'variable')),
  add column if not exists is_active boolean not null default true;

update public.categories c
set transaction_type = (
  select t.type
  from public.transactions t
  where t.user_id = c.user_id
    and t.category = c.name
  order by t.date desc, t.created_at desc
  limit 1
)
where exists (
  select 1
  from public.transactions t
  where t.user_id = c.user_id
    and t.category = c.name
);

update public.categories c
set scheme = (
  select b.scheme
  from public.budgets b
  where b.user_id = c.user_id
    and b.category = c.name
  order by b.created_at desc
  limit 1
)
where exists (
  select 1
  from public.budgets b
  where b.user_id = c.user_id
    and b.category = c.name
);

update public.budgets b
set scheme = c.scheme
from public.categories c
where c.user_id = b.user_id
  and c.name = b.category;

alter table public.budgets
  add column if not exists income_percentage numeric(5, 2)
    check (income_percentage is null or income_percentage between 0.01 and 100);

alter table public.budgets
  add constraint budgets_percentage_amount_check
  check (income_percentage is null or amount = 0);

create or replace function public.update_finance_category(
  p_category_id uuid,
  p_name text,
  p_transaction_type text,
  p_scheme text
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  old_name text;
begin
  if char_length(btrim(p_name)) not between 1 and 60
    or p_transaction_type not in ('income', 'expense')
    or p_scheme not in ('fixed', 'variable') then
    raise exception 'Invalid category values';
  end if;

  select c.name
  into old_name
  from public.categories c
  where c.id = p_category_id
    and c.user_id = auth.uid()
  for update;

  if old_name is null then
    raise exception 'Category not found';
  end if;

  if p_transaction_type = 'income' and exists (
    select 1
    from public.budgets b
    where b.user_id = auth.uid()
      and b.category = old_name
  ) then
    raise exception 'A category with budgets cannot be changed to income';
  end if;

  update public.categories
  set name = btrim(p_name),
      transaction_type = p_transaction_type,
      scheme = p_scheme
  where id = p_category_id
    and user_id = auth.uid();

  update public.transactions
  set category = btrim(p_name)
  where user_id = auth.uid()
    and category = old_name;

  update public.budgets
  set category = btrim(p_name),
      scheme = p_scheme
  where user_id = auth.uid()
    and category = old_name;

  update public.budget_category_status
  set category = btrim(p_name)
  where user_id = auth.uid()
    and category = old_name;
end;
$$;

revoke all on function public.update_finance_category(uuid, text, text, text) from public;
grant execute on function public.update_finance_category(uuid, text, text, text) to authenticated;
