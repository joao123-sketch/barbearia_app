-- Medição do funil de cadastro: só contagens, sem dados pessoais (nem IP, nem identificador do visitante).
create table if not exists public.page_events (
  id bigint generated always as identity primary key,
  event text not null check (event in ('login_visit', 'signup_click', 'founder_click', 'signup_open', 'signup_done')),
  created_at timestamptz not null default now()
);
create index if not exists page_events_event_day on public.page_events (event, created_at);

alter table public.page_events enable row level security;
revoke all on public.page_events from public, anon, authenticated;

-- Qualquer visitante registra um evento, mas só dos tipos conhecidos
create or replace function public.track_event(p_event text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_event in ('login_visit', 'signup_click', 'founder_click', 'signup_open', 'signup_done') then
    insert into public.page_events (event) values (p_event);
  end if;
end $$;
grant execute on function public.track_event(text) to anon, authenticated;

-- Contagens para o painel do gestor (dia no fuso de São Paulo)
create or replace function public.admin_event_counts()
returns table (event text, today integer, last_7 integer, last_30 integer, total integer)
language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  return query
  select e.event,
    count(*) filter (where (e.created_at at time zone 'America/Sao_Paulo')::date = v_today)::int,
    count(*) filter (where (e.created_at at time zone 'America/Sao_Paulo')::date > v_today - 7)::int,
    count(*) filter (where (e.created_at at time zone 'America/Sao_Paulo')::date > v_today - 30)::int,
    count(*)::int
  from public.page_events e
  group by e.event;
end $$;
revoke all on function public.admin_event_counts() from public, anon;
grant execute on function public.admin_event_counts() to authenticated;
