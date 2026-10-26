-- Notificações push (grátis): aviso ao dono a cada agendamento novo e lembrete ao cliente antes do horário.
-- Quem envia é a Edge Function "send-notifications"; aqui ficam a fila, os aparelhos cadastrados e o agendador.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Segredos internos (nunca expostos ao navegador)
create table if not exists public.internal_secrets (
  name text primary key,
  value text not null
);
alter table public.internal_secrets enable row level security;
revoke all on public.internal_secrets from anon, authenticated;
-- O valor de 'notify_secret' é gravado à parte (não fica neste arquivo):
--   insert into public.internal_secrets (name, value) values ('notify_secret', '<segredo>')
--   on conflict (name) do update set value = excluded.value;

-- Aparelhos que aceitaram receber notificações
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('owner', 'client')),
  barbershop_id uuid references public.barbershops(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  check ((kind = 'owner' and barbershop_id is not null) or (kind = 'client' and appointment_id is not null))
);
create unique index if not exists push_owner_unique on public.push_subscriptions (barbershop_id, endpoint) where kind = 'owner';
create unique index if not exists push_client_unique on public.push_subscriptions (appointment_id, endpoint) where kind = 'client';

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;

create policy "push: dono gerencia os próprios aparelhos" on public.push_subscriptions
  for all to authenticated
  using (kind = 'owner' and public.owns_shop(barbershop_id))
  with check (kind = 'owner' and public.owns_shop(barbershop_id));

-- O cliente (sem login) cadastra o aparelho dele a partir do agendamento que acabou de fazer
create or replace function public.register_client_push(p_appointment uuid, p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.appointments
    where id = p_appointment and status in ('pending', 'confirmed') and appointment_date >= public.today_br()
  ) then
    raise exception 'invalid_appointment';
  end if;
  insert into public.push_subscriptions (kind, appointment_id, endpoint, p256dh, auth)
  values ('client', p_appointment, p_endpoint, p_p256dh, p_auth)
  on conflict (appointment_id, endpoint) where kind = 'client' do nothing;
end $$;
grant execute on function public.register_client_push(uuid, text, text, text) to anon, authenticated;

-- Fila de envios
create table if not exists public.notification_queue (
  id bigserial primary key,
  kind text not null check (kind in ('owner_new', 'client_reminder')),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  send_at timestamptz not null,
  sent_at timestamptz
);
create index if not exists idx_notification_due on public.notification_queue (send_at) where sent_at is null;
alter table public.notification_queue enable row level security;
revoke all on public.notification_queue from anon, authenticated;

-- Chama a função de envio (assíncrono, sem travar o agendamento)
create or replace function public.poke_notifications() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_secret text;
begin
  select value into v_secret from public.internal_secrets where name = 'notify_secret';
  if v_secret is null then return; end if;
  perform net.http_post(
    url := 'https://jkahsamhmaijhfgjijfg.supabase.co/functions/v1/send-notifications',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_secret),
    body := '{}'::jsonb
  );
end $$;
revoke all on function public.poke_notifications() from public, anon, authenticated;

-- Agendamento novo: avisa o dono na hora e programa o lembrete do cliente
create or replace function public.queue_appointment_notifications() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_start timestamptz;
  v_lead int;
begin
  -- Lançamentos feitos pelo próprio dono no balcão não geram aviso para ele
  if coalesce(new.notes, '') <> 'Agendamento manual via balcão' then
    insert into public.notification_queue (kind, appointment_id, send_at) values ('owner_new', new.id, now());
  end if;

  v_start := (new.appointment_date + new.start_time) at time zone 'America/Sao_Paulo';
  v_lead := case new.reminder_preference when '10min' then 10 when '1hour' then 60 else 30 end;
  if v_start - make_interval(mins => v_lead) > now() then
    insert into public.notification_queue (kind, appointment_id, send_at)
    values ('client_reminder', new.id, v_start - make_interval(mins => v_lead));
  end if;

  perform public.poke_notifications();
  return new;
end $$;

drop trigger if exists trg_queue_appointment_notifications on public.appointments;
create trigger trg_queue_appointment_notifications
  after insert on public.appointments
  for each row execute function public.queue_appointment_notifications();

-- A cada minuto, só chama a função se houver algo vencido na fila
select cron.unschedule('send-notifications') where exists (select 1 from cron.job where jobname = 'send-notifications');
select cron.schedule(
  'send-notifications',
  '* * * * *',
  $cron$
    select public.poke_notifications()
    where exists (select 1 from public.notification_queue where sent_at is null and send_at <= now())
  $cron$
);
