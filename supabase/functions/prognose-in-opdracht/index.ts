import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Niet ingelogd' }, 401)

  // Verifieer de aanroeper via diens eigen JWT
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) return json({ error: 'Niet ingelogd' }, 401)

  const callerRol      = user.app_metadata?.rol
  const callerTenantId = user.app_metadata?.tenant_id

  if (callerRol !== 'admin' && callerRol !== 'management') {
    return json({ error: 'Alleen admin of management heeft toegang' }, 403)
  }
  if (!callerTenantId) return json({ error: 'Geen tenant_id gekoppeld aan dit account' }, 403)

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Ongeldig JSON-verzoek' }, 400)
  }

  const { prognose_project_id } = body
  if (!prognose_project_id) return json({ error: 'prognose_project_id is verplicht' }, 400)

  // Admin client met service_role — bypast RLS voor schrijven naar projecten
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Haal het prognose-project op
  const { data: prognose, error: fetchError } = await admin
    .from('prognose_projecten')
    .select('*')
    .eq('id', prognose_project_id)
    .eq('tenant_id', callerTenantId)
    .single()

  if (fetchError || !prognose) return json({ error: 'Prognose-project niet gevonden' }, 404)
  if (prognose.operationeel_project_id) {
    return json({ error: 'Dit project is al in opdracht gezet' }, 409)
  }

  // Maak operationeel project aan — werknummer valt terug op omschrijving als leeg
  const { data: project, error: insertError } = await admin
    .from('projecten')
    .insert({
      tenant_id:        callerTenantId,
      werknummer:       prognose.projectnummer || prognose.omschrijving,
      omschrijving:     prognose.omschrijving,
      opdrachtgever:    prognose.opdrachtgever ?? null,
      kleur:            prognose.kleur ?? null,
      projectleider_id: prognose.projectleider_id ?? null,
    })
    .select()
    .single()

  if (insertError) return json({ error: insertError.message }, 500)

  // Koppel het nieuwe project aan het prognose-record en zet status op in_opdracht
  const { error: updateError } = await admin
    .from('prognose_projecten')
    .update({
      operationeel_project_id: project.id,
      status:                  'in_opdracht',
      status_gewijzigd_op:     new Date().toISOString(),
    })
    .eq('id', prognose_project_id)

  if (updateError) {
    // Rollback: verwijder het zojuist aangemaakte project
    await admin.from('projecten').delete().eq('id', project.id)
    return json({ error: updateError.message }, 500)
  }

  return json({ ok: true, project })
})
