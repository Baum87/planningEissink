import { supabase } from '../lib/supabase'

export async function getPeriodes() {
  const { data, error } = await supabase
    .from('periodes')
    // TODO multi-tenancy: voeg .eq('tenant_id', tenantId) toe
    .select('*')
    .order('datum_van')
  if (error) throw error
  return data
}
