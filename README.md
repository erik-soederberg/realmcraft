# Ekdal

Ett modernt spel i RuneScape-anda som körs i webbläsaren: samla, tillverka, slåss och hjälp folk med uppdrag i en värld som ska växa till många områden.

## Kom igång

Du behöver [Node.js](https://nodejs.org) (LTS-versionen, 20 eller senare) och [Git](https://git-scm.com).

```sh
git clone https://github.com/erik-soederberg/realmcraft.git
cd realmcraft
npm install
npm run dev      # utvecklingsserver på http://localhost:5173
```

Öppna adressen som visas i terminalen. Sidan laddas om av sig själv när du sparar en fil.

```sh
npm run build    # typkontroll och en fristående dist/index.html
npm run preview  # kör det byggda spelet lokalt
```

`dist/index.html` är hela spelet i en fil, som går att dela och öppna direkt i webbläsaren.

### Testa på mobilen

Kör `npm run dev -- --host` och öppna adressen under `Network` på mobilen. Datorn och mobilen måste vara på samma wifi.

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
  entities/    Resurser, stationer, monster, NPC:er, 3D-modeller och animationer
  game/        Spelloopen (0,6 s tick), sparning och uppdragsmotorn
  engine/      Rendering, himmel, ljus, kamera och grafikinställning
  ui/          Panel, chatt, dialogruta, minikarta, namnskyltar och ikoner
```

### Lägga till innehåll

- **Ett nytt område:** skapa `src/data/regions/<namn>.ts` med en `origin` bredvid ett befintligt område och lägg till det i `regions/index.ts`. Höjden räknas från världskoordinater, så områden som ligger kant i kant möts utan skarvar.
- **En ny NPC med uppdrag:** lägg till uppdraget i `quests.ts`, NPC:n med dialognoder i `npcs.ts` och placera den i ett områdes `npcs`. Dialogen väljer den första nod vars villkor stämmer, och åtgärder som `startQuest`, `take` och `completeQuest` driver uppdraget framåt.
- **Ett nytt föremål, monster eller recept:** en rad i respektive datafil.

Regler och arbetssätt för Claude finns i [`CLAUDE.md`](CLAUDE.md).

## Spelarnamn

Namn kontrolleras av `validateName` i `src/game/names.ts` (3–12 tecken, börjar med bokstav, reserverade namn och NPC-namn är spärrade). Själva upptagningen går via gränssnittet `NameRegistry`. Just nu används `LocalNameRegistry`, som bara ser namn på samma enhet. När servern finns byts den mot en implementation som frågar servern, så att namnen blir unika för alla spelare.

## Nästa steg

- Fler områden och snabbresor mellan dem.
- Strömmande laddning av områden när världen blir stor.
- En auktoritativ server (Node + WebSocket på samma 0,6 s tick) för multiplayer.
