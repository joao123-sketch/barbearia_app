import { createClient } from '@supabase/supabase-js'

// URL e chave "publishable" são públicas por desenho (a proteção real está nas regras RLS do banco).
// O valor padrão evita depender de variáveis de build no Cloudflare.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jkahsamhmaijhfgjijfg.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Pp50y6WaFzFqr0yVUKSx3g_qi5nZQOi'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
