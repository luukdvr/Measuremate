# Measuremate — Volledige Projectdocumentatie

> Laatste update: februari 2026
> Repo: https://github.com/luukdvr/Measuremate
> Productie: https://measuremate.vercel.app/

---

## 1. Samenvatting

**Measuremate** is een end-to-end IoT-dataplatform gebouwd met Next.js, Supabase en Vercel. Arduino-apparaten (UNO R4 WiFi, ESP32) sturen sensormetingen (bijv. DS18B20 temperatuur) via HTTPS naar een serverless API. De data wordt opgeslagen in een Postgres-database (Supabase) en live weergegeven in een webdashboard met grafieken, drempels en email-alerts.

### Kernfeatures
- **Multi-tenant hiërarchie**: Account → Measuremates (locaties/groepen) → Sensors → Sensor Data
- **Real-time dashboard** met Chart.js grafieken, configureerbare y-as, tijdsbereiken en drempellijnen
- **API-key geauthenticeerde data-ingestie** via `POST /api/sensor-data`
- **Email notificaties** bij drempeloverschrijding (via NotificationAPI) met spam-preventie (max 1 per 30 min/gebruiker)
- **Supabase Auth** met email/wachtwoord authenticatie, Row Level Security (RLS)
- **Vercel deployment** met serverless API-routes en auto-deploy vanuit GitHub

---

## 2. Tech Stack

| Laag | Technologie | Versie |
|------|-------------|--------|
| **Framework** | Next.js (App Router) | 15.4.3 |
| **Taal** | TypeScript | ^5 |
| **UI** | React | 19.1.0 |
| **Styling** | Tailwind CSS | ^4 |
| **Grafieken** | Chart.js + react-chartjs-2 | ^4.5.0 / ^5.3.0 |
| **Datum formatting** | date-fns | ^4.1.0 |
| **Database** | Supabase (Postgres + RLS) | supabase-js ^2.52.1 |
| **Auth** | Supabase Auth (@supabase/ssr) | ^0.6.1 |
| **Email** | NotificationAPI (node-server-sdk) | ^2.5.1 |
| **UUID generatie** | uuid | ^11.1.0 |
| **Hosting** | Vercel (serverless) | — |
| **Build** | Turbopack (`next dev --turbopack`) | — |
| **Linting** | ESLint + next/core-web-vitals | ^9 |
| **Hardware** | Arduino UNO R4 WiFi, ESP32 | — |

---

## 3. Projectstructuur (mappenweergave)

```
dataplatform/
├── src/
│   ├── app/
│   │   ├── globals.css                    # Tailwind import + CSS variabelen (light/dark)
│   │   ├── layout.tsx                     # Root layout (Geist fonts, HTML shell)
│   │   ├── page.tsx                       # Landingspagina (redirect naar /dashboard als ingelogd)
│   │   ├── api/
│   │   │   ├── sensor-data/route.ts       # ★ HOOFD-API: POST ingestie + GET ophalen
│   │   │   ├── send-notification/route.ts # Interne API voor email alerts
│   │   │   ├── health/route.ts            # Health check endpoint
│   │   │   ├── check-sensors/route.ts     # Debug: sensors oplijsten/zoeken op API key
│   │   │   ├── debug/route.ts             # Debug: database connectie testen
│   │   │   ├── admin-check/route.ts       # Debug: admin view met service role
│   │   │   └── test-threshold/route.ts    # Debug: drempel-logica testen
│   │   ├── auth/
│   │   │   ├── signin/page.tsx            # Inlogpagina
│   │   │   ├── signup/page.tsx            # Registratiepagina
│   │   │   └── callback/route.ts          # OAuth callback (email verificatie)
│   │   └── dashboard/
│   │       └── page.tsx                   # Dashboard (server component, auth check)
│   ├── components/
│   │   ├── DashboardClient.tsx            # Client-side dashboard orchestratie
│   │   ├── MeasuremateSelector.tsx        # Measuremate kiezer/aanmaken/verwijderen
│   │   ├── SensorCard.tsx                 # ★ Sensor kaart: data, grafiek, controls, realtime
│   │   ├── SensorChart.tsx                # Chart.js lijn-grafiek component
│   │   └── SensorForm.tsx                 # Formulier voor nieuwe sensor aanmaken
│   ├── lib/supabase/
│   │   ├── client.ts                      # Browser Supabase client (anon key)
│   │   └── server.ts                      # Server Supabase client (anon key + cookies)
│   ├── types/
│   │   └── database.ts                    # TypeScript types voor alle tabellen
│   └── middleware.ts                      # Auth middleware (beschermt /dashboard, redirect /auth)
├── examples/                              # Arduino voorbeelden + simulators
│   ├── arduino_temperature_uno_r4.ino
│   ├── arduino_temperature_esp32.ino
│   ├── arduino_temperature_uno.ino
│   ├── arduino_flowmeter_wifi.ino
│   ├── arduino_flowmeter_4g.ino
│   ├── esp32_sensor_client.ino
│   ├── temperature_simulator.js           # Node.js test simulator
│   └── flowmeter_simulator.js             # Node.js test simulator
├── database-setup.sql                     # ★ Volledige database migratie SQL
├── package.json
├── next.config.ts                         # Next.js config (momenteel leeg)
├── tsconfig.json                          # TypeScript config (bundler module resolution)
├── eslint.config.mjs                      # ESLint flat config
├── postcss.config.mjs                     # PostCSS (Tailwind)
├── DEPLOYMENT.md                          # Deployment handleiding
├── MEASUREMATE_MIGRATION.md               # Measuremate tabel migratie-instructies
└── README.md                              # Project README
```

