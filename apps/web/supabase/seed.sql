-- Seed de la BD LOCAL. Lo aplica `supabase db reset` (config.toml → [db.seed] sql_paths).
--
-- Su único cometido es crear los usuarios de test: sin ellos, `db reset` deja una BD sin nadie con
-- quien iniciar sesión y la suite e2e autenticada queda muerta (`e2e/auth.setup.js` hace login,
-- nunca signup). Antes de existir este archivo eso obligó a regenerar `schema.sql` con un dump
-- a secas, saltándose el reset y rompiendo la garantía de que el snapshot == migraciones.
--
-- NO siembra datos de dominio a propósito: los de referencia (grupos musculares, tipos de equipo,
-- catálogo de ejercicios) los crean las migraciones, y la rutina de los e2e la crea
-- `e2e/testData.setup.js`, que ya es idempotente.
--
-- Cinco usuarios: `e2e@local.test` para casi toda la suite y `e2e-session@local.test` solo para
-- `sessionReorder.spec.js`. Ese spec arranca una sesión de entrenamiento, y solo puede haber una en
-- curso por usuario (`workout_sessions_one_in_progress_per_user`, migración 058): con el usuario
-- compartido y `fullyParallel`, competiría con `session.spec.js`/`completeSet.spec.js`.
-- `e2e-history@local.test` es para `convertSessionToRoutineDay.spec.js`: el Historial abre la
-- primera sesión de hoy, y con el usuario compartido los otros specs añaden las suyas.
-- `e2e-slow@local.test` is for `slowSave.spec.js`: it starts sessions too, like `sessionReorder.spec.js`.
-- `e2e-touch@local.test` is for `touchTargets.spec.js`: it starts sessions and adds a second gym.
--
-- ⚠️ Credenciales de DESARROLLO LOCAL, no son las de ningún entorno real: esta BD solo escucha en
-- 127.0.0.1 y su JWT secret es el público de la CLI. Ver `.env.example`.

do $$
declare
  v_password text := 'e2e-local-password';
  v_user record;
begin
  for v_user in
    select * from (values
      ('00000000-0000-4000-8000-000000000001'::uuid, 'e2e@local.test'),
      ('00000000-0000-4000-8000-000000000002'::uuid, 'e2e-session@local.test'),
      ('00000000-0000-4000-8000-000000000003'::uuid, 'e2e-history@local.test'),
      ('00000000-0000-4000-8000-000000000004'::uuid, 'e2e-slow@local.test'),
      ('00000000-0000-4000-8000-000000000005'::uuid, 'e2e-touch@local.test')
    ) as u(id, email)
  loop
    if exists (select 1 from auth.users where email = v_user.email) then
      continue;
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
      '00000000-0000-0000-0000-000000000000', v_user.id, 'authenticated', 'authenticated',
      v_user.email, extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
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
      v_user.id, v_user.id::text, 'email',
      jsonb_build_object('sub', v_user.id::text, 'email', v_user.email, 'email_verified', true,
                         'phone_verified', false),
      now(), now(), now()
    );
  end loop;
end $$;
