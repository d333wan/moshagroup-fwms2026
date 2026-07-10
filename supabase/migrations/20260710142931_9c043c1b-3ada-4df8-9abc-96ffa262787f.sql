revoke execute on function public.get_user_roles(uuid) from public, anon;
grant execute on function public.get_user_roles(uuid) to authenticated;