---

## 4. Datamodel (Supabase Postgres)

### 4.1 Tabel: `measuremates`
Groepeert sensors per locatie/doel. Elke gebruiker kan meerdere Measuremates hebben.

| Kolom | Type | Beschrijving |
|-------|------|------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK → auth.users) | Eigenaar |
| `name` | TEXT | Naam (bijv. "Thuis", "Kas 1") |
| `description` | TEXT (nullable) | Optionele beschrijving |
| `location` | TEXT (nullable) | Optionele locatie |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto (trigger) |

### 4.2 Tabel: `sensors`
Individuele sensoren, elk met een unieke API-key.

| Kolom | Type | Beschrijving |
|-------|------|------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK → auth.users) | Eigenaar |
| `measuremate_id` | UUID (FK → measuremates, NOT NULL) | Bovenliggende Measuremate |
| `name` | TEXT | Sensornaam |
| `api_key` | TEXT | Unieke UUID v4 API-key voor data-ingestie |
| `scale` | NUMBER (nullable) | Max y-as waarde in grafiek |
| `scaleMin` | NUMBER (nullable) | Min y-as waarde in grafiek |
| `tijdScale` | TEXT (nullable) | Standaard tijdsbereik (bijv. "60m", "1d") |
| `alert_threshold` | NUMBER (nullable) | Bovengrens drempelwaarde |
| `alert_lower_threshold` | NUMBER (nullable) | Ondergrens drempelwaarde |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

### 4.3 Tabel: `sensor_data`
Individuele metingen.

| Kolom | Type | Beschrijving |
|-------|------|------------|
| `id` | UUID (PK) | Auto-generated |
| `sensor_id` | UUID (FK → sensors) | Bijbehorende sensor |
| `user_id` | UUID (FK → auth.users) | Eigenaar |
| `timestamp` | TIMESTAMPTZ | Moment van meting |
| `value` | DECIMAL | Gemeten waarde |
| `created_at` | TIMESTAMPTZ | Auto |

### 4.4 Tabel: `notifications`
Houdt verstuurde email alerts bij voor spam-preventie.

| Kolom | Type | Beschrijving |
|-------|------|------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK → auth.users) | Ontvanger |
| `sensor_id` | UUID (FK → sensors) | Betreffende sensor |
| `notification_type` | TEXT | "threshold_upper" of "threshold_lower" |
| `email_sent_at` | TIMESTAMPTZ | Tijdstip van verzending |
| `threshold_value` | DECIMAL | Drempelwaarde |
| `sensor_value` | DECIMAL | Waarde die drempel overschreed |
| `created_at` | TIMESTAMPTZ | Auto |

### 4.5 Database-functies
- **`can_send_notification(p_user_id UUID) → BOOLEAN`**: Controleert of de laatste notificatie voor een gebruiker >30 minuten geleden was. Wordt aangeroepen door de notification API.
- **`update_updated_at_column()` trigger**: Zet `updated_at` automatisch bij elke UPDATE op `measuremates`.

