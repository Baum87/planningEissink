import { supabase } from '../lib/supabase'

export async function getProjecten() {
  const { data, error } = await supabase
    .from('projecten')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getProjectenMetStats() {
  const { data, error } = await supabase
    .from('projecten')
    .select('*, toewijzingen(id, monteur_id, datum_van, datum_tot)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createProject(project) {
  const { data, error } = await supabase
    .from('projecten')
    .insert(project)
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
