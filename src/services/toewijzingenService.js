import { supabase, getTenantId } from '../lib/supabase'
import { naarStr } from '../lib/datum'

function getWerkdagen(van, tot, skipDagen = new Set()) {
  const dagen = []
  let cur = new Date(van + 'T00:00:00')
  const eindD = new Date(tot + 'T00:00:00')
  while (cur <= eindD) {
    const dag = cur.getDay()
    const str = naarStr(cur)
    if (dag !== 0 && dag !== 6 && !skipDagen.has(str)) dagen.push(str)
    cur.setDate(cur.getDate() + 1)
  }
  return dagen
}

export async function getToewijzingen(van, tot) {
  const PAGE = 1000
  let all = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('toewijzingen')
      .select('*, projecten(id, werknummer, omschrijving, projectleider_initialen, kleur)')
      .lte('datum_van', tot)
      .gte('datum_tot', van)
      .range(from, from + PAGE - 1)
    if (error) throw error
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

// Maakt één record per werkdag (ma-vr) — weekends en feestdagen/bouwvak worden overgeslagen
export async function createToewijzing({ monteur_id, project_id, datum_van, datum_tot }, skipDagen = new Set()) {
  const werkdagen = getWerkdagen(datum_van, datum_tot, skipDagen)
  if (werkdagen.length === 0) return []
  const tenant_id = await getTenantId()
  const inserts = werkdagen.map((dag) => ({
    tenant_id,
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
