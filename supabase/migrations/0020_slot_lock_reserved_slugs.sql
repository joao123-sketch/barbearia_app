-- 1) Trava contra agendamento duplo.
--    create_public_appointment conferia o horário e só depois gravava: dois clientes ao mesmo tempo passavam na conferência e
--    os dois horários eram gravados. Agora todo agendamento ativo (do cliente ou lançado pelo dono) passa por uma trava
--    por negócio e dia, e o conflito é recusado com 'slot_taken' (o app mostra "Esse horário acabou de ser ocupado").
create or replace function public.appointments_no_overlap() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status not in ('pending', 'confirmed') then return new; end if;
  -- uma de cada vez por negócio e dia (a trava se solta sozinha no fim da transação)
  perform pg_advisory_xact_lock(hashtextextended(new.barbershop_id::text || new.appointment_date::text, 0));
  if exists (
    select 1 from public.appointments a
    where a.barbershop_id = new.barbershop_id
      and a.appointment_date = new.appointment_date
      and a.id <> new.id
      and a.status in ('pending', 'confirmed')
      and a.barber_id is not distinct from new.barber_id
      and a.start_time < new.start_time + make_interval(mins => new.total_duration)
      and new.start_time < a.start_time + make_interval(mins => a.total_duration)
  ) then
    raise exception 'slot_taken';
  end if;
  return new;
end $$;

drop trigger if exists trg_appointments_no_overlap on public.appointments;
create trigger trg_appointments_no_overlap
  before insert or update of barbershop_id, barber_id, appointment_date, start_time, total_duration, status
  on public.appointments
  for each row execute function public.appointments_no_overlap();

-- função de gatilho: não é para ser chamada por ninguém de fora
revoke all on function public.appointments_no_overlap() from public, anon, authenticated;

-- 2) Links reservados: nomes que já são páginas ou pastas do app não podem ser o link de um negócio
--    (mesma lista de src/lib/slugRules.ts)
alter table public.barbershops drop constraint if exists barbershops_slug_not_reserved;
alter table public.barbershops
  add constraint barbershops_slug_not_reserved
  check (slug not in ('login', 'cadastrar', 'cadastro', 'redefinir-senha', 'admin', 'master', 'superadmin',
                      'b', 'assets', 'api', 'icon', 'manifest', 'landing', 'sw'));
