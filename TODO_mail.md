# E-mail — uitnodiging/wachtwoord-reset komt niet aan bij Eissink

## Probleem

Bij het testen van de routing-refactor (zie TODO_routing.md, stap 8) bleek:
uitnodiging/wachtwoord-reset-mail komt wél aan op een privé Outlook-adres,
maar **niet** op het werk-e-mailadres `remco@eissink.nl` (ook Microsoft/
Outlook, zakelijk tenant).

Losstaand van de routing-refactor — de mail wordt nooit verzonden/ontvangen,
dus de redirect-logica na het klikken op de link komt hier nog niet eens
aan de beurt.

## Vermoedelijke oorzaak

Verzendkant is al gecontroleerd en lijkt in orde (zie TODO.md, "Eigen SMTP
instellen"): Resend, verzonden vanaf `noreply@byggr.nl`, SPF/DKIM/DMARC
correct ingesteld via Cloudflare DNS, uitgevoerd 18 mei 2026.

Waarschijnlijker: ontvangkant bij het Microsoft 365-tenant van Eissink.
Zakelijke Microsoft-tenants hebben vaak strengere filtering (Microsoft
Defender for Office 365) dan een privé Outlook.com-account, en een
"wachtwoord instellen"-mail van een onbekend extern domein is precies het
soort bericht waar zulke filters extra alert op staan.

## Te checken (in volgorde van makkelijkst)

- [ ] Map "Ongewenste e-mail"/spam in de `eissink.nl`-mailbox zelf.
- [ ] Microsoft 365 quarantaine (vereist tenant-adminrechten):
      admin.microsoft.com → Security → Email & collaboration → Review →
      Quarantine. Mails die door Defender worden tegengehouden komen hier
      terecht, niet in de gewone spam-map.
- [ ] Transportregel/connector bij Eissink die externe mail van onbekende
      afzenderdomeinen blokkeert vóór quarantaine — vereist ook
      tenant-adminrechten om te checken.
- [ ] Resend-dashboard (als daar toegang toe is): logs bekijken of de mail
      naar `remco@eissink.nl` daadwerkelijk is afgeleverd (bounce/reject)
      of dat Resend meldt dat hij is aangenomen door de ontvangende server.

## Status

Niet blokkerend voor andere lopende werkzaamheden — apart traject.
