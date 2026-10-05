# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Analytics-dashboard voor een clipping-project (korte clips op TikTok en YouTube Shorts). Twee gebruikers, elk met Claude Code op een eigen branch. UI-teksten zijn Nederlands, identifiers Engels.

## Vaste werkwijze met de gebruikers
De twee gebruikers hebben geen programmeerkennis. Zij vertellen WAT ze willen bouwen; jij zoekt zelf uit HOE.

### Communicatie
- Communiceer standaard in het Nederlands.
- Ga ervan uit dat zij nog nooit hebben geprogrammeerd. Leg alles zo simpel mogelijk uit.
- Toon geen code, technische logs, diffs of lange technische uitleg, tenzij zij er specifiek om vragen.
- Vertel WAT je hebt gedaan, WAAROM, en WAT het resultaat voor hen is.
- Gebruik je toch een technische term, leg die direct uit in gewone taal. "Dependency updated", "refactor uitgevoerd" of "API endpoint aangepast" is niet genoeg: leg uit wat het praktisch betekent.

### Bij bouwen, veranderen of repareren
1. Begrijp eerst wat ze functioneel willen bereiken.
2. Zoek zelf uit welke bestanden en code aangepast moeten worden.
3. Kies zelf een goede technische oplossing; bij meerdere opties de eenvoudigste betrouwbare.
4. Voer de wijziging uit.
5. Controleer dat de wijziging werkt en dat bestaande functionaliteit niet kapot is.
6. Leg in simpele taal uit wat je hebt gedaan. Ze hoeven niet te weten welke regels code zijn aangepast.

### Opbouw van het antwoord na een taak
Gebruik bij voorkeur kort deze vier kopjes:
- **Gedaan**: simpele uitleg van wat je hebt veranderd.
- **Resultaat**: wat zij ervan merken in de applicatie.
- **Controle**: hoe je hebt gecontroleerd dat het werkt.
- **Verbeterkansen**: maximaal 3 concrete verbeteringen die je tijdens het werk zag.

### Proactief meedenken
Wijs ze automatisch op dingen die je tegenkomt die gebruiksvriendelijker, sneller, veiliger of simpeler kunnen, die waarschijnlijk een bug veroorzaken, onnodig ingewikkeld zijn, er beter uit kunnen zien of de gebruikerservaring verbeteren. Leg dit uit vanuit het voordeel voor hen of de gebruiker, niet technisch.
Voorbeeld: "Een gebruiker krijgt nu geen bevestiging na het opslaan. Ik zou een korte melding toevoegen zodat duidelijk is dat het gelukt is."

### Beslissingen
- Maak normale technische keuzes (technieken, libraries, opzet) zelfstandig. Vraag hier niet naar.
- Vraag WEL om een beslissing, in gewone taal uitgelegd, als het gaat om: hoe iets voor de gebruiker werkt, hoe iets eruitziet, kosten, belangrijke functionaliteit, het verwijderen van gegevens, beveiliging, of grote wijzigingen aan het project.

### Veilig werken
- Verwijder geen bestaande functionaliteit en geen gegevens zonder expliciete toestemming.
- Doe geen grote ongerelateerde wijzigingen bij een kleine taak.
- Controleer bestaande functionaliteit na belangrijke wijzigingen.
- Houd oplossingen zo eenvoudig mogelijk; bouw niet onnodig ingewikkeld.

## Commando's
- `npm install` / `npm run dev`: lokaal draaien op http://localhost:5173 (vereist een ingevulde `.env`, zie `.env.example`)
- `npm run typecheck`: `tsc --noEmit`
- `npm run build`: typecheck + Vite-build naar `dist/`

Er is geen testframework en geen linter ingesteld; `typecheck` is de enige automatische controle. Er is dus ook geen commando om één test te draaien.

## Architectuur
Statische single-page app zonder eigen backend: de browser praat direct met Supabase via `@supabase/supabase-js` (alleen de anon key). Alle toegangscontrole zit in de database, niet in de frontend.

- **Toegang (twee lagen):** `src/auth/AuthGate.tsx` omhult de hele app (magic-link login, daarna een check op de eigen rij in `allowed_users`) en toont alleen de melding "Geen toegang". De echte afscherming is Row Level Security in `supabase/migrations/001_init.sql`: elke tabel gebruikt de functie `is_allowed()` (e-mail uit het JWT moet in `allowed_users` staan). `allowed_users` is vanuit de app alleen leesbaar voor de eigen rij; beheer gaat via de Supabase SQL-editor.
- **Datastroom:** elke pagina in `src/pages/` haalt zijn eigen data op met `useLoad` + `unwrap` (`src/lib/useLoad.ts`) en laadt na een wijziging opnieuw. Geen state- of query-library; voeg er geen toe zonder overleg.
- **Berekeningen:** alles wat uit ruwe rijen cijfers maakt (KPI's, views per dag, top 10, bronnenranglijst) staat als pure functies in `src/lib/stats.ts`, los van Supabase. `Overzicht` haalt de ruwe `post_stats` op en rekent in de browser; `Clips` en `StatsInvoeren` gebruiken de view `latest_post_stats` voor de nieuwste cijfers.
- **Datamodel:** `sources` → `clips` → `posts` → `post_stats`. Enums (`status`, `platform`, `type`) staan zowel als CHECK-constraint in SQL als in `src/lib/types.ts`; houd ze gelijk.
- **Routing:** `react-router-dom` met `BrowserRouter`; `public/_redirects` is de SPA-fallback voor Cloudflare Pages.

## Belangrijk om te weten
- **`post_stats` bevat lopende totalen** per dag (wat het platform op die dag toont), geen dagelijkse aanwas. "Views per dag" en "laatste 7 dagen" zijn verschillen tussen opeenvolgende snapshots. Een eerste snapshot telt alleen mee in de dagelijkse grafiek als de post binnen een dag online kwam; voor "laatste 7 dagen" geldt de eerste snapshot dan als basislijn. Zie `computeKpis` en `dailyViewsByPlatform`.
- Stats worden opgeslagen met een upsert op `(post_id, date)`; opnieuw opslaan op dezelfde dag overschrijft.
- `posts.external_id` is gereserveerd voor een latere GitHub Action die `post_stats` automatisch vult.
- Schemawijzigingen alleen als nieuw genummerd bestand in `supabase/migrations/`; wijzig nooit een migratie die al gedraaid is. Pas bij een schemawijziging ook `src/lib/types.ts` aan. Migratienummers kunnen botsen tussen branches, stem ze af.
- Gebruik nooit de service-role key in `src/`; alleen de anon key hoort in de frontend.
