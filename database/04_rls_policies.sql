-- ===========================================================================
-- AQUA VIDA - PARTE 4: POLÍTICAS DE SEGURIDAD RLS (ROW LEVEL SECURITY)
-- ===========================================================================

-- 1. Habilitar RLS en cada tabla
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_load_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_closures ENABLE ROW LEVEL SECURITY;

-- 2. Función de ayuda: Validar si el usuario actual es Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Políticas para: profiles
CREATE POLICY "Cualquier usuario autenticado puede ver perfiles"
ON public.profiles FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin o el propio usuario pueden actualizar perfiles"
ON public.profiles FOR UPDATE
USING (is_admin() OR auth.uid() = id);

CREATE POLICY "Solo Admin puede insertar perfiles manualmente"
ON public.profiles FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Solo Admin puede eliminar perfiles"
ON public.profiles FOR DELETE
USING (is_admin());


-- 4. Políticas para: products
CREATE POLICY "Usuarios pueden ver productos activos"
ON public.products FOR SELECT
USING (is_admin() OR (is_active = true AND auth.role() = 'authenticated'));

CREATE POLICY "Solo Admin puede modificar productos"
ON public.products FOR ALL
USING (is_admin());


-- 5. Políticas para: global_inventory
CREATE POLICY "Usuarios autenticados pueden ver el inventario global"
ON public.global_inventory FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Solo Admin puede modificar inventario global directamente"
ON public.global_inventory FOR ALL
USING (is_admin());


-- 6. Políticas para: daily_loads
CREATE POLICY "Admin o repartidor dueño pueden ver jornadas"
ON public.daily_loads FOR SELECT
USING (is_admin() OR repartidor_id = auth.uid());

CREATE POLICY "Admin o repartidor dueño pueden iniciar jornadas"
ON public.daily_loads FOR INSERT
WITH CHECK (is_admin() OR (repartidor_id = auth.uid() AND auth.role() = 'authenticated'));

CREATE POLICY "Admin o repartidor dueño pueden actualizar jornadas abiertas"
ON public.daily_loads FOR UPDATE
USING (is_admin() OR (repartidor_id = auth.uid() AND status = 'open'));

CREATE POLICY "Solo Admin puede borrar jornadas"
ON public.daily_loads FOR DELETE
USING (is_admin());


-- 7. Políticas para: daily_load_items
CREATE POLICY "Admin o repartidor dueño pueden ver carga"
ON public.daily_load_items FOR SELECT
USING (
    is_admin() OR 
    EXISTS (SELECT 1 FROM public.daily_loads WHERE id = daily_load_id AND repartidor_id = auth.uid())
);

CREATE POLICY "Admin o repartidor dueño pueden agregar carga a jornadas abiertas"
ON public.daily_load_items FOR INSERT
WITH CHECK (
    is_admin() OR 
    EXISTS (SELECT 1 FROM public.daily_loads WHERE id = daily_load_id AND repartidor_id = auth.uid() AND status = 'open')
);

CREATE POLICY "Admin o repartidor dueño pueden modificar carga en jornadas abiertas"
ON public.daily_load_items FOR UPDATE
USING (
    is_admin() OR 
    EXISTS (SELECT 1 FROM public.daily_loads WHERE id = daily_load_id AND repartidor_id = auth.uid() AND status = 'open')
);

CREATE POLICY "Admin o repartidor dueño pueden eliminar carga de jornadas abiertas"
ON public.daily_load_items FOR DELETE
USING (
    is_admin() OR 
    EXISTS (SELECT 1 FROM public.daily_loads WHERE id = daily_load_id AND repartidor_id = auth.uid() AND status = 'open')
);


-- 8. Políticas para: sales
CREATE POLICY "Admin o repartidor dueño pueden ver ventas"
ON public.sales FOR SELECT
USING (is_admin() OR repartidor_id = auth.uid());

CREATE POLICY "Admin o repartidor dueño pueden insertar ventas en jornadas abiertas"
ON public.sales FOR INSERT
WITH CHECK (
    is_admin() OR 
    (repartidor_id = auth.uid() AND EXISTS (SELECT 1 FROM public.daily_loads WHERE id = daily_load_id AND repartidor_id = auth.uid() AND status = 'open'))
);

CREATE POLICY "Solo Admin puede actualizar o eliminar ventas registradas"
ON public.sales FOR UPDATE
USING (is_admin());

CREATE POLICY "Solo Admin puede eliminar ventas"
ON public.sales FOR DELETE
USING (is_admin());


-- 9. Políticas para: sale_items
CREATE POLICY "Admin o repartidor dueño pueden ver items vendidos"
ON public.sale_items FOR SELECT
USING (
    is_admin() OR 
    EXISTS (SELECT 1 FROM public.sales WHERE id = sale_id AND repartidor_id = auth.uid())
);

CREATE POLICY "Admin o repartidor dueño pueden insertar items vendidos en jornadas abiertas"
ON public.sale_items FOR INSERT
WITH CHECK (
    is_admin() OR 
    EXISTS (
        SELECT 1 FROM public.sales s 
        JOIN public.daily_loads dl ON s.daily_load_id = dl.id 
        WHERE s.id = sale_id AND s.repartidor_id = auth.uid() AND dl.status = 'open'
    )
);

CREATE POLICY "Solo Admin puede modificar o eliminar items vendidos"
ON public.sale_items FOR UPDATE
USING (is_admin());

CREATE POLICY "Solo Admin puede eliminar items vendidos"
ON public.sale_items FOR DELETE
USING (is_admin());


-- 10. Políticas para: daily_closures
CREATE POLICY "Admin o repartidor dueño pueden ver cierres"
ON public.daily_closures FOR SELECT
USING (is_admin() OR repartidor_id = auth.uid());

CREATE POLICY "Admin o repartidor dueño pueden insertar cierres en jornadas abiertas"
ON public.daily_closures FOR INSERT
WITH CHECK (
    is_admin() OR 
    (repartidor_id = auth.uid() AND EXISTS (SELECT 1 FROM public.daily_loads WHERE id = daily_load_id AND repartidor_id = auth.uid() AND status = 'open'))
);

CREATE POLICY "Solo Admin puede modificar cierres de jornada"
ON public.daily_closures FOR UPDATE
USING (is_admin());

CREATE POLICY "Solo Admin puede borrar cierres de jornada"
ON public.daily_closures FOR DELETE
USING (is_admin());
