# 🚀 Quick Start Guide - IoT Dashboard Platform

Deze guide helpt je om binnen 10 minuten je IoT Dashboard platform te laten werken!

## ✅ Wat je hebt bereikt tot nu toe

- ✅ Next.js project is opgezet
- ✅ Dependencies zijn geïnstalleerd
- ✅ Environment variables zijn geconfigureerd
- ✅ Development server draait op http://localhost:3000
- ✅ Alle componenten zijn aangemaakt

## 🔥 Laatste stappen om het volledig werkend te krijgen

### Stap 1: Database Setup (5 minuten)

1. **Open Supabase:**
   - Ga naar [supabase.com](https://supabase.com)
   - Log in met je account
   - Open je project: `mxqgnxtqusycuprmbfvt`

2. **Voer het setup script uit:**
   - Ga naar `SQL Editor` in je Supabase dashboard
   - Klik op `New Query`
   - Kopieer de volledige inhoud van `database-setup.sql`
   - Plak het in de SQL editor
   - Klik op `Run` (of druk Ctrl+Enter)

3. **Controleer de tabellen:**
   - Ga naar `Table Editor`
   - Je zou nu 2 tabellen moeten zien: `sensors` en `sensor_data`

### Stap 2: Test de Applicatie (3 minuten)

1. **Open je browser:**
   - Ga naar http://localhost:3000
   - Je zou de mooie landing page moeten zien

2. **Maak een account aan:**
   - Klik op "Account Aanmaken"
   - Vul je email en wachtwoord in
   - Check je email voor verificatie (mogelijk in spam)

3. **Log in:**
   - Ga terug naar http://localhost:3000
   - Klik op "Inloggen"
   - Vul je credentials in

4. **Test het dashboard:**
   - Je wordt automatisch doorgestuurd naar `/dashboard`
   - Klik op "Nieuwe Sensor"
   - Voeg een sensor toe met een naam zoals "Test Sensor"

### Stap 3: Test de API (2 minuten)

1. **Kopieer je API key:**
   - In het dashboard, bij je sensor, klik op "Tonen" bij de API Key
   - Klik op "Kopiëren"

2. **Test met het Node.js script:**
   ```bash
   node test-sensor-api.js JOUW_API_KEY_HIER 23.5
   ```

3. **Of test met Python:**
   ```bash
   python test_sensor_api.py JOUW_API_KEY_HIER 23.5
   ```

4. **Of test met curl:**
   ```bash
   curl -X POST http://localhost:3000/api/sensor-data \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer JOUW_API_KEY_HIER" \
     -d '{"value": 23.5}'
   ```

## 🎯 Wat je nu zou moeten zien

- ✅ Een werkende landing page
- ✅ Inlog/registratie functionaliteit
- ✅ Een dashboard met je sensoren
- ✅ Real-time grafieken van sensor data
- ✅ Werkende API endpoints
- ✅ API keys en voorbeeldcode

## 🔧 Als er iets mis gaat

### Development server problemen:
```bash
# Stop de server (Ctrl+C) en herstart:
npm run dev
```

### Database verbinding problemen:
- Controleer je `.env.local` bestand
- Zorg dat je Supabase URL en keys correct zijn
- Test de verbinding in Supabase dashboard

### Authenticatie problemen:
- Check je email voor verificatie
- Controleer Supabase Authentication instellingen
- Zorg dat je NEXTAUTH_SECRET is ingesteld

### API problemen:
- Controleer dat je database setup correct is uitgevoerd
- Test eerst de health endpoint: http://localhost:3000/api/health
- Controleer dat je API key correct is gekopieerd

## 🚀 Volgende stappen

### Lokale ontwikkeling:
- Voeg meer sensoren toe
- Test verschillende sensor waarden
- Bekijk de real-time updates

### Hardware integratie:
- Gebruik `examples/esp32_sensor_client.ino` voor ESP32
- Pas de WiFi credentials en API endpoint aan
- Upload naar je microcontroller

### Productie deployment:
- Volg `DEPLOYMENT.md` voor Vercel deployment
- Configureer productie Supabase project
- Update CORS settings

## 💡 Tips

- **Real-time updates:** Data wordt automatisch ververst in de dashboard
- **Multiple sensors:** Je kunt zoveel sensoren toevoegen als je wilt
- **Verschillende waarden:** Test met temperatuur, luchtvochtigheid, licht, etc.
- **API rate limits:** Supabase heeft gratis tier limits, upgrade indien nodig
- **Beveiliging:** Elke gebruiker ziet alleen zijn eigen data

## 🆘 Hulp nodig?

- Check de volledige `README.md` voor gedetailleerde informatie
- Bekijk `SUPABASE_SETUP.md` voor database troubleshooting
- Open een issue op GitHub als je vastzit

---

**Je IoT Dashboard Platform is klaar! 🎉**

Veel plezier met het bouwen van je IoT projecten!
