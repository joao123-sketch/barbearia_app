-- O e-mail de login agora pode ser trocado pelo dono. As buscas passam a usar o e-mail real da conta (auth.users),
-- e não mais a cópia guardada no negócio, que ficaria desatualizada.

create or replace function public.email_for_login(p_identifier text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when position('@' in p_identifier) > 0 then lower(trim(p_identifier))
    else (select u.email from public.barbershops b
          join auth.users u on u.id = b.owner_id
          where b.phone_whatsapp = public.normalize_phone(p_identifier) limit 1)
  end
$$;

create or replace function public.account_exists(p_phone text default null, p_email text default null)
returns boolean
language sql stable security definer set search_path = public as $$
  select
    (p_phone is not null and exists (
      select 1 from public.barbershops where phone_whatsapp = public.normalize_phone(p_phone)))
    or
    (p_email is not null and exists (
      select 1 from auth.users where lower(email) = lower(trim(p_email))))
$$;

-- Este WhatsApp já usou o teste grátis? (a tela de cadastro avisa antes de criar a conta)
create or replace function public.trial_used(p_phone text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trial_history where phone = public.normalize_phone(p_phone))
$$;

grant execute on function public.email_for_login(text), public.account_exists(text, text), public.trial_used(text)
  to anon, authenticated;
