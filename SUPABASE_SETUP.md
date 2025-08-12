# Supabase Database Setup Instructies

## 📋 Database Schema

Je moet de volgende tabellen aanmaken in je Supabase project:

### 1. sensors tabel

```sql
-- sensors tabel
create table public.sensors (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  api_key uuid default gen_random_uuid() not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security) policies voor sensors
alter table public.sensors enable row level security;

create policy "Users can view own sensors" on public.sensors
  for select using (auth.uid() = user_id);

create policy "Users can insert own sensors" on public.sensors
  for insert with check (auth.uid() = user_id);

create policy "Users can update own sensors" on public.sensors
  for update using (auth.uid() = user_id);

create policy "Users can delete own sensors" on public.sensors
  for delete using (auth.uid() = user_id);
```

### 2. sensor_data tabel

```sql
-- sensor_data tabel
create table public.sensor_data (
  id uuid default gen_random_uuid() primary key,
  sensor_id uuid references public.sensors(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  value numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS policies voor sensor_data
alter table public.sensor_data enable row level security;

create policy "Users can view own sensor data" on public.sensor_data
  for select using (auth.uid() = user_id);

create policy "Users can insert own sensor data" on public.sensor_data
  for insert with check (auth.uid() = user_id);

create policy "API can insert sensor data" on public.sensor_data
  for insert with check (
    exists (
      select 1 from public.sensors 
      where sensors.id = sensor_id 
      and sensors.user_id = sensor_data.user_id
    )
  );
```

### 3. Indexes voor performance

```sql
-- Indexes voor betere performance
create index sensor_data_sensor_id_timestamp_idx on public.sensor_data(sensor_id, timestamp desc);
create index sensor_data_user_id_idx on public.sensor_data(user_id);
create index sensors_user_id_idx on public.sensors(user_id);
create index sensors_api_key_idx on public.sensors(api_key);
```

### 4. Real-time subscriptions inschakelen

```sql
-- Real-time subscriptions voor sensor_data
alter publication supabase_realtime add table public.sensor_data;
```

## 🔧 Environment Variables Setup

1. Ga naar je Supabase project dashboard
2. Ga naar Settings > API
3. Kopieer de volgende waarden naar je `.env.local` bestand:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jouwproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXTAUTH_SECRET=je-random-geheime-sleutel-hier
NEXTAUTH_URL=http://localhost:3000
```

## 📧 Email Templates (Optioneel)

In Supabase Dashboard > Authentication > Email Templates kun je custom email templates instellen voor:
- Confirm signup
- Invite user
- Magic link
- Change email address
- Reset password

## 🚨 Security Checklist

- [x] RLS (Row Level Security) is ingeschakeld voor alle tabellen
- [x] Alleen authenticated users kunnen data lezen/schrijven
- [x] API keys zijn uniek en secure
- [x] Foreign key constraints zijn ingesteld
- [x] Indexes zijn aangemaakt voor performance

## 🧪 Test Data (Optioneel)

Je kunt test data toevoegen na het aanmaken van een account:

```sql
-- Voeg test sensor toe (vervang USER_ID met je echte user ID)
insert into public.sensors (user_id, name) 
values ('USER_ID_HIER', 'Test Temperatuur Sensor');

-- Voeg test data toe (vervang SENSOR_ID met de sensor ID)
insert into public.sensor_data (sensor_id, user_id, value, timestamp)
values 
  ('SENSOR_ID_HIER', 'USER_ID_HIER', 23.5, now() - interval '1 hour'),
  ('SENSOR_ID_HIER', 'USER_ID_HIER', 24.1, now() - interval '30 minutes'),
  ('SENSOR_ID_HIER', 'USER_ID_HIER', 23.8, now());
```
