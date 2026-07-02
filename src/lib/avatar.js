const AVATAR_KLEUREN = [
  ['#dbeafe', '#1e40af'], ['#dcfce7', '#166534'], ['#fef3c7', '#92400e'],
  ['#fce7f3', '#9d174d'], ['#ede9fe', '#5b21b6'], ['#ffedd5', '#9a3412'],
  ['#cffafe', '#155e75'], ['#d1fae5', '#064e3b'],
]

export function avatarKleur(naam = '', opgeslagenKleur = null) {
  if (opgeslagenKleur) return [opgeslagenKleur, '#1a202c']
  return AVATAR_KLEUREN[naam.charCodeAt(0) % AVATAR_KLEUREN.length]
}

export function initialen(naam = '') {
  return naam.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export function monteurNaam(m) {
  return [m.voornaam, m.achternaam].filter(Boolean).join(' ')
}
