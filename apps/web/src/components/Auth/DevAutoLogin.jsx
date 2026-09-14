import { useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth.js'

// Incluye rangos privados (192.168/16, 10/8, 172.16-31) además de loopback/localhost: al levantar
// `npm run dev -- --host` para probar desde el móvil, VITE_SUPABASE_URL apunta a la IP de LAN del
// Mac, no a 127.0.0.1. A diferencia de scripts/assertLocalSupabase.js (guard de seguridad para los
// e2e, que sí debe quedarse estricto), aquí el peor caso de un falso positivo es un intento de
// login que falla — no se ensancha ese otro regex.
const LOCAL_SUPABASE_URL = /^https?:\/\/(127\.0\.0\.1|localhost|192\.168(?:\.\d{1,3}){2}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})([:/]|$)/

// Mismas credenciales que supabase/seed.sql crea en cada `db reset`: de desarrollo local, no
// apuntan a ningún entorno real (ver el comentario de cabecera de ese archivo).
const DEV_EMAIL = 'e2e@local.test'
const DEV_PASSWORD = 'e2e-local-password'

/**
 * Solo cuando esto se renderiza en dev (ver App.jsx, gateado por import.meta.env.DEV para que se
 * elimine del bundle de producción), contra la Supabase LOCAL, y con VITE_DEV_AUTOLOGIN=true en
 * tu .env.local: si no hay sesión, inicia sesión sola con el usuario de seed. Evita tener que
 * loguearse a mano cada vez que un `supabase db reset` (los e2e, `npm run db:schema`) invalida la
 * sesión guardada en localStorage.
 *
 * Opt-in explícito (no basta con DEV + local): el servidor de los e2e de Playwright también es
 * `vite` en dev apuntando a la Supabase local (así lo exige `scripts/assertLocalSupabase.js`), y
 * `auth.spec.js`/`navigation.spec.js` verifican justo el estado SIN sesión. Sin el flag, este
 * componente se dispararía en esa suite y en cualquier `npm run dev` normal — imposible ver
 * Login/Landing, cada recarga vuelve a autenticar.
 */
function DevAutoLogin() {
  const { isAuthenticated, isLoading, login } = useAuth()
  const attempted = useRef(false)

  useEffect(() => {
    if (isLoading || isAuthenticated || attempted.current) return
    if (import.meta.env.VITE_DEV_AUTOLOGIN !== 'true') return
    if (!LOCAL_SUPABASE_URL.test(import.meta.env.VITE_SUPABASE_URL || '')) return
    attempted.current = true
    login(DEV_EMAIL, DEV_PASSWORD).then(({ success, error }) => {
      // eslint-disable-next-line no-console -- visibilidad del fallo, solo corre en dev local
      if (!success) console.error('DevAutoLogin: fallo al loguear el usuario de seed', error)
    })
  }, [isLoading, isAuthenticated, login])

  return null
}

export default DevAutoLogin
