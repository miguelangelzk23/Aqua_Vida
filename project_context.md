# Contexto del Proyecto: Aqua Vida 💧

Este documento contiene una descripción técnica detallada e integral del proyecto **Aqua Vida**, un sistema de gestión para distribución y venta de agua en botellones y bolsas. Sirve como referencia completa del contexto del proyecto para desarrolladores o agentes de IA.

---

## 1. Resumen General del Proyecto
**Aqua Vida** es una aplicación web full-stack diseñada para controlar el inventario y las ventas de una empresa distribuidora de agua. El sistema maneja dos flujos de trabajo principales según el rol del usuario:
1. **Administrador (Admin):** Gestiona el catálogo de productos, ajusta el stock de la bodega principal (inventario global) y visualiza reportes consolidados financieros y de stock.
2. **Repartidor (Delivery):** Inicia su jornada diaria cargando producto desde la bodega al vehículo (inventario móvil), registra ventas durante el trayecto (con validación de existencias en el vehículo) y realiza el cierre de jornada, reintegrando de forma atómica el sobrante de mercancía a la bodega y generando el arqueo financiero de caja.

### Stack Tecnológico
- **Frontend:** Angular v19.2.0 (Standalone Components, Signals, Router Guards).
- **Estilos:** TailwindCSS v4.3.0 (vía `@tailwindcss/postcss`), postcss.
- **Backend/Base de Datos:** Supabase (PostgreSQL, Row Level Security - RLS, Triggers y Funciones PL/pgSQL).
- **Iconografía:** Lucide Icons (`@lucide/angular`).

---

## 2. Arquitectura de Base de Datos (Supabase / PostgreSQL)
La base de datos aprovecha el motor relacional de PostgreSQL y su sistema de seguridad a nivel de fila (RLS) junto con automatizaciones en el lado del servidor para garantizar la consistencia atómica del inventario.

### 2.1 Tipos Enum Personalizados
- **`role_type`:** `('admin', 'repartidor')` — Define el tipo de perfil del usuario.
- **`payment_method_type`:** `('efectivo', 'transferencia', 'otro')` — Métodos de pago permitidos en el registro de ventas.
- **`load_status`:** `('open', 'closed')` — Estado de la jornada de un repartidor.

### 2.2 Tablas
1. **`public.profiles`**
   - Vinculada directamente con `auth.users` de Supabase a través de la llave primaria `id`.
   - Columnas: `id (UUID, PK)`, `full_name (TEXT)`, `role (role_type)`, `is_active (BOOLEAN)`, `created_at`, `updated_at`.
   
2. **`public.products`**
   - Catálogo de productos disponibles para la venta.
   - Columnas: `id (UUID, PK)`, `name (TEXT, UNIQUE)`, `base_price (NUMERIC)`, `unit (TEXT)` (ej. 'Bolsa 5L', 'Botellón 20L'), `is_active (BOOLEAN)`.
   
