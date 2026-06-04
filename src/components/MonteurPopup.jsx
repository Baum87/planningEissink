import { avatarKleur, initialen, monteurNaam } from '../lib/avatar'

function Regel({ label, waarde }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-20 shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-900">{waarde}</span>
    </div>
  )
}

export default function MonteurPopup({ monteur, onClose }) {
  const naam = monteurNaam(monteur)
  const [avgBg, avgFg] = avatarKleur(naam)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 p-5 pb-4 border-b border-gray-100">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
            style={{ backgroundColor: avgBg, color: avgFg }}
          >
            {initialen(naam)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900 truncate">{naam || '—'}</div>
            <div className="text-xs text-gray-400 truncate">{monteur.type || ''}</div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-600 transition-colors shrink-0 text-base leading-none"
          >
            ✕
          </button>
        </div>

        {/* Details */}
        <div className="p-5 space-y-3">
          <Regel label="Bedrijf"    waarde={monteur.bedrijfsnaam || '—'} />
          <Regel label="Type"       waarde={monteur.type || '—'} />
          <Regel label="Telefoon"   waarde={monteur.telefoon || '—'} />
          <Regel label="Woonplaats" waarde={monteur.woonplaats || '—'} />
          <div className="flex items-baseline gap-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-20 shrink-0">
              Vandaag
            </span>
            <div className="flex flex-col gap-0.5">
              {(monteur.toewijzingen_vandaag ?? []).length > 0
                ? monteur.toewijzingen_vandaag.map((t) => (
                    <span key={t.projecten?.id} className="text-sm text-gray-900">
                      {t.projecten?.werknummer} — {t.projecten?.omschrijving}
                    </span>
                  ))
                : <span className="text-sm text-gray-900">—</span>
              }
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Expertises
            </div>
            {(monteur.expertises ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {monteur.expertises.map((ex) => (
                  <span
                    key={ex}
                    className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-md"
                  >
                    {ex}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-gray-900">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
