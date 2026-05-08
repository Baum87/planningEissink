import { supabase } from '../lib/supabase'

// Haalt alle toewijzingen op die overlappen met [van, tot].
// Overlap als: datum_van <= tot EN datum_tot >= van
export async function getToewijzingen(van, tot) {
  const { data, error } = await supabase
    .from('toewijzingen')
    .select('*, projecten(id, werknummer, omschrijving, projectleider_initialen)')
    .lte('datum_van', tot)
    .gte('datum_tot', van)
  if (error) throw error
  return data
}

export async function createToewijzing(toewijzing) {
  const { data, error } = await supabase
    .from('toewijzingen')
    .insert(toewijzing)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateToewijzing(id, datumVan, datumTot) {
  const { data, error } = await supabase
    .from('toewijzingen')
    .update({ datum_van: datumVan, datum_tot: datumTot })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteToewijzing(id) {
  const { error } = await supabase.from('toewijzingen').delete().eq('id', id)
  if (error) throw error
}
