-- O teste grátis passa a ser controlado também pelo e-mail: quem já usou o WhatsApp OU o e-mail pode recadastrar,
-- mas a conta nova começa sem teste (pendente) e só é liberada depois do primeiro pagamento.

-- 1) trial_history ganha e-mail e uma chave própria (um mesmo registro pode ter WhatsApp e e-mail diferentes dos anteriores)
alter table public.trial_history add column if not exists email text;
alter table public.trial_history drop constraint if exists trial_history_pkey;
alter table public.trial_history add column if not exists id uuid not null default gen_random_uuid();
alter table public.trial_history add primary key (id);
create index if not exists trial_history_phone on public.trial_history (phone);
create index if not exists trial_history_email on public.trial_history (email);

-- 2) preenche o e-mail das contas que ainda existem (as já apagadas não têm como ser recuperadas)
update public.trial_history t
  set email = lower(u.email)
  from public.barbershops b
  join auth.users u on u.id = b.owner_id
  where t.email is null and b.phone_whatsapp = t.phone;

-- 3) Este WhatsApp ou e-mail já usou o teste grátis? (a tela de cadastro avisa antes de criar a conta)
drop function if exists public.trial_used(text);
create or replace function public.trial_used(p_phone text default null, p_email text default null) returns boolean
language sql stable security definer set search_path = public as $$
  select
    (p_phone is not null and exists (
      select 1 from public.trial_history where phone = public.normalize_phone(p_phone)))
    or
    (p_email is not null and exists (
      select 1 from public.trial_history where email = lower(trim(p_email))))
$$;
grant execute on function public.trial_used(text, text) to anon, authenticated;

-- 4) cadastro: WhatsApp ou e-mail no histórico = sem teste grátis; o registro novo entra no histórico em todo caso
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
  select lower(email) into v_email from auth.users where id = v_user;

  if exists (select 1 from public.barbershops where owner_id = v_user) then
    raise exception 'account_already_has_business';
  end if;
  if exists (select 1 from public.barbershops where phone_whatsapp = v_phone) then
    raise exception 'phone_already_registered';
  end if;

  if exists (select 1 from public.trial_history where phone = v_phone or (v_email is not null and email = v_email)) then
    v_status := 'pending';
    v_until := public.today_br() - 1;
  end if;
  insert into public.trial_history (phone, email, first_shop_name) values (v_phone, v_email, p->>'name');

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
