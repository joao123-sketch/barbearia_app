-- 1) Ícone do app em PNG quadrado (o celular instala com a logo do negócio)
alter table public.barbershops add column if not exists app_icon text;
grant update (app_icon) on public.barbershops to authenticated;

create or replace view public.public_barbershops as
select
  id, name, slug, business_type, slogan, description, logo_url, banner_url, phone_whatsapp,
  street, number, neighborhood, city, state, reference_point, address, instagram,
  style_preset, blocked_dates,
  (subscription_status <> 'blocked' and next_billing_date >= public.today_br()) as service_active,
  app_icon
from public.barbershops;
grant select on public.public_barbershops to anon, authenticated;

-- 2) Agenda do dono em tempo real: agendamentos novos aparecem na hora
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table public.appointments;
  end if;
end $$;

-- 3) Mensalidade individual: vale já ou só a partir do próximo pagamento
create or replace function public.admin_set_shop_fee(p_shop uuid, p_fee numeric, p_apply_now boolean default false)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  if p_fee <= 0 then raise exception 'invalid_fee'; end if;
  if p_apply_now then
    update public.barbershops set monthly_fee = p_fee, next_monthly_fee = null where id = p_shop;
  else
    update public.barbershops
      set next_monthly_fee = case when p_fee = monthly_fee then null else p_fee end
      where id = p_shop;
  end if;
end $$;

revoke all on function public.admin_set_shop_fee(uuid, numeric, boolean) from public, anon;
grant execute on function public.admin_set_shop_fee(uuid, numeric, boolean) to authenticated;
