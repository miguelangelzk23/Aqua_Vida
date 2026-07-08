-- ===========================================================================
-- AQUA VIDA - GESTIÓN DE USUARIOS
-- ===========================================================================

-- 1. Asegurarnos de que estamos usando el esquema correcto
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
  id uuid,
  email varchar,
  full_name text,
  role public.role_type,
  is_active boolean,
  created_at timestamptz
) AS $$
BEGIN
  -- Verificar si el usuario actual es administrador usando la función existente
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can view user data.';
  END IF;

  -- Retornar la unión de auth.users y public.profiles
  RETURN QUERY
  SELECT 
    au.id, 
    au.email::varchar, 
    p.full_name, 
    p.role, 
    p.is_active, 
    p.created_at
  FROM auth.users au
  JOIN public.profiles p ON au.id = p.id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Revocar el acceso público por defecto por seguridad
REVOKE EXECUTE ON FUNCTION public.admin_get_users() FROM PUBLIC;

-- 3. Otorgar permiso de ejecución explícitamente a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_users() TO service_role;
