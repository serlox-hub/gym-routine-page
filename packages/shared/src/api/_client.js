let _supabase = null
// Base alternativa para los GIFs de ejercicio. Sin ella se usa el Storage del propio
// cliente; en desarrollo local ese bucket está vacío, así que la app apunta a la base
// pública real y se ahorra un 404 por tarjeta. Ver docs/DECISIONS.md.
let _gifBaseUrl = null

export function initApi(supabaseClient, { gifBaseUrl = null } = {}) {
  _supabase = supabaseClient
  _gifBaseUrl = gifBaseUrl || null
}

export function getClient() {
  if (!_supabase) throw new Error('[gym/shared] initApi() must be called before using API functions')
  return _supabase
}

export function getGifBaseUrl() {
  return _gifBaseUrl
}
