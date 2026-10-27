-- WhatsApp sempre no formato de celular (DDD + 9 + 8 dígitos) e e-mail sempre num formato válido.

-- 1) Corrige contas antigas que ficaram com 10 dígitos (sem o 9): insere o 9 depois do DDD
update public.barbershops
  set phone_whatsapp = substr(phone_whatsapp, 1, 2) || '9' || substr(phone_whatsapp, 3)
  where length(phone_whatsapp) = 10;

update public.trial_history
  set phone = substr(phone, 1, 2) || '9' || substr(phone, 3)
  where length(phone) = 10
    and not exists (
      select 1 from public.trial_history t2
      where t2.phone = substr(public.trial_history.phone, 1, 2) || '9' || substr(public.trial_history.phone, 3)
    );

-- 2) Trava o formato no banco (cadastro e troca de WhatsApp)
alter table public.barbershops drop constraint if exists barbershops_phone_whatsapp_check;
alter table public.barbershops drop constraint if exists barbershops_phone_mobile;
alter table public.barbershops
  add constraint barbershops_phone_mobile check (phone_whatsapp ~ '^[0-9]{2}9[0-9]{8}$');

alter table public.barbershops drop constraint if exists barbershops_owner_email_format;
alter table public.barbershops
  add constraint barbershops_owner_email_format check (owner_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$');

-- 3) Login e verificação de conta aceitam também o número antigo sem o 9 (acham a conta do mesmo jeito)
create or replace function public.email_for_login(p_identifier text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when position('@' in p_identifier) > 0 then lower(trim(p_identifier))
    else (select u.email from public.barbershops b
          join auth.users u on u.id = b.owner_id
          where b.phone_whatsapp in (
            public.normalize_phone(p_identifier),
            case when length(public.normalize_phone(p_identifier)) = 10
              then substr(public.normalize_phone(p_identifier), 1, 2) || '9' || substr(public.normalize_phone(p_identifier), 3) end
          ) limit 1)
  end
$$;

grant execute on function public.email_for_login(text) to anon, authenticated;
