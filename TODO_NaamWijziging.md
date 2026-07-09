# Naamgeving — repo en Vercel-project hernoemen

## Waarom

Het project heet nu "planningEissink" op GitHub en Vercel, terwijl de app bewust
wordt opgebouwd tot een commercieel multi-tenant product (zie CONTEXT.md: "Begonnen
als intern systeem voor Eissink... Commercieel aan te bieden aan andere afbouw- en
installatiebedrijven"). Een naam die aan één specifieke klant vastzit, klopt niet meer
zodra er een tweede klant bijkomt.

Nu is het moment om dit te doen: nog maar 1 klant, 1 gebruiker, dus lage impact.

## Open vraag

**Wat wordt de nieuwe naam?** Dit is een productbeslissing, geen technische —
nog niet ingevuld. Pas als dit vaststaat kunnen onderstaande stappen uitgevoerd worden.

## Wat er verandert

| Plek | Wat | Impact op eindgebruiker |
|---|---|---|
| GitHub repo | Hernoemen via Settings | Geen — GitHub redirect't de oude URL automatisch |
| Vercel project | Hernoemen via Settings | Geen — custom domain `planning.byggr.nl` blijft ongewijzigd, alleen het onderliggende `*.vercel.app`-adres verandert |
| Lokale git remote | `git remote set-url origin <nieuwe-url>` | Geen, cosmetisch |
| `README.md` regel 137-138 | Clone-instructie (`git clone .../planningEissink.git`, `cd planningEissink`) | Geen |
| `STACK.md` regel 126 | "Repository: github.com/Baum87/planningEissink" | Geen |

**Bewust ongemoeid:** alle inhoudelijke verwijzingen naar "Eissink" als klantnaam/tenant
(bv. CONTEXT.md "Bedrijfscontext (Eissink — tenant 1)") — dat is correcte inhoud, geen
naamgevingsartefact, en blijft gewoon staan.

## Risico's

Laag. Geen productiedata, geen URL's die eindgebruikers direct zien, geen
migratie. Enige aandachtspunt: als er ergens nog een CI/CD-koppeling of
webhook draait op de oude repo-naam (nog niet gecheckt), moet die na de
GitHub-rename opnieuw gekoppeld worden — te verifiëren op het moment zelf.

## Omvang

Klein, mechanisch, geen fasering nodig — in ~10 minuten gedaan zodra de nieuwe
naam vaststaat.
