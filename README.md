# Ekdal

Ett modernt spel i RuneScape-anda som körs i webbläsaren: samla, tillverka, slåss och hjälp folk med uppdrag i en värld som ska växa till många områden.

## Kom igång

```sh
npm install
npm run dev      # utvecklingsserver på http://localhost:5173
npm run build    # typkontroll och en fristående dist/index.html
```

## Kontroller

- Klicka på marken för att gå, på träd, stenar och fiskeplatser för att samla och på monster för att anfalla.
- Prata med folk som har ett gult `!` ovanför sig. Ett `?` betyder att du kan lämna in ett uppdrag.
- Dra för att vrida kameran, scrolla eller använd `+`/`−` för att zooma. Piltangenter och WASD fungerar också.

## Struktur

```
src/
  data/        Allt innehåll som ren data
    regions/   Ett område per fil (terrängdrag, stationer, resurser, monster, NPC:er)
    npcs.ts    NPC:er och deras dialoger
    quests.ts  Uppdrag med steg och belöningar
    items.ts, mobs.ts, recipes.ts, resources.ts, skills.ts, goals.ts
  world/       Världen: områden på ett globalt rutnät, höjdfunktion, terräng, vägsökning
  entities/    Resurser, stationer, monster, NPC:er och deras 3D-modeller
  game/        Spelloopen (0,6 s tick), sparning och uppdragsmotorn
  engine/      Rendering, himmel, ljus och kamera
  ui/          Panel, chatt, dialogruta, minikarta och ikoner
```

### Lägga till innehåll

- **Ett nytt område:** skapa `src/data/regions/<namn>.ts` med en `origin` bredvid ett befintligt område och lägg till det i `regions/index.ts`. Höjden räknas från världskoordinater, så områden som ligger kant i kant möts utan skarvar.
- **En ny NPC med uppdrag:** lägg till uppdraget i `quests.ts`, NPC:n med dialognoder i `npcs.ts` och placera den i ett områdes `npcs`. Dialogen väljer den första nod vars villkor stämmer, och åtgärder som `startQuest`, `take` och `completeQuest` driver uppdraget framåt.
- **Ett nytt föremål, monster eller recept:** en rad i respektive datafil.

## Nästa steg

- Fler områden och snabbresor mellan dem.
- Strömmande laddning av områden när världen blir stor.
- En auktoritativ server (Node + WebSocket på samma 0,6 s tick) för multiplayer.
