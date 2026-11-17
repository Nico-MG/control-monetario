alter table public.allowed_users
  drop constraint if exists allowed_users_username_check;

alter table public.allowed_users
  drop constraint if exists allowed_users_username_key;

alter table public.allowed_users
  add constraint allowed_users_username_check check (
    char_length(username) between 3 and 60
    and username = btrim(username)
    and username !~ '[[:cntrl:]]'
  );

alter table public.allowed_users
  add column if not exists username_key text generated always as (lower(username)) stored;

create unique index if not exists allowed_users_username_key_idx
  on public.allowed_users (username_key);

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
