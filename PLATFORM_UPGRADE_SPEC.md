# Measuremate Platform — Upgrade Specificatie

> **Doel van dit document:** Volledige specificatie voor het upgraden van het Measuremate dataplatform. Dit document bevat alles wat een ontwikkelaar nodig heeft om de wijzigingen te implementeren. Het platform moet een professioneel, veilig, multi-tenant SaaS sensorenplatform blijven dat zowel individuele burgers als organisaties (zoals Diergaarde Blijdorp) bedient.
>
> **Huidige staat:** Werkend platform op https://measuremate.vercel.app (Next.js 15 + Supabase + Vercel).
> **Repo:** https://github.com/luukdvr/Measuremate
> **Datum:** februari 2026

---

## Inhoudsopgave

1. [Context & Uitgangspunten](#1-context--uitgangspunten)
2. [Wat Blijft Ongewijzigd](#2-wat-blijft-ongewijzigd)
3. [Beveiligingsverbeteringen](#3-beveiligingsverbeteringen)
4. [Database Uitbreidingen](#4-database-uitbreidingen)
5. [API Uitbreidingen](#5-api-uitbreidingen)
6. [Frontend — UI/UX Redesign](#6-frontend--uiux-redesign)
7. [Nieuwe Features: Kaartweergave & Netwerk](#7-nieuwe-features-kaartweergave--netwerk)
8. [Nieuwe Features: Data-analyse & Vergelijking](#8-nieuwe-features-data-analyse--vergelijking)
9. [Nieuwe Features: Data Export](#9-nieuwe-features-data-export)
10. [Nieuwe Features: Handmatige Metingen](#10-nieuwe-features-handmatige-metingen)
11. [Node Health & Status Monitoring](#11-node-health--status-monitoring)
12. [Performance & Schaalbaarheid](#12-performance--schaalbaarheid)
13. [Technische Vereisten & Constraints](#13-technische-vereisten--constraints)
14. [Prioriteiten](#14-prioriteiten)

---

## 1. Context & Uitgangspunten

### Wat is Measuremate?
Measuremate is een SaaS IoT-sensorenplatform. Gebruikers (burgers, organisaties, onderzoekers) koppelen hun MeasureMate-apparaten (Arduino/ESP32) en bekijken sensordata in een webdashboard. Het platform is **generiek** — het werkt voor elke sensortoepassing, niet alleen waterkwaliteit.

### Wie gebruikt het?
- **Burgers (Citizen Science):** Individuele gebruikers met 1-2 MeasureMates voor thuisgebruik (tuinmonitoring, waterkwaliteit, etc.)
- **Organisaties:** Diergaarde Blijdorp, Hoogheemraadschap — netwerken van 5-20+ MeasureMates
- **PULSAQUA (beheerder):** De organisatie die het platform beheert

### Kernprincipes
1. **SaaS-first:** Elk account is volledig geïsoleerd. Gebruikers zien alleen hun eigen data.
2. **Generiek:** Het platform ondersteunt elke soort sensor, niet alleen waterkwaliteit.
3. **Schaalbaar:** Van 1 sensor tot honderden nodes per account.
4. **Professioneel:** De UI moet er uitzien als een echt product, niet als een AI-gegenereerde demo.
5. **Veilig:** Productiewaardige security, geen debug-routes, geen hardcoded keys.

---

## 2. Wat Blijft Ongewijzigd

Deze onderdelen werken goed en moeten **behouden** blijven (niet opnieuw bouwen):

- ✅ **Tech stack:** Next.js 15 (App Router) + TypeScript + Supabase + Vercel
- ✅ **Data-ingestie API:** `POST /api/sensor-data` met Bearer API key
- ✅ **Database hiërarchie:** Account → Measuremates → Sensors → Sensor Data
- ✅ **Supabase Auth:** Email/wachtwoord authenticatie
- ✅ **Row Level Security:** Alle tabellen geïsoleerd per user
- ✅ **Realtime:** Supabase Realtime channels voor live updates
- ✅ **Email alerts:** NotificationAPI integratie met threshold checks
- ✅ **Spam preventie:** 30 min cooldown via `can_send_notification()`
- ✅ **Sensor API keys:** Unieke UUID per sensor voor device authenticatie
- ✅ **Cascade deletes:** Measuremate → Sensors → Data

---

## 3. Beveiligingsverbeteringen

### 3.1 Verwijder debug/test routes (KRITIEK)
De volgende routes bevatten beveiligingsrisico's en moeten **volledig verwijderd** worden:

```
VERWIJDER: src/app/api/admin-check/route.ts     → bevat hardcoded test API key
VERWIJDER: src/app/api/debug/route.ts            → lekt database info
VERWIJDER: src/app/api/check-sensors/route.ts    → lekt sensor informatie
VERWIJDER: src/app/api/test-threshold/route.ts   → onbeveiligd test endpoint
```

### 3.2 Rate limiting op API endpoints
Implementeer rate limiting om misbruik te voorkomen:

| Endpoint | Limiet | Per |
|----------|--------|-----|
| `POST /api/sensor-data` | 120 requests | per minuut per API key |
| `POST /api/send-notification` | 10 requests | per minuut (intern) |
| `GET /api/sensor-data` | 60 requests | per minuut per user |
| Auth endpoints | 5 requests | per minuut per IP |

**Implementatie:** Gebruik Vercel's `@vercel/edge` rate limiting of een in-memory store met sliding window.

### 3.3 Input validatie versterken
- Valideer `value` in sensor-data: moet een getal zijn, optioneel: minimum/maximum range per sensor
- Sanitize alle user input (naam, beschrijving, locatie velden)
- Valideer `timestamp` format als meegegeven (ISO 8601)
- Maximum body size: 1KB voor sensor-data, 10KB voor andere endpoints

### 3.4 API key security
- Huidige situatie: API keys zijn UUIDs — dit is prima
- Toevoegen: optie om API key te **regenereren** (invalidate oude key)
- API keys nooit in logs schrijven

### 3.5 Headers & CORS
- Stel correcte CORS headers in (alleen eigen domein + localhost voor dev)
- Voeg security headers toe: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`
- Content Security Policy configureren

### 3.6 Metadata updaten
- Verwijder "Create Next App" uit `layout.tsx` metadata
- Stel correcte titel, beschrijving en Open Graph tags in:
  - Titel: "Measuremate — Sensordata Platform"
  - Beschrijving: "Monitor je sensoren in real-time. Open voor iedereen."

---

## 4. Database Uitbreidingen

### 4.1 Locatiegegevens toevoegen aan Measuremates

```sql
ALTER TABLE measuremates ADD COLUMN latitude DECIMAL;
ALTER TABLE measuremates ADD COLUMN longitude DECIMAL;
```

Dit maakt de kaartweergave mogelijk. Gebruikers voeren lat/lng in bij het aanmaken of bewerken van een Measuremate (of via een kaart-picker in de UI).

### 4.2 Node status tracking

```sql
ALTER TABLE measuremates ADD COLUMN last_data_received_at TIMESTAMPTZ;
```

Dit wordt automatisch geüpdatet wanneer een sensor onder deze Measuremate data ontvangt. Hiermee kan de UI tonen of een node "online" / "offline" / "waarschuwing" is.

**Logica:**
- Online: `last_data_received_at` < 2× meetinterval geleden
- Waarschuwing: `last_data_received_at` tussen 2× en 5× meetinterval
- Offline: `last_data_received_at` > 5× meetinterval of NULL

### 4.3 Sensor eenheid en type

```sql
ALTER TABLE sensors ADD COLUMN unit TEXT DEFAULT '';           -- bijv. '°C', 'pH', 'mS/cm'
ALTER TABLE sensors ADD COLUMN sensor_type TEXT DEFAULT '';    -- bijv. 'temperature', 'ph', 'ec'
```

Dit maakt het mogelijk om sensoren te labelen en in de toekomst automatisch grafieken te configureren en vergelijkingen per sensortype te doen.

### 4.4 Handmatige metingen tabel

```sql
CREATE TABLE manual_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    value DECIMAL NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE manual_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own manual measurements"
    ON manual_measurements FOR ALL USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_manual_measurements_sensor_id ON manual_measurements(sensor_id);
```

Stakeholder-eis van Blijdorp: handmatige metingen vergelijken met automatische MeasureMate data.

### 4.5 Indexen voor performance

```sql
-- Snel ophalen van sensor data per sensor + tijdsbereik
CREATE INDEX IF NOT EXISTS idx_sensor_data_sensor_timestamp 
    ON sensor_data(sensor_id, timestamp DESC);

-- Snel ophalen van recente data voor status checks
CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp 
    ON sensor_data(timestamp DESC);
```

---

## 5. API Uitbreidingen

### 5.1 Update `POST /api/sensor-data` — Laatst gezien updaten
Na succesvolle insert, update ook de Measuremate's `last_data_received_at`:

```typescript
// Na succesvolle sensor_data insert:
await supabaseService
  .from('measuremates')
  .update({ last_data_received_at: new Date().toISOString() })
  .eq('id', sensor.measuremate_id);
```

### 5.2 Nieuw: `POST /api/sensor-data/batch` — Batch ingestie
Voor de LoRaWAN gateway bridge: één request met data van meerdere sensoren.

```typescript
// Request body:
{
  "measurements": [
    { "api_key": "sensor-uuid-1", "value": 7.2 },
    { "api_key": "sensor-uuid-2", "value": 23.5 },
    { "api_key": "sensor-uuid-3", "value": 450 }
  ]
}

// Auth: Bearer token = een account-level API key (nieuw) OF 
//       de request bevat per-sensor api_keys in de body
```

**Belangrijk:** Dit endpoint is optioneel maar zeer handig voor de gateway bridge. Het voorkomt dat de bridge 15 individuele HTTPS requests moet doen (5 nodes × 3 sensoren).

### 5.3 Nieuw: `GET /api/export` — Data export

```
GET /api/export?sensor_id=xxx&from=2026-01-01&to=2026-02-01&format=csv
```

- Auth: User sessie (cookie-based)
- Formats: `csv`, `json`
- Parameters: `sensor_id` (required), `from` (optional), `to` (optional), `format` (default: csv)
- Limiet: max 100.000 records per request

### 5.4 Nieuw: `GET /api/health` update
Maak de bestaande health route nuttiger:
- Toon versie, uptime, database status
- **Geen** gevoelige informatie

---

## 6. Frontend — UI/UX Redesign

### 6.1 Design Principes

Het dashboard moet er professioneel uitzien. **Niet** een standaard Tailwind template of AI-gegenereerde UI.

**Richtlijnen:**
- **Clean en functioneel:** Denk aan Grafana, Datadog, of Vercel's eigen dashboard als inspiratie
- **Consistent design system:** Gebruik een component library of bouw een eigen design system met consistente spacing, kleuren, typografie
- **Dark mode support:** Volledig werkende dark/light mode
- **Responsive:** Bruikbaar op tablet en desktop (mobiel is nice-to-have, geen prioriteit)
- **Goede lege staten:** Als een gebruiker geen data heeft, toon een duidelijke onboarding flow
- **Loading states:** Skeleton loaders, niet spinners overal
- **Micro-interacties:** Subtiele hover effecten, transitions (niet overdreven)

### 6.2 Kleurenpalet (suggestie)

```
Primary:      Diepblauw (#1e40af tot #3b82f6) — water/vertrouwen
Secondary:    Teal (#0d9488) — natuur/wetenschap
Success:      Groen (#16a34a)
Warning:      Amber (#f59e0b)
Danger:       Rood (#dc2626)
Background:   Lichtgrijs (#f8fafc) / Dark: (#0f172a)
Surface:      Wit (#ffffff) / Dark: (#1e293b)
Text:         Donkergrijs (#1e293b) / Dark: (#e2e8f0)
```

### 6.3 Component Library
Overweeg **shadcn/ui** (Radix UI primitives + Tailwind) voor consistente, toegankelijke componenten:
- Buttons, Inputs, Select, Dialog, Dropdown, Toast, Tabs, Card, Badge, Tooltip
- Past perfect bij Next.js + Tailwind stack
- Volledig aanpasbaar (geen externe dependency runtime)

### 6.4 Layout Structuur

```
┌─────────────────────────────────────────────────────────┐
│  Topbar: Logo | Measuremate naam | [Dark mode] [Logout] │
├───────────┬─────────────────────────────────────────────┤
│           │                                             │
│  Sidebar  │              Main Content                   │
│           │                                             │
│  - Overzicht (kaart)                                    │
│  - Measuremates                                         │
│    ├─ Measuremate 1                                     │
│    ├─ Measuremate 2                                     │
│    └─ + Nieuw                                           │
│  - Vergelijken                                          │
│  - Instellingen                                         │
│  - API Docs                                             │
│           │                                             │
└───────────┴─────────────────────────────────────────────┘
```

**Navigatie via sidebar** in plaats van het huidige "alles op één pagina" design:
- **Overzicht:** Kaart met alle Measuremates + snelle status (alleen als locatie is ingesteld)
- **Measuremates:** Lijst van Measuremates → klik → sensors + grafieken
- **Vergelijken:** Selecteer 2+ sensoren en plot ze naast/over elkaar
- **Instellingen:** Account, API keys overzicht, notificatie voorkeuren
- **API Docs:** Inline documentatie hoe devices te koppelen (met code voorbeelden)

### 6.5 Measuremate Detail Pagina

Wanneer een gebruiker een Measuremate selecteert:

```
┌─────────────────────────────────────────────────────────┐
│  Measuremate: "Vijver Noord" — Online ● — Blijdorp      │
│  Lat: 51.9270, Lng: 4.4470 — Laatste data: 2 min geleden│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ pH           │  │ EC           │  │ Temperatuur  │  │
│  │ 7.24         │  │ 452 µS/cm   │  │ 18.3 °C      │  │
│  │ ● Normaal    │  │ ● Normaal   │  │ ● Normaal    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │              Gecombineerde Grafiek                   ││
│  │  [1u] [24u] [7d] [30d] [Custom]                    ││
│  │  ───────────────────────────────                    ││
│  │  (Alle sensoren in één grafiek met dual y-assen)   ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────── Individuele Sensor Kaarten ──────────────┐│
│  │  pH Sensor — Grotere grafiek, controls, export      ││
│  │  EC Sensor — Grotere grafiek, controls, export      ││
│  │  Temp Sensor — Grotere grafiek, controls, export    ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 6.6 Sensor Card Redesign

De huidige `SensorCard` is functioneel maar moet visueel verbeterd worden:

**Huidige staat:** Alle controls (scale, tijdsbereik, thresholds, API key, curl voorbeeld) staan direct zichtbaar → onoverzichtelijk.

**Nieuw design:**
- **Hoofdweergave:** Sensor naam, laatste waarde (groot), status badge, mini-grafiek
- **Uitklapbaar:** Klik op kaart → uitgebrede view met volledige grafiek
- **Settings via modal/drawer:** Klik op ⚙️ → zijpaneel met: y-as instellingen, thresholds, API key, danger zone (reset/verwijder)
- **Export knop:** Download CSV van deze sensor

### 6.7 Landingspagina

De huidige landingspagina is te basic. Verbeter naar:
- Professionele hero met kort overzicht wat Measuremate is
- Features sectie (real-time data, alerts, kaartweergave, API)
- "Hoe het werkt" — 3 stappen (Account → Koppel device → Monitor)
- CTA: Account aanmaken / Inloggen
- Footer met links

### 6.8 Onboarding Flow

Voor nieuwe gebruikers, na eerste login:
1. "Welkom! Maak je eerste Measuremate aan" → naam + locatie
2. "Voeg een sensor toe" → naam + type + eenheid
3. "Koppel je device" → toon API key + curl voorbeeld + Arduino code
4. "Klaar! Je data verschijnt hier zodra je device data stuurt."

---

## 7. Nieuwe Features: Kaartweergave & Netwerk

### 7.1 Kaartpagina (Overzicht)

**Library:** Leaflet (met `react-leaflet`) of Mapbox GL JS

**Functionaliteit:**
- Kaart van Nederland/wereld gecentreerd op gebruikers Measuremates
- Elke Measuremate als marker met:
  - Kleur gebaseerd op status (groen = online, oranje = waarschuwing, rood = offline, grijs = geen locatie)
  - Popup bij klik: naam, laatste waarden per sensor, laatste update tijd
- Alleen Measuremates met lat/lng worden getoond
- Measuremates zonder locatie: toon bericht "Stel een locatie in om op de kaart te verschijnen"

### 7.2 Locatie Instellen

Bij aanmaken/bewerken van een Measuremate:
- **Optie 1:** Handmatige invoer van latitude/longitude
- **Optie 2:** Klik op kaart om locatie te kiezen (interactieve kaart-picker)
- **Optie 3:** Zoek adres (geocoding) — nice-to-have

### 7.3 Netwerk View (voor organisaties)

Als een gebruiker meerdere Measuremates met locatie heeft:
- Toon alle Measuremates op dezelfde kaart
- Kleurcodering per sensor-waarde op de kaart (bijv. pH-waarde als kleurschaal op de markers)
- Optie om te wisselen welke sensor-parameter de kleuring bepaalt
- Dit is essentieel voor het Blijdorp use-case: in één oogopslag zien waar watervervuiling het ergst is

---

## 8. Nieuwe Features: Data-analyse & Vergelijking

### 8.1 Vergelijkingspagina

**Doel:** Meerdere sensoren (van dezelfde of verschillende Measuremates) naast elkaar plotten.

**UI:**
- Multi-select: kies 2-6 sensoren uit een dropdown (gegroepeerd per Measuremate)
- Alle geselecteerde sensoren in **één grafiek** met:
  - Verschillende kleuren per sensor
  - Legenda met sensor naam + Measuremate naam
  - Optioneel: dual y-assen als eenheden verschillen (bijv. pH links, °C rechts)
- Tijdsbereik selector (1u, 24u, 7d, 30d, custom)
- Synchrone tijdsas (alle sensoren op dezelfde x-as)

### 8.2 Correlatie View (nice-to-have)

- Scatter plot van twee sensoren tegen elkaar (bijv. pH vs EC)
- Pearson correlatie coëfficiënt berekenen en tonen
- Nuttig voor het ontdekken van verbanden tussen parameters

### 8.3 Gecombineerde Grafiek per Measuremate

Op de Measuremate detail pagina: één overzichtsgrafiek met alle sensoren van die Measuremate. Dual y-assen ondersteunen (bijv. links: pH 0-14, rechts: temperatuur 0-40°C).

---

## 9. Nieuwe Features: Data Export

### 9.1 CSV Export

Per sensor of per Measuremate (alle sensoren):
- Knop: "Download CSV"
- Dialog: kies tijdsbereik (van-tot)
- Format: `timestamp, sensor_name, value, unit`
- Maximaal 100.000 records

### 9.2 JSON Export

Alternatief format voor ontwikkelaars:
```json
{
  "sensor": "pH Sensor",
  "measuremate": "Vijver Noord",
  "unit": "pH",
  "data": [
    { "timestamp": "2026-02-11T12:00:00Z", "value": 7.24 },
    ...
  ]
}
```

---

## 10. Nieuwe Features: Handmatige Metingen

### 10.1 Handmatige Invoer

Stakeholder-eis van Blijdorp: vergelijk automatische MeasureMate data met handmatig verzamelde metingen.

**UI:**
- Per sensor: knop "Handmatige meting toevoegen"
- Form: waarde + datum/tijd + optionele notitie
- Handmatige metingen worden als **andere marker** getoond in de grafiek (bijv. ronde punt i.p.v. lijn)

### 10.2 Grafiekweergave

- Automatische data: doorgetrokken lijn (zoals nu)
- Handmatige metingen: losse punten (dots) in een andere kleur
- Legenda: "Automatisch" vs "Handmatig"
- Tooltip: toon notitie bij hover over handmatig punt

---

## 11. Node Health & Status Monitoring

### 11.1 Status Indicators

Op elke Measuremate kaart en in de sidebar:
- 🟢 **Online:** Data ontvangen binnen verwacht interval
- 🟡 **Waarschuwing:** Data vertraagd (2-5× interval)
- 🔴 **Offline:** Geen data ontvangen (>5× interval)
- ⚪ **Onbekend:** Nog nooit data ontvangen

### 11.2 Status Overzicht

Bovenaan het dashboard een compact overzicht:
```
5 Measuremates | 4 Online | 1 Waarschuwing | 0 Offline
```

### 11.3 Offline Alerts (optioneel)

Email notificatie wanneer een Measuremate offline gaat (geen data meer ontvangt). Configureerbaar per Measuremate.

---

## 12. Performance & Schaalbaarheid

### 12.1 Database Optimalisaties

- **Indexen:** Zie sectie 4.5
- **Data retentie:** Overweeg een beleid voor oude data (bijv. >1 jaar → aggregeer naar daggemiddelden). Dit is optioneel maar belangrijk bij schaling.
- **Efficiënte queries:** Gebruik `SELECT` met specifieke kolommen, nooit `SELECT *` in productie

### 12.2 Frontend Optimalisaties

- **Lazy loading:** Laad sensor data pas als de SensorCard in beeld komt
- **Virtualisatie:** Als een Measuremate 10+ sensoren heeft, gebruik windowing
- **Debouncing:** Huidige 100ms debounce op realtime updates is goed
- **Caching:** De huidige 30 seconden cache logica behouden

### 12.3 API Optimalisaties

- **Pagination:** Alle list endpoints moeten paginatie ondersteunen
- **Batch endpoint:** Zie sectie 5.2 — één request voor meerdere sensoren

---

## 13. Technische Vereisten & Constraints

### 13.1 Must-have
- Next.js 15+ (App Router) met TypeScript
- Supabase voor database + auth + realtime
- Vercel voor hosting
- Tailwind CSS voor styling
- Chart.js of vergelijkbaar voor grafieken (mag vervangen worden door iets beters zoals Recharts als daar goede reden voor is)
- Responsive (desktop + tablet)

### 13.2 Aanbevolen Libraries
- **shadcn/ui** — Component library (Radix UI + Tailwind)
- **react-leaflet** — Kaartweergave
- **date-fns** — Datum formatting (al in gebruik)
- **Zod** — Runtime input validatie (voor API routes)

### 13.3 Niet gebruiken
- Geen zware frameworks bovenop Next.js (geen Redux, geen MobX — Supabase realtime + React state is voldoende)
- Geen externe analytics/tracking (privacy)
- Geen jQuery of legacy libraries

### 13.4 Code Kwaliteit
- TypeScript strict mode
- Alle API responses getypeerd
- Foutafhandeling in elke API route (nooit een onverwachte 500)
- Geen `any` types
- Consistent codeformat (Prettier + ESLint)

---

## 14. Prioriteiten

### P0 — Kritiek (moet eerst)
1. **Security fixes:** Debug routes verwijderen, metadata updaten, security headers
2. **Database uitbreidingen:** lat/lng, last_data_received_at, unit, sensor_type
3. **UI Redesign:** Sidebar navigatie, professioneel design, consistent design system (shadcn/ui)
4. **Sensor Card verbetering:** Settings in modal/drawer, cleaner layout

### P1 — Hoog (kernfunctionaliteit voor stage)
5. **Kaartweergave:** Leaflet kaart met Measuremate markers + status kleuren
6. **Locatie instellen:** Lat/lng invoer bij Measuremate aanmaken/bewerken
7. **Node status:** Online/offline/waarschuwing indicators
8. **Vergelijkingspagina:** Multi-sensor grafiek vergelijking
9. **Gecombineerde grafiek:** Alle sensoren van één Measuremate in één grafiek

### P2 — Gemiddeld (belangrijk maar niet blokkerend)
10. **Data export:** CSV + JSON download per sensor
11. **Handmatige metingen:** Invoer + weergave in grafiek
12. **Batch API:** `POST /api/sensor-data/batch` voor gateway bridge
13. **Onboarding flow:** Stapsgewijze setup voor nieuwe gebruikers
14. **API Docs pagina:** Inline documentatie

### P3 — Laag (nice-to-have)
15. **Correlatie view:** Scatter plot + Pearson correlatie
16. **Offline alerts:** Email bij node uitval
17. **Adres geocoding:** Zoek adres → lat/lng
18. **Rate limiting:** Geavanceerde rate limiting per endpoint
19. **Data retentie policy:** Automatische aggregatie oude data

---

## Appendix A: Huidige Database Schema (referentie)

```
measuremates
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── name (TEXT)
├── description (TEXT, nullable)
├── location (TEXT, nullable)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ, trigger)

sensors
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── measuremate_id (UUID, FK → measuremates)
├── name (TEXT)
├── api_key (TEXT, UUID v4)
├── scale (NUMBER, nullable)
├── scaleMin (NUMBER, nullable)
├── tijdScale (TEXT, nullable)
├── alert_threshold (NUMBER, nullable)
├── alert_lower_threshold (NUMBER, nullable)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

sensor_data
├── id (UUID, PK)
├── sensor_id (UUID, FK → sensors)
├── user_id (UUID, FK → auth.users)
├── timestamp (TIMESTAMPTZ)
├── value (DECIMAL)
└── created_at (TIMESTAMPTZ)

notifications
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── sensor_id (UUID, FK → sensors)
├── notification_type (TEXT)
├── email_sent_at (TIMESTAMPTZ)
├── threshold_value (DECIMAL)
├── sensor_value (DECIMAL)
└── created_at (TIMESTAMPTZ)
```

## Appendix B: Huidige API Routes (referentie)

| Route | Methode | Beschrijving | Auth |
|-------|---------|--------------|------|
| `/api/sensor-data` | POST | Data ingestie | Bearer API key |
| `/api/sensor-data` | GET | Data ophalen | User sessie |
| `/api/send-notification` | POST | Email alert (intern) | INTERNAL_API_KEY |
| `/api/health` | GET | Health check | Geen |
| `/api/admin-check` | GET | ⚠️ VERWIJDEREN | Hardcoded key |
| `/api/debug` | GET | ⚠️ VERWIJDEREN | Geen |
| `/api/check-sensors` | GET | ⚠️ VERWIJDEREN | Geen |
| `/api/test-threshold` | POST | ⚠️ VERWIJDEREN | Geen |

## Appendix C: Environment Variables (referentie)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
NOTIFICATIONAPI_CLIENT_ID=
NOTIFICATIONAPI_CLIENT_SECRET=
INTERNAL_API_KEY=
```
