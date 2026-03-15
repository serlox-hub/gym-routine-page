let _supabase = null

export function initApi(supabaseClient) {
  _supabase = supabaseClient
}

export function getClient() {
  if (!_supabase) throw new Error('[gym/shared] initApi() must be called before using API functions')
  return _supabase
}
