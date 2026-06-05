-- ===========================================================================
-- AQUA VIDA - PARTE 2: FUNCIONES Y DISPARADORES (TRIGGERS)
-- ===========================================================================

-- 1. Actualización Automática de 'updated_at' en Modificaciones
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.global_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2. Sincronización Automática: auth.users -> public.profiles (Supabase Auth Link)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.role_type, 'repartidor'::public.role_type)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. Inicializar Inventario en Stock Global al Crear un Producto
CREATE OR REPLACE FUNCTION public.trg_init_product_inventory()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.global_inventory (product_id, stock)
    VALUES (NEW.id, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER init_product_inventory_trigger
AFTER INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.trg_init_product_inventory();


-- 4. Validar si la Jornada está Abierta antes de Modificar Cargas o Ventas
CREATE OR REPLACE FUNCTION public.trg_check_daily_load_open()
RETURNS TRIGGER AS $$
DECLARE
    v_status load_status;
BEGIN
    SELECT status INTO v_status FROM public.daily_loads WHERE id = COALESCE(NEW.daily_load_id, OLD.daily_load_id);
    IF v_status <> 'open' THEN
        RAISE EXCEPTION 'No se pueden realizar cambios. La jornada ya se encuentra cerrada.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_load_status_items BEFORE INSERT OR UPDATE OR DELETE ON public.daily_load_items FOR EACH ROW EXECUTE FUNCTION public.trg_check_daily_load_open();
CREATE TRIGGER check_load_status_sales BEFORE INSERT OR UPDATE OR DELETE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.trg_check_daily_load_open();


-- 5. Control de Inventario en Bodega al Cargar Mercancía al Repartidor
CREATE OR REPLACE FUNCTION public.trg_sync_global_inventory_on_load()
RETURNS TRIGGER AS $$
BEGIN
    -- INSERT: Restar de la bodega global
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.global_inventory
        SET stock = stock - NEW.quantity_loaded
        WHERE product_id = NEW.product_id;
    
    -- UPDATE: Ajustar diferencia cargada en bodega global
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE public.global_inventory
        SET stock = stock - (NEW.quantity_loaded - OLD.quantity_loaded)
        WHERE product_id = NEW.product_id;
    
    -- DELETE: Devolver toda la carga a la bodega global
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.global_inventory
        SET stock = stock + OLD.quantity_loaded
        WHERE product_id = OLD.product_id;
    END IF;
    
    -- La restricción check 'stock >= 0' en global_inventory cancelará la transacción
    -- automáticamente si se intenta cargar más producto del disponible en bodega.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_global_inventory_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.daily_load_items
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_global_inventory_on_load();


-- 6. Validar Stock Móvil (en Vehículo) antes de Registrar una Venta
CREATE OR REPLACE FUNCTION public.trg_check_mobile_stock_before_sale()
RETURNS TRIGGER AS $$
DECLARE
    v_daily_load_id UUID;
    v_qty_loaded INTEGER;
    v_qty_sold INTEGER;
BEGIN
    -- Obtener la jornada asociada a la venta
    SELECT daily_load_id INTO v_daily_load_id FROM public.sales WHERE id = NEW.sale_id;
    
    -- Obtener la cantidad total cargada de este producto en la jornada
    SELECT COALESCE(quantity_loaded, 0) INTO v_qty_loaded
    FROM public.daily_load_items
    WHERE daily_load_id = v_daily_load_id AND product_id = NEW.product_id;
    
    IF v_qty_loaded = 0 THEN
        RAISE EXCEPTION 'El producto solicitado no fue cargado en el vehículo para esta jornada.';
    END IF;
    
    -- Calcular la cantidad vendida hasta el momento en esta jornada (excluyendo el item actual)
    SELECT COALESCE(SUM(si.quantity), 0) INTO v_qty_sold
    FROM public.sale_items si
    JOIN public.sales s ON si.sale_id = s.id
    WHERE s.daily_load_id = v_daily_load_id 
      AND si.product_id = NEW.product_id
      AND si.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
      
    -- Validar que no se venda más de lo cargado
    IF v_qty_loaded < (v_qty_sold + NEW.quantity) THEN
        RAISE EXCEPTION 'Inventario insuficiente en el vehículo. Cargado: %, Vendido Previo: %, Solicitado: %', 
            v_qty_loaded, v_qty_sold, NEW.quantity;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_mobile_stock_before_sale_trigger
BEFORE INSERT OR UPDATE ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.trg_check_mobile_stock_before_sale();


-- 7. Automatización de la Suma de Totales en la Venta Principal al Agregar Items
CREATE OR REPLACE FUNCTION public.trg_update_sales_total_amount()
RETURNS TRIGGER AS $$
DECLARE
    v_sale_id UUID;
    v_total NUMERIC(10,2);
BEGIN
    v_sale_id := COALESCE(NEW.sale_id, OLD.sale_id);
    
    SELECT COALESCE(SUM(total), 0) INTO v_total
    FROM public.sale_items
    WHERE sale_id = v_sale_id;
    
    UPDATE public.sales
    SET total_amount = v_total
    WHERE id = v_sale_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sales_total_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.trg_update_sales_total_amount();


-- 8. Procedimiento Almacenado de Cierre de Jornada (RPC)
CREATE OR REPLACE FUNCTION public.close_daily_load(
  p_daily_load_id UUID,
  p_observations TEXT DEFAULT NULL
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
    -- Calcular cantidad vendida del producto en esta jornada
    SELECT COALESCE(SUM(si.quantity), 0) INTO v_sold_qty
    FROM public.sale_items si
    JOIN public.sales s ON si.sale_id = s.id
    WHERE s.daily_load_id = p_daily_load_id AND si.product_id = v_item.product_id;

    -- Sobrante = Cargado - Vendido
    v_returned_qty := v_item.quantity_loaded - v_sold_qty;

    -- Registrar el retorno en la tabla de carga diaria
    UPDATE public.daily_load_items
    SET quantity_returned = v_returned_qty
    WHERE daily_load_id = p_daily_load_id AND product_id = v_item.product_id;

    -- Devolver stock sobrante al inventario general (bodega)
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
