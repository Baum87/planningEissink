# Handleiding Planning App — Planner & Gebruiker

## Wat doet de app?

De planning app laat zien wie wanneer op welk project werkt. Planners kunnen mensen inplannen en projecten beheren. Gebruikers kunnen de planning bekijken.

---

## Jouw rol

Bij inloggen bepaalt je rol wat je kunt doen:

| Rol | Wat je kunt |
|-----|-------------|
| **Planner** | Alles bekijken én bewerken: mensen inplannen, projecten en monteurs aanmaken en wijzigen |
| **Gebruiker** | Alleen bekijken. De planning wordt na inloggen automatisch gefilterd op jouw eigen naam |
| **Management** | Bekijken + toegang tot de Prognose planning |

Beheer (gebruikers aanmaken, vrije periodes instellen) is voorbehouden aan de Admin.

---

## Pagina's

### Planning

De planning toont een weekoverzicht: per rij één monteur of groep, per kolom één dag. Gekleurde blokken geven aan op welk project iemand staat.

**Navigeren**
- Gebruik de pijltjes links en rechts om een week voor of achteruit te bladeren.
- Klik op "Vandaag" om direct terug te springen naar de huidige week.

**Zoeken en filteren**
- **Zoekbalk** (linksboven) — typ een naam om direct te filteren op monteur. Handig als je snel iemand wilt opzoeken in een grote lijst.
- **Expertise** — filter op vakgebied, bijvoorbeeld "Plafonds" of "Wanden". Alleen monteurs met die expertise zijn dan zichtbaar.
- **Projectleider** — toon alleen projecten van een bepaalde projectleider.
- **Project** — filter de planning op één specifiek project. Alleen monteurs die op dat project staan worden getoond.

Als Gebruiker staat de zoekbalk bij inloggen automatisch op jouw eigen naam.

**Weergave-opties** (toggles rechtsboven)
- **Ingepland** — verberg monteurs die in de getoonde week nergens op staan. Handig voor een compacter overzicht.
- **8 weken** — vergroot de weergave van één week naar acht weken tegelijk.
- **Weekend** — voeg zaterdag en zondag toe aan de weergave.

**Inplannen — individueel (alleen Planner)**
1. Klik op een lege cel achter de naam van een monteur op de gewenste dag.
2. Zoek het project op via de zoekbalk in het venster dat opent.
3. Stel de start- en einddatum in.
4. Klik op "Inplannen".

**Inplannen — hele groep (alleen Planner)**
Groepen staan onderaan de lijst. Klik op een cel in de rij van een groep om alle leden van die groep tegelijk in te plannen op hetzelfde project en dezelfde periode. Alle leden worden in één stap ingepland.

**Bestaande inplanning bekijken, wijzigen of verwijderen (alleen Planner)**
Klik op een gekleurd blok in de planning. Je ziet het project en de periode, met de volgende opties:

- **Verwijder dag** — verwijdert alleen de dag waarop je hebt geklikt.
- **Verwijder periode** — verwijdert de hele aaneengesloten reeks dagen van dit project voor deze monteur.
- **Wijzigen** — pas de start- en einddatum van de periode aan. Terwijl je de datums invult zie je direct hoeveel werkdagen er ingepland worden. Als er een feestdag in de nieuwe periode valt, wordt dat gemeld zodat je niet voor verrassingen komt te staan.

**Inplanning verslepen naar andere datum of monteur (alleen Planner)**
Je kunt een bestaand blok direct naar een andere plek slepen zonder het venster te openen:
1. Houd de muisknop ingedrukt op een gekleurd blok en beweeg — het blok licht op om aan te geven dat je sleept.
2. Sleep naar de gewenste dag of naar een andere monteur-rij.
3. Laat los — de volledige aaneengesloten periode verplaatst mee naar de nieuwe startdatum.

Let op: slepen is uitgeschakeld in de 8-weken weergave omdat de cellen dan te smal zijn.

---

### Overzicht

Het overzicht toont de planning vanuit het perspectief van de projecten. Elke rij is een project; de kolommen zijn dagen. Het getal in een cel geeft aan hoeveel mensen er die dag op dat project werken.

Dit is handig als je wilt zien welke projecten op een bepaalde dag of week bezet zijn, en met hoeveel mensen.

**Klik op een cel** om te zien welke monteurs er die dag op dat project staan.

**Navigeren en filteren**
- Gebruik de pijltjes om voor- of achteruit te bladeren.
- Filter op projectleider via de dropdown bovenaan.
- Toggle **8 weken** voor een bredere blik, of **Weekend** om zaterdag en zondag mee te nemen.

Als Gebruiker wordt het overzicht automatisch gefilterd op jouw naam als projectleider (indien van toepassing).

