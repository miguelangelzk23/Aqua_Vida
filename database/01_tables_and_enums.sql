-- ===========================================================================
-- AQUA VIDA - PARTE 1: TABLAS Y ENUMS (ESTRUCTURA BASE)
-- ===========================================================================

-- Habilitar la extensión para generación de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 1. TIPOS ENUM PERSONALIZADOS
-- ---------------------------------------------------------------------------
CREATE TYPE role_type AS ENUM ('admin', 'repartidor');
CREATE TYPE payment_method_type AS ENUM ('efectivo', 'transferencia', 'otro');
CREATE TYPE load_status AS ENUM ('open', 'closed');

-- ---------------------------------------------------------------------------
-- 2. TABLAS E ÍNDICES
-- ---------------------------------------------------------------------------

-- 2.1 Perfiles de Usuario (Vinculado a auth.users de Supabase)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    role role_type NOT NULL DEFAULT 'repartidor',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 Catálogo de Productos
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    base_price NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
    unit TEXT NOT NULL, -- Ej: 'Bolsa 5L', 'Botellón 20L', 'Paquete x6', etc. (Flexible)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 Inventario General (Bodega principal)
CREATE TABLE public.global_inventory (
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE PRIMARY KEY,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.4 Jornadas Diarias / Viajes de Repartidores (Inventario Móvil)
CREATE TABLE public.daily_loads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repartidor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    load_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status load_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at TIMESTAMPTZ
);

-- Índice único parcial: un repartidor solo puede tener UNA jornada abierta a la vez
CREATE UNIQUE INDEX open_load_per_repartidor 
ON public.daily_loads (repartidor_id) 
WHERE (status = 'open');

-- 2.5 Detalle de Carga Inicial por Jornada
CREATE TABLE public.daily_load_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_load_id UUID REFERENCES public.daily_loads(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    quantity_loaded INTEGER NOT NULL CHECK (quantity_loaded > 0),
    quantity_returned INTEGER NOT NULL DEFAULT 0 CHECK (quantity_returned >= 0),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_load_item UNIQUE (daily_load_id, product_id)
);

-- 2.6 Registro General de Ventas
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_load_id UUID REFERENCES public.daily_loads(id) ON DELETE CASCADE NOT NULL,
    repartidor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    client_name TEXT, -- Nombre del cliente, local o tienda (Opcional)
    description TEXT, -- Detalles adicionales u observaciones (Opcional)
    sale_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    payment_method payment_method_type NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.7 Detalle de Productos por Venta
CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    -- Cálculo automático del total a nivel de BD para evitar discrepancias
    total NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    CONSTRAINT unique_sale_item UNIQUE (sale_id, product_id)
);

-- 2.8 Cierre de Jornada (Resumen Financiero y de Arqueo)
CREATE TABLE public.daily_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_load_id UUID REFERENCES public.daily_loads(id) ON DELETE CASCADE NOT NULL UNIQUE,
    repartidor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    closure_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_sales_cash NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_sales_cash >= 0),
    total_sales_transfer NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_sales_transfer >= 0),
    total_sales_other NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_sales_other >= 0),
    total_sales_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_sales_amount >= 0),
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
