-- Seed de la BD LOCAL. Lo aplica `supabase db reset` (config.toml → [db.seed] sql_paths).
--
-- Su único cometido es crear el usuario de test: sin él, `db reset` deja una BD sin nadie con
-- quien iniciar sesión y la suite e2e autenticada queda muerta (`e2e/auth.setup.js` hace login,
-- nunca signup). Antes de existir este archivo eso obligó a regenerar `schema.sql` con un dump
-- a secas, saltándose el reset y rompiendo la garantía de que el snapshot == migraciones.
--
-- NO siembra datos de dominio a propósito: los de referencia (grupos musculares, tipos de equipo,
-- catálogo de ejercicios) los crean las migraciones, y la rutina de los e2e la crea
-- `e2e/testData.setup.js`, que ya es idempotente.
--
-- ⚠️ Credenciales de DESARROLLO LOCAL, no son las de ningún entorno real: esta BD solo escucha en
-- 127.0.0.1 y su JWT secret es el público de la CLI. Ver `.env.example`.

do $$
declare
  v_user_id uuid := '00000000-0000-4000-8000-000000000001';
  v_email   text := 'e2e@local.test';
  v_password text := 'e2e-local-password';
begin
  if exists (select 1 from auth.users where email = v_email) then
    return;
  end if;

  -- Dos cosas que la tabla deja pasar y GoTrue no:
  --   `email_confirmed_at` sin valor → el login responde "Email not confirmed", y en local no hay
  --   bandeja de entrada a la que ir.
  --   Los cuatro campos de token en NULL → el login revienta con 500 "Database error querying
  --   schema". Son `character varying` NULLABLE sin default, pero GoTrue los escanea en `string`
  --   de Go, que no admite NULL. Van a cadena VACÍA, no se omiten. Verificado ejecutándolo: es un
  --   fallo de servidor opaco, no un error de validación que diga qué falta.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', ''
  );

  -- La identidad es lo que hace utilizable el proveedor "email": sin esta fila el usuario existe
  -- pero GoTrue no lo resuelve al iniciar sesión. `provider_id` es el propio id del usuario.
  -- `id` se omite a propósito: la columna ya trae `default gen_random_uuid()` y nadie referencia
  -- ese valor. Generarlo a mano ataba el seed a `uuid-ossp`, que ninguna migración declara.
  insert into auth.identities (
    user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) values (
    v_user_id, v_user_id::text, 'email',
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true,
                       'phone_verified', false),
    now(), now(), now()
  );
end $$;
