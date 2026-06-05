-- ===========================================================================
-- AQUA VIDA - CORRECCIÓN DE LA FUNCIÓN handle_new_user()
-- Ejecuta este script específico en el SQL Editor para corregir el error:
-- "type 'role_type' does not exist"
-- ===========================================================================

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
