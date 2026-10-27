-- ==============================================================
-- CONTA DE DEMONSTRAÇÃO (para o panfleto e para mostrar o app funcionando)
--
-- Como usar:
--  1) Crie a conta normalmente no app (cadastro) e cadastre os serviços que quiser.
--  2) Troque a lista v_refs abaixo pelo e-mail (ou slug) de cada conta de teste.
--  3) Rode tudo no SQL Editor do Supabase. Pode rodar de novo: ele apaga só os
--     agendamentos marcados como demo (notes = 'demo') e recria.
--
-- O que cria (tudo com nomes FICTÍCIOS de clientes):
--  * Horário de funcionamento (se a conta ainda não tiver): seg-sex 09-19 (almoço 12-13), sáb 09-16.
--  * Se a conta não tiver serviços, cria 5 serviços de exemplo.
--  * Atendimentos de TODO o mês passado até o fim desta semana (domingo).
--    O que já passou aparece como concluído; o que ainda vai acontecer aparece como agendado.
-- ==============================================================
do $$
declare
  v_refs text[] := array['COLOQUE_AQUI_O_EMAIL_OU_SLUG_DA_CONTA_DE_TESTE'];
  v_ref text;
  v_type text;

  v_shop uuid;
  v_barber uuid;
  v_now timestamp := now() at time zone 'America/Sao_Paulo';
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_from date := (date_trunc('month', now() at time zone 'America/Sao_Paulo') - interval '1 month')::date;
  v_to date := (now() at time zone 'America/Sao_Paulo')::date
               + (7 - extract(isodow from (now() at time zone 'America/Sao_Paulo')::date)::int);
  v_names text[] := array['Lucas Almeida','Rafael Souza','Gabriel Lima','Mateus Costa','Pedro Henrique','Thiago Martins',
    'Bruno Ferreira','Carlos Eduardo','Diego Santos','Felipe Rocha','Gustavo Ribeiro','Henrique Alves','Igor Barbosa',
    'João Pedro','Kaique Nunes','Leonardo Dias','Marcelo Teixeira','Nathan Oliveira','Otávio Cardoso','Paulo Vitor',
    'Rodrigo Mendes','Samuel Araújo','Tiago Moreira','Vinícius Castro','Wesley Pinto','Yuri Gomes','André Lopes',
    'Caio Ramos','Davi Monteiro','Eduardo Freitas'];
  v_svc uuid[];
  v_svc_id uuid;
  v_price numeric;
  v_dur int;
  v_step int;
  v_day date;
  v_dow int;
  v_open time;
  v_close time;
  v_lunch_s time;
  v_lunch_e time;
  v_t time;
  v_n int;
  v_count int := 0;
  v_status text;
  v_start timestamp;