3. **`public.global_inventory`**
   - Stock centralizado en la bodega física principal de la empresa.
   - Columnas: `product_id (UUID, PK, FK -> products)`, `stock (INTEGER, con restricción `CHECK (stock >= 0)`), `updated_at`.
   
4. **`public.daily_loads`**
   - Registra las jornadas de trabajo individuales de los repartidores.
   - Columnas: `id (UUID, PK)`, `repartidor_id (UUID, FK -> profiles)`, `load_date (DATE)`, `status (load_status, por defecto 'open')`, `created_at`, `closed_at`.
   - **Índice Único Parcial:** Un repartidor solo puede tener una única jornada con estado `'open'` al mismo tiempo (`open_load_per_repartidor`).
   
5. **`public.daily_load_items`**
   - Detalle de la carga de producto inicial colocada en el vehículo del repartidor para una jornada dada.
   - Columnas: `id (UUID, PK)`, `daily_load_id (UUID, FK -> daily_loads)`, `product_id (UUID, FK -> products)`, `quantity_loaded (INTEGER > 0)`, `quantity_returned (INTEGER >= 0)`.
   - **Restricción:** Clave única compuesta en `(daily_load_id, product_id)`.
   
6. **`public.sales`**
   - Cabecera de las ventas individuales realizadas por un repartidor durante su jornada.
   - Columnas: `id (UUID, PK)`, `daily_load_id (UUID, FK -> daily_loads)`, `repartidor_id (UUID, FK -> profiles)`, `client_name (TEXT, opcional)`, `description (TEXT, opcional)`, `sale_date (TIMESTAMPTZ)`, `payment_method (payment_method_type)`, `total_amount (NUMERIC)`.
   
7. **`public.sale_items`**
   - Detalle de los productos e importes vendidos dentro de una venta.
   - Columnas: `id (UUID, PK)`, `sale_id (UUID, FK -> sales)`, `product_id (UUID, FK -> products)`, `quantity (INTEGER > 0)`, `unit_price (NUMERIC)`, `total (NUMERIC, auto-calculado como `quantity * unit_price` y almacenado)`.
   - **Restricción:** Clave única compuesta en `(sale_id, product_id)`.
   
8. **`public.daily_closures`**
   - Resumen financiero y consolidado de caja generado al cerrar una jornada.
   - Columnas: `id (UUID, PK)`, `daily_load_id (UUID, FK -> daily_loads, UNIQUE)`, `repartidor_id (UUID, FK -> profiles)`, `closure_date (TIMESTAMPTZ)`, `total_sales_cash (NUMERIC)`, `total_sales_transfer (NUMERIC)`, `total_sales_other (NUMERIC)`, `total_sales_amount (NUMERIC)`, `observations (TEXT)`.

---

## 3. Lógica de Servidor (Triggers, Funciones y Vistas)
Para garantizar la integridad transaccional, toda la lógica de inventario reside en la base de datos PostgreSQL, evitando discrepancias causadas por fallos en el frontend.

### 3.1 Triggers Clave
- **Actualización de Timestamp (`update_updated_at_column`):** Modifica `updated_at` al editar filas en `profiles`, `products` o `global_inventory`.
- **Sincronización de Perfiles (`handle_new_user`):** Al insertar un usuario en `auth.users` de Supabase, crea automáticamente la fila en `public.profiles`, leyendo opcionalmente `full_name` y `role` desde los metadatos de usuario (`raw_user_meta_data`).
- **Inicializador de Stock (`trg_init_product_inventory`):** Cuando se crea un producto en `products`, inserta una fila con stock `0` en `global_inventory`.
- **Validación de Jornada Abierta (`trg_check_daily_load_open`):** Lanza una excepción e impide cambios en `daily_load_items` o `sales` si la jornada (`daily_loads.status`) está cerrada (`closed`).
- **Sincronización de Inventario Central (`trg_sync_global_inventory_on_load`):**
  - Al insertar en `daily_load_items`, resta la cantidad cargada de `global_inventory.stock`.
  - Al actualizar la carga, calcula la diferencia y la descuenta o reintegra a bodega.
  - Al borrar el item de carga, devuelve todo a la bodega.
  - *Nota:* La restricción `CHECK (stock >= 0)` en bodega cancela automáticamente cualquier carga que supere el stock real disponible.
- **Validación de Inventario del Vehículo (`trg_check_mobile_stock_before_sale`):** Al insertar un item en `sale_items`, calcula dinámicamente si el repartidor cuenta con existencias en su vehículo para esa jornada (`cargado - vendido_previo >= solicitado`). Si no, detiene la transacción.
- **Recálculo de Total de Venta (`trg_update_sales_total_amount`):** Suma automáticamente todos los totales de `sale_items` y actualiza `sales.total_amount` en la cabecera del registro.

### 3.2 Procedimiento Almacenado de Cierre de Jornada (`close_daily_load`)
Es un RPC (Remote Procedure Call) en PostgreSQL que realiza las siguientes operaciones en una sola transacción atómica:
1. Valida que la jornada exista y esté abierta.
2. Suma el total vendido consolidado por cada método de pago (`efectivo`, `transferencia`, `otro`).
3. Para cada producto cargado en la jornada:
   - Calcula el inventario restante (Sobrante = Cargado - Vendido).
   - Guarda este valor en la columna `quantity_returned` de `daily_load_items`.
   - Reintegra el sobrante directamente al inventario general (`global_inventory.stock`).
4. Inserta el registro financiero en `public.daily_closures`.
5. Cambia el estado de la jornada a `closed` e inserta el timestamp en `closed_at`.

### 3.3 Vistas de Reportes para el Administrador
- **`view_sales_by_day`:** Ventas agrupadas y ordenadas cronológicamente por día.
- **`view_sales_by_repartidor`:** Ventas consolidadas y cantidad total de ingresos facturados por repartidor.
- **`view_sales_by_product`:** Cantidad física total y facturación monetaria acumulada por cada producto.
- **`view_sales_payment_methods`:** Totales e importes desglosados por método de pago (`efectivo`, `transferencia`, `otro`).
- **`view_load_vs_sold_vs_remaining`:** Comparativa detallada a nivel de ítem para auditoría: qué repartidor, en qué fecha y qué jornada cargó X producto, cuánto vendió en ruta, cuánto le quedó restante en el camión y cuánto se devolvió físicamente a la bodega al cerrar.

### 3.4 Row Level Security (RLS)
La base de datos utiliza RLS para la protección de la información:
- **Administrador:** Pasa todas las políticas de lectura/escritura mediante la función helper `is_admin()`, que verifica si el rol en su perfil es `'admin'`.
- **Repartidores:**
  - Pueden leer el catálogo de productos activos.
  - Pueden ver todo el inventario de bodega física (para planificar cargas).
  - Tienen restringido el acceso de lectura y escritura en `daily_loads`, `daily_load_items`, `sales`, `sale_items` y `daily_closures` **únicamente a aquellos registros donde su ID sea igual a su UID autenticado (`auth.uid()`)**.
  - No pueden modificar o eliminar ventas/cierres una vez creados (estas operaciones de edición sólo quedan expuestas al Administrador).

---

## 4. Frontend en Angular 19
El frontend está desarrollado bajo el patrón Standalone de Angular 19, utilizando **Signals** para la gestión de estados reactivos.

### 4.1 Estructura del Directorio `src/app/`
```text
src/app/
├── app.component.ts         # Componente raíz
├── app.config.ts            # Proveedores globales (Router, etc.)
├── app.routes.ts            # Definición de rutas y Guards de seguridad
├── core/                    # Servicios base globales y guards de seguridad
│   ├── guards/
│   │   └── auth.guards.ts   # CanActivateFn (authGuard, adminGuard, repartidorGuard)
│   └── services/
│       ├── auth.service.ts  # Manejo de inicio/cierre de sesión y perfiles
│       └── supabase.service.ts # Cliente y llamadas al API de Supabase
├── layout/                  # Contenedores estructurales con barra lateral (Sidebar)
│   ├── admin-layout/
│   └── repartidor-layout/
└── features/                # Vistas de negocio
    ├── auth/
    │   └── login/           # Inicio de sesión
    ├── admin/               # Módulos del Administrador
    │   ├── dashboard/       # Monitoreo de jornadas en ruta y ventas de hoy
    │   ├── inventory/       # Ajustador manual del inventario de bodega
    │   ├── products/        # ABM / Catálogo de Productos
    │   └── reports/         # Pestañas con informes detallados
    └── repartidor/          # Módulos del Repartidor
        ├── dashboard/       # Flujo de carga física e inicio de ruta
        ├── sales/           # Registro dinámico de ventas en ruta
        └── closure/         # Pantalla para realizar el arqueo y cierre
