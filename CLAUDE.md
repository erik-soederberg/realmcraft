# CLAUDE.md

Riktlinjer för Claude och andra som jobbar i det här repot.

## Spelet

Ekdal är ett 3D-spel i RuneScape-anda som körs i webbläsaren. Spelaren skapar en karaktär, samlar resurser (träd, sten, fisk), tillverkar föremål, slåss mot monster med olika vapen och gör uppdrag åt folk i världen. Världen består av flera områden (Ekdal, Stenhöjden, Myrmarken, Svartgrottan) som ligger kant i kant på ett gemensamt rutnät. Spelet ska fungera lika bra på mobil som på dator.

## Teknik

- TypeScript (strict) + [three.js](https://threejs.org) för 3D, Vite som byggverktyg.
- `npm run dev` startar en utvecklingsserver med omladdning på http://localhost:5173.
- `npm run build` kör typkontroll och bygger en enda fristående fil, `dist/index.html` (via `vite-plugin-singlefile`). Det är den filen som delas som en spelbar version, till exempel `ekdal-0.13.html`.
- `npm run typecheck` kör bara typkontrollen.
- Inga testramverk ännu. Verifiera ändringar genom att köra `npm run build` och spela i webbläsaren, både i datorläge och i mobilläge (DevTools → enhetsverktyget).

## Struktur

```
src/
  main.ts      Startpunkt: skapar Game, kör renderloopen, visar version och FPS
  core/        Små hjälpare (brus, händelser)
  data/        Allt innehåll som ren data, inga beroenden till three.js
    regions/   Ett område per fil, samlas i regions/index.ts
    types.ts   Typerna för allt innehåll (föremål, monster, uppdrag, NPC:er …)
  world/       Världen: områden, höjdfunktion, terräng och vägsökning
  entities/    Resurser, stationer, monster, NPC:er, 3D-modeller och animationer
  game/        Spelloopen (game.ts, 0,6 s tick), sparning (state.ts), uppdrag och namn
  engine/      Rendering, ljus, kamera och grafikinställning (Låg/Mellan/Hög)
  ui/          HUD, panel, dialog, karaktärsskapare, minikarta, namnskyltar, ikoner och CSS
index.html     All HTML-struktur för gränssnittet
```

Innehåll läggs till som data: ett nytt område är en ny fil i `src/data/regions/`, ett nytt föremål, monster eller recept är en rad i respektive datafil, och uppdrag och dialoger ligger i `src/data/quests.ts` och `src/data/npcs.ts`. Se README för detaljer.

## Regler

- **Svenska i spelet.** Allt spelaren ser (namn på platser, föremål, NPC:er, knappar, meddelanden) skrivs på svenska. Kod, identifierare och kodkommentarer skrivs på engelska.
- **Mobil först.** Varje ändring i gränssnittet ska fungera med touch och på en smal skärm. Kontrollera i mobilläge innan du är klar.
- **Prestanda.** Spelet ska flyta på mobil. Slå ihop geometri där det går, undvik nya objekt i renderloopen och respektera grafikinställningen i `engine/graphics.ts`. FPS-mätaren visas bredvid versionen uppe till vänster.
- **Sparning.** Spelarens framsteg sparas i `localStorage` under `ekdal-save-v2` (`game/state.ts`). Ändrar du formatet så att gamla sparningar inte går att läsa, byt nyckel eller lägg till en migrering.
- **Version.** Versionen står i `VERSION` i `src/main.ts` och i `package.json`. Höj båda när en ny spelbar version delas.
- **Git.** En gren per funktion och små commits med beskrivande meddelanden. `npm run build` ska gå igenom innan en ändring pushas.
- **Felsökning.** Spelet finns som `window.ekdal` i webbläsarens konsol.
