-- Conta administradora não paga mensalidade.
-- Negócio cujo dono é administrador da plataforma fica marcado como isento: nunca bloqueia, não gera fatura
-- e não recebe lembrete de cobrança. A marca é mantida por trigger, então vale também para contas futuras.

alter table public.barbershops add column if not exists billing_exempt boolean not null default false;

create or replace function public.apply_billing_exemption() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.billing_exempt := exists (select 1 from public.platform_admins a where a.user_id = new.owner_id);
  if new.billing_exempt then
    new.subscription_status := 'active';
    new.next_billing_date := date '2099-12-31';
  end if;
  return new;
end $$;

drop trigger if exists barbershops_billing_exemption on public.barbershops;
create trigger barbershops_billing_exemption
  before insert or update on public.barbershops
  for each row execute function public.apply_billing_exemption();

-- Quem vira administrador depois de ter negócio também passa a ser isento (e quem deixa de ser volta a ser cobrado)
create or replace function public.refresh_billing_exemption() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_user uuid := coalesce(new.user_id, old.user_id);
begin
  update public.barbershops set owner_id = owner_id where owner_id = v_user;
  return null;
end $$;

drop trigger if exists platform_admins_billing_exemption on public.platform_admins;
create trigger platform_admins_billing_exemption
  after insert or delete on public.platform_admins
  for each row execute function public.refresh_billing_exemption();

-- Aplica agora nas contas administradoras que já existem
update public.barbershops set owner_id = owner_id where owner_id in (select user_id from public.platform_admins);

-- Fatura aberta de conta isenta deixa de existir (cancelada, não apagada)
update public.invoices set status = 'cancelled'
where status = 'open' and barbershop_id in (select id from public.barbershops where billing_exempt);

-- Cobrança diária: mesma rotina de 0012, sem faturas nem lembretes para contas isentas
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
    where not billing_exempt
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
