DROP FUNCTION IF EXISTS public.get_report_sales_by_repartidor(timestamptz, timestamptz, text);

CREATE OR REPLACE FUNCTION public.get_report_sales_by_repartidor(p_start_date timestamptz DEFAULT NULL, p_end_date timestamptz DEFAULT NULL, p_tz text DEFAULT 'America/Bogota')
RETURNS TABLE (
  repartidor_id uuid, 
  repartidor_name text, 
  total_sales_count bigint, 
  total_sales_amount numeric,
  cash_amount numeric,
  transfer_amount numeric,
  other_amount numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS repartidor_id,
    p.full_name AS repartidor_name,
    COUNT(DISTINCT s.id)::bigint AS total_sales_count,
    COALESCE(SUM(s.total_amount), 0)::numeric AS total_sales_amount,
    COALESCE(SUM(CASE WHEN s.payment_method = 'efectivo' THEN s.total_amount ELSE 0 END), 0)::numeric AS cash_amount,
    COALESCE(SUM(CASE WHEN s.payment_method = 'transferencia' THEN s.total_amount ELSE 0 END), 0)::numeric AS transfer_amount,
    COALESCE(SUM(CASE WHEN s.payment_method = 'otro' THEN s.total_amount ELSE 0 END), 0)::numeric AS other_amount
  FROM public.sales s
  JOIN public.profiles p ON s.repartidor_id = p.id
  WHERE (p_start_date IS NULL OR s.sale_date >= p_start_date)
    AND (p_end_date IS NULL OR s.sale_date <= p_end_date)
  GROUP BY p.id, p.full_name
  ORDER BY total_sales_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
