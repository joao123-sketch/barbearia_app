-- Endurecimento de segurança.
--
-- 1) A view pública de negócios era "editável": o Supabase dá ALL na view para anon e authenticated, e como a view roda
--    com as permissões do dono dela, qualquer pessoa com a chave pública do site conseguia alterar ou apagar negócios
--    (as regras RLS da tabela não valiam). Agora a view só permite leitura.
revoke all on public.public_barbershops from public, anon, authenticated;
grant select on public.public_barbershops to anon, authenticated;

-- Tabelas e views novas criadas nas próximas migrações não nascem mais com escrita liberada para o público: quem
-- precisar de acesso concede explicitamente (como as migrações já fazem) e protege com RLS.
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon, authenticated;

-- 2) Endereço de notificação push: precisa ser https com nome de domínio (nada de IP, localhost ou http).
--    O servidor envia o aviso para esse endereço; sem esta regra, qualquer cliente cadastrava um destino qualquer.
alter table public.push_subscriptions drop constraint if exists push_subscriptions_endpoint_https;
alter table public.push_subscriptions
  add constraint push_subscriptions_endpoint_https
  check (length(endpoint) <= 2048 and endpoint ~* '^https://[a-z0-9-]+(\.[a-z0-9-]+)+(:443)?/' and endpoint !~* '^https://([0-9]+\.){3}[0-9]+')
  not valid;
alter table public.push_subscriptions validate constraint push_subscriptions_endpoint_https;
