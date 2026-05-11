-- Create public profiles automatically after Supabase Auth signup.
-- Public signup may request only user or creator. Admin must remain a manual,
-- server-side assignment for beta.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  display_name text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'user');

  if requested_role not in ('user', 'creator') then
    requested_role := 'user';
  end if;

  display_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');

  insert into public.profiles (id, email, display_name, role)
  values (new.id, coalesce(new.email, ''), display_name, requested_role)
  on conflict (id) do nothing;

  if requested_role = 'creator' then
    insert into public.creator_profiles (user_id, public_name)
    values (new.id, coalesce(display_name, split_part(coalesce(new.email, 'Creator'), '@', 1)))
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();
