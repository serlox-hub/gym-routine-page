import { createClient } from '@supabase/supabase-js'
import { createTimedFetch } from './netTimeline.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase. ' +
    'Asegúrate de definir VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env'
  )
}

// The localStorage key the auth client keeps the session under. Same value as supabase-js's own
// default, but passed to createClient so the code that reads it directly (authStore, slow write
// diagnostics) cannot drift from the client if a future version changes that default.
export const AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storageKey: AUTH_STORAGE_KEY },
  global: { fetch: createTimedFetch() },
})
