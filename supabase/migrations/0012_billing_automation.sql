-- Cobrança automática das mensalidades (Pix pelo Asaas, confirmação por webhook, lembretes e bloqueio por atraso).
--
-- Como funciona:
--  * Cada mensalidade é uma FATURA (invoices). Há no máximo uma aberta por negócio.
--  * O dono paga pelo app (Edge Function "billing-checkout" cria a cobrança Pix no Asaas).
--  * O Asaas avisa o pagamento na Edge Function "asaas-webhook", que confere o pagamento na API do Asaas
--    e chama apply_invoice_payment(): marca a fatura como paga e soma 30 dias, uma única vez.
--  * O bloqueio é calculado pelas datas (carência de grace_days dias depois do vencimento), por isso funciona
--    mesmo que o dono nunca mais abra o app. Para bloqueados, o banco também esconde os dados do painel (RLS).
--  * Um agendador diário (billing_daily) cria as faturas e programa os lembretes por notificação.
-- Nada aqui marca mensalidade como paga sem uma confirmação válida (webhook verificado ou ação do administrador).

-- ---------- Configurações (só o administrador altera) ----------

alter table public.platform_settings
  add column if not exists grace_days integer not null default 10 check (grace_days between 0 and 60),
  add column if not exists invoice_lead_days integer not null default 7 check (invoice_lead_days between 0 and 30),
  -- Dias em relação ao vencimento em que o dono recebe aviso (negativo = antes, 0 = no dia, positivo = atraso)
  add column if not exists reminder_offsets integer[] not null default '{-5,-1,0,1,3,5,7,9,11,14,18,24,30}';

grant update (grace_days, invoice_lead_days, reminder_offsets) on public.platform_settings to authenticated;

alter table public.barbershops add column if not exists asaas_customer_id text;

-- ---------- Faturas e eventos ----------

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  due_date date not null,                     -- vencimento = último dia de acesso do período anterior
  status text not null default 'open' check (status in ('open', 'paid', 'cancelled')),
  provider text not null default 'asaas',
  provider_payment_id text,
  pix_payload text,                           -- "copia e cola" da cobrança atual
  paid_at timestamptz,
  paid_amount numeric(10, 2),
  payment_source text check (payment_source in ('provider', 'manual')),
  -- Marcas que pedem conferência do administrador
  flag text check (flag in ('duplicate_payment', 'amount_mismatch', 'orphan_payment', 'refunded')),
  flag_note text,
  created_at timestamptz not null default now()
);
create unique index if not exists invoices_one_open on public.invoices (barbershop_id) where status = 'open';
create unique index if not exists invoices_provider_payment on public.invoices (provider, provider_payment_id)
  where provider_payment_id is not null;
create index if not exists invoices_shop_created on public.invoices (barbershop_id, created_at desc);

create table if not exists public.payment_events (
  id bigserial primary key,
  provider text not null default 'asaas',
  event_id text not null,                     -- id do evento no provedor (chave de idempotência)
  event_type text not null,
  provider_payment_id text,
  invoice_id uuid references public.invoices(id) on delete set null,
  payload jsonb not null,
  result text,                                -- nulo = ainda não processado (o provedor reenvia)
  received_at timestamptz not null default now(),
  unique (provider, event_id)
);

-- Lembretes já enviados (evita repetir o mesmo aviso)
create table if not exists public.billing_reminders (
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  due_date date not null,
  day_offset integer not null,
  sent_at timestamptz not null default now(),
  primary key (barbershop_id, due_date, day_offset)
);

alter table public.invoices enable row level security;
alter table public.payment_events enable row level security;
alter table public.billing_reminders enable row level security;
revoke all on public.invoices, public.payment_events, public.billing_reminders from anon, authenticated;
grant select on public.invoices, public.payment_events to authenticated;

create policy "faturas: dono le as proprias" on public.invoices
  for select to authenticated using (
    exists (select 1 from public.barbershops b where b.id = barbershop_id and b.owner_id = auth.uid())
  );
create policy "faturas: admin le todas" on public.invoices
  for select to authenticated using (public.is_platform_admin());
