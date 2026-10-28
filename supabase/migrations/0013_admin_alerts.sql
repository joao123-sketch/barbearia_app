-- Alertas para o administrador: quando algo do pagamento automático falha (chave do Asaas recusada, conta sem chave Pix,
-- aviso de pagamento que precisa de conferência...), as funções registram um alerta que aparece no painel geral (/master).
-- Há no máximo um alerta aberto por tipo; se o mesmo problema se repete, só a contagem sobe (sem encher a tela).

create table if not exists public.admin_alerts (
  id bigserial primary key,
  kind text not null,                       -- tipo do problema (ex.: asaas_checkout)
  message text not null,                    -- texto em português para o administrador
  detail text,                              -- detalhe técnico curto (resposta do provedor)
  occurrences integer not null default 1,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index if not exists admin_alerts_one_open on public.admin_alerts (kind) where resolved_at is null;

alter table public.admin_alerts enable row level security;
revoke all on public.admin_alerts from anon, authenticated;
grant select on public.admin_alerts to authenticated;
create policy "alertas: admin le" on public.admin_alerts
  for select to authenticated using (public.is_platform_admin());

-- Só as funções do servidor registram alertas
create or replace function public.raise_admin_alert(p_kind text, p_message text, p_detail text default null)
returns void
language sql security definer set search_path = public as $$
  insert into public.admin_alerts (kind, message, detail)
  values (left(p_kind, 60), left(p_message, 300), left(p_detail, 600))
  on conflict (kind) where resolved_at is null do update
    set occurrences = public.admin_alerts.occurrences + 1,
        last_at = now(),
        message = excluded.message,
        detail = excluded.detail
$$;
revoke all on function public.raise_admin_alert(text, text, text) from public, anon, authenticated;
grant execute on function public.raise_admin_alert(text, text, text) to service_role;

-- O administrador marca como resolvido (se o problema voltar, abre outro alerta)
create or replace function public.admin_resolve_alert(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  update public.admin_alerts set resolved_at = now() where id = p_id and resolved_at is null;
end $$;
revoke all on function public.admin_resolve_alert(bigint) from public, anon;
grant execute on function public.admin_resolve_alert(bigint) to authenticated;