begin
  foreach v_ref in array v_refs loop
  select id, business_type into v_shop, v_type from public.barbershops
  where owner_email = lower(trim(v_ref)) or slug = lower(trim(v_ref));
  if v_shop is null then
    raise exception 'Não achei conta com o e-mail ou slug %. Crie a conta no app primeiro e confira.', v_ref;
  end if;

  -- Horário de funcionamento (só se ainda não existir)
  if not exists (select 1 from public.working_hours where barbershop_id = v_shop) then
    insert into public.working_hours (barbershop_id, day_of_week, day_name, is_open, open_time, close_time, lunch_start, lunch_end)
    select v_shop, d,
      (array['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'])[d + 1],
      d <> 0,
      '09:00', case when d = 6 then '16:00' else '19:00' end,
      case when d in (0, 6) then null else '12:00'::time end,
      case when d in (0, 6) then null else '13:00'::time end
    from generate_series(0, 6) d;
  end if;

  -- Serviços de exemplo (só se a conta ainda não tiver nenhum)
  if not exists (select 1 from public.services where barbershop_id = v_shop) then
    if v_type = 'salao' then
      insert into public.services (barbershop_id, name, description, duration_minutes, price, category) values
        (v_shop, 'Corte Feminino', 'Corte com finalização', 60, 80, 'Cabelo'),
        (v_shop, 'Escova', 'Escova modelada', 45, 55, 'Cabelo'),
        (v_shop, 'Hidratação', 'Hidratação profunda', 60, 90, 'Tratamentos'),
        (v_shop, 'Manicure', 'Mãos com esmaltação', 45, 35, 'Unhas'),
        (v_shop, 'Pedicure', 'Pés com esmaltação', 45, 40, 'Unhas');
    else
      insert into public.services (barbershop_id, name, description, duration_minutes, price, category) values
        (v_shop, 'Corte Masculino', 'Corte na tesoura ou máquina', 30, 45, 'Cabelo'),
        (v_shop, 'Barba', 'Barba completa com toalha quente', 30, 35, 'Barba'),
        (v_shop, 'Corte + Barba', 'Combo completo', 60, 75, 'Combos'),
        (v_shop, 'Sobrancelha', 'Design na navalha', 15, 20, 'Estética'),
        (v_shop, 'Pigmentação', 'Pigmentação de barba ou cabelo', 60, 90, 'Estética');
    end if;
  end if;

  select array_agg(id) into v_svc from public.services where barbershop_id = v_shop and active;
  select max(duration_minutes) into v_dur from public.services where barbershop_id = v_shop and active;
  v_step := greatest(30, ceil(v_dur / 30.0)::int * 30);

  select id into v_barber from public.barbers where barbershop_id = v_shop and active order by created_at limit 1;

  -- Recria só o que o próprio script criou
  delete from public.appointments where barbershop_id = v_shop and notes = 'demo';
  perform setseed(0.42);

  for v_day in select generate_series(v_from, v_to, interval '1 day')::date loop
    v_dow := extract(dow from v_day)::int;
    select open_time, close_time, lunch_start, lunch_end into v_open, v_close, v_lunch_s, v_lunch_e
    from public.working_hours where barbershop_id = v_shop and day_of_week = v_dow and is_open;
    continue when v_open is null;

    -- sextas e sábados mais cheios
    v_n := case when v_dow in (5, 6) then 6 + floor(random() * 3)::int else 3 + floor(random() * 4)::int end;
    v_t := v_open;
    while v_t + make_interval(mins => v_step) <= v_close and v_n > 0 loop
      if v_lunch_s is not null and v_t < v_lunch_e and v_t + make_interval(mins => v_step) > v_lunch_s then
        v_t := v_lunch_e;
        continue;
      end if;
      if random() < 0.75 then
        v_svc_id := v_svc[1 + floor(random() * cardinality(v_svc))::int];
        select price, duration_minutes into v_price, v_dur from public.services where id = v_svc_id;
        v_start := v_day + v_t;
        -- ~6% de cancelados no passado; o que ainda vai acontecer fica confirmado
        v_status := case when v_start < v_now and random() < 0.06 then 'cancelled' else 'confirmed' end;
        insert into public.appointments (
          barbershop_id, barber_id, service_ids, client_name, client_phone, appointment_date, start_time,
          total_price, total_duration, status, notes, created_at
        ) values (
          v_shop, v_barber, array[v_svc_id],
          v_names[1 + floor(random() * cardinality(v_names))::int],
          '889' || lpad((90000000 + floor(random() * 9999999))::int::text, 8, '0'),
          v_day, v_t, v_price, v_dur, v_status, 'demo',
          least(v_start - interval '1 day' - random() * interval '2 days', v_now)
        );
        v_count := v_count + 1;
        v_n := v_n - 1;
      end if;
      v_t := v_t + make_interval(mins => v_step);
    end loop;
  end loop;

  raise notice 'Conta %: % atendimentos criados de % até %.', v_ref, v_count, v_from, v_to;
  v_count := 0;
  end loop;
end $$;
