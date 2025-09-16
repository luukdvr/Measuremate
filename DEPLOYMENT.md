# Deployment Guide - Measuremate

Deze guide helpt je bij het deployen van Measuremate met de nieuwe email notification funcionaliteit.

## Prerequisites

- Werkende Supabase project
- Vercel account gekoppeld aan GitHub repository
- NotificationAPI account voor email service

## Stap 1: Database Migraties

### 1.1 Run Database Setup
Open Supabase SQL Editor en voer uit:

```sql
-- Voer de volledige inhoud van database-setup.sql uit
-- Dit bevat:
-- - measuremates table
-- - notifications table voor spam preventie
-- - can_send_notification() functie
-- - Updated RLS policies
-- - CASCADE DELETE constraints
```

### 1.2 Verificatie
Controleer of de nieuwe tabellen zijn aangemaakt:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('measuremates', 'notifications');
```

## Stap 2: Email Service Setup

### 2.1 NotificationAPI Account
1. Ga naar [NotificationAPI](https://www.notificationapi.com) en maak een account
2. Verifieer je email adres
3. Maak een nieuw project aan in het dashboard

### 2.2 API Credentials
1. Ga naar Project Settings in het NotificationAPI dashboard
2. Kopieer je **Client ID** en **Client Secret**
3. Bewaar deze veilig voor environment variables

### 2.3 Template Configuration
1. Ga naar Notifications in het dashboard
2. Maak een nieuwe notification aan met ID: `sensor_threshold_alert`
3. Configureer de email template:
   
   **Subject:**
   ```
   🚨 Sensor Alert: {{sensorName}} {{thresholdTypeText}} {{exceedsText}}
   ```
   
   **Body (HTML):**
   ```html
   <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
     <h1>🚨 Sensor Alert</h1>
     <p><strong>Measuremate:</strong> {{measuremateName}}</p>
     <p><strong>Sensor:</strong> {{sensorName}}</p>
     <p><strong>Huidige waarde:</strong> {{currentValue}}</p>
     <p><strong>Drempelwaarde:</strong> {{thresholdValue}}</p>
     <p><strong>Tijd:</strong> {{alertTime}}</p>
     <p><a href="{{dashboardUrl}}">Ga naar dashboard</a></p>
   </div>
   ```

4. Test de template met sample data

### 2.4 Test Email Setup
Test lokaal of de email service werkt:
```bash
curl -X POST http://localhost:3000/api/send-notification \
  -H "Content-Type: application/json" \
  -H "x-internal-key: your_internal_api_key" \
  -d '{
    "userEmail": "test@example.com",
    "sensorName": "Test Sensor",
    "currentValue": 25.5,
    "threshold": 20.0,
    "thresholdType": "upper"
  }'
```

## Stap 3: Environment Variables

### 3.1 Vercel Dashboard
Ga naar Vercel → Project Settings → Environment Variables

### 3.2 Voeg toe (alle environments: Production, Preview, Development):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
NOTIFICATIONAPI_CLIENT_ID=your_client_id
NOTIFICATIONAPI_CLIENT_SECRET=your_client_secret
INTERNAL_API_KEY=secure_random_string_here
```

### 3.3 Genereer Internal API Key
Voor beveiliging van de notification API:
```bash
# Genereer een secure random string
openssl rand -hex 32
```

## Stap 4: Deployment

### 4.1 Push naar GitHub
```bash
git add .
git commit -m "Add email notifications with spam prevention"
git push origin main
```

### 4.2 Vercel Auto-Deploy
- Vercel detecteert automatisch de push
- Build process start (controleer logs voor errors)
- Deployment URL wordt gegenereerd

### 4.3 Verificatie Build
Controleer Vercel Function Logs voor:
- ✅ Database connectie succesvol
- ✅ Email service geïnitialiseerd
- ✅ API routes accessible

## Stap 5: Testing

### 5.1 Test Complete Flow
1. **Login** op de live app
2. **Maak een Measuremate** aan via de UI
3. **Voeg een sensor** toe met alert thresholds
4. **Verstuur test data** via Arduino of curl:
   ```bash
   curl -X POST https://your-app.vercel.app/api/sensor-data \
     -H "Authorization: Bearer YOUR_SENSOR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"value": 999}'  # Value that exceeds threshold
   ```
5. **Controleer email** inbox voor alert notification

### 5.2 Test Spam Prevention
1. Verstuur meerdere threshold-overschrijdende waarden
2. Controleer dat je maximaal 1 email per 30 minuten ontvangt
3. Bekijk Vercel logs voor "Rate limit reached" berichten

### 5.3 Test Verschillende Scenarios
- **Upper threshold**: Waarde boven alert_threshold
- **Lower threshold**: Waarde onder alert_lower_threshold
- **Multiple sensors**: Verschillende sensors per Measuremate
- **Multiple Measuremates**: Per account

## Stap 6: Monitoring

### 6.1 Vercel Functions
Monitor in Vercel Dashboard → Functions:
- `/api/sensor-data` - Sensor data ingestion
- `/api/send-notification` - Email service

### 6.2 Supabase Database
Monitor in Supabase Dashboard:
- `sensor_data` table voor nieuwe metingen
- `notifications` table voor email spam tracking

### 6.3 NotificationAPI Dashboard
Monitor email delivery rates, open rates en template performance

## Troubleshooting

### Email Niet Verzonden
1. **Check NotificationAPI Credentials**: Client ID en Secret correct gekopieerd?
2. **Check Environment Variables**: Alle keys aanwezig in Vercel?
3. **Check Template**: Notification template `sensor_threshold_alert` bestaat?
4. **Check Logs**: Vercel Function logs voor error details
5. **Test Internal API**: Correct `INTERNAL_API_KEY` gebruikt?

### Database Errors
1. **RLS Policies**: Service role key heeft juiste permissions?
2. **Foreign Keys**: Measuremate bestaat voordat sensor wordt aangemaakt?
3. **Migrations**: Alle nieuwe tabellen correct gecreëerd?

### Rate Limiting Issues
1. **Check Timezone**: Timestamps correct in UTC?
2. **Function Logic**: `can_send_notification()` werkt correct?
3. **Database Cleanup**: Oude notification records opruimen indien nodig

## Rollback Plan

Als er problemen zijn na deployment:

### 1. Revert Code
```bash
git revert HEAD
git push origin main
```

### 2. Database Rollback
```sql
-- Alleen indien nodig, backup eerst!
DROP TABLE IF EXISTS notifications;
DROP FUNCTION IF EXISTS can_send_notification(UUID);
-- Verwijder measuremate_id column uit sensors (complexer)
```

### 3. Environment Variables
Verwijder oude env vars uit Vercel indien nodig (RESEND_API_KEY).

## Success Criteria

✅ **Database**: Measuremates en notifications tabellen bestaan  
✅ **Email Service**: Test email succesvol verzonden  
✅ **Spam Prevention**: Rate limiting werkt (max 1 per 30 min)  
✅ **UI**: Measuremate selector en delete functionaliteit werken  
✅ **Real-time**: Threshold alerts triggeren automatisch emails  
✅ **Arduino**: Sensor data upload naar nieuwe hierarchische structuur  

Congratulations! Je Measuremate applicatie draait nu met volledige email notification ondersteuning. 🎉