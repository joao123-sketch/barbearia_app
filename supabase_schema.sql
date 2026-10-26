-- ==============================================================
-- SCHEMA SUPABASE: BARBERAPP SAAS MULTI-TENANT
-- Email do projeto: sistemaappbarbearia@gmail.com
-- ==============================================================

-- 1. Tabela de Barbearias (Tenants)
CREATE TABLE IF NOT EXISTS public.barbershops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    slogan VARCHAR(255),
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    phone_whatsapp VARCHAR(30) NOT NULL,
    address TEXT NOT NULL,
    instagram VARCHAR(100),
    theme_color VARCHAR(20) DEFAULT '#EAB308',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Barbeiros / Profissionais da Barbearia
CREATE TABLE IF NOT EXISTS public.barbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(100),
    bio TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Serviços
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    price NUMERIC(10, 2) NOT NULL,
    category VARCHAR(50) DEFAULT 'cabelo',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Horários de Funcionamento Semanal
CREATE TABLE IF NOT EXISTS public.working_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL, -- 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    day_name VARCHAR(20) NOT NULL,
    is_open BOOLEAN DEFAULT TRUE,
    open_time TIME NOT NULL DEFAULT '09:00',
    close_time TIME NOT NULL DEFAULT '19:00',
    lunch_start TIME,
    lunch_end TIME,
    UNIQUE(barbershop_id, day_of_week)
);

-- 5. Tabela de Agendamentos dos Clientes
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    barber_id UUID REFERENCES public.barbers(id) ON DELETE SET NULL,
    service_ids UUID[] NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(30) NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    total_duration INTEGER NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'confirmed', -- 'pending', 'confirmed', 'completed', 'cancelled'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para buscas ultrarrápidas
CREATE INDEX IF NOT EXISTS idx_barbershops_slug ON public.barbershops(slug);
CREATE INDEX IF NOT EXISTS idx_services_barbershop ON public.services(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_lookup ON public.appointments(barbershop_id, appointment_date);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Público para Clientes Agendarem
CREATE POLICY "Leitura pública de barbearias ativas" 
    ON public.barbershops FOR SELECT 
    USING (is_active = true);

CREATE POLICY "Leitura pública de serviços ativos" 
    ON public.services FOR SELECT 
    USING (active = true);

CREATE POLICY "Leitura pública de barbeiros ativos" 
    ON public.barbers FOR SELECT 
    USING (active = true);

CREATE POLICY "Leitura pública de horários de funcionamento" 
    ON public.working_hours FOR SELECT 
    USING (true);

CREATE POLICY "Clientes podem criar agendamentos" 
    ON public.appointments FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Leitura pública de horários ocupados" 
    ON public.appointments FOR SELECT 
    USING (status != 'cancelled');