### 4.6 Row Level Security (RLS)
Alle tabellen hebben RLS ingeschakeld:
- **measuremates**: Users kunnen alleen hun eigen measuremates zien/aanmaken/wijzigen/verwijderen
- **sensors**: Idem via `user_id`
- **sensor_data**: Idem via `user_id`
- **notifications**: Users kunnen hun eigen notificaties lezen; systeem (service role) kan inserts doen

### 4.7 CASCADE DELETE
- `measuremates` verwijderen → verwijdert automatisch alle gekoppelde `sensors`
- `sensors` verwijderen → verwijdert automatisch alle gekoppelde `sensor_data`
- `auth.users` verwijderen → cascade naar alles

### 4.8 Indexen
- `idx_measuremates_user_id` op `measuremates(user_id)`
- `idx_sensors_measuremate_id` op `sensors(measuremate_id)`
- `idx_notifications_user_id`, `idx_notifications_sensor_id`, `idx_notifications_email_sent_at`

---

## 5. Authenticatie & Beveiliging

### 5.1 Supabase Auth
- **Methode**: Email + wachtwoord (geen OAuth providers momenteel)
- **Signup flow**: Gebruiker registreert → ontvangt verificatie-email → klikt link → callback route wisselt code voor sessie
- **Sessie**: Cookie-based via `@supabase/ssr`; middleware refresht sessies automatisch

### 5.2 Middleware (`src/middleware.ts`)
- **Beschermt `/dashboard/*`**: Redirect naar `/auth/signin` als niet ingelogd
- **Redirect `/auth/*`**: Naar `/dashboard` als al ingelogd
- **Matcher**: Sluit `_next/static`, `_next/image`, favicon en afbeeldingen uit

### 5.3 Supabase Clients
Er zijn **drie** manieren waarop Supabase wordt aangeroepen:

1. **Browser client** (`lib/supabase/client.ts`): Gebruikt `createBrowserClient` met anon key. Voor UI-interacties.
2. **Server client** (`lib/supabase/server.ts`): Gebruikt `createServerClient` met anon key + cookies. Voor Server Components en auth-checks.
3. **Service role client** (inline in API routes): Gebruikt `createClient` van `@supabase/supabase-js` met `SUPABASE_SERVICE_ROLE_KEY`. **Omzeilt RLS** — wordt gebruikt voor:
   - Sensor data ingestie (device kent geen user sessie)
   - User email ophalen voor notificaties
   - Spam-preventie checks

### 5.4 API Authenticatie
- **Sensor data ingestie** (`POST /api/sensor-data`): Bearer token = de per-sensor `api_key` (UUID). Geen user sessie nodig.
- **Notification API** (`POST /api/send-notification`): Bearer token = `INTERNAL_API_KEY` environment variable. Alleen intern aangeroepen door sensor-data route.

---

## 6. API Routes (Volledig overzicht)

### 6.1 `POST /api/sensor-data` — Sensor Data Ingestie ★
**De belangrijkste endpoint.** Hier sturen Arduino's/devices hun metingen naartoe.

| Aspect | Detail |
|--------|--------|
| **Auth** | `Authorization: Bearer <sensor_api_key>` |
| **Body** | `{ "value": number, "timestamp"?: string }` |
| **Timestamp** | Optioneel; server zet `new Date().toISOString()` als niet meegegeven |
| **Response 201** | `{ success: true, data: { id, sensor_id, sensor_name, value, timestamp } }` |
| **Response 401** | Missende/ongeldige Authorization header of API key |
| **Response 400** | `value` is geen nummer |
| **Response 500** | Database insert error |

**Flow:**
1. Valideer Authorization header (Bearer scheme)
2. Parse body, valideer `value` is een nummer
3. Maak service role Supabase client
4. Zoek sensor op basis van `api_key` (incl. measuremate naam, thresholds)
5. Insert record in `sensor_data` tabel
6. **Threshold check**: Als sensor drempels heeft en de waarde overschrijdt:
   - Haal user email op via `auth.admin.getUserById()`
   - Stuur interne request naar `/api/send-notification`
7. Return success response

### 6.2 `GET /api/sensor-data` — Sensor Data Ophalen
Debug/optioneel endpoint.

| Param | Beschrijving |
|-------|-------------|
| `sensor_id` (required) | UUID van de sensor |
| `limit` (optional) | Max records (default 50) |

Gebruikt de **server client** (met user sessie), dus RLS is actief.

### 6.3 `POST /api/send-notification` — Email Alert Verzenden
Intern endpoint, aangeroepen door de sensor-data route.

