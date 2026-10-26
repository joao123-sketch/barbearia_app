-- "Enviar aviso de teste": manda uma notificação de verdade pelo servidor (testa o caminho completo).
alter table public.notification_queue alter column appointment_id drop not null;
alter table public.notification_queue add column if not exists barbershop_id uuid references public.barbershops(id) on delete cascade;
alter table public.notification_queue drop constraint if exists notification_queue_kind_check;
alter table public.notification_queue
  add constraint notification_queue_kind_check check (kind in ('owner_new', 'client_reminder', 'owner_test'));

create or replace function public.send_owner_test_push(p_shop uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.owns_shop(p_shop) then raise exception 'forbidden'; end if;
  insert into public.notification_queue (kind, barbershop_id, send_at) values ('owner_test', p_shop, now());
  perform public.poke_notifications();
end $$;

revoke all on function public.send_owner_test_push(uuid) from public, anon;
grant execute on function public.send_owner_test_push(uuid) to authenticated;
