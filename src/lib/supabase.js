import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce' },
})

export async function getTenantId() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.app_metadata?.tenant_id ?? null
}
