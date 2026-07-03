import { useState } from 'react'

// ─── Content ──────────────────────────────────────────────────────────────────
// Pas hier de teksten aan. Elke sectie is een array van blokken met een optionele
// kop (subparagraaf) en een lijst van bullet-items.

const SECTIES = [
  { id: 'planning',  label: 'Planning' },
  { id: 'overzicht', label: 'Overzicht' },
  { id: 'projecten', label: 'Projecten' },
  { id: 'monteurs',  label: 'Monteurs' },
  { id: 'prognose',  label: 'Prognose' },
  { id: 'beheer',    label: 'Beheer' },
  { id: 'faq',       label: 'FAQ' },
]

const CONTENT = {
  planning: [
    {
      kop: 'Navigeren',
      items: [
        'Pijltjes links/rechts om een week voor of achteruit te bladeren.',
        '"Vandaag" om direct terug te springen naar de huidige week.',
      ],
    },
    {
      kop: 'Zoeken en filteren',
      items: [
        'Zoekbalk — typ een naam om direct te filteren op monteur. Als Gebruiker staat dit bij inloggen automatisch op jouw naam.',
        'Expertise — filter op vakgebied, bijv. "Plafonds" of "Wanden".',
        'Projectleider — toon alleen projecten van een bepaalde projectleider.',
        'Project — filter de planning op één specifiek project.',
      ],
    },
    {
      kop: 'Weergave-opties',
      items: [
        'Ingepland — verberg monteurs zonder inplanning in de getoonde week.',
        '8 weken — vergroot de weergave naar acht weken tegelijk.',
        'Weekend — voeg zaterdag en zondag toe aan de weergave.',
      ],
    },
    {
      kop: 'Inplannen — individueel (alleen Planner)',
      items: [
        'Klik op een lege cel achter de naam van een monteur op de gewenste dag.',
        'Zoek het project op in het venster dat opent.',
        'Stel de start- en einddatum in en klik op "Inplannen".',
      ],
    },
    {
      kop: 'Inplannen — hele groep (alleen Planner)',
      items: [
        'Groepen staan onderaan de lijst. Klik op een cel in de groepsrij om alle leden tegelijk in te plannen op hetzelfde project en dezelfde periode.',
      ],
    },
    {
      kop: 'Bestaande inplanning (alleen Planner)',
      items: [
        'Klik op een gekleurd blok om het project en de periode te zien.',
        'Verwijder dag — verwijdert alleen de aangeklikte dag.',
        'Verwijder periode — verwijdert de hele aaneengesloten reeks.',
        'Wijzigen — pas de start- en einddatum aan. Feestdagen in de nieuwe periode worden direct gemeld.',
      ],
    },
    {
      kop: 'Slepen (alleen Planner)',
      items: [
        'Houd de muisknop ingedrukt op een blok en sleep naar een andere dag of monteur.',
        'De volledige periode verplaatst mee naar de nieuwe startdatum.',
        'Slepen is uitgeschakeld in de 8-weken weergave (cellen te smal).',
      ],
    },
  ],

  overzicht: [
    {
      kop: null,
      items: [
        'Het overzicht toont de planning vanuit het perspectief van de projecten. Elke rij is een project; de kolommen zijn dagen.',
        'Het getal in een cel geeft aan hoeveel mensen er die dag op dat project werken.',
        'Klik op een cel om te zien welke monteurs er staan.',
      ],
    },
    {
      kop: 'Navigeren en filteren',
      items: [
        'Pijltjes om voor- of achteruit te bladeren.',
        'Dropdown bovenaan om te filteren op projectleider.',
        '8 weken voor een breder beeld, Weekend om zaterdag en zondag mee te nemen.',
        'Als Gebruiker wordt het overzicht automatisch gefilterd op jouw naam als projectleider.',
      ],
    },
  ],

  projecten: [
    {
      kop: null,
      items: [
        'Lijst van alle projecten met werknummer, omschrijving, opdrachtgever, plaats en projectleider.',
        'Gebruik de zoekbalk om snel een project te vinden op naam of werknummer.',
        'Klik op een kolomkop om de lijst te sorteren.',
      ],
    },
    {
      kop: 'Aanmaken / bewerken (alleen Planner)',
      items: [
        'Klik op "Nieuw project" om een project toe te voegen.',
        'Klik op een bestaand project om de gegevens te wijzigen.',
        'Verplichte velden: werknummer en omschrijving.',
      ],
    },
  ],

  monteurs: [
    {
      kop: null,
      items: [
        'Lijst van alle monteurs en groepen binnen jouw organisatie.',
        'Filter op Intern of Onderaannemer via de knoppen bovenaan.',
        'Gebruik de zoekbalk om te zoeken op naam of bedrijfsnaam.',
      ],
    },
    {
      kop: 'Aanmaken / bewerken (alleen Planner)',
      items: [
        'Klik op "Nieuwe monteur" om iemand toe te voegen. Verplicht: achternaam en type (Intern of Onderaannemer).',
        'Klik op een bestaande monteur om gegevens te wijzigen, zoals expertises of telefoonnummer.',
        'Groepen aanmaken: klik op "Nieuwe groep", geef een naam en voeg monteurs toe. Een groep plan je in één keer in via de planning.',
      ],
    },
  ],

  prognose: [
    {
      kop: null,
      items: [
        'De prognose toont een tijdlijn van 42 weken met per project een gekleurde balk voor de looptijd. Bedoeld om snel te zien welke projecten wanneer lopen en hoe de totale portefeuille eruit ziet.',
        'Alleen zichtbaar voor Admin en Management.',
      ],
    },
    {
      kop: 'Navigeren',
      items: [
        '"Vandaag" springt terug naar twee weken vóór de huidige week.',
        'Pijltjes bladeren 12 weken voor of achteruit.',
        'De huidige week is blauw gemarkeerd met een stip.',
      ],
    },
    {
      kop: 'Sorteren en filteren',
      items: [
        'Sorteer dropdown — kies tussen Projectleider (standaard), Startdatum of Aanneemsom.',
        'Projectleider dropdown — toon alleen projecten van een bepaalde projectleider.',
      ],
    },
    {
      kop: 'Kleuren in de tijdlijn',
      items: [
        'Projectbalk — kleur gebaseerd op de projectleider, zodat per PL snel herkenbaar is welke projecten bij elkaar horen.',
        'Amber achtergrond — bouwvak of vakantieperiode.',
        'Donkerblauwe achtergrond — officiële feestdag.',
      ],
    },
    {
      kop: 'Nieuw project aanmaken (alleen Admin/Management)',
      items: [
        'Klik op "+ Nieuw project" rechtsboven om een project aan de prognose toe te voegen.',
        'Vul omschrijving, projectnummer, start- en einddatum in. Projectleider en aanneemsom zijn optioneel.',
        'Je kunt ook op een lege weekcel in een bestaande rij klikken om direct op die startdatum te beginnen.',
      ],
    },
    {
      kop: 'Project bewerken',
      items: [
        'Klik op een projectbalk of de projectnaam in de linkerkolom om het detailvenster te openen.',
        'Hier pas je de start- en einddatum, duur in weken, projectleider, aanneemsom en notities aan.',
        'De balk in de tijdlijn past direct mee na opslaan.',
      ],
    },
    {
      kop: 'Afdrukken',
      items: [
        'Klik op "Afdrukken" om de prognose te printen.',
        'Het formaat is ingesteld op A0 liggend — geschikt voor grote plotters.',
      ],
    },
  ],

  beheer: [
    {
      kop: 'Gebruikers (alleen Admin)',
      items: [
        '"Persoon toevoegen" — maak een profiel aan zonder loginaccount. Handig voor projectleiders die niet zelf inloggen.',
        '"Uitnodigen via e-mail" — stuur een uitnodigingslink. De gebruiker kiest zelf een wachtwoord via de link.',
        '"Direct aanmaken" — stel meteen een wachtwoord in en koppel het account direct aan een profiel.',
        'Rol wijzigen — klik op de rol naast een gebruiker om deze te wijzigen (Admin, Management, Planner, Gebruiker of Monteur).',
        'Account verwijderen — verwijdert het loginaccount. Het profiel (naam, afkorting) blijft bewaard.',
      ],
    },
    {
      kop: 'Periodes (alleen Admin)',
      items: [
        '"Nieuwe periode" — voeg een feestdag of bouwvak/vakantieperiode toe met een naam en datum(s).',
        'Feestdag — verschijnt als donkerblauwe blokkering in Planning en Prognose.',
        'Bouwvak / vakantie — verschijnt als amber blokkering.',
        'Klik op een bestaande periode om de naam of datums te wijzigen, of om de periode te verwijderen.',
      ],
    },
  ],

  faq: [
    {
      kop: null,
      items: [],
    },
  ],
}

