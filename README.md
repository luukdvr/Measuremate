# 🌐 IoT Dashboard Platform

Een volledig functioneel IoT dashboard platform gebouwd met **Next.js**, **Supabase**, en **Chart.js**. Dit platform stelt gebruikers in staat om IoT sensoren te beheren, real-time data te verzamelen en visualiseren in interactieve grafieken.

## ✨ Features

- 🔐 **Multi-user authenticatie** met Supabase Auth
- 📊 **Real-time data visualisatie** met Chart.js
- 🛡️ **Beveiligde API endpoints** met unieke API keys per sensor
- 🎯 **Sensor management** - CRUD operaties voor sensoren
- 📱 **Responsive design** met Tailwind CSS
- ⚡ **Real-time updates** via Supabase subscriptions
- 🔒 **Row Level Security (RLS)** voor data isolatie

## 🚀 Aan de slag

### Vereisten

- Node.js 18+ en npm
- Een Supabase account en project
- Git

### 1. Project klonen en dependencies installeren

```bash
git clone <jouw-repo-url>
cd dataplatform
npm install
```

### 2. Environment variables instellen

Kopieer `.env.local.example` naar `.env.local` en vul je Supabase gegevens in:

```bash
cp .env.local.example .env.local
```

Vul de volgende variabelen in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jouwproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=jouw_anon_key
SUPABASE_SERVICE_ROLE_KEY=jouw_service_role_key
NEXTAUTH_SECRET=een_willekeurige_geheime_sleutel
NEXTAUTH_URL=http://localhost:3000
```

### 3. Supabase database opzetten

Volg de instructies in `SUPABASE_SETUP.md` om je database te configureren.

### 4. Development server starten

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in je browser.

## 📡 API Gebruik

### Sensor data verzenden

```bash
curl -X POST http://localhost:3000/api/sensor-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JOUW_API_KEY" \
  -d '{"value": 23.5}'
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sensor_id": "uuid",
    "sensor_name": "Temperatuur Sensor",
    "value": 23.5,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

## 🏗️ Project Structuur

```
src/
├── app/
│   ├── api/sensor-data/     # API endpoints
│   ├── auth/               # Authenticatie pagina's
│   ├── dashboard/          # Dashboard pagina
│   └── page.tsx           # Landing page
├── components/             # React componenten
│   ├── DashboardClient.tsx
│   ├── SensorForm.tsx
│   ├── SensorCard.tsx
│   └── SensorChart.tsx
├── lib/
│   └── supabase/          # Supabase configuratie
├── types/
│   └── database.ts        # TypeScript types
└── middleware.ts          # Next.js middleware
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Visualisatie**: Chart.js + react-chartjs-2
- **Real-time**: Supabase Realtime
- **Deployment**: Vercel (aanbevolen)

## 📈 Database Schema

### sensors
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key naar auth.users)
- `name` (Text)
- `api_key` (UUID, Unique)
- `created_at`, `updated_at` (Timestamps)

### sensor_data
- `id` (UUID, Primary Key)
- `sensor_id` (UUID, Foreign Key naar sensors)
- `user_id` (UUID, Foreign Key naar auth.users)
- `timestamp` (Timestamp)
- `value` (Numeric)
- `created_at` (Timestamp)

## 🔒 Security

- Row Level Security (RLS) voor alle tabellen
- Unique API keys per sensor
- JWT-based authenticatie via Supabase
- CORS configuratie
- Input validatie op alle endpoints

## 🚀 Deployment naar Vercel

1. Push je code naar GitHub
2. Connect je repository met Vercel
3. Voeg environment variables toe in Vercel dashboard
4. Deploy!

Vergeet niet om je Supabase CORS settings bij te werken voor je productie URL.

## 🧪 Testen

### API endpoint testen

```bash
# Test met ongeldige API key
curl -X POST http://localhost:3000/api/sensor-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-key" \
  -d '{"value": 23.5}'

# Test met ontbrekende value
curl -X POST http://localhost:3000/api/sensor-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JOUW_API_KEY" \
  -d '{}'
```

## 🤝 Bijdragen

1. Fork het project
2. Maak een feature branch (`git checkout -b feature/nieuwe-feature`)
3. Commit je wijzigingen (`git commit -am 'Voeg nieuwe feature toe'`)
4. Push naar de branch (`git push origin feature/nieuwe-feature`)
5. Open een Pull Request

## 📝 Licentie

Dit project is gelicenseerd onder de MIT License.

## 🆘 Support

Voor vragen of ondersteuning, open een issue in deze repository of neem contact op via [je-email@example.com].

---

**Happy IoT-ing! 🎉**

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
