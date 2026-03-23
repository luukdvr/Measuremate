# Changelog — Platform Upgrade (feb 2026)

> Dit document beschrijft **alle wijzigingen** die zijn doorgevoerd als onderdeel van de PLATFORM_UPGRADE_SPEC.md implementatie.
> Bedoeld als bron voor het bijwerken van de projectdocumentatie.

---

## Inhoudsopgave

1. [Overzicht](#1-overzicht)
2. [Verwijderde bestanden](#2-verwijderde-bestanden)
3. [Nieuwe bestanden](#3-nieuwe-bestanden)
4. [Gewijzigde bestanden](#4-gewijzigde-bestanden)
5. [Database migratie](#5-database-migratie)
6. [Nieuwe dependencies](#6-nieuwe-dependencies)
7. [API wijzigingen](#7-api-wijzigingen)
8. [Frontend architectuur](#8-frontend-architectuur)
9. [Design system](#9-design-system)
10. [Nog handmatig uit te voeren](#10-nog-handmatig-uit-te-voeren)

---

## 1. Overzicht

De upgrade implementeert de volledige PLATFORM_UPGRADE_SPEC.md specificatie (secties 3–12), georganiseerd in prioriteiten P0–P2:

| Categorie | Spec-sectie | Status |
|-----------|-------------|--------|
| Beveiligingsverbeteringen | §3 | ✅ Afgerond |
| Database uitbreidingen | §4 | ✅ Afgerond (SQL klaar, moet gerund worden) |
| API uitbreidingen | §5 | ✅ Afgerond |
| UI/UX Redesign | §6 | ✅ Afgerond |
| Kaartweergave | §7 | ✅ Afgerond |
| Data-analyse & vergelijking | §8 | ✅ Afgerond |
| Data export | §9 | ✅ Afgerond |
| Handmatige metingen | §10 | ✅ Afgerond |
| Node health monitoring | §11 | ✅ Afgerond |
| Performance indexes | §12 | ✅ Afgerond (in migration SQL) |

---

## 2. Verwijderde bestanden

### API routes (onveilige debug-endpoints — spec §3.1)

| Bestand | Reden |
|---------|-------|
| `src/app/api/admin-check/route.ts` | Debug route, geen auth, exposeerde user-data |
| `src/app/api/debug/route.ts` | Debug route, exposeerde interne state |
| `src/app/api/check-sensors/route.ts` | Debug route zonder autorisatie |
| `src/app/api/test-threshold/route.ts` | Debug route zonder autorisatie |

### Oude componenten (vervangen door nieuwe dashboard-componenten)

| Bestand | Vervangen door |
|---------|---------------|
| `src/components/DashboardClient.tsx` | Nieuwe dashboard pagina's + `DashboardShell.tsx` |
| `src/components/MeasuremateSelector.tsx` | Sidebar in `DashboardShell.tsx` |
| `src/components/SensorCard.tsx` | `src/components/dashboard/SensorCardNew.tsx` |
| `src/components/SensorForm.tsx` | `src/components/dashboard/SensorFormNew.tsx` |

---

## 3. Nieuwe bestanden

### Database

| Bestand | Beschrijving |
|---------|-------------|
| `database-migration.sql` | SQL migratie: nieuwe kolommen, tabellen, indexes (zie §5) |

### Utility

| Bestand | Beschrijving |
|---------|-------------|
| `src/lib/utils.ts` | `cn()` helper — combineert `clsx` + `tailwind-merge` voor conditionele CSS classes |

### Dashboard layout

| Bestand | Beschrijving |
|---------|-------------|
| `src/app/dashboard/layout.tsx` | Server component: auth check, haalt measuremates op, wikkelt children in `DashboardShell` |
| `src/components/dashboard/DashboardShell.tsx` | Hoofd layout component met sidebar, topbar, dark mode toggle, DashboardContext provider |

### Dashboard pagina's

| Bestand | Route | Beschrijving |
|---------|-------|-------------|
| `src/app/dashboard/page.tsx` | `/dashboard` | Overzicht: statuskaarten (online/warning/offline), measuremate grid met create/delete, onboarding |
| `src/app/dashboard/measuremate/[id]/page.tsx` | `/dashboard/measuremate/:id` | Detail pagina: sensor lijst, inline editing van properties |
| `src/app/dashboard/map/page.tsx` | `/dashboard/map` | Kaartweergave met Leaflet (dynamic import, SSR disabled) |
| `src/app/dashboard/compare/page.tsx` | `/dashboard/compare` | Multi-sensor vergelijking: tijdbereik selector, max 6 sensoren, kleurcodering |
| `src/app/dashboard/settings/page.tsx` | `/dashboard/settings` | Account info, API keys overzicht per measuremate, tonen/kopiëren/regenereren |
| `src/app/dashboard/api-docs/page.tsx` | `/dashboard/api-docs` | Inline API documentatie met endpoint specs, curl voorbeelden, Arduino code |

### Dashboard componenten

| Bestand | Beschrijving |
|---------|-------------|
| `src/components/dashboard/MeasuremateDetail.tsx` | Detail view: status badge, locatie, inline editing (naam, beschrijving, lat/lng), sensor lijst |
| `src/components/dashboard/SensorCardNew.tsx` | Herontworpen sensorkaart: grote waarde, tijdbereik selector, alerts, uitklapbare grafiek, settings panel, handmatige metingen formulier |
| `src/components/dashboard/SensorFormNew.tsx` | Sensor aanmaak formulier met type-presets (temperature, pH, EC, etc.) en automatische unit |
| `src/components/dashboard/MapView.tsx` | Leaflet map met kleur-gecodeerde markers per node status, popups met details |

### API endpoints

| Bestand | Route | Methode | Beschrijving |
|---------|-------|---------|-------------|
| `src/app/api/export/route.ts` | `/api/export` | GET | Data export als CSV of JSON, met datumbereik filtering, auth vereist, max 100.000 records |
| `src/app/api/sensor-data/batch/route.ts` | `/api/sensor-data/batch` | POST | Bulk insert tot 100 items per request, Bearer token auth |

---

## 4. Gewijzigde bestanden

### `next.config.ts`
- **Wat:** Security headers toegevoegd (spec §3.2)
- **Headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### `src/app/layout.tsx`
- **Wat:** Metadata bijgewerkt, taal gewijzigd
- **Details:**
  - `lang="nl"` (was `"en"`)
  - Titel: `"Measuremate — Sensordata Platform"`
  - Description bijgewerkt
  - OpenGraph metadata toegevoegd
  - `suppressHydrationWarning` op `<html>` (voor dark mode toggle)

### `src/app/page.tsx`
- **Wat:** Volledig herschreven — professionele landing page (spec §6.1)
- **Details:**
  - Sticky navigatiebalk
  - Hero sectie met gradient
  - 6 feature cards (Real-time Data, Grafieken, Kaart, Alerts, Veilig, Multi-Sensor)
  - 3-stappen "hoe het werkt" sectie
  - CTA sectie
  - Footer met PULSAQUA branding

### `src/app/globals.css`
- **Wat:** Volledig nieuw design system (spec §6.2)
- **Details:**
  - CSS custom properties: `--background`, `--foreground`, `--surface`, `--border`, `--primary`, `--primary-light`, `--secondary`, `--success`, `--warning`, `--danger`, `--muted`, `--sidebar-width`
  - Dark mode varianten via `.dark` class
  - Custom scrollbar styling
  - Leaflet CSS fixes

### `src/types/database.ts`
- **Wat:** Volledig herschreven met nieuwe schema types (spec §4)
- **Nieuwe velden Measuremate:** `latitude`, `longitude`, `last_data_received_at`
- **Nieuwe velden Sensor:** `unit`, `sensor_type`
- **Nieuwe tabel type:** `ManualMeasurement` (id, sensor_id, user_id, value, timestamp, notes, created_at)
- **Nieuwe helpers:** `NodeStatus` type (`'online' | 'warning' | 'offline' | 'unknown'`), `getNodeStatus()` functie, `statusConfig` object met label/color/dotColor/bgColor per status

### `src/app/api/sensor-data/route.ts`
- **Wat:** Beveiligingsfix + node status ondersteuning (spec §3.1, §5.1, §11)
- **Wijzigingen:**
  1. `debugInfo` object verwijderd uit POST response
  2. Na succesvolle insert: update `measuremates.last_data_received_at` met timestamp
  3. Debug `console.log` statements verwijderd uit threshold check functie
  4. GET endpoint: `select('*')` → `select('id, sensor_id, value, timestamp')` (expliciete kolommen)

### `src/components/SensorChart.tsx`
- **Wat:** Ondersteuning voor handmatige metingen als scatter punten (spec §10.2)
- **Nieuwe prop:** `manualData?: { timestamp: string; value: number; notes?: string | null }[]`
- **Weergave:** Groene dots (radius 6) naast de automatische lijn
- **Legenda:** Toont "Waarde" vs "Handmatig" wanneer er manual data is
- **Tooltip:** Toont `"Handmatig: {value} — {notes}"` bij hover over handmatige punten

---

## 5. Database migratie

Bestand: `database-migration.sql` — moet handmatig gerund worden in Supabase SQL Editor.

### Nieuwe kolommen

| Tabel | Kolom | Type | Default | Doel |
|-------|-------|------|---------|------|
| `measuremates` | `latitude` | `DECIMAL` | `NULL` | GPS breedtegraad voor kaart |
| `measuremates` | `longitude` | `DECIMAL` | `NULL` | GPS lengtegraad voor kaart |
| `measuremates` | `last_data_received_at` | `TIMESTAMPTZ` | `NULL` | Laatste data ontvangst, gebruikt voor node status berekening |
| `sensors` | `unit` | `TEXT` | `''` | Eenheid (bijv. °C, pH, µS/cm) |
| `sensors` | `sensor_type` | `TEXT` | `''` | Type sensor (temperature, pH, EC etc.) |

### Nieuwe tabel: `manual_measurements`

| Kolom | Type | Nullable | Beschrijving |
|-------|------|----------|-------------|
| `id` | `UUID` | PK | Auto-generated |
| `sensor_id` | `UUID` | NOT NULL | FK → sensors.id (CASCADE delete) |
| `user_id` | `UUID` | NOT NULL | FK → auth.users.id (CASCADE delete) |
| `value` | `DECIMAL` | NOT NULL | Gemeten waarde |
| `timestamp` | `TIMESTAMPTZ` | NOT NULL | Meetmoment (default: now()) |
| `notes` | `TEXT` | NULL | Optionele notitie |
| `created_at` | `TIMESTAMPTZ` | NULL | Aanmaakdatum (default: now()) |

**RLS:** Ingeschakeld. Policy: "Users can manage own manual measurements" — `auth.uid() = user_id` voor alle operaties.

### Nieuwe indexes

| Index | Tabel | Kolommen | Doel |
|-------|-------|----------|------|
| `idx_sensor_data_sensor_timestamp` | `sensor_data` | `(sensor_id, timestamp DESC)` | Snellere queries per sensor |
| `idx_sensor_data_timestamp` | `sensor_data` | `(timestamp DESC)` | Snellere tijdgebaseerde queries |
| `idx_manual_measurements_sensor_id` | `manual_measurements` | `(sensor_id)` | FK lookup |
| `idx_manual_measurements_timestamp` | `manual_measurements` | `(sensor_id, timestamp DESC)` | Tijdgebaseerde queries |

---

## 6. Nieuwe dependencies

```
npm install zod lucide-react clsx tailwind-merge class-variance-authority \
  react-leaflet leaflet @types/leaflet \
  @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs \
  @radix-ui/react-tooltip @radix-ui/react-slot @radix-ui/react-select @radix-ui/react-switch
```

| Package | Versie | Doel |
|---------|--------|------|
| `zod` | ^3.x | Schema validatie |
| `lucide-react` | ^0.x | Icon library (vervangt ad-hoc SVGs) |
| `clsx` | ^2.x | Conditionele class namen |
| `tailwind-merge` | ^3.x | Tailwind class deduplicatie |
| `class-variance-authority` | ^0.x | Component variant systeem |
| `react-leaflet` | ^5.x | React bindings voor Leaflet (niet direct gebruikt — MapView gebruikt pure Leaflet API) |
| `leaflet` | ^1.x | Interactieve kaarten |
| `@types/leaflet` | ^1.x | TypeScript types voor Leaflet |
| `@radix-ui/react-dialog` | ^1.x | Toegankelijke dialog/modal |
| `@radix-ui/react-dropdown-menu` | ^2.x | Dropdown menu |
| `@radix-ui/react-tabs` | ^1.x | Tab componenten |
| `@radix-ui/react-tooltip` | ^1.x | Tooltip |
| `@radix-ui/react-slot` | ^1.x | Slot pattern voor componenten |
| `@radix-ui/react-select` | ^2.x | Toegankelijke select |
| `@radix-ui/react-switch` | ^1.x | Toggle switch |

---

## 7. API wijzigingen

### Verwijderde endpoints

| Endpoint | Methode | Reden |
|----------|---------|-------|
| `/api/admin-check` | GET | Onveilig — geen auth |
| `/api/debug` | GET | Onveilig — exposeerde interne data |
| `/api/check-sensors` | GET | Onveilig — geen auth |
| `/api/test-threshold` | POST | Onveilig — geen auth |

### Gewijzigde endpoints

#### `POST /api/sensor-data`
- **Verwijderd:** `debugInfo` in response body
- **Toegevoegd:** Na succesvolle insert → update `measuremates.last_data_received_at`
- **Response ongewijzigd:** `{ success: true, data: { id, sensor_id, sensor_name, value, timestamp } }`

#### `GET /api/sensor-data`
- **Gewijzigd:** Query selecteert nu `id, sensor_id, value, timestamp` i.p.v. `*`

### Nieuwe endpoints

#### `GET /api/export`
- **Auth:** Supabase sessie (cookie-based)
- **Parameters:**
  - `sensor_id` (required) — UUID van sensor
  - `from` (optional) — ISO 8601 startdatum
  - `to` (optional) — ISO 8601 einddatum
  - `format` (optional) — `csv` (default) of `json`
  - `limit` (optional) — max records (cap: 100.000)
- **Response CSV:** `Content-Type: text/csv`, `Content-Disposition: attachment`
- **Response JSON:** `{ sensor: { id, name, unit, type }, count, data: [{ value, timestamp }] }`

#### `POST /api/sensor-data/batch`
- **Auth:** Bearer token (sensor API key)
- **Body:** `{ data: [{ value: number, timestamp?: string }] }` — max 100 items
- **Response (201):** `{ success: true, inserted: number }`
- **Side effect:** Update `measuremates.last_data_received_at`

---

## 8. Frontend architectuur

### Routing structuur (nieuw)

```
/                           → Landing page (professioneel, publiek)
/auth/signin                → Inloggen
/auth/signup                → Registreren
/dashboard                  → Overzicht (status cards, measuremate grid)
/dashboard/measuremate/:id  → Detail pagina (sensors, editing)
/dashboard/map              → Leaflet kaartweergave
/dashboard/compare          → Multi-sensor vergelijking
/dashboard/settings         → Account & API keys
/dashboard/api-docs         → Inline API documentatie
```

### DashboardContext

Gedeeld via `DashboardShell.tsx`, beschikbaar via `useDashboard()` hook:

```typescript
interface DashboardContextType {
  user: User
  measuremates: Measuremate[]
  selectedMeasuremate: Measuremate | null
  setSelectedMeasuremate: (m: Measuremate | null) => void
  refreshMeasuremates: () => Promise<void>
}
```

### Sidebar navigatie

Vaste items:
- Overzicht (`/dashboard`)
- Kaart (`/dashboard/map`)
- Vergelijken (`/dashboard/compare`)
- Instellingen (`/dashboard/settings`)
- API Docs (`/dashboard/api-docs`)

Collapsible measuremates lijst met status-dots (groen/oranje/rood/grijs).

### Dark mode

- Toggle in topbar
- Gebaseerd op CSS `.dark` class op `<html>`
- Opgeslagen in `localStorage`
- CSS variabelen wisselen automatisch

### Node status logica

Gedefinieerd in `src/types/database.ts`:

```typescript
type NodeStatus = 'online' | 'warning' | 'offline' | 'unknown'

function getNodeStatus(lastDataReceivedAt: string | null): NodeStatus
// null → 'unknown'
// < 5 minuten geleden → 'online'
// 5–60 minuten geleden → 'warning'
// > 60 minuten geleden → 'offline'
```

Status kleuren: groen (#22c55e), amber (#f59e0b), rood (#ef4444), grijs (#94a3b8).

### Leaflet kaart (MapView.tsx)

- **Pure Leaflet** implementatie (geen react-leaflet JSX)
- OpenStreetMap tiles
- Cirkelmarkers met kleur per status
- Popup: naam, status, locatie, laatste update, link "Details bekijken"
- Auto-fit bounds naar alle markers
- Dynamic import in `map/page.tsx` met `ssr: false`

### Handmatige metingen (SensorCardNew.tsx)

- "+" knop in card header opent inline formulier
- Velden: waarde (required), datum/tijd (optioneel), notitie (optioneel)
- Opslaan in `manual_measurements` tabel via Supabase client
- Getoond als groene dots in SensorChart

---

## 9. Design system

### CSS variabelen (globals.css)

| Variabele | Light | Dark |
|-----------|-------|------|
| `--background` | `#ffffff` | `#0f172a` |
| `--foreground` | `#0f172a` | `#f8fafc` |
| `--surface` | `#f8fafc` | `#1e293b` |
| `--border` | `#e2e8f0` | `#334155` |
| `--primary` | `#1e40af` | `#3b82f6` |
| `--primary-light` | `#3b82f6` | `#60a5fa` |
| `--secondary` | `#0d9488` | `#14b8a6` |
| `--success` | `#16a34a` | `#22c55e` |
| `--warning` | `#d97706` | `#f59e0b` |
| `--danger` | `#dc2626` | `#ef4444` |
| `--muted` | `#94a3b8` | `#64748b` |
| `--sidebar-width` | `280px` | `280px` |

### Utility functie

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

### Icons

Alle icons via `lucide-react`. Veelgebruikte icons:
`Activity`, `Settings`, `MapPin`, `BarChart3`, `Download`, `Plus`, `Trash2`, `Eye`, `EyeOff`, `Copy`, `Bell`, `Wifi`, `WifiOff`, `AlertTriangle`, `ChevronDown`, `ChevronUp`, `X`, `GitCompareArrows`, `Key`, `RefreshCw`

---

## 10. Nog handmatig uit te voeren

| Actie | Prioriteit | Details |
|-------|-----------|---------|
| Database migratie uitvoeren | **P0** | Run `database-migration.sql` in Supabase SQL Editor |
| `NEXT_PUBLIC_SITE_URL` env var | P1 | Nodig voor notification systeem (al bestaande functionaliteit) |
| P3 features | Laag | Correlatie-analyse, geocoding API, rate limiting, data retention — niet geïmplementeerd |

---

## Bestandsoverzicht (complete structuur na upgrade)

```
src/
├── middleware.ts                          (ongewijzigd)
├── app/
│   ├── globals.css                       (▲ herschreven — design system)
│   ├── layout.tsx                        (▲ gewijzigd — metadata, lang=nl)
│   ├── page.tsx                          (▲ herschreven — landing page)
│   ├── api/
│   │   ├── export/route.ts              (★ nieuw — data export)
│   │   ├── health/route.ts              (ongewijzigd)
│   │   ├── send-notification/route.ts   (ongewijzigd)
│   │   └── sensor-data/
│   │       ├── route.ts                 (▲ gewijzigd — security + last_data_received_at)
│   │       └── batch/route.ts           (★ nieuw — bulk insert)
│   ├── auth/
│   │   ├── callback/route.ts            (ongewijzigd)
│   │   ├── signin/page.tsx              (ongewijzigd)
│   │   └── signup/page.tsx              (ongewijzigd)
│   └── dashboard/
│       ├── layout.tsx                   (★ nieuw — auth wrapper)
│       ├── page.tsx                     (▲ herschreven — overzicht)
│       ├── api-docs/page.tsx            (★ nieuw)
│       ├── compare/page.tsx             (★ nieuw)
│       ├── map/page.tsx                 (★ nieuw)
│       ├── measuremate/[id]/page.tsx    (★ nieuw)
│       └── settings/page.tsx            (★ nieuw)
├── components/
│   ├── SensorChart.tsx                  (▲ gewijzigd — manual data support)
│   └── dashboard/
│       ├── DashboardShell.tsx           (★ nieuw — layout + context)
│       ├── MapView.tsx                  (★ nieuw — Leaflet kaart)
│       ├── MeasuremateDetail.tsx        (★ nieuw — detail component)
│       ├── SensorCardNew.tsx            (★ nieuw — sensor kaart)
│       └── SensorFormNew.tsx            (★ nieuw — sensor formulier)
├── lib/
│   ├── utils.ts                         (★ nieuw — cn helper)
│   └── supabase/
│       ├── client.ts                    (ongewijzigd)
│       └── server.ts                    (ongewijzigd)
└── types/
    └── database.ts                      (▲ herschreven — nieuw schema)
```

Legenda: ★ = nieuw bestand, ▲ = gewijzigd, ✕ = verwijderd (niet in boom)
