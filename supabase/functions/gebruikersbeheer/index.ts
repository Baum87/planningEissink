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

const GELDIGE_ROLLEN = ['admin', 'management', 'planner', 'gebruiker', 'monteur', 'projectleider']

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

  const callerRol = user.app_metadata?.rol
  const callerTenantId = user.app_metadata?.tenant_id

  if (callerRol !== 'admin') return json({ error: 'Alleen admin heeft toegang' }, 403)
  if (!callerTenantId) return json({ error: 'Geen tenant_id gekoppeld aan dit account' }, 403)

  // Admin client met service_role — nooit in de frontend zetten
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Ongeldig JSON-verzoek' }, 400)
  }

  const { actie } = body

  // ── lijst ──────────────────────────────────────────────────────────────
  if (actie === 'lijst') {
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (error) return json({ error: error.message }, 500)

    const gebruikers = data.users
      .filter((u) => u.app_metadata?.tenant_id === callerTenantId)
      .map((u) => ({
        id: u.id,
        email: u.email,
        naam: u.app_metadata?.naam ?? '',
        afkorting: u.app_metadata?.afkorting ?? null,
        rol: u.app_metadata?.rol ?? '',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }))

    return json({ gebruikers })
  }

  // ── uitnodigen ─────────────────────────────────────────────────────────
  if (actie === 'uitnodigen') {
    const { email, naam, afkorting, rol, redirectTo } = body
    if (!email || !naam || !rol) return json({ error: 'email, naam en rol zijn verplicht' }, 400)
    if (!GELDIGE_ROLLEN.includes(rol)) return json({ error: 'Ongeldig rol' }, 400)

    const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo || undefined,
    })
    if (inviteError) return json({ error: inviteError.message }, 400)

    const userId = invite.user.id

    const rollback = async () => { await admin.auth.admin.deleteUser(userId) }

    // Zet app_metadata (rol, naam, tenant_id, afkorting) — invite zet alleen user_metadata
    const { error: metaError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { rol, naam, tenant_id: callerTenantId, afkorting: afkorting || null },
    })
    if (metaError) {
      await rollback()
      return json({ error: metaError.message }, 500)
    }

    // Maak profiel aan — id wordt auto-gegenereerd, user_id koppelt aan loginaccount
    const { error: profielError } = await admin.from('profielen').insert({
      user_id: userId,
      tenant_id: callerTenantId,
      weergave_naam: naam,
      afkorting: afkorting || null,
    })
    if (profielError) {
      await rollback()
      return json({ error: profielError.message }, 500)
    }

    return json({ ok: true, user_id: userId })
  }

  // ── aanmaken (geen mail, direct wachtwoord) ────────────────────────────────
  if (actie === 'aanmaken') {
    const { email, naam, afkorting, rol, wachtwoord } = body
    if (!email || !naam || !rol || !wachtwoord) return json({ error: 'email, naam, rol en wachtwoord zijn verplicht' }, 400)
    if (!GELDIGE_ROLLEN.includes(rol)) return json({ error: 'Ongeldig rol' }, 400)

    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password: wachtwoord,
      email_confirm: true,
      app_metadata: { rol, naam, tenant_id: callerTenantId, afkorting: afkorting || null },
    })
    if (createError) return json({ error: createError.message }, 400)

    const userId = newUser.user.id

    const rollbackAanmaken = async () => { await admin.auth.admin.deleteUser(userId) }

    const { error: profielError } = await admin.from('profielen').insert({
      user_id: userId,
      tenant_id: callerTenantId,
      weergave_naam: naam,
      afkorting: afkorting || null,
    })
    if (profielError) {
      await rollbackAanmaken()
      return json({ error: profielError.message }, 500)
    }

    return json({ ok: true, user_id: userId })
  }

  // ── profiel_aanmaken (geen loginaccount — bijv. projectleider als referentie) ──
  if (actie === 'profiel_aanmaken') {
    const { naam, afkorting } = body
    if (!naam) return json({ error: 'naam is verplicht' }, 400)

    const { data: profiel, error: profielError } = await admin.from('profielen').insert({
      tenant_id: callerTenantId,
      weergave_naam: naam,
      afkorting: afkorting || null,
    }).select('id').single()
    if (profielError) return json({ error: profielError.message }, 500)

    return json({ ok: true, profiel_id: profiel.id })
  }

  // ── profiel_koppelen (koppel bestaand profiel aan een nieuw loginaccount) ──────
  if (actie === 'profiel_koppelen') {
    const { profiel_id, email, redirectTo } = body
    if (!profiel_id || !email) return json({ error: 'profiel_id en email zijn verplicht' }, 400)

    const { data: profiel, error: profielError } = await admin
      .from('profielen')
      .select('id, weergave_naam, afkorting, user_id')
      .eq('id', profiel_id)
      .eq('tenant_id', callerTenantId)
      .single()
    if (profielError || !profiel) return json({ error: 'Profiel niet gevonden' }, 404)
    if (profiel.user_id) return json({ error: 'Dit profiel heeft al een loginaccount' }, 400)

    const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo || undefined,
    })
    if (inviteError) return json({ error: inviteError.message }, 400)

    const userId = invite.user.id

    const { error: metaError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        rol: 'gebruiker',
        naam: profiel.weergave_naam,
        tenant_id: callerTenantId,
        afkorting: profiel.afkorting || null,
      },
    })
    if (metaError) {
      await admin.auth.admin.deleteUser(userId)
      return json({ error: metaError.message }, 500)
    }

    const { error: updateError } = await admin
      .from('profielen')
      .update({ user_id: userId })
      .eq('id', profiel_id)
    if (updateError) {
      await admin.auth.admin.deleteUser(userId)
      return json({ error: updateError.message }, 500)
    }

    return json({ ok: true, user_id: userId })
  }

  // ── profiel_koppelen_aanmaken (koppel bestaand profiel, geen uitnodigingsmail) ──
  if (actie === 'profiel_koppelen_aanmaken') {
    const { profiel_id, email, wachtwoord } = body
    if (!profiel_id || !email || !wachtwoord) return json({ error: 'profiel_id, email en wachtwoord zijn verplicht' }, 400)

    const { data: profiel, error: profielError } = await admin
      .from('profielen')
      .select('id, weergave_naam, afkorting, user_id')
      .eq('id', profiel_id)
      .eq('tenant_id', callerTenantId)
      .single()
    if (profielError || !profiel) return json({ error: 'Profiel niet gevonden' }, 404)
    if (profiel.user_id) return json({ error: 'Dit profiel heeft al een loginaccount' }, 400)

    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password: wachtwoord,
      email_confirm: true,
      app_metadata: {
        rol: 'gebruiker',
        naam: profiel.weergave_naam,
        tenant_id: callerTenantId,
        afkorting: profiel.afkorting || null,
      },
    })
    if (createError) return json({ error: createError.message }, 400)

    const userId = newUser.user.id

    const { error: updateError } = await admin
      .from('profielen')
      .update({ user_id: userId })
      .eq('id', profiel_id)
    if (updateError) {
      await admin.auth.admin.deleteUser(userId)
      return json({ error: updateError.message }, 500)
    }

    return json({ ok: true, user_id: userId })
  }

  // ── rol_wijzigen ───────────────────────────────────────────────────────
  if (actie === 'rol_wijzigen') {
    const { user_id, rol } = body
    if (!user_id || !rol) return json({ error: 'user_id en rol zijn verplicht' }, 400)
    if (!GELDIGE_ROLLEN.includes(rol)) return json({ error: 'Ongeldig rol' }, 400)

    const { data: target, error: targetError } = await admin.auth.admin.getUserById(user_id)
    if (targetError || !target.user) return json({ error: 'Gebruiker niet gevonden' }, 404)
    if (target.user.app_metadata?.tenant_id !== callerTenantId) {
      return json({ error: 'Geen toegang tot deze gebruiker' }, 403)
    }

    const { error } = await admin.auth.admin.updateUserById(user_id, {
      app_metadata: { ...target.user.app_metadata, rol },
    })
    if (error) return json({ error: error.message }, 500)

    return json({ ok: true })
  }

  // ── wijzigen (naam, email, afkorting, wachtwoord, rol) ───────────────
  if (actie === 'wijzigen') {
    const { user_id, naam, email, afkorting, wachtwoord, rol } = body
    if (!user_id) return json({ error: 'user_id is verplicht' }, 400)
    if (rol && !GELDIGE_ROLLEN.includes(rol)) return json({ error: 'Ongeldig rol' }, 400)

    const { data: target, error: targetError } = await admin.auth.admin.getUserById(user_id)
    if (targetError || !target.user) return json({ error: 'Gebruiker niet gevonden' }, 404)
    if (target.user.app_metadata?.tenant_id !== callerTenantId) {
      return json({ error: 'Geen toegang tot deze gebruiker' }, 403)
    }

    const authUpdates: Record<string, unknown> = {}
    if (email) authUpdates.email = email
    if (wachtwoord) authUpdates.password = wachtwoord
    if (naam || rol || afkorting !== undefined) {
      authUpdates.app_metadata = {
        ...target.user.app_metadata,
        ...(naam      ? { naam }           : {}),
        ...(rol       ? { rol }            : {}),
        ...(afkorting !== undefined ? { afkorting: afkorting || null } : {}),
      }
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error } = await admin.auth.admin.updateUserById(user_id, authUpdates)
      if (error) return json({ error: error.message }, 500)
    }

    const profielUpdates: Record<string, unknown> = {}
    if (naam)             profielUpdates.weergave_naam = naam
    if (afkorting !== undefined) profielUpdates.afkorting = afkorting || null

    if (Object.keys(profielUpdates).length > 0) {
      const { error: profielError } = await admin
        .from('profielen')
        .update(profielUpdates)
        .eq('user_id', user_id)
      if (profielError) return json({ error: profielError.message }, 500)
    }

    return json({ ok: true })
  }

  // ── verwijderen ────────────────────────────────────────────────────────
  if (actie === 'verwijderen') {
    const { user_id } = body
    if (!user_id) return json({ error: 'user_id is verplicht' }, 400)

    const { data: target, error: targetError } = await admin.auth.admin.getUserById(user_id)
    if (targetError || !target.user) return json({ error: 'Gebruiker niet gevonden' }, 404)
    if (target.user.app_metadata?.tenant_id !== callerTenantId) {
      return json({ error: 'Geen toegang tot deze gebruiker' }, 403)
    }

    const { error } = await admin.auth.admin.deleteUser(user_id)
    if (error) return json({ error: error.message }, 500)

    return json({ ok: true })
  }

  return json({ error: 'Onbekende actie' }, 400)
})
