import { supabase } from '../lib/supabase'

export async function getPeriodes() {
  const { data, error } = await supabase
    .from('periodes')
    .select('*')
    .order('datum_van')
  if (error) throw error
  return data
}
