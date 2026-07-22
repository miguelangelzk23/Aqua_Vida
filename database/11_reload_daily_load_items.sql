-- ===========================================================================
-- AQUA VIDA - RECARGA DE INVENTARIO
-- ===========================================================================

-- Esta función permite a un repartidor agregar más cantidad a un producto que ya tiene en su jornada actual,
-- o insertarlo por primera vez si no lo había cargado antes.

CREATE OR REPLACE FUNCTION public.reload_daily_load_items(p_items jsonb) 
RETURNS void AS $$
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION public.reload_daily_load_items(jsonb) TO authenticated;
