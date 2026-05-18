export function getMaandag(d) {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  const dag = r.getDay()
  r.setDate(r.getDate() - (dag === 0 ? 6 : dag - 1))
  return r
}

export function plusDagen(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function naarStr(d) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

export function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dow = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - dow)
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t - y) / 86400000 + 1) / 7)
}

export function fDag(d) {
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })
}

export function fDagNaam(d) {
  return d.toLocaleDateString('nl-NL', { weekday: 'short' }).slice(0, 2)
}

// metJaar: true in Overzicht (toont jaar), false in Planning (geen jaar)
export function fDatumLang(str, metJaar = false) {
  return new Date(str + 'T00:00:00').toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(metJaar ? { year: 'numeric' } : {}),
  })
}

// Kort formaat: "18 mei 2026" — voor lijsten en tabellen
export function fDatumKort(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}
