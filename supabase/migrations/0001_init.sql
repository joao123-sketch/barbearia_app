-- ==============================================================
-- BARBERAPP - ESQUEMA INICIAL (multi-negócio, pré-pago, com RLS)
-- Já executado no projeto jkahsamhmaijhfgjijfg (as 3 tabelas antigas e vazias foram apagadas antes).
-- Rodar uma vez no SQL Editor do Supabase.
--
-- Princípios:
--  * Cada negócio (barbearia/salão) é de um único dono (auth.users) e de um único WhatsApp.
--  * Quem não é o dono nunca lê dados de clientes (nome/telefone dos agendamentos).
--  * Cliente final agenda só por função (valida horário, preço e conflito no servidor).
--  * Cobrança (teste grátis, vencimento, valor) só muda por função, nunca direto pelo navegador.
-- ==============================================================

-- ---------- Funções auxiliares ----------

create or replace function public.normalize_phone(p text) returns text
language sql immutable as $$
  select case
    when length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) >= 12
         and regexp_replace(p, '\D', '', 'g') like '55%'
      then substr(regexp_replace(p, '\D', '', 'g'), 3)
    else regexp_replace(coalesce(p, ''), '\D', '', 'g')
  end
$$;

create or replace function public.today_br() returns date
language sql stable as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- ---------- Plataforma (você) ----------

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;

create table if not exists public.platform_settings (
  id smallint primary key default 1 check (id = 1),
  monthly_fee numeric(10, 2) not null default 50.00 check (monthly_fee > 0),
  pix_key text not null default '',
  pix_name text not null default '',
  pix_bank text not null default '',
  pix_qrcode text,                       -- imagem (data URL) do QR Code
  contact_whatsapp text not null default '', -- recebe os comprovantes
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (1) on conflict do nothing;

-- ---------- Negócios ----------

create table if not exists public.barbershops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  business_type text not null check (business_type in ('barbearia', 'salao')),
  name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 60),
  owner_name text,
  owner_email text not null,
  slogan text,
  description text,
  logo_url text,
  banner_url text,
  phone_whatsapp text not null unique check (phone_whatsapp ~ '^[0-9]{10,11}$'),
  street text,
  number text,
  neighborhood text,
  city text,
  state char(2),
  reference_point text,
  address text,
  instagram text,
  style_preset text not null default 'neutro'
    check (style_preset in ('elegante','sofisticado','moderno','minimalista','simples','rosa','azul','neutro')),
  blocked_dates date[] not null default '{}',
  -- Cobrança pré-paga: next_billing_date = último dia de acesso liberado
  monthly_fee numeric(10, 2) not null,
  next_monthly_fee numeric(10, 2),
  subscription_status text not null default 'trial'
    check (subscription_status in ('trial', 'active', 'pending', 'overdue', 'blocked')),
  next_billing_date date not null,
  last_payment_date date,
  created_at timestamptz not null default now()
);

-- WhatsApp sempre no mesmo formato (DDD + número), garantindo "1 WhatsApp por conta"
create or replace function public.barbershops_normalize() returns trigger
language plpgsql as $$
begin
  new.phone_whatsapp := public.normalize_phone(new.phone_whatsapp);
  new.owner_email := lower(trim(new.owner_email));
  return new;
end $$;

drop trigger if exists trg_barbershops_normalize on public.barbershops;
create trigger trg_barbershops_normalize
  before insert or update on public.barbershops
  for each row execute function public.barbershops_normalize();

