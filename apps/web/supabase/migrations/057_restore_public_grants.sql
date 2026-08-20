-- Permisos de tabla para los roles de la API (anon, authenticated, service_role).
--
-- Hasta ahora NINGUNA migración concedía permisos: las tablas los heredaban de los DEFAULT
-- PRIVILEGES que traía la imagen de Postgres de Supabase (`GRANT ALL ON TABLES TO anon,
-- authenticated, service_role`). La imagen 17.6.1.054 (la que baja el CLI 2.115.0) los recortó a
-- `REFERENCES, TRIGGER, TRUNCATE, MAINTAIN`: sin SELECT/INSERT/UPDATE/DELETE. Resultado en un
-- `supabase db reset` limpio: la app entera responde 42501 "permission denied for table X"
-- (la primera que suele cantar es `session_exercises` al empezar una sesión, porque el RPC
-- `start_workout_session` es SECURITY DEFINER y sí escribe, pero el SELECT posterior ya no lee).
--
-- El proyecto remoto se creó con la imagen antigua y conserva los permisos, así que esta migración
-- es un no-op allí. Lo que arregla es que el esquema del repo deje de depender de un default
-- implícito de la imagen: se conceden explícitamente y se restauran los default privileges para
-- las tablas que creen migraciones futuras.
--
-- Se concede también a `anon` para no divergir del remoto (misma matriz de permisos en dev y prod).
-- Lo que protege los datos es RLS, activo en las 19 tablas de `public`, no la falta de GRANT.
--
-- Las FUNCIONES se quedan como están a propósito: en Postgres el EXECUTE es de PUBLIC por defecto,
-- y las tres que se quisieron restringir ya hacen su `REVOKE ... FROM PUBLIC` +
-- `GRANT EXECUTE ... TO authenticated` en su propia migración. Restaurar aquí el default de
-- funciones volvería a dar EXECUTE a `anon` sobre cada RPC nuevo, incluidos los SECURITY DEFINER.

GRANT ALL ON ALL TABLES IN SCHEMA "public" TO "anon", "authenticated", "service_role";
GRANT ALL ON ALL SEQUENCES IN SCHEMA "public" TO "anon", "authenticated", "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
    GRANT ALL ON TABLES TO "anon", "authenticated", "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
    GRANT ALL ON SEQUENCES TO "anon", "authenticated", "service_role";
