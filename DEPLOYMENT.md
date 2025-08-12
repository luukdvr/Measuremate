# 🚀 Deployment Guide - IoT Dashboard Platform

Deze guide helpt je bij het deployen van je IoT Dashboard naar Vercel en het configureren van de productieomgeving.

## 📋 Voorbereiding

### 1. Repository setup
- Zorg dat je code in een Git repository staat (GitHub, GitLab, etc.)
- Commit alle wijzigingen
- Push naar je remote repository

### 2. Supabase productie setup
- Ga naar [Supabase](https://supabase.com)
- Maak een nieuw project aan voor productie (apart van development)
- Noteer de project URL en API keys
- Voer alle SQL queries uit van `SUPABASE_SETUP.md`

## 🌐 Vercel Deployment

### Stap 1: Vercel Account
1. Ga naar [Vercel](https://vercel.com)
2. Sign up/login met je GitHub account
3. Geef Vercel toegang tot je repositories

### Stap 2: Project Import
1. Click "New Project" in Vercel dashboard
2. Selecteer je IoT Dashboard repository
3. Configureer als volgt:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

### Stap 3: Environment Variables
Voeg de volgende environment variables toe in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jouwproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXTAUTH_SECRET=super-geheime-productie-sleutel-minimaal-32-karakters
NEXTAUTH_URL=https://jouw-app.vercel.app
```

⚠️ **Belangrijk**: Gebruik ALTIJD andere API keys voor productie dan development!

### Stap 4: Deploy
1. Click "Deploy"
2. Wacht tot de build compleet is
3. Test je applicatie op de gegeven URL

## 🔒 Supabase Productie Configuratie

### 1. CORS Settings
In je Supabase project:
1. Ga naar Settings > API
2. Voeg je Vercel URL toe aan de CORS origins:
   ```
   https://jouw-app.vercel.app
   ```

### 2. Auth Settings
1. Ga naar Authentication > Settings
2. Update Site URL naar je Vercel URL
3. Voeg Redirect URLs toe:
   ```
   https://jouw-app.vercel.app/auth/callback
   ```

### 3. RLS Policies
Controleer dat alle Row Level Security policies correct zijn ingesteld (zie `SUPABASE_SETUP.md`).

## 📱 Domain & SSL

### Custom Domain (Optioneel)
1. In Vercel dashboard > Project Settings > Domains
2. Voeg je custom domain toe
3. Update DNS records volgens Vercel instructies
4. Update `NEXTAUTH_URL` environment variable

### SSL Certificaat
- Vercel configureert automatisch Let's Encrypt SSL
- Geen actie vereist

## 📊 Monitoring & Analytics

### Vercel Analytics
1. Enable Vercel Analytics in project settings
2. Monitor performance en usage

### Supabase Analytics
1. Monitor database performance in Supabase dashboard
2. Check API usage en limits

## 🔧 Environment-specific Configuratie

### Development
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321  # Local Supabase
NEXTAUTH_URL=http://localhost:3000
```

### Staging (Optioneel)
```env
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXTAUTH_URL=https://staging-jouw-app.vercel.app
```

### Production
```env
NEXT_PUBLIC_SUPABASE_URL=https://production-project.supabase.co
NEXTAUTH_URL=https://jouw-app.vercel.app
```

## 🚨 Security Checklist

- [ ] Verschillende Supabase projects voor dev/prod
- [ ] Unieke, sterke API keys voor productie
- [ ] NEXTAUTH_SECRET is minimaal 32 karakters
- [ ] CORS is correct geconfigureerd
- [ ] RLS policies zijn actief op alle tabellen
- [ ] SSL certificaat is actief
- [ ] Environment variables zijn niet zichtbaar in frontend

## 📈 Performance Optimalisatie

### 1. Database Indexes
Controleer dat alle indexes aanwezig zijn:
```sql
-- Performance indexes (zie SUPABASE_SETUP.md)
CREATE INDEX IF NOT EXISTS sensor_data_sensor_id_timestamp_idx 
ON sensor_data(sensor_id, timestamp DESC);
```

### 2. Caching
- Vercel cacheert automatisch statische assets
- Overweeg ISR (Incremental Static Regeneration) voor dashboard data

### 3. Real-time Connections
- Monitor Supabase real-time connections
- Implementeer connection pooling voor hoge belasting

## 🐛 Troubleshooting

### Common Issues

#### Build Errors
```bash
# Lokaal testen van build
npm run build
npm start
```

#### Environment Variables
- Controleer spelling en values in Vercel dashboard
- Redeploy na wijzigingen aan env vars

#### Database Connection
```sql
-- Test database connectivity
SELECT current_timestamp;
```

#### CORS Errors
- Controleer Supabase CORS settings
- Verify domain spelling

### Logs & Debugging
1. **Vercel Logs**: Project > Functions tab
2. **Supabase Logs**: Project > Logs & Analytics
3. **Browser Console**: Network en Console tabs

## 🔄 CI/CD Pipeline (Geavanceerd)

### GitHub Actions (Optioneel)
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID}}
          vercel-project-id: ${{ secrets.PROJECT_ID}}
```

## 📞 Support & Maintenance

### Regular Maintenance
- [ ] Update dependencies monthly
- [ ] Monitor Supabase usage limits
- [ ] Backup critical data
- [ ] Review security logs

### Scaling Considerations
- Supabase Pro tier voor hogere limits
- Vercel Pro voor advanced features
- Database connection pooling
- CDN voor static assets

---

🎉 **Je IoT Dashboard is nu live! Gefeliciteerd!**

Voor support of vragen, check de [GitHub Issues](https://github.com/jouw-username/jouw-repo/issues) of documentatie.