create policy "eventos de pagamento: admin le" on public.payment_events
  for select to authenticated using (public.is_platform_admin());

-- ---------- Carência e bloqueio ----------

-- Bloqueado = suspenso pelo administrador, sem o primeiro pagamento, ou além da carência depois do vencimento
create or replace function public.shop_locked(p_status text, p_due date) returns boolean
language sql stable security definer set search_path = public as $$
  select p_status = 'blocked'
      or (p_status = 'pending' and p_due < public.today_br())
      or (public.today_br() - p_due) > coalesce((select grace_days from public.platform_settings where id = 1), 10)
$$;
grant execute on function public.shop_locked(text, date) to anon, authenticated;

-- O link público continua no ar durante a carência; sai do ar quando o negócio é bloqueado
create or replace function public.shop_is_public(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.barbershops
    where id = p_shop and not public.shop_locked(subscription_status, next_billing_date)
  )
$$;

create or replace view public.public_barbershops as
select
  id, name, slug, business_type, slogan, description, logo_url, banner_url, phone_whatsapp,
  street, number, neighborhood, city, state, reference_point, address, instagram,
  style_preset, blocked_dates,
  (not public.shop_locked(subscription_status, next_billing_date)) as service_active,
  app_icon
from public.barbershops;
grant select on public.public_barbershops to anon, authenticated;

-- Dono com acesso liberado: usado nas regras dos dados do painel (agenda, serviços, equipe, horários).
-- Bloqueado continua vendo o próprio negócio e as faturas (a tela de cobrança), mas não os dados do painel.
create or replace function public.owns_active_shop(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.barbershops
    where id = p_shop and owner_id = auth.uid()
      and not public.shop_locked(subscription_status, next_billing_date)
  )
$$;
grant execute on function public.owns_active_shop(uuid) to authenticated;

drop policy if exists "equipe: dono gerencia" on public.barbers;
create policy "equipe: dono gerencia" on public.barbers
  for all to authenticated using (public.owns_active_shop(barbershop_id)) with check (public.owns_active_shop(barbershop_id));

drop policy if exists "servicos: dono gerencia" on public.services;
create policy "servicos: dono gerencia" on public.services
  for all to authenticated using (public.owns_active_shop(barbershop_id)) with check (public.owns_active_shop(barbershop_id));

drop policy if exists "horarios: dono gerencia" on public.working_hours;
create policy "horarios: dono gerencia" on public.working_hours
  for all to authenticated using (public.owns_active_shop(barbershop_id)) with check (public.owns_active_shop(barbershop_id));

drop policy if exists "agendamentos: dono le" on public.appointments;
create policy "agendamentos: dono le" on public.appointments
  for select to authenticated using (public.owns_active_shop(barbershop_id));
drop policy if exists "agendamentos: dono atualiza" on public.appointments;
create policy "agendamentos: dono atualiza" on public.appointments
  for update to authenticated using (public.owns_active_shop(barbershop_id)) with check (public.owns_active_shop(barbershop_id));
drop policy if exists "agendamentos: dono exclui" on public.appointments;
create policy "agendamentos: dono exclui" on public.appointments
  for delete to authenticated using (public.owns_active_shop(barbershop_id));
drop policy if exists "agendamentos: dono cria" on public.appointments;
create policy "agendamentos: dono cria" on public.appointments
  for insert to authenticated with check (public.owns_active_shop(barbershop_id));

-- ---------- Faturas: criar e quitar ----------

-- Garante a fatura aberta do negócio (uma só) com o valor vigente
create or replace function public.ensure_open_invoice(p_shop uuid) returns public.invoices
language plpgsql security definer set search_path = public as $$
declare v public.invoices%rowtype;
begin
  insert into public.invoices (barbershop_id, amount, due_date)
  select id, coalesce(next_monthly_fee, monthly_fee), next_billing_date from public.barbershops where id = p_shop
  on conflict (barbershop_id) where status = 'open' do nothing;
  select * into v from public.invoices where barbershop_id = p_shop and status = 'open';
  return v;
