## Measuremate

Een end-to-end IoT-temperatuurdashboard. Arduino-apparaten sturen DS18B20-metingen via HTTPS naar een Next.js API, die de data in Supabase opslaat en live grafieken toont met drempels en tijdsbereik-instellingen.

Productie: https://measuremate.vercel.app/
Repository: https://github.com/luukdvr/Measuremate

### Stack
- Frontend/API: Next.js (TypeScript), Tailwind, Chart.js via react-chartjs-2
- Database: Supabase (Postgres + RLS)
- Hosting: Vercel (serverless API-routes)
- Devices: Arduino UNO R4 WiFi, ESP32 (DS18B20-sensor)

## Architectuuroverzicht
- **Multi-tenant hiërarchie**: Elk account kan meerdere "Measuremates" hebben (bijv. verschillende locaties), en elke Measuremate kan meerdere sensors bevatten.
- POST /api/sensor-data ontvangt metingen met een per-sensor API-sleutel (Authorization: Bearer <key>). De API gebruikt server-side de Supabase service role om RLS te omzeilen voor inserts.
- De UI toont eerst Measuremate-selectie, dan per sensor een live grafiek met:
  - Vaste y-as schaal (max: scale, min: scaleMin)
  - Tijdsbereiken met bucketting; toont de laatste meting per bucket
  - Boven-/ondergrens drempels als gestippelde lijnen en banners
- Realtime: abonneert op nieuwe inserts voor directe UI-updates.

## Datamodel (Supabase)
- **measuremates** (nieuw!)
  - id, user_id, name, description, location
  - created_at, updated_at
- **sensors** (uitgebreid)
  - id, user_id, **measuremate_id** (foreign key), name, api_key
  - scale (number|null), scaleMin (number|null)
  - tijdScale (string|null)
  - alert_threshold (number|null), alert_lower_threshold (number|null)
  - created_at, updated_at
- **sensor_data** (ongewijzigd)
  - id, sensor_id, user_id, timestamp, value, created_at

