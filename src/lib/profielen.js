export function profielenUitProjecten(projecten) {
  const map = new Map()
  projecten.forEach((p) => {
    if (p.projectleider?.afkorting) map.set(p.projectleider.id, p.projectleider)
  })
  return [...map.values()].sort((a, b) => a.afkorting.localeCompare(b.afkorting, 'nl'))
}
