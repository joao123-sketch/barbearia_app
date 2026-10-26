-- A tela de cadastro mostra a mensalidade antes de a pessoa ter conta (só o valor, nada mais).
create or replace function public.get_monthly_fee() returns numeric
language sql stable security definer set search_path = public as $$
  select monthly_fee from public.platform_settings where id = 1
$$;

grant execute on function public.get_monthly_fee() to anon, authenticated;
