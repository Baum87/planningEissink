# E-mail setup — planning_app / Byggr

Gedocumenteerd na inrichting op 18 mei 2026.

---

## Architectuur

```
Supabase Auth
  └── SMTP via Resend
        └── verstuurt vanaf noreply@byggr.nl
              └── ontvangt in browser van gebruiker

Zoho Mail
  └── hello@byggr.nl (zakelijke inbox)
```

---

## Resend

**Doel:** Verstuurt transactionele mails vanuit Supabase (uitnodigingen, wachtwoord reset).

**Account:** resend.com — gekoppeld aan `byggr.nl`

**Domein geverifieerd via:** Cloudflare Auto Configure (DKIM + SPF op `send` subdomein)

**Supabase SMTP instellingen:**
| Veld | Waarde |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Resend API key (bewaard in Supabase dashboard) |
| Sender email | `noreply@byggr.nl` |
| Sender name | `Planning` |

**API key bewaren:** Alleen in Supabase dashboard — nooit in code of `.env` zetten.

---

## Zoho Mail

**Doel:** Zakelijke inbox voor `hello@byggr.nl`.

**Account:** zoho.com — Free tier (1 gebruiker, 5 GB)

**Inloggen:** zoho.com/mail → hello@byggr.nl

---

## Cloudflare DNS — overzicht mailrecords

| Type | Naam | Doel |
|---|---|---|
| MX | byggr.nl | Zoho inkomende mail (mx.zoho.eu, mx2, mx3) |
| MX | send | Resend bounce-afhandeling |
| TXT | byggr.nl | SPF: `v=spf1 include:zohomail.eu include:amazonses.com ~all` |
| TXT | send | SPF voor Resend subdomein |
| TXT | resend._domainkey | DKIM voor Resend |
| TXT | zmail._domainkey | DKIM voor Zoho |
| TXT | _dmarc | `v=DMARC1; p=none; rua=mailto:hello@byggr.nl` |

**Let op:** `planning` CNAME staat op **DNS only** (geen Cloudflare proxy) — vereist door Vercel.

---

## Bekende beperkingen

- Nieuwe domeinen belanden soms in spam — verbetert automatisch na verloop van tijd
- Resend free tier: max 3.000 mails/maand, 100/dag
- Zoho free: geen aliassen (bijv. remco@byggr.nl) — eventueel later upgraden

---

## Testen

1. Ga naar `https://planning.byggr.nl`
2. Klik **Wachtwoord vergeten**
3. Vul een bestaand e-mailadres in
4. Mail moet aankomen vanaf `noreply@byggr.nl`
