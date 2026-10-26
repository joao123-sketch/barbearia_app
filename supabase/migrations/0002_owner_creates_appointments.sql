-- O dono precisa lançar agendamentos de balcão (cliente sem WhatsApp) direto no painel.
grant insert on public.appointments to authenticated;

create policy "agendamentos: dono cria" on public.appointments
  for insert to authenticated with check (public.owns_shop(barbershop_id));