Zie database-setup.sql voor schema/migraties en MEASUREMATE_MIGRATION.md voor upgrade-instructies.## Omgevingsvariabelen
Maak .env.local aan (zie ook .env.local.example):
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY  (alleen server-side; nooit naar de browser lekken)
- NEXT_PUBLIC_SITE_URL       (bijv. https://measuremate.vercel.app)
- **NOTIFICATIONAPI_CLIENT_ID**    (voor email notificaties)
- **NOTIFICATIONAPI_CLIENT_SECRET** (voor email notificaties)
- **INTERNAL_API_KEY**              (beveiligt interne notification API)

Beveiliging: roteer SUPABASE_SERVICE_ROLE_KEY als deze ooit is blootgesteld en werk de Vercel-omgevingen bij.

## Email Notificaties
Het systeem stuurt automatisch email alerts wanneer sensor waarden drempelwaardes overschrijden:
- **Spam preventie**: Maximaal 1 email per gebruiker per 30 minuten
- **Service**: Gebruikt NotificationAPI voor betrouwbare email delivery
- **Templates**: Configureerbare email templates via NotificationAPI dashboard
- **Real-time**: Controles gebeuren bij elke sensor data upload

### Configuratie Email Service
1. Maak een account bij [NotificationAPI](https://www.notificationapi.com)
2. Maak een nieuw project aan
3. Kopieer je Client ID en Client Secret uit het dashboard
4. Voeg `NOTIFICATIONAPI_CLIENT_ID` en `NOTIFICATIONAPI_CLIENT_SECRET` toe aan environment variables
5. Configureer een notification template met ID `sensor_threshold_alert` in het dashboard

## Lokaal draaien
Vereisten: Node 18+, npm

```cmd
npm install
npm run dev
```

De app draait op http://localhost:3000. Zorg dat je Supabase-variabelen naar een geldig project verwijzen.

## API
- Health check: GET /api/health → 200 met JSON
- Ingestie: POST /api/sensor-data
	- Headers: Authorization: Bearer <sensor_api_key>
	- Body JSON: { "value": number }  // timestamp optioneel; server kan deze zetten

Voorbeeld (Windows cmd):
```cmd
curl -X POST https://measuremate.vercel.app/api/sensor-data ^
	-H "Authorization: Bearer YOUR_SENSOR_API_KEY" ^
	-H "Content-Type: application/json" ^
	-d "{\"value\": 23.8}"
```

## Arduino-integratie
Bestanden:
- arduino_temperature_uno_r4.ino – UNO R4 WiFi + DS18B20 met WiFiSSLClient naar HTTPS
- arduino_temperature_esp32.ino – ESP32-variant
- ARDUINO_SETUP.md – Bedrading en uploadnotities

UNO R4 WiFi specifics:
- Server: measuremate.vercel.app, poort: 443, pad: /api/sensor-data
- Headers: Host (zonder :443), Content-Type, Authorization: Bearer <api_key>
- Installeer SSL-certificaten op het board: Tools → WiFiS3 Firmware Updater → SSL Certificates → voeg measuremate.vercel.app toe → Upload certificates
- DS18B20 op pin 4 met 4.7kΩ pull-up naar VCC

ESP32 specifics:
- Gebruik WiFiClientSecure/HTTPClient met een HTTPS-URL; stel tijdelijk Insecure in of configureer de juiste root CA

## Frontend
Belangrijkste componenten:
- SensorCard: haalt data op, realtime abonnement, controls voor scale, scaleMin, tijdScale en drempels; slaat op in de sensors-tabel.
- SensorChart: lijngrafiek met gaps, harde y-min/max, gestippelde drempellijnen.

## Deployment
- Vercel-project gekoppeld aan deze repo; zie DEPLOYMENT.md.
- Zet env vars in Vercel → Project Settings → Environment Variables.

## Huidige status
- Werkend: ingestie-API met service role, grafiek met tijdsbereiken en drempels, SSR-veilige UI.
- Openstaand: zorg dat de UNO R4 SSL-certificaten heeft en via HTTPS kan verbinden; roteer service key indien gelekt.
- Nice-to-haves: notificaties (email/push) bij drempel, extra tijdsbereiken, betere leegtoestanden.

## Nuttige scripts
- test-api.bat – eenvoudige health/ingest-tests
- test-sensor-api.js / test_sensor_api.py – kleine scripts om metingen te sturen

## Waar verdergaan
1) Bevestig device-connectiviteit (UNO R4: SSL-cert + HTTPS naar measuremate.vercel.app:443).
2) Roteer SUPABASE_SERVICE_ROLE_KEY en werk Vercel bij indien nodig.
3) Breid alerting uit (server-side triggers/cron) en voeg tests toe rond bucket-aggregatie.

## Measuremate

An end-to-end IoT temperature dashboard. Arduino devices send DS18B20 readings over HTTPS to a Next.js API, which stores data in Supabase and renders live charts with thresholds and time-range controls.

Production: https://measuremate.vercel.app/

### Stack
- Frontend/API: Next.js (TypeScript), Tailwind, Chart.js via react-chartjs-2
- Database: Supabase (Postgres + RLS)
- Hosting: Vercel (serverless API routes)
- Devices: Arduino UNO R4 WiFi, ESP32 (DS18B20 sensor)

## Architecture overview
- POST /api/sensor-data ingests readings using a per-sensor API key (Authorization: Bearer <key>). The API uses the Supabase service role server-side to bypass RLS for inserts.
- Client UI shows a live chart per sensor with:
	- Fixed y-axis scale (max: scale, min: scaleMin)
	- Time ranges with bucketing; renders the last reading per bucket
	- Upper/lower alert thresholds as dashed lines and banners
- Realtime: subscribes to new inserts for an immediate UI update.

## Data model (Supabase)
- sensors
	- id, user_id, name, api_key
	- scale (number|null), scaleMin (number|null)
	- tijdScale (string|null)
	- alert_threshold (number|null), alert_lower_threshold (number|null)
	- created_at, updated_at
- sensor_data
	- id, sensor_id, user_id, timestamp, value, created_at

See SUPABASE_SETUP.md and database-setup.sql for schema details/migrations.

