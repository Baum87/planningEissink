# Verwerkersovereenkomst

*Op basis van artikel 28 van de Algemene Verordening Gegevensbescherming (AVG)*

---

## Partijen

**Verwerker:**
Remco Baumeister, handelend onder de naam Byggr  
KvK-nummer: [invullen]  
E-mail: hello@byggr.nl  
Hierna te noemen: **Verwerker**

**Verwerkingsverantwoordelijke:**
Bedrijfsnaam: ___________________________________  
KvK-nummer: ___________________________________  
Adres: ___________________________________  
E-mail: ___________________________________  
Hierna te noemen: **Verwerkingsverantwoordelijke**

Samen te noemen: **Partijen**

---

## Overwegingen

- Verwerkingsverantwoordelijke maakt gebruik van de planningsapplicatie *Planning* (hierna: de Dienst), ontwikkeld en beheerd door Verwerker.
- In het kader van de Dienst verwerkt Verwerker persoonsgegevens namens Verwerkingsverantwoordelijke.
- Partijen wensen de voorwaarden van deze verwerking schriftelijk vast te leggen conform artikel 28 AVG.

---

## Artikel 1 — Definities

De begrippen in deze overeenkomst hebben de betekenis die de AVG daaraan toekent. In aanvulling daarop:

- **Dienst:** de webapplicatie Planning, toegankelijk via de door Verwerker verstrekte URL.
- **Betrokkene:** de natuurlijke persoon wiens persoonsgegevens worden verwerkt, zoals medewerkers en onderaannemers van Verwerkingsverantwoordelijke.

---

## Artikel 2 — Onderwerp, duur en aard van de verwerking

**Onderwerp:** Verwerker verwerkt persoonsgegevens ten behoeve van personeels- en projectplanning binnen de Dienst.

**Duur:** Deze overeenkomst geldt voor de duur van de dienstverleningsrelatie tussen Partijen en eindigt automatisch bij beëindiging daarvan.

**Aard:** Opslaan, raadplegen, wijzigen en verwijderen van persoonsgegevens via een beveiligde webapplicatie.

**Doel:** Het plannen en registreren van werkzaamheden van medewerkers en onderaannemers.

---

## Artikel 3 — Categorieën persoonsgegevens en betrokkenen

**Categorieën betrokkenen:**
- Eigen medewerkers van Verwerkingsverantwoordelijke
- Ingehuurde onderaannemers (zzp'ers)
- Projectleiders en planners

**Categorieën persoonsgegevens:**
- Naam (voor- en achternaam)
- E-mailadres
- Telefoonnummer
- Woonplaats en adres
- Werklocaties en projecttoewijzingen
- Inloggegevens (versleuteld opgeslagen via Supabase Auth)

Er worden geen bijzondere categorieën persoonsgegevens verwerkt.

---

## Artikel 4 — Verplichtingen van de Verwerker

Verwerker verplicht zich:

1. Persoonsgegevens uitsluitend te verwerken op basis van gedocumenteerde instructies van Verwerkingsverantwoordelijke.
2. Toegang tot persoonsgegevens te beperken tot medewerkers of sub-verwerkers die deze noodzakelijkerwijs nodig hebben.
3. Alle betrokken personen die toegang hebben tot de gegevens te binden aan een geheimhoudingsplicht.
4. Verwerkingsverantwoordelijke te informeren als een instructie naar het oordeel van Verwerker strijdig is met de AVG.
5. De persoonsgegevens niet te gebruiken voor eigen doeleinden of die van derden.

---

## Artikel 5 — Sub-verwerkers

Verwerker maakt gebruik van de volgende sub-verwerkers:

| Sub-verwerker | Rol | Locatie |
|---|---|---|
| Supabase Inc. | Database en authenticatie | Londen, Verenigd Koninkrijk* |
| Vercel Inc. | Hosting van de webapplicatie | Statische bestanden (geen persoonsgegevens) |

*Het Verenigd Koninkrijk beschikt over een adequaatheidsbesluit van de Europese Commissie (d.d. 28 juni 2021), op grond waarvan doorgifte van persoonsgegevens naar het VK is toegestaan.

Verwerker zal Verwerkingsverantwoordelijke vooraf informeren bij wijzigingen in de sub-verwerkers. Verwerkingsverantwoordelijke heeft het recht hiertegen bezwaar te maken.

---

## Artikel 6 — Doorgifte buiten de EER

Persoonsgegevens worden verwerkt binnen de Europese Economische Ruimte (EER) of het Verenigd Koninkrijk (adequaatheidsbesluit). Er vindt geen doorgifte plaats naar landen buiten de EER zonder adequaatheidsbesluit.

---

## Artikel 7 — Beveiliging

Verwerker heeft passende technische en organisatorische maatregelen genomen ter beveiliging van persoonsgegevens, waaronder:

- Versleutelde HTTPS-verbinding
- Authenticatie via Supabase Auth (wachtwoord-hashing, PKCE-flow)
- Row Level Security (RLS) in de database: elke tenant heeft uitsluitend toegang tot eigen gegevens
- Toegangscontrole op basis van rollen (admin, planner, gebruiker, monteur)
- Geen opslag van wachtwoorden in leesbare vorm

---

## Artikel 8 — Datalekken

Verwerker zal Verwerkingsverantwoordelijke zonder onredelijke vertraging — en waar mogelijk binnen 24 uur — informeren nadat hij kennis heeft gekregen van een inbreuk op de beveiliging die (mogelijk) leidt tot vernietiging, verlies, wijziging of ongeoorloofde verstrekking van verwerkte persoonsgegevens.

De melding bevat ten minste:
- De aard van het datalek
- De categorieën en het (geschatte) aantal betrokkenen en records
- De waarschijnlijke gevolgen
- De genomen of voorgestelde maatregelen

---

## Artikel 9 — Rechten van betrokkenen

Verwerkingsverantwoordelijke is verantwoordelijk voor het afhandelen van verzoeken van betrokkenen (inzage, correctie, verwijdering, etc.). Verwerker verleent op verzoek medewerking aan dergelijke verzoeken, voor zover dit technisch mogelijk is.

---

## Artikel 10 — Geheimhouding

Verwerker verplicht zich tot geheimhouding van de persoonsgegevens en de door Verwerkingsverantwoordelijke verstrekte informatie, tenzij een wettelijke verplichting tot bekendmaking bestaat.

---

## Artikel 11 — Beëindiging en teruggave van gegevens

Bij beëindiging van de Dienst zal Verwerker, op verzoek van Verwerkingsverantwoordelijke:
- Alle persoonsgegevens retourneren in een gangbaar formaat (CSV/JSON), of
- Alle persoonsgegevens verwijderen uit de systemen van Verwerker en sub-verwerkers.

Verwerker bevestigt de verwijdering schriftelijk.

---

## Artikel 12 — Toepasselijk recht

Op deze overeenkomst is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter in Nederland.

---

## Ondertekening

Aldus overeengekomen en in tweevoud ondertekend:

**Verwerker**

Naam: Remco Baumeister  
Functie: Eigenaar Byggr  
Datum: _______________  
Handtekening: _______________

**Verwerkingsverantwoordelijke**

Naam: _______________  
Functie: _______________  
Datum: _______________  
Handtekening: _______________

---

*Dit is een basissjabloon. Laat dit document controleren door een jurist voordat het wordt gebruikt voor definitieve contracten.*
