-- ===========================================================================
-- AQUA VIDA - REPORTE DE DESGLOSE DE VENTAS POR PRODUCTO, PRECIO Y REPARTIDOR
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.get_report_sales_breakdown_by_product_price_repartidor(
  p_start_date timestamptz DEFAULT NULL, 
  p_end_date timestamptz DEFAULT NULL, 
  p_tz text DEFAULT 'America/Bogota'
)
RETURNS TABLE (
  product_id uuid, 
  product_name text, 
  unit_price numeric, 
  repartidor_id uuid, 
  repartidor_name text, 
  total_quantity bigint, 
  total_amount numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS product_id,
    p.name AS product_name,
    si.unit_price,
    prof.id AS repartidor_id,
    prof.full_name AS repartidor_name,
    SUM(si.quantity)::bigint AS total_quantity,
    SUM(si.total)::numeric AS total_amount
  FROM public.sale_items si
  JOIN public.sales s ON si.sale_id = s.id
  JOIN public.products p ON si.product_id = p.id
  JOIN public.profiles prof ON s.repartidor_id = prof.id
  WHERE (p_start_date IS NULL OR s.sale_date >= p_start_date)
    AND (p_end_date IS NULL OR s.sale_date <= p_end_date)
  GROUP BY p.id, p.name, si.unit_price, prof.id, prof.full_name
  ORDER BY p.name ASC, si.unit_price DESC, total_quantity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_report_sales_breakdown_by_product_price_repartidor(timestamptz, timestamptz, text) TO authenticated;
