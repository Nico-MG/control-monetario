alter table public.budgets
  drop constraint if exists budgets_user_id_month_category_key;

alter table public.budgets
  add column if not exists comment text
    check (comment is null or char_length(comment) <= 500);
