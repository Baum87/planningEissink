// 60 zachte pasteltinten (Tailwind 100/200/300) — passend bij Apple-achtige uitstraling
export const KLEURENPALET = [
  // Red / Rose
  '#fee2e2', '#fecaca', '#fca5a5',
  '#ffe4e6', '#fecdd3', '#fda4af',
  // Orange / Amber
  '#ffedd5', '#fed7aa', '#fdba74',
  '#fef3c7', '#fde68a', '#fcd34d',
  // Yellow / Lime
  '#fef9c3', '#fef08a', '#fde047',
  '#ecfccb', '#d9f99d', '#bef264',
  // Green / Emerald
  '#dcfce7', '#bbf7d0', '#86efac',
  '#d1fae5', '#a7f3d0', '#6ee7b7',
  // Teal / Cyan
  '#ccfbf1', '#99f6e4', '#5eead4',
  '#cffafe', '#a5f3fc', '#67e8f9',
  // Sky / Blue
  '#e0f2fe', '#bae6fd', '#7dd3fc',
  '#dbeafe', '#bfdbfe', '#93c5fd',
  // Indigo / Violet
  '#e0e7ff', '#c7d2fe', '#a5b4fc',
  '#ede9fe', '#ddd6fe', '#c4b5fd',
  // Purple / Fuchsia
  '#f3e8ff', '#e9d5ff', '#d8b4fe',
  '#fae8ff', '#f5d0fe', '#f0abfc',
  // Pink
  '#fce7f3', '#fbcfe8', '#f9a8d4',
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