-- Quem já usou o teste grátis (continua valendo mesmo se a conta for excluída)
create table if not exists public.trial_history (
  phone text primary key,
  first_shop_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  avatar_url text,
  role text,
  bio text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 600),
  price numeric(10, 2) not null check (price >= 0),
  category text,                         -- livre e opcional, criada pelo dono
  combo_items text[],
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.working_hours (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = domingo
  day_name text not null,
  is_open boolean not null default true,
  open_time time not null default '09:00',
  close_time time not null default '19:00',
  lunch_start time,
  lunch_end time,
  unique (barbershop_id, day_of_week)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  barber_id uuid references public.barbers(id) on delete set null,
  service_ids uuid[] not null,
  client_name text not null check (length(trim(client_name)) between 2 and 120),
  client_phone text not null,
  appointment_date date not null,
  start_time time not null,
  total_price numeric(10, 2) not null,
  total_duration integer not null,
  status text not null default 'confirmed'
    check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  reminder_preference text check (reminder_preference in ('10min', '30min', '1hour')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_services_shop on public.services(barbershop_id);
create index if not exists idx_barbers_shop on public.barbers(barbershop_id);
create index if not exists idx_appointments_lookup on public.appointments(barbershop_id, appointment_date);

-- ---------- Regras de acesso ----------

create or replace function public.owns_shop(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.barbershops where id = p_shop and owner_id = auth.uid())
$$;

-- Negócio com acesso liberado (teste ou período pago em dia, e não bloqueado)
create or replace function public.shop_is_public(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.barbershops
    where id = p_shop and subscription_status <> 'blocked' and next_billing_date >= public.today_br()
  )
$$;

alter table public.platform_admins enable row level security;
alter table public.platform_settings enable row level security;
alter table public.barbershops enable row level security;
alter table public.trial_history enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.working_hours enable row level security;
alter table public.appointments enable row level security;

-- Permissões de tabela: o navegador só faz o mínimo; o resto é por função
revoke all on public.platform_admins, public.platform_settings, public.barbershops, public.trial_history,
  public.barbers, public.services, public.working_hours, public.appointments from anon, authenticated;

grant select on public.platform_settings to authenticated;
grant update (monthly_fee, pix_key, pix_name, pix_bank, pix_qrcode, contact_whatsapp, updated_at)
  on public.platform_settings to authenticated;

grant select, delete on public.barbershops to authenticated;
-- O dono edita o perfil, mas nunca cobrança, status, dono ou e-mail
grant update (name, slug, owner_name, slogan, description, logo_url, banner_url, phone_whatsapp,
  street, number, neighborhood, city, state, reference_point, address, instagram, style_preset,
  blocked_dates, business_type) on public.barbershops to authenticated;

grant select, insert, update, delete on public.barbers, public.services, public.working_hours to authenticated;
grant select on public.barbers, public.services, public.working_hours to anon;
grant select, update, delete on public.appointments to authenticated;

-- platform_settings
create policy "configuracoes: donos e admin leem" on public.platform_settings
  for select to authenticated using (true);
create policy "configuracoes: so admin altera" on public.platform_settings
  for update to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

-- barbershops (a leitura pública acontece pela view public_barbershops, sem e-mail nem cobrança)
create policy "negocio: dono ou admin leem" on public.barbershops
  for select to authenticated using (owner_id = auth.uid() or public.is_platform_admin());
create policy "negocio: dono edita" on public.barbershops
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "negocio: dono ou admin excluem" on public.barbershops
  for delete to authenticated using (owner_id = auth.uid() or public.is_platform_admin());

-- barbers / services / working_hours
create policy "equipe: dono gerencia" on public.barbers
  for all to authenticated using (public.owns_shop(barbershop_id)) with check (public.owns_shop(barbershop_id));
create policy "equipe: publico le ativos" on public.barbers
  for select to anon, authenticated using (active and public.shop_is_public(barbershop_id));

create policy "servicos: dono gerencia" on public.services
  for all to authenticated using (public.owns_shop(barbershop_id)) with check (public.owns_shop(barbershop_id));
create policy "servicos: publico le ativos" on public.services
  for select to anon, authenticated using (active and public.shop_is_public(barbershop_id));

create policy "horarios: dono gerencia" on public.working_hours
  for all to authenticated using (public.owns_shop(barbershop_id)) with check (public.owns_shop(barbershop_id));
create policy "horarios: publico le" on public.working_hours
  for select to anon, authenticated using (public.shop_is_public(barbershop_id));

-- appointments: só o dono vê e mexe; o cliente cria pela função create_public_appointment
create policy "agendamentos: dono le" on public.appointments
  for select to authenticated using (public.owns_shop(barbershop_id));
create policy "agendamentos: dono atualiza" on public.appointments
  for update to authenticated using (public.owns_shop(barbershop_id)) with check (public.owns_shop(barbershop_id));
create policy "agendamentos: dono exclui" on public.appointments
  for delete to authenticated using (public.owns_shop(barbershop_id));

-- ---------- Leitura pública segura do negócio ----------

create or replace view public.public_barbershops as
select
  id, name, slug, business_type, slogan, description, logo_url, banner_url, phone_whatsapp,
  street, number, neighborhood, city, state, reference_point, address, instagram,
  style_preset, blocked_dates,
  (subscription_status <> 'blocked' and next_billing_date >= public.today_br()) as service_active
from public.barbershops;

grant select on public.public_barbershops to anon, authenticated;

-- ---------- Cadastro do dono ----------

-- Cria o negócio da conta logada: 20 dias grátis, ou pagamento antes se o WhatsApp já usou o teste
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
    v_until := public.today_br() - 1;   -- sem teste: paga antes de usar
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

  insert into public.barbers (barbershop_id, name, role, avatar_url)
  values (v_shop, coalesce(nullif(trim(p->>'owner_name'), ''), 'Responsavel'), 'Responsavel', p->>'logo_url');

  foreach v_member in array coalesce(p_team, '{}') loop
    if length(trim(v_member)) > 0 then
      insert into public.barbers (barbershop_id, name, role) values (v_shop, trim(v_member), 'Profissional');
    end if;
  end loop;

  return v_shop;
end $$;

-- Antes do cadastro/login: já existe conta com este WhatsApp ou e-mail? (para sugerir "Entrar")
create or replace function public.account_exists(p_phone text default null, p_email text default null)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.barbershops
    where (p_phone is not null and phone_whatsapp = public.normalize_phone(p_phone))
       or (p_email is not null and owner_email = lower(trim(p_email)))
  )
$$;

-- Login por WhatsApp: devolve o e-mail da conta para o login normal do Supabase Auth
create or replace function public.email_for_login(p_identifier text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when position('@' in p_identifier) > 0 then lower(trim(p_identifier))
    else (select owner_email from public.barbershops
          where phone_whatsapp = public.normalize_phone(p_identifier) limit 1)
  end
$$;

-- ---------- Agendamento pelo cliente ----------

create or replace function public.slot_conflict(p_shop uuid, p_barber uuid, p_date date, p_start time, p_duration int)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.appointments a
    where a.barbershop_id = p_shop
      and a.appointment_date = p_date
      and a.status in ('pending', 'confirmed')
      and a.barber_id is not distinct from p_barber
      and a.start_time < (p_start + make_interval(mins => p_duration))
      and (a.start_time + make_interval(mins => a.total_duration)) > p_start
  )
$$;

-- Horários ocupados (sem expor quem agendou)
create or replace function public.get_busy_slots(p_shop uuid, p_date date)
returns table (barber_id uuid, start_time time, total_duration integer)
language sql stable security definer set search_path = public as $$
  select a.barber_id, a.start_time, a.total_duration
  from public.appointments a
  where a.barbershop_id = p_shop
    and a.appointment_date = p_date
    and a.status in ('pending', 'confirmed', 'completed')
    and public.shop_is_public(p_shop)
$$;

create or replace function public.create_public_appointment(
  p_shop uuid, p_barber uuid, p_service_ids uuid[], p_client_name text, p_client_phone text,
  p_date date, p_start time, p_notes text default null, p_reminder text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_price numeric;
  v_duration int;
  v_found int;
  v_barber uuid;
  v_hours public.working_hours%rowtype;
  v_blocked date[];
  v_id uuid;
begin
  if not public.shop_is_public(p_shop) then raise exception 'shop_unavailable'; end if;
  if p_date < public.today_br() then raise exception 'date_in_past'; end if;
  if length(trim(coalesce(p_client_name, ''))) < 2 then raise exception 'invalid_name'; end if;
  if length(public.normalize_phone(p_client_phone)) not between 10 and 11 then raise exception 'invalid_phone'; end if;

  select count(*), coalesce(sum(price), 0), coalesce(sum(duration_minutes), 0)
    into v_found, v_price, v_duration
  from public.services
  where id = any(p_service_ids) and barbershop_id = p_shop and active;
  if v_found = 0 or v_found <> cardinality(p_service_ids) then raise exception 'invalid_services'; end if;

  select blocked_dates into v_blocked from public.barbershops where id = p_shop;
  if p_date = any(v_blocked) then raise exception 'day_blocked'; end if;

  select * into v_hours from public.working_hours
  where barbershop_id = p_shop and day_of_week = extract(dow from p_date)::int;
  if found then
    if not v_hours.is_open
       or p_start < v_hours.open_time
       or (p_start + make_interval(mins => v_duration)) > v_hours.close_time
       or (v_hours.lunch_start is not null and v_hours.lunch_end is not null
           and p_start < v_hours.lunch_end and (p_start + make_interval(mins => v_duration)) > v_hours.lunch_start)
    then raise exception 'outside_hours'; end if;
  end if;

  if p_barber is not null then
    perform 1 from public.barbers where id = p_barber and barbershop_id = p_shop and active;
    if not found then raise exception 'invalid_barber'; end if;
    if public.slot_conflict(p_shop, p_barber, p_date, p_start, v_duration) then raise exception 'slot_taken'; end if;
    v_barber := p_barber;
  else
    select b.id into v_barber from public.barbers b
    where b.barbershop_id = p_shop and b.active
      and not public.slot_conflict(p_shop, b.id, p_date, p_start, v_duration)
    order by b.created_at limit 1;
    if v_barber is null then
      if exists (select 1 from public.barbers where barbershop_id = p_shop and active)
         or public.slot_conflict(p_shop, null, p_date, p_start, v_duration)
      then raise exception 'slot_taken'; end if;
    end if;
  end if;

  insert into public.appointments (
    barbershop_id, barber_id, service_ids, client_name, client_phone, appointment_date, start_time,
    total_price, total_duration, status, reminder_preference, notes
  ) values (
    p_shop, v_barber, p_service_ids, trim(p_client_name), public.normalize_phone(p_client_phone), p_date, p_start,
    v_price, v_duration, 'confirmed', p_reminder, left(p_notes, 500)
  ) returning id into v_id;

  return v_id;
end $$;

-- ---------- Ações do painel geral (só admin) ----------

create or replace function public.admin_confirm_payment(p_shop uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_base date;
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  select greatest(next_billing_date, public.today_br()) into v_base from public.barbershops where id = p_shop;
  update public.barbershops set
    subscription_status = 'active',
    monthly_fee = coalesce(next_monthly_fee, monthly_fee),
    next_monthly_fee = null,
    last_payment_date = public.today_br(),
    next_billing_date = v_base + 30
  where id = p_shop;
end $$;

create or replace function public.admin_set_blocked(p_shop uuid, p_blocked boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  update public.barbershops set subscription_status = case when p_blocked then 'blocked' else 'active' end
  where id = p_shop;
end $$;

-- Novo valor para uma conta (vale no próximo pagamento) ou para todas (p_shop nulo)
create or replace function public.admin_schedule_fee(p_fee numeric, p_shop uuid default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  if p_fee <= 0 then raise exception 'invalid_fee'; end if;
  update public.barbershops set next_monthly_fee = p_fee
  where (p_shop is null or id = p_shop) and monthly_fee <> p_fee;
end $$;

revoke all on function public.admin_confirm_payment(uuid), public.admin_set_blocked(uuid, boolean),
  public.admin_schedule_fee(numeric, uuid), public.register_barbershop(jsonb, text[]) from public, anon;
grant execute on function public.admin_confirm_payment(uuid), public.admin_set_blocked(uuid, boolean),
  public.admin_schedule_fee(numeric, uuid), public.register_barbershop(jsonb, text[]) to authenticated;

grant execute on function public.get_busy_slots(uuid, date), public.account_exists(text, text),
  public.email_for_login(text), public.today_br(), public.normalize_phone(text) to anon, authenticated;
grant execute on function public.create_public_appointment(uuid, uuid, uuid[], text, text, date, time, text, text)
  to anon, authenticated;

-- ==============================================================
-- DEPOIS DE CRIAR A SUA CONTA (e-mail + senha) NO APP:
-- torne-se administrador da plataforma (troque pelo seu e-mail):
--
--   insert into public.platform_admins (user_id)
--   select id from auth.users where email = 'seu@email.com';
-- ==============================================================
