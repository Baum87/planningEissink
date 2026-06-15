import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useStatistiekenData, useStatistiekenAlles } from '../hooks/queries'
import { naarStr, plusDagen } from '../lib/datum'

const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

function formatDagLabel(datumStr) {
  const d = new Date(datumStr + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function groeperenPerDag(rijen) {
  const per = {}
  for (const r of rijen) {
    const key = r.datum_van
    if (!per[key]) per[key] = { key, label: formatDagLabel(key), intern: 0, onderaannemer: 0 }
    if (r.monteurs?.type === 'Intern') per[key].intern++
    else per[key].onderaannemer++
  }
  return Object.values(per).sort((a, b) => a.key.localeCompare(b.key))
}

function formatMaandLabel(key) {
  const [jaar, maand] = key.split('-')
  return `${MAANDEN[parseInt(maand, 10) - 1]} '${jaar.substring(2)}`
}

function groeperenPerMaand(rijen) {
  const per = {}
  for (const r of rijen) {
    const key = r.datum_van.substring(0, 7)
    if (!per[key]) per[key] = { key, label: formatMaandLabel(key), intern: 0, onderaannemer: 0 }
    if (r.monteurs?.type === 'Intern') per[key].intern++
    else per[key].onderaannemer++
  }
  return Object.values(per).sort((a, b) => a.key.localeCompare(b.key))
}

function groeperenPerJaar(rijen) {
  const per = {}
  for (const r of rijen) {
    const key = r.datum_van.substring(0, 4)
    if (!per[key]) per[key] = { key, label: key, intern: 0, onderaannemer: 0 }
    if (r.monteurs?.type === 'Intern') per[key].intern++
    else per[key].onderaannemer++
  }
  return Object.values(per).sort((a, b) => a.key.localeCompare(b.key))
}

function berekenKpiJaar(rijen) {
  const huidigJaar = String(new Date().getFullYear())
  let intern = 0
  let onderaannemer = 0
  for (const r of rijen) {
    if (!r.datum_van.startsWith(huidigJaar)) continue
    if (r.monteurs?.type === 'Intern') intern++
    else onderaannemer++
  }
  return { intern, onderaannemer, totaal: intern + onderaannemer }
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const intern = payload.find((p) => p.dataKey === 'intern')?.value ?? 0
  const onderaannemer = payload.find((p) => p.dataKey === 'onderaannemer')?.value ?? 0
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      <p className="text-red-500">Intern: {intern}</p>
      <p className="text-blue-600">Onderaannemer: {onderaannemer}</p>
      <p className="text-gray-700 font-medium mt-1">Totaal: {intern + onderaannemer}</p>
    </div>
  )
}

function Laden() {
  return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Laden…</div>
}

function Fout() {
  return <div className="flex items-center justify-center h-64 text-red-500 text-sm">Fout bij ophalen van data.</div>
}

function GeenData() {
  return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Geen inplanningen gevonden.</div>
}

const DAG_PERIODES = [
  { label: '30 dagen', dagen: 30 },
  { label: '60 dagen', dagen: 60 },
  { label: '90 dagen', dagen: 90 },
]

export default function Statistieken() {
  const [modus, setModus] = useState('maand')
  const [dagPeriode, setDagPeriode] = useState(30)

  const vandaag = new Date()
  const tot = naarStr(vandaag)
  const van12Maanden = naarStr(plusDagen(vandaag, -365))
  const vanDagen = naarStr(plusDagen(vandaag, -dagPeriode + 1))

  const dagQuery = useStatistiekenData(vanDagen, tot)
  const maandQuery = useStatistiekenData(van12Maanden, tot)
  const jaarQuery = useStatistiekenAlles()

  const actieveQuery = modus === 'dag' ? dagQuery : modus === 'maand' ? maandQuery : jaarQuery
  const actieveRijen = actieveQuery.data ?? []

  const grafiekData = useMemo(() => {
    if (modus === 'dag') return groeperenPerDag(actieveRijen)
    if (modus === 'maand') return groeperenPerMaand(actieveRijen)
    return groeperenPerJaar(actieveRijen)
  }, [actieveRijen, modus])

  const kpiJaar = useMemo(() => berekenKpiJaar(jaarQuery.data ?? []), [jaarQuery.data])

  const gemiddeld = useMemo(() => {
    if (!grafiekData.length) return '—'
    const som = grafiekData.reduce((s, d) => s + d.intern + d.onderaannemer, 0)
    return (som / grafiekData.length).toFixed(1)
  }, [grafiekData])

  const piek = useMemo(
    () =>
      grafiekData.reduce(
        (max, d) =>
          d.intern + d.onderaannemer > ((max?.intern ?? 0) + (max?.onderaannemer ?? 0)) ? d : max,
        null,
      ),
    [grafiekData],
  )

  const eenheidLabel = modus === 'dag' ? 'dag' : modus === 'maand' ? 'maand' : 'jaar'
  const dagTickInterval = dagPeriode <= 30 ? 4 : dagPeriode <= 60 ? 6 : 9

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Statistieken</h1>
        <p className="text-sm text-gray-500 mt-1">Overzicht ingeplande monteurs</p>
      </div>

      {/* KPI kaarten */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Ingepland {vandaag.getFullYear()}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{kpiJaar.totaal}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            <span className="text-red-400">{kpiJaar.intern} intern</span>
            {' · '}
            <span className="text-blue-400">{kpiJaar.onderaannemer} onderaannemer</span>
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Gem. per {eenheidLabel}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{gemiddeld}</p>
          <p className="text-xs text-gray-400 mt-0.5">monteur-dagen</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Drukste {eenheidLabel}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {piek ? piek.intern + piek.onderaannemer : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{piek?.label ?? 'geen data'}</p>
        </div>
      </div>

      {/* Grafiek kaart */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {/* Modus toggle */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {[{ id: 'dag', label: 'Per dag' }, { id: 'maand', label: 'Per maand' }, { id: 'jaar', label: 'Per jaar' }].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setModus(id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                modus === id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
          {modus === 'dag' && (
            <>
              <span className="text-gray-300 text-sm">|</span>
              {DAG_PERIODES.map(({ label, dagen }) => (
                <button
                  key={dagen}
                  onClick={() => setDagPeriode(dagen)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    dagPeriode === dagen
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </>
          )}
        </div>

        {actieveQuery.isLoading && <Laden />}
        {actieveQuery.isError && <Fout />}
        {!actieveQuery.isLoading && !actieveQuery.isError && grafiekData.length === 0 && <GeenData />}
        {!actieveQuery.isLoading && !actieveQuery.isError && grafiekData.length > 0 && (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={grafiekData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                interval={modus === 'dag' ? dagTickInterval : 0}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
                formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
              />
              <Bar dataKey="intern" stackId="a" fill="#ef4444" />
              <Bar dataKey="onderaannemer" stackId="a" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
