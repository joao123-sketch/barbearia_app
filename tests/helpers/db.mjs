// Sobe um Postgres local (PGlite) com as migrações reais do projeto, para testar regras do banco sem tocar em produção.
import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const MIGRATIONS = new URL('../../supabase/migrations/', import.meta.url)

const ENVIRONMENT = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth; create schema extensions; create schema cron; create schema net;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create table cron.job (jobname text, schedule text);
  create function cron.unschedule(text) returns void language sql as $$ select 1 $$;
  create function cron.schedule(text, text, text) returns void language sql as $$ select 1 $$;
  create function net.http_post(url text, headers jsonb, body jsonb) returns void language sql as $$ select 1 $$;
  create publication supabase_realtime;
  grant usage on schema public to anon, authenticated, service_role;
`

export const ADMIN = '33333333-3333-3333-3333-333333333333'
export const OWNER = '11111111-1111-1111-1111-111111111111'
export const SHOP = '22222222-2222-2222-2222-222222222222'

export async function createDb() {
  const db = new PGlite()
  await db.exec(ENVIRONMENT)
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()
  for (const file of files) {
    // pg_cron e pg_net não existem no PGlite: o ambiente acima já entrega versões vazias
    const sql = readFileSync(new URL(file, MIGRATIONS), 'utf8').replace(/create extension[^;]*;/g, '')
    await db.exec(sql)
  }
  await db.exec(`
    insert into auth.users (id, email) values ('${OWNER}', 'dono@teste.com'), ('${ADMIN}', 'admin@teste.com');
    insert into public.platform_admins (user_id) values ('${ADMIN}');
    insert into public.barbershops (id, owner_id, business_type, name, slug, owner_email, phone_whatsapp, monthly_fee, subscription_status, next_billing_date)
      values ('${SHOP}', '${OWNER}', 'barbearia', 'Loja Teste', 'loja-teste', 'dono@teste.com', '88999999999', 49.90, 'active', public.today_br());
    insert into public.services (barbershop_id, name, duration_minutes, price) values ('${SHOP}', 'Corte', 30, 40);
  `)
  return db
}

// Executa como um usuário logado do Supabase (RLS e permissões de coluna valem de verdade)
export async function asUser(db, uid, fn) {
  await db.exec(`set test.uid = '${uid}'; set role authenticated;`)
  try {
    return await fn()
  } finally {
    await db.exec('reset role;')
  }
}

export const rows = async (db, sql) => (await db.query(sql)).rows
export const one = async (db, sql) => (await db.query(sql)).rows[0]
