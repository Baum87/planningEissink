// 60 zachte pasteltinten (Tailwind 100/200/300) — passend bij Apple-achtige uitstraling
// Volgorde: eerst 1 tint per kleurgroep door de hele cirkel, dan lichter/donkerder ronden.
// Zo krijgen opeenvolgende projecten maximale kleurvariatie ipv clusters van dezelfde tint.
export const KLEURENPALET = [
  // Ronde 1 — lichtste tint, elke kleurgroep één keer
  '#fee2e2', // red
  '#ffe4e6', // rose
  '#ffedd5', // orange
  '#fef3c7', // amber
  '#fef9c3', // yellow
  '#ecfccb', // lime
  '#dcfce7', // green
  '#d1fae5', // emerald
  '#ccfbf1', // teal
  '#cffafe', // cyan
  '#e0f2fe', // sky
  '#dbeafe', // blue
  '#e0e7ff', // indigo
  '#ede9fe', // violet
  '#f3e8ff', // purple
  '#fae8ff', // fuchsia
  '#fce7f3', // pink
  // Ronde 2 — middeltint
  '#fecaca', // red
  '#fecdd3', // rose
  '#fed7aa', // orange
  '#fde68a', // amber
  '#fef08a', // yellow
  '#d9f99d', // lime
  '#bbf7d0', // green
  '#a7f3d0', // emerald
  '#99f6e4', // teal
  '#a5f3fc', // cyan
  '#bae6fd', // sky
  '#bfdbfe', // blue
  '#c7d2fe', // indigo
  '#ddd6fe', // violet
  '#e9d5ff', // purple
  '#f5d0fe', // fuchsia
  '#fbcfe8', // pink
  // Ronde 3 — diepste tint
  '#fca5a5', // red
  '#fda4af', // rose
  '#fdba74', // orange
  '#fcd34d', // amber
  '#fde047', // yellow
  '#bef264', // lime
  '#86efac', // green
  '#6ee7b7', // emerald
  '#5eead4', // teal
  '#67e8f9', // cyan
  '#7dd3fc', // sky
  '#93c5fd', // blue
  '#a5b4fc', // indigo
  '#c4b5fd', // violet
  '#d8b4fe', // purple
  '#f0abfc', // fuchsia
  '#f9a8d4', // pink
  // Neutrals (stone / slate / zinc)
  '#f5f5f4', '#e7e5e0', '#d6d3d1',
  '#f1f5f9', '#e2e8f0', '#cbd5e1',
  '#f4f4f5', '#e4e4e7', '#d4d4d8',
]

// Pastelkleuren als hash-fallback voor projecten zonder kleur (legacy)
const HASH_BG = [
  '#dbeafe','#dcfce7','#fef3c7','#fce7f3',
  '#ede9fe','#ffedd5','#cffafe','#d1fae5',
]

function fgVanBg(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1a202c' : '#ffffff'
}

// Accepteert een project-object { id, kleur? }.
// Als kleur gevuld is → gebruik die kleur.
// Anders → deterministische hash op id als fallback.
export function projKleur(project) {
  const hex = project?.kleur ?? null
  if (hex) return { bg: hex, fg: fgVanBg(hex) }
  const id = project?.id ?? ''
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const bg = HASH_BG[h % HASH_BG.length]
  return { bg, fg: fgVanBg(bg) }
}

// Kiest de minst gebruikte kleur uit het palet op basis van bestaande projecten.
export function minstGebruikteKleur(projecten) {
  const telling = Object.fromEntries(KLEURENPALET.map((k) => [k, 0]))
  projecten.forEach((p) => {
    if (p.kleur && telling[p.kleur] !== undefined) telling[p.kleur]++
  })
  return Object.entries(telling).sort((a, b) => a[1] - b[1])[0][0]
}