| Aspect | Detail |
|--------|--------|
| **Auth** | `Authorization: Bearer <INTERNAL_API_KEY>` |
| **Body** | `{ userId, sensorId, sensorName, measuremateName, currentValue, thresholdValue, thresholdType, userEmail }` |
| **Spam check** | Roept `can_send_notification()` DB-functie aan |
| **Response 429** | Rate limited (max 1 email per 30 min per user) |
| **Email** | Via NotificationAPI SDK → template `sensor_threshold_alert` |
| **DB logging** | Slaat notificatie op in `notifications` tabel |

### 6.4 `GET /api/health` — Health Check
Simpele JSON response: `{ message, timestamp, version }`. Nuttig voor uptime monitoring.

### 6.5 Debug/Admin Routes (niet voor productie)
- `GET /api/check-sensors` — List sensors of zoek op API key
- `GET /api/debug` — Test database connectie, toon sample data
- `GET /api/admin-check` — Admin view met hardgecodeerde test API key (service role)
- `POST /api/test-threshold` — Simuleert threshold check met vaste drempel van 30

> **Let op**: De debug/admin routes bevatten geen sterke authenticatie en zijn bedoeld voor development. Overweeg ze te verwijderen of te beveiligen voor productie.

---

## 7. Frontend Componenten (Gedetailleerd)

### 7.1 `page.tsx` (Landingspagina — `/`)
- Server Component
- Als de user ingelogd is → redirect naar `/dashboard`
- Toont hero sectie met "Account Aanmaken" en "Inloggen" knoppen
- Features grid: Real-time Data, Veilig & Privé, Eenvoudige API

### 7.2 `dashboard/page.tsx` (Dashboard — `/dashboard`)
- Server Component
- Auth check: niet ingelogd → redirect `/auth/signin`
- Fetcht alle sensors van de user (server-side)
- Rendert `<DashboardClient>` met user en initial sensors

### 7.3 `DashboardClient.tsx`
Client component dat het hele dashboard orchestreert:

- **State**: selectedMeasuremate, sensors, filteredSensors, showForm
- **Measuremate filtering**: Wanneer een Measuremate geselecteerd wordt, filtert sensors op `measuremate_id`
- **Layout**:
  1. Navigatiebalk (welkomstbericht, uitlog-knop)
  2. `<MeasuremateSelector>` — kies of maak een Measuremate
  3. Sensor header met "Nieuwe Sensor" knop
  4. `<SensorForm>` (conditioneel zichtbaar)
  5. Grid van `<SensorCard>` componenten
  6. Lege state als geen Measuremate geselecteerd

### 7.4 `MeasuremateSelector.tsx`
- Laadt alle measuremates van de user bij mount
- Auto-selecteert de eerste measuremate
- Grid van klikbare kaarten (geselecteerd = blauwe rand)
- "Nieuwe Measuremate" formulier met naam, beschrijving, locatie
- Delete-knop per measuremate (met bevestigingsvenster, incl. waarschuwing over cascade delete)

### 7.5 `SensorCard.tsx` ★ (Meest complexe component)
Verantwoordelijk voor alles rondom één sensor:

**Data ophalen & realtime:**
- Haalt sensor_data op bij mount (`fetchSensorData`)
- Data limit is afhankelijk van tijdsbereik (100-2000 records)
- Subscribe op Supabase Realtime channel per sensor (INSERT + DELETE events)
- Debounced updates (100ms) om UI-flickering te voorkomen
- Cache-logica: skip fetch als <30 seconden geleden + zelfde timeRange

**Configureerbare controls (opgeslagen in sensors tabel):**
- **Max y-as** (`scale`) — input field, slaat op bij blur
- **Min y-as** (`scaleMin`) — input field, slaat op bij blur
- **Tijdsbereik** (`tijdScale`) — dropdown: 1 min, 5 min, 60 min, 1 dag, 1 week, 1 maand
- **Alert bovengrens** (`alert_threshold`) — input field, slaat op bij blur
- **Alert ondergrens** (`alert_lower_threshold`) — input field, slaat op bij blur

**Alert banners:**
- Rode banner als laatste waarde ≥ bovengrens
- Oranje banner als laatste waarde ≤ ondergrens
- Melding over email notificatie in banner