end $$;
revoke all on function public.ensure_open_invoice(uuid) from public, anon, authenticated;

-- Quita a fatura e libera mais 30 dias. Idempotente: chamar duas vezes não soma duas vezes.
-- Devolve: applied | already_paid | duplicate | cancelled_invoice | amount_mismatch | not_found
create or replace function public.apply_invoice_payment(
  p_invoice uuid, p_amount numeric, p_paid_at timestamptz, p_source text, p_provider_payment text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare v public.invoices%rowtype;
begin
  select * into v from public.invoices where id = p_invoice for update;
  if not found then return 'not_found'; end if;

  if v.status = 'paid' then
    -- Mesmo pagamento reenviado pelo provedor: nada a fazer. Outro pagamento para a mesma fatura: pede conferência.
    if p_source = 'provider' and (v.payment_source = 'manual' or v.provider_payment_id is distinct from p_provider_payment) then
      update public.invoices set flag = 'duplicate_payment',
        flag_note = 'Pagamento recebido pelo provedor (' || coalesce(p_provider_payment, '?') || ') depois de a fatura já estar paga.'
      where id = v.id;
      return 'duplicate';
    end if;
    return 'already_paid';
  end if;

  if v.status = 'cancelled' and p_source = 'provider' then
    update public.invoices set flag = 'orphan_payment',
      flag_note = 'Pagamento recebido (' || coalesce(p_provider_payment, '?') || ') para uma fatura cancelada.'
    where id = v.id;
    return 'cancelled_invoice';
  end if;

  if p_source = 'provider' and coalesce(p_amount, 0) + 0.009 < v.amount then
    update public.invoices set flag = 'amount_mismatch',
      flag_note = 'Recebido R$ ' || coalesce(p_amount, 0) || ' para uma fatura de R$ ' || v.amount || '.'
    where id = v.id;
    return 'amount_mismatch';
  end if;

  update public.invoices set
    status = 'paid', paid_at = coalesce(p_paid_at, now()), paid_amount = coalesce(p_amount, v.amount),
    payment_source = p_source, provider_payment_id = coalesce(provider_payment_id, p_provider_payment), flag = null, flag_note = null
  where id = v.id;

  -- Soma 30 dias a partir do que for maior: o fim do período atual ou hoje (pagamento depois do bloqueio)
  update public.barbershops set
    subscription_status = 'active',
    monthly_fee = coalesce(next_monthly_fee, monthly_fee),
    next_monthly_fee = null,
    last_payment_date = public.today_br(),
    next_billing_date = greatest(next_billing_date, public.today_br()) + 30
  where id = v.barbershop_id;

  return 'applied';
end $$;
revoke all on function public.apply_invoice_payment(uuid, numeric, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.apply_invoice_payment(uuid, numeric, timestamptz, text, text) to service_role;

-- A confirmação manual do painel geral passa pela mesma regra (e fecha a fatura aberta, se houver)
create or replace function public.admin_confirm_payment(p_shop uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_invoice public.invoices;
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  v_invoice := public.ensure_open_invoice(p_shop);
  if v_invoice.id is null then raise exception 'shop_not_found'; end if;
  perform public.apply_invoice_payment(v_invoice.id, v_invoice.amount, now(), 'manual', null);
end $$;

-- Correções do administrador: marcar como paga, cancelar ou limpar a marca de conferência
create or replace function public.admin_resolve_invoice(p_invoice uuid, p_action text) returns text
language plpgsql security definer set search_path = public as $$
declare v public.invoices%rowtype;
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  select * into v from public.invoices where id = p_invoice;
  if not found then raise exception 'invoice_not_found'; end if;

  if p_action = 'mark_paid' then
    if v.status = 'paid' then return 'already_paid'; end if;
    return public.apply_invoice_payment(v.id, v.amount, now(), 'manual', null);
  elsif p_action = 'cancel' then
    if v.status <> 'open' then raise exception 'invoice_not_open'; end if;
    update public.invoices set status = 'cancelled' where id = v.id;
    return 'cancelled';
  elsif p_action = 'clear_flag' then
    update public.invoices set flag = null, flag_note = null where id = v.id;
    return 'cleared';
  end if;
  raise exception 'invalid_action';
end $$;

revoke all on function public.admin_confirm_payment(uuid), public.admin_resolve_invoice(uuid, text) from public, anon;
grant execute on function public.admin_confirm_payment(uuid), public.admin_resolve_invoice(uuid, text) to authenticated;

-- ---------- Lembretes por notificação ----------

alter table public.notification_queue add column if not exists title text;
alter table public.notification_queue add column if not exists body text;
alter table public.notification_queue drop constraint if exists notification_queue_kind_check;
alter table public.notification_queue
  add constraint notification_queue_kind_check
  check (kind in ('owner_new', 'client_reminder', 'owner_test', 'billing_reminder'));

-- Roda todo dia: cria a fatura perto do vencimento e programa o lembrete do dia (uma vez por marco).
-- Se algum dia falhar, o próximo envia o marco mais recente que ficou para trás.
create or replace function public.billing_daily() returns integer
language plpgsql security definer set search_path = public as $$
declare
  s public.platform_settings%rowtype;
  r record;
  v_today date := public.today_br();
  v_d int;
  v_off int;
  v_n int := 0;
  v_title text;
  v_body text;
  v_left int;
  v_amount text;
begin
  select * into s from public.platform_settings where id = 1;

  for r in
    select id, subscription_status as st, next_billing_date as due, coalesce(next_monthly_fee, monthly_fee) as fee
    from public.barbershops
  loop
    v_d := v_today - r.due;

    if v_d >= -s.invoice_lead_days or r.st = 'pending' then
      insert into public.invoices (barbershop_id, amount, due_date) values (r.id, r.fee, r.due)
      on conflict (barbershop_id) where status = 'open' do nothing;
    end if;

    -- Suspensos pela administração e quem ainda não pagou o primeiro mês não recebem a régua de lembretes
    continue when r.st in ('blocked', 'pending');

    select max(o) into v_off from unnest(s.reminder_offsets) o where o <= v_d;
    continue when v_off is null;

    insert into public.billing_reminders (barbershop_id, due_date, day_offset) values (r.id, r.due, v_off)
    on conflict do nothing;
    continue when not found;

    v_amount := 'R$ ' || replace(to_char(r.fee, 'FM999990.00'), '.', ',');
    v_left := s.grace_days - v_d;
    if v_d < 0 then
      v_title := case when v_d = -1 then 'Sua mensalidade vence amanhã' else 'Sua mensalidade vence em ' || (-v_d) || ' dias' end;
      v_body := v_amount || ' · Pague pelo app com Pix e continue sem interrupção.';
    elsif v_d = 0 then
      v_title := 'Sua mensalidade vence hoje';
      v_body := v_amount || ' · Pague pelo app com Pix em poucos segundos.';
    elsif v_left >= 0 then
      v_title := 'Mensalidade vencida há ' || v_d || case when v_d = 1 then ' dia' else ' dias' end;
      v_body := v_amount || ' · Regularize ' || case when v_left = 0 then 'hoje' else 'em até ' || v_left || case when v_left = 1 then ' dia' else ' dias' end end
                || ' para não perder o acesso.';
    else
      v_title := 'Acesso bloqueado por falta de pagamento';
      v_body := 'Pague ' || v_amount || ' pelo app e o acesso volta na hora.';
    end if;

    insert into public.notification_queue (kind, barbershop_id, send_at, title, body)
    values ('billing_reminder', r.id, now(), v_title, v_body);
    v_n := v_n + 1;
  end loop;

  if v_n > 0 then perform public.poke_notifications(); end if;
  return v_n;
end $$;
revoke all on function public.billing_daily() from public, anon, authenticated;

-- Todo dia às 9h (horário de Brasília)
select cron.unschedule('billing-daily') where exists (select 1 from cron.job where jobname = 'billing-daily');
select cron.schedule('billing-daily', '0 12 * * *', $cron$ select public.billing_daily() $cron$);
