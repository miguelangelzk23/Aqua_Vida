-- ===========================================================================
-- AQUA VIDA - PARTE 5: DATOS DE PRUEBA Y SIMULACIÓN
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. REGISTRO DE PRODUCTOS DE PRUEBA
-- ---------------------------------------------------------------------------
-- Insertamos una variedad de productos con diferentes presentaciones (unidades de texto flexibles)
INSERT INTO public.products (name, base_price, unit, is_active) VALUES
('Bolsa de Agua de 5 Litros', 3500.00, 'Bolsa 5L', true),
('Paca de Agua en Bolsa 350ml (x24)', 9000.00, 'Paca x24', true),
('Botellón de Agua de 20 Litros', 12000.00, 'Botellón 20L', true),
('Botella de Agua Personal 600ml', 1500.00, 'Botella 600ml', true),
('Botella de Agua Deportiva 1L', 2500.00, 'Botella 1L', true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. CARGA DE STOCK AL INVENTARIO GENERAL (BODEGA PRINCIPAL)
-- ---------------------------------------------------------------------------
-- Aumentamos el stock físico en la bodega para poder simular las cargas de los repartidores.
-- Usamos subconsultas para obtener los UUIDs dinámicamente según el nombre de los productos.
UPDATE public.global_inventory 
SET stock = 500 
WHERE product_id = (SELECT id FROM public.products WHERE name = 'Bolsa de Agua de 5 Litros');

UPDATE public.global_inventory 
SET stock = 150 
WHERE product_id = (SELECT id FROM public.products WHERE name = 'Paca de Agua en Bolsa 350ml (x24)');

UPDATE public.global_inventory 
SET stock = 100 
WHERE product_id = (SELECT id FROM public.products WHERE name = 'Botellón de Agua de 20 Litros');

UPDATE public.global_inventory 
SET stock = 300 
WHERE product_id = (SELECT id FROM public.products WHERE name = 'Botella de Agua Personal 600ml');

UPDATE public.global_inventory 
SET stock = 200 
WHERE product_id = (SELECT id FROM public.products WHERE name = 'Botella de Agua Deportiva 1L');


-- ---------------------------------------------------------------------------
-- 3. GUÍA PARA LA CREACIÓN DE USUARIOS DE PRUEBA (EN LA CONSOLA DE SUPABASE)
-- ---------------------------------------------------------------------------
/*
  Dado que la autenticación la maneja Supabase Auth, debes crear los usuarios en la consola web de Supabase:
  
  1. Ve a tu proyecto en Supabase -> 'Authentication' -> 'Users' -> 'Add User' -> 'Create User'.
  2. Crea un Administrador:
     - Email: admin@aquavida.com
     - Password: [La que desees]
     - IMPORTANT: En la sección de 'User Metadata' (JSON), añade lo siguiente:
       {
         "full_name": "Carlos Admin",
         "role": "admin"
       }
       (Esto disparará el trigger para crear su perfil de administrador).

  3. Crea un Repartidor:
     - Email: Juan.repartidor@aquavida.com
     - Password: [La que desees]
     - IMPORTANT: En 'User Metadata', añade lo siguiente:
       {
         "full_name": "Juan Perez",
         "role": "repartidor"
       }
       (Esto disparará el trigger para crear su perfil con rol repartidor).
*/


-- ---------------------------------------------------------------------------
-- 4. CONSULTAS DE VALIDACIÓN
-- ---------------------------------------------------------------------------
-- Ejecuta estas consultas para validar que los productos y el inventario estén correctamente cargados:

-- Ver catálogo de productos
-- SELECT * FROM public.products;

-- Ver inventario general en bodega
-- SELECT p.name, p.unit, i.stock, i.updated_at 
-- FROM public.global_inventory i
-- JOIN public.products p ON i.product_id = p.id;

-- Ver perfiles creados por el Auth Trigger
-- SELECT * FROM public.profiles;


-- ---------------------------------------------------------------------------
-- 5. SCRIPT DE SIMULACIÓN DE FLUJO COMPLETO (OPCIONAL - PARA PRUEBAS SQL)
-- ---------------------------------------------------------------------------
/*
  Para simular una jornada completa de forma manual en el SQL Editor (reemplaza 'ID_DE_JUAN' por el ID de la tabla profiles):

  -- PASO A: Iniciar una jornada de trabajo
  INSERT INTO public.daily_loads (repartidor_id, load_date, status)
  VALUES ('ID_DE_JUAN', CURRENT_DATE, 'open')
  RETURNING id; -- Copiar este 'JORNADA_ID' generado para los siguientes pasos.

  -- PASO B: Cargar el vehículo del repartidor (Esto descuenta del inventario general en bodega automáticamente)
  INSERT INTO public.daily_load_items (daily_load_id, product_id, quantity_loaded)
  VALUES 
  ('JORNADA_ID', (SELECT id FROM public.products WHERE name = 'Bolsa de Agua de 5 Litros'), 50),
  ('JORNADA_ID', (SELECT id FROM public.products WHERE name = 'Botellón de Agua de 20 Litros'), 20);

  -- PASO C: Validar que el stock global en bodega disminuyó y el móvil de Juan tiene carga
  -- SELECT * FROM public.global_inventory;
  -- SELECT * FROM public.view_load_vs_sold_vs_remaining;

  -- PASO D: Registrar Ventas de la ruta (La columna 'total' de los items e ingresos totales de ventas se autocalculan)
  -- Venta 1: Cliente Tienda de Don Pepe (Pago en Efectivo)
  WITH nueva_venta AS (
      INSERT INTO public.sales (daily_load_id, repartidor_id, client_name, description, payment_method)
      VALUES ('JORNADA_ID', 'ID_DE_JUAN', 'Tienda Don Pepe', 'Frente al parque principal', 'efectivo')
      RETURNING id
  )
  INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price)
  VALUES 
  ((SELECT id FROM nueva_venta), (SELECT id FROM public.products WHERE name = 'Bolsa de Agua de 5 Litros'), 5, 3500.00),
  ((SELECT id FROM nueva_venta), (SELECT id FROM public.products WHERE name = 'Botellón de Agua de 20 Litros'), 2, 12000.00);

  -- Venta 2: Cliente Supermercado Mercamás (Pago por Transferencia)
  WITH nueva_venta AS (
      INSERT INTO public.sales (daily_load_id, repartidor_id, client_name, description, payment_method)
      VALUES ('JORNADA_ID', 'ID_DE_JUAN', 'Supermercado Mercamás', 'Pago recibido por Nequi', 'transferencia')
      RETURNING id
  )
  INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price)
  VALUES 
  ((SELECT id FROM nueva_venta), (SELECT id FROM public.products WHERE name = 'Bolsa de Agua de 5 Litros'), 10, 3500.00),
  ((SELECT id FROM nueva_venta), (SELECT id FROM public.products WHERE name = 'Botellón de Agua de 20 Litros'), 3, 12000.00);

  -- PASO E: Ver informes en tiempo real (Comparativa de carga vs venta)
  -- SELECT * FROM public.view_load_vs_sold_vs_remaining;

  -- PASO F: Hacer Cierre de Jornada (RPC)
  -- Ejecuta el cierre de la jornada (Esto calcula automáticamente la liquidación, registra las cantidades devueltas 
  -- y reintegra el sobrante [35 bolsas y 15 botellones] al stock de bodega general de forma atómica).
  SELECT public.close_daily_load('JORNADA_ID', 'Arqueo exitoso. Entregó dinero completo.');

  -- PASO G: Verificar que todo se cerró y el stock regresó a bodega
  -- SELECT * FROM public.daily_closures;
  -- SELECT * FROM public.daily_loads;
  -- SELECT * FROM public.global_inventory;
*/
