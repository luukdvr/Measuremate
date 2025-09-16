# Database Migratie: Measuremates Feature

Deze migratie voegt ondersteuning toe voor meerdere "Measuremates" per account, waarbij elke Measuremate meerdere sensors kan hebben.

## Wat wordt toegevoegd:

1. **Nieuwe `measuremates` tabel**: Voor het organiseren van sensors in groepen/locaties
2. **`measuremate_id` kolom in `sensors` tabel**: Foreign key naar measuremates
3. **UI Updates**: 
   - MeasuremateSelector component voor het kiezen/maken van Measuremates
   - DashboardClient met hiërarchische weergave
   - SensorForm accepteert nu measuremateId

## Migratie uitvoeren:

1. **Database Schema**:
   - Ga naar je Supabase dashboard → SQL Editor
   - Kopieer en voer de inhoud van `database-setup.sql` uit
   - Dit creëert de nieuwe tabel, voegt de foreign key toe, en migreert bestaande data

2. **Bestaande Data**:
   - Voor elke bestaande user wordt automatisch een "Standaard Measuremate" aangemaakt
   - Alle bestaande sensors worden toegewezen aan deze standaard Measuremate
   - Geen data verlies!

3. **Nieuwe Features**:
   - Gebruikers kunnen nu meerdere Measuremates aanmaken (bijv. "Thuis", "Kantoor", "Kas 1")
   - Elke Measuremate kan een naam, beschrijving en locatie hebben
   - Sensors worden gegroepeerd per Measuremate
   - De interface toont eerst Measuremate-selectie, dan de bijbehorende sensors

## Verificatie:

Na de migratie kun je testen door:
1. In te loggen op het dashboard
2. Je zou een "Standaard Measuremate" moeten zien met je bestaande sensors
3. Een nieuwe Measuremate aanmaken
4. Een nieuwe sensor toevoegen aan de nieuwe Measuremate
5. Controleren dat data correct wordt opgeslagen

## Rollback:

Als je de migratie ongedaan wilt maken:
```sql
-- Verwijder de foreign key constraint
ALTER TABLE sensors DROP COLUMN measuremate_id;

-- Verwijder de measuremates tabel
DROP TABLE measuremates;
```

Let op: Dit verwijdert alle Measuremate-informatie permanent!