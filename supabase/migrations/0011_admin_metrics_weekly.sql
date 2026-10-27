-- Métricas por negócio v2: acrescenta agendamentos e faturamento por semana (só totais, sem dados dos clientes).
-- "Concluído" = não cancelado e cujo horário (início + duração) já terminou, no fuso de São Paulo.
drop function if exists public.admin_shop_metrics();

create or replace function public.admin_shop_metrics()
returns table (
  shop_id uuid,
  services_count integer,
  team_count integer,
  done_total integer,
  cancelled_total integer,
  upcoming_total integer,
  revenue_total numeric,
  revenue_this_month numeric,
  revenue_last_month numeric,
  done_this_month integer,
  worked_hours_total numeric,
  worked_hours_per_active_day numeric,
  last_activity date,
  booked_this_week integer,       -- agendamentos (não cancelados) da semana atual, seg a dom
  revenue_this_week numeric,      -- faturado nesta semana (só o que já foi concluído)
  avg_per_week numeric            -- média de atendimentos concluídos por semana desde o primeiro
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_now timestamp := now() at time zone 'America/Sao_Paulo';
  v_month date := date_trunc('month', v_now)::date;
  v_week date := date_trunc('week', v_now)::date;
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;

  return query
  with apt as (
    select a.barbershop_id, a.appointment_date, a.total_price, a.total_duration, a.status,
      (a.appointment_date + a.start_time + make_interval(mins => a.total_duration)) <= v_now as finished
    from public.appointments a
  ),
  done as (select * from apt where status <> 'cancelled' and finished)
  select
    b.id,
    (select count(*)::int from public.services s where s.barbershop_id = b.id and s.active),
    (select count(*)::int from public.barbers x where x.barbershop_id = b.id and x.active),
    (select count(*)::int from done d where d.barbershop_id = b.id),
    (select count(*)::int from apt a where a.barbershop_id = b.id and a.status = 'cancelled'),
    (select count(*)::int from apt a where a.barbershop_id = b.id and a.status <> 'cancelled' and not a.finished),
    coalesce((select sum(d.total_price) from done d where d.barbershop_id = b.id), 0),
    coalesce((select sum(d.total_price) from done d where d.barbershop_id = b.id and d.appointment_date >= v_month), 0),
    coalesce((select sum(d.total_price) from done d
      where d.barbershop_id = b.id and d.appointment_date >= (v_month - interval '1 month')::date
        and d.appointment_date < v_month), 0),
    (select count(*)::int from done d where d.barbershop_id = b.id and d.appointment_date >= v_month),
    round(coalesce((select sum(d.total_duration) from done d where d.barbershop_id = b.id), 0) / 60.0, 1),
    round(coalesce((select sum(d.total_duration)::numeric / nullif(count(distinct d.appointment_date), 0) / 60.0
      from done d where d.barbershop_id = b.id), 0), 1),
    (select max(d.appointment_date) from done d where d.barbershop_id = b.id),
    (select count(*)::int from apt a
      where a.barbershop_id = b.id and a.status <> 'cancelled'
        and a.appointment_date >= v_week and a.appointment_date < v_week + 7),
    coalesce((select sum(d.total_price) from done d where d.barbershop_id = b.id and d.appointment_date >= v_week), 0),
    round(coalesce((select count(*)::numeric / greatest(1, ceil((v_now::date - min(d.appointment_date) + 1) / 7.0))
      from done d where d.barbershop_id = b.id), 0), 1)
  from public.barbershops b;
end $$;

revoke all on function public.admin_shop_metrics() from public, anon;
grant execute on function public.admin_shop_metrics() to authenticated;