---

### Projecten

Een lijst van alle projecten met werknummer, omschrijving, opdrachtgever, plaats en projectleider.

- Gebruik de zoekbalk om snel een project te vinden op naam of werknummer.
- Klik op een kolomkop om de lijst te sorteren.

**Aanmaken / bewerken (alleen Planner)**
- Klik op "Nieuw project" om een project toe te voegen.
- Klik op een bestaand project om de gegevens te wijzigen.
- Verplichte velden: werknummer en omschrijving.

---

### Monteurs

Een lijst van alle monteurs en groepen binnen jouw organisatie.

- Filter op Intern of Onderaannemer via de knoppen bovenaan.
- Gebruik de zoekbalk om te zoeken op naam of bedrijfsnaam.

**Aanmaken / bewerken (alleen Planner)**
- Klik op "Nieuwe monteur" om iemand toe te voegen. Verplicht: achternaam en type (Intern of Onderaannemer).
- Klik op een bestaande monteur om gegevens te wijzigen, zoals expertises of telefoonnummer.
- Groepen aanmaken: klik op "Nieuwe groep", geef een naam en voeg monteurs toe. Een groep plan je in één keer in via de planning.

---

### Prognose

De prognose toont een tijdlijn van 42 weken met per project een gekleurde balk voor de looptijd. Bedoeld om snel te zien welke projecten wanneer lopen en hoe de totale portefeuille eruit ziet.

Alleen zichtbaar voor Admin en Management.

**Navigeren**
- Klik op "Vandaag" om terug te springen naar twee weken vóór de huidige week.
- Gebruik de pijltjes om 12 weken voor of achteruit te bladeren.
- De huidige week is blauw gemarkeerd met een stip.

**Sorteren en filteren**
- **Sorteer dropdown** — kies tussen Projectleider (standaard), Startdatum of Aanneemsom.
- **Projectleider dropdown** — toon alleen projecten van een bepaalde projectleider.

**Kleuren in de tijdlijn**
- Blauwe balk — projectperiode (van startdatum t/m einddatum).
- Amber achtergrond — bouwvak of vakantieperiode.
- Donkerblauwe achtergrond — officiële feestdag.

**Project bewerken**
Klik op een projectbalk of de projectnaam om het detailvenster te openen. Hier pas je de start- en einddatum, projectleider, aanneemsom en eventuele notities aan.

**Afdrukken**
Klik op "Afdrukken" om de prognose te printen. Het formaat is ingesteld op A0 liggend — geschikt voor grote plotters.

---

### Beheer

Alleen zichtbaar voor de Admin. Beheer heeft twee tabbladen: Gebruikers en Periodes.

**Gebruikers**
- **Persoon toevoegen** — maak een profiel aan zonder loginaccount. Handig voor projectleiders die niet zelf inloggen.
- **Uitnodigen via e-mail** — stuur een uitnodigingslink. De gebruiker kiest zelf een wachtwoord via de link.
- **Direct aanmaken** — stel meteen een wachtwoord in en koppel het account direct aan een profiel.
- **Rol wijzigen** — klik op de rol naast een gebruiker om deze te wijzigen (Admin, Management, Planner, Gebruiker of Monteur).
- **Account verwijderen** — verwijdert het loginaccount. Het profiel (naam, afkorting) blijft bewaard.

**Periodes**
- **Nieuwe periode** — voeg een feestdag of bouwvak/vakantieperiode toe met een naam en datum(s).
- Feestdag — verschijnt als donkerblauwe blokkering in Planning en Prognose.
- Bouwvak / vakantie — verschijnt als amber blokkering.
- Klik op een bestaande periode om de naam of datums te wijzigen, of om de periode te verwijderen.

---

## Veelgestelde vragen

**Ik zie mezelf niet in de zoekbalk of het filter.**
Controleer bij de Admin of er een profiel voor jou aangemaakt is in Beheer.

**Ik kan niets bewerken of inplannen.**
Je hebt de rol Gebruiker — je kunt de planning alleen bekijken. Neem contact op met de Admin als je bewerkrechten nodig hebt.

**De planning laadt niet of ik zie een foutmelding.**
Controleer de internetverbinding en ververs de pagina. Als het probleem blijft, neem contact op met de beheerder van de app.

**Ik zie een project niet in de planning.**
Het project heeft mogelijk nog niemand ingepland staan in de getoonde week. Controleer of de filters correct staan — soms staat er nog een filter actief op een projectleider of expertise.

**Ik zie de Prognose-tab niet.**
De Prognose is alleen zichtbaar voor gebruikers met de rol Admin of Management. Neem contact op met de Admin als je toegang nodig hebt.
