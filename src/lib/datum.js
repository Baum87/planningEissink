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

// "wo 18 juni" of "wo 18 juni t/m vr 20 juni"
export function fBereikLang(van, tot) {
  const opts = { weekday: 'short', day: 'numeric', month: 'long' }
  const v = new Date(van + 'T00:00:00').toLocaleDateString('nl-NL', opts)
  const t = new Date(tot + 'T00:00:00').toLocaleDateString('nl-NL', opts)
  return van === tot ? v : `${v} t/m ${t}`
}

export function prevWerkdag(str) {
  let d = new Date(str + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1)
  return naarStr(d)
}

export function nextWerkdag(str) {
  let d = new Date(str + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
  return naarStr(d)
}

export function plusWerkdagen(datum, n) {
  let d = new Date(datum)
  const stap = n > 0 ? 1 : -1
  let over = Math.abs(n)
  while (over > 0) {
    d.setDate(d.getDate() + stap)
    if (d.getDay() !== 0 && d.getDay() !== 6) over--
  }
  return d
}

export function aaneengesloten(daten, vanDag) {
  const set = new Set(daten)
  if (!set.has(vanDag)) return [vanDag]
  const block = [vanDag]
  let cur = vanDag
  while (true) {
    const prev = prevWerkdag(cur)
    if (set.has(prev)) { block.unshift(prev); cur = prev } else break
  }
  cur = vanDag
  while (true) {
    const next = nextWerkdag(cur)
    if (set.has(next)) { block.push(next); cur = next } else break
  }
  return block
}
