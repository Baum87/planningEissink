import { supabase, getTenantId } from '../lib/supabase'

export async function getMonteurs() {
  const today = new Date().toISOString().split('T')[0]

  const [{ data: monteurs, error: e1 }, { data: toewijzingen, error: e2 }] =
    await Promise.all([
      supabase
        .from('monteurs')
        .select('id, voornaam, achternaam, bedrijfsnaam, type, expertises, telefoon, woonplaats, adres, created_at')
        .order('achternaam'),
      supabase
        .from('toewijzingen')
        .select('monteur_id, datum_van, datum_tot, projecten(id, werknummer, omschrijving)')
        .lte('datum_van', today)
        .gte('datum_tot', today),
    ])

  if (e1) throw e1
  if (e2) throw e2

  const tvMap = toewijzingen.reduce((acc, t) => {
    if (!acc[t.monteur_id]) acc[t.monteur_id] = []
    acc[t.monteur_id].push(t)
    return acc
  }, {})
  return monteurs.map((m) => ({
    ...m,
    toewijzingen_vandaag: tvMap[m.id] ?? [],
  }))
}

export async function createMonteur(monteur) {
  const tenant_id = await getTenantId()
  const { data, error } = await supabase
    .from('monteurs')
    .insert({ ...monteur, tenant_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMonteur(id, updates) {
  const { data, error } = await supabase
    .from('monteurs')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMonteur(id) {
  const { error } = await supabase.from('monteurs').delete().eq('id', id)
  if (error) throw error
}

// ─── Groepen ─────────────────────────────────────────────────────────────────

export async function getGroepen() {
  const { data, error } = await supabase
    .from('groepen')
    .select('*, groep_leden(monteur_id)')
    .order('naam')
  if (error) throw error
  return data
}

export async function createGroep(naam) {
  const tenant_id = await getTenantId()
  const { data, error } = await supabase
    .from('groepen')
    .insert({ naam, tenant_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateGroepNaam(id, naam) {
  const { data, error } = await supabase
    .from('groepen')
    .update({ naam })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteGroep(id) {
  const { error } = await supabase.from('groepen').delete().eq('id', id)
  if (error) throw error
}

export async function setGroepLeden(groepId, monteurIds) {
  const { error: delError } = await supabase
    .from('groep_leden')
    .delete()
    .eq('groep_id', groepId)
  if (delError) throw delError
  if (monteurIds.length === 0) return
  const { error: insError } = await supabase
    .from('groep_leden')
    .insert(monteurIds.map((mid) => ({ groep_id: groepId, monteur_id: mid })))
  if (insError) throw insError
}
