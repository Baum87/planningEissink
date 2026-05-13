import { supabase, getTenantId } from '../lib/supabase'

export async function getExpertises() {
  const { data, error } = await supabase
    .from('tenant_expertises')
    .select('*')
    .order('volgorde')
  if (error) throw error
  return data
}

export async function createExpertise(naam, volgorde = 0) {
  const tenant_id = await getTenantId()
  const { data, error } = await supabase
    .from('tenant_expertises')
    .insert({ naam, volgorde, tenant_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteExpertise(id) {
  const { error } = await supabase.from('tenant_expertises').delete().eq('id', id)
  if (error) throw error
}