## Environment variables
Create .env.local:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY  (server-only; never exposed to the browser)
- NEXT_PUBLIC_SITE_URL       (e.g., https://measuremate.vercel.app)

Security note: rotate the SUPABASE_SERVICE_ROLE_KEY if it was ever exposed during development, and update Vercel envs.

## Run locally
Prereqs: Node 18+, npm

```cmd
npm install
npm run dev
```

The app runs on http://localhost:3000. Ensure your Supabase env vars point to a valid project.

## API
- Health check: GET /api/health → 200 with JSON
- Ingest: POST /api/sensor-data
	- Headers: Authorization: Bearer <sensor_api_key>
	- Body JSON: { "value": number }  // timestamp optional, server can set it

Example (Windows cmd):
```cmd
curl -X POST https://measuremate.vercel.app/api/sensor-data ^
	-H "Authorization: Bearer YOUR_SENSOR_API_KEY" ^
	-H "Content-Type: application/json" ^
	-d "{\"value\": 23.8}"
```

## Arduino integration
Files:
- arduino_temperature_uno_r4.ino – UNO R4 WiFi + DS18B20 using WiFiSSLClient to HTTPS
- arduino_temperature_esp32.ino – ESP32 variant
- ARDUINO_SETUP.md – Wiring and upload notes

UNO R4 WiFi specifics:
- Use server: measuremate.vercel.app, port: 443, path: /api/sensor-data
- Headers include: Host (without :443), Content-Type, Authorization: Bearer <api_key>
- Install SSL certs on the board: Tools → WiFiS3 Firmware Updater → SSL Certificates → add measuremate.vercel.app → Upload certificates
- Keep DS18B20 on pin 4 with a 4.7kΩ pull-up to VCC

ESP32 specifics:
- Use WiFiClientSecure/HTTPClient with HTTPS URL; set Insecure or proper root CA in development

## Frontend
Main components:
- SensorCard: fetches data, realtime subscription, controls for scale, scaleMin, tijdScale, alert thresholds; persists to sensors table.
- SensorChart: line chart with span gaps, hard y min/max, dashed threshold lines.

## Deployment
Voor production deployment op Vercel:

### 1. Database Setup
Voer de database migraties uit in Supabase SQL Editor:
```sql
-- Run the contents of database-setup.sql
-- Dit voegt measuremates table, notifications table en can_send_notification() functie toe
```

### 2. Environment Variables in Vercel
Ga naar Project Settings → Environment Variables en voeg toe:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NOTIFICATIONAPI_CLIENT_ID` (voor email notificaties)
- `NOTIFICATIONAPI_CLIENT_SECRET` (voor email notificaties)
- `INTERNAL_API_KEY` (beveiligt notification API)

### 3. Email Service Setup
1. Registreer bij [NotificationAPI](https://www.notificationapi.com)
2. Maak een nieuw project aan in het dashboard
3. Kopieer Client ID en Client Secret uit Project Settings
4. Voeg credentials toe als environment variables
5. Configureer notification template met ID `sensor_threshold_alert`:
   - Subject: `🚨 Sensor Alert: {{sensorName}} {{thresholdTypeText}} {{exceedsText}}`
   - Body: Gebruik merge tags zoals `{{measuremateName}}`, `{{currentValue}}`, `{{thresholdValue}}`, etc.
6. Test email verzending met een sensor threshold alert

### 4. Deploy & Test
- Push naar GitHub triggert automatisch Vercel deployment
- Test de complete flow: Arduino → sensor data → threshold → email alert
- Controleer spam preventie: max 1 email per 30 minuten per gebruiker

Zie ook DEPLOYMENT.md voor gedetailleerde instructies.

## Current status
- Working: ingestion API with service role, chart with time ranges and thresholds, SSR-safe UI.
- Pending ops: ensure UNO R4 has SSL cert uploaded; verify HTTPS connection from device; rotate service key if exposed.
- Nice-to-haves: notifications (email/push) on threshold, more ranges, better empty-state UX.

## Useful scripts
- test-api.bat – simple health/ingest tests
- test-sensor-api.js / test_sensor_api.py – small scripts to send readings

## Where to continue
1) Confirm device connectivity (UNO R4: SSL cert + HTTPS to measuremate.vercel.app:443).
2) Rotate SUPABASE_SERVICE_ROLE_KEY and update Vercel if needed.
3) Extend alerting (server-side triggers/cron) and add tests around bucket aggregation.