**Acties:**
- Reset data (verwijder alle metingen van deze sensor, met bevestiging + database verificatie)
- Verwijder sensor (incl. data)
- Toon/verberg API key
- Kopieer API key / endpoint URL
- Curl voorbeeld (uitklapbaar)

**Data aggregatie (`aggregateForRange()`):**
De functie verdeelt het tijdsvenster in buckets en toont de laatste meting per bucket:

| Tijdsbereik | Venster | Buckets | Bucket grootte |
|------------|---------|---------|---------------|
| 1 min | 60s | 30 | 2s |
| 5 min | 5m | 30 | 10s |
| 60 min | 1h | 60 | 1m |
| 1 dag | 24h | 48 | 30m |
| 1 week | 7d | 28 | 6h |
| 1 maand | 30d | 30 | 1d |

Buckets zonder data krijgen `value: null` → `spanGaps: true` in de grafiek zorgt ervoor dat lijnen worden doorgetrokken.

### 7.6 `SensorChart.tsx`
Chart.js `<Line>` component:
- Sorteert data chronologisch
- Configureerbare y-as (min/max)
- X-as format afhankelijk van tijdsbereik (HH:mm:ss, HH:mm, dd/MM HH:mm, dd/MM)
- Threshold lijnen: gestippelde horizontale lijnen (rood voor bovengrens, oranje voor ondergrens)
- Tooltip: datum in dd/MM/yyyy HH:mm format, waarde met 2 decimalen
- Geen punten zichtbaar (radius: 0), hover radius: 0, hitRadius: 8
- Tension: 0.4 (afgeronde lijnen)
- Locale: `nl` (date-fns)

### 7.7 `SensorForm.tsx`
Eenvoudig formulier voor nieuwe sensor:
- Input: naam (verplicht) en schaal/max y-as (verplicht)
- Genereert automatisch UUID v4 als `api_key`
- Insert via Supabase client (RLS actief, user moet ingelogd zijn)

### 7.8 Auth pagina's
- **`/auth/signin`**: Email/wachtwoord login → redirect naar dashboard
- **`/auth/signup`**: Email/wachtwoord/bevestig → Supabase signUp → "check je email" bericht
- **`/auth/callback`**: Wisselt auth code voor sessie na email verificatie

---

## 8. Email Notificatie Systeem

### 8.1 Hoe het werkt (flow)
```
Arduino POST /api/sensor-data (waarde: 85, drempel: 80)
    ↓
sensor-data route: insert data → checkThresholdsAndNotify()
    ↓
85 > 80 (bovengrens overschreden)
    ↓
Haal user email op via Supabase Admin API
    ↓
POST /api/send-notification (intern, met INTERNAL_API_KEY)
    ↓
Check can_send_notification() → true (>30 min sinds laatste)
    ↓
NotificationAPI SDK → email verzonden
    ↓
Insert record in notifications tabel (spam tracking)
```

### 8.2 Configuratie NotificationAPI
1. Account aanmaken op https://www.notificationapi.com
2. Project aanmaken in dashboard
3. Client ID + Client Secret kopiëren
4. Notification template aanmaken met ID: `sensor_threshold_alert`
5. Template merge tags: `{{sensorName}}`, `{{measuremateName}}`, `{{currentValue}}`, `{{thresholdValue}}`, `{{thresholdTypeText}}`, `{{exceedsText}}`, `{{alertTime}}`, `{{dashboardUrl}}`

### 8.3 Spam preventie
- Database functie `can_send_notification()` checkt of laatste email >30 minuten geleden was
- Bij rate limit: API retourneert 429
- Notificatie records worden opgeslagen in `notifications` tabel

---

## 9. Omgevingsvariabelen

Maak een `.env.local` bestand aan in de root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Site URL
NEXT_PUBLIC_SITE_URL=https://measuremate.vercel.app   # of http://localhost:3000 lokaal

# Email Notificaties (NotificationAPI)
NOTIFICATIONAPI_CLIENT_ID=your_client_id
NOTIFICATIONAPI_CLIENT_SECRET=your_client_secret

