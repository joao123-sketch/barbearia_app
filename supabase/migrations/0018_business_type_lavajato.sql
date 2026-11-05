-- Novo tipo de negócio: lava-jato (o dono cadastra os tipos de lavagem com preço e duração, e cada box é um profissional).
alter table public.barbershops drop constraint if exists barbershops_business_type_check;
alter table public.barbershops
  add constraint barbershops_business_type_check check (business_type in ('barbearia', 'salao', 'lavajato'));

-- O aviso de cadastro novo para o administrador passa a dizer "Lava-jato" para esse tipo
create or replace function public.queue_signup_notification() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_kind text;
  v_where text;
begin
  if new.billing_exempt then return new; end if;
  v_kind := case new.business_type when 'salao' then 'Salão' when 'lavajato' then 'Lava-jato' else 'Barbearia' end;
  v_where := nullif(trim(coalesce(new.city, '') || case when coalesce(new.state, '') <> '' then '/' || trim(new.state) else '' end), '');
  insert into public.notification_queue (kind, barbershop_id, send_at, title, body)
  values (
    'admin_signup', new.id, now(), 'Novo cadastro',
    left(new.name, 60) || ' (' || v_kind || ')' || coalesce(' · ' || v_where, '') || ' · WhatsApp ' || new.phone_whatsapp
  );
  perform public.poke_notifications();
  return new;
end $$;
