import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce' },
})

let _tenantId = null

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') _tenantId = null
})

export async function getTenantId() {
  if (_tenantId) return _tenantId
  const { data: { session } } = await supabase.auth.getSession()
  _tenantId = session?.user?.app_metadata?.tenant_id ?? null
  return _tenantId
}