# Interne API beveiliging
INTERNAL_API_KEY=secure_random_string_hier
```

| Variabele | Scope | Beschrijving |
|-----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous key (veilig voor browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Alleen server** | Omzeilt RLS. **NOOIT naar client lekken!** |
| `NEXT_PUBLIC_SITE_URL` | Client + Server | Base URL van de app |
| `NOTIFICATIONAPI_CLIENT_ID` | Server | NotificationAPI credentials |
| `NOTIFICATIONAPI_CLIENT_SECRET` | Server | NotificationAPI credentials |
| `INTERNAL_API_KEY` | Server | Beveiligt de interne notification API |

**Beveiligingsnota**: Als `SUPABASE_SERVICE_ROLE_KEY` ooit is blootgesteld, roteer deze onmiddellijk in Supabase dashboard en update Vercel environment variables.

---

## 10. Lokaal Ontwikkelen

### Vereisten
- Node.js 18+
- npm
- Een Supabase project (gratis tier werkt)

### Setup
```bash
# Clone de repo
git clone https://github.com/luukdvr/Measuremate.git
cd Measuremate

# Installeer dependencies
npm install

# Maak .env.local aan (zie sectie 9)

# Start development server (met Turbopack)
npm run dev
```

De app draait op http://localhost:3000.

### Database opzetten
1. Ga naar je Supabase dashboard → SQL Editor
2. Voer de volledige inhoud van `database-setup.sql` uit
3. Dit creëert alle tabellen, RLS policies, triggers, indexes en de notification-functie

### Scripts
| Commando | Beschrijving |
|----------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Productie build |
| `npm run start` | Start productie server |
| `npm run lint` | ESLint check |

---

## 11. Deployment (Vercel)

### Huidige setup
- Vercel project is gekoppeld aan de GitHub repo
- Push naar `main` triggert automatische deployment
- Serverless API-routes draaien als Vercel Functions

### Stappen voor nieuwe deployment
1. **Database**: Run `database-setup.sql` in Supabase SQL Editor
2. **Environment Variables**: Stel alle variabelen in via Vercel → Project Settings → Environment Variables (voor Production, Preview én Development)
3. **NotificationAPI**: Configureer template `sensor_threshold_alert`
4. **Push**: `git push origin main` → auto-deploy

Zie `DEPLOYMENT.md` voor gedetailleerde stap-voor-stap instructies.

---

## 12. Arduino/Device Integratie

### Hoe devices data versturen
Elk device stuurt een HTTPS POST naar `/api/sensor-data` met:
- Header: `Authorization: Bearer <api_key_van_sensor>`
- Header: `Content-Type: application/json`
- Body: `{"value": 23.5}`

### Voorbeeldcode (curl)
```bash
curl -X POST https://measuremate.vercel.app/api/sensor-data \
  -H "Authorization: Bearer YOUR_SENSOR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"value": 23.8}'
```

### Arduino UNO R4 WiFi
- Gebruikt `WiFiSSLClient` voor HTTPS
- Server: `measuremate.vercel.app`, poort 443, pad `/api/sensor-data`
- **SSL certificaten**: Moeten geïnstalleerd worden op het board!
  - Tools → WiFiS3 Firmware Updater → SSL Certificates → voeg `measuremate.vercel.app` toe → Upload
- DS18B20 sensor op pin 4 met 4.7kΩ pull-up weerstand naar VCC

### ESP32
- Gebruikt `WiFiClientSecure` + `HTTPClient`
- HTTPS URL direct bruikbaar
- Optie: `setInsecure()` voor development, of configureer root CA voor productie

### Voorbeeldbestanden
- `examples/arduino_temperature_uno_r4.ino` — UNO R4 WiFi + DS18B20
- `examples/arduino_temperature_esp32.ino` — ESP32 variant
- `examples/arduino_temperature_uno.ino` — Klassieke UNO
- `examples/arduino_flowmeter_wifi.ino` — Flowmeter via WiFi
- `examples/arduino_flowmeter_4g.ino` — Flowmeter via 4G
- `examples/esp32_sensor_client.ino` — ESP32 generieke client
- `examples/temperature_simulator.js` — Node.js test simulator
- `examples/flowmeter_simulator.js` — Node.js flow test simulator

### Productie Arduino sketch
- `measuremate_production.ino` — Productie-klare sketch in de root

---

## 13. TypeScript Types

Alle database types zijn gedefinieerd in `src/types/database.ts`:

```typescript
// Hoofd types (Row = data uit DB)
export type Measuremate   // id, user_id, name, description, location, created_at, updated_at
export type Sensor        // id, user_id, measuremate_id, name, api_key, scale, scaleMin, tijdScale, alert_threshold, alert_lower_threshold, ...
export type SensorData    // id, sensor_id, user_id, timestamp, value, created_at
export type Notification  // id, user_id, sensor_id, notification_type, email_sent_at, threshold_value, sensor_value, ...

