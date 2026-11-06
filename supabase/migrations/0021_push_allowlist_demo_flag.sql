-- 1) Endereço de notificação push: só os serviços de push reais dos navegadores.
--    A regra anterior (0019) aceitava qualquer https com domínio; o servidor enviava o aviso para esse endereço, então
--    um cliente podia cadastrar um site de terceiros como destino. Agora: Google (Chrome/Android), Mozilla (Firefox),
--    Apple (Safari/iPhone) e Microsoft (Edge).
alter table public.push_subscriptions drop constraint if exists push_subscriptions_endpoint_https;
alter table public.push_subscriptions
  add constraint push_subscriptions_endpoint_https
  check (
    length(endpoint) <= 2048
    and endpoint ~* '^https://(fcm\.googleapis\.com|android\.googleapis\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*notify\.windows\.com)(:443)?/'
  )
  not valid;
alter table public.push_subscriptions validate constraint push_subscriptions_endpoint_https;

-- 2) Contas de demonstração: aparecem na lista do painel geral, mas ficam fora dos números (negócios, mensalidade e
--    faturamento). Só o administrador marca (o dono do negócio não tem permissão de escrita nesta coluna).
alter table public.barbershops add column if not exists is_demo boolean not null default false;
update public.barbershops set is_demo = true where slug in ('turbocar', 'barbearia-corte-bem');
