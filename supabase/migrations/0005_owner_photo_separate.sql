-- A logo do negócio e a foto da equipe são coisas diferentes: o cadastro não copia mais a logo para o responsável.
create or replace function public.register_barbershop(p jsonb, p_team text[] default '{}')
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_phone text := public.normalize_phone(p->>'phone_whatsapp');
  v_fee numeric;
  v_status text := 'trial';
  v_until date := public.today_br() + 20;
  v_shop uuid;
  v_member text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select email into v_email from auth.users where id = v_user;

  if exists (select 1 from public.barbershops where owner_id = v_user) then
    raise exception 'account_already_has_business';
  end if;
  if exists (select 1 from public.barbershops where phone_whatsapp = v_phone) then
    raise exception 'phone_already_registered';
  end if;

  if exists (select 1 from public.trial_history where phone = v_phone) then
    v_status := 'pending';
    v_until := public.today_br() - 1;
  else
    insert into public.trial_history (phone, first_shop_name) values (v_phone, p->>'name');
  end if;

  select monthly_fee into v_fee from public.platform_settings where id = 1;

  insert into public.barbershops (
    owner_id, business_type, name, slug, owner_name, owner_email, slogan, logo_url, phone_whatsapp,
    street, number, neighborhood, city, state, reference_point, address, instagram, style_preset,
    monthly_fee, subscription_status, next_billing_date
  ) values (
    v_user, p->>'business_type', p->>'name', p->>'slug', p->>'owner_name', v_email, p->>'slogan', p->>'logo_url', v_phone,
    p->>'street', p->>'number', p->>'neighborhood', p->>'city', upper(p->>'state'), p->>'reference_point',
    p->>'address', p->>'instagram', coalesce(p->>'style_preset', 'neutro'),
    v_fee, v_status, v_until
  ) returning id into v_shop;

  insert into public.barbers (barbershop_id, name, role)
  values (v_shop, coalesce(nullif(trim(p->>'owner_name'), ''), 'Responsável'), 'Responsável');

  foreach v_member in array coalesce(p_team, '{}') loop
    if length(trim(v_member)) > 0 then
      insert into public.barbers (barbershop_id, name, role) values (v_shop, trim(v_member), 'Profissional');
    end if;
  end loop;

  return v_shop;
end $$;

-- Cargo inicial gravado sem acento nas contas já criadas
update public.barbers set role = 'Responsável' where role = 'Responsavel';