// Insert types (optionele velden)
export type NewMeasuremate
export type NewSensor
export type NewSensorData
export type NewNotification

// Database interface volgt Supabase schema conventie
export interface Database { public: { Tables: { ... } } }
```

---

## 14. Realtime Updates (Supabase Channels)

Elke `SensorCard` opent een Supabase Realtime channel:

```typescript
supabase
  .channel(`sensor-data-${sensor.id}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_data', filter: `sensor_id=eq.${sensor.id}` }, callback)
  .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'sensor_data', filter: `sensor_id=eq.${sensor.id}` }, callback)
  .subscribe()
```

- **INSERT**: Debounced toevoeging aan lokale state (100ms)
- **DELETE**: Bij enkele record → filter uit state; bij bulk → volledige refetch
- Channel wordt unsubscribed bij component unmount

---

## 15. Bekende Issues & Openstaande Punten

### Huidig werkend
- ✅ Volledige data-ingestie pipeline (device → API → DB → realtime UI)
- ✅ Multi-tenant: Measuremates → Sensors hiërarchie
- ✅ Configureerbare grafieken (y-as, tijdsbereik, drempels)
- ✅ Email alerts bij drempeloverschrijding
- ✅ Spam preventie (30 min cooldown)
- ✅ Supabase Auth met RLS
- ✅ Vercel deployment met auto-deploy

### Aandachtspunten
- ⚠️ Debug routes (`/api/admin-check`, `/api/debug`, `/api/check-sensors`, `/api/test-threshold`) zijn niet beveiligd — overweeg verwijdering of authenticatie
- ⚠️ `layout.tsx` metadata is nog default ("Create Next App") — moet geüpdatet worden
- ⚠️ SSL certificaten op Arduino UNO R4 moeten handmatig geïnstalleerd worden
- ⚠️ `admin-check` route bevat een hardgecodeerde test API key

### Mogelijke verbeteringen
- 📌 Meer sensor types ondersteunen (niet alleen temperatuur)
- 📌 Data export (CSV/JSON)
- 📌 Meerdere gebruikers per Measuremate (team access)
- 📌 Push notificaties (naast email)
- 📌 Server-side cron voor periodieke threshold checks
- 📌 Betere leegtoestanden/onboarding UX
- 📌 Unit tests en integratie tests
- 📌 Dark mode verbeteren (deels aanwezig via tailwind dark: classes)

---

## 16. Belangrijke Codepatronen

### Supabase Service Role Client (inline creatie)
In API routes waar RLS omzeild moet worden:
```typescript
const { createClient: createServiceClient } = await import('@supabase/supabase-js')
const supabaseService = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

### Path alias
`@/*` is geconfigureerd als `./src/*` in tsconfig.json. Gebruik altijd `@/components/...`, `@/lib/...`, `@/types/...`.

### Sensor settings persistentie
Alle sensor-instellingen (scale, scaleMin, tijdScale, alert_threshold, alert_lower_threshold) worden direct bij `onBlur` opgeslagen in de database via de Supabase client.

---

## 17. Snel Referentie: Veelvoorkomende Taken

| Taak | Hoe |
|------|-----|
| Nieuwe sensor type toevoegen | Voeg velden toe aan `sensors` tabel + `database.ts` + UI |
| API endpoint toevoegen | Maak `src/app/api/<naam>/route.ts` |
| Component toevoegen | Maak `src/components/<Naam>.tsx` |
| Database wijzigen | Update `database-setup.sql` + run in Supabase SQL Editor + update `database.ts` |
| Email template wijzigen | NotificationAPI dashboard → template `sensor_threshold_alert` |
| Drempel cooldown aanpassen | Wijzig `'30 minutes'` in `can_send_notification()` functie |
| Nieuw tijdsbereik toevoegen | Voeg case toe in `aggregateForRange()`, `xFormatForRange()` en `getDataLimit()` in SensorCard |
| Environment variable toevoegen | `.env.local` lokaal + Vercel dashboard voor productie |

---

## 18. Contact & Repo

- **Repository**: https://github.com/luukdvr/Measuremate
- **Productie URL**: https://measuremate.vercel.app
- **Supabase Dashboard**: Via je Supabase account
- **Vercel Dashboard**: Via je Vercel account
- **NotificationAPI Dashboard**: Via je NotificationAPI account
