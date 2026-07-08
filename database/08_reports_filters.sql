-- ===========================================================================
-- AQUA VIDA - REPORTE CON FILTROS DE FECHA (RPCs)
-- Ejecuta este script en el SQL Editor de Supabase
-- ===========================================================================

-- 1. Ventas por Día (Filtradas)
CREATE OR REPLACE FUNCTION public.get_report_sales_by_day(p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS TABLE (date date, total_sales_count bigint, total_sales_amount numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sale_date::DATE AS date,
    COUNT(DISTINCT s.id) AS total_sales_count,
    SUM(s.total_amount) AS total_sales_amount
  FROM public.sales s
  WHERE (p_start_date IS NULL OR s.sale_date::DATE >= p_start_date)
    AND (p_end_date IS NULL OR s.sale_date::DATE <= p_end_date)
  GROUP BY sale_date::DATE
  ORDER BY sale_date::DATE DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Ventas por Repartidor (Filtradas)
CREATE OR REPLACE FUNCTION public.get_report_sales_by_repartidor(p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS TABLE (repartidor_id uuid, repartidor_name text, total_sales_count bigint, total_sales_amount numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS repartidor_id,
    p.full_name AS repartidor_name,
    COUNT(DISTINCT s.id) AS total_sales_count,
    SUM(s.total_amount) AS total_sales_amount
  FROM public.sales s
  JOIN public.profiles p ON s.repartidor_id = p.id
  WHERE (p_start_date IS NULL OR s.sale_date::DATE >= p_start_date)
    AND (p_end_date IS NULL OR s.sale_date::DATE <= p_end_date)
  GROUP BY p.id, p.full_name
  ORDER BY total_sales_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Ventas por Producto (Filtradas)
CREATE OR REPLACE FUNCTION public.get_report_sales_by_product(p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS TABLE (product_id uuid, product_name varchar, product_unit varchar, total_quantity_sold numeric, total_sales_amount numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id AS product_id,
    pr.name AS product_name,
    pr.unit AS product_unit,
    SUM(si.quantity) AS total_quantity_sold,
    SUM(si.total) AS total_sales_amount
  FROM public.sale_items si
  JOIN public.sales s ON si.sale_id = s.id
  JOIN public.products pr ON si.product_id = pr.id
  WHERE (p_start_date IS NULL OR s.sale_date::DATE >= p_start_date)
    AND (p_end_date IS NULL OR s.sale_date::DATE <= p_end_date)
  GROUP BY pr.id, pr.name, pr.unit
  ORDER BY total_sales_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Ingresos por Método de Pago (Filtradas)
CREATE OR REPLACE FUNCTION public.get_report_payment_methods(p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS TABLE (payment_method public.payment_method_type, sales_count bigint, total_amount numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.payment_method,
    COUNT(s.id) AS sales_count,
    SUM(s.total_amount) AS total_amount
  FROM public.sales s
  WHERE (p_start_date IS NULL OR s.sale_date::DATE >= p_start_date)
    AND (p_end_date IS NULL OR s.sale_date::DATE <= p_end_date)
  GROUP BY s.payment_method
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Comparativa: Cargado vs Vendido vs Restante (Filtradas por Jornada)
CREATE OR REPLACE FUNCTION public.get_report_load_vs_sold(p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS TABLE (
  daily_load_id uuid,
  load_date date,
  load_status varchar,
  repartidor_id uuid,
  repartidor_name text,
  product_id uuid,
  product_name varchar,
  product_unit varchar,
  quantity_loaded numeric,
  quantity_sold numeric,
  quantity_remaining numeric,
  quantity_returned numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dl.id AS daily_load_id,
    dl.load_date,
    dl.status::varchar AS load_status,
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
  JOIN public.products pr ON dli.product_id = pr.id
  WHERE (p_start_date IS NULL OR dl.load_date >= p_start_date)
    AND (p_end_date IS NULL OR dl.load_date <= p_end_date)
  ORDER BY dl.load_date DESC, p.full_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos para usar estos RPCs a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.get_report_sales_by_day(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_report_sales_by_repartidor(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_report_sales_by_product(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_report_payment_methods(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_report_load_vs_sold(date, date) TO authenticated;