```

### 4.2 Lógica de Autenticación y Guards (`AuthService` y `auth.guards.ts`)
- **`AuthService`**: Almacena al usuario actual en el Signal `currentUser`. Expone Computed Signals de ayuda como `isAdmin` e `isRepartidor`. Escucha eventos de cambio de sesión (`onAuthStateChange`) para sincronizar el estado.
- **Guards**: 
  - `authGuard`: Valida sesión genérica (si no está autenticado, redirige al `/login`).
  - `adminGuard`: Valida rol de administrador. Si es repartidor, lo redirige a `/repartidor`.
  - `repartidorGuard`: Valida rol de repartidor. Si es admin, lo redirige a `/admin`.
  - *Sincronía:* Dado que la sesión de Supabase inicializa de forma asíncrona, los Guards contienen un bucle de espera reactivo basado en el Signal `loading` para evitar bloqueos falsos al refrescar el navegador.

### 4.3 Flujos de Usuario e Interfaz de Pantallas
#### A. Flujo de Repartidor
1. **Inicio de Ruta (Dashboard):** Si el repartidor no tiene jornada abierta, puede hacer clic en "Iniciar Jornada". La interfaz mostrará la lista de productos activos junto con el stock disponible en bodega. El repartidor define la cantidad a subir al vehículo e intenta guardar. Si excede el stock de bodega, salta una validación en pantalla.
2. **Monitoreo de Carga (Dashboard):** Una vez cargada la jornada, se le muestra en tiempo real su inventario en vehículo (Cargado, Vendido, Restante en ruta) y el dinero en efectivo acumulado.
3. **Registro de Ventas (Sales):** Permite ingresar el nombre del cliente (opcional), observaciones y el método de pago (`efectivo`, `transferencia` u `otro`). Añade filas dinámicas de productos. La interfaz restringe la cantidad máxima de venta al stock restante actual en el vehículo de forma reactiva.
4. **Cierre de Caja (Closure):** Muestra el resumen consolidado de ventas por método de pago y el stock total que se reintegrará a la bodega. Al confirmar, se consume la RPC `close_daily_load`, cerrando oficialmente el ciclo.

#### B. Flujo de Administrador
1. **Monitoreo Diario (Dashboard):** Muestra las métricas del día (dinero total, cantidad de ventas, promedio del ticket, y cuántos repartidores están activos en ruta). Muestra la lista de ventas recientes y los camiones actualmente en ruta.
2. **Catálogo (Products):** Pantalla interactiva para agregar y modificar productos. Permite pausar/activar productos (`is_active`).
3. **Inventario (Inventory):** Muestra el stock físico actual de la bodega. Permite "Ajustar Stock" de dos maneras:
   - *Sumar (+):* Incrementa stock al valor actual.
   - *Fijar (=):* Sobrescribe el stock con un valor absoluto.
4. **Informes (Reports):** Contiene 5 pestañas donde renderiza los datos obtenidos directamente de las vistas de informes de Supabase.

---

## 5. Configuración de Entorno e Instalación

### Conexión a Supabase
Las llaves y endpoints de conexión se ubican en el archivo `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://uiluoawxskhdwkhbafaf.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Key anónima (anon public)
};
```

### Guía para Inicializar Usuarios de Prueba
Dado que los perfiles se sincronizan mediante un Trigger de base de datos desde `auth.users`, se deben crear los usuarios en la consola web de Supabase de la siguiente manera:
1. Ir a **Supabase Dashboard** -> **Authentication** -> **Users** -> **Add User**.
2. **Para Administrador:**
   - Email: `admin@aquavida.com`
   - Metadata de usuario (campo JSON):
     ```json
     {
       "full_name": "Carlos Admin",
       "role": "admin"
     }
     ```
3. **Para Repartidor:**
   - Email: `juan.repartidor@aquavida.com`
   - Metadata de usuario (campo JSON):
     ```json
     {
       "full_name": "Juan Pérez",
       "role": "repartidor"
     }
     ```

---

## 6. Scripts de Base de Datos Disponibles (Directorio `database/`)
Los archivos SQL en la carpeta `database/` contienen el código necesario para recrear la base de datos desde cero en la consola SQL Editor de Supabase en este orden de ejecución:
- `01_tables_and_enums.sql`: Estructura inicial de tipos enums, tablas e índices.
- `02_functions_and_triggers.sql`: Funciones de base de datos, triggers de sincronización y validaciones, y el RPC de cierre.
- `03_views.sql`: Creación de las 5 vistas de reportes financieros y de inventario.
- `04_rls_policies.sql`: Políticas de acceso basadas en roles para restringir el acceso a los repartidores.
- `05_test_data.sql`: Datos de productos iniciales y stock de ejemplo para testing.
- `06_fix_handle_new_user.sql`: Parche para calificar de manera explícita el tipo `public.role_type` dentro del trigger de creación de usuarios.

---
*Este archivo representa el plano de construcción completo de Aqua Vida.*
