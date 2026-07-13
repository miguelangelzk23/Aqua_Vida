-- ==============================================================================
-- 09_clients.sql
-- Creación de la tabla de Clientes y vistas estadísticas para retención.
-- ==============================================================================

-- 1. Tabla de Clientes
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en Clientes
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Clientes
CREATE POLICY "Clientes son visibles por administradores y repartidores" 
    ON public.clients FOR SELECT 
    USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'repartidor')
    ));

CREATE POLICY "Repartidores y administradores pueden insertar clientes" 
    ON public.clients FOR INSERT 
    WITH CHECK (auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'repartidor')
    ));

CREATE POLICY "Administradores pueden actualizar clientes" 
    ON public.clients FOR UPDATE 
    USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE role = 'admin'
    ));

-- 2. Alterar la tabla de Ventas para asociar al Cliente de manera opcional
ALTER TABLE public.sales 
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- 3. Vista de Estadísticas de Clientes (CRM Básico)
-- Esta vista calcula los días desde la última compra basándose en la tabla de ventas.
CREATE OR REPLACE VIEW public.client_stats AS
SELECT 
    c.id,
    c.name,
    c.phone,
    c.address,
    c.created_at,
    MAX(s.sale_date) as last_purchase_date,
    DATE_PART('day', now() - MAX(s.sale_date)) as days_since_last_purchase,
    COUNT(s.id) as total_purchases
FROM public.clients c
LEFT JOIN public.sales s ON c.id = s.client_id
GROUP BY c.id;

-- Como las vistas no pueden tener RLS directamente si no son vistas con 'security invoker' en versiones nuevas,
-- en lugar de RLS, los accesos a la vista asumen los permisos de las tablas base subyacentes que sí tienen RLS.