const FAQ = [
  {
    v: 'Ik zie mezelf niet in de zoekbalk of het filter.',
    a: 'Controleer bij de Admin of er een profiel voor jou aangemaakt is in Beheer.',
  },
  {
    v: 'Ik kan niets bewerken of inplannen.',
    a: 'Je hebt de rol Gebruiker — je kunt de planning alleen bekijken. Neem contact op met de Admin als je bewerkrechten nodig hebt.',
  },
  {
    v: 'De planning laadt niet of ik zie een foutmelding.',
    a: 'Controleer de internetverbinding en ververs de pagina. Blijft het probleem, neem contact op met de beheerder.',
  },
  {
    v: 'Ik zie een project niet in de planning.',
    a: 'Het project heeft mogelijk nog niemand ingepland in de getoonde week, of er staat een filter actief. Controleer de filters bovenaan.',
  },
  {
    v: 'Ik zie de Prognose-tab niet.',
    a: 'De Prognose is alleen zichtbaar voor gebruikers met de rol Admin of Management. Neem contact op met de Admin als je toegang nodig hebt.',
  },
]

const ROLLEN = [
  { rol: 'Planner',    omschrijving: 'Alles bekijken én bewerken: inplannen, projecten aanmaken, monteurs beheren' },
  { rol: 'Gebruiker',  omschrijving: 'Alleen bekijken. Na inloggen automatisch gefilterd op je eigen naam' },
  { rol: 'Management', omschrijving: 'Bekijken + toegang tot de Prognose planning' },
  { rol: 'Admin',      omschrijving: 'Alles, inclusief Beheer (gebruikers aanmaken, periodes instellen)' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function HandleidingModal({ onClose, openSectie = 'planning' }) {
  const beginSectie = SECTIES.find((s) => s.id === openSectie) ? openSectie : 'planning'
  const [sectie, setSectie] = useState(beginSectie)

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 pt-16 px-4 pb-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none"
          aria-label="Sluiten"
        >
          ✕
        </button>

        <h1 className="text-lg font-semibold text-gray-900 mb-5">Handleiding</h1>

        <section className="mb-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rollen</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Rol</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Wat je kunt</th>
                </tr>
              </thead>
              <tbody>
                {ROLLEN.map(({ rol, omschrijving }) => (
                  <tr key={rol} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">{rol}</td>
                    <td className="px-4 py-2 text-gray-600">{omschrijving}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex border-b border-gray-200 mb-5">
          {SECTIES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSectie(s.id)}
              className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                sectie === s.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {sectie === 'faq' ? (
          <section>
            {FAQ.map(({ v, a }) => (
              <div key={v} className="mb-4">
                <p className="text-sm font-semibold text-gray-800 mb-0.5">{v}</p>
                <p className="text-sm text-gray-500">{a}</p>
              </div>
            ))}
          </section>
        ) : (
          <section>
            {CONTENT[sectie].map(({ kop, items }, i) => (
              <div key={i} className="mb-3">
                {kop && (
                  <p className="text-sm font-semibold text-gray-700 mb-1">{kop}</p>
                )}
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  {items.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
