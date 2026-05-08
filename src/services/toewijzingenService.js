import { supabase } from '../lib/supabase'

function naarStr(d) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function getWerkdagen(van, tot) {
  const dagen = []
  let cur = new Date(van + 'T00:00:00')
  const eindD = new Date(tot + 'T00:00:00')
  while (cur <= eindD) {
    const dag = cur.getDay()
    if (dag !== 0 && dag !== 6) dagen.push(naarStr(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dagen
}

export async function getToewijzingen(van, tot) {
  const { data, error } = await supabase
    .from('toewijzingen')
    .select('*, projecten(id, werknummer, omschrijving, projectleider_initialen)')
    .lte('datum_van', tot)
    .gte('datum_tot', van)
  if (error) throw error
  return data
}

// Maakt één record per werkdag (ma-vr) — weekends worden overgeslagen
export async function createToewijzing({ monteur_id, project_id, datum_van, datum_tot }) {
  const werkdagen = getWerkdagen(datum_van, datum_tot)
  if (werkdagen.length === 0) return []
  const inserts = werkdagen.map((dag) => ({
    monteur_id,
    project_id,
    datum_van: dag,
    datum_tot: dag,
  }))
  const { data, error } = await supabase
    .from('toewijzingen')
    .insert(inserts)
    .select()
  if (error) throw error
  return data
}

export async function deleteToewijzing(id) {
  const { error } = await supabase.from('toewijzingen').delete().eq('id', id)
  if (error) throw error
}
