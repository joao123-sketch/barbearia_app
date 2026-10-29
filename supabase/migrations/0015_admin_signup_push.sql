-- Aviso no celular do administrador a cada novo cadastro de negócio (e só isso).
-- O aparelho do administrador fica em push_subscriptions com kind = 'admin'; o aviso entra na fila quando um negócio é criado.

-- Aparelhos do administrador: ligados ao usuário, não a um negócio
alter table public.push_subscriptions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.push_subscriptions drop constraint if exists push_subscriptions_kind_check;
alter table public.push_subscriptions drop constraint if exists push_subscriptions_check;
alter table public.push_subscriptions
  add constraint push_subscriptions_kind_check check (kind in ('owner', 'client', 'admin'));
alter table public.push_subscriptions
  add constraint push_subscriptions_target_check check (
    (kind = 'owner' and barbershop_id is not null)
    or (kind = 'client' and appointment_id is not null)
    or (kind = 'admin' and user_id is not null)
  );
create unique index if not exists push_admin_unique on public.push_subscriptions (user_id, endpoint) where kind = 'admin';

drop policy if exists "push: admin gerencia os próprios aparelhos" on public.push_subscriptions;
create policy "push: admin gerencia os próprios aparelhos" on public.push_subscriptions
  for all to authenticated
  using (kind = 'admin' and user_id = auth.uid() and public.is_platform_admin())
  with check (kind = 'admin' and user_id = auth.uid() and public.is_platform_admin());

-- Novos tipos de aviso na fila
alter table public.notification_queue drop constraint if exists notification_queue_kind_check;
alter table public.notification_queue
  add constraint notification_queue_kind_check
  check (kind in ('owner_new', 'client_reminder', 'owner_test', 'billing_reminder', 'admin_signup', 'admin_test'));

-- Negócio novo: avisa o administrador (a conta do próprio administrador não gera aviso)
create or replace function public.queue_signup_notification() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_kind text;
  v_where text;
begin
  if new.billing_exempt then return new; end if;
  v_kind := case when new.business_type = 'salao' then 'Salão' else 'Barbearia' end;
  v_where := nullif(trim(coalesce(new.city, '') || case when coalesce(new.state, '') <> '' then '/' || trim(new.state) else '' end), '');
  insert into public.notification_queue (kind, barbershop_id, send_at, title, body)
  values (
    'admin_signup', new.id, now(), 'Novo cadastro',
    left(new.name, 60) || ' (' || v_kind || ')' || coalesce(' · ' || v_where, '') || ' · WhatsApp ' || new.phone_whatsapp
  );
  perform public.poke_notifications();
  return new;
end $$;

drop trigger if exists trg_queue_signup_notification on public.barbershops;
create trigger trg_queue_signup_notification
  after insert on public.barbershops
  for each row execute function public.queue_signup_notification();

-- "Enviar aviso de teste" do administrador: passa pelo servidor, como será com um cadastro de verdade
create or replace function public.send_admin_test_push() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  insert into public.notification_queue (kind, send_at) values ('admin_test', now());
  perform public.poke_notifications();
end $$;
revoke all on function public.send_admin_test_push() from public, anon;
grant execute on function public.send_admin_test_push() to authenticated;
