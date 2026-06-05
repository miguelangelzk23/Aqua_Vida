-- ===========================================================================
-- AQUA VIDA - PARTE 3: VISTAS DE REPORTES PARA EL ADMINISTRADOR
-- ===========================================================================

-- 1. Ventas por Día
CREATE OR REPLACE VIEW public.view_sales_by_day AS
SELECT 
  sale_date::DATE AS date,
  COUNT(DISTINCT s.id) AS total_sales_count,
  SUM(s.total_amount) AS total_sales_amount
FROM public.sales s
GROUP BY sale_date::DATE;


-- 2. Ventas por Repartidor
CREATE OR REPLACE VIEW public.view_sales_by_repartidor AS
SELECT 
  p.id AS repartidor_id,
  p.full_name AS repartidor_name,
  COUNT(DISTINCT s.id) AS total_sales_count,
  SUM(s.total_amount) AS total_sales_amount
FROM public.sales s
JOIN public.profiles p ON s.repartidor_id = p.id
GROUP BY p.id, p.full_name;


-- 3. Ventas por Producto
CREATE OR REPLACE VIEW public.view_sales_by_product AS
SELECT 
  pr.id AS product_id,
  pr.name AS product_name,
  pr.unit AS product_unit,
  SUM(si.quantity) AS total_quantity_sold,
  SUM(si.total) AS total_sales_amount
FROM public.sale_items si
JOIN public.products pr ON si.product_id = pr.id
GROUP BY pr.id, pr.name, pr.unit;


-- 4. Ingresos por Método de Pago
CREATE OR REPLACE VIEW public.view_sales_payment_methods AS
SELECT 
  payment_method,
  COUNT(id) AS sales_count,
  SUM(total_amount) AS total_amount
FROM public.sales
GROUP BY payment_method;


-- 5. Comparativa: Cargado vs Vendido vs Restante (Detallado por Jornada)
CREATE OR REPLACE VIEW public.view_load_vs_sold_vs_remaining AS
SELECT 
  dl.id AS daily_load_id,
  dl.load_date,
  dl.status AS load_status,
  p.id AS repartidor_id,
  p.full_name AS repartidor_name,
  pr.id AS product_id,
  pr.name AS product_name,
  pr.unit AS product_unit,
  dli.quantity_loaded,
  COALESCE((
    SELECT SUM(si.quantity)
    FROM public.sale_items si
    JOIN public.sales s ON si.sale_id = s.id
    WHERE s.daily_load_id = dl.id AND si.product_id = pr.id
  ), 0) AS quantity_sold,
  (dli.quantity_loaded - COALESCE((
    SELECT SUM(si.quantity)
    FROM public.sale_items si
    JOIN public.sales s ON si.sale_id = s.id
    WHERE s.daily_load_id = dl.id AND si.product_id = pr.id
  ), 0)) AS quantity_remaining,
  dli.quantity_returned
FROM public.daily_load_items dli
JOIN public.daily_loads dl ON dli.daily_load_id = dl.id
JOIN public.profiles p ON dl.repartidor_id = p.id
JOIN public.products pr ON dli.product_id = pr.id;
