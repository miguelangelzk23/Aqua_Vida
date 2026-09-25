-- ===========================================================================
-- AQUA VIDA - FUNCIONALIDAD DE ENVASES DEVUELTOS (BOTTLE RETURNS)
-- ===========================================================================

-- 1. Agregar campo en daily_loads para llevar el total de envases devueltos en la jornada
ALTER TABLE public.daily_loads 
ADD COLUMN IF NOT EXISTS returned_bottles INTEGER NOT NULL DEFAULT 0 CHECK (returned_bottles >= 0);

-- 2. Modificar la función de recarga para aceptar y sumar los envases devueltos
CREATE OR REPLACE FUNCTION public.reload_daily_load_items(
  p_items jsonb,
  p_returned_bottles INTEGER DEFAULT 0
) 
RETURNS void AS $$
DECLARE
  v_daily_load_id UUID;
BEGIN
  -- Iterar sobre el array JSON y hacer un Upsert
  INSERT INTO public.daily_load_items (daily_load_id, product_id, quantity_loaded)
  SELECT 
    (item->>'daily_load_id')::uuid,
    (item->>'product_id')::uuid,
    (item->>'quantity_loaded')::integer
  FROM jsonb_array_elements(p_items) AS item
  ON CONFLICT (daily_load_id, product_id)
  DO UPDATE SET 
    quantity_loaded = daily_load_items.quantity_loaded + EXCLUDED.quantity_loaded;

  -- Obtener el ID de la jornada para sumar los envases
  IF jsonb_array_length(p_items) > 0 THEN
    v_daily_load_id := (p_items->0->>'daily_load_id')::uuid;
  END IF;

  -- Sumar los envases devueltos a la jornada actual
  IF v_daily_load_id IS NOT NULL AND p_returned_bottles > 0 THEN
    UPDATE public.daily_loads 
    SET returned_bottles = returned_bottles + p_returned_bottles
    WHERE id = v_daily_load_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Modificar el cierre de jornada para aceptar y sumar los envases devueltos antes de cerrar
CREATE OR REPLACE FUNCTION public.close_daily_load(
  p_daily_load_id UUID,
  p_observations TEXT DEFAULT NULL,
  p_returned_bottles INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_repartidor_id UUID;
  v_status public.load_status;
  v_total_cash NUMERIC(10,2) := 0;
  v_total_transfer NUMERIC(10,2) := 0;
  v_total_other NUMERIC(10,2) := 0;
  v_total_sales NUMERIC(10,2) := 0;
  v_item RECORD;
  v_sold_qty INTEGER;
  v_returned_qty INTEGER;
BEGIN
  -- 1. Validar existencia y estado de la jornada
  SELECT repartidor_id, status INTO v_repartidor_id, v_status
  FROM public.daily_loads
  WHERE id = p_daily_load_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jornada no encontrada.';
  END IF;

  IF v_status = 'closed' THEN
    RAISE EXCEPTION 'La jornada ya se encuentra cerrada.';
  END IF;

  -- Sumar los envases devueltos en el cierre
  IF p_returned_bottles > 0 THEN
    UPDATE public.daily_loads
    SET returned_bottles = returned_bottles + p_returned_bottles
    WHERE id = p_daily_load_id;
  END IF;

  -- 2. Calcular los montos totales vendidos por método de pago
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_sales FROM public.sales WHERE daily_load_id = p_daily_load_id;
  
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_cash 
  FROM public.sales WHERE daily_load_id = p_daily_load_id AND payment_method = 'efectivo';
  
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_transfer 
  FROM public.sales WHERE daily_load_id = p_daily_load_id AND payment_method = 'transferencia';
  
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_other 
  FROM public.sales WHERE daily_load_id = p_daily_load_id AND payment_method = 'otro';

  -- 3. Calcular e ingresar cantidades retornadas y devolver stock sobrante a bodega
  FOR v_item IN 
    SELECT product_id, quantity_loaded 
    FROM public.daily_load_items 
    WHERE daily_load_id = p_daily_load_id
  LOOP
    SELECT COALESCE(SUM(si.quantity), 0) INTO v_sold_qty
    FROM public.sale_items si
    JOIN public.sales s ON si.sale_id = s.id
    WHERE s.daily_load_id = p_daily_load_id AND si.product_id = v_item.product_id;

    v_returned_qty := v_item.quantity_loaded - v_sold_qty;

    UPDATE public.daily_load_items
    SET quantity_returned = v_returned_qty
    WHERE daily_load_id = p_daily_load_id AND product_id = v_item.product_id;

    UPDATE public.global_inventory
    SET stock = stock + v_returned_qty
    WHERE product_id = v_item.product_id;
  END LOOP;

  -- 4. Registrar el Cierre de Jornada Financiero
  INSERT INTO public.daily_closures (
    daily_load_id,
    repartidor_id,
    closure_date,
    total_sales_cash,
    total_sales_transfer,
    total_sales_other,
    total_sales_amount,
    observations
  ) VALUES (
    p_daily_load_id,
    v_repartidor_id,
    now(),
    v_total_cash,
    v_total_transfer,
    v_total_other,
    v_total_sales,
    p_observations
  );

  -- 5. Marcar oficialmente la jornada como cerrada
  UPDATE public.daily_loads
  SET status = 'closed',
      closed_at = now()
  WHERE id = p_daily_load_id;

  RETURN p_daily_load_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Crear nuevo reporte para admin: Envases devueltos por repartidor
CREATE OR REPLACE FUNCTION public.get_report_returned_bottles_by_repartidor(
  p_start_date timestamptz DEFAULT NULL, 
  p_end_date timestamptz DEFAULT NULL, 
  p_tz text DEFAULT 'America/Bogota'
)
RETURNS TABLE (repartidor_id uuid, repartidor_name text, total_returned_bottles bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS repartidor_id,
    p.full_name AS repartidor_name,
    SUM(dl.returned_bottles)::bigint AS total_returned_bottles
  FROM public.daily_loads dl
  JOIN public.profiles p ON dl.repartidor_id = p.id
  WHERE (p_start_date IS NULL OR dl.created_at >= p_start_date)
    AND (p_end_date IS NULL OR dl.created_at <= p_end_date)
  GROUP BY p.id, p.full_name
  ORDER BY total_returned_bottles DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_report_returned_bottles_by_repartidor(timestamptz, timestamptz, text) TO authenticated;
