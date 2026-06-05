import { supabase, getTenantId } from '../lib/supabase'

export async function getProjecten({ metStats = false } = {}) {
  const select = metStats
    ? '*, toewijzingen(id, monteur_id, datum_van, datum_tot)'
    : '*'
  const { data, error } = await supabase
    .from('projecten')
    .select(select)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// TODO ERP-koppeling: extern_id wordt hier later gezet vanuit de ERP-sync.
// createProject en updateProject ontvangen het extern_id-veld zodra de koppeling actief is.
// Overweeg een aparte syncProject(externId, payload) functie voor de webhook-handler.
export async function createProject(project) {
  const tenant_id = await getTenantId()
  const { data, error } = await supabase
    .from('projecten')
    .insert({ ...project, tenant_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProject(id, updates) {
  const { data, error } = await supabase
    .from('projecten')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProject(id) {
  const { error } = await supabase.from('projecten').delete().eq('id', id)
  if (error) throw error
}

