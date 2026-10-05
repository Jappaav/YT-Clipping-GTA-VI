# YT-Clipping-GTA-VI

Analytics-dashboard voor ons clipping-project (korte clips op TikTok en YouTube Shorts): overzicht van views, clips en bronnen, en handmatige invoer van stats. Gratis te hosten met Supabase en Cloudflare Pages.

Meer over de opzet en afspraken staat in [CLAUDE.md](CLAUDE.md).

## Vereisten
- [Node.js](https://nodejs.org) LTS (20 of hoger)
- Een gratis [Supabase](https://supabase.com)-account

## Setup

### 1. Supabase-project aanmaken
1. Maak op supabase.com een nieuw project aan.
2. Ga naar **Project Settings → API** en noteer de **Project URL** en de **anon public key**.

### 2. Migratie draaien
Open in Supabase de **SQL Editor**, plak de inhoud van [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) en voer die uit.

### 3. Toegestane e-mailadressen toevoegen
Alleen e-mailadressen in `allowed_users` hebben toegang. Voer in de SQL Editor uit (met jullie eigen adressen):

```sql
insert into allowed_users (email) values
  ('jij@example.com'),
  ('maat@example.com');
```

### 4. Inloggen instellen
Ga naar **Authentication → URL Configuration** en zet bij **Site URL** het adres waar de app draait (lokaal `http://localhost:5173`) en voeg bij **Redirect URLs** ook de URL van je Cloudflare Pages-site toe. Inloggen gebeurt met een magic link per e-mail; wachtwoorden worden niet gebruikt.

### 5. `.env` invullen
```bash
copy .env.example .env
```
Vul `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` in. Het bestand `.env` staat in `.gitignore`; commit nooit secrets.

### 6. Lokaal draaien
```bash
npm install
npm run dev
```
De app draait op http://localhost:5173.

### Demo bekijken zonder Supabase
```bash
npm install
npm run demo
```
Dit toont het dashboard met verzonnen voorbeeldcijfers, zonder database of login. Wat je invult wordt niet bewaard.

## Gebruik
1. **Bronnen**: voeg de podcasts, streams of kanalen toe waar je clips uit knipt.
2. **Clips**: voeg een clip toe en koppel na het opslaan de posts (TikTok en/of YouTube).
3. **Stats invoeren**: vul per post de huidige totalen in (views, likes, reacties, shares). Opnieuw opslaan op dezelfde dag overschrijft de cijfers van die dag. Vul regelmatig, bij voorkeur dagelijks, zodat het verloop in het **Overzicht** klopt.

Let op: de cijfers zijn **lopende totalen** zoals het platform ze toont, geen nieuwe views per dag.

## Deployen op Cloudflare Pages
1. Push de repo naar GitHub.
2. In Cloudflare: **Workers & Pages → Create → Pages → Connect to Git** en kies deze repo.
3. Build-instellingen:
   - Framework preset: *Vite* (of *None*)
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Voeg onder **Environment variables** `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` toe.
5. Voeg de Pages-URL toe aan de **Redirect URLs** in Supabase (stap 4).

`public/_redirects` zorgt dat directe links naar subpagina's (bijv. `/clips`) blijven werken.

## Scripts
| Commando | Wat het doet |
| --- | --- |
| `npm run dev` | Lokale ontwikkelserver |
| `npm run typecheck` | TypeScript controleren |
| `npm run build` | Typecheck + productiebuild in `dist/` |
| `npm run preview` | Productiebuild lokaal bekijken |